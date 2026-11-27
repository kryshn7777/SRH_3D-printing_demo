# Supabase login, BST-Cloud files, real lab PC client (design, 2026-11-27)

Status: **approved 2026-11-27** (with the encryption + share-link change below). Replaces the "drop Supabase / Moodle plugin" direction of
2026-11-25 (`2026-11-25-bst-cloud-backend-design.md` stays superseded).

## Intent

The easiest working path for the real system:

1. A student logs in to **our website** (Supabase, already built) and submits a print request with a 3D model.
2. Ajinkya (PROFESSOR) approves it on the website (already built).
3. On the **university lab PC** (one PC, connected to 5 printers) the student logs in to the **lab client**
   (`local-client/`) with the same account. It fetches their approved model from the server and opens
   **Bambu Studio** with it. The student prints on the printer the request names.

Files (3D models, estimate screenshots) are stored on **BST-Cloud** (`cloud.bstsrhberlin.com`, SRH's
Nextcloud 35). Moodle login is not built now, but there is a marked place for it.

- **Goals:** real logins for students and staff; files on SRH storage; a working lab PC client; reuse the
  existing app, schema and tests.
- **Non-goals now:** Moodle login, Moodle plugin, CAPTCHA (see "Follow-ups"),
  a packaged `.exe` for the lab PC, marking requests as printed.
- **Anti-goals:** a BST-Cloud password or the Supabase `service_role` key reaching a browser, the lab PC
  or the repo; a web page opened on the lab PC being able to drive the lab client; a student's model or
  session left behind on the shared lab PC.

## Decisions taken with the user

- Login stays Supabase (matriculation number + password for students, SRH email + invitation code for staff).
- Files go to BST-Cloud.
- Moodle login: later, scaffold only.
- One lab PC serves all 5 printers, so it shows **all** of the student's approved requests, with the printer
  each one is assigned to.
- A student may print an approved model **as often as they like** until Ajinkya revokes access (the
  existing revoke action). No database change for this.
- Lab client: upgrade the existing Python `local-client`, not a website-only or Electron solution.

## Approaches considered

**Backend**

| | Approach | Trade-off |
|---|---|---|
| **Picked** | Supabase auth + DB; files forwarded to BST-Cloud by an edge function | Least new code. Request records (names, matriculation numbers) sit on Supabase (EU region), files on SRH |
| | Own small server, no Supabase | Everything on SRH, but all `schema.sql` rules must be ported and someone must host it |
| | Moodle activity plugin (2026-11-25 plan) | No separate login, but students never use our website; most PHP work |

**Lab PC client**

| | Approach | Trade-off |
|---|---|---|
| **Picked** | Upgrade existing Python `local-client` (stdlib only) | Keeps the working window + Bambu launch; needs Python 3 on the lab PC for now |
| | Website only, via Bambu Studio's `bambustudio://` link | Nothing to install, but unclear it accepts non-MakerWorld links, and nothing cleans files off the shared PC |
| | Rewrite as Electron app | More work, nothing gained |

## Design

### 1. Login (unchanged, plus the Moodle seam)

Website login is unchanged: the `login` edge function (matriculation number or staff email + password,
rate limited, returns `access_token` + `refresh_token`). Setup: `supabase/README.md`.

The password check inside `supabase/functions/login/index.ts` moves into one function
`checkCredentials(identifier, password)` with a comment marking it as the Moodle hook (section 5).
Behaviour must not change; the existing tests must still pass.

### 2. Files -> BST-Cloud

Browsers cannot call BST-Cloud (cross-origin requests are refused, probed 2026-11-25), so a new edge
function `files` forwards them server-to-server over WebDAV. **The rules stay in SQL** (where the PGlite
tests already cover them); the function is a thin forwarder.

**Which BST-Cloud account (decided 2026-11-27):** the professor's own account; there is no dedicated
storage account. To keep the professor's login and other files out of reach, the app does **not** store
that login. Instead the professor creates one folder `3d-printing` and a **password-protected share link**
for it with "Allow upload and editing". The function talks WebDAV to that share only
(`https://cloud.bstsrhberlin.com/public.php/dav/files/<share-token>/`, Basic auth `anonymous` : share password; verify this
auth form in the first build step). A leak exposes only that folder, whose files are encrypted, and the
professor can delete the link at any time. (Probed 2026-11-27: the public WebDAV endpoint answers on
BST-Cloud; whether link uploads are allowed shows when the professor creates the link.)
Fallback if the admin has disabled upload links: an app password of the professor's account
(Settings > Security, revocable).

**Secrets** (Supabase > Edge Functions > Secrets): `NEXTCLOUD_DAV_ROOT`, `NEXTCLOUD_DAV_USER`,
`NEXTCLOUD_DAV_PASSWORD`, `FILES_ENCRYPTION_KEY` (32 random bytes, base64). Share link:
root `https://cloud.bstsrhberlin.com/public.php/dav/files/<share-token>`, user `anonymous`, the share
password. Fallback: root `https://cloud.bstsrhberlin.com/remote.php/dav/files/<user>/3d-printing`, the
user name, an app password. Same code either way. The function needs no `service_role` key: every SQL
call runs with the caller's own JWT.

**Encryption:** every file is encrypted in the function before the `PUT` and decrypted after the `GET`
(AES-256-GCM via WebCrypto, fresh random IV per file, stored as `version byte + IV + ciphertext`).
BST-Cloud, the professor's account and anyone with the share link see only ciphertext. Losing
`FILES_ENCRYPTION_KEY` makes all stored files unreadable: the owner keeps a copy in a password manager.

**New table** `private.files (path text primary key, kind text check (kind in ('models','estimates')),
owner uuid, size bigint, created_at timestamptz default now())`. Path format stays as today:
`<user-id>/<timestamp>-<safe-name>.<ext>`.

**New SQL functions** (SECURITY DEFINER, `search_path = ''`, called **with the caller's JWT** so
`auth.uid()` is the real user):
- `public.reserve_upload(p_kind, p_file_name, p_size) returns text`: caller must be a student; checks
  extension (`.stl/.3mf/.obj` for models, `.png` for estimates), size (50 MB / 5 MB) and the existing quota
  (20 uploads per hour, 150 MB total, now counted from `private.files`); builds the path and inserts the row;
  returns the path. Quota check and insert happen in one call, so parallel uploads cannot slip past.
- `public.release_upload(p_path)`: owner removes their own row if the WebDAV upload failed, only while no
  request references it.
- `public.can_read_file(p_kind, p_path) returns boolean`: owner, or professor (same rule as today's storage
  policies).

**Changed SQL:** `private.valid_model_path`, `private.valid_estimate_path` and `private.upload_quota_ok`
read `private.files` instead of `storage.objects`. The insert/select policies on the `models` and
`estimates` buckets are dropped (no real project has data yet, so nothing to migrate).

**`files` function:**
- `POST /files?kind=models|estimates&name=<original file name>`, raw file bytes as the body:
  `reserve_upload` -> create folders if missing (`MKCOL`) -> `PUT` to WebDAV -> return `{ path }`.
  If the `PUT` fails: `release_upload`, return an error.
- `GET /files?kind=...&path=...`: `can_read_file` -> `GET` from WebDAV -> stream back as
  `application/octet-stream` with `Content-Disposition: attachment`.
- Same CORS allow-list approach as `login` (`ALLOWED_ORIGINS`).

**Website:** only `src/lib/modelStore.ts` changes (call the function instead of `supabase.storage`).
The CSP already allows the Supabase project, which serves the function.

### 3. Lab PC client (`local-client/`)

Same shape as today: `run_client.bat` starts `server.py` on `127.0.0.1:5175` and opens Edge (or Chrome)
in app mode. Python 3 standard library only. Replace the demo parts (fake login that accepts anything,
fixed `EV hood final.stl`).

**Config:** `local-client/config.json` with `supabase_url`, `supabase_anon_key` (both public) and
`station_printer_ids` (the IDs of the 5 Bambu printers connected to this PC). No secrets on the lab PC.
Missing config -> the window shows "This station is not configured".
The real system also has other printers (Voron, resin) that are not at this PC: their approved requests
are shown **greyed out** with "Not at this station" and no Open button.

**Verified by the user:** the demo client already runs on the real lab PC (Python, Edge/Chrome, Bambu
Studio present). Not yet tested: that the lab PC can reach the Supabase project over HTTPS.

**Flow:**
1. **Login:** the window posts matriculation number + password to the local server, which calls the
   `login` edge function. Tokens are kept in server memory only, never written to disk.
2. **List:** `GET <supabase>/rest/v1/print_requests?status=eq.APPROVED_ACCESS_GRANTED` with the user's
   token, keeping only requests whose access grant is still active (`access_grants.revoked_at is null`
   and `expires_at > now()`). Ajinkya's "Access end date" on the review form therefore also ends lab access,
   as the website already shows ("Valid until"). Row Level Security already limits students to their own requests. Shown per request: project
   title, file name, material, and **"Print on: <printer name>"** in large type (Bambu Studio cannot be
   told which printer to select, so the student picks it there).
3. **Open:** download through the `files` function into the station folder
   `%LOCALAPPDATA%\SRH-3DP\session\`, saved as `<request-id>.<ext>` (never the user-supplied name), then
   start `bambu-studio.exe <file>` (argument list, no shell; already how it works).
   The station is used by one student at a time, so at login the client closes any Bambu Studio that is
   still running (Bambu Studio runs as a single instance and would otherwise take over the file).
4. **End of session:** on Log out, or automatically 15 minutes after Bambu Studio has closed
   (and 15 minutes after login if nothing was opened):
   close Bambu Studio if still running, delete the station folder, revoke the session
   (`POST <supabase>/auth/v1/logout`), clear memory, return to the login screen.
   On every start the server also deletes any leftover station folder (crash recovery).
5. **Expired token:** any 401 from Supabase -> "Please log in again", same clean-up as Log out.

**Local server hardening** (the demo currently answers any website):
- Remove `Access-Control-Allow-Origin: *`. The window is served by the same server, so it needs no CORS.
- Reject requests whose `Host` is not `127.0.0.1:5175` (stops DNS rebinding) and whose `Origin`, if
  present, is not `http://127.0.0.1:5175`.
- `POST` endpoints only accept `Content-Type: application/json` (a plain HTML form from another site
  cannot send that without a preflight, which now fails).
- Never return tokens to the window; the window only gets display data.

**Static UI:** keep the current look; remove the "1-Click Stakeholder Demo Account" button and the
hard-coded Anna / PR-001 data. Show the list of approved requests instead of one fixed request.

`local-client/` is committed to the repo (it is untracked today). The two STL files in the repo root are
not committed.

### 4. Supabase setup the owner does (summary)

`supabase/README.md` steps 1-7, plus for files: the professor creates the `3d-printing` folder and its
password-protected upload link -> the four secrets above -> deploy `files` -> re-run `schema.sql`. Plus: put the project URL and anon key
in `local-client/config.json` on the lab PC. The README gets these additions, and its CAPTCHA line
(step 3) changes to "leave off until the CAPTCHA follow-up".

### 5. Moodle login later (scaffold only)

Verified 2026-11-27: `lms.bstsrhberlin.com/login/token.php` and `/webservice/rest/server.php` answer
with `Access-Control-Allow-Origin: *`, and mobile web services are on. Later version of
`checkCredentials()`:
1. `POST <MOODLE_URL>/login/token.php` (username = matriculation number, `service=moodle_mobile_app` or a
   limited service the LMS admin creates), server-side.
2. `core_webservice_get_site_info` with that token -> Moodle user id, username, full name. Drop the token.
3. Find the profile by matriculation number, or create the Supabase user (admin API) on first login.
4. Mint the session server-side (`auth.admin.generateLink` magic link -> `verifyOtp`), return it.

Because the lab client logs in through the same `login` function, it gets Moodle login for free.

Before building it: SRH IT must agree to students typing LMS passwords into our site (a `github.io` page
asking for university passwords looks like phishing; better on an SRH address); the mobile-app token
opens the whole LMS account (use once, never store, prefer a limited service); Moodle self-signup is open,
so a Moodle login does not prove enrolment; staff roles still come from `staff_roles`; untested whether
students may create tokens.

## Follow-ups (not in this project)

- **CAPTCHA.** Supabase's CAPTCHA, once switched on, also guards password sign-in, which the `login`
  function calls for both the website and the lab client. It needs its own small design (which endpoints,
  whether the lab client window can show the widget). Until then: leave CAPTCHA off, the `login` function's
  rate limits stay the guard.
- Packaged `.exe` for the lab PC (PyInstaller) so it needs no Python.

## Left to the builder

Exact function code and error texts; buffering vs streaming uploads (test a 50 MB file against the edge
function's memory/time limits); how the lab client detects that "its" Bambu Studio window has closed;
the PGlite tests for `reserve_upload`, `release_upload`, `can_read_file` and the changed `valid_*` checks;
a small runnable self-check for the lab client's request guard (Host/Origin/content type).

**Known limit:** the client only cleans its own station folder. Bambu Studio's own recent-files list,
auto-backups and anything the student saves elsewhere stay on the PC. How sliced jobs reach the printers
(LAN mode, Bambu cloud account, SD card) is lab setup, outside this app.

## Calls made without asking (check these)

- The lab client honours Ajinkya's access end date as well as revoke.
- The lab client closes any running Bambu Studio at login and logout (one student at a time; assumes one
  shared Windows account on the lab PC).
- If a 50 MB upload does not fit the edge function's limits, the 50 MB cap is lowered everywhere rather than
  building chunked uploads.
- Build order: login seam and lab client first, then the `files` function. Space comes from the
  professor's account quota, still to be checked (needed: up to 150 MB per student by the existing quota
  rule; nothing deletes old files automatically).

- Estimate screenshots also go to BST-Cloud (one storage path for all student files).
- AES-256-GCM in the edge function, one key in Supabase secrets, no key rotation in v1.
- Lab client: 15-minute auto logout after Bambu Studio closes; the demo login button is removed.
- Lab client is for students. If a professor logs in, they see every approved request (what the database
  already allows); the lab in-charge sees none.
- CAPTCHA moved to a follow-up because it touches both login paths.
- The Moodle scaffold is a seam plus this write-up, not dead Moodle code.
