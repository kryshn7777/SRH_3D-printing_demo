import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  FileBox,
  KeyRound,
  Send,
  AlertCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StatusBadge } from '../components/StatusBadge';
import { CadModelPreview } from '../components/PrinterIllustration';
import { ApprovalTimeline } from '../components/ApprovalTimeline';
import { triggerModelDownload } from '../utils/stlStorageAndParser';

export const StudentRequestDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { requests, approvals, addToast, submitDraftRequest } = useApp();

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
        <p className="text-xs text-slate-500">
          The requested print job ID does not exist in the system.
        </p>
        <button
          type="button"
          onClick={() => navigate('/student/requests')}
          className="px-4 py-2 rounded-lg bg-[#1662F3] text-white text-xs font-semibold cursor-pointer"
        >
          Back to My Requests
        </button>
      </div>
    );
  }

  const requestApprovals = approvals.filter((a) => a.requestId === request.id);

  const handleDownloadModel = async () => {
    await triggerModelDownload(
      request.attachment.fileName,
      request.attachment.storageKey,
      request.attachment.previewKey
    );
    addToast(
      'info',
      'Downloading 3D Model',
      `Downloaded ${request.attachment.fileName} (${request.attachment.fileSizeFormatted}).`
    );
  };

  return (
    <div className="space-y-5">
      {/* Top Header Bar matching Screen 6 */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/student/requests')}
            className="p-2 rounded-lg hover:bg-slate-200/70 text-slate-700 transition-colors cursor-pointer"
            aria-label="Back to My Requests"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Request #{request.id}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {(request.currentStatus === 'DRAFT' ||
            request.currentStatus === 'CHANGES_REQUESTED') && (
            <button
              type="button"
              onClick={() => submitDraftRequest(request.id)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1662F3] hover:bg-[#1251D1] text-white text-xs font-semibold shadow-2xs cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              {request.currentStatus === 'DRAFT'
                ? 'Submit Request Now'
                : 'Resubmit for Approval'}
            </button>
          )}

          {request.currentStatus === 'APPROVED_ACCESS_GRANTED' && (
            <button
              type="button"
              onClick={() => navigate(`/student/access/${request.id}`)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
              Open Printer Access
            </button>
          )}

          <StatusBadge status={request.currentStatus} />
        </div>
      </div>

      {/* Top Row: Project Information (6 cols) + Printer & Material (3 cols) + 3D Model File (3 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Card 1: Project Information */}
        <section className="lg:col-span-6 bg-white rounded-xl border border-slate-200/90 p-5 shadow-2xs">
          <h2 className="text-sm font-bold text-slate-900 mb-4">
            Project Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
            <div className="sm:col-span-5">
              <CadModelPreview
                previewKey={request.attachment.previewKey}
                storageKey={request.attachment.storageKey}
                fileName={request.attachment.fileName}
                className="w-full h-44"
              />
            </div>

            <div className="sm:col-span-7 space-y-2.5 text-xs">
              <div>
                <span className="text-slate-400 font-medium block">
                  Print Item
                </span>
                <span className="text-slate-900 font-bold text-sm">
                  {request.projectTitle}
                </span>
              </div>

              <div>
                <span className="text-slate-400 font-medium block">
                  Intended Use
                </span>
                <p className="text-slate-700 leading-relaxed mt-0.5">
                  {request.intendedUse}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-slate-400 font-medium block">
                    Course / Department
                  </span>
                  <span className="text-slate-800 font-semibold">
                    {request.courseOrDepartment}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">
                    Submitted On
                  </span>
                  <span className="text-slate-800 font-semibold">
                    {request.submissionDateTimeFormatted}
                  </span>
                </div>
              </div>

              <div className="pt-1 border-t border-slate-100">
                <span className="text-slate-400 font-medium block">
                  Contacted for Approval / Support
                </span>
                <span className="text-slate-600 block mt-0.5">
                  {request.contactedApprover}
                  {request.matriculationNumber && ` • Matr. ${request.matriculationNumber}`}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Card 2: Printer & Material */}
        <section className="lg:col-span-3 bg-white rounded-xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 mb-4">
              Printer &amp; Material
            </h2>

            <div className="space-y-3 text-xs">
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
                <span className="text-slate-400 font-medium block">Quantity</span>
                <span className="text-slate-900 font-semibold text-[13px]">
                  {request.quantity}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Card 3: 3D Model File */}
        <section className="lg:col-span-3 bg-white rounded-xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 mb-4">
              3D Model File
            </h2>

            <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-[#1662F3] flex items-center justify-center shrink-0">
                  <FileBox className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {request.attachment.fileName}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {request.attachment.fileSizeFormatted}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDownloadModel}
                className="w-full py-2 px-3 rounded-lg bg-[#EBF2FF] hover:bg-blue-100 text-[#1662F3] text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </button>
            </div>
          </div>

          <div className="pt-3 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Format: {request.attachment.fileType}</span>
            <span>{request.attachment.dimensionsMm || '142 × 68 × 54 mm'}</span>
          </div>
        </section>
      </div>

      {/* Bottom Row: Approval Workflow (8 cols) + Comments (4 cols) matching Screen 6 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Card 4: Approval Workflow */}
        <section className="lg:col-span-8 bg-white rounded-xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between">
          <h2 className="text-sm font-bold text-slate-900 mb-4">
            Approval Workflow
          </h2>
          <ApprovalTimeline request={request} approvals={approvals} />
        </section>

        {/* Card 5: Comments */}
        <section className="lg:col-span-4 bg-white rounded-xl border border-slate-200/90 p-5 shadow-2xs flex flex-col">
          <h2 className="text-sm font-bold text-slate-900 mb-3">Comments</h2>

          {requestApprovals.length === 0 ? (
            <div className="flex-1 rounded-xl bg-slate-50 border border-slate-200/70 p-4 flex items-center justify-center text-xs text-slate-400">
              No comments yet.
            </div>
          ) : (
            <div className="space-y-2.5 flex-1">
              {requestApprovals.map((apr) => (
                <div
                  key={apr.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">
                      {apr.reviewerName}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {apr.timestampFormatted}
                    </span>
                  </div>
                  <p className="text-slate-700 leading-relaxed">
                    &ldquo;{apr.comments}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
