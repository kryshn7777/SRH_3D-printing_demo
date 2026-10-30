import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Download,
  Calendar,
  Eye,
  FileSpreadsheet,
  ShieldCheck,
  Ban,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StatusBadge } from '../components/StatusBadge';
import { RequestStatus } from '../types/models';

export const PcLogPage: React.FC = () => {
  const { pcLogs, requests, currentUser, revokePrinterAccess } = useApp();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | RequestStatus>('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedLogId, setSelectedLogId] = useState<string | null>(
    pcLogs[0]?.id || null
  );

  const filteredLogs = pcLogs.filter((entry) => {
    const matchesStatus =
      statusFilter === 'ALL' || entry.currentStatus === statusFilter;
    if (!matchesStatus) return false;

    if (dateFilter) {
      const entryDateIso = entry.timestamp.slice(0, 10);
      if (entryDateIso !== dateFilter) return false;
    }

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      entry.requestId.toLowerCase().includes(q) ||
      entry.studentName.toLowerCase().includes(q) ||
      entry.projectTitle.toLowerCase().includes(q) ||
      entry.printerName.toLowerCase().includes(q) ||
      entry.material.toLowerCase().includes(q) ||
      entry.notes.toLowerCase().includes(q) ||
      entry.actorName.toLowerCase().includes(q)
    );
  });

  const selectedLog =
    filteredLogs.find((l) => l.id === selectedLogId) || filteredLogs[0] || null;
  const selectedRequest = selectedLog
    ? requests.find((r) => r.id === selectedLog.requestId)
    : null;

  const handleExportCsv = () => {
    const headers = [
      'Log ID',
      'Request ID',
      'Student',
      'Print Item',
      'Printer',
      'Material',
      'Professor Approval',
      'PC Admin Decision',
      'Timestamp',
      'Current Status',
      'Notes',
    ];
    const rows = filteredLogs.map((l) => [
      l.id,
      l.requestId,
      `"${l.studentName}"`,
      `"${l.projectTitle}"`,
      `"${l.printerName}"`,
      l.material,
      `"${l.professorApprovalSummary}"`,
      `"${l.pcAdminDecisionSummary}"`,
      `"${l.timestampFormatted}"`,
      l.currentStatus,
      `"${l.notes.replace(/"/g, '""')}"`,
    ]);
    const csvContent =
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `srh-berlin-pc-audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            PC Log &amp; Audit Trail
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Complete searchable record of submissions, professor reviews, PC final authorizations, and access revocations.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1662F3] hover:bg-[#1251D1] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          Export CSV ({filteredLogs.length})
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Request ID (#PR-003), student, project, printer, or reviewer..."
            aria-label="Search PC log"
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1662F3]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              aria-label="Filter by date"
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as 'ALL' | RequestStatus)
            }
            aria-label="Filter by status"
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="APPROVED_ACCESS_GRANTED">Approved (Access Granted)</option>
            <option value="PENDING_PC_APPROVAL">Waiting for PC Approval</option>
            <option value="PENDING_PROFESSOR_APPROVAL">Pending Professor</option>
            <option value="REJECTED_BY_PROFESSOR">Rejected by Professor</option>
            <option value="REJECTED_BY_PC">Rejected by PC Admin</option>
            <option value="ACCESS_REVOKED">Access Revoked</option>
          </select>

          {(searchQuery || statusFilter !== 'ALL' || dateFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
                setDateFilter('');
              }}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Full-Width Audit Table + Selected PC Log Entry Detail Card */}
      <div className="space-y-5">
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/70 text-xs font-bold text-slate-700">
                  <th className="py-3.5 pl-4 pr-2">Request ID</th>
                  <th className="py-3.5 px-2.5">Student</th>
                  <th className="py-3.5 px-2.5">Print Item</th>
                  <th className="py-3.5 px-2.5">Printer</th>
                  <th className="py-3.5 px-2.5">Material</th>
                  <th className="py-3.5 px-2.5">Professor Approval</th>
                  <th className="py-3.5 px-2.5">PC Decision</th>
                  <th className="py-3.5 px-2.5">Timestamp</th>
                  <th className="py-3.5 px-2.5">Status</th>
                  <th className="py-3.5 pl-2 pr-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 text-xs">
                {filteredLogs.map((entry) => {
                  const isSelected = selectedLog?.id === entry.id;
                  return (
                    <tr
                      key={entry.id}
                      onClick={() => setSelectedLogId(entry.id)}
                      className={`transition-colors cursor-pointer ${
                        isSelected ? 'bg-blue-50/60' : 'hover:bg-slate-50/90'
                      }`}
                    >
                      <td className="py-3.5 pl-4 pr-2 font-bold text-slate-900 whitespace-nowrap">
                        #{entry.requestId}
                      </td>
                      <td className="py-3.5 px-2.5 font-medium text-slate-900 whitespace-nowrap">
                        {entry.studentName}
                      </td>
                      <td className="py-3.5 px-2.5 font-medium text-slate-800">
                        {entry.projectTitle}
                      </td>
                      <td className="py-3.5 px-2.5 text-slate-600 whitespace-nowrap">
                        {entry.printerName}
                      </td>
                      <td className="py-3.5 px-2.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-semibold">
                          {entry.material}
                        </span>
                      </td>
                      <td className="py-3.5 px-2.5 text-slate-600">
                        {entry.professorApprovalSummary}
                      </td>
                      <td className="py-3.5 px-2.5 text-slate-700 font-medium">
                        {entry.pcAdminDecisionSummary}
                      </td>
                      <td className="py-3.5 px-2.5 text-slate-500 whitespace-nowrap">
                        {entry.timestampFormatted}
                      </td>
                      <td className="py-3.5 px-2.5 whitespace-nowrap">
                        <StatusBadge status={entry.currentStatus} compact />
                      </td>
                      <td className="py-3.5 pl-2 pr-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/pc/requests/${entry.requestId}/review`);
                          }}
                          className="px-2.5 py-1 rounded bg-[#EBF2FF] hover:bg-blue-100 text-[#1662F3] font-semibold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {filteredLogs.length === 0 && (
                  <tr>
                    <td
                      colSpan={10}
                      className="py-10 text-center text-sm text-slate-500"
                    >
                      No PC log records match your current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected PC Log Entry Detail Card */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-2xs space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#1662F3]" />
              PC Log Entry
            </h2>
            {selectedLog && (
              <span className="font-mono text-[11px] font-semibold text-slate-500">
                #{selectedLog.requestId}
              </span>
            )}
          </div>

          {selectedLog ? (
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 font-medium block">Student</span>
                <span className="text-slate-900 font-bold text-sm">
                  {selectedLog.studentName}
                </span>
              </div>

              <div>
                <span className="text-slate-400 font-medium block">
                  Print Item
                </span>
                <span className="text-slate-900 font-semibold text-[13px]">
                  {selectedLog.projectTitle}
                </span>
              </div>

              {selectedRequest && (
                <div>
                  <span className="text-slate-400 font-medium block">
                    Intended Use
                  </span>
                  <p className="text-slate-700 leading-relaxed mt-0.5">
                    {selectedRequest.intendedUse}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                <div>
                  <span className="text-slate-400 font-medium block">
                    Printer &amp; Material
                  </span>
                  <span className="font-semibold text-slate-800">
                    {selectedLog.printerName} ({selectedLog.material})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">
                    Logged Timestamp
                  </span>
                  <span className="font-semibold text-slate-800">
                    {selectedLog.timestampFormatted}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-400 font-medium block">
                  Audit Action &amp; Notes
                </span>
                <div className="mt-1 p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 space-y-1">
                  <div className="font-bold text-slate-900">
                    {selectedLog.action.replace(/_/g, ' ')} — by {selectedLog.actorName}
                  </div>
                  <p>&ldquo;{selectedLog.notes}&rdquo;</p>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/student/requests/${selectedLog.requestId}`)
                  }
                  className="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs cursor-pointer"
                >
                  Student Detail View
                </button>

                {currentUser?.role === 'PC_ADMIN' &&
                  selectedRequest?.currentStatus === 'APPROVED_ACCESS_GRANTED' && (
                    <button
                      type="button"
                      onClick={() =>
                        revokePrinterAccess(
                          selectedRequest.id,
                          'Revoked from PC Log audit view by PC Administrator.'
                        )
                      }
                      className="px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-semibold text-xs inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      Revoke Access
                    </button>
                  )}

                <button
                  type="button"
                  onClick={() =>
                    navigate(`/pc/requests/${selectedLog.requestId}/review`)
                  }
                  className="px-3.5 py-2 rounded-lg bg-[#1662F3] hover:bg-[#1251D1] text-white font-semibold text-xs cursor-pointer"
                >
                  Open PC Review
                </button>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">
              <FileSpreadsheet className="w-6 h-6 mx-auto mb-1.5 text-slate-300" />
              Select any row in the PC Log table to inspect full audit details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
