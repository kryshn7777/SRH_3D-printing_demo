import React from 'react';
import { RequestStatus, PrinterAvailability } from '../types/models';

interface StatusBadgeProps {
  status: RequestStatus;
  compact?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  compact = false,
}) => {
  switch (status) {
    case 'APPROVED_ACCESS_GRANTED':
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200/70">
          {compact ? 'Approved' : 'Approved'}
        </span>
      );
    case 'PENDING_PROFESSOR_APPROVAL':
    case 'SUBMITTED':
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200/70">
          {compact ? 'Pending' : 'Pending Professor Approval'}
        </span>
      );
    case 'PENDING_PC_APPROVAL':
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200/80">
          {compact ? 'Pending' : 'Waiting for PC Approval'}
        </span>
      );
    case 'CHANGES_REQUESTED':
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-200">
          Changes Requested
        </span>
      );
    case 'REJECTED_BY_PROFESSOR':
    case 'REJECTED_BY_PC':
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-red-100 text-red-700 border border-red-200/70">
          {compact ? 'Rejected' : status === 'REJECTED_BY_PC' ? 'Rejected by PC Admin' : 'Rejected'}
        </span>
      );
    case 'ACCESS_REVOKED':
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
          Access Revoked
        </span>
      );
    case 'DRAFT':
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          Draft
        </span>
      );
  }
};

export const PrinterAvailabilityBadge: React.FC<{
  status: PrinterAvailability;
}> = ({ status }) => {
  if (status === 'Available') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-100/90 text-emerald-700 border border-emerald-200/60">
        <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px] leading-none">
          ✓
        </span>
        Available
      </span>
    );
  }
  if (status === 'In Use') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-red-100/90 text-red-700 border border-red-200/60">
        <span className="w-3.5 h-3.5 rounded-full bg-red-600 text-white flex items-center justify-center text-[9px] leading-none">
          ✕
        </span>
        In Use
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
      <span className="w-2 h-2 rounded-full bg-amber-500" />
      Maintenance
    </span>
  );
};
