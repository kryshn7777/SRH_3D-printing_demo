import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Lock,
  Copy,
  Eye,
  EyeOff,
  Calendar,
  ShieldAlert,
  Terminal,
  ArrowLeft,
  ExternalLink,
  Play,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StatusBadge } from '../components/StatusBadge';
import { ApprovalTimeline } from '../components/ApprovalTimeline';

export const PrinterAccessPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { requests, accessGrants, printers, approvals, addToast } = useApp();

  const [showToken, setShowToken] = useState(false);
  const [simConnected, setSimConnected] = useState(false);
  const [simJobSent, setSimJobSent] = useState(false);

  const request = requests.find(
    (r) => r.id.toLowerCase() === (id || '').toLowerCase()
  );

  if (!request) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-3">
        <ShieldAlert className="w-8 h-8 text-amber-500 mx-auto" />
        <h1 className="text-lg font-bold text-slate-900">
          Request #{id} Not Found
        </h1>
        <p className="text-xs text-slate-500">
          Please check the Request ID or return to My Requests.
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

  const isAuthorized = request.currentStatus === 'APPROVED_ACCESS_GRANTED';
  const printer =
    printers.find((p) => p.id === request.printerId) || printers[1];
  const grant = accessGrants.find((g) => g.requestId === request.id);

  const backendUrl = grant?.backendUrl || printer.backendUrl || 'http://192.168.1.25';
  const demoUsername =
    grant?.demoUsername ||
    `student_${request.id.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
  const demoPlain =
    grant?.demoTokenPlain || `SRH-${printer.id}-${request.id}-DEMO`;
  const validUntil = grant?.expiryTimestampFormatted || '18 Oct 2024, 23:59';

  const copyValue = (label: string, val: string) => {
    navigator.clipboard?.writeText(val).catch(() => {});
    addToast('info', 'Copied to Clipboard', `${label} copied.`);
  };

  // GATED STATE: When request has NOT passed both required approval stages
  if (!isAuthorized) {
    return (
      <div className="max-w-4xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(`/student/requests/${request.id}`)}
              className="p-2 rounded-lg hover:bg-slate-200/70 text-slate-700 cursor-pointer"
              aria-label="Back to Request Details"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Printer Access — #{request.id}
            </h1>
          </div>
          <StatusBadge status={request.currentStatus} />
        </div>

        <div
          role="alert"
          className="bg-white rounded-xl border border-amber-300 p-6 shadow-2xs space-y-4"
        >
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {request.currentStatus === 'ACCESS_REVOKED'
                  ? 'Access Revoked by PC Administrator'
                  : 'Access Not Yet Available'}
              </h2>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Printer login credentials and backend connection endpoints are strictly locked until Request{' '}
                <strong>#{request.id} ({request.projectTitle})</strong> has completed both{' '}
                <strong> Stage 2 (Professor Approval)</strong> and{' '}
                <strong>Stage 3 (PC Administrator Final Authorization)</strong>.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <ApprovalTimeline request={request} approvals={approvals} />
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate(`/student/requests/${request.id}`)}
              className="px-4 py-2 rounded-lg bg-[#1662F3] hover:bg-[#1251D1] text-white text-xs font-semibold cursor-pointer"
            >
              View Request Status &amp; Timeline
            </button>
          </div>
        </div>
      </div>
    );
  }

  // AUTHORIZED STATE matching Screen 12 in the reference image
  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(`/student/requests/${request.id}`)}
            className="p-2 rounded-lg hover:bg-slate-200/70 text-slate-700 transition-colors cursor-pointer"
            aria-label="Back to Request Details"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Printer Access
            </h1>
            <p className="text-xs text-slate-500">
              Authorized credentials for Request #{request.id} — {request.projectTitle}
            </p>
          </div>
        </div>

        <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-[#1662F3] border border-blue-200">
          Demo Placeholder Connection
        </span>
      </div>

      {/* Green Banner matching Screen 12 */}
      <div className="rounded-xl bg-emerald-50 border border-emerald-200/90 p-4 flex items-center gap-3.5 shadow-2xs">
        <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-emerald-950">
            Access Granted!
          </h2>
          <p className="text-xs text-emerald-800 mt-0.5">
            You can now log in to the printer backend.
          </p>
        </div>
      </div>

      {/* Main Two-Column Layout matching Screen 12 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left: Printer Login Details (7 cols) */}
        <section className="lg:col-span-7 bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Printer Login Details
              </h3>
              <span className="text-[11px] font-mono text-slate-500">
                Request #{request.id}
              </span>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-3 flex items-center justify-between gap-4">
                <span className="text-slate-500 font-medium">Printer</span>
                <span className="font-bold text-slate-900">
                  {printer.name} ({printer.id})
                </span>
              </div>

              <div className="py-3 flex items-center justify-between gap-4">
                <span className="text-slate-500 font-medium">Backend URL</span>
                <div className="flex items-center gap-2">
                  <code className="font-mono font-semibold text-[#1662F3] bg-blue-50 px-2 py-0.5 rounded">
                    {backendUrl}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyValue('Backend URL', backendUrl)}
                    className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 cursor-pointer"
                    aria-label="Copy Backend URL"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="py-3 flex items-center justify-between gap-4">
                <span className="text-slate-500 font-medium">Username</span>
                <div className="flex items-center gap-2">
                  <code className="font-mono font-semibold text-slate-900">
                    {demoUsername}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyValue('Username', demoUsername)}
                    className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 cursor-pointer"
                    aria-label="Copy Username"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="py-3 flex items-center justify-between gap-4">
                <span className="text-slate-500 font-medium">
                  Password (Demo Token)
                </span>
                <div className="flex items-center gap-1.5">
                  <code className="font-mono font-semibold text-slate-900">
                    {showToken ? demoPlain : '••••••••••'}
                  </code>
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 cursor-pointer"
                    aria-label={showToken ? 'Hide token' : 'Reveal demo token'}
                  >
                    {showToken ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => copyValue('Demo Password Token', demoPlain)}
                    className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 cursor-pointer"
                    aria-label="Copy Password"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Simulated Printer Backend Panel */}
          <div className="pt-3 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-[#1662F3]" />
                Simulated Printer Web Interface (Demo Mode)
              </span>
              <button
                type="button"
                onClick={() => setSimConnected(!simConnected)}
                className="px-3 py-1.5 rounded-lg bg-[#1662F3] hover:bg-[#1251D1] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-3 h-3" />
                {simConnected
                  ? 'Disconnect Simulated Session'
                  : 'Connect to Simulated Printer'}
              </button>
            </div>

            {simConnected && (
              <div className="p-3.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs space-y-2">
                <div className="flex items-center justify-between text-emerald-400">
                  <span>● CONNECTED TO {printer.name.toUpperCase()} ({backendUrl})</span>
                  <span>STATE: OPERATIONAL</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-300 pt-1">
                  <div>Nozzle: 215 °C / 215 °C</div>
                  <div>Bed: 60 °C / 60 °C</div>
                  <div>Spool: {request.material} Loaded</div>
                </div>
                <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                  <span className="text-[11px] text-slate-400">
                    File: {request.attachment.fileName}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSimJobSent(true);
                      addToast(
                        'success',
                        'Simulated Print Job Started',
                        `${request.attachment.fileName} queued on ${printer.name}.`
                      );
                    }}
                    className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-sans font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Play className="w-3 h-3" />
                    {simJobSent ? 'Printing (Layer 1/240)...' : 'Start Simulated Print'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Right: Access Valid Until & Important Notes matching Screen 12 (5 cols) */}
        <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
          {/* Soft Blue Validity Card */}
          <section className="rounded-xl bg-[#EBF2FF] border border-blue-200/90 p-5 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white text-[#1662F3] flex items-center justify-center shrink-0 shadow-2xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-[#1662F3] block">
                Access Valid Until
              </span>
              <span className="text-base font-extrabold text-[#0F172A] mt-0.5 block">
                {validUntil}
              </span>
            </div>
          </section>

          {/* Important Notes & Usage Guidelines */}
          <section className="flex-1 bg-white rounded-xl border border-slate-200/90 p-5 shadow-2xs space-y-3 text-xs">
            <h3 className="text-sm font-bold text-slate-900">
              Important Notes &amp; Usage Guidelines
            </h3>

            <ol className="list-decimal pl-4 space-y-1.5 text-slate-600 leading-relaxed">
              <li>
                Connect to the <strong>SRH-MakerLab-VLAN</strong> campus network before opening{' '}
                <code className="font-mono text-slate-800">{backendUrl}</code>.
              </li>
              <li>
                Verify that <strong>{request.material}</strong> filament is loaded and the build plate is clean and clear of previous prints.
              </li>
              <li>
                Remain in Room 104 during the first 15 minutes of extrusion to verify first-layer adhesion.
              </li>
              <li>
                Do not share your temporary session credentials. Access automatically expires on{' '}
                <strong>{validUntil}</strong>.
              </li>
            </ol>

            <div className="pt-2 border-t border-slate-100">
              <span className="font-bold text-slate-800 block mb-1">
                Printer-Specific Restrictions ({printer.name}):
              </span>
              <ul className="list-disc pl-4 space-y-1 text-slate-500">
                {printer.usageRestrictions.map((r, idx) => (
                  <li key={idx}>{r}</li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
