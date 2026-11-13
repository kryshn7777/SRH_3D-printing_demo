import React, { useEffect, useState } from 'react';
import type { EstimateRow, PrintEstimate } from '../types/models';
import { loadEstimateImage } from '../utils/estimateImageStore';

const Rows: React.FC<{ rows: EstimateRow[] }> = ({ rows }) => (
  <dl className="divide-y divide-slate-100 text-xs">
    {rows.map((r, i) => (
      <div key={i} className="flex justify-between gap-3 py-1.5">
        {r.label && <dt className="text-slate-500">{r.label}</dt>}
        <dd
          className={`text-slate-900 font-semibold break-words ${
            r.label ? 'text-right' : 'w-full'
          }`}
        >
          {r.value}
        </dd>
      </div>
    ))}
  </dl>
);

const EstimateImage: React.FC<{ imageKey: string; imageName?: string }> = ({
  imageKey,
  imageName,
}) => {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    setUrl(null);
    setFailed(false);
    loadEstimateImage(imageKey)
      .then((blob) => {
        if (cancelled) return;
        if (!blob) return setFailed(true);
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imageKey]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (failed) {
    return <p className="text-[11px] text-slate-400">Screenshot unavailable</p>;
  }
  if (!url) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block cursor-zoom-in"
        aria-label="Open screenshot full size"
      >
        <img
          src={url}
          alt="Slicer estimate screenshot"
          className="max-h-40 rounded-lg border border-slate-200 object-contain"
        />
      </button>
      {imageName && (
        <p className="text-[11px] text-slate-400 mt-1 truncate">{imageName}</p>
      )}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 cursor-zoom-out"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
        >
          <img
            src={url}
            alt="Slicer estimate screenshot"
            className="max-w-full max-h-full rounded-lg bg-white"
          />
        </div>
      )}
    </>
  );
};

export const PrintEstimateCard: React.FC<{ estimate?: PrintEstimate }> = ({
  estimate,
}) => {
  if (!estimate) return null;

  const imageRows = estimate.rows.filter((r) => r.source === 'IMAGE');
  const fileRows = estimate.rows.filter((r) => r.source === 'FILE');
  const plates = [
    ...new Set(fileRows.map((r) => r.plate).filter((p) => p !== undefined)),
  ].sort((a, b) => (a as number) - (b as number)) as number[];
  const multiPlate = plates.length > 1;
  const subhead = 'text-[11px] font-bold uppercase tracking-wide text-slate-400';

  return (
    <section className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
      <h2 className="text-sm font-bold text-slate-900">Print Estimate</h2>

      {(estimate.imageKey || imageRows.length > 0) && (
        <div className="space-y-2">
          <h3 className={subhead}>From screenshot</h3>
          {estimate.imageKey && (
            <EstimateImage
              imageKey={estimate.imageKey}
              imageName={estimate.imageName}
            />
          )}
          <Rows rows={imageRows} />
        </div>
      )}

      {(fileRows.length > 0 || estimate.slicedFileName) && (
        <div className="space-y-2">
          <h3 className={subhead}>From sliced file</h3>
          {estimate.slicedFileName && (
            <p className="text-xs font-semibold text-slate-800 break-all">
              {estimate.slicedFileName}
            </p>
          )}
          {multiPlate ? (
            <>
              {plates.map((p) => (
                <div key={p}>
                  <h4 className="text-xs font-bold text-slate-700 mt-2">
                    Plate {p}
                  </h4>
                  <Rows rows={fileRows.filter((r) => r.plate === p)} />
                </div>
              ))}
              {/* rows without a plate number are still shown */}
              <Rows rows={fileRows.filter((r) => r.plate === undefined)} />
            </>
          ) : (
            <Rows rows={fileRows} />
          )}
          <p className="text-[11px] text-slate-400">
            Read from the sliced file in the student's browser.
          </p>
        </div>
      )}
    </section>
  );
};
