import React from 'react';
import { X, AlertTriangle, ShieldCheck } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: 'primary' | 'danger' | 'success';
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  variant = 'primary',
  onConfirm,
  onCancel,
  children,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[1px] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                variant === 'danger'
                  ? 'bg-red-100 text-red-600'
                  : variant === 'success'
                  ? 'bg-emerald-100 text-emerald-600'
                  : 'bg-blue-100 text-[#1662F3]'
              }`}
            >
              {variant === 'danger' ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <ShieldCheck className="w-5 h-5" />
              )}
            </div>
            <h3
              id="confirm-dialog-title"
              className="text-base font-bold text-slate-900"
            >
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="mt-3 text-sm text-slate-600 leading-relaxed">
          {description}
        </p>

        {children && <div className="mt-4">{children}</div>}

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-white text-sm font-semibold transition-colors cursor-pointer ${
              variant === 'danger'
                ? 'bg-red-600 hover:bg-red-700'
                : variant === 'success'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-[#1662F3] hover:bg-[#1251D1]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
