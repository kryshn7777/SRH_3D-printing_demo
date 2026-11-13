# Print Estimate (slicer screenshot + sliced file) — Design

Date: 2026-11-13 · Status: draft, awaiting approval

## Intent

Students slice their model in Bambu Studio before requesting a print. The slicer's
"Total Estimation" panel holds the numbers the lab cares about: filament length and
weight, cost, prepare time, model printing time and total time. Today the request form
only takes the 3D model, so the professor and lab never see those numbers.

The student attaches the estimate in one of two ways, or both:

- **A screenshot or photo** of the panel (PNG, JPEG, WebP or any format the browser can
  decode). The app reads the text and shows every line.
- **The sliced file** from Bambu Studio: a plain `.gcode` file or a sliced `.gcode.3mf`
  project. The app reads the numbers straight from the file, so there are no reading
  errors.

The user's requirement: **don't miss a single piece of information.**

## Goals

- A new, separate **"Print Estimate"** section on the 3D Print Request form, below
  "Upload Files".
- Screenshot: read every `Label: value` line in the panel, not only the six rows of the
  example (see "What a panel can contain").
- Sliced file: extract every estimate the file holds.
- The student sees the extracted values before submitting and can correct screenshot
  readings.
- The professor (review page) and the student (request details page) see the estimate.
  The screenshot is kept so the professor can compare it with the extracted values.
- Works in demo mode (GitHub Pages, browser storage) and live mode (Supabase).

## Non-goals

- No printing from the uploaded G-code. The lab still prints from the 3D model.
- No cross-checking of the estimate against the uploaded 3D model.
- No server-side or paid OCR.

## Anti-goals (would count as failure even if it "works")

- Silently dropping a row the panel showed (for example a second filament or flushed
  filament).
- Presenting a misread value as certain. Screenshot readings are marked as read from the
  image, and the image is always shown next to them.
- Sending the student's screenshot to a third-party service.

## Ground truth: what the files contain

Verified by slicing a test cube with the installed Bambu Studio 02.08.02.61 CLI. Sample
files: `out.gcode.3mf` and `plate_1.gcode`.

**Plain `.gcode`.** The values sit at the top of the file:

```
; HEADER_BLOCK_START
; BambuStudio 02.08.02.61
; model printing time: 10m 11s; total estimated time: 10m 12s
; total layer number: 100
; total filament length [mm] : 1232.42
; total filament volume [cm^3] : 2964.32
; total filament weight [g] : 0.00
; filament_density: 0
; filament_diameter: 1.75
; max_z_height: 20.00
; filament: 1
; HEADER_BLOCK_END
; CONFIG_BLOCK_START
...
; filament_cost = 0        (price per kg, one value per filament, comma-separated)
; filament_density = 0
; filament_type = ...
; CONFIG_BLOCK_END
```

There are no statistics at the end of the file, so only the first few hundred KB need
reading.

**`.gcode.3mf`** is a ZIP file. All entries are deflate-compressed except the PNG
thumbnails, which are stored uncompressed.

- `Metadata/slice_info.config` (XML), one `<plate>` per sliced plate:
  - `<metadata key="index" value="1"/>`
  - `<metadata key="prediction" value="612"/>`: total time in seconds
  - `<metadata key="weight" value="..."/>`: grams
  - `<filament id type color used_m used_g .../>`: one row per filament
- `Metadata/plate_N.gcode` is the same G-code as above, so its header gives the model
  printing time and the total time.
- `Metadata/project_settings.config` (JSON) holds `filament_cost` and
  `filament_density` per filament.

**Panel row → source:**

| Panel row | Screenshot | Sliced file |
|---|---|---|
| Total Filament (m, g) | yes | yes: header totals, or summed `used_m`/`used_g` |
| Model Filament (m, g) | yes | **no**: files hold only totals that include flush/prime |
| Cost | yes | computed: Σ grams/1000 × `filament_cost`, when a price is set |
| Prepare time | yes | computed: total time − model printing time |
| Model printing time | yes | yes: header |
| Total time | yes | yes: header / `prediction` |
| Per-filament rows (multi-colour) | yes | yes: `<filament>` rows |
| Layers, max Z height, filament type/colour | no | yes, shown as extra rows |

So neither source alone covers everything. This is why both inputs exist. When both are
given, both sets are shown side by side.

> Still open: whether `used_g` and the header totals include flush, and the exact rows
> for flushed filament and the wipe tower. The two-filament fixture settles this before
> the row labels are finalised (see "Builder calls").

## Approaches considered

1. **In-browser OCR (Tesseract.js) for screenshots.** Picked. Free, works offline once
   loaded, works in demo and live mode, and the image never leaves the device.
2. Claude vision via a Supabase edge function. Most accurate, but costs per image, needs
   a server key, and does nothing in demo mode. Rejected.
3. **Parse the sliced `.gcode` / `.gcode.3mf`.** Picked together with 1. Exact numbers.
   It cannot supply Model Filament, so it does not replace the screenshot.

The user chose **1 + 3**.

## Design

### Form (NewRequestPage)

A new card, **"Print Estimate (from Bambu Studio)"**, below "Upload Files". It has two
drop zones next to each other:

```
┌ Print Estimate (from Bambu Studio) ───────────────────────────────┐
│ [ Screenshot of "Total Estimation" ]  [ Sliced file .gcode/.3mf ] │
│   PNG / JPEG / any image               exact values               │
│                                                                   │
│  ┌ thumbnail ┐  Label                 Value          Source       │
│  │           │  Total Filament        0.39 m  1.19 g Screenshot ✎ │
│  └───────────┘  Model Filament        0.39 m  1.18 g Screenshot ✎ │
│                 Cost                  0.03           Screenshot ✎ │
│                 Total time            10m35s         Sliced file  │
│                 …every captured row…                              │
└───────────────────────────────────────────────────────────────────┘
```

- **Screenshot.** The image is decoded in the browser. It is upscaled about 3× and
  inverted to dark-on-light when the background is dark (the Bambu panel is dark), then
  read with Tesseract.js (English). The text is split into lines and every line matching
  `<label>:<value>` becomes a row. Lines with no colon are kept as a row with an empty
  label, so nothing is dropped. Rows are editable text fields.
- **Sliced file.**
  - `.gcode`: read the first 512 KB as text and parse the header and config block.
  - `.gcode.3mf`: read the ZIP directory and inflate only `slice_info.config`,
    `project_settings.config` and the start of each `plate_N.gcode`. Uses the browser's
    built-in `DecompressionStream('deflate-raw')`, so no new ZIP library.
  - Each plate gets its own group of rows. Values from the file are read-only.
- A plain unsliced `.3mf` project has no `slice_info.config`. The app shows: "This 3MF
  was not sliced. In Bambu Studio use *Export plate sliced file* or *Export G-code*."
- **Required (user decision):** a screenshot or a sliced file (at least one) to
  **submit**; drafts may omit both.
- **Sliced file must show time, material and cost (user decision):**
  - total time and model printing time, read from the header
  - prepare time = total − model printing time
  - filament type, colour, length (m) and weight (g), per filament and in total
  - cost = Σ grams/1000 × `filament_cost` per kg. This matches the panel: 1.19 g ×
    24.99/kg = 0.03.
  - If `filament_cost` is 0 or missing, show "no filament price set in slicer profile"
    instead of 0.
- The sliced file itself is **not stored**, only its name and the extracted rows. The
  screenshot **is stored**, re-encoded to PNG (max 2400 px). Re-encoding also strips
  photo metadata such as GPS location.

### Data model

```ts
interface EstimateRow { label: string; value: string; source: 'IMAGE' | 'FILE'; plate?: number }
interface PrintEstimate {
  rows: EstimateRow[];          // ≤ 60 rows, label ≤ 60 chars, value ≤ 80 chars
  imageKey?: string;            // storage key of the screenshot
  imageName?: string;
  slicedFileName?: string;
}
PrintRequest.estimate?: PrintEstimate
```

Values stay text, exactly as shown or read, so nothing is lost by converting units.

### Demo mode

The screenshot is saved through the existing IndexedDB blob store (`saveModelBlob` /
`loadModelBlob`, generic over key and buffer). `estimate` travels inside the request
object that LocalProvider already persists.

### Live mode (supabase/schema.sql, must stay re-runnable)

- `print_requests`: add `estimate jsonb` (array check, size ≤ 16 KB) and
  `estimate_image_path text`. Use `add column if not exists`.
- New private bucket **`estimates`**: 5 MB limit, `image/png` only. The insert policy
  mirrors `models`: student only, own folder, name pattern `…\.png`, upload quota.
  `upload_quota_ok()` counts both buckets. The select policy mirrors `models`: owner or
  professor.
- `create_request` validates the estimate (shape, counts, lengths; strips unknown keys)
  and requires the image path to be the caller's own object in `estimates`. The
  "at least one of image / rows" rule applies only when not a draft.
- LiveProvider maps the new columns, and a small `estimateStore` handles upload/download,
  mirroring `lib/modelStore.ts`.
- **Deploying needs `schema.sql` re-run in Supabase once.**

### Display

On ProfessorReviewPage and StudentRequestDetailsPage, a "Print Estimate" card shows:

- the rows table, grouped by source (and by plate for files)
- the screenshot thumbnail; click to view full size
- the sliced file name

### Tests

- Parser self-check: run against the real `plate_1.gcode` and `out.gcode.3mf` from the
  Bambu CLI (checked in under a test fixtures folder), plus a hand-made multi-filament
  header.
- Screenshot line parser: unit-tested on OCR-like text, including the user's example
  panel.
- `schema.test.mjs`: estimate accepted and stored; oversized or malformed estimate
  rejected; image path in another user's folder rejected; non-PNG name rejected by the
  bucket policy.

## Left to the builder

- Exact Tesseract.js loading: lazy-load on first image, language data from its default
  CDN.
- OCR clean-up heuristics (for example `O`→`0` inside numbers) and the exact
  preprocessing thresholds.
- Card styling: follow the existing form cards.

## Builder calls (after review)

- **Every submit path enforces "required".** This covers `create_request` when not a
  draft, the `submit_draft` RPC, and the local `submitDraftRequest`. The MyRequests and
  StudentRequestDetails "Submit" buttons skip the form, and they reach `submit_draft`.
  - To keep drafts and CHANGES_REQUESTED requests fixable, add an **"Edit"** link to
    `/student/requests/new?draftId=<id>` on both pages for those statuses.
    NewRequestPage already supports `draftId`, but nothing links to it today.
  - Requests already submitted are untouched; there is no backfill. Old drafts need an
    estimate added before they can be submitted.
- **Fixtures go in the repo** at `src/utils/__fixtures__/bambu/`. They are regenerated
  with the installed Bambu Studio CLI using filament profile copies that set a real
  `filament_density` (1.26) and `filament_cost` (24.99), so grams and cost are non-zero.
  There are two cases: one filament, and two filaments (two objects on two filaments, to
  get flush rows). Any same-slice screenshot + G-code the user supplies is added as the
  reference case.
- **Labels for sliced-file rows** say what the file states ("Total filament (incl.
  flush)" and so on, finalised against the fixtures). The UI says "read from the sliced
  file in your browser", not "exact" or "verified".
- **OCR languages:** English + German packs. Screenshot rows are captured generically,
  so German labels need no mapping.

## Decided by the user

- Both inputs (screenshot OCR + sliced file import).
- Estimate required to submit.
- Sliced file shows time, material and cost.
- **Information only.** The estimate never gates approval and no limits are enforced, so
  client-side parsing is acceptable and the sliced file is not stored.
- No same-slice files from the user. The example screenshot is a reference image from
  the internet. Copy it to `src/utils/__fixtures__/bambu/estimate-panel.png` as the OCR
  test image; its expected rows are:
  - Total Filament: 0.39 m 1.19 g
  - Model Filament: 0.39 m 1.18 g
  - Cost: 0.03
  - Prepare time: 6m43s
  - Model printing time: 3m51s
  - Total time: 10m35s
