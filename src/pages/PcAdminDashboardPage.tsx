import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  Clock,
  CheckCircle2,
  ClipboardList,
  Printer as PrinterIcon,
  Users,
  ShieldAlert,
  Plus,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StatusBadge, PrinterAvailabilityBadge } from '../components/StatusBadge';
import { PrinterIllustration } from '../components/PrinterIllustration';
import { PrinterAvailability, SupportedMaterial } from '../types/models';

type PcTab = 'waiting' | 'approved' | 'logs';
type PcSection = 'requests' | 'printers' | 'users';

export const PcAdminDashboardPage: React.FC = () => {
  const {
    currentUser,
    requests,
    pcLogs,
    printers,
    users,
    updatePrinterStatus,
    addPrinter,
    toggleUserActive,
    switchRoleUser,
  } = useApp();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = (searchParams.get('tab') as PcTab) || 'waiting';
  const sectionParam = (searchParams.get('section') as PcSection) || 'requests';

  const [activeTab, setActiveTab] = useState<PcTab>(tabParam);
  const [activeSection, setActiveSection] = useState<PcSection>(sectionParam);
  const [searchQuery, setSearchQuery] = useState('');
  const [newPrinterModal, setNewPrinterModal] = useState(false);
  const [newPrinterName, setNewPrinterName] = useState('');
  const [newPrinterModel, setNewPrinterModel] = useState('');
  const [newPrinterVolume, setNewPrinterVolume] = useState('250 × 210 × 220 mm');
  const [newPrinterUrl, setNewPrinterUrl] = useState('http://192.168.1.40');

  useEffect(() => {
    const s = searchParams.get('section') as PcSection;
    if (s === 'printers' || s === 'users') {
      setActiveSection(s);
    } else {
      setActiveSection('requests');
    }
    const t = searchParams.get('tab') as PcTab;
    if (t === 'waiting' || t === 'approved' || t === 'logs') {
      setActiveTab(t);
    }
  }, [searchParams]);

  // Distinguish professor-approved requests (PENDING_PC_APPROVAL) from final authorized requests (APPROVED_ACCESS_GRANTED)
  const waitingForPcRequests = requests.filter(
    (r) => r.currentStatus === 'PENDING_PC_APPROVAL'
  );
  const finalAuthorizedRequests = requests.filter(
    (r) => r.currentStatus === 'APPROVED_ACCESS_GRANTED'
  );

  const displayedRequests =
    activeTab === 'waiting' ? waitingForPcRequests : finalAuthorizedRequests;

  const filteredRequests = displayedRequests.filter((req) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      req.id.toLowerCase().includes(q) ||
      req.studentName.toLowerCase().includes(q) ||
      req.projectTitle.toLowerCase().includes(q) ||
      (req.assignedProfessorName || '').toLowerCase().includes(q)
    );
  });

  const handleAddPrinterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrinterName.trim()) return;
    addPrinter({
      name: newPrinterName.trim(),
      model: newPrinterModel.trim() || newPrinterName.trim(),
      technology: 'FDM',
      buildVolume: newPrinterVolume.trim() || '250 × 210 × 220 mm',
      supportedMaterials: ['PLA', 'PETG', 'ABS'] as SupportedMaterial[],
      availabilityStatus: 'Available',
      backendUrl: newPrinterUrl.trim() || 'http://192.168.1.40',
      nozzleDiameter: '0.4 mm Hardened Steel',
      layerResolution: '0.08 – 0.28 mm',
      location: 'Building B, Room 104 — Expansion Bay',
      illustrationKey: 'prusa-mk4',
      usageRestrictions: ['Standard SRH MakerLab safety rules apply.'],
    });
    setNewPrinterName('');
    setNewPrinterModel('');
    setNewPrinterModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Role Warning Banner if viewing as non-PC Admin */}
      {currentUser?.role !== 'PC_ADMIN' && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              You are viewing the PC Admin Dashboard while signed in as{' '}
              <strong>
                {currentUser?.name} ({currentUser?.role})
              </strong>
              . Switch to PC Admin role to grant final printer authorization.
            </span>
          </div>
          <button
            type="button"
            onClick={() => switchRoleUser('USR-PC-01')}
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold cursor-pointer"
          >
            Switch to Markus Klein (PC Admin)
          </button>
        </div>
      )}

      {/* Header & Section Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            PC Admin Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Verify approved requests and grant final authorization.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveSection('requests');
              setSearchParams({});
            }}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeSection === 'requests'
                ? 'bg-[#1662F3] text-white shadow-2xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            PC Approvals ({waitingForPcRequests.length})
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSection('printers');
              setSearchParams({ section: 'printers' });
            }}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeSection === 'printers'
                ? 'bg-[#1662F3] text-white shadow-2xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <PrinterIcon className="w-3.5 h-3.5" />
            Printer Management ({printers.length})
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSection('users');
              setSearchParams({ section: 'users' });
            }}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeSection === 'users'
                ? 'bg-[#1662F3] text-white shadow-2xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Users ({users.length})
          </button>

          <button
            type="button"
            onClick={() => navigate('/pc/log')}
            className="px-3.5 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <ClipboardList className="w-3.5 h-3.5 text-[#1662F3]" />
            Full PC Log ({pcLogs.length})
          </button>
        </div>
      </div>

      {/* SECTION 1: PC APPROVALS QUEUE matching Screen 9 */}
      {activeSection === 'requests' && (
        <>
          {/* KPI Summary Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200/90 p-4 flex items-center gap-4 shadow-2xs">
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-bold text-slate-900 leading-none">
                  {waitingForPcRequests.length}
                </div>
                <div className="text-xs font-medium text-slate-500 mt-1">
                  Professor-Approved (Awaiting PC)
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/90 p-4 flex items-center gap-4 shadow-2xs">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-bold text-slate-900 leading-none">
                  {finalAuthorizedRequests.length}
                </div>
                <div className="text-xs font-medium text-slate-500 mt-1">
                  Final Access Authorized
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/90 p-4 flex items-center gap-4 shadow-2xs">
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#1662F3] flex items-center justify-center shrink-0">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-bold text-slate-900 leading-none">
                  {pcLogs.length}
                </div>
                <div className="text-xs font-medium text-slate-500 mt-1">
                  Auditable PC Log Events
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
            {/* Underline Tabs matching Screen 9: Waiting for PC Approval (2) | Approved | Logs */}
            <div className="px-5 pt-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-6 -mb-[1px]">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('waiting');
                    setSearchParams({ tab: 'waiting' });
                  }}
                  className={`pb-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                    activeTab === 'waiting'
                      ? 'border-[#1662F3] text-[#1662F3]'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Waiting for PC Approval ({waitingForPcRequests.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('approved');
                    setSearchParams({ tab: 'approved' });
                  }}
                  className={`pb-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                    activeTab === 'approved'
                      ? 'border-[#1662F3] text-[#1662F3]'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Approved ({finalAuthorizedRequests.length})
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/pc/log')}
                  className="pb-3 text-xs font-bold border-b-2 border-transparent text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  Logs
                </button>
              </div>

              <div className="pb-2.5 relative sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search ID, student, professor..."
                  aria-label="Search PC approval requests"
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#1662F3]"
                />
              </div>
            </div>

            {/* Table matching Screen 9 columns: #, Student, Project Title, Professor, Submitted, Action */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/50 text-xs font-bold text-slate-700">
                    <th className="py-3.5 pl-5 pr-3">#</th>
                    <th className="py-3.5 px-3">Student</th>
                    <th className="py-3.5 px-3">Project Title</th>
                    <th className="py-3.5 px-3">Professor</th>
                    <th className="py-3.5 px-3">Submitted</th>
                    <th className="py-3.5 pl-3 pr-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 text-[13px]">
                  {filteredRequests.map((req) => (
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
                        <div className="text-[11px] text-slate-500">
                          {req.printerName} • {req.material}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-slate-700 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          {req.assignedProfessorName || 'Prof. Weber'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-slate-600 whitespace-nowrap">
                        {req.submissionDateFormatted}
                      </td>
                      <td className="py-3.5 pl-3 pr-5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/pc/requests/${req.id}/review`)
                          }
                          className="px-4 py-1.5 rounded-lg bg-[#1662F3] hover:bg-[#1251D1] text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filteredRequests.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-10 text-center text-sm text-slate-500"
                      >
                        No requests in this queue.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* SECTION 2: PRINTER MANAGEMENT */}
      {activeSection === 'printers' && (
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Printer Inventory &amp; Availability Management
              </h2>
              <p className="text-xs text-slate-500">
                Update operational status or register new FDM printers in the SRH MakerLab.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setNewPrinterModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1662F3] hover:bg-[#1251D1] text-white text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Printer
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {printers.map((p) => (
              <div
                key={p.id}
                className="p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5">
                  <PrinterIllustration
                    printerKey={p.illustrationKey}
                    className="w-14 h-14"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-500">
                        {p.id}
                      </span>
                      <span className="text-sm font-bold text-slate-900">
                        {p.name}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {p.buildVolume} • {p.supportedMaterials.join(', ')}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                      Backend: {p.backendUrl}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <PrinterAvailabilityBadge status={p.availabilityStatus} />
                  <select
                    value={p.availabilityStatus}
                    onChange={(e) =>
                      updatePrinterStatus(
                        p.id,
                        e.target.value as PrinterAvailability
                      )
                    }
                    aria-label={`Change status for ${p.name}`}
                    className="px-2.5 py-1 rounded border border-slate-300 text-xs font-medium bg-white text-slate-700"
                  >
                    <option value="Available">Set Available</option>
                    <option value="In Use">Set In Use</option>
                    <option value="Maintenance">Set Maintenance</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 3: USER MANAGEMENT */}
      {activeSection === 'users' && (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-slate-200">
            <h2 className="text-base font-bold text-slate-900">
              University Users &amp; Role Scope
            </h2>
            <p className="text-xs text-slate-500">
              Manage active status for SRH Berlin Students, Professors, and PC Administrators.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-bold text-slate-700">
                  <th className="py-3 pl-5 pr-3">Name</th>
                  <th className="py-3 px-3">Email</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3">Department</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 pl-3 pr-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="py-3 pl-5 pr-3 font-bold text-slate-900">
                      {u.name}
                    </td>
                    <td className="py-3 px-3 text-slate-600">{u.email}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-[#1662F3] font-bold text-[11px]">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600">{u.department}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded font-semibold ${
                          u.active
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {u.active ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="py-3 pl-3 pr-5 text-right">
                      <button
                        type="button"
                        onClick={() => toggleUserActive(u.id)}
                        className="px-3 py-1 rounded border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer"
                      >
                        {u.active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Printer Modal */}
      {newPrinterModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleAddPrinterSubmit}
            className="bg-white rounded-xl border border-slate-200 p-6 max-w-md w-full space-y-4 shadow-xl"
          >
            <h3 className="text-base font-bold text-slate-900">
              Add FDM Printer to Inventory
            </h3>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Printer Name *
              </label>
              <input
                type="text"
                required
                value={newPrinterName}
                onChange={(e) => setNewPrinterName(e.target.value)}
                placeholder="e.g. Prusa XL"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Model Description
              </label>
              <input
                type="text"
                value={newPrinterModel}
                onChange={(e) => setNewPrinterModel(e.target.value)}
                placeholder="e.g. Original Prusa XL 5-Toolhead"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Build Volume
                </label>
                <input
                  type="text"
                  value={newPrinterVolume}
                  onChange={(e) => setNewPrinterVolume(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Demo Backend URL
                </label>
                <input
                  type="text"
                  value={newPrinterUrl}
                  onChange={(e) => setNewPrinterUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setNewPrinterModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[#1662F3] text-white text-xs font-semibold"
              >
                Save Printer
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
