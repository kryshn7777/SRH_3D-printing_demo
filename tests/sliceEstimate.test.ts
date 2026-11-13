import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { hasEstimate, parseEstimateText, parseGcodeHeader, readSlicedFile } from '../src/utils/sliceEstimate.ts';

type Row = { label: string; value: string; source: string; plate?: number };
const F = new URL('../src/utils/__fixtures__/bambu/', import.meta.url);
const blob = (n: string) => new Blob([fs.readFileSync(new URL(n, F))]);
// plate omitted = any plate (plain .gcode rows carry plate 1 too)
const v = (rows: Row[], label: string, plate?: number) =>
  rows.find(r => r.label === label && (plate === undefined || r.plate === plate))?.value;
const secs = (s: string) =>
  [...s.matchAll(/(\d+)([dhms])/g)].reduce((a, m) => a + +m[1] * { d: 86400, h: 3600, m: 60, s: 1 }[m[2] as 'd'], 0);

// minimal single-entry zip writer (deflate), for a 3MF without slice_info.config
function zip(name: string, data: string): Blob {
  const raw = zlib.deflateRawSync(Buffer.from(data));
  const n = Buffer.from(name);
  const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(8, 8); lh.writeUInt32LE(raw.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(n.length, 26);
  const cd = Buffer.alloc(46); cd.writeUInt32LE(0x02014b50, 0); cd.writeUInt16LE(8, 10); cd.writeUInt32LE(raw.length, 20); cd.writeUInt32LE(data.length, 24); cd.writeUInt16LE(n.length, 28); cd.writeUInt32LE(0, 42);
  const eo = Buffer.alloc(22); eo.writeUInt32LE(0x06054b50, 0); eo.writeUInt16LE(1, 8); eo.writeUInt16LE(1, 10);
  eo.writeUInt32LE(46 + n.length, 12); eo.writeUInt32LE(30 + n.length + raw.length, 16);
  return new Blob([lh, n, raw, cd, n, eo]);
}

// parseEstimateText: the reference panel's OCR text, plus noise variants
const ocr = 'Total Estimation\nTotal Filament: 0.39 m 1.19 g\nModel Filament: 0.39 m   1.18 g\nCost: 0.03\nPrepare time: 6m43s\nModel printing time: 3m51s\nTotal time: 10m35s\n';
const rows = parseEstimateText(ocr);
assert.deepEqual(rows.filter(r => r.label).map(r => [r.label, r.value]), [
  ['Total Filament', '0.39 m 1.19 g'], ['Model Filament', '0.39 m 1.18 g'], ['Cost', '0.03'],
  ['Prepare time', '6m43s'], ['Model printing time', '3m51s'], ['Total time', '10m35s']]);
assert.ok(rows.every(r => r.source === 'IMAGE'));
assert.ok(rows.some(r => r.label === '' && r.value === 'Total Estimation')); // no line dropped
assert.equal(v(parseEstimateText('Cost; 0.03'), 'Cost'), '0.03');             // ';' misread as ':'
assert.equal(v(parseEstimateText('Gesamtzeit: 10m35s'), 'Gesamtzeit'), '10m35s');
assert.ok(parseEstimateText('x: ' + 'y'.repeat(200)).every(r => r.value.length <= 80));
assert.ok(parseEstimateText('z'.repeat(100) + ': 1').every(r => r.label.length <= 60 && r.value.length >= 1));

// plain .gcode
const cubeText = fs.readFileSync(new URL('cube-1f.gcode', F), 'utf8');
const g = await readSlicedFile(blob('cube-1f.gcode'), 'cube-1f.gcode');
for (const l of ['Total time', 'Model printing time', 'Prepare time', 'Total filament', 'Cost', 'Material', 'Layers', 'Max height', 'Slicer'])
  assert.ok(v(g, l), 'missing ' + l);
assert.ok(g.every(r => r.source === 'FILE' && r.plate === 1 && r.value.length >= 1 && r.value.length <= 80 && r.label.length <= 60));
assert.match(v(g, 'Total filament')!, /^\d+\.\d{2} m {2}\d+\.\d{2} g$/);
assert.match(v(g, 'Cost')!, /^\d+\.\d{2}$/);                                  // g/1000 * 24.99
assert.equal(secs(v(g, 'Prepare time')!), secs(v(g, 'Total time')!) - secs(v(g, 'Model printing time')!));
assert.equal(v(g, 'Material'), 'PLA');
assert.equal(v(g, 'Max height'), '20.00 mm');

// .gcode.3mf: same labels as the .gcode of the same slice, identical values
const z = await readSlicedFile(blob('cube-1f.gcode.3mf'), 'cube-1f.gcode.3mf');
for (const l of ['Total time', 'Model printing time', 'Prepare time', 'Total filament', 'Cost', 'Material', 'Layers', 'Max height'])
  assert.equal(v(z, l, 1), v(g, l), l);

// two-filament: one row per filament + total; cost sums per-filament prices
const t = await readSlicedFile(blob('two-filament.gcode.3mf'), 'two-filament.gcode.3mf');
assert.ok(v(t, 'Filament 1 (PLA)', 1) && v(t, 'Filament 2 (PETG)', 1));
assert.match(v(t, 'Filament 2 (PETG)', 1)!, / 1\.80 g$/);
assert.equal(v(t, 'Total filament', 1), '1.82 m  5.53 g');
assert.equal(v(t, 'Material', 1), 'PLA, PETG');
assert.equal(v(t, 'Cost', 1), '0.13');                                         // 3.74/1000*24.99 + 1.80/1000*19.99
// plain .gcode, two filaments: header weight is a per-filament LIST ("3.74,1.80"), so cost is computable
const two = ['; BambuStudio 1', '; model printing time: 1m 0s; total estimated time: 1m 5s', '; total filament length [mm] : 1000,500', '; total filament weight [g] : 3.74,1.80', '; filament: 1,2', '; filament_cost = 24.99,19.99', '; filament_type = PLA;PETG', ''].join('\n');
assert.equal(v(parseGcodeHeader(two), 'Total filament'), '1.50 m  5.54 g');
assert.equal(v(parseGcodeHeader(two), 'Cost'), '0.13');
assert.equal(v(parseGcodeHeader(two), 'Prepare time'), '5s');

// two-plate: rows for plate 1 and plate 2 each have 'Total time'
const p = await readSlicedFile(blob('two-plate.gcode.3mf'), 'two-plate.gcode.3mf');
assert.ok(v(p, 'Total time', 1) && v(p, 'Total time', 2));
assert.notEqual(v(p, 'Total time', 1), v(p, 'Total time', 2));
assert.ok(v(p, 'Total filament', 2) && v(p, 'Cost', 2));

// price missing -> exact copy; unsliced / foreign files -> exact errors
assert.equal(v(parseGcodeHeader(cubeText.replace(/filament_cost = [^\n]*/, 'filament_cost = 0')), 'Cost'), 'no filament price set in slicer profile');
await assert.rejects(readSlicedFile(blob('unsliced.3mf'), 'model.3mf'), /This 3MF was not sliced\. In Bambu Studio use "Export plate sliced file" or "Export G-code"\./);
await assert.rejects(readSlicedFile(zip('3D/3dmodel.model', '<model/>'), 'model.3mf'), /This 3MF was not sliced/);
await assert.rejects(readSlicedFile(new Blob(['G1 X0 Y0\n']), 'other.gcode'), /No Bambu Studio estimate found in this file\./);
await assert.rejects(readSlicedFile(new Blob([cubeText.slice(0, 40)]), 'cut.gcode'), /No Bambu Studio estimate found in this file\./);
await assert.rejects(readSlicedFile(new Blob(['not a zip']), 'x.gcode.3mf'), /No Bambu Studio estimate found in this file\./);
assert.equal(hasEstimate({ rows: [], imageKey: 'k' }), true);
assert.equal(hasEstimate({ rows: [] }), false);
assert.equal(hasEstimate(null), false);
console.log('sliceEstimate: all tests passed');
