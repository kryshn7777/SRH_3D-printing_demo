import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  Printer,
  PrintRequest,
  Approval,
  PCLogEntry,
  AccessGrant,
  RequestStatus,
  SupportedMaterial,
  PrinterAvailability,
  AttachmentMetadata,
  ApprovalContact,
} from '../types/models';
import {
  SEED_USERS,
  SEED_PRINTERS,
  SEED_REQUESTS,
  SEED_APPROVALS,
  SEED_PC_LOGS,
  SEED_ACCESS_GRANTS,
} from '../data/seedData';
import { sendMail, signOutMicrosoft } from '../utils/msalAuth';

const STORAGE_KEYS = {
  CURRENT_USER_ID: 'srh_3dp_current_user_id_v4',
  USERS: 'srh_3dp_users_v4',
  PRINTERS: 'srh_3dp_printers_v4',
  REQUESTS: 'srh_3dp_requests_v4',
  APPROVALS: 'srh_3dp_approvals_v4',
  PC_LOGS: 'srh_3dp_pc_logs_v4',
  ACCESS_GRANTS: 'srh_3dp_access_grants_v4',
};

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
}

export interface CreateRequestPayload {
  matriculationNumber: string;
  projectTitle: string;
  courseOrDepartment: string;
  intendedUse: string;
  contactedApprover: ApprovalContact;
  printerId: string;
  material: SupportedMaterial;
  quantity: number;
  attachment: AttachmentMetadata;
  saveAsDraft?: boolean;
  existingDraftId?: string;
}

interface ServiceResult<T = void> {
  ok: boolean;
  error?: string;
  data?: T;
}

interface AppContextValue {
  currentUser: User | null;
  users: User[];
  printers: Printer[];
  requests: PrintRequest[];
  approvals: Approval[];
  pcLogs: PCLogEntry[];
  accessGrants: AccessGrant[];
  toasts: ToastNotification[];
  loginByEmail: (email: string, password?: string) => ServiceResult<User>;
  loginWithMicrosoft: (email: string, name: string) => ServiceResult<User>;
  switchRoleUser: (userId: string) => void;
  logout: () => void;
  addToast: (type: ToastNotification['type'], title: string, message: string) => void;
  dismissToast: (id: string) => void;
  createOrSubmitRequest: (payload: CreateRequestPayload) => ServiceResult<PrintRequest>;
  submitDraftRequest: (requestId: string) => ServiceResult<PrintRequest>;
  professorReviewRequest: (
    requestId: string,
    decision: 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED',
    comments: string
  ) => ServiceResult<PrintRequest>;
  pcFinalReviewRequest: (
    requestId: string,
    decision: 'APPROVED' | 'REJECTED',
    notes: string,
    assignedPrinterId?: string,
    validUntilFormatted?: string
  ) => ServiceResult<PrintRequest>;
  revokePrinterAccess: (requestId: string, reason: string) => ServiceResult<void>;
  updatePrinterStatus: (
    printerId: string,
    availabilityStatus: PrinterAvailability
  ) => ServiceResult<void>;
  addPrinter: (newPrinter: Omit<Printer, 'id'>) => ServiceResult<Printer>;
  toggleUserActive: (userId: string) => ServiceResult<void>;
  resetDemoData: () => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function formatNowDate(): { dateShort: string; dateTime: string; iso: string } {
  const now = new Date();
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const day = String(now.getDate()).padStart(2, '0');
  const month = months[now.getMonth()];
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');
  return {
    dateShort: `${day} ${month} ${year}`,
    dateTime: `${day} ${month} ${year}, ${hours}:${mins}`,
    iso: now.toISOString(),
  };
}

// Enforce valid state machine transitions
const VALID_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  DRAFT: ['SUBMITTED', 'PENDING_PROFESSOR_APPROVAL'],
  SUBMITTED: ['PENDING_PROFESSOR_APPROVAL'],
  PENDING_PROFESSOR_APPROVAL: [
    'PENDING_PC_APPROVAL',
    'REJECTED_BY_PROFESSOR',
    'CHANGES_REQUESTED',
  ],
  CHANGES_REQUESTED: ['PENDING_PROFESSOR_APPROVAL', 'SUBMITTED'],
  REJECTED_BY_PROFESSOR: [],
  PENDING_PC_APPROVAL: ['APPROVED_ACCESS_GRANTED', 'REJECTED_BY_PC'],
  REJECTED_BY_PC: [],
  APPROVED_ACCESS_GRANTED: ['ACCESS_REVOKED'],
  ACCESS_REVOKED: [],
};

export function canTransition(from: RequestStatus, to: RequestStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() =>
    loadFromStorage(STORAGE_KEYS.USERS, SEED_USERS)
  );
  const [printers, setPrinters] = useState<Printer[]>(() =>
    loadFromStorage(STORAGE_KEYS.PRINTERS, SEED_PRINTERS)
  );
  const [requests, setRequests] = useState<PrintRequest[]>(() =>
    loadFromStorage(STORAGE_KEYS.REQUESTS, SEED_REQUESTS)
  );
  const [approvals, setApprovals] = useState<Approval[]>(() =>
    loadFromStorage(STORAGE_KEYS.APPROVALS, SEED_APPROVALS)
  );
  const [pcLogs, setPcLogs] = useState<PCLogEntry[]>(() =>
    loadFromStorage(STORAGE_KEYS.PC_LOGS, SEED_PC_LOGS)
  );
  const [accessGrants, setAccessGrants] = useState<AccessGrant[]>(() =>
    loadFromStorage(STORAGE_KEYS.ACCESS_GRANTS, SEED_ACCESS_GRANTS)
  );
  const [currentUserId, setCurrentUserId] = useState<string | null>(() =>
    loadFromStorage<string | null>(STORAGE_KEYS.CURRENT_USER_ID, 'USR-STU-01')
  );
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    } catch {
      // ignore storage quota errors
    }
  }, [users]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PRINTERS, JSON.stringify(printers));
    } catch {
      // ignore
    }
  }, [printers]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(requests));
    } catch {
      // ignore
    }
  }, [requests]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.APPROVALS, JSON.stringify(approvals));
    } catch {
      // ignore
    }
  }, [approvals]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PC_LOGS, JSON.stringify(pcLogs));
    } catch {
      // ignore
    }
  }, [pcLogs]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ACCESS_GRANTS, JSON.stringify(accessGrants));
    } catch {
      // ignore
    }
  }, [accessGrants]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, JSON.stringify(currentUserId));
    } catch {
      // ignore
    }
  }, [currentUserId]);

  const currentUser = users.find((u) => u.id === currentUserId) ?? null;

  const addToast = (
    type: ToastNotification['type'],
    title: string,
    message: string
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const loginByEmail = (email: string, password?: string): ServiceResult<User> => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      return { ok: false, error: 'Please enter your SRH Berlin email address.' };
    }
    if (!trimmed.endsWith('@srh-berlin.de') && !trimmed.endsWith('@srh.de')) {
      return {
        ok: false,
        error: 'Please use a valid university email (@srh-berlin.de).',
      };
    }
    if (password !== undefined && password.trim().length < 4) {
      return {
        ok: false,
        error: 'Password must be at least 4 characters.',
      };
    }

    const matched = users.find((u) => u.email.toLowerCase() === trimmed);
    if (!matched) {
      return {
        ok: false,
        error:
          'No SRH account found for that email. Try anna.mueller@srh-berlin.de, ajinkya.keskar@srh-berlin.de, or pc.admin@srh-berlin.de.',
      };
    }
    if (!matched.active) {
      return {
        ok: false,
        error: 'This account is currently deactivated. Contact the PC Administrator.',
      };
    }

    setCurrentUserId(matched.id);
    addToast('success', 'Signed In', `Welcome back, ${matched.name}!`);
    return { ok: true, data: matched };
  };

  // Identity already verified by Microsoft Entra ID; unknown accounts join as students
  const loginWithMicrosoft = (email: string, name: string): ServiceResult<User> => {
    const trimmed = email.trim().toLowerCase();
    let matched = users.find((u) => u.email.toLowerCase() === trimmed);
    if (matched && !matched.active) {
      void signOutMicrosoft();
      return {
        ok: false,
        error: 'This account is currently deactivated. Contact the PC Administrator.',
      };
    }
    if (!matched) {
      matched = {
        id: `USR-STU-${Date.now()}`,
        name,
        email: trimmed,
        role: 'STUDENT',
        department: '',
        active: true,
        avatarRoleColor: '#1662F3',
        title: 'Student',
      };
      const newUser = matched;
      setUsers((prev) => [...prev, newUser]);
    }

    setCurrentUserId(matched.id);
    addToast('success', 'Signed In', `Welcome, ${matched.name}!`);
    return { ok: true, data: matched };
  };

  const switchRoleUser = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (target) {
      setCurrentUserId(target.id);
      addToast(
        'info',
        `Switched Demo Role: ${target.role.replace('_', ' ')}`,
        `Now viewing system as ${target.name} (${target.email})`
      );
    }
  };

  const logout = () => {
    void signOutMicrosoft();
    setCurrentUserId(null);
    addToast('info', 'Signed Out', 'You have logged out of the SRH 3D Printing System.');
  };

  const generateNextRequestId = (): string => {
    const existingNums = requests
      .map((r) => {
        const match = r.id.match(/PR-(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((n) => !Number.isNaN(n));
    const maxNum = existingNums.length > 0 ? Math.max(...existingNums) : 7;
    const nextNum = maxNum + 1;
    return `PR-${String(nextNum).padStart(3, '0')}`;
  };

  // Requests live in the student's browser, so this email is how the approver learns of them.
  // Fire-and-forget: a mail failure must never block the submission itself.
  const notifyApprover = (req: PrintRequest) => {
    const to = users.find((u) => u.name === req.contactedApprover)?.email;
    if (!to) return;
    const text = [
      `New 3D print request #${req.id} submitted for your approval.`,
      '',
      `1. Full Name: ${req.studentName}`,
      `2. Matriculation Number: ${req.matriculationNumber || '—'}`,
      `3. University Mail: ${req.studentEmail}`,
      `4. Course/Department: ${req.courseOrDepartment}`,
      `5. Print Item & Quantity: ${req.projectTitle} × ${req.quantity}`,
      `6. Intended Use: ${req.intendedUse}`,
      `7. Contacted for approval/support: ${req.contactedApprover}`,
      `8. 3D Printer: ${req.printerName}`,
      `9. Filament: ${req.material}`,
      '',
      `3D model: ${req.attachment.fileName} (${req.attachment.fileSizeFormatted})`,
      `Submitted: ${req.submissionDateTimeFormatted}`,
    ].join('\n');
    sendMail(req.studentEmail, to, `3D print request #${req.id}: ${req.projectTitle} (${req.studentName})`, text)
      .then((sent) => {
        if (sent) addToast('info', 'Email Sent', `${req.contactedApprover} was notified via Outlook.`);
      })
      .catch((err: Error) =>
        addToast('warning', 'Email Not Sent', `Request saved, but notifying ${req.contactedApprover} failed: ${err.message}`)
      );
  };

  const createOrSubmitRequest = (
    payload: CreateRequestPayload
  ): ServiceResult<PrintRequest> => {
    if (!currentUser) {
      return { ok: false, error: 'You must be logged in to submit a request.' };
    }
    if (currentUser.role !== 'STUDENT') {
      return {
        ok: false,
        error: 'Only students can submit new 3D printing requests.',
      };
    }

    const printer = printers.find((p) => p.id === payload.printerId);
    if (!printer) {
      return { ok: false, error: 'Please select a valid printer.' };
    }
    if (!printer.supportedMaterials.includes(payload.material)) {
      return {
        ok: false,
        error: `${printer.name} does not support ${payload.material}. Supported: ${printer.supportedMaterials.join(', ')}.`,
      };
    }

    const { dateShort, dateTime, iso } = formatNowDate();
    const isDraft = Boolean(payload.saveAsDraft);
    const targetStatus: RequestStatus = isDraft
      ? 'DRAFT'
      : 'PENDING_PROFESSOR_APPROVAL';

    const requestId = payload.existingDraftId || generateNextRequestId();
    const approver = users.find((u) => u.name === payload.contactedApprover);
    const approverName = payload.contactedApprover;

    const newRequest: PrintRequest = {
      id: requestId,
      studentId: currentUser.id,
      studentName: currentUser.name,
      studentEmail: currentUser.email,
      matriculationNumber: payload.matriculationNumber.trim(),
      projectTitle: payload.projectTitle.trim(),
      courseOrDepartment: payload.courseOrDepartment.trim(),
      intendedUse: payload.intendedUse.trim(),
      contactedApprover: payload.contactedApprover,
      printerId: printer.id,
      printerName: printer.name,
      material: payload.material,
      quantity: payload.quantity,
      attachment: {
        ...payload.attachment,
        uploadedAt: dateTime,
      },
      submissionTimestamp: iso,
      submissionDateFormatted: dateShort,
      submissionDateTimeFormatted: dateTime,
      currentStatus: targetStatus,
      assignedProfessorName: approverName,
      assignedProfessorId: approver?.id,
    };

    setRequests((prev) => {
      const exists = prev.some((r) => r.id === requestId);
      if (exists) {
        return prev.map((r) => (r.id === requestId ? newRequest : r));
      }
      return [newRequest, ...prev];
    });

    if (!isDraft) {
      const newLog: PCLogEntry = {
        id: `LOG-${Date.now()}`,
        requestId: newRequest.id,
        studentName: newRequest.studentName,
        projectTitle: newRequest.projectTitle,
        printerName: newRequest.printerName,
        printerId: newRequest.printerId,
        material: newRequest.material,
        professorApprovalSummary: `Pending ${approverName}`,
        pcAdminDecisionSummary: 'Awaiting Professor Stage',
        action: 'REQUEST_SUBMITTED',
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: currentUser.role,
        timestamp: iso,
        timestampFormatted: dateTime,
        currentStatus: 'PENDING_PROFESSOR_APPROVAL',
        notes: `Submitted request with 3D model ${newRequest.attachment.fileName} (${newRequest.attachment.fileSizeFormatted}).`,
      };
      setPcLogs((prev) => [newLog, ...prev]);
      addToast(
        'success',
        `Request #${newRequest.id} Submitted`,
        `Your request has been routed to ${approverName} for approval.`
      );
      notifyApprover(newRequest);
    } else {
      addToast(
        'info',
        `Draft #${newRequest.id} Saved`,
        'Your draft request has been saved to My Requests.'
      );
    }

    return { ok: true, data: newRequest };
  };

  const submitDraftRequest = (requestId: string): ServiceResult<PrintRequest> => {
    if (!currentUser || currentUser.role !== 'STUDENT') {
      return { ok: false, error: 'Only the student owner can submit a draft.' };
    }
    const existing = requests.find((r) => r.id === requestId);
    if (!existing) {
      return { ok: false, error: 'Request not found.' };
    }
    if (existing.studentId !== currentUser.id) {
      return { ok: false, error: 'You can only submit your own requests.' };
    }
    if (
      existing.currentStatus !== 'DRAFT' &&
      existing.currentStatus !== 'CHANGES_REQUESTED'
    ) {
      return { ok: false, error: 'Only draft or change-requested items can be submitted.' };
    }

    const { dateShort, dateTime, iso } = formatNowDate();
    const updated: PrintRequest = {
      ...existing,
      currentStatus: 'PENDING_PROFESSOR_APPROVAL',
      submissionTimestamp: iso,
      submissionDateFormatted: dateShort,
      submissionDateTimeFormatted: dateTime,
    };

    setRequests((prev) => prev.map((r) => (r.id === requestId ? updated : r)));

    const newLog: PCLogEntry = {
      id: `LOG-${Date.now()}`,
      requestId: updated.id,
      studentName: updated.studentName,
      projectTitle: updated.projectTitle,
      printerName: updated.printerName,
      printerId: updated.printerId,
      material: updated.material,
      professorApprovalSummary: `Pending ${updated.assignedProfessorName}`,
      pcAdminDecisionSummary: 'Awaiting Professor Stage',
      action: 'REQUEST_SUBMITTED',
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      timestamp: iso,
      timestampFormatted: dateTime,
      currentStatus: 'PENDING_PROFESSOR_APPROVAL',
      notes: 'Student submitted request for professor review.',
    };
    setPcLogs((prev) => [newLog, ...prev]);
    addToast(
      'success',
      `Request #${updated.id} Submitted`,
      'Sent to Professor for academic review.'
    );
    notifyApprover(updated);
    return { ok: true, data: updated };
  };

  const professorReviewRequest = (
    requestId: string,
    decision: 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED',
    comments: string
  ): ServiceResult<PrintRequest> => {
    if (!currentUser || currentUser.role !== 'PROFESSOR') {
      return {
        ok: false,
        error: 'Unauthorized: Only a Professor can perform academic review.',
      };
    }

    const req = requests.find((r) => r.id === requestId);
    if (!req) {
      return { ok: false, error: 'Request not found.' };
    }

    // Scope check
    if (
      currentUser.assignedDepartments &&
      !currentUser.assignedDepartments.includes(req.courseOrDepartment)
    ) {
      return {
        ok: false,
        error: `Out of scope: You are not assigned to review requests for ${req.courseOrDepartment}.`,
      };
    }

    if (
      req.contactedApprover !== currentUser.name
    ) {
      return {
        ok: false,
        error: `Out of scope: Request #${req.id} was sent to ${req.contactedApprover} for approval.`,
      };
    }

    if (req.currentStatus !== 'PENDING_PROFESSOR_APPROVAL') {
      return {
        ok: false,
        error: `Invalid state transition: Request #${req.id} is currently ${req.currentStatus} and cannot be reviewed by a professor again.`,
      };
    }

    if (
      (decision === 'REJECTED' || decision === 'CHANGES_REQUESTED') &&
      !comments.trim()
    ) {
      return {
        ok: false,
        error: 'Please provide a clear academic reason in the comments field when rejecting or requesting changes.',
      };
    }

    const nextStatus: RequestStatus =
      decision === 'APPROVED'
        ? 'PENDING_PC_APPROVAL'
        : decision === 'REJECTED'
        ? 'REJECTED_BY_PROFESSOR'
        : 'CHANGES_REQUESTED';

    if (!canTransition(req.currentStatus, nextStatus)) {
      return {
        ok: false,
        error: `State transition from ${req.currentStatus} to ${nextStatus} is not allowed.`,
      };
    }

    const { dateShort, dateTime, iso } = formatNowDate();
    const finalComments =
      comments.trim() ||
      'Approved for academic project. Suitable material and printer.';

    const approvalEntry: Approval = {
      id: `APR-${Date.now()}`,
      requestId: req.id,
      reviewerId: currentUser.id,
      reviewerName: currentUser.name,
      reviewerRole: 'PROFESSOR',
      decision,
      comments: finalComments,
      timestamp: iso,
      timestampFormatted: dateTime,
    };

    const updatedRequest: PrintRequest = {
      ...req,
      currentStatus: nextStatus,
      assignedProfessorId: currentUser.id,
      assignedProfessorName: currentUser.name,
    };

    setApprovals((prev) => [approvalEntry, ...prev]);
    setRequests((prev) =>
      prev.map((r) => (r.id === requestId ? updatedRequest : r))
    );

    const logAction =
      decision === 'APPROVED'
        ? 'PROFESSOR_APPROVED'
        : decision === 'REJECTED'
        ? 'PROFESSOR_REJECTED'
        : 'PROFESSOR_REQUESTED_CHANGES';

    const logEntry: PCLogEntry = {
      id: `LOG-${Date.now()}`,
      requestId: req.id,
      studentName: req.studentName,
      projectTitle: req.projectTitle,
      printerName: req.printerName,
      printerId: req.printerId,
      material: req.material,
      professorApprovalSummary: `${
        decision === 'APPROVED'
          ? 'Approved'
          : decision === 'REJECTED'
          ? 'Rejected'
          : 'Changes Requested'
      } by ${currentUser.name} (${dateShort})`,
      pcAdminDecisionSummary:
        decision === 'APPROVED' ? 'Pending PC Review' : 'Closed at Professor Stage',
      action: logAction,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: 'PROFESSOR',
      timestamp: iso,
      timestampFormatted: dateTime,
      currentStatus: nextStatus,
      notes: finalComments,
    };

    setPcLogs((prev) => [logEntry, ...prev]);

    if (decision === 'APPROVED') {
      addToast(
        'success',
        `Request #${req.id} Approved by Professor`,
        'Forwarded to PC Administrator queue for final authorization.'
      );
    } else if (decision === 'REJECTED') {
      addToast(
        'warning',
        `Request #${req.id} Rejected`,
        'The student has been notified with your review feedback.'
      );
    } else {
      addToast(
        'info',
        `Changes Requested on #${req.id}`,
        'Returned to student for revision.'
      );
    }

    return { ok: true, data: updatedRequest };
  };

  const pcFinalReviewRequest = (
    requestId: string,
    decision: 'APPROVED' | 'REJECTED',
    notes: string,
    assignedPrinterId?: string,
    validUntilFormatted?: string
  ): ServiceResult<PrintRequest> => {
    if (!currentUser || currentUser.role !== 'PC_ADMIN') {
      return {
        ok: false,
        error: 'Unauthorized: Only a PC Administrator can grant final printer authorization.',
      };
    }

    const req = requests.find((r) => r.id === requestId);
    if (!req) {
      return { ok: false, error: 'Request not found.' };
    }

    if (req.currentStatus !== 'PENDING_PC_APPROVAL') {
      return {
        ok: false,
        error: `Cannot perform PC final approval: Request #${req.id} is in state ${req.currentStatus} (must pass Professor approval first and not be already processed).`,
      };
    }

    if (decision === 'REJECTED' && !notes.trim()) {
      return {
        ok: false,
        error: 'A log note / rejection reason is required when rejecting a request.',
      };
    }

    const nextStatus: RequestStatus =
      decision === 'APPROVED' ? 'APPROVED_ACCESS_GRANTED' : 'REJECTED_BY_PC';

    if (!canTransition(req.currentStatus, nextStatus)) {
      return {
        ok: false,
        error: `Invalid transition from ${req.currentStatus} to ${nextStatus}.`,
      };
    }

    const targetPrinter =
      printers.find((p) => p.id === (assignedPrinterId || req.printerId)) ||
      printers.find((p) => p.id === req.printerId)!;

    const { dateShort, dateTime, iso } = formatNowDate();
    const finalNotes =
      notes.trim() ||
      `Authorized on ${targetPrinter.name} (${targetPrinter.id}). Access credentials granted.`;

    const profApproval = approvals.find(
      (a) => a.requestId === req.id && a.reviewerRole === 'PROFESSOR' && a.decision === 'APPROVED'
    );

    const approvalEntry: Approval = {
      id: `APR-${Date.now()}`,
      requestId: req.id,
      reviewerId: currentUser.id,
      reviewerName: currentUser.name,
      reviewerRole: 'PC_ADMIN',
      decision,
      comments: finalNotes,
      timestamp: iso,
      timestampFormatted: dateTime,
    };

    const updatedRequest: PrintRequest = {
      ...req,
      printerId: targetPrinter.id,
      printerName: targetPrinter.name,
      currentStatus: nextStatus,
    };

    setApprovals((prev) => [approvalEntry, ...prev]);
    setRequests((prev) =>
      prev.map((r) => (r.id === requestId ? updatedRequest : r))
    );

    const logEntry: PCLogEntry = {
      id: `LOG-${Date.now()}`,
      requestId: req.id,
      studentName: req.studentName,
      projectTitle: req.projectTitle,
      printerName: targetPrinter.name,
      printerId: targetPrinter.id,
      material: req.material,
      professorApprovalSummary: profApproval
        ? `Approved by ${profApproval.reviewerName}`
        : `Approved by ${req.assignedProfessorName || 'Ajinkya Keskar'}`,
      pcAdminDecisionSummary:
        decision === 'APPROVED'
          ? `Authorized by ${currentUser.name} (${dateShort})`
          : `Rejected by ${currentUser.name} (${dateShort})`,
      action: decision === 'APPROVED' ? 'PC_FINAL_APPROVED' : 'PC_FINAL_REJECTED',
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: 'PC_ADMIN',
      timestamp: iso,
      timestampFormatted: dateTime,
      currentStatus: nextStatus,
      notes: finalNotes,
    };

    setPcLogs((prev) => [logEntry, ...prev]);

    if (decision === 'APPROVED') {
      const cleanId = req.id.toLowerCase().replace(/[^a-z0-9]/g, '');
      const grant: AccessGrant = {
        id: `ACC-${Date.now()}`,
        requestId: req.id,
        printerId: targetPrinter.id,
        printerName: `${targetPrinter.name} (${targetPrinter.id})`,
        backendUrl: targetPrinter.backendUrl,
        demoUsername: `student_${cleanId}`,
        demoTokenMasked: '••••••••••',
        demoTokenPlain: `SRH-${targetPrinter.id}-${req.id}-DEMO`,
        grantedBy: currentUser.id,
        grantedByName: currentUser.name,
        grantTimestamp: iso,
        grantTimestampFormatted: dateTime,
        expiryTimestamp: new Date(Date.now() + 7 * 86400000).toISOString(),
        expiryTimestampFormatted: validUntilFormatted || '18 Oct 2024, 23:59',
      };
      setAccessGrants((prev) => [
        grant,
        ...prev.filter((g) => g.requestId !== req.id),
      ]);

      addToast(
        'success',
        `Access Granted for #${req.id}`,
        `PC Log entry recorded and printer access unlocked for ${req.studentName}.`
      );
    } else {
      addToast(
        'warning',
        `Request #${req.id} Rejected by PC Admin`,
        'Audit entry recorded in PC Log.'
      );
    }

    return { ok: true, data: updatedRequest };
  };

  const revokePrinterAccess = (
    requestId: string,
    reason: string
  ): ServiceResult<void> => {
    if (!currentUser || currentUser.role !== 'PC_ADMIN') {
      return { ok: false, error: 'Only PC Administrator can revoke printer access.' };
    }
    const req = requests.find((r) => r.id === requestId);
    if (!req || req.currentStatus !== 'APPROVED_ACCESS_GRANTED') {
      return { ok: false, error: 'Request does not currently have active access.' };
    }
    if (!reason.trim()) {
      return { ok: false, error: 'Please specify a reason for revoking access.' };
    }

    const { dateShort, dateTime, iso } = formatNowDate();

    setRequests((prev) =>
      prev.map((r) =>
        r.id === requestId ? { ...r, currentStatus: 'ACCESS_REVOKED' } : r
      )
    );
    setAccessGrants((prev) =>
      prev.map((g) =>
        g.requestId === requestId
          ? { ...g, revokedTimestamp: dateTime, revokedReason: reason.trim() }
          : g
      )
    );

    const logEntry: PCLogEntry = {
      id: `LOG-${Date.now()}`,
      requestId: req.id,
      studentName: req.studentName,
      projectTitle: req.projectTitle,
      printerName: req.printerName,
      printerId: req.printerId,
      material: req.material,
      professorApprovalSummary: `Approved by ${req.assignedProfessorName || 'Ajinkya Keskar'}`,
      pcAdminDecisionSummary: `Revoked by ${currentUser.name} (${dateShort})`,
      action: 'ACCESS_REVOKED',
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: 'PC_ADMIN',
      timestamp: iso,
      timestampFormatted: dateTime,
      currentStatus: 'ACCESS_REVOKED',
      notes: `Access revoked: ${reason.trim()}`,
    };
    setPcLogs((prev) => [logEntry, ...prev]);

    addToast(
      'warning',
      `Access Revoked for #${req.id}`,
      'Printer credentials invalidated and logged.'
    );
    return { ok: true };
  };

  const updatePrinterStatus = (
    printerId: string,
    availabilityStatus: PrinterAvailability
  ): ServiceResult<void> => {
    if (!currentUser || currentUser.role !== 'PC_ADMIN') {
      return { ok: false, error: 'Only PC Administrators can update printer status.' };
    }
    setPrinters((prev) =>
      prev.map((p) => (p.id === printerId ? { ...p, availabilityStatus } : p))
    );
    addToast(
      'info',
      'Printer Updated',
      `Printer ${printerId} status changed to ${availabilityStatus}.`
    );
    return { ok: true };
  };

  const addPrinter = (newPrinter: Omit<Printer, 'id'>): ServiceResult<Printer> => {
    if (!currentUser || currentUser.role !== 'PC_ADMIN') {
      return { ok: false, error: 'Only PC Administrators can add printers.' };
    }
    const nextId = `PR-0${printers.length + 1}`;
    const created: Printer = { ...newPrinter, id: nextId };
    setPrinters((prev) => [...prev, created]);
    addToast('success', 'Printer Added', `${created.name} (${created.id}) added to inventory.`);
    return { ok: true, data: created };
  };

  const toggleUserActive = (userId: string): ServiceResult<void> => {
    if (!currentUser || currentUser.role !== 'PC_ADMIN') {
      return { ok: false, error: 'Only PC Administrators can manage user status.' };
    }
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, active: !u.active } : u))
    );
    addToast('info', 'User Updated', 'User account status updated.');
    return { ok: true };
  };

  const resetDemoData = () => {
    setUsers(SEED_USERS);
    setPrinters(SEED_PRINTERS);
    setRequests(SEED_REQUESTS);
    setApprovals(SEED_APPROVALS);
    setPcLogs(SEED_PC_LOGS);
    setAccessGrants(SEED_ACCESS_GRANTS);
    setCurrentUserId('USR-STU-01');
    Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
    addToast(
      'info',
      'Demo State Reset',
      'All requests, approvals, and logs have been restored to initial seed data.'
    );
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users,
        printers,
        requests,
        approvals,
        pcLogs,
        accessGrants,
        toasts,
        loginByEmail,
        loginWithMicrosoft,
        switchRoleUser,
        logout,
        addToast,
        dismissToast,
        createOrSubmitRequest,
        submitDraftRequest,
        professorReviewRequest,
        pcFinalReviewRequest,
        revokePrinterAccess,
        updatePrinterStatus,
        addPrinter,
        toggleUserActive,
        resetDemoData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used inside AppProvider');
  }
  return ctx;
}
