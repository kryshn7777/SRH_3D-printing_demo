import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileBox,
  Download,
  Check,
  AlertCircle,
  ShieldAlert,
  RotateCcw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CadModelPreview } from '../components/PrinterIllustration';
import { StatusBadge } from '../components/StatusBadge';

export const ProfessorReviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    currentUser,
    requests,
    approvals,
    professorReviewRequest,
    switchRoleUser,
    addToast,
  } = useApp();

  const [comments, setComments] = useState('');
  const [error, setError] = useState<string | null>(null);

  const request = requests.find(
    (r) => r.id.toLowerCase() === (id || '').toLowerCase()
  );

  if (!request) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
        <h1 className="text-lg font-bold text-slate-900">
          Request #{id} Not Found
        </h1>
        <button
          type="button"
          onClick={() => navigate('/professor/dashboard')}
          className="px-4 py-2 rounded-lg bg-[#1662F3] text-white text-xs font-semibold cursor-pointer"
        >
          Back to Professor Dashboard
        </button>
      </div>
    );
  }

  const isProfessor = currentUser?.role === 'PROFESSOR';
  const canReview =
    isProfessor && request.currentStatus === 'PENDING_PROFESSOR_APPROVAL';

  const existingProfReview = approvals.find(
    (a) => a.requestId === request.id && a.reviewerRole === 'PROFESSOR'
  );

  const handleDecision = (
    decision: 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED'
  ) => {
    setError(null);
    const res = professorReviewRequest(request.id, decision, comments);
    if (!res.ok) {
      setError(res.error || 'Could not record decision.');
      return;
    }
    navigate('/professor/dashboard');
  };

  const handleDownloadModel = () => {
    const content = `solid ${request.projectTitle.replace(/\s+/g, '_')}\nendsolid\n`;
    const blob = new Blob([content], { type: 'application/sla' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = request.attachment.fileName;
    a.click();
    URL.revokeObjectURL(url);
    addToast(
      'info',
      'Model Downloaded',
      `Downloaded ${request.attachment.fileName} for inspection.`
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Unauthorized Role Warning Banner */}
      {!isProfessor && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-900"
        >
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-bold">
                Professor Authorization Required (Currently signed in as{' '}
                {currentUser?.name} — {currentUser?.role})
              </p>
              <p className="text-amber-800 mt-0.5">
                Students and PC Administrators cannot submit academic professor approvals.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => switchRoleUser('USR-PROF-01')}
            className="px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold cursor-pointer"
          >
            Switch to Prof. Dr. Weber
          </button>
        </div>
      )}

      {/* Top Header Row matching Screen 8 */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/professor/dashboard')}
            className="p-2 rounded-lg hover:bg-slate-200/70 text-slate-700 transition-colors cursor-pointer"
            aria-label="Back to Professor Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Review Request #{request.id}
          </h1>
        </div>

        <StatusBadge status={request.currentStatus} />
      </div>

      {error && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2.5 text-xs text-red-700 font-medium"
        >
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Top Main Details Card matching Screen 8 */}
      <section className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Left: 3D Part Render (4 cols) */}
          <div className="md:col-span-4">
            <CadModelPreview
              previewKey={request.attachment.previewKey}
              className="w-full h-44"
            />
          </div>

          {/* Middle: Student & Project Info (5 cols) */}
          <div className="md:col-span-5 space-y-3 text-xs">
            <div>
              <span className="text-slate-400 font-medium block">Student</span>
              <span className="text-slate-900 font-bold text-sm">
                {request.studentName}
              </span>
              <span className="text-slate-500 block text-[11px]">
                {request.courseOrDepartment} • {request.studentEmail}
              </span>
            </div>

            <div>
              <span className="text-slate-400 font-medium block">
                Project Title
              </span>
              <span className="text-slate-900 font-semibold text-[13px]">
                {request.projectTitle}
              </span>
            </div>

            <div>
              <span className="text-slate-400 font-medium block">
                Description
              </span>
              <p className="text-slate-700 leading-relaxed mt-0.5">
                {request.description}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <span className="text-slate-400 font-medium block">
                Academic Purpose &amp; Intended Use
              </span>
              <p className="text-slate-600 mt-0.5">
                {request.purpose} ({request.intendedUse})
              </p>
            </div>
          </div>

          {/* Right: Printer & Material Specs (3 cols) */}
          <div className="md:col-span-3 space-y-3 text-xs md:border-l md:border-slate-100 md:pl-5">
            <div>
              <span className="text-slate-400 font-medium block">Printer</span>
              <span className="text-slate-900 font-semibold text-[13px]">
                {request.printerName}
              </span>
            </div>

            <div>
              <span className="text-slate-400 font-medium block">Material</span>
              <span className="text-slate-900 font-semibold text-[13px]">
                {request.material}
              </span>
            </div>

            <div>
              <span className="text-slate-400 font-medium block">
                Estimated Print Time
              </span>
              <span className="text-slate-900 font-semibold text-[13px]">
                {request.estimatedDuration}
              </span>
            </div>

            <div>
              <span className="text-slate-400 font-medium block">Quantity</span>
              <span className="text-slate-900 font-semibold text-[13px]">
                {request.quantity}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Middle Two-Column Row: Student File & Reviewer Comments matching Screen 8 */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
        {/* Left: Student File (6 cols) */}
        <section className="md:col-span-6 bg-white rounded-xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 mb-3">
              Student File
            </h2>

            <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-[#1662F3] flex items-center justify-center shrink-0">
                  <FileBox className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-900 block truncate">
                    {request.attachment.fileName} ({request.attachment.fileSizeFormatted})
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Uploaded {request.attachment.uploadedAt} • Bounding Box:{' '}
                    {request.attachment.dimensionsMm || '142 × 68 × 54 mm'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDownloadModel}
                className="px-3.5 py-2 rounded-lg bg-[#EBF2FF] hover:bg-blue-100 text-[#1662F3] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </button>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 mt-3">
            Note: Approving this request forwards it to the PC Administrator queue. It does not directly grant printer access.
          </p>
        </section>

        {/* Right: Comments (6 cols) */}
        <section className="md:col-span-6 bg-white rounded-xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <label
              htmlFor="prof-review-comments"
              className="block text-sm font-bold text-slate-900 mb-2"
            >
              Comments{' '}
              <span className="text-xs font-normal text-slate-500">
                (optional for approval, required for rejection or changes)
              </span>
            </label>

            {canReview ? (
              <textarea
                id="prof-review-comments"
                rows={3}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Add your comments..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1662F3]"
              />
            ) : (
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700">
                {existingProfReview ? (
                  <>
                    <div className="font-bold text-slate-900 mb-1">
                      Reviewed by {existingProfReview.reviewerName} on{' '}
                      {existingProfReview.timestampFormatted} ({existingProfReview.decision})
                    </div>
                    <p>&ldquo;{existingProfReview.comments}&rdquo;</p>
                  </>
                ) : (
                  <span className="text-slate-500">
                    Review comments are locked because this request is in status{' '}
                    <strong>{request.currentStatus}</strong>.
                  </span>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Bottom Right Action Buttons matching Screen 8 */}
      <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
        <button
          type="button"
          disabled={!canReview}
          onClick={() => handleDecision('CHANGES_REQUESTED')}
          className="px-4 py-2.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 disabled:opacity-45 disabled:pointer-events-none text-amber-800 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Request Changes
        </button>

        <button
          type="button"
          disabled={!canReview}
          onClick={() => handleDecision('REJECTED')}
          className="px-6 py-2.5 rounded-lg bg-red-100 hover:bg-red-200 disabled:opacity-45 disabled:pointer-events-none text-red-700 text-sm font-bold transition-colors cursor-pointer"
        >
          Reject
        </button>

        <button
          type="button"
          disabled={!canReview}
          onClick={() => handleDecision('APPROVED')}
          className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-45 disabled:pointer-events-none text-white text-sm font-bold inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
        >
          <Check className="w-4 h-4 stroke-[2.5]" />
          Approve
        </button>
      </div>
    </div>
  );
};
