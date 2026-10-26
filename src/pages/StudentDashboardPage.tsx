import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StatusBadge, PrinterAvailabilityBadge } from '../components/StatusBadge';
import { PrinterIllustration } from '../components/PrinterIllustration';

export const StudentDashboardPage: React.FC = () => {
  const { currentUser, requests, printers } = useApp();
  const navigate = useNavigate();

  const studentRequests = requests.filter(
    (r) =>
      r.studentId === (currentUser?.id || 'USR-STU-01') ||
      currentUser?.role !== 'STUDENT'
  );

  // Filter strictly for Anna Müller when logged in as Anna
  const myRequests = requests.filter(
    (r) => r.studentId === (currentUser?.id || 'USR-STU-01')
  );
  const displayList = myRequests.length > 0 ? myRequests : studentRequests;

  const totalCount = displayList.filter((r) => r.currentStatus !== 'DRAFT').length;
  const pendingCount = displayList.filter(
    (r) =>
      r.currentStatus === 'PENDING_PROFESSOR_APPROVAL' ||
      r.currentStatus === 'PENDING_PC_APPROVAL' ||
      r.currentStatus === 'SUBMITTED' ||
      r.currentStatus === 'CHANGES_REQUESTED'
  ).length;
  const approvedCount = displayList.filter(
    (r) => r.currentStatus === 'APPROVED_ACCESS_GRANTED'
  ).length;
  const rejectedCount = displayList.filter(
    (r) =>
      r.currentStatus === 'REJECTED_BY_PROFESSOR' ||
      r.currentStatus === 'REJECTED_BY_PC' ||
      r.currentStatus === 'ACCESS_REVOKED'
  ).length;

  const firstName = (currentUser?.name || 'Anna').split(' ')[0];

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Welcome, {firstName}!
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Submit and track your 3D printing requests.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/student/requests/new')}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#1662F3] hover:bg-[#1251D1] text-white text-sm font-semibold shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          New Printer Request
        </button>
      </div>

      {/* 4 Summary KPI Cards matching Screen 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => navigate('/student/requests')}
          className="bg-white rounded-xl border border-slate-200/90 p-4 flex items-center gap-4 text-left hover:border-blue-300 transition-colors shadow-2xs cursor-pointer"
        >
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#1662F3] flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900 leading-none">
              {totalCount}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">
              Total Requests
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate('/student/requests?status=pending')}
          className="bg-white rounded-xl border border-slate-200/90 p-4 flex items-center gap-4 text-left hover:border-amber-300 transition-colors shadow-2xs cursor-pointer"
        >
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900 leading-none">
              {pendingCount}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">
              Pending
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate('/student/requests?status=approved')}
          className="bg-white rounded-xl border border-slate-200/90 p-4 flex items-center gap-4 text-left hover:border-emerald-300 transition-colors shadow-2xs cursor-pointer"
        >
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900 leading-none">
              {approvedCount}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">
              Approved
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate('/student/requests?status=rejected')}
          className="bg-white rounded-xl border border-slate-200/90 p-4 flex items-center gap-4 text-left hover:border-red-300 transition-colors shadow-2xs cursor-pointer"
        >
          <div className="w-11 h-11 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shrink-0">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900 leading-none">
              {rejectedCount}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">
              Rejected
            </div>
          </div>
        </button>
      </div>

      {/* Main Two-Column Grid: Recent Requests & Available Printers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Recent Requests Table (7 cols) */}
        <section className="lg:col-span-7 bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">
              Recent Requests
            </h2>
            <Link
              to="/student/requests"
              className="text-xs font-semibold text-[#1662F3] hover:underline"
            >
              View all
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 text-[12px] font-bold text-slate-700 bg-slate-50/50">
                  <th className="py-3 pl-5 pr-3">#</th>
                  <th className="py-3 px-3">Project Title</th>
                  <th className="py-3 px-3">Printer</th>
                  <th className="py-3 px-3">Material</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 pl-3 pr-5">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 text-[13px]">
                {displayList.slice(0, 6).map((req) => (
                  <tr
                    key={req.id}
                    onClick={() => navigate(`/student/requests/${req.id}`)}
                    className="hover:bg-slate-50/90 transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 pl-5 pr-3 font-semibold text-slate-800 whitespace-nowrap">
                      #{req.id}
                    </td>
                    <td className="py-3.5 px-3 font-medium text-slate-900">
                      {req.projectTitle}
                    </td>
                    <td className="py-3.5 px-3 text-slate-600 whitespace-nowrap">
                      {req.printerName}
                    </td>
                    <td className="py-3.5 px-3 text-slate-600 whitespace-nowrap">
                      {req.material}
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <StatusBadge status={req.currentStatus} compact />
                    </td>
                    <td className="py-3.5 pl-3 pr-5 text-slate-600 whitespace-nowrap">
                      {req.submissionDateFormatted}
                    </td>
                  </tr>
                ))}

                {displayList.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-8 text-center text-sm text-slate-500"
                    >
                      No print requests yet. Click &ldquo;New Printer Request&rdquo; to begin.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Right: Available Printers Panel (5 cols) */}
        <section className="lg:col-span-5 bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900">
              Available Printers
            </h2>
            <Link
              to="/student/printers"
              className="text-xs font-semibold text-[#1662F3] hover:underline"
            >
              View all
            </Link>
          </div>

          <div className="space-y-3">
            {printers.slice(0, 3).map((printer) => (
              <div
                key={printer.id}
                onClick={() => navigate(`/student/printers?highlight=${printer.id}`)}
                className="p-3 rounded-xl border border-slate-200/80 hover:border-blue-300 bg-slate-50/40 hover:bg-white flex items-center justify-between gap-3 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <PrinterIllustration
                    printerKey={printer.illustrationKey}
                    className="w-12 h-12"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900 truncate">
                      {printer.name}
                    </div>
                    <div className="text-xs text-slate-500 truncate mt-0.5">
                      {printer.technology} • {printer.supportedMaterials.join(', ')}
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  <PrinterAvailabilityBadge status={printer.availabilityStatus} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
