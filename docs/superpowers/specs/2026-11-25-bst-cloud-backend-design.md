# BST-Cloud (Nextcloud) backend: design

Date: 2026-11-25. Status: **superseded** (2026-11-25).

Students have no BST-Cloud logins, so this design is replaced. The 3D-printing section moves
into the LMS (Moodle) as a plugin, and BST-Cloud becomes file storage only, reached by the LMS
server. A new design will replace this one.

## Intent

The professor supervising this project gave us SRH Berlin's own server, BST-Cloud
(https://cloud.bstsrhberlin.com), as the app's backend. The decision is to replace Supabase
**completely**. The professor also asked for the app to be fully compatible with the server and
encrypted. Why BST-Cloud: it is the university's server, so the professor wants the system to run
there and not on a third-party cloud. (The deeper reason, keeping student data on SRH
infrastructure, is our inference.)

## What BST-Cloud is (probed 2026-11-25)

- Nextcloud 35.0.2 with the theme name "BST-Cloud". It runs behind nginx and forces HTTPS (HSTS).
- Login is a username and password form with no SSO button. WebAuthn is available.
- The server allows no cross-origin browser calls. From a foreign origin, the WebDAV preflight
  gets 401, OCS gets 405 and Login Flow v2 gets 405. Nextcloud 33-35 has no admin setting for
  CORS (nextcloud/server#3131). A page on github.io therefore cannot use it.
- The professor confirmed that the BST-Cloud admin **will install our app** and **create two
  groups**: one for professors and one for lab staff.

## Goals

1. The app runs inside BST-Cloud as a Nextcloud app: id `printlab`, display name "3D Printing".
   The admin installs it into `custom_apps/`. It is same-origin, so there are no CORS issues.
2. People log in with their BST-Cloud accounts, and the app does no login of its own. The role
   comes from the two groups:
   - group `printlab-professors` gives PROFESSOR;
   - group `printlab-lab` gives LAB_INCHARGE;
   - every other logged-in user is a STUDENT.

   If the admin wants to limit who sees the app at all, Nextcloud's built-in "limit app to
   groups" setting does it with no app code. A missing account email or display name falls back
   to the user id.
3. All data lives in BST-Cloud:
   - records go in Nextcloud's database, in our own app tables;
   - model files (.stl/.3mf/.obj) and estimate screenshots go in Nextcloud storage (app data);
   - the app encrypts those files at rest (see Encryption).
4. The rules are the same as today's Supabase backend, enforced on the server in PHP:
   - the request state machine;
   - who can see and do what;
   - upload limits and rate limits;
   - the append-only audit log;
   - the ID formats (PR-### requests, PR-## printers).
5. The React UI keeps the same feature set inside Nextcloud: requests, review, printer access,
   printers, inventory, audit log, and print estimate (screenshot OCR plus .gcode/.gcode.3mf import).
6. Supabase is removed from the codebase entirely.
7. The admin gets a release tarball and a one-page install/update guide.

## Non-goals

- **True end-to-end encryption** (where the server cannot read files). Rejected because:
  - the reviewing professor must be able to open the files in the browser;
  - the lab PC must be able to slice the files;
  - a lost key would mean lost files;
  - Nextcloud's own E2EE app shares only with individual users, not groups.
- **The lab PC checking printer-access tokens against BST-Cloud** (`local-client/`). This is not
  wired today either; it is later work.
- **Email or Nextcloud notifications** for new requests or decisions. Later work.
- **Migrating Supabase data.** Live mode was never used (the hosted site is demo mode), so there
  is no data to move.
- Publishing to the Nextcloud App Store, or app code signing.
- Creating student accounts. That is the BST-Cloud admin's job.
- Our own sign-up, login, password reset and staff invitation codes. Nextcloud accounts and
  groups replace all of these.

## Anti-goals (failure even if it "works")

- Any path that lets a student approve their own request, or see another student's request or file.
- Storing any BST-Cloud password or app password in the app, the repo or the build.
- Using the professor's personal account for development or testing.
- Needing the admin to change server config (nginx, CORS, PHP settings) beyond installing the
  app, creating the groups and adding members.
- Breaking the GitHub Pages demo build.

## Constraints

- **Version.** The app supports Nextcloud 35 only (`min-version` = `max-version` = 35). PHP is
  what Nextcloud 35 requires (reported as 8.3 or newer; verify).
- **Database.** Which database BST-Cloud uses is unknown (MySQL/MariaDB/PostgreSQL/SQLite).
  - Use Nextcloud migrations and its query builder only; no raw vendor SQL.
  - Respect Nextcloud's identifier length limits: table names are prefixed `oc_`, and names must
    stay short.
- **Page CSP.** Nextcloud's page CSP is nonce-based. The app may relax it only for its own page,
  and only as much as OCR needs (for example `worker-src blob:` and WebAssembly). Google Fonts
  must not be loaded in the Nextcloud build: self-host the fonts or use the system font stack.
- **Static files.** BST-Cloud's nginx config is unknown. Built assets must load whether or not
  nginx serves unusual file types directly (for example tesseract's `eng.traineddata.gz`). If it
  doesn't, serve those files through an app route.
- **CSRF.** Every API call from the page carries Nextcloud's CSRF `requesttoken`. Deep links must
  work under both `/apps/printlab/...` and `/index.php/apps/printlab/...`.
- **Dev machine.** It has no Docker, WSL or PHP; only Node 24 and Python. Local testing needs WSL2
  plus Docker Desktop, which is a one-time install by the user that needs admin rights and a
  reboot.
- **Trust.** Our PHP runs with server privileges on SRH's server, and the admin may review it.
  Keep it small and readable.

## Approaches considered

| | Approach | Verdict |
|---|---|---|
| **A** | **Nextcloud app inside BST-Cloud.** The SPA is served by our app; the API is our app's PHP; data is in Nextcloud's database and storage. | **Chosen.** BST-Cloud is truly the backend. It is same-origin, uses SRH logins, enforces rules on the server, and needs no extra server for anyone to run after the internship. Costs: rules rewritten in PHP, the admin installs every update, local Docker is needed. |
| C | Our own bridge server (lab PC or VPS) that uses one BST-Cloud account as storage. | Rejected. Someone must host and patch a server forever, it stores a valuable BST-Cloud password, and BST-Cloud would only be a disk. It stays the fallback if the admin later refuses. |
| B | The GitHub Pages site calls BST-Cloud directly (the admin installs WebAppPassword and allows our origin). | Dropped. It still needs an admin install, folder permissions cannot enforce the approval rules, and an app password would sit in the browser. |

The user picked A after the professor confirmed the admin will install the app and create the groups.

## Design

### Shape

```
browser ── https://cloud.bstsrhberlin.com/apps/printlab/   (logged into BST-Cloud)
  │  React SPA (same UI; data layer = NextcloudProvider)
  └─ fetch /apps/printlab/api/...  (session cookie + requesttoken)
        │  PHP controllers: current Nextcloud user → role from groups → rules
        ├─ Nextcloud DB: printlab_* tables
        └─ Nextcloud app data: models/, estimates/  (files encrypted by the app)
```

### What replaces what

| Today (Supabase) | BST-Cloud |
|---|---|
| GoTrue accounts, `login` edge function, sign-up, email confirm | Nextcloud accounts and session; Nextcloud brute-force protection |
| `staff_roles` + one-time enrol codes | the two Nextcloud groups |
| `profiles` (created on email confirm) | `printlab_profiles`, keyed by Nextcloud user id and created on first visit; students fill in matriculation number + department once |
| RLS policies (`schema.sql`, the RLS section) | authorization checks in PHP with the same visibility rules |
| RPCs `create_request`, `submit_draft`, `review_request`, `revoke_access`, `set_user_active` | PHP service methods with the same behavior and errors |
| guards/triggers: `printers_guard`, `write_audit`, `inventory_stamp`, `throttle_writes`, `clean_estimate`, `upload_quota_ok`, `valid_model_path`, `valid_estimate_path`, `rate_limit` | the same checks in PHP |
| buckets `models`, `estimates` | Nextcloud app data, encrypted |
| `npm run test:db` (PGlite) | integration check script against a local Nextcloud (see Testing) |

`supabase/schema.sql` is the reference to port from. Read it in full before writing the PHP. It
leaves git only after the port is done and checked.

### Nextcloud app (`nextcloud-app/printlab/` in this repo)

- **`appinfo/info.xml`**: id, name, version, Nextcloud 35 dependency, and a navigation entry so
  the app shows up in BST-Cloud's top bar.
- **Page controller**: serves the SPA for `/apps/printlab/` and any sub-path (client-side
  routing), and sets the page CSP described above.
- **API controllers**: one state endpoint plus one endpoint per action.
  - The state endpoint returns everything the current user may see, filtered by role. This
    mirrors today's "reload everything after each write".
  - The actions mirror `AppContextValue` in `src/context/appTypes.ts`, minus sign-up, login,
    `switchRoleUser` and `resetDemoData`.
  - Upload and download endpoints for model files and estimate images.
- **Database migration**: tables for profiles, printers, printer endpoints, requests, approvals,
  access grants, inventory, audit log and rate-limit counters. They mirror `schema.sql` without
  the auth tables. Add one files table (owner, stored path, size, type, created). It replaces
  today's `storage.objects` lookups for the ownership checks (`valid_model_path`,
  `valid_estimate_path`) and the per-user quota.
- **Approver rule** (same as today, bound by user id instead of display name):
  - The student picks the approver from the members of the professors group. The API lists
    group members (id + display name), not only users who have opened the app. This replaces
    the hard-coded `APPROVAL_CONTACTS` list.
  - Only the chosen professor may review or revoke, as in `review_request`.
  - The professor dashboard filters by approver user id, not by name.
  - One small fix: if the chosen professor has left the group, any professor may review, so
    requests can't get stuck.
- **Roles**: the group ids default to `printlab-professors` and `printlab-lab`. The admin can
  override them with `occ config:app:set printlab professor_group --value=...` (and the same
  with `lab_group`).
- **Audit log**: written only by the service methods. There is no update or delete endpoint.
- **Limits**, the same as today:
  - 50 MB per model file;
  - `.stl/.3mf/.obj` only;
  - 20 uploads per hour;
  - 150 MB per user;
  - estimate screenshots re-encoded to PNG of at most 5 MB (client side, as today);
  - the estimate is cleaned on the server (≤200 rows) as `clean_estimate` does.

### React app

- **`NextcloudProvider`** implements `AppContextValue` over `fetch` to the app API and replaces
  `LiveProvider`:
  - `isLive` is true;
  - `logout` goes to Nextcloud's logout;
  - errors are mapped to `ServiceResult.error`;
  - the remote model and image stores point at the app's file endpoints.
- **First visit**: a profile form for students (matriculation number, department). Name and email
  come from the Nextcloud account. Login and sign-up pages are not reachable in the Nextcloud build.
- **Build targets**:
  - `npm run build`: the GitHub Pages demo, unchanged (`LocalProvider`).
  - `npm run build:nextcloud`: emits the SPA into the app folder. `AppProvider` picks the provider
    at build time from an env flag.
- **Removed**: `src/lib/supabase.ts`, `src/context/LiveProvider.tsx`, the Supabase parts of
  `src/lib/modelStore.ts`, `src/lib/config.ts`'s Supabase vars, `supabase/`,
  `@supabase/supabase-js`, `@electric-sql/pglite`, `test:db`, the Supabase origin in the
  GitHub Pages CSP, and the `VITE_SUPABASE_*` lines in `.github/workflows/deploy.yml`.

### Page layout (my call)

The app renders as a full page without Nextcloud's top bar (Nextcloud's "base" layout), and its
own shell gets a "Back to BST-Cloud" link. Reason: Tailwind's global CSS reset would break
Nextcloud's header if both shared a page. If the builder finds a cheap way to scope the reset,
keeping the top bar is fine too.

### Encryption

- **In transit**: HTTPS with HSTS. BST-Cloud already does this.
- **Files at rest**:
  - The app encrypts every stored file with Nextcloud's `ICrypto` (keyed by the server secret)
    before writing it, and decrypts it on download.
  - This holds whether or not the admin turns on Nextcloud server-side encryption, which may not
    cover app data.
  - Memory ceiling: `ICrypto` works on whole strings and hex-encodes its output. Peak memory is
    therefore several times the file size, roughly 300 MB for a 50 MB file. That needs PHP
    `memory_limit` of at least 512M, which is Nextcloud's own recommended value.
  - The builder measures this with a 50 MB file on the local instance. If it doesn't fit, switch
    to binary AES-256-GCM via PHP's openssl, with the key derived from the server secret, or
    lower the cap.
- **Database rows** (names, matriculation numbers, comments) are not encrypted by the app. That
  is the same as all Nextcloud data; they are protected by server access control and the
  admin's disk/database security.
- **What this does not do**: the server and its admins can still read files. That is a stated
  non-goal; say it plainly to the professor.

### Testing

- **Local instance**: Nextcloud 35 in Docker, using the fpm image plus nginx with Nextcloud's
  documented nginx config, to mirror BST-Cloud. It has the two groups and three users (student,
  professor, lab). The professor's real account and BST-Cloud are not used for testing.
- **Integration check** (one `node:assert` script, run against the local instance) ports the
  most important `test:db` cases:
  - a student creates and submits a request;
  - a student cannot review, approve, see another student's request or file, or edit the audit log;
  - a professor approves, which creates an access grant, then revokes it;
  - lab staff edit printers and inventory, and students cannot;
  - file type and size limits are refused;
  - the rate limit triggers.
- **Unchanged**: `npm run test:unit` (estimate parser).
- **Manual**: click through all three roles in Chrome on the local instance, including OCR and
  STL preview, before packaging.

### Delivery

- `npm run package:nextcloud` builds `printlab-<version>.tar.gz` (the app folder with the built JS).
- `nextcloud-app/INSTALL.md` is the admin guide:
  1. Extract the tarball into `custom_apps/`.
  2. Run `occ app:enable printlab`.
  3. Create the groups `printlab-professors` and `printlab-lab` and add members.
  4. For updates: replace the folder and run `occ upgrade`.
  5. Note that the app stays disabled after a Nextcloud major upgrade until a new version raises
     `max-version`.
- **GitHub Pages**: keeps deploying the demo build.
- **Hand-off**: attach the tarball to a GitHub Release, or send it to the professor directly.

## Prerequisites and risks

- **Prerequisites**:
  - The admin installs the app and creates the groups (confirmed).
  - Students have BST-Cloud logins, or the admin creates them or turns on self-registration.
    This is assumed, not yet confirmed.
- **The user installs WSL2 + Docker Desktop on the dev PC** before any testing.
- **Static assets**: the OCR files may need an app route on BST-Cloud's nginx (see Constraints).
- **Nextcloud 36 upgrade**: the app is disabled until we bump `max-version` and re-test.
- **Self-declared matriculation numbers**: students type theirs in, so professors should check
  them on review. This is the same trust level as today.
- **Server limits are unknown**: upload size (nginx `client_max_body_size`, PHP
  `upload_max_filesize` / `post_max_size`), PHP `memory_limit` and the database type. Get them
  from the admin before packaging.
  - If they block 50 MB uploads, ask the admin to apply Nextcloud's documented recommended
    values.
  - If the admin declines, lower the cap. Chunked upload is not planned.

## Known limits in v1 (deliberate)

- **Deleted accounts**: deleting a Nextcloud account leaves that user's requests, audit rows
  and stored files in place. There is no cleanup listener. Add one (delete files, anonymize the
  profile) once accounts actually get deleted.
- **Audit-log retention and erasure** is a policy decision for the professor and SRH's data
  protection office. It is later work.
- **The in-app `active` flag** (`set_user_active`) is independent of Nextcloud's disabled state.
  A disabled Nextcloud account can't log in anyway.

## Left to the builder

- Exact routes, payload shapes and PHP class layout. Follow `AppContextValue` and `schema.sql`.
- How the Vite build emits and loads the bundle inside Nextcloud. `@nextcloud/vite-config` is the
  likely tool.
- The exact CSP calls for OCR, and whether OCR assets need an app route.
- Rate-limit mechanism: a counter table like today, or Nextcloud's built-in limiter if it
  matches the semantics.
- How PR-### / PR-## ids are generated portably across database engines.
- Whether the API uses plain app routes or OCS routes, and how the integration script
  authenticates (test users' app passwords on the local instance).
- App licence value in `info.xml`.
