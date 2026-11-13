import React, { useEffect, useRef, useState } from 'react';
import { UploadCloud, AlertCircle, Loader2, X } from 'lucide-react';
import type { EstimateRow, PrintEstimate } from '../types/models';
import { readSlicedFile } from '../utils/sliceEstimate';
import { readEstimateImage } from '../utils/estimateOcr';
import { saveEstimateImage, loadEstimateImage } from '../utils/estimateImageStore';

const MAX_ROWS = 200; // backend cap for IMAGE + FILE rows combined

const norm = (e: PrintEstimate): PrintEstimate | null =>
  e.imageKey || e.rows.length || e.slicedFileName ? e : null;

const DropZone: React.FC<{
  accept: string;
  title: string;
  help: string;
  busy: boolean;
  onFile: (f: File) => void;
}> = ({ accept, title, help, busy, onFile }) => {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        const f = e.dataTransfer.files?.[0];
        if (f && !busy) onFile(f);
      }}
      className={`rounded-xl border-2 border-dashed p-4 flex flex-col items-center text-center transition-colors ${
        drag ? 'border-[#1662F3] bg-blue-50/60' : 'border-blue-200 bg-slate-50/40'
      }`}
    >
      <UploadCloud className="w-5 h-5 text-[#1662F3] mb-1.5" />
      <p className="text-xs font-semibold text-slate-800">{title}</p>
      <p className="text-[11px] text-slate-500 mt-0.5">{help}</p>
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f && !busy) onFile(f);
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => ref.current?.click()}
        className="mt-3 px-3.5 py-1.5 rounded-lg bg-[#1662F3] hover:bg-[#1251D1] disabled:opacity-50 text-white text-xs font-semibold transition-colors cursor-pointer"
      >
        Choose File
      </button>
    </div>
  );
};

export const PrintEstimateSection: React.FC<{
  value: PrintEstimate | null;
  onChange: (v: PrintEstimate | null) => void;
  error?: string | null;
}> = ({ value, onChange, error }) => {
  const [busy, setBusy] = useState<'image' | 'file' | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [thumb, setThumb] = useState<string | null>(null);
  const cur = useRef(value);
  cur.current = value; // latest value after awaits

  const imageKey = value?.imageKey;
  useEffect(() => {
    if (!imageKey) {
      setThumb(null);
      return;
    }
    let url: string | null = null;
    let dead = false;
    loadEstimateImage(imageKey).then((b) => {
      if (dead || !b) return;
      url = URL.createObjectURL(b);
      setThumb(url);
    });
    return () => {
      dead = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [imageKey]);

  const rows = value?.rows ?? [];
  const imageRows = rows.filter((r) => r.source === 'IMAGE');
  const fileRows = rows.filter((r) => r.source === 'FILE');
  const multiPlate = new Set(fileRows.map((r) => r.plate)).size > 1;

  // IMAGE rows first, then FILE rows, each in its own order.
  const setRows = (img: EstimateRow[], fil: EstimateRow[], rest: Partial<PrintEstimate> = {}) =>
    onChange(norm({ ...(cur.current ?? { rows: [] }), ...rest, rows: [...img, ...fil] }));

  const onImage = async (file: File) => {
    setMsg(null);
    setBusy('image');
    try {
      const { rows: read, png } = await readEstimateImage(file);
      const fil = (cur.current?.rows ?? []).filter((r) => r.source === 'FILE');
      if (read.length + fil.length > MAX_ROWS) {
        throw new Error('Too many rows with the sliced file attached. Remove the sliced file or use a smaller screenshot.');
      }
      const key = await saveEstimateImage(png);
      setRows(read, fil, { imageKey: key, imageName: file.name.slice(0, 200) });
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Could not read this screenshot.');
    } finally {
      setBusy(null);
    }
  };

  const onFile = async (file: File) => {
    setMsg(null);
    setBusy('file');
    try {
      const read = await readSlicedFile(file, file.name);
      const img = (cur.current?.rows ?? []).filter((r) => r.source === 'IMAGE');
      if (read.length + img.length > MAX_ROWS) {
        throw new Error('This file has too many plates to import at once. Please export one plate at a time.');
      }
      setRows(img, read, { slicedFileName: file.name.slice(0, 200) });
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Could not read this file.');
    } finally {
      setBusy(null);
    }
  };

  const editImageRow = (i: number, patch: Partial<EstimateRow>) =>
    setRows(imageRows.map((r, k) => (k === i ? { ...r, ...patch } : r)), fileRows);
  const dropImageRow = (i: number) => setRows(imageRows.filter((_, k) => k !== i), fileRows);

  const shownError = msg || error;

  return (
    <section className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
      <div>
        <h2 className="text-sm font-bold text-slate-900">
          Print Estimate (from Bambu Studio) <span className="text-red-500">*</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Attach a screenshot of the slicer estimate panel, a sliced file, or both.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <DropZone
          accept="image/*"
          title="Screenshot of the estimate"
          help="PNG or JPEG, read in your browser"
          busy={busy !== null}
          onFile={onImage}
        />
        <DropZone
          accept=".gcode,.3mf"
          title="Sliced file"
          help="Export plate sliced file (.gcode.3mf) or Export G-code"
          busy={busy !== null}
          onFile={onFile}
        />
      </div>

      {busy && (
        <div className="flex items-center gap-2 text-xs text-slate-600" role="status">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          {busy === 'image' ? 'Reading screenshot…' : 'Reading sliced file…'}
        </div>
      )}

      {shownError && (
        <div role="alert" className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-[11px] text-red-700 flex items-start gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
          <span>{shownError}</span>
        </div>
      )}

      {value?.imageKey && (
        <div className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 bg-slate-50/50">
          {thumb && (
            <img src={thumb} alt="Estimate screenshot" className="h-16 w-auto max-w-[8rem] rounded border border-slate-200 object-contain bg-white" />
          )}
          <div className="text-xs text-slate-700 min-w-0 flex-1 truncate">{value.imageName ?? 'Screenshot'}</div>
          <button
            type="button"
            onClick={() => setRows([], fileRows, { imageKey: undefined, imageName: undefined })}
            className="text-xs font-medium text-slate-500 hover:text-red-600 cursor-pointer"
          >
            Remove
          </button>
        </div>
      )}

      {value?.slicedFileName && (
        <div className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 bg-slate-50/50">
          <div className="text-xs text-slate-700 min-w-0 flex-1 truncate">{value.slicedFileName}</div>
          <button
            type="button"
            onClick={() => setRows(imageRows, [], { slicedFileName: undefined })}
            className="text-xs font-medium text-slate-500 hover:text-red-600 cursor-pointer"
          >
            Remove
          </button>
        </div>
      )}

      {value?.imageKey && imageRows.length === 0 && (
        <p className="text-[11px] text-amber-700">
          No text could be read from the screenshot. It is still attached; you can add rows by hand.
        </p>
      )}

      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="py-1.5 pr-2 font-semibold">Label</th>
                <th className="py-1.5 pr-2 font-semibold">Value</th>
                <th className="py-1.5 pr-2 font-semibold">Source</th>
                <th className="w-6" />
              </tr>
            </thead>
            <tbody>
              {imageRows.map((r, i) => (
                <tr key={`i${i}`} className="border-b border-slate-100">
                  <td className="py-1 pr-2">
                    <input
                      value={r.label}
                      maxLength={60}
                      aria-label="Label"
                      onChange={(e) => editImageRow(i, { label: e.target.value })}
                      className="w-full rounded border border-slate-300 px-2 py-1"
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      value={r.value}
                      maxLength={80}
                      aria-label="Value"
                      onChange={(e) => editImageRow(i, { value: e.target.value })}
                      className="w-full rounded border border-slate-300 px-2 py-1"
                    />
                  </td>
                  <td className="py-1 pr-2 text-slate-500 whitespace-nowrap">Screenshot</td>
                  <td>
                    <button
                      type="button"
                      aria-label="Delete row"
                      onClick={() => dropImageRow(i)}
                      className="text-slate-400 hover:text-red-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {fileRows.map((r, i) => (
                <tr key={`f${i}`} className="border-b border-slate-100">
                  <td className="py-1.5 pr-2 text-slate-800">{r.label}</td>
                  <td className="py-1.5 pr-2 font-medium text-slate-900">{r.value}</td>
                  <td className="py-1.5 pr-2 text-slate-500 whitespace-nowrap">
                    Sliced file{multiPlate && r.plate ? ` · plate ${r.plate}` : ''}
                  </td>
                  <td />
                </tr>
              ))}
            </tbody>
          </table>
          {fileRows.length > 0 && (
            <p className="text-[11px] text-slate-500 mt-1.5">Read from the sliced file in your browser.</p>
          )}
        </div>
      )}

      {value?.imageKey && (
        <button
          type="button"
          disabled={rows.length >= MAX_ROWS}
          onClick={() => setRows([...imageRows, { label: '', value: '', source: 'IMAGE' }], fileRows)}
          className="text-xs font-semibold text-[#1662F3] hover:underline disabled:opacity-50 cursor-pointer"
        >
          + Add row
        </button>
      )}
    </section>
  );
};
