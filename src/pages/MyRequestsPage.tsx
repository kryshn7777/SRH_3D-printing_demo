import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  ArrowUpDown,
  Eye,
  KeyRound,
  Send,
  FileText,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StatusBadge } from '../components/StatusBadge';

type TabFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'draft';

export const MyRequestsPage: React.FC = () => {
  const { currentUser, requests, submitDraftRequest } = useApp();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialTab = (searchParams.get('status') as TabFilter) || 'all';
  const [activeTab, setActiveTab] = useState<TabFilter>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortAsc, setSortAsc] = useState(false);

  const studentId = currentUser?.role === 'STUDENT' ? currentUser.id : 'USR-STU-01';
  const myRequests = requests.filter((r) => r.studentId === studentId);

  const handleTabChange = (tab: TabFilter) => {
    setActiveTab(tab);
    if (tab === 'all') {
      setSearchParams({});
    } else {
      setSearchParams({ status: tab });
    }
  };

  const filtered = myRequests
    .filter((req) => {
      if (activeTab === 'pending') {
        return (
          req.currentStatus === 'PENDING_PROFESSOR_APPROVAL' ||
          req.currentStatus === 'PENDING_PC_APPROVAL' ||
          req.currentStatus === 'SUBMITTED' ||
          req.currentStatus === 'CHANGES_REQUESTED'
        );
      }
      if (activeTab === 'approved') {
        return req.currentStatus === 'APPROVED_ACCESS_GRANTED';
      }
      if (activeTab === 'rejected') {
        return (
          req.currentStatus === 'REJECTED_BY_PROFESSOR' ||
          req.currentStatus === 'REJECTED_BY_PC' ||
          req.currentStatus === 'ACCESS_REVOKED'
        );
      }
      if (activeTab === 'draft') {
        return req.currentStatus === 'DRAFT';
      }
      return true;
    })
    .filter((req) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        req.id.toLowerCase().includes(q) ||
        req.projectTitle.toLowerCase().includes(q) ||
        req.printerName.toLowerCase().includes(q) ||
        req.material.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const tA = new Date(a.submissionTimestamp).getTime();
      const tB = new Date(b.submissionTimestamp).getTime();
      return sortAsc ? tA - tB : tB - tA;
    });

  const counts = {
    all: myRequests.length,
    pending: myRequests.filter(
      (r) =>
        r.currentStatus === 'PENDING_PROFESSOR_APPROVAL' ||
        r.currentStatus === 'PENDING_PC_APPROVAL' ||
        r.currentStatus === 'SUBMITTED' ||
        r.currentStatus === 'CHANGES_REQUESTED'
    ).length,
    approved: myRequests.filter(
      (r) => r.currentStatus === 'APPROVED_ACCESS_GRANTED'
    ).length,
    rejected: myRequests.filter(
      (r) =>
        r.currentStatus === 'REJECTED_BY_PROFESSOR' ||
        r.currentStatus === 'REJECTED_BY_PC' ||
        r.currentStatus === 'ACCESS_REVOKED'
    ).length,
    draft: myRequests.filter((r) => r.currentStatus === 'DRAFT').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            My Requests
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Track approval progress, view reviewer comments, and open authorized printer access.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/student/requests/new')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1662F3] hover:bg-[#1251D1] text-white text-sm font-semibold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          New Printer Request
        </button>
      </div>

      {/* Main Card with Tabs, Search & Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* Tabs & Search Row */}
        <div className="px-5 pt-4 pb-3 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1">
            {(
              [
                { id: 'all', label: `All (${counts.all})` },
                { id: 'pending', label: `Pending (${counts.pending})` },
                { id: 'approved', label: `Approved (${counts.approved})` },
                { id: 'rejected', label: `Rejected (${counts.rejected})` },
                ...(counts.draft > 0
                  ? [{ id: 'draft', label: `Drafts (${counts.draft})` }]
                  : []),
              ] as { id: TabFilter; label: string }[]
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-[#EBF2FF] text-[#1662F3]'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ID, project, printer..."
                aria-label="Search my requests"
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#1662F3]"
              />
            </div>

            <button
              type="button"
              onClick={() => setSortAsc(!sortAsc)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 cursor-pointer"
              title="Toggle submission date sort order"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
              {sortAsc ? 'Oldest' : 'Newest'}
            </button>
          </div>
        </div>

        {/* Requests Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/60 text-xs font-bold text-slate-700">
                <th className="py-3.5 pl-5 pr-3">Request ID</th>
                <th className="py-3.5 px-3">Project Title</th>
                <th className="py-3.5 px-3">Printer</th>
                <th className="py-3.5 px-3">Material</th>
                <th className="py-3.5 px-3">Submission Date</th>
                <th className="py-3.5 px-3">Status</th>
                <th className="py-3.5 pl-3 pr-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 text-[13px]">
              {filtered.map((req) => (
                <tr
                  key={req.id}
                  className="hover:bg-slate-50/90 transition-colors"
                >
                  <td className="py-3.5 pl-5 pr-3 font-bold text-slate-900 whitespace-nowrap">
                    #{req.id}
                  </td>
                  <td className="py-3.5 px-3">
                    <div className="font-semibold text-slate-900">
                      {req.projectTitle}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {req.courseOrDepartment} • {req.attachment.fileName}
                    </div>
                  </td>
                  <td className="py-3.5 px-3 text-slate-700 whitespace-nowrap">
                    {req.printerName}
                  </td>
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-semibold text-xs">
                      {req.material}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-slate-600 whitespace-nowrap">
                    {req.submissionDateFormatted}
                  </td>
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <StatusBadge status={req.currentStatus} />
                  </td>
                  <td className="py-3.5 pl-3 pr-5 text-right whitespace-nowrap">
                    <div className="inline-flex items-center justify-end gap-2">
                      {req.currentStatus === 'DRAFT' && (
                        <button
                          type="button"
                          onClick={() => submitDraftRequest(req.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                        >
                          <Send className="w-3 h-3" />
                          Submit
                        </button>
                      )}
                      {req.currentStatus === 'APPROVED_ACCESS_GRANTED' && (
                        <button
                          type="button"
                          onClick={() => navigate(`/student/access/${req.id}`)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold cursor-pointer"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          Printer Access
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => navigate(`/student/requests/${req.id}`)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1662F3] hover:bg-[#1251D1] text-white text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View Details
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-800">
                      No matching 3D printing requests found
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Try clearing your search filter or create a new printer request.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
