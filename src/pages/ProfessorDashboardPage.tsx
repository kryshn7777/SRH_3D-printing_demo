import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  SlidersHorizontal,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DEPARTMENTS } from '../data/seedData';
import { StatusBadge } from '../components/StatusBadge';

type ProfTab = 'pending' | 'approved' | 'rejected';

export const ProfessorDashboardPage: React.FC = () => {
  const { currentUser, requests, approvals, switchRoleUser } = useApp();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = (searchParams.get('tab') as ProfTab) || 'pending';
  const [activeTab, setActiveTab] = useState<ProfTab>(tabParam);
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');

  useEffect(() => {
    const t = searchParams.get('tab') as ProfTab;
    if (t === 'pending' || t === 'approved' || t === 'rejected') {
      setActiveTab(t);
    }
  }, [searchParams]);

  const handleTabChange = (tab: ProfTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Scope requests to Professor's assigned departments and to requests sent to them
  const allowedDepts = currentUser?.assignedDepartments || DEPARTMENTS;

  const scopedRequests = requests.filter(
    (r) =>
      r.currentStatus !== 'DRAFT' &&
      allowedDepts.includes(r.courseOrDepartment) &&
      (currentUser?.role !== 'PROFESSOR' ||
        r.contactedApprover === currentUser.name)
  );

  const pendingRequests = scopedRequests.filter(
    (r) =>
      r.currentStatus === 'PENDING_PROFESSOR_APPROVAL' ||
      r.currentStatus === 'SUBMITTED'
  );

  const approvedByProfRequests = scopedRequests.filter(
    (r) =>
      r.currentStatus === 'PENDING_PC_APPROVAL' ||
      r.currentStatus === 'APPROVED_ACCESS_GRANTED' ||
      approvals.some(
        (a) =>
          a.requestId === r.id &&
          a.reviewerRole === 'PROFESSOR' &&
          a.decision === 'APPROVED'
      )
  );

  const rejectedByProfRequests = scopedRequests.filter(
    (r) =>
      r.currentStatus === 'REJECTED_BY_PROFESSOR' ||
      r.currentStatus === 'CHANGES_REQUESTED'
  );

  const currentList =
    activeTab === 'pending'
      ? pendingRequests
      : activeTab === 'approved'
      ? approvedByProfRequests
      : rejectedByProfRequests;

  const filteredList = currentList.filter((req) => {
    const matchesDept =
      deptFilter === 'ALL' || req.courseOrDepartment === deptFilter;
    if (!matchesDept) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      req.id.toLowerCase().includes(q) ||
      req.studentName.toLowerCase().includes(q) ||
      req.projectTitle.toLowerCase().includes(q) ||
      req.printerName.toLowerCase().includes(q) ||
      req.material.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Role Warning Banner if viewing while logged in as Student */}
      {currentUser?.role !== 'PROFESSOR' && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              You are currently viewing the Professor Dashboard while signed in as{' '}
              <strong>
                {currentUser?.name} ({currentUser?.role})
              </strong>
              . Switch to Professor role to approve or reject requests.
            </span>
          </div>
          <button
            type="button"
            onClick={() => switchRoleUser('USR-PROF-01')}
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold cursor-pointer"
          >
            Switch to Ajinkya Keskar
          </button>
        </div>
      )}

      {/* Header matching Screen 7 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Professor Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Review and approve student 3D printing requests.
          </p>
        </div>

        <div className="text-xs text-slate-500 bg-white px-3.5 py-2 rounded-lg border border-slate-200/80 shadow-2xs">
          Assigned Scope:{' '}
          <span className="font-semibold text-slate-800">
            Engineering, Robotics &amp; Design Faculties
          </span>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => handleTabChange('pending')}
          className={`bg-white rounded-xl border p-4 flex items-center gap-4 text-left transition-colors shadow-2xs cursor-pointer ${
            activeTab === 'pending'
              ? 'border-[#1662F3] ring-1 ring-[#1662F3]/20'
              : 'border-slate-200/90 hover:border-slate-300'
          }`}
        >
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900 leading-none">
              {pendingRequests.length}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">
              Pending Academic Review
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('approved')}
          className={`bg-white rounded-xl border p-4 flex items-center gap-4 text-left transition-colors shadow-2xs cursor-pointer ${
            activeTab === 'approved'
              ? 'border-[#1662F3] ring-1 ring-[#1662F3]/20'
              : 'border-slate-200/90 hover:border-slate-300'
          }`}
        >
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900 leading-none">
              {approvedByProfRequests.length}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">
              Approved by Professor
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('rejected')}
          className={`bg-white rounded-xl border p-4 flex items-center gap-4 text-left transition-colors shadow-2xs cursor-pointer ${
            activeTab === 'rejected'
              ? 'border-[#1662F3] ring-1 ring-[#1662F3]/20'
              : 'border-slate-200/90 hover:border-slate-300'
          }`}
        >
          <div className="w-11 h-11 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shrink-0">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900 leading-none">
              {rejectedByProfRequests.length}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">
              Rejected / Changes Requested
            </div>
          </div>
        </button>
      </div>

      {/* Main Table Card matching Screen 7 */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* Underline Tabs & Search Bar */}
        <div className="px-5 pt-3 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-6 -mb-[1px]">
            <button
              type="button"
              onClick={() => handleTabChange('pending')}
              className={`pb-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                activeTab === 'pending'
                  ? 'border-[#1662F3] text-[#1662F3]'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Pending ({pendingRequests.length})
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('approved')}
              className={`pb-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                activeTab === 'approved'
                  ? 'border-[#1662F3] text-[#1662F3]'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Approved ({approvedByProfRequests.length})
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('rejected')}
              className={`pb-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                activeTab === 'rejected'
                  ? 'border-[#1662F3] text-[#1662F3]'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Rejected ({rejectedByProfRequests.length})
            </button>
          </div>

          <div className="pb-2.5 flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search student, project, ID..."
                aria-label="Search professor requests"
                className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#1662F3]"
              />
            </div>

            <div className="inline-flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                aria-label="Filter by department"
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1662F3]"
              >
                <option value="ALL">All Departments</option>
                {allowedDepts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table matching Screen 7 columns: #, Student, Print Item, Printer, Material, Submitted, Action */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/50 text-xs font-bold text-slate-700">
                <th className="py-3.5 pl-5 pr-3">#</th>
                <th className="py-3.5 px-3">Student</th>
                <th className="py-3.5 px-3">Print Item</th>
                <th className="py-3.5 px-3">Printer</th>
                <th className="py-3.5 px-3">Material</th>
                <th className="py-3.5 px-3">Submitted</th>
                <th className="py-3.5 pl-3 pr-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 text-[13px]">
              {filteredList.map((req) => (
                <tr
                  key={req.id}
                  className="hover:bg-slate-50/90 transition-colors"
                >
                  <td className="py-3.5 pl-5 pr-3 font-semibold text-slate-800 whitespace-nowrap">
                    {req.id}
                  </td>
                  <td className="py-3.5 px-3 font-medium text-slate-900 whitespace-nowrap">
                    {req.studentName}
                  </td>
                  <td className="py-3.5 px-3 text-slate-800">
                    <div className="font-medium">{req.projectTitle}</div>
                    {activeTab !== 'pending' && (
                      <div className="mt-0.5">
                        <StatusBadge status={req.currentStatus} compact />
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-3 text-slate-600 whitespace-nowrap">
                    {req.printerName}
                  </td>
                  <td className="py-3.5 px-3 text-slate-600 whitespace-nowrap">
                    {req.material}
                  </td>
                  <td className="py-3.5 px-3 text-slate-600 whitespace-nowrap">
                    {req.submissionDateFormatted}
                  </td>
                  <td className="py-3.5 pl-3 pr-5 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/professor/requests/${req.id}/review`)
                      }
                      className="px-4 py-1.5 rounded-lg bg-[#1662F3] hover:bg-[#1251D1] text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}

              {filteredList.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="py-10 text-center text-sm text-slate-500"
                  >
                    No requests in this queue matching your criteria.
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
