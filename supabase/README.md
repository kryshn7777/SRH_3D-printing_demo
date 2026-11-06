# Plug-and-play backend (Supabase)

The app runs on **local demo data** until both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
are set. Set them and it switches to the real backend. No code changes.

## Setup (about 20 minutes, free tier is enough)

1. **Create a project** at supabase.com (region: Frankfurt).
2. **Database:** SQL Editor > paste all of `supabase/schema.sql` > Run. Safe to re-run.
3. **Auth settings** (Authentication > ...):
   - Providers > Email: **Confirm email = ON**, minimum password length 8 (staff: use a long passphrase).
   - URL Configuration: Site URL and redirect = `https://kryshn7777.github.io/SRH_3D-printing_demo/`
     (add `http://localhost:5173/` for development).
   - **Custom SMTP** (SRH mail relay, Resend, ...). The built-in sender allows ~2 emails/hour and only
     delivers to project members, so real students would never get a confirmation mail.
   - **Attack Protection: enable CAPTCHA** (Cloudflare Turnstile or hCaptcha). Without it anyone can
     burn the email quota with fake sign-ups. (The app does not send a captcha token yet; add
     `options.captchaToken` in `LiveProvider.signUpStudent` and allow the provider in the CSP in
     `vite.config.ts` when you switch it on.)
4. **Staff accounts (important).** Staff addresses can only be registered with a one-time invitation
   code, so a stranger cannot pre-register the approver's mailbox and set its password. For each person:
   ```sql
   update public.staff_roles
      set enrol_code = replace(gen_random_uuid()::text, '-', '')
    where email = 'ajinkya.keskar@srh-berlin.de';
   select email, enrol_code from public.staff_roles;   -- send the code to that person privately
   ```
   They open the app > Sign up > "I am staff", enter name, SRH email, password and the code, then click
   the confirmation mail. The code is wiped when used. Change the two default emails in `staff_roles`
   to the real ones first. Deleting a row from `staff_roles` also deactivates that person's account.
5. **Printers:** replace the example addresses in `printer_endpoints` (staff-only table).
6. **Login function:** Edge Functions > New function `login` > paste `supabase/functions/login/index.ts` > Deploy.
   Optional secret `ALLOWED_ORIGINS=https://kryshn7777.github.io,http://localhost:5173`.
   Afterwards confirm it sees the real client IP: send a request with a fake `X-Forwarded-For: 1.2.3.4`
   and check that the stored `ip:` key in `private.rate_limits` is your address, not `1.2.3.4`.
7. **Connect the app:** Project Settings > API. Copy *Project URL* and the *anon* key.
   - Local: `cp .env.example .env.local` and fill both.
   - Hosted: GitHub repo > Settings > Secrets and variables > Actions > **Variables** >
     `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, then re-run the deploy workflow.
   The anon key is public by design. **Never** put the `service_role` key in the app or the repo.

## What protects it

| Layer | Measure |
|---|---|
| Data | Row Level Security on every table; students see only their own rows; printer addresses staff-only; future tables are closed to the API roles by default |
| Roles | From the `staff_roles` allowlist on email confirmation, only for accounts created with the invitation code; never from user-supplied data. Unconfirmed staff accounts cannot have their password overwritten |
| Writes | Requests, reviews, revokes go through `SECURITY DEFINER` functions (`search_path = ''`) that re-check role, ownership and state |
| Rate limits | `create_request` 20/h, reviews 120/h, writes 300/h, uploads 20/h per user (`P0429 rate_limited`) |
| Login | Edge function: attempts counted *before* the password check (atomic, parallel requests cannot bypass), 6 per 15 min per (id, IP), 30 per id, 40 per IP; fails closed; generic error; email never returned |
| Files | Private bucket, 50 MB per file, 150 MB per user in total, `.stl/.3mf/.obj`, path must start with the user's id, served as `octet-stream` |
| Audit | `audit_log` is append-only; actors/timestamps are stamped by the server; CSV export neutralises spreadsheet formulas |
| Browser | Strict CSP (connect-src only this site + your Supabase project) |

## Known limits (read before launch)

- **Password guessing straight at Supabase Auth.** The project URL and anon key are public, so anyone can
  call `/auth/v1/token` directly and bypass the login function's lockout. Supabase itself caps this at
  about 150 tries / 5 min per IP. So **staff must use a long unique passphrase**. Stronger: require TOTP
  for staff and add `(select auth.jwt() ->> 'aal') = 'aal2'` to the staff checks in `private.user_role()`.
- **Shared Auth rate bucket.** The login function calls Auth from the server, so Auth sees one IP and
  its limit (burst ~30) is shared by all students. A full class logging in at once can hit it; users then
  see "Login is busy" (not counted against them). Fix when needed: enable Auth IP forwarding and send
  `Sb-Forwarded-For` with a secret API key.
- **Timing.** Unknown matriculation numbers answer slightly faster than known ones.
- **Student pre-registration.** If someone signs up with another student's SRH email and their own
  password and that student clicks the confirmation mail, the attacker holds that student account.
  Student-level access only; CAPTCHA + custom SMTP keep this from scaling.
- **Lockout.** 30 wrong tries in 15 minutes against one matriculation number locks that student out
  for the window. Accepted.
- Two unconfirmed sign-ups with the same matriculation number: the second can never confirm.
- **Free tier storage is 1 GB** (about 200 models at 5 MB), no automatic backups, and orphaned uploads
  (uploaded but never attached to a request) are not cleaned up automatically.
- Approver email notifications were removed with the Microsoft login. Staff see pending requests in the app.

## Tests
`npm run test:db` runs the schema, RLS, RPC, sign-up and rate-limit checks in an in-process Postgres
(PGlite). The Auth (GoTrue) and Storage services are stubbed, so also click through the app once on a
real project: staff sign-up with code, student sign-up + confirmation, login, upload, approve.
