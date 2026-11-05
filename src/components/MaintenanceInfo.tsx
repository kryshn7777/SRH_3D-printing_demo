import React from 'react';
import { Wrench } from 'lucide-react';
import { Printer } from '../types/models';

export function formatMaintenanceDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Read-only maintenance summary, shown to students and staff alike
export const MaintenanceInfo: React.FC<{ printer: Printer }> = ({ printer }) => (
  <div className="text-xs text-slate-600 min-w-0">
    <div className="font-semibold text-slate-800 inline-flex items-center gap-1.5">
      <Wrench className="w-3.5 h-3.5 text-slate-500" />
      {printer.lastMaintainedOn
        ? `Last maintained ${formatMaintenanceDate(printer.lastMaintainedOn)} by ${
            printer.lastMaintainedBy || 'unknown'
          }`
        : 'No maintenance recorded yet'}
    </div>
    {printer.maintenanceNotes && (
      <p className="mt-1 leading-relaxed whitespace-pre-line">{printer.maintenanceNotes}</p>
    )}
  </div>
);
