import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Clock,
  FileBox,
  Ban,
  Download,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { CadModelPreview } from '../components/PrinterIllustration';
import { triggerModelDownload } from '../utils/stlStorageAndParser';

export const PcFinalApprovalPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    currentUser,
    requests,
    approvals,
    printers,
    pcFinalReviewRequest,
    revokePrinterAccess,
    switchRoleUser,
  } = useApp();

  const request = requests.find(
    (r) => r.id.toLowerCase() === (id || '').toLowerCase()
  );

  const [assignedPrinterId, setAssignedPrinterId] = useState(
    request?.printerId || 'PR-02'
  );
  const [validUntil, setValidUntil] = useState('18 Oct 2024, 23:59');
  const [logNote, setLogNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmApproveOpen, setConfirmApproveOpen] = useState(false);
  const [confirmRevokeOpen, setConfirmRevokeOpen] = useState(false);

  if (!request) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
        <h1 className="text-lg font-bold text-slate-900">
          Request #{id} Not Found
        </h1>
        <button
          type="button"
          onClick={() => navigate('/pc/dashboard')}
          className="px-4 py-2 rounded-lg bg-[#1662F3] text-white text-xs font-semibold cursor-pointer"
        >
          Back to PC Admin Dashboard
        </button>
      </div>
    );
  }

  const isPcAdmin = currentUser?.role === 'PC_ADMIN';
  const canAuthorize =
    isPcAdmin && request.currentStatus === 'PENDING_PC_APPROVAL';
  const canRevoke =
    isPcAdmin && request.currentStatus === 'APPROVED_ACCESS_GRANTED';

  const profApproval = approvals.find(
    (a) =>
      a.requestId === request.id &&
      a.reviewerRole === 'PROFESSOR' &&
      a.decision === 'APPROVED'
  );

  const pcApproval = approvals.find(
    (a) => a.requestId === request.id && a.reviewerRole === 'PC_ADMIN'
  );

  const selectedPrinterObj =
    printers.find((p) => p.id === assignedPrinterId) ||
    printers.find((p) => p.id === request.printerId);

  const handleConfirmGrant = () => {
    setConfirmApproveOpen(false);
    setError(null);
    const res = pcFinalReviewRequest(
      request.id,
      'APPROVED',
      logNote,
      assignedPrinterId,
      validUntil
    );
    if (!res.ok) {
      setError(res.error || 'Could not authorize request.');
      return;
    }
    navigate('/pc/log');
  };

  const handleReject = () => {
    setError(null);
    const res = pcFinalReviewRequest(
      request.id,
      'REJECTED',
      logNote,
      assignedPrinterId,
      validUntil
    );
    if (!res.ok) {
      setError(res.error || 'Could not reject request.');
      return;
    }
    navigate('/pc/log');
  };

  const handleRevoke = () => {
    setConfirmRevokeOpen(false);
    setError(null);
    const reason =
      logNote.trim() ||
      'Access revoked by PC Administrator due to lab schedule or safety policy.';
    const res = revokePrinterAccess(request.id, reason);
    if (!res.ok) {
      setError(res.error || 'Could not revoke access.');
      return;
    }
    navigate('/pc/log');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Role Warning Banner if not PC_ADMIN */}
      {!isPcAdmin && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-900"
        >
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-bold">
                PC Administrator Role Required (Signed in as {currentUser?.name} —{' '}
                {currentUser?.role})
              </p>
              <p className="text-amber-800 mt-0.5">
                Only a PC Administrator can grant final printer access after Professor approval.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => switchRoleUser('USR-PC-01')}
            className="px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold cursor-pointer"
          >
            Switch to PC Admin
          </button>
        </div>
      )}

      {/* Header matching Screen 10 */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/pc/dashboard')}
            className="p-2 rounded-lg hover:bg-slate-200/70 text-slate-700 transition-colors cursor-pointer"
            aria-label="Back to PC Admin Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            PC Final Approval - #{request.id}
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

      {/* Top Two-Column Cards matching Screen 10: Request Information & Professor Status */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
        {/* Left: Request Information (6 cols) */}
        <section className="md:col-span-6 bg-white rounded-xl border border-slate-200/90 p-5 shadow-2xs space-y-3">
          <h2 className="text-sm font-bold text-slate-900">
            Request Information
          </h2>

          <div className="grid grid-cols-3 gap-y-2.5 text-xs pt-1">
            <span className="text-slate-500 font-medium">Student</span>
            <span className="col-span-2 font-semibold text-slate-900">
              {request.studentName} ({request.courseOrDepartment})
            </span>

            <span className="text-slate-500 font-medium">Project</span>
            <span className="col-span-2 font-semibold text-slate-900">
              {request.projectTitle}
            </span>

            <span className="text-slate-500 font-medium">Printer</span>
            <span className="col-span-2 font-semibold text-slate-900">
              {request.printerName}
            </span>

            <span className="text-slate-500 font-medium">Material</span>
            <span className="col-span-2 font-semibold text-slate-900">
              {request.material}
            </span>

            <span className="text-slate-500 font-medium">Estimated Time</span>
            <span className="col-span-2 font-semibold text-slate-900">
              {request.estimatedDuration} (Qty: {request.quantity})
            </span>

            <span className="text-slate-500 font-medium">3D Model File</span>
            <span className="col-span-2 font-medium text-[#1662F3] flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1">
                <FileBox className="w-3.5 h-3.5" />
                {request.attachment.fileName} ({request.attachment.fileSizeFormatted})
              </span>
              <button
                type="button"
                onClick={() =>
                  void triggerModelDownload(
                    request.attachment.fileName,
                    request.attachment.storageKey,
                    request.attachment.previewKey
                  )
                }
                className="px-2.5 py-1 rounded-md bg-[#EBF2FF] hover:bg-blue-100 text-[#1662F3] text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3 h-3" />
                Download STL
              </button>
            </span>
          </div>

          <CadModelPreview
            previewKey={request.attachment.previewKey}
            storageKey={request.attachment.storageKey}
            fileName={request.attachment.fileName}
            className="w-full h-40"
          />

          <div className="pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-400 font-medium block">
              Project Description
            </span>
            <p className="text-slate-700 mt-0.5 leading-relaxed">
              {request.description}
            </p>
          </div>
        </section>

        {/* Right: Professor Status (6 cols) matching Screen 10 */}
        <section className="md:col-span-6 bg-white rounded-xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between">
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-slate-900">
              Professor Status
            </h2>

            {profApproval ? (
              <>
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      Approved by {profApproval.reviewerName}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {profApproval.timestampFormatted}
                    </div>
                  </div>
                </div>

                <div className="text-xs space-y-1 pt-1">
                  <span className="font-bold text-slate-800 block">
                    Comment:
                  </span>
                  <p className="text-slate-600 italic bg-slate-50 p-3 rounded-lg border border-slate-200/70">
                    &ldquo;{profApproval.comments}&rdquo;
                  </p>
                </div>
              </>
            ) : request.currentStatus === 'PENDING_PROFESSOR_APPROVAL' ? (
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">
                    Awaiting Professor Approval ({request.assignedProfessorName || 'Ajinkya Keskar'})
                  </div>
                  <p className="text-amber-800 mt-0.5">
                    PC Final Approval is locked until the assigned Professor approves the academic scope of this request.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                Status: {request.currentStatus}
              </div>
            )}
          </div>

          {pcApproval && (
            <div className="mt-4 pt-3 border-t border-slate-100 text-xs">
              <span className="font-bold text-slate-800">
                Previous PC Admin Decision ({pcApproval.timestampFormatted}):
              </span>
              <p className="text-slate-600 mt-0.5">
                {pcApproval.decision} by {pcApproval.reviewerName} — &ldquo;{pcApproval.comments}&rdquo;
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Bottom Card: PC Log Entry, Printer Assignment & Validity Controls matching Screen 10 */}
      <section className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900">PC Log Entry</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="pc-printer-assign"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Assigned Printer Hardware
            </label>
            <select
              id="pc-printer-assign"
              disabled={!canAuthorize}
              value={assignedPrinterId}
              onChange={(e) => setAssignedPrinterId(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 bg-white disabled:bg-slate-100 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1662F3]"
            >
              {printers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.id}) — {p.availabilityStatus} [{p.backendUrl}]
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="pc-valid-until"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Access Validity Period
            </label>
            <input
              id="pc-valid-until"
              type="text"
              disabled={!canAuthorize}
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              placeholder="18 Oct 2024, 23:59"
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 bg-white disabled:bg-slate-100 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1662F3]"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="pc-log-note"
            className="block text-xs font-semibold text-slate-700 mb-1.5"
          >
            Log Note{' '}
            <span className="font-normal text-slate-500">
              (recorded permanently in the PC Audit Log; required if rejecting or revoking)
            </span>
          </label>
          <textarea
            id="pc-log-note"
            rows={3}
            disabled={!canAuthorize && !canRevoke}
            value={logNote}
            onChange={(e) => setLogNote(e.target.value)}
            placeholder="Add log note..."
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 disabled:bg-slate-100 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1662F3]"
          />
        </div>

        {/* Action Buttons matching Screen 10 */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          {canRevoke && (
            <button
              type="button"
              onClick={() => setConfirmRevokeOpen(true)}
              className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Ban className="w-3.5 h-3.5" />
              Revoke Printer Access
            </button>
          )}

          <button
            type="button"
            disabled={!canAuthorize}
            onClick={handleReject}
            className="px-6 py-2.5 rounded-lg bg-red-100 hover:bg-red-200 disabled:opacity-45 disabled:pointer-events-none text-red-700 text-xs sm:text-sm font-bold transition-colors cursor-pointer"
          >
            Reject
          </button>

          <button
            type="button"
            disabled={!canAuthorize}
            onClick={() => setConfirmApproveOpen(true)}
            className="px-6 py-2.5 rounded-lg bg-[#1662F3] hover:bg-[#1251D1] disabled:opacity-45 disabled:pointer-events-none text-white text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer"
          >
            Approve &amp; Grant Access
          </button>
        </div>
      </section>

      {/* Confirmation Dialog before Granting Final Access */}
      <ConfirmDialog
        open={confirmApproveOpen}
        title={`Authorize Printer Access for #${request.id}?`}
        description={`You are granting ${request.studentName} access to ${
          selectedPrinterObj?.name || request.printerName
        } (${selectedPrinterObj?.id || request.printerId}) valid until ${validUntil}. This action will generate an immutable PC Log audit record and unlock printer login credentials for the student.`}
        confirmLabel="Confirm & Grant Access"
        variant="primary"
        onConfirm={handleConfirmGrant}
        onCancel={() => setConfirmApproveOpen(false)}
      >
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1 text-slate-700">
          <div>
            <strong>Student:</strong> {request.studentName}
          </div>
          <div>
            <strong>Project:</strong> {request.projectTitle} ({request.material})
          </div>
          <div>
            <strong>Assigned Printer:</strong>{' '}
            {selectedPrinterObj?.name} ({selectedPrinterObj?.backendUrl})
          </div>
        </div>
      </ConfirmDialog>

      {/* Confirmation Dialog before Revoking Access */}
      <ConfirmDialog
        open={confirmRevokeOpen}
        title={`Revoke Printer Access for #${request.id}?`}
        description={`This will immediately invalidate ${request.studentName}'s printer login credentials and record an ACCESS_REVOKED event in the PC Log.`}
        confirmLabel="Revoke Access Now"
        variant="danger"
        onConfirm={handleRevoke}
        onCancel={() => setConfirmRevokeOpen(false)}
      />
    </div>
  );
};
