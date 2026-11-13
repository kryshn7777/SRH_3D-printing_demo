# Print Estimate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Students attach a Bambu Studio estimate, either a screenshot (read in the browser) or a sliced
`.gcode` / `.gcode.3mf` file (parsed in the browser). Every extracted value is shown on the request
form, on the professor's review page and on the student's details page. An estimate is required to submit.

**Architecture:**
- Pure parsers live in `src/utils/sliceEstimate.ts`, with no DOM, so Node can test them. Only the browser
  OCR glue lives in `src/utils/estimateOcr.ts`.
- The screenshot is stored as PNG. In demo mode it uses the existing IndexedDB blob store. In live mode it
  goes to a new private Supabase bucket, `estimates`.
- The extracted rows travel on the request as `estimate`: a JSON column in live mode, the request object in
  demo mode.

**Tech Stack:** React 19 + TS + Vite, tesseract.js 7.0.0 (new dependency), Supabase/Postgres (PGlite tests),
Node 24 (runs `.ts` tests directly).

**Spec:** `docs/superpowers/specs/2026-11-13-print-estimate-design.md`

## Global Constraints

- Rows are text exactly as shown or read. Never convert or round away information, and never drop a line.
- Limits: ≤ 60 rows; label ≤ 60 chars; value 1–80 chars; `source` is `'IMAGE' | 'FILE'`; optional
  `plate` 1–99; file names ≤ 200 chars.
- Screenshot: any image the browser can decode, raw input ≤ 20 MB. It is stored as PNG with a longest side
  of 2400 px and must be ≤ 5 MB.
- Sliced files are never uploaded or stored. Only the rows and `slicedFileName` are kept.
- Required to submit: an image or ≥ 1 row. This is enforced in `create_request` (non-draft), `submit_draft`
  and the local `createOrSubmitRequest` / `submitDraftRequest`. Drafts are exempt.
- Missing-estimate error copy, verbatim: `Please attach your print estimate (slicer screenshot or sliced file).`
- Unsliced 3MF copy, verbatim: `This 3MF was not sliced. In Bambu Studio use "Export plate sliced file" or "Export G-code".`
- Cost copy when the price is 0 or missing: `no filament price set in slicer profile`
- UI wording for file values: "read from the sliced file in your browser". Never call them "exact" or
  "verified".
- OCR languages: `eng` + `deu`.
- `supabase/schema.sql` must stay re-runnable: the test already runs it twice.

## Review Focus

1. **Phone photo or blurry screenshot.** OCR returns junk or nothing. The student must still be able to
   submit (the image counts), see whatever rows were read, and edit or delete them. → Task 3: `rows=[]` +
   image is a valid estimate.
2. **HEIC / undecodable image.** A clear error appears and the form keeps working. → Task 3 copy:
   `Could not open this image. Please save it as PNG or JPEG.`
3. **Multi-plate `.gcode.3mf` ("Export all sliced files").** Every plate gets its own rows with `plate` set,
   and none are merged or dropped. → Task 1 test with a 2-plate fixture.
4. **Plain `.gcode` from another slicer, or a truncated file.** It is rejected with a message, not shown as
   empty rows. → Task 1 test: `readSlicedFile` throws
   `No Bambu Studio estimate found in this file.`
5. **Old requests with no estimate.** The display card renders nothing, and editing an old draft lets the
   student add one. → Task 4: `PrintEstimateCard` returns `null` when `estimate` is undefined.

---

### Task 1: Pure parsers + fixtures (`sliceEstimate.ts`)

**Files:**
- Create: `src/utils/sliceEstimate.ts`
- Create: `tests/sliceEstimate.test.ts`
- Create: `src/utils/__fixtures__/bambu/` with `cube-1f.gcode`, `cube-1f.gcode.3mf`, `two-filament.gcode.3mf`,
  `two-plate.gcode.3mf`, `estimate-panel.png`
- Modify: `src/types/models.ts` to add the types below. `PrintRequest.estimate?: PrintEstimate`.
- Modify: `package.json`, adding the script `"test:unit": "node tests/sliceEstimate.test.ts"`.

**Interfaces (Produces):**
```ts
// src/types/models.ts
export interface EstimateRow { label: string; value: string; source: 'IMAGE' | 'FILE'; plate?: number }
export interface PrintEstimate { rows: EstimateRow[]; imageKey?: string; imageName?: string; slicedFileName?: string }
// src/utils/sliceEstimate.ts  (import type only from ../types/models; no DOM APIs)
export function hasEstimate(e: PrintEstimate | null | undefined): boolean // !!e && (!!e.imageKey || e.rows.length > 0)
export function parseEstimateText(text: string): EstimateRow[]           // OCR text -> IMAGE rows
export function parseGcodeHeader(text: string): EstimateRow[]            // plain .gcode text -> FILE rows
export async function readSlicedFile(file: Blob, name: string): Promise<EstimateRow[]> // .gcode | .gcode.3mf | .3mf
```

**Fixtures.** Generate them with the installed CLI. The working command was:
`"C:/Program Files/Bambu Studio/bambu-studio.exe" --arrange 1 --slice 0 --load-settings "<BBL>/machine/Bambu Lab P1P 0.4 nozzle.json;<BBL>/process/0.20mm Standard @BBL P1P.json" --load-filaments "<filament.json>" --export-3mf out.gcode.3mf --outputdir <dir> <stl>`.
Here `<BBL>` = `C:/Program Files/Bambu Studio/resources/profiles/BBL`, and the CLI also writes `plate_1.gcode`.

- Copy `<BBL>/filament/Bambu PLA Basic @BBL X1C.json` to a scratch folder. Add
  `"filament_density": ["1.26"]` and `"filament_cost": ["24.99"]` so grams and cost are non-zero. Make a
  PETG copy with `["1.27"]`/`["19.99"]` and `"filament_type": ["PETG"]`.
- Two filaments: `--load-filaments "pla.json;petg.json"` with two cube STLs, and assign the second object
  to filament 2. Try `--load-filament-ids "1,2"`. If the CLI cannot assign, hand-edit
  `Metadata/model_settings.config` (`<metadata key="extruder" value="2"/>`) in a project 3mf and re-slice
  it.
- Two plates: two objects too big to share a plate, or `--slice 0` on a 3mf that has 2 plates.
- `estimate-panel.png`: copy from
  `C:\Users\CLAWR\AppData\Local\Temp\claude\97e1fdd112e2fd98\30f3be41-ea22-4fb8-8cf3-e3efab2bd6d9\images\1.png`.
- If two-filament or two-plate generation fails after 3 tries, fall back to a hand-built zip test made with
  Node's `zlib.deflateRawSync`. Say so in the report.

**Ground truth, verified with Bambu Studio 02.08.02.61:**
- Header lines look like `; model printing time: 10m 11s; total estimated time: 10m 12s`,
  `; total layer number: 100`, `; total filament length [mm] : 1232.42`,
  `; total filament weight [g] : 0.00`, `; max_z_height: 20.00`, `; filament: 1`, and the version line
  `; BambuStudio 02.08.02.61`.
- The config block has `; filament_cost = …`, `; filament_density = …` and `; filament_type = …`. List
  values are separated by `,` or `;`, so split on both.
- 3MF entries:
  - `Metadata/slice_info.config`: `<plate>` → `<metadata key="index|prediction|weight">` plus
    `<filament id type color used_m used_g>`.
  - `Metadata/plate_N.gcode`: the same header.
  - `Metadata/project_settings.config`: JSON with `filament_cost`, `filament_type` and
    `filament_density` arrays.
- PNG entries are stored (method 0). Everything else is deflate (method 8).

- [ ] **Step 1: Generate fixtures** (above). Check with `python -I -c "import zipfile;…"` that each 3mf has
  `slice_info.config` with non-zero `used_g`.

- [ ] **Step 2: Write failing tests** in `tests/sliceEstimate.test.ts`:
  - Use `node:assert/strict` and import from `../src/utils/sliceEstimate.ts`.
  - Read fixtures with `fs.readFileSync` and wrap them in `new Blob([...])`.
  - Helper: `const v = (rows, label, plate?) => rows.find(r => r.label === label && r.plate === plate)?.value`.

  ```ts
  // parseEstimateText — the reference panel's OCR text, plus noise variants
  const ocr = 'Total Estimation\nTotal Filament: 0.39 m 1.19 g\nModel Filament: 0.39 m   1.18 g\nCost: 0.03\nPrepare time: 6m43s\nModel printing time: 3m51s\nTotal time: 10m35s\n';
  const rows = parseEstimateText(ocr);
  assert.deepEqual(rows.filter(r => r.label).map(r => [r.label, r.value]), [
    ['Total Filament','0.39 m 1.19 g'], ['Model Filament','0.39 m 1.18 g'], ['Cost','0.03'],
    ['Prepare time','6m43s'], ['Model printing time','3m51s'], ['Total time','10m35s']]);
  assert.ok(rows.every(r => r.source === 'IMAGE'));
  assert.ok(rows.some(r => r.label === '' && r.value === 'Total Estimation'));   // no line dropped
  assert.equal(v(parseEstimateText('Cost; 0.03'), 'Cost'), '0.03');               // ';' misread as ':'
  assert.equal(v(parseEstimateText('Gesamtzeit: 10m35s'), 'Gesamtzeit'), '10m35s'); // German label kept
  assert.ok(parseEstimateText('x: ' + 'y'.repeat(200)).every(r => r.value.length <= 80));

  // parseGcodeHeader / readSlicedFile on cube-1f.gcode
  const g = await readSlicedFile(new Blob([fs.readFileSync(F + 'cube-1f.gcode')]), 'cube-1f.gcode');
  for (const l of ['Total time','Model printing time','Prepare time','Total filament','Cost','Material','Layers','Max height','Slicer'])
    assert.ok(v(g, l), 'missing ' + l);
  assert.match(v(g,'Total filament'), /^\d+\.\d{2} m {2}\d+\.\d{2} g$/);
  assert.match(v(g,'Cost'), /^\d+\.\d{2}$/);                       // computed g/1000 * 24.99
  // Prepare time == Total − Model printing time (parse both, compare seconds)

  // .gcode.3mf: same labels as the .gcode of the same slice, identical values
  const z = await readSlicedFile(new Blob([fs.readFileSync(F + 'cube-1f.gcode.3mf')]), 'cube-1f.gcode.3mf');
  for (const l of ['Total time','Model printing time','Prepare time','Total filament','Cost']) assert.equal(v(z,l,1), v(g,l));

  // two-filament: one row per filament + total; cost sums per-filament prices
  const t = await readSlicedFile(blob('two-filament.gcode.3mf'), 'two-filament.gcode.3mf');
  assert.ok(v(t,'Filament 1 (PLA)',1) && v(t,'Filament 2 (PETG)',1));
  // two-plate: rows for plate 1 and plate 2 each have 'Total time'
  const p = await readSlicedFile(blob('two-plate.gcode.3mf'), 'two-plate.gcode.3mf');
  assert.ok(v(p,'Total time',1) && v(p,'Total time',2));

  // price missing -> exact copy; unsliced / foreign files -> exact errors
  assert.equal(v(parseGcodeHeader(cubeText.replace(/filament_cost = [^\n]*/, 'filament_cost = 0')), 'Cost'), 'no filament price set in slicer profile');
  await assert.rejects(readSlicedFile(unslicedProject3mf, 'model.3mf'), /This 3MF was not sliced/);
  await assert.rejects(readSlicedFile(new Blob(['G1 X0 Y0\n']), 'other.gcode'), /No Bambu Studio estimate found in this file\./);
  assert.equal(hasEstimate({ rows: [], imageKey: 'k' }), true);
  assert.equal(hasEstimate({ rows: [] }), false);
  ```
  `unslicedProject3mf` is a zip without `slice_info.config`. Build it in the test with
  `zlib.deflateRawSync` plus a minimal zip writer, or slice with `--export-3mf` but without `--slice`.

- [ ] **Step 3: Run it and confirm it fails.** `npm run test:unit` → FAIL (module missing).

- [ ] **Step 4: Implement `src/utils/sliceEstimate.ts`.**
  - Plain `.gcode`: `await file.slice(0, 512 * 1024).text()`.
  - ZIP: read the End Of Central Directory record (signature `0x06054b50`, searched backwards in the last
    64 KB). Walk the central directory (`0x02014b50`) to get the name, method, compressed size and local
    header offset. Data starts at local offset + 30 + nameLen + extraLen, using the local header's own
    lengths. Inflate with `new Response(blob.slice(start, start + csize).stream().pipeThrough(new DecompressionStream('deflate-raw')))`.
    For `plate_N.gcode`, read the stream reader only until `HEADER_BLOCK_END` plus the config keys are
    seen (cap 1 MB), then `cancel()`.
  - XML: use regexes on `<plate>…</plate>` blocks and their attributes. Do not use DOMParser, so it stays
    Node-safe.
  - Row labels, in order per plate: `Total time`, `Model printing time`, `Prepare time`,
    `Total filament`, one `Filament {id} ({type})` per filament, `Material`, `Cost`, `Layers`,
    `Max height`, `Slicer`.
  - Value formats:
    - times as in the header (`10m 12s`); prepare time in the same `Xd Yh Zm Ws` style, dropping leading
      zero units
    - filament as `{m.toFixed(2)} m  {g.toFixed(2)} g`
    - cost as `toFixed(2)`
    - `Max height` as `{z} mm`
    - `Material` is the `filament_type` values of the used filaments, joined with `, `
  - Cost = Σ(used_g_i / 1000 × filament_cost_i).
    - Plain `.gcode` with more than one used filament: cost only if all used prices are equal. Otherwise
      use the value `needs per-filament weights (use .gcode.3mf)`.
  - Single-plate files still set `plate: 1` on every FILE row.
  - Check the `Total filament` vs panel semantics against the two-filament fixture: does the header
    weight equal the sum of `used_g`? Put the finding in a one-line comment.

- [ ] **Step 5: Run.** `npm run test:unit` → all pass. `npx tsc -b` → clean.

- [ ] **Step 6: Commit.** `git add src/utils/sliceEstimate.ts src/utils/__fixtures__ tests package.json src/types/models.ts && git commit -m "feat(estimate): Bambu slicer estimate parsers (.gcode, .gcode.3mf, OCR text)"`

---

### Task 2: Backend (schema + tests)

**Files:** Modify `supabase/schema.sql` and `supabase/tests/schema.test.mjs`.

**Interfaces (Produces):**
- Columns `print_requests.estimate jsonb` and `print_requests.estimate_image_path text`
  (≤ 300 chars), added with `add column if not exists`.
- `create_request` reads `p_payload -> 'estimate'` (shape `PrintEstimate`) and stores:
  - `estimate` = `{rows, imageName?, slicedFileName?}`, cleaned
  - `estimate_image_path` = `estimate.imageKey`, validated
- Bucket `estimates`: private, `file_size_limit 5242880`, `allowed_mime_types array['image/png']`. Object
  names are `<uid>/<name>.png`.

- [ ] **Step 1: Failing tests.**
  - Change the `payload()` default to include
    `estimate: { rows: [{ label: 'Total time', value: '10m 35s', source: 'FILE', plate: 1 }], slicedFileName: 'a.gcode' }`.
  - Add a `putEst(u, name)` helper, like `putObj` but with bucket `'estimates'`.
  - Add these cases:
    - `submit needs a print estimate`:
      - `payload(own(s1), { estimate: null })` rejects with `/print estimate/`.
      - A draft with `estimate: null` is created fine, then `submit_draft` rejects with `/print estimate/`.
      - `{ estimate: { rows: [], imageKey: own(s1,'est.png') } }` after `putEst(s1, own(s1,'est.png'))`
        succeeds.
    - `estimate is validated and cleaned`:
      - 61 rows → `/Invalid print estimate/`
      - a value of 81 chars → `/Invalid print estimate/`
      - source `'X'` → `/Invalid print estimate/`
      - a row with an extra key `x` is stored without `x`. Check with
        `select estimate->'rows'->0 ? 'x' as has`, expect `false`.
    - `estimate image must be the student's own png`:
      - `putEst(s1, own(s1,'e.jpg'))` → `/row-level security/`
      - `putEst(s1, own(s2,'e.png'))` → `/row-level security/`
      - a non-draft with `imageKey: own(s2,'e.png')` → `/estimate screenshot/`
    - `professor reads estimate images; other students cannot`: same shape as the existing `models` test.
  - Keep every existing test passing. The quota tests count both buckets now, which is still correct for
    them.

- [ ] **Step 2: Run.** `npm run test:db` → the new tests FAIL.

- [ ] **Step 3: Implement in `schema.sql`.**
  - `private.clean_estimate(p jsonb) returns jsonb`: `security definer`, `set search_path = ''`.
    - Null or JSON null → null.
    - Otherwise rebuild `{rows, imageName, slicedFileName}`, keeping only known keys, under the Global
      Constraints limits.
    - Violation → `raise exception 'Invalid print estimate.'`.
  - `private.valid_estimate_path(p_path text, p_uid uuid)`: mirrors `valid_model_path`, using bucket
    `'estimates'`.
  - `create_request`:
    - Clean the estimate.
    - Image path invalid → null on drafts, else `raise exception 'Please upload your estimate screenshot again.'`.
    - Non-draft without an image and without rows → raise the Global Constraints copy.
    - Write both columns in the insert and update branches.
  - `submit_draft`: the same "has estimate" check on the row.
  - `upload_quota_ok()`: `where o.bucket_id in ('models','estimates')`.
  - Bucket upsert plus `estimates_insert` / `estimates_select` policies that mirror `models_*`, with the
    name regex `'^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,120}\.png$'`. Add `drop policy if exists` first.

- [ ] **Step 4: Run.** `npm run test:db` → all pass, including the schema being re-run twice.

- [ ] **Step 5: Commit.** `git commit -m "feat(db): print estimate column, estimates bucket, required on submit"`

---

### Task 3: Storage + OCR + form section

**Files:**
- Create: `src/utils/estimateImageStore.ts`, `src/utils/estimateOcr.ts`,
  `src/components/PrintEstimateSection.tsx`
- Modify:
  - `src/lib/modelStore.ts`: register the remote image store
  - `src/context/appTypes.ts`: `CreateRequestPayload.estimate?: PrintEstimate`
  - `src/context/LocalProvider.tsx`: store `estimate`; enforce the rule in `createOrSubmitRequest`
    (non-draft) and `submitDraftRequest`
  - `src/context/LiveProvider.tsx`: `mapRequest` → `estimate`
  - `src/pages/NewRequestPage.tsx`: state + section + validation
  - `package.json`: dependency `"tesseract.js": "7.0.0"`

**Interfaces:**
- Consumes (Task 1): `EstimateRow`, `PrintEstimate`, `hasEstimate`, `parseEstimateText`, `readSlicedFile`.
- Produces:
  ```ts
  // estimateImageStore.ts
  export function registerRemoteImageStore(s: { save(png: Blob): Promise<string>; load(key: string): Promise<Blob | null> }): void
  export async function saveEstimateImage(png: Blob): Promise<string>   // remote if registered, else saveModelBlob(`est_${Date.now()}`, buf, 'estimate.png', 'PNG')
  export async function loadEstimateImage(key: string): Promise<Blob | null> // remote if registered && key includes '/', else loadModelBlob -> Blob
  // estimateOcr.ts (browser only)
  export async function readEstimateImage(file: File): Promise<{ rows: EstimateRow[]; png: Blob }>
  // PrintEstimateSection.tsx
  export const PrintEstimateSection: React.FC<{ value: PrintEstimate | null; onChange(v: PrintEstimate | null): void; error?: string | null }>
  ```

- [ ] **Step 1: `estimateOcr.ts`.**
  - `createImageBitmap(file)`. If that fails, throw `Could not open this image. Please save it as PNG or JPEG.`
  - Reject files over 20 MB.
  - Stored PNG: draw scaled to a longest side ≤ 2400 px and `toBlob('image/png')`. While the result is
    over 5 MB, scale by 0.75.
  - OCR canvas: 3× scale (cap the longest side at 4000), grayscale, invert when mean luminance < 128.
  - Recognise with `const { createWorker } = await import('tesseract.js')`, using
    `createWorker(['eng','deu'])`. Terminate the worker after use.
  - Return `{ rows: parseEstimateText(text), png }`.

- [ ] **Step 2: Image store.**
  - `estimateImageStore.ts` as specified.
  - In `lib/modelStore.ts`, call `registerRemoteImageStore`:
    - `save`: upload to bucket `'estimates'` at `${uid}/${Date.now()}-estimate.png`, with
      `contentType: 'image/png'` and `upsert: false`. Map errors like the existing model upload does.
    - `load`: download.

- [ ] **Step 3: `PrintEstimateSection`.**
  - A card titled `Print Estimate (from Bambu Studio)`. Required asterisk; place it under the
    "Upload Files" card and use the same card classes.
  - Two drop zones:
    - Image: `accept="image/*"`.
    - Sliced file: `accept=".gcode,.3mf"`. Help text: `Export plate sliced file (.gcode.3mf) or Export G-code`.
  - Loading state while OCR runs: "Reading screenshot…".
  - Table columns: Label / Value / Source (`Screenshot` | `Sliced file` + ` · plate N` when more than one
    plate).
  - IMAGE rows: label and value are text inputs, with a ✕ to delete a row and "+ Add row".
  - FILE rows: read-only. Caption: `Read from the sliced file in your browser.`
  - Thumbnail of the PNG (object URL; revoke it on change), with a Remove button.
  - Remove file: drops the FILE rows and `slicedFileName`.
  - Merging: IMAGE rows and FILE rows coexist. Replacing one source replaces only that source's rows.
  - Calls `onChange(null)` when nothing is left.

- [ ] **Step 4: Wire the form.**
  - In `NewRequestPage`: `const [estimate, setEstimate] = useState<PrintEstimate | null>(existingDraft?.estimate ?? null)`.
  - Render the section after "Upload Files".
  - In `validateForm`, when not a draft: `if (!hasEstimate(estimate)) errs.push('Please attach your print estimate (slicer screenshot or sliced file).')`.
  - Pass `estimate: estimate ?? undefined` to `createOrSubmitRequest`.
  - `fillSampleProject` sets a FILE estimate with the six reference values, `source: 'FILE', plate: 1`,
    `slicedFileName: 'robot_arm_joint.gcode.3mf'`, so the demo quick-fill still submits.

- [ ] **Step 5: Providers.**
  - Local: `estimate: payload.estimate`. Return the copy error when it's not a draft and
    `!hasEstimate(payload.estimate)`. Same check in `submitDraftRequest` on `existing.estimate`.
  - Live `mapRequest`:
    `estimate: r.estimate || r.estimate_image_path ? { rows: r.estimate?.rows ?? [], imageName: r.estimate?.imageName, slicedFileName: r.estimate?.slicedFileName, imageKey: r.estimate_image_path ?? undefined } : undefined`.
  - Seed data (`src/data/seedData.ts`): give the non-draft seeded requests a FILE estimate, so demo
    detail pages show the card.

- [ ] **Step 6: Verify.** `npx tsc -b && npm run build` → clean. `npm run test:unit` → still passes.

- [ ] **Step 7: Commit.** `git commit -m "feat(estimate): screenshot OCR + sliced-file import on the request form"`

---

### Task 4: Display + edit links

**Files:**
- Create: `src/components/PrintEstimateCard.tsx`
- Modify: `src/pages/ProfessorReviewPage.tsx`, `src/pages/StudentRequestDetailsPage.tsx`,
  `src/pages/MyRequestsPage.tsx`

**Interfaces:**
- Consumes: `PrintEstimate` and `loadEstimateImage` (Task 3).
- Produces: `export const PrintEstimateCard: React.FC<{ estimate?: PrintEstimate }>`. It returns `null`
  when `estimate` is undefined.

- [ ] **Step 1: `PrintEstimateCard`.**
  - Heading `Print Estimate`.
  - Rows grouped as Screenshot / Sliced file (by plate when there is more than one). Every row is shown.
  - `slicedFileName` shown.
  - Thumbnail loaded via `loadEstimateImage`. Click opens it full size in a modal (the existing modal
    pattern) or a new tab via an object URL.
- [ ] **Step 2: Render the card** next to or below the 3D model card on both detail pages.
- [ ] **Step 3: "Edit" link.** Add `<Link to={`/student/requests/new?draftId=${id}`}>Edit</Link>` for
  `DRAFT` and `CHANGES_REQUESTED` on `MyRequestsPage` (next to Submit) and on
  `StudentRequestDetailsPage` (next to Submit / Resubmit).
- [ ] **Step 4: Verify.** `npm run build` → clean.
- [ ] **Step 5: Commit.** `git commit -m "feat(estimate): show estimate to professor and student; edit link for drafts"`

---

### Task 5: End-to-end check, deploy

- [ ] **Step 1: Browser check.** Run `npm run dev` and drive it with Playwright.
  - Demo student → New Request → upload `estimate-panel.png`. All 6 reference rows must appear with the
    values from the spec. Fix the OCR preprocessing if not.
  - Upload `cube-1f.gcode.3mf`: the FILE rows appear.
  - Submit, then open the details page: the card shows the rows and the thumbnail.
  - Log in as the professor: the review page shows the card.
- [ ] **Step 2: Full checks.** `npm run test:unit && npm run test:db && npm run build`.
- [ ] **Step 3: README.** One short section: estimate feature + "re-run `supabase/schema.sql` once" for
  live deployments.
- [ ] **Step 4: Deploy** (per CLAUDE.md).
  - Push `main`; the Actions workflow builds Pages.
  - Publish `dist/` + `404.html` to `gh-pages`.
  - Verify that the live bundle contains `Print Estimate`.
