// Pure parsers for Bambu Studio estimates. No DOM APIs: Node-testable.
import type { EstimateRow, PrintEstimate } from '../types/models';

export const NOT_BAMBU = 'No Bambu Studio estimate found in this file.';
export const UNSLICED_3MF = 'This 3MF was not sliced. In Bambu Studio use "Export plate sliced file" or "Export G-code".';
const NO_PRICE = 'no filament price set in slicer profile';

export function hasEstimate(e: PrintEstimate | null | undefined): boolean {
  return !!e && (!!e.imageKey || e.rows.length > 0);
}

// ---- screenshot OCR text -> IMAGE rows (every non-empty line kept; limits: label <= 60, value 1..80, rows <= 60) ----
export function parseEstimateText(text: string): EstimateRow[] {
  const rows: EstimateRow[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+/g, ' ').trim();
    if (!line) continue;
    const m = /^([^:;]{1,60}?)\s*[:;]\s*(.+)$/.exec(line); // ';' is a common misread of ':'
    rows.push({ label: m ? m[1] : '', value: (m ? m[2] : line).slice(0, 80), source: 'IMAGE' });
  }
  return rows.slice(0, 60); // ponytail: panel has ~10 lines; excess OCR junk is cut at the backend's row cap
}

// ---- shared header model ----
interface Fil { id: number; type?: string; m: number; g: number }
interface Info {
  totalTxt?: string; modelTxt?: string; layers?: string; maxZ?: string; slicer?: string;
  fils: Fil[]; totalG?: number; costs: number[]; weightsKnown: boolean;
}

const list = (s: string | undefined) => (s ?? '').split(/[,;]/).map(x => x.trim()).filter(Boolean);
const num = (s: string | undefined) => { const n = parseFloat(s ?? ''); return Number.isFinite(n) ? n : NaN; };
const grab = (t: string, re: RegExp) => re.exec(t)?.[1]?.trim();

function secs(s: string | undefined): number | undefined {
  if (!s) return undefined;
  const ms = [...s.matchAll(/(\d+)\s*([dhms])/g)];
  return ms.length ? ms.reduce((a, m) => a + +m[1] * ({ d: 86400, h: 3600, m: 60, s: 1 } as Record<string, number>)[m[2]], 0) : undefined;
}
function fmtSecs(n: number): string {
  const parts = [[Math.floor(n / 86400), 'd'], [Math.floor(n / 3600) % 24, 'h'], [Math.floor(n / 60) % 60, 'm'], [n % 60, 's']] as const;
  const i = parts.findIndex(p => p[0] > 0);
  return i < 0 ? '0s' : parts.slice(i).map(p => p[0] + p[1]).join(' ');
}

function headerInfo(text: string): Info {
  const t = /^; BambuStudio\b/m.test(text) || /model printing time:/.test(text) ? text : '';
  const times = /model printing time:\s*([^;\n]+?)\s*;\s*total estimated time:\s*([^\n]+)/.exec(t);
  const ids = list(grab(t, /^; filament: ([^\n]*)/m)).map(Number);
  const lens = list(grab(t, /^; total filament length \[mm\] ?: ?([^\n]*)/m)).map(Number);
  const wts = list(grab(t, /^; total filament weight \[g\] ?: ?([^\n]*)/m)).map(Number);
  const types = list(grab(t, /^; filament_type = ([^\n]*)/m));
  const costs = list(grab(t, /^; filament_cost = ([^\n]*)/m)).map(Number);
  // header lists hold one value per USED filament, in `; filament:` order
  const weightsKnown = ids.length > 0 && lens.length === ids.length && wts.length === ids.length;
  const fils = weightsKnown ? ids.map((id, i) => ({ id, type: types[id - 1], m: lens[i] / 1000, g: wts[i] })) : [];
  return {
    totalTxt: times?.[2].trim(), modelTxt: times?.[1].trim(),
    layers: grab(t, /^; total layer number: ?(\d+)/m), slicer: grab(t, /^; (BambuStudio [^\n]+)/m),
    maxZ: grab(t, /^; max_z_height: ?([\d.]+)/m),
    fils, costs: ids.map(id => costs[id - 1]), weightsKnown,
  };
}

function buildRows(i: Info, plate: number): EstimateRow[] {
  const out: EstimateRow[] = [];
  const add = (label: string, value: string | undefined) => { if (value) out.push({ label, value: value.slice(0, 80), source: 'FILE', plate }); };
  const ts = secs(i.totalTxt), ms = secs(i.modelTxt);
  add('Total time', i.totalTxt);
  add('Model printing time', i.modelTxt);
  if (ts !== undefined && ms !== undefined && ts >= ms) add('Prepare time', fmtSecs(ts - ms));
  const fv = (m: number, g: number) => `${m.toFixed(2)} m  ${g.toFixed(2)} g`;
  if (i.fils.length) {
    add('Total filament', fv(i.fils.reduce((a, f) => a + f.m, 0), i.totalG ?? i.fils.reduce((a, f) => a + f.g, 0)));
    for (const f of i.fils) add(`Filament ${f.id}${f.type ? ` (${f.type.slice(0, 20)})` : ''}`, fv(f.m, f.g));
    const types = i.fils.map(f => f.type).filter(Boolean);
    if (types.length) add('Material', types.join(', '));
    const priced = i.costs.length === i.fils.length && i.costs.every(c => c > 0);
    add('Cost', !i.weightsKnown ? 'needs per-filament weights (use .gcode.3mf)'
      : priced ? i.fils.reduce((a, f, k) => a + f.g / 1000 * i.costs[k], 0).toFixed(2) : NO_PRICE);
  }
  add('Layers', i.layers);
  add('Max height', i.maxZ && `${i.maxZ} mm`);
  add('Slicer', i.slicer);
  return out;
}

// ---- plain .gcode (first 512 KB holds header + config) ----
export function parseGcodeHeader(text: string): EstimateRow[] {
  const i = headerInfo(text);
  return i.totalTxt ? buildRows(i, 1) : [];
}

// ---- ZIP (.3mf) reading, ranged: only touches the entries we need. ponytail: no ZIP64 (files are < 4 GB) ----
interface Entry { name: string; method: number; csize: number; off: number }

async function entries(b: Blob): Promise<Entry[]> {
  const tailStart = Math.max(0, b.size - 65557);
  const tail = new DataView(await b.slice(tailStart).arrayBuffer());
  let e = tail.byteLength - 22;
  while (e >= 0 && tail.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) throw new Error(NOT_BAMBU);
  const count = tail.getUint16(e + 10, true), cdSize = tail.getUint32(e + 12, true), cdOff = tail.getUint32(e + 16, true);
  const cd = new DataView(await b.slice(cdOff, cdOff + cdSize).arrayBuffer());
  const dec = new TextDecoder();
  const out: Entry[] = [];
  for (let p = 0, k = 0; k < count && p + 46 <= cd.byteLength && cd.getUint32(p, true) === 0x02014b50; k++) {
    const nl = cd.getUint16(p + 28, true);
    out.push({
      name: dec.decode(new Uint8Array(cd.buffer, p + 46, nl)), method: cd.getUint16(p + 10, true),
      csize: cd.getUint32(p + 20, true), off: cd.getUint32(p + 42, true),
    });
    p += 46 + nl + cd.getUint16(p + 30, true) + cd.getUint16(p + 32, true);
  }
  return out;
}

// text of an entry; stops early (and cancels the stream) once `until` is true or `cap` chars are read
async function entryText(b: Blob, e: Entry, until?: (t: string) => boolean, cap = Infinity): Promise<string> {
  const lh = new DataView(await b.slice(e.off, e.off + 30).arrayBuffer());
  const start = e.off + 30 + lh.getUint16(26, true) + lh.getUint16(28, true); // local header's own lengths
  const raw = b.slice(start, start + e.csize);
  const stream = e.method === 8 ? raw.stream().pipeThrough(new DecompressionStream('deflate-raw')) : raw.stream();
  const reader = stream.getReader(), dec = new TextDecoder();
  let text = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    text += dec.decode(value, { stream: true });
    if (text.length >= cap || until?.(text)) { await reader.cancel(); break; }
  }
  return text + dec.decode();
}

const attrs = (s: string) => Object.fromEntries([...s.matchAll(/(\w+)="([^"]*)"/g)].map(m => [m[1], m[2]]));

async function readThreeMf(file: Blob): Promise<EstimateRow[]> {
  const es = await entries(file);
  const get = (n: string) => es.find(e => e.name === n);
  const si = get('Metadata/slice_info.config');
  const plates = si ? [...(await entryText(file, si)).matchAll(/<plate>([\s\S]*?)<\/plate>/g)].map(m => m[1]) : [];
  if (!plates.length) {
    if (es.some(e => e.name.startsWith('3D/') || e.name.startsWith('Metadata/'))) throw new Error(UNSLICED_3MF);
    throw new Error(NOT_BAMBU);
  }
  const ps = get('Metadata/project_settings.config');
  let costs: number[] = [];
  try { costs = ps ? (JSON.parse(await entryText(file, ps)).filament_cost ?? []).map(Number) : []; } catch { /* no prices */ }
  const rows: EstimateRow[] = [];
  for (let k = 0; k < plates.length; k++) {
    const x = plates[k];
    const meta = (key: string) => new RegExp(`<metadata key="${key}" value="([^"]*)"`).exec(x)?.[1];
    const idx = Math.max(1, Math.min(99, parseInt(meta('index') ?? '', 10) || k + 1));
    const ge = get(`Metadata/plate_${idx}.gcode`);
    const h = ge ? headerInfo(await entryText(file, ge, t => t.includes('HEADER_BLOCK_END'), 1 << 20)) : headerInfo('');
    const fils: Fil[] = [...x.matchAll(/<filament\s([^>]*?)\/>/g)].map(m => attrs(m[1]))
      .map(a => ({ id: +a.id, type: a.type, m: num(a.used_m), g: num(a.used_g) }))
      .filter(f => Number.isFinite(f.m) && Number.isFinite(f.g));
    const w = num(meta('weight'));
    const pred = num(meta('prediction'));
    const info: Info = {
      ...h, fils, weightsKnown: true, costs: fils.map(f => costs[f.id - 1]),
      totalTxt: h.totalTxt ?? (Number.isFinite(pred) ? fmtSecs(pred) : undefined),
      // finding: slice_info `weight` is the plate total; the header weight is a per-filament LIST, so total = sum of used_g (within rounding)
      totalG: Number.isFinite(w) ? w : undefined,
    };
    rows.push(...buildRows(info, idx));
  }
  return rows;
}

export async function readSlicedFile(file: Blob, name: string): Promise<EstimateRow[]> {
  const rows = /\.gcode$/i.test(name)
    ? parseGcodeHeader(await file.slice(0, 512 * 1024).text())
    : await readThreeMf(file);
  if (!rows.length) throw new Error(NOT_BAMBU);
  return rows;
}
