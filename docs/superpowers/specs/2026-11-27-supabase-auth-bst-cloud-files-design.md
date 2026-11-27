# Supabase login + BST-Cloud file storage (design, 2026-11-27)

Status: **draft, waiting for approval.** Supersedes the "drop Supabase / Moodle plugin" direction of
2026-11-25 (`2026-11-25-bst-cloud-backend-design.md` stays superseded too).

## Intent

Easiest working path for the real system: students and teachers log in to **our website** with
Supabase (already built), print requests live in Supabase (already built), and the **files** (3D models,
estimate screenshots) are stored on **BST-Cloud** (`cloud.bstsrhberlin.com`, SRH's Nextcloud 35).
Moodle login is **not** built now, but the design leaves a clear place for it.

- Goals: real logins for students + staff; files on SRH storage; reuse the existing app, schema and tests.
- Non-goals now: Moodle login, Moodle plugin, encrypting files before upload.
- Anti-goal: any BST-Cloud password or Supabase `service_role` key reaching the browser or the repo.

## Approaches considered

| | Approach | Trade-off |
|---|---|---|
| **Picked** | Supabase auth + DB, files forwarded to BST-Cloud by an edge function | Least new code; request records (names, matriculation numbers) sit on Supabase (EU region), files on SRH |
| | Own small server, no Supabase | Everything on SRH, but all `schema.sql` rules must be ported and someone must host it |
| | Moodle activity plugin (2026-11-25 plan) | No separate login, but students never use our website; most PHP work |

## Design

### 1. Login (unchanged)
Students: matriculation number + password via the existing `login` edge function. Staff: SRH email +
invitation code (`staff_roles.enrol_code`). Setup: `supabase/README.md` steps 1-7.

### 2. Files -> BST-Cloud
Browsers cannot call BST-Cloud (cross-origin requests are refused, probed 2026-11-25), so a new edge
function `files` forwards them server-to-server over WebDAV.

- **Secrets** (Supabase > Edge Functions > Secrets): `NEXTCLOUD_URL`, `NEXTCLOUD_USER`,
  `NEXTCLOUD_APP_PASSWORD` (a dedicated BST-Cloud storage account's app password, from the BST-Cloud admin).
- **Upload** `POST /files?kind=models|estimates`: checks the caller's JWT, that they are a student,
  the file name pattern and type (`.stl/.3mf/.obj`, PNG for estimates), size (50 MB / 5 MB) and the existing
  quota (20 uploads/hour, 150 MB total). Then `PUT` to
  `<NEXTCLOUD_URL>/remote.php/dav/files/<NEXTCLOUD_USER>/3d-printing/<kind>/<user-id>/<file>`
  and records the file in a new table `private.files (path, kind, owner, size, created_at)`.
- **Download** `GET /files?kind=...&path=...`: owner or professor only (same rule as today's storage
  policies), streamed back from WebDAV.
- **Schema**: `private.valid_model_path`, `private.valid_estimate_path` and `private.upload_quota_ok`
  read `private.files` instead of `storage.objects`. The Supabase `models` / `estimates` buckets lose
  their insert policies (no real project exists yet, so nothing to migrate).
- **App**: only `src/lib/modelStore.ts` changes (calls the function instead of `supabase.storage`).
  The CSP already allows the Supabase project, which serves the function.

### 3. Moodle login later (scaffold)
Verified 2026-11-27: `lms.bstsrhberlin.com/login/token.php` and `/webservice/rest/server.php` answer
with `Access-Control-Allow-Origin: *`, and mobile web services are on.

Plug-in point: the password check inside `supabase/functions/login/index.ts` moves into one function,
`checkCredentials(identifier, password)`, marked as the Moodle hook. Later version:
1. `POST <MOODLE_URL>/login/token.php` (username = matriculation number, `service=moodle_mobile_app` or
   a limited service the LMS admin creates), server-side.
2. `core_webservice_get_site_info` with that token -> Moodle user id, username, full name. Drop the token.
3. Find the profile by matriculation number, or create the Supabase user (admin API) on first login.
4. Mint the session server-side (`auth.admin.generateLink` magic link -> `verifyOtp`), return it.

Open points to settle before building it:
- Students would type their LMS password into our site. SRH IT must agree, ideally with the site on an
  SRH address (a `github.io` page asking for university passwords looks like phishing).
- The mobile-app token opens the whole LMS account: use once, never store; prefer a limited service.
- Moodle allows open self-signup, so a Moodle login does not prove SRH enrolment (professor approval still gates prints).
- Not yet tested: whether students may create tokens (needs one real login).
- Staff roles still come from `staff_roles`; Moodle does not tell us who is a professor.

## Left to the builder
Exact function code, error messages, streaming vs buffering (test with a 50 MB file against the
edge function limits), tests in `npm run test:db` for the new `private.files` checks.

## Calls made without asking (check these)
- Estimate screenshots also go to BST-Cloud (one storage path for all student files).
- No encryption before upload in v1 (BST-Cloud is SRH's own server); add if the professor wants it.
- The Moodle scaffold is a seam plus this write-up, not dead Moodle code.
