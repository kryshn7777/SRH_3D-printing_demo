# BST-Cloud Files, Lab PC Client and Moodle Seam: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Students' files are stored encrypted on BST-Cloud through a Supabase edge function, and the lab PC client logs students in for real, lists their approved requests and opens the model in Bambu Studio.

**Architecture:** Upload and download rules move from Supabase Storage policies into SQL functions (`reserve_upload`, `release_upload`, `can_read_file`) that run with the caller's JWT. A thin edge function `files` encrypts the bytes (AES-256-GCM) and forwards them over WebDAV to a password-protected BST-Cloud share. The Python lab client (`local-client/`) calls the existing `login` function, PostgREST and `files`, all with the student's own token.

**Tech Stack:** Postgres/Supabase (PGlite tests), Deno edge functions (TypeScript, WebCrypto), React/TypeScript (Vite), Python 3.12 standard library (`unittest`, `urllib`, `http.server`).

**Spec:** `docs/superpowers/specs/2026-11-27-supabase-auth-bst-cloud-files-design.md`

## Global Constraints

- No BST-Cloud password, `FILES_ENCRYPTION_KEY` or Supabase `service_role` key in a browser, on the lab PC or in the repo. The `files` function uses no `service_role` key.
- Limits: models `.stl/.3mf/.obj` at most 52428800 bytes (50 MB); estimates `.png` at most 5242880 bytes (5 MB); at most 20 uploads per hour; 157286400 bytes (150 MB) total per user.
- New SQL functions: `security definer`, `set search_path = ''`, execute granted to `authenticated` only.
- WebDAV layout under the share root: `<kind>/<user-id>/<file>`, where `kind` is `models` or `estimates`.
- Stored file format: `0x01` version byte + 12-byte random IV + AES-256-GCM ciphertext (tag included).
- Lab client: Python 3 standard library only, server bound to `127.0.0.1:5175`, station folder `%LOCALAPPDATA%\SRH-3DP\session\`, local file name `<request-id>.<ext>`, auto logout 15 minutes after Bambu Studio closed (or after login if nothing was opened).
- Lab client copy: printer line `Print on: <printer name>`; other printers' requests greyed out with `Not at this station`; missing config shows `This station is not configured`.
- All of these must still pass at the end: `npm run test:db`, `npm run test:unit`, `npm run build`.

## Review Focus

- A project title, file name or printer name containing HTML (`<b>x</b>`, `<img src=x onerror=...>`) is shown in the lab client as literal text. Rendering it as HTML would let a student run script in the kiosk window, which can call `/api/open`. Test: Task 4, Step 3.
- The lab PC loses its network, or Supabase is down: the lab client shows "Cannot reach the server. Check the network." and keeps running. Test: Task 3, `test_network_down`.
- The student's token expires (1 hour) while they are logged in on the lab PC: the next action ends the session and cleans up, then shows "Please log in again." Test: Task 3, `test_requests_401`.
- File names with spaces or umlauts (`EV hood final.stl`, `Ölwanne.stl`) give a valid stored path inside the student's own folder. Test: Task 5, `reserve_upload sanitises names`.
- A missing or wrong-length `FILES_ENCRYPTION_KEY` stops the upload. Plaintext is never stored. Test: Task 6, `importKey rejects a 16-byte key`.

---

### Task 1: Moodle seam in the login function

**Files:**
- Modify: `supabase/functions/login/index.ts:103-115` (the email lookup and `signInWithPassword`)

**Interfaces:**
- Produces: `async function checkCredentials(identifier: string, isMatric: boolean, password: string): Promise<{ email: string | null; data: AuthTokenResponse['data']; error: AuthError | null }>`

- [ ] **Step 1: Move the "Resolve the login email" block and the `signInWithPassword` call into `checkCredentials`**

Keep the behaviour byte for byte: the same lookup, the same `nobody-<uuid>` decoy, the same return values. The handler calls `const { email, data, error } = await checkCredentials(identifier, isMatric, password);`. Put this comment above the function:

```ts
// Moodle hook: to log in with the LMS account instead, replace the body with
// token.php -> core_webservice_get_site_info -> find/create the profile -> mint the session.
// See docs/superpowers/specs/2026-11-27-supabase-auth-bst-cloud-files-design.md section 5.
```

- [ ] **Step 2: Verify the diff is a pure move**

Run: `git diff --stat supabase/functions/login/index.ts`
Expected: one file changed. In `git diff`, the moved lines are identical apart from indentation and the new wrapper. There is no Deno test harness; the function is tested end to end in Task 7, Step 6.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/login/index.ts
git commit -m "refactor(login): move credential check into checkCredentials (Moodle hook)"
```

### Task 2: Lab client core logic

**Files:**
- Commit baseline: `local-client/` as it is today (demo)
- Create: `local-client/station.py`
- Create: `local-client/test_station.py`
- Modify: `.gitignore` (add `local-client/config.json`, `__pycache__/`)

**Interfaces:**
- Produces (all in `local-client/station.py`):
  - `HOST = "127.0.0.1"`, `PORT = 5175`, `IDLE_LIMIT_S = 900`
  - `STATION_DIR: Path` = `Path(os.environ.get("LOCALAPPDATA", tempfile.gettempdir())) / "SRH-3DP" / "session"`
  - `load_config(path: Path) -> dict | None`: returns `None` unless the JSON has a non-empty `supabase_url` and `supabase_anon_key` and a list `station_printer_ids`
  - `request_allowed(method: str, host: str | None, origin: str | None, content_type: str | None) -> bool`
  - `station_view(rows: list[dict], station_ids: set[str], now: datetime) -> list[dict]`
  - `safe_local_name(request_id: str, file_type: str) -> str`
  - `idle_expired(last_activity: float, now: float, bambu_running: bool) -> bool`
  - `purge_station_dir(d: Path = STATION_DIR) -> None`

- [ ] **Step 1: Commit the demo client unchanged as a baseline**

```bash
git add local-client/README.md local-client/run_client.bat local-client/server.py local-client/static
git commit -m "chore: add lab PC client demo as baseline"
```

Do not add the two STL files in the repo root.

- [ ] **Step 2: Write the failing tests in `local-client/test_station.py`**

```python
class StationTests(unittest.TestCase):
    def test_guard_accepts_own_window(self):
        self.assertTrue(request_allowed("POST", "127.0.0.1:5175", "http://127.0.0.1:5175", "application/json"))
        self.assertTrue(request_allowed("GET", "127.0.0.1:5175", None, None))
    def test_guard_rejects_foreign(self):
        self.assertFalse(request_allowed("GET", "evil.example:5175", None, None))        # DNS rebinding
        self.assertFalse(request_allowed("POST", "127.0.0.1:5175", "https://evil.example", "application/json"))
        self.assertFalse(request_allowed("POST", "127.0.0.1:5175", None, "text/plain"))   # form-style CSRF
        self.assertFalse(request_allowed("GET", None, None, None))
    def test_station_view_filters_and_flags(self):
        now = datetime(2026, 12, 1, tzinfo=timezone.utc)
        live = {"expires_at": "2026-12-04T22:59:00+00:00", "revoked_at": None}
        rows = [
            {"id": "REQ-1", "printer_id": "PR-01", "access_grants": [live]},
            {"id": "REQ-2", "printer_id": "PR-09", "access_grants": [live]},
            {"id": "REQ-3", "printer_id": "PR-01", "access_grants": [{**live, "expires_at": "2026-11-30T00:00:00+00:00"}]},
            {"id": "REQ-4", "printer_id": "PR-01", "access_grants": [{**live, "revoked_at": "2026-11-29T10:00:00+00:00"}]},
        ]
        view = station_view(rows, {"PR-01"}, now)
        self.assertEqual([(r["id"], r["at_station"]) for r in view], [("REQ-1", True), ("REQ-2", False)])
    def test_safe_local_name(self):
        self.assertEqual(safe_local_name("REQ-1A2B", "STL"), "REQ-1A2B.stl")
        for bad in [("../x", "STL"), ("REQ-1", "EXE"), ("", "STL")]:
            with self.assertRaises(ValueError): safe_local_name(*bad)
    def test_idle_expired(self):
        self.assertFalse(idle_expired(0, 899, False))
        self.assertTrue(idle_expired(0, 901, False))
        self.assertFalse(idle_expired(0, 5000, True))
    def test_load_config(self):  # use a tempfile
        # missing file -> None; missing station_printer_ids -> None; complete file -> dict
        ...
```

Fill in `test_load_config` with those three cases.

- [ ] **Step 3: Run tests to verify they fail**

Run: `python -m unittest discover -s local-client -p "test_*.py" -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'station'`

- [ ] **Step 4: Implement `local-client/station.py`**

- `request_allowed`: `host` must equal `"127.0.0.1:5175"`; `origin` must be `None` or `"http://127.0.0.1:5175"`; for `POST`, `content_type` must start with `application/json`.
- `station_view`: keep a row if any grant has `revoked_at is None` and `datetime.fromisoformat(expires_at) > now`. Output keys: `id, project_title, file_name, file_type, material, printer_id, printer_name, storage_path, at_station`. Sort with `at_station` rows first, then by `id`.
- `safe_local_name`: `request_id` must match `^[A-Za-z0-9-]{1,40}$`; `file_type.lower()` must be in `{"stl","3mf","obj"}`. Otherwise raise `ValueError`.
- `idle_expired`: `not bambu_running and now - last_activity > IDLE_LIMIT_S`.
- `purge_station_dir`: `shutil.rmtree(d, ignore_errors=True)`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `python -m unittest discover -s local-client -p "test_*.py" -v`
Expected: all `StationTests` PASS

- [ ] **Step 6: Commit**

```bash
git add .gitignore local-client/station.py local-client/test_station.py
git commit -m "feat(lab-client): station rules - request guard, approved list, safe names, idle logout"
```

### Task 3: Lab client server talks to Supabase

**Files:**
- Create: `local-client/supabase_api.py`
- Create: `local-client/test_supabase_api.py`
- Create: `local-client/config.example.json`
- Modify: `local-client/server.py` (rewrite the handlers; keep `find_bambu_studio` and `BAMBU_PATHS`)

**Interfaces:**
- Consumes: everything in `station.py` (Task 2); the `files` GET contract from Task 7: `GET <supabase_url>/functions/v1/files?kind=models&path=<urlencoded storage_path>` with `Authorization: Bearer <access_token>` and `apikey: <anon key>`, returning the decrypted bytes (200) or `{"error": ...}` (401/404/502)
- Produces (in `supabase_api.py`):
  - `class ApiError(Exception)` with `.status: int` (0 = no connection) and `.message: str`
  - `login(cfg: dict, identifier: str, password: str) -> dict` (returns `{"access_token", "refresh_token"}`)
  - `profile(cfg: dict, token: str) -> dict` (returns `{"name", "matriculation_number"}`; the user id is the `sub` claim of the JWT, then `GET /rest/v1/profiles?select=name,matriculation_number&id=eq.<sub>`)
  - `approved_requests(cfg: dict, token: str) -> list[dict]` (`GET /rest/v1/print_requests?select=id,project_title,file_name,file_type,material,printer_id,printer_name,storage_path,access_grants(expires_at,revoked_at)&status=eq.APPROVED_ACCESS_GRANTED`)
  - `download_model(cfg: dict, token: str, storage_path: str) -> bytes`
  - `logout(cfg: dict, token: str) -> None` (`POST /auth/v1/logout`, never raises)
- Produces (HTTP API of `server.py`, used by Task 4):
  - `GET /api/status` -> `{"configured": bool, "bambu_detected": bool, "logged_in": bool, "user": {"name", "matriculation_number"} | null}`
  - `POST /api/login {"matriculationNumber", "password"}` -> `{"ok": true, "user": {...}}` or `{"ok": false, "error": str}`
  - `GET /api/requests` -> `{"ok": true, "requests": station_view(...)}`
  - `POST /api/open {"requestId"}` -> `{"ok": true}` or `{"ok": false, "error": str}`
  - `POST /api/logout` -> `{"ok": true}`

- [ ] **Step 1: Write the failing tests in `local-client/test_supabase_api.py`**

Start an `http.server.ThreadingHTTPServer` on port 0 in `setUpClass`, with a handler whose status and body each test sets. `cfg = {"supabase_url": f"http://127.0.0.1:{port}", "supabase_anon_key": "anon"}`.

```python
def test_login_error_message_passes_through(self):   # fake answers 401 {"error": "Matriculation number or password is incorrect."}
    with self.assertRaises(ApiError) as cm: login(cfg, "100000011", "x")
    self.assertEqual((cm.exception.status, cm.exception.message), (401, "Matriculation number or password is incorrect."))
def test_login_sends_anon_key(self):                  # fake records headers, answers 200 {"access_token": "a", "refresh_token": "r"}
    self.assertEqual(login(cfg, "100000011", "pw")["access_token"], "a")
    self.assertEqual(last_headers["apikey"], "anon")
def test_requests_401(self):                          # fake answers 401
    with self.assertRaises(ApiError) as cm: approved_requests(cfg, "t")
    self.assertEqual(cm.exception.status, 401)
def test_network_down(self):
    with self.assertRaises(ApiError) as cm: approved_requests({**cfg, "supabase_url": "http://127.0.0.1:9"}, "t")
    self.assertEqual((cm.exception.status, cm.exception.message), (0, "Cannot reach the server. Check the network."))
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python -m unittest discover -s local-client -p "test_*.py" -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'supabase_api'`

- [ ] **Step 3: Implement `local-client/supabase_api.py`**

Use one `urllib.request` helper that sends `apikey: <anon>` on every call plus `Authorization: Bearer <token or anon>`, with a 30 s timeout. An `HTTPError` becomes `ApiError(code, body["error"] or "Request failed.")`; a `URLError` or timeout becomes `ApiError(0, "Cannot reach the server. Check the network.")`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `python -m unittest discover -s local-client -p "test_*.py" -v`
Expected: all tests PASS

- [ ] **Step 5: Rewrite `local-client/server.py` on top of `station` and `supabase_api`**

- Delete the demo pieces: `DEFAULT_MODEL_PATH`, `compute_file_sha256`, the hard-coded Anna/PR-001 login, the CORS headers and `do_OPTIONS`.
- Every request first runs `request_allowed(...)`; on `False` answer 403 `{"ok": false, "error": "Forbidden."}`.
- Session state stays in memory only: `{"token", "user", "last_activity"}`. Tokens are never sent to the window.
- `POST /api/login`: `login` -> `profile` -> close Bambu Studio (`taskkill /IM bambu-studio.exe /F`) -> `purge_station_dir()` -> store the session.
- `GET /api/requests`: `station_view(approved_requests(...), set(cfg["station_printer_ids"]), now_utc)`.
- `POST /api/open`: fetch a fresh `station_view`. Only a row with `at_station` may open (otherwise 403). Then `download_model` -> write `STATION_DIR / safe_local_name(id, file_type)` -> `subprocess.Popen([exe, path], shell=False)` -> `last_activity = now`.
- `end_session()`: close Bambu Studio, `purge_station_dir()`, `logout(cfg, token)`, clear the state. Call it on `POST /api/logout`, on any `ApiError` with status 401 (then answer 401 `{"ok": false, "error": "Please log in again."}`), and from a daemon thread that checks every 30 s. While `tasklist /FI "IMAGENAME eq bambu-studio.exe"` lists the process, the thread sets `last_activity = now`; otherwise it calls `end_session()` once `idle_expired(...)` is true.
- On start: `purge_station_dir()`. `load_config(Path(__file__).with_name("config.json"))` is `None` -> `configured: false`, and `/api/login` answers 503 `{"ok": false, "error": "This station is not configured."}`.
- `ApiError` with status 0 -> 502 with its message.

- [ ] **Step 6: Write `local-client/config.example.json`**

```json
{ "supabase_url": "https://<project-ref>.supabase.co", "supabase_anon_key": "<anon key>", "station_printer_ids": ["PR-01", "PR-02", "PR-03", "PR-04", "PR-05"] }
```

- [ ] **Step 7: Smoke-check the guard on the running server**

Run: `python local-client/server.py` (second terminal), then `curl -s -o /dev/null -w "%{http_code}" -H "Host: evil.example:5175" http://127.0.0.1:5175/api/status` and `curl -s http://127.0.0.1:5175/api/status`
Expected: `403`, then JSON with `"configured": false` (no config.json yet)

- [ ] **Step 8: Commit**

```bash
git add local-client/supabase_api.py local-client/test_supabase_api.py local-client/config.example.json local-client/server.py
git commit -m "feat(lab-client): real Supabase login, approved list, model download, session clean-up"
```

### Task 4: Lab client window and docs

**Files:**
- Modify: `local-client/static/index.html` (script section from line 306, the authenticated view at lines 202-290, the demo box at lines 185-200)
- Modify: `local-client/static/styles.css` (greyed card style only)
- Modify: `local-client/README.md`, `local-client/run_client.bat` (remove the "Target Model" lines)

**Interfaces:**
- Consumes: the `server.py` HTTP API from Task 3

- [ ] **Step 1: Replace the demo parts of `index.html`**

- Remove the "1-Click Stakeholder Demo Account" box and all hard-coded Anna / PR-001 / EV hood values.
- After login, render one card per row from `GET /api/requests`: project title, file name, material, and `Print on: <printer name>` in large type. At-station rows get an **Open in Bambu Studio** button (`POST /api/open`). Other rows get the greyed class and the text `Not at this station`, with no button. No rows: "You have no approved print requests."
- Insert every server value with `textContent` or `createElement`, never `innerHTML`.
- `configured: false` -> hide the form and show `This station is not configured`.
- Poll `GET /api/status` every 30 s. If `logged_in` turns false while the list is showing, return to the login view with "Your session ended. Please log in again."
- Any `401` from the API does the same.

- [ ] **Step 2: Rewrite `local-client/README.md`**

Cover: lab PC setup (copy `config.example.json` to `config.json`; the printer IDs come from Supabase > Table Editor > `printers` > `id`), the student flow, what is cleaned up on logout, and the known limit that Bambu Studio's own recent files and backups stay on the PC. Remove the demo account and `password123` text.

- [ ] **Step 3: Verify in the browser against the real project**

Run `local-client\run_client.bat` with a real `config.json`. As Ajinkya on the website, approve one request for a station printer and one for a non-station printer. Give one of them the project title `<b>bold</b>`.
Expected:
- The station request opens Bambu Studio with the model, and the other card is greyed out with `Not at this station`.
- The title shows the literal text `<b>bold</b>`.
- After Log out, `%LOCALAPPDATA%\SRH-3DP\session` is gone and Bambu Studio is closed.

This step needs Task 7 deployed. Until then, check everything except the file opening.

- [ ] **Step 4: Commit**

```bash
git add local-client/static local-client/README.md local-client/run_client.bat
git commit -m "feat(lab-client): approved-request list window, greyed non-station printers, docs"
```

### Task 5: File rules in SQL

**Files:**
- Modify: `supabase/schema.sql` (`private.valid_model_path` / `valid_estimate_path` at lines 477-491, `private.upload_quota_ok` at lines 547-556, the storage section at lines 986-1035)
- Modify: `supabase/tests/schema.test.mjs` (the "storage rules" section at lines 166-199, and the request tests that pass `own(s1)` paths)

**Interfaces:**
- Produces (SQL, callable by `authenticated` with their own JWT):
  - table `private.files (path text primary key check (char_length(path) <= 300), kind text not null check (kind in ('models','estimates')), owner uuid not null references public.profiles (id) on delete cascade, size bigint not null check (size > 0), created_at timestamptz not null default now())`. No grants to `anon` or `authenticated`.
  - `public.reserve_upload(p_kind text, p_file_name text, p_size bigint) returns text`: path `<uid>/<epoch-ms>-<6 hex>-<base>.<ext>`. `base` = file name without extension, runs of `[^A-Za-z0-9._-]` replaced by `_`, cut to 60, empty -> `model`. `ext` lower-cased.
  - `public.release_upload(p_path text) returns void`
  - `public.can_read_file(p_kind text, p_path text) returns boolean`: true when the row exists with that kind and (`owner = auth.uid()` or `private.is_professor()`)
  - Errors (exact text): `Only students can upload files.`, `File type not allowed.`, `File is too large.`, `Upload limit reached (20 per hour, 150 MB in total).`

- [ ] **Step 1: Rewrite the "storage rules" tests**

Add the helper `const reserve = (u, kind, name, size = 1000) => as(u, 'authenticated', 'select public.reserve_upload($1,$2,$3) as p', [kind, name, size]).then((r) => r.rows[0].p);`. Replace `putObj` / `putEst` and every `own(...)` path used in `payload(...)` with paths from `reserve`. Tests:

```js
await test('reserve_upload gives a path in the own folder', async () => {
  const p = await reserve(s1, 'models', 'part.stl');
  assert.match(p, new RegExp(`^${s1}/\\d+-[0-9a-f]{6}-part\\.stl$`));
});
await test('reserve_upload sanitises names', async () => {
  assert.match(await reserve(s1, 'models', 'EV hood final.stl'), /-EV_hood_final\.stl$/);
  assert.match(await reserve(s1, 'models', 'Ölwanne.STL'), /-_lwanne\.stl$/);
  assert.equal((await reserve(s1, 'models', '../../x.stl')).split('/').length, 2);
});
await test('type and size limits', async () => {
  await rejects(reserve(s1, 'models', 'virus.exe'), /File type not allowed/);
  await rejects(reserve(s1, 'estimates', 'e.jpg'), /File type not allowed/);
  await rejects(reserve(s1, 'models', 'big.stl', 52428801), /File is too large/);
  await rejects(reserve(s1, 'estimates', 'e.png', 5242881), /File is too large/);
});
await test('staff cannot upload', () => rejects(reserve(prof, 'models', 'p.stl'), /Only students/));
await test('upload quota: 20 per hour', async () => { /* 20 reserves for s2, the 21st rejects /Upload limit reached/ */ });
await test('upload quota: 150 MB total per user', async () => { /* insert an old 157286400-byte private.files row for s3 as superuser, next reserve rejects /Upload limit reached/ */ });
await test('can_read_file: owner and professor only', async () => {
  const p = await reserve(s1, 'models', 'r.stl');
  const can = async (u) => (await as(u, 'authenticated', 'select public.can_read_file($1,$2) as ok', ['models', p])).rows[0].ok;
  assert.deepEqual([await can(s1), await can(prof), await can(s2), await can(lab)], [true, true, false, false]);
});
await test('release_upload removes only own unattached files', async () => { /* s2 cannot release s1's path; s1 can release an unused one; a path used by a request stays */ });
await test('API roles cannot touch private.files directly', () =>
  rejects(as(s1, 'authenticated', 'select * from private.files'), /permission denied/));
```

The existing "student submits a request (needs a real uploaded file)" test keeps its `missing.stl` rejection (`/upload your 3D model/`) and submits with a reserved path.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:db`
Expected: FAIL, `function public.reserve_upload(...) does not exist`

- [ ] **Step 3: Implement in `supabase/schema.sql`**

- Create `private.files` next to the other private tables.
- Point `valid_model_path` / `valid_estimate_path` and `upload_quota_ok()` (same signature, same 20-per-hour and 150 MB rule) at `private.files`.
- Add the three functions with `revoke execute ... from public, anon` and `grant execute ... to authenticated`.
- In the storage section, keep only `drop policy if exists` for `models_insert`, `models_select`, `estimates_insert`, `estimates_select`, and delete the bucket inserts and `create policy` statements.
- `reserve_upload` checks, in this order: `private.is_student()`, kind/extension, size, `private.upload_quota_ok()`, then inserts and returns the path.
- `release_upload` deletes where `owner = auth.uid()` and no `print_requests` row has it as `storage_path` or `estimate_image_path`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:db`
Expected: `NN passed` with no `FAIL` lines (the schema is applied twice, so it must stay re-runnable)

- [ ] **Step 5: Commit**

```bash
git add supabase/schema.sql supabase/tests/schema.test.mjs
git commit -m "feat(db): file records in private.files; reserve/release/can_read_file replace storage policies"
```

### Task 6: File encryption module

**Files:**
- Create: `supabase/functions/files/crypto.ts` (WebCrypto only, no Deno or npm imports, so Node can test it)
- Create: `supabase/functions/files/crypto.test.ts`
- Modify: `package.json` (`"test:unit": "node tests/sliceEstimate.test.ts && node supabase/functions/files/crypto.test.ts"`)

**Interfaces:**
- Produces:
  - `importKey(base64: string): Promise<CryptoKey>`: throws `Error('FILES_ENCRYPTION_KEY must be 32 bytes, base64.')` unless the key decodes (`atob`) to exactly 32 bytes
  - `encrypt(key: CryptoKey, plain: Uint8Array): Promise<Uint8Array>`: returns `[0x01, ...iv(12), ...ciphertext]`
  - `decrypt(key: CryptoKey, stored: Uint8Array): Promise<Uint8Array>`: throws on an unknown version byte or a failed tag check

- [ ] **Step 1: Write the failing tests**

```ts
const key = await importKey(btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))));
const data = new TextEncoder().encode('solid part\nendsolid');
const a = await encrypt(key, data), b = await encrypt(key, data);
assert.equal(a[0], 1);
assert.notDeepEqual(a, b);                                   // fresh IV each time
assert.deepEqual(await decrypt(key, a), data);               // round trip
const tampered = a.slice(); tampered[20] ^= 1;
await assert.rejects(decrypt(key, tampered));                // tag check
const wrongVersion = a.slice(); wrongVersion[0] = 2;
await assert.rejects(decrypt(key, wrongVersion));
await assert.rejects(importKey(btoa('x'.repeat(16))), /32 bytes/);   // importKey rejects a 16-byte key
```

- [ ] **Step 2: Run to verify it fails**

Run: `node supabase/functions/files/crypto.test.ts`
Expected: FAIL, `Cannot find module ... crypto.ts`

- [ ] **Step 3: Implement `crypto.ts`** with `crypto.subtle` `AES-GCM` (256-bit raw key, 12-byte IV from `crypto.getRandomValues`).

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test:unit`
Expected: both test files report success, exit code 0

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/files/crypto.ts supabase/functions/files/crypto.test.ts package.json
git commit -m "feat(files): AES-256-GCM file encryption module with tests"
```

### Task 7: `files` edge function and setup docs

**Files:**
- Create: `supabase/functions/files/index.ts`
- Modify: `supabase/README.md` (new step "Files on BST-Cloud"; CAPTCHA line in step 3 -> "leave off until the CAPTCHA follow-up")

**Interfaces:**
- Consumes: `importKey`, `encrypt`, `decrypt` (Task 6); `reserve_upload`, `release_upload`, `can_read_file` (Task 5)
- Produces:
  - `POST /functions/v1/files?kind=models|estimates&name=<file name>`, raw bytes as the body -> 200 `{"path": string}`. Errors: 400 bad kind/name, 401 no or invalid JWT, 413 over the size limit, 403/429 SQL rule errors with their message, 502 `{"error": "Upload failed. Please try again."}`, 500 `{"error": "Storage is not configured."}`
  - `GET /functions/v1/files?kind=...&path=...` -> 200 decrypted bytes, `Content-Type: application/octet-stream`, `Content-Disposition: attachment; filename="<last path segment>"`, `Cache-Control: no-store`. Not allowed or missing -> 404 `{"error": "File not found."}`
- Secrets: `NEXTCLOUD_DAV_ROOT`, `NEXTCLOUD_DAV_USER`, `NEXTCLOUD_DAV_PASSWORD`, `FILES_ENCRYPTION_KEY`, optional `ALLOWED_ORIGINS`

- [ ] **Step 1: The owner checks the share's WebDAV login (you never handle the password)**

Ask the owner to create the `3d-printing` folder and its password-protected link with "Allow upload and editing", then run on their own machine:
`curl -s -o /dev/null -w "%{http_code}" -u "anonymous:<share password>" -X PROPFIND -H "Depth: 1" https://cloud.bstsrhberlin.com/public.php/dav/files/<share-token>/`
Expected: `207`. If it is `401`, retry with the share token as the user name. Whichever works is `NEXTCLOUD_DAV_USER`. If link uploads are disabled on BST-Cloud, use the app-password fallback values from the spec.

- [ ] **Step 2: Implement `supabase/functions/files/index.ts`**

- Copy `cors()` and `json()` from `login/index.ts` (methods `GET, POST, OPTIONS`).
- Create the Supabase client with the anon key and `global.headers.Authorization` set to the caller's header. The SQL then sees the real `auth.uid()`; a missing header -> 401.
- POST:
  1. Reject on `Content-Length` or `byteLength` above the kind's limit (413).
  2. `rpc('reserve_upload')` with `p_size = byteLength`.
  3. `encrypt`.
  4. `MKCOL` `<root>/<kind>` and `<root>/<kind>/<uid>` (405 means it exists: ignore).
  5. `PUT` `<root>/<kind>/<path>` with Basic auth (expect 201 or 204).
  6. On any failure after the reserve: `rpc('release_upload')`, answer 502.
- GET: `rpc('can_read_file')` false -> 404; `GET` from WebDAV (404 -> 404); `decrypt`; return the bytes.
- `importKey` runs per request; a failure answers 500 `Storage is not configured.` before anything is stored.

- [ ] **Step 3: Write the README step**

Folder + link (Step 1 above); the four secrets, with `FILES_ENCRYPTION_KEY` generated by `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` and saved in a password manager (lose it and every stored file is unreadable); deploy `files`; re-run `schema.sql`.

- [ ] **Step 4: Deploy and test the upload size limit**

The owner deploys the function with the secrets. Upload a 50 MB `.stl` as a student through the website (after Task 8) or with `curl`.
Expected: 200. If the function runs out of memory or time, lower the 50 MB limit in `reserve_upload`, `print_requests.file_size_bytes`, `create_request` and the website's upload check to the largest size that works, and record it in the spec.

- [ ] **Step 5: Verify the stored file is encrypted**

Download the stored file straight from the BST-Cloud share in a browser, and the same file through `GET /files`.
Expected: the share copy starts with byte `0x01` and is not readable as STL. The `GET /files` copy has the same SHA-256 as the original.

- [ ] **Step 6: End-to-end login check**

On the real project, sign up as a student, confirm, log in with the matriculation number, then do the same on the lab client (Task 4, Step 3).
Expected: both logins succeed; a wrong password shows `Matriculation number or password is incorrect.` (this exercises Task 1's refactor)

- [ ] **Step 7: Commit**

```bash
git add supabase/functions/files/index.ts supabase/README.md
git commit -m "feat(files): edge function forwarding encrypted files to BST-Cloud over WebDAV"
```

### Task 8: Website uses the `files` function

**Files:**
- Modify: `src/lib/modelStore.ts` (all four `supabase.storage` calls)

**Interfaces:**
- Consumes: the `files` HTTP contract (Task 7)
- Produces: the same `registerRemoteModelStore` / `registerRemoteImageStore` behaviour as today: `save` returns the stored path, `load` returns the bytes or `null`

- [ ] **Step 1: Switch `save` and `load` to the function**

- `save`: `supabase.functions.invoke('files?kind=models&name=' + encodeURIComponent(fileName), { body: new Blob([buffer], { type: 'application/octet-stream' }) })`, returns `data.path`. Same pattern for `estimates` with the PNG.
- `load`: `invoke('files?kind=…&path=' + encodeURIComponent(key), { method: 'GET' })`, returns a `Blob`.
- Map a non-2xx response to the existing user messages ("Upload was refused (too many uploads this hour, or the file is not allowed)." for 403/413/429, "Upload failed. Please try again." otherwise).
- If `invoke` drops the query string, use `fetch` on `${VITE_SUPABASE_URL}/functions/v1/files?...` with the session's `Authorization` and `apikey` headers instead.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: no TypeScript errors, `dist/` written

- [ ] **Step 3: Verify in live mode**

Run `npm run dev` with `.env.local` set. As a student, submit a request with an STL and an estimate screenshot. As Ajinkya, open the review page.
Expected: the 3D preview and the estimate image load for both users, and the files appear (encrypted) in the BST-Cloud share under `models/<uid>/` and `estimates/<uid>/`.

- [ ] **Step 4: Commit, push, publish**

```bash
git add src/lib/modelStore.ts
git commit -m "feat(web): upload and download files through the files function (BST-Cloud)"
git push origin main
```

Then rebuild and publish `dist/` (with `404.html`) to `gh-pages`, as the project CLAUDE.md says.
