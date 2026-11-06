import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ClipboardList,
  Printer as PrinterIcon,
  Users,
  ShieldAlert,
  Plus,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PrinterAvailabilityBadge } from '../components/StatusBadge';
import { PrinterIllustration } from '../components/PrinterIllustration';
import { MaintenanceInfo } from '../components/MaintenanceInfo';
import { Printer, PrinterAvailability, SupportedMaterial } from '../types/models';

type LabSection = 'printers' | 'users';

export const LabManagementPage: React.FC = () => {
  const {
    currentUser,
    pcLogs,
    printers,
    users,
    updatePrinterStatus,
    addPrinter,
    updatePrinterMaintenance,
    toggleUserActive,
    isLive,
    switchRoleUser,
    addToast,
  } = useApp();
  const navigate = useNavigate();
  const isApprover = currentUser?.role === 'PROFESSOR';
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeSection, setActiveSection] = useState<LabSection>(
    searchParams.get('section') === 'users' ? 'users' : 'printers'
  );
  const [maintPrinter, setMaintPrinter] = useState<Printer | null>(null);
  const [maintOn, setMaintOn] = useState('');
  const [maintBy, setMaintBy] = useState('');
  const [maintNotes, setMaintNotes] = useState('');
  const [maintError, setMaintError] = useState<string | null>(null);
  const [newPrinterModal, setNewPrinterModal] = useState(false);
  const [newPrinterName, setNewPrinterName] = useState('');
  const [newPrinterModel, setNewPrinterModel] = useState('');
  const [newPrinterVolume, setNewPrinterVolume] = useState('250 × 210 × 220 mm');
  const [newPrinterUrl, setNewPrinterUrl] = useState('http://192.168.1.40');

  useEffect(() => {
    setActiveSection(searchParams.get('section') === 'users' ? 'users' : 'printers');
  }, [searchParams]);

  const openMaintenance = (p: Printer) => {
    setMaintPrinter(p);
    setMaintOn(p.lastMaintainedOn || new Date().toLocaleDateString('en-CA'));
    setMaintBy(p.lastMaintainedBy || currentUser?.name || '');
    setMaintNotes(p.maintenanceNotes || '');
    setMaintError(null);
  };

  const handleMaintenanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!maintPrinter) return;
    const res = await updatePrinterMaintenance(maintPrinter.id, {
      on: maintOn,
      by: maintBy,
      notes: maintNotes,
    });
    if (!res.ok) {
      setMaintError(res.error || 'Could not save maintenance info.');
      return;
    }
    setMaintPrinter(null);
  };

  const handleAddPrinterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrinterName.trim()) return;
    const res = await addPrinter({
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
    if (!res.ok) {
      addToast('error', 'Could Not Add Printer', res.error || 'Please check the values and try again.');
      return;
    }
    setNewPrinterName('');
    setNewPrinterModel('');
    setNewPrinterModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Role Warning Banner if viewing as non-approver */}
      {currentUser?.role === 'STUDENT' && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              You are viewing Lab Management while signed in as{' '}
              <strong>
                {currentUser?.name} ({currentUser?.role})
              </strong>
              . Switch to Ajinkya Keskar or the Lab In-Charge to manage printers.
            </span>
          </div>
          {!isLive && (
          <button
            type="button"
            onClick={() => switchRoleUser('USR-PROF-01')}
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold cursor-pointer"
          >
            Switch to Ajinkya Keskar
          </button>
          )}
        </div>
      )}

      {/* Header & Section Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Lab Management
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage printers. The approver also manages user accounts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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

          {isApprover && (
            <>
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
            onClick={() => navigate('/professor/log')}
            className="px-3.5 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <ClipboardList className="w-3.5 h-3.5 text-[#1662F3]" />
            Audit Log ({pcLogs.length})
          </button>
            </>
          )}
        </div>
      </div>

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
                className="p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4"
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

                <div className="basis-full pt-3 border-t border-slate-100 flex items-start justify-between gap-3">
                  <MaintenanceInfo printer={p} />
                  {currentUser?.role !== 'STUDENT' && (
                    <button
                      type="button"
                      onClick={() => openMaintenance(p)}
                      className="shrink-0 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                    >
                      Edit maintenance
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 3: USER MANAGEMENT */}
      {activeSection === 'users' && isApprover && (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-slate-200">
            <h2 className="text-base font-bold text-slate-900">
              University Users &amp; Role Scope
            </h2>
            <p className="text-xs text-slate-500">
              Manage active status for SRH Berlin students and the approver.
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

      {/* Maintenance Modal */}
      {maintPrinter && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleMaintenanceSubmit}
            className="bg-white rounded-xl border border-slate-200 p-6 max-w-md w-full space-y-4 shadow-xl"
          >
            <h3 className="text-base font-bold text-slate-900">
              Maintenance — {maintPrinter.name}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-semibold text-slate-700">
                Last maintained on
                <input
                  type="date"
                  required
                  value={maintOn}
                  max={new Date().toLocaleDateString('en-CA')}
                  onChange={(e) => setMaintOn(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-700">
                Maintained by
                <input
                  type="text"
                  required
                  value={maintBy}
                  onChange={(e) => setMaintBy(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                />
              </label>
            </div>
            <label className="block text-xs font-semibold text-slate-700">
              Maintenance notes <span className="font-normal text-slate-500">(visible to students)</span>
              <textarea
                rows={4}
                value={maintNotes}
                onChange={(e) => setMaintNotes(e.target.value)}
                placeholder="What was done, what to watch for, next service due..."
                className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
              />
            </label>
            {maintError && (
              <p role="alert" className="text-xs font-medium text-red-700">
                {maintError}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setMaintPrinter(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[#1662F3] text-white text-xs font-semibold cursor-pointer"
              >
                Save
              </button>
            </div>
          </form>
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
