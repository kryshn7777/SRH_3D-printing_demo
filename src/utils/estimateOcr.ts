// Browser-only glue: decode a screenshot, store it as PNG, OCR it. Parsing lives in sliceEstimate.ts.
import type { EstimateRow, PrintEstimate } from '../types/models';
import { parseEstimateText } from './sliceEstimate';

const MAX_INPUT = 20 * 1024 * 1024;
const MAX_PNG = 5 * 1024 * 1024;
const STORE_SIDE = 2400;
const OCR_SIDE = 4000;
export const BAD_IMAGE = 'Could not open this image. Please save it as PNG or JPEG.';

function canvasOf(bmp: ImageBitmap, scale: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(bmp.width * scale));
  c.height = Math.max(1, Math.round(bmp.height * scale));
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error(BAD_IMAGE);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  return c;
}

const toPng = (c: HTMLCanvasElement) =>
  new Promise<Blob>((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error(BAD_IMAGE))), 'image/png'));

export async function readEstimateImage(file: File): Promise<{ rows: EstimateRow[]; png: Blob }> {
  if (file.size > MAX_INPUT) throw new Error('This image is larger than 20 MB. Please use a smaller screenshot.');
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file);
  } catch {
    throw new Error(BAD_IMAGE);
  }
  try {
    const long = Math.max(bmp.width, bmp.height);

    // Stored copy: longest side <= 2400 px, shrink by 0.75 while over 5 MB.
    let scale = Math.min(1, STORE_SIDE / long);
    let png = await toPng(canvasOf(bmp, scale));
    for (let i = 0; png.size > MAX_PNG && i < 12; i++) {
      scale *= 0.75;
      png = await toPng(canvasOf(bmp, scale));
    }
    if (png.size > MAX_PNG) throw new Error('This image is too large to store. Please use a smaller screenshot.');

    // OCR copy: 3x upscale (longest side <= 4000), grayscale, inverted if the panel is dark.
    const oc = canvasOf(bmp, Math.min(3, OCR_SIDE / long));
    const ctx = oc.getContext('2d')!;
    const img = ctx.getImageData(0, 0, oc.width, oc.height);
    const d = img.data;
    let sum = 0;
    for (let i = 0; i < d.length; i += 4) {
      const y = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      d[i] = d[i + 1] = d[i + 2] = y;
      sum += y;
    }
    if (sum / (d.length / 4) < 128) for (let i = 0; i < d.length; i += 4) d[i] = d[i + 1] = d[i + 2] = 255 - d[i];
    ctx.putImageData(img, 0, 0);

    // OCR failure is not fatal: the image alone is a valid estimate (rows = []).
    let text = '';
    try {
      const { createWorker } = await import('tesseract.js');
      // eng only: measured on the reference panel, eng+deu misreads the "g" unit as "9" ("1.199");
      // German slicer labels are plain ASCII words that the eng model reads fine.
      const worker = await createWorker('eng');
      try {
        text = (await worker.recognize(await toPng(oc))).data.text;
      } finally {
        await worker.terminate();
      }
    } catch {
      text = '';
    }
    return { rows: parseEstimateText(text), png };
  } finally {
    bmp.close();
  }
}

/** Backend limits: label <= 60, value 1..80, file names <= 200. Rows left with an empty value are dropped. */
export function cleanEstimate(e: PrintEstimate | null): PrintEstimate | null {
  if (!e) return null;
  const rows = e.rows
    .map(r => ({ ...r, label: r.label.trim().slice(0, 60), value: r.value.trim().slice(0, 80) }))
    .filter(r => r.value)
    .slice(0, 200);
  const out: PrintEstimate = { ...e, rows, imageName: e.imageName?.slice(0, 200), slicedFileName: e.slicedFileName?.slice(0, 200) };
  return out.imageKey || rows.length ? out : null;
}
