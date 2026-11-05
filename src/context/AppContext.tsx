import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  Printer,
  PrintRequest,
  Approval,
  PCLogEntry,
  AccessGrant,
  InventoryItem,
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
  SEED_INVENTORY,
  DEPARTMENTS,
} from '../data/seedData';
import { hashPassword, newSalt } from '../utils/passwordHash';

const STORAGE_KEYS = {
  CURRENT_USER_ID: 'srh_3dp_current_user_id_v6',
  USERS: 'srh_3dp_users_v6',
  PRINTERS: 'srh_3dp_printers_v6',
  REQUESTS: 'srh_3dp_requests_v6',
  APPROVALS: 'srh_3dp_approvals_v6',
  PC_LOGS: 'srh_3dp_pc_logs_v6',
  ACCESS_GRANTS: 'srh_3dp_access_grants_v6',
  INVENTORY: 'srh_3dp_inventory_v6',
  CREDENTIALS: 'srh_3dp_credentials_v6',
};

// Student credentials keyed by matriculation number. Only salted hashes are stored.
type Credentials = Record<string, { userId: string; salt: string; hash: string }>;

const MATRIC_RE = /^\d{6,8}$/;
const SRH_EMAIL_RE = /@([a-z0-9-]+\.)*(srh-berlin|srh)\.de$/i;

export interface SignUpPayload {
  name: string;
  email: string;
  matriculationNumber: string;
  department: string;
  password: string;
}

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
  inventory: InventoryItem[];
  toasts: ToastNotification[];
  signUpStudent: (payload: SignUpPayload) => Promise<ServiceResult<User>>;
  loginByMatriculation: (matriculationNumber: string, password: string) => Promise<ServiceResult<User>>;
  switchRoleUser: (userId: string) => void;
  logout: () => void;
  addToast: (type: ToastNotification['type'], title: string, message: string) => void;
  dismissToast: (id: string) => void;
  createOrSubmitRequest: (payload: CreateRequestPayload) => ServiceResult<PrintRequest>;
  submitDraftRequest: (requestId: string) => ServiceResult<PrintRequest>;
  professorReviewRequest: (
    requestId: string,
    decision: 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED',
    comments: string,
    assignedPrinterId?: string,
    validUntilFormatted?: string
  ) => ServiceResult<PrintRequest>;
  revokePrinterAccess: (requestId: string, reason: string) => ServiceResult<void>;
  updatePrinterStatus: (
    printerId: string,
    availabilityStatus: PrinterAvailability
  ) => ServiceResult<void>;
  addPrinter: (newPrinter: Omit<Printer, 'id'>) => ServiceResult<Printer>;
  updatePrinterMaintenance: (
    printerId: string,
    info: { notes: string; on: string; by: string }
  ) => ServiceResult<void>;
  toggleUserActive: (userId: string) => ServiceResult<void>;
  addInventoryItem: (
    item: Omit<InventoryItem, 'id' | 'updatedAt' | 'updatedBy'>
  ) => ServiceResult<InventoryItem>;
  setInventoryQuantity: (itemId: string, quantity: number) => ServiceResult<void>;
  removeInventoryItem: (itemId: string) => ServiceResult<void>;
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
    'APPROVED_ACCESS_GRANTED',
    'REJECTED_BY_PROFESSOR',
    'CHANGES_REQUESTED',
  ],
  CHANGES_REQUESTED: ['PENDING_PROFESSOR_APPROVAL', 'SUBMITTED'],
  REJECTED_BY_PROFESSOR: [],
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
  const [inventory, setInventory] = useState<InventoryItem[]>(() =>
    loadFromStorage(STORAGE_KEYS.INVENTORY, SEED_INVENTORY)
  );
  const [credentials, setCredentials] = useState<Credentials>(() =>
    loadFromStorage(STORAGE_KEYS.CREDENTIALS, {})
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
      localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(inventory));
    } catch {
      // ignore
    }
  }, [inventory]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CREDENTIALS, JSON.stringify(credentials));
    } catch {
      // ignore
    }
  }, [credentials]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, JSON.stringify(currentUserId));
    } catch {
      // ignore
    }
  }, [currentUserId]);

  const currentUser = users.find((u) => u.id === currentUserId) ?? null;
  const canManagePrinters =
    currentUser?.role === 'PROFESSOR' || currentUser?.role === 'LAB_INCHARGE';

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

  const loginByMatriculation = async (
    matriculationNumber: string,
    password: string
  ): Promise<ServiceResult<User>> => {
    const bad = { ok: false, error: 'Matriculation number or password is incorrect.' };
    const cred = credentials[matriculationNumber.trim()];
    if (!cred) return bad;
    if ((await hashPassword(password, cred.salt)) !== cred.hash) return bad;
    const user = users.find((u) => u.id === cred.userId);
    if (!user) return bad;
    if (!user.active) {
      return {
        ok: false,
        error: 'This account is currently deactivated. Contact Ajinkya Keskar.',
      };
    }
    setCurrentUserId(user.id);
    addToast('success', 'Signed In', `Welcome back, ${user.name}!`);
    return { ok: true, data: user };
  };

  const signUpStudent = async (p: SignUpPayload): Promise<ServiceResult<User>> => {
    const name = p.name.trim();
    const email = p.email.trim().toLowerCase();
    const matric = p.matriculationNumber.trim();
    const fail = (error: string) => ({ ok: false, error });
    if (!name) return fail('Please enter your full name.');
    if (!SRH_EMAIL_RE.test(email)) return fail('Please use your SRH university email (@srh-berlin.de).');
    if (!MATRIC_RE.test(matric)) return fail('Matriculation number must be 6 to 8 digits.');
    if (!DEPARTMENTS.includes(p.department)) return fail('Please choose your department.');
    if (p.password.length < 8) return fail('Password must be at least 8 characters.');
    if (credentials[matric] || users.some((u) => u.matriculationNumber === matric)) {
      return fail('An account with this matriculation number already exists. Please log in.');
    }
    if (users.some((u) => u.email.toLowerCase() === email)) {
      return fail('An account with this email already exists.');
    }

    const salt = newSalt();
    const hash = await hashPassword(p.password, salt);
    const user: User = {
      id: `USR-STU-${Date.now()}`,
      name,
      email,
      role: 'STUDENT',
      department: p.department,
      matriculationNumber: matric,
      active: true,
      avatarRoleColor: '#1662F3',
      title: 'Student',
    };
    setUsers((prev) => [...prev, user]);
    setCredentials((prev) => ({ ...prev, [matric]: { userId: user.id, salt, hash } }));
    setCurrentUserId(user.id);
    addToast('success', 'Account Created', `Welcome, ${user.name}!`);
    return { ok: true, data: user };
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
        accessSummary: 'Awaiting decision',
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
      accessSummary: 'Awaiting decision',
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
    return { ok: true, data: updated };
  };

  const professorReviewRequest = (
    requestId: string,
    decision: 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED',
    comments: string,
    assignedPrinterId?: string,
    validUntilFormatted?: string
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
        ? 'APPROVED_ACCESS_GRANTED'
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

    const targetPrinter =
      printers.find((p) => p.id === (assignedPrinterId || req.printerId)) ??
      printers.find((p) => p.id === req.printerId)!;

    const updatedRequest: PrintRequest = {
      ...req,
      printerId: targetPrinter.id,
      printerName: targetPrinter.name,
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
      printerName: targetPrinter.name,
      printerId: targetPrinter.id,
      material: req.material,
      professorApprovalSummary: `${
        decision === 'APPROVED'
          ? 'Approved'
          : decision === 'REJECTED'
          ? 'Rejected'
          : 'Changes Requested'
      } by ${currentUser.name} (${dateShort})`,
      accessSummary:
        decision === 'APPROVED'
          ? `Access granted on ${targetPrinter.name}`
          : decision === 'REJECTED'
          ? 'Rejected, no access granted'
          : 'Returned to student',
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
      const cleanId = req.id.toLowerCase().replace(/[^a-z0-9]/g, '');
      const expiry = new Date(Date.now() + 7 * 86400000);
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
        expiryTimestamp: expiry.toISOString(),
        expiryTimestampFormatted:
          validUntilFormatted ||
          `${expiry.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}, 23:59`,
      };
      setAccessGrants((prev) => [grant, ...prev.filter((g) => g.requestId !== req.id)]);
      addToast(
        'success',
        `Request #${req.id} Approved`,
        `Printer access unlocked for ${req.studentName}.`
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

  const revokePrinterAccess = (
    requestId: string,
    reason: string
  ): ServiceResult<void> => {
    if (!currentUser || currentUser.role !== 'PROFESSOR') {
      return { ok: false, error: 'Only the approver can revoke printer access.' };
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
      accessSummary: `Revoked by ${currentUser.name} (${dateShort})`,
      action: 'ACCESS_REVOKED',
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: 'PROFESSOR',
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
    if (!canManagePrinters) {
      return { ok: false, error: 'Only the approver or lab in-charge can update printer status.' };
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

  const updatePrinterMaintenance = (
    printerId: string,
    info: { notes: string; on: string; by: string }
  ): ServiceResult<void> => {
    if (!canManagePrinters) {
      return { ok: false, error: 'Only the approver or lab in-charge can update maintenance info.' };
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(info.on)) {
      return { ok: false, error: 'Please enter the date of the last maintenance.' };
    }
    if (info.on > new Date().toLocaleDateString('en-CA')) {
      return { ok: false, error: 'Maintenance date cannot be in the future.' };
    }
    if (!info.by.trim()) {
      return { ok: false, error: 'Please enter who carried out the maintenance.' };
    }
    setPrinters((prev) =>
      prev.map((p) =>
        p.id === printerId
          ? {
              ...p,
              maintenanceNotes: info.notes.trim(),
              lastMaintainedOn: info.on,
              lastMaintainedBy: info.by.trim(),
            }
          : p
      )
    );
    addToast('success', 'Maintenance Recorded', `Printer ${printerId} maintenance info saved.`);
    return { ok: true };
  };

  const addPrinter = (newPrinter: Omit<Printer, 'id'>): ServiceResult<Printer> => {
    if (!canManagePrinters) {
      return { ok: false, error: 'Only the approver or lab in-charge can add printers.' };
    }
    const nextId = `PR-0${printers.length + 1}`;
    const created: Printer = { ...newPrinter, id: nextId };
    setPrinters((prev) => [...prev, created]);
    addToast('success', 'Printer Added', `${created.name} (${created.id}) added to inventory.`);
    return { ok: true, data: created };
  };

  const toggleUserActive = (userId: string): ServiceResult<void> => {
    if (!currentUser || currentUser.role !== 'PROFESSOR') {
      return { ok: false, error: 'Only the approver can manage user status.' };
    }
    if (userId === currentUser.id) {
      return { ok: false, error: 'You cannot deactivate your own account.' };
    }
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, active: !u.active } : u))
    );
    addToast('info', 'User Updated', 'User account status updated.');
    return { ok: true };
  };

  const addInventoryItem = (
    item: Omit<InventoryItem, 'id' | 'updatedAt' | 'updatedBy'>
  ): ServiceResult<InventoryItem> => {
    if (currentUser?.role !== 'LAB_INCHARGE') {
      return { ok: false, error: 'Only the lab in-charge can edit the inventory.' };
    }
    if (!item.name.trim()) {
      return { ok: false, error: 'Item name is required.' };
    }
    if (
      !Number.isInteger(item.quantity) ||
      item.quantity < 0 ||
      !Number.isInteger(item.lowStockThreshold) ||
      item.lowStockThreshold < 0
    ) {
      return { ok: false, error: 'Quantity and low-stock level must be whole numbers, 0 or more.' };
    }
    const nextNum =
      Math.max(0, ...inventory.map((i) => parseInt(i.id.replace('INV-', ''), 10) || 0)) + 1;
    const created: InventoryItem = {
      ...item,
      name: item.name.trim(),
      id: `INV-${String(nextNum).padStart(3, '0')}`,
      updatedAt: formatNowDate().dateTime,
      updatedBy: currentUser.name,
    };
    setInventory((prev) => [...prev, created]);
    addToast('success', 'Inventory Updated', `${created.name} added.`);
    return { ok: true, data: created };
  };

  const setInventoryQuantity = (itemId: string, quantity: number): ServiceResult<void> => {
    if (currentUser?.role !== 'LAB_INCHARGE') {
      return { ok: false, error: 'Only the lab in-charge can edit the inventory.' };
    }
    if (!Number.isInteger(quantity) || quantity < 0) {
      return { ok: false, error: 'Quantity must be a whole number, 0 or more.' };
    }
    const { dateTime } = formatNowDate();
    setInventory((prev) =>
      prev.map((i) =>
        i.id === itemId
          ? { ...i, quantity, updatedAt: dateTime, updatedBy: currentUser.name }
          : i
      )
    );
    return { ok: true };
  };

  const removeInventoryItem = (itemId: string): ServiceResult<void> => {
    if (currentUser?.role !== 'LAB_INCHARGE') {
      return { ok: false, error: 'Only the lab in-charge can edit the inventory.' };
    }
    setInventory((prev) => prev.filter((i) => i.id !== itemId));
    addToast('info', 'Inventory Updated', 'Item removed.');
    return { ok: true };
  };

  const resetDemoData = () => {
    setUsers(SEED_USERS);
    setPrinters(SEED_PRINTERS);
    setRequests(SEED_REQUESTS);
    setApprovals(SEED_APPROVALS);
    setPcLogs(SEED_PC_LOGS);
    setAccessGrants(SEED_ACCESS_GRANTS);
    setInventory(SEED_INVENTORY);
    setCredentials({});
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
        inventory,
        toasts,
        signUpStudent,
        loginByMatriculation,
        switchRoleUser,
        logout,
        addToast,
        dismissToast,
        createOrSubmitRequest,
        submitDraftRequest,
        professorReviewRequest,
        revokePrinterAccess,
        updatePrinterStatus,
        addPrinter,
        updatePrinterMaintenance,
        toggleUserActive,
        addInventoryItem,
        setInventoryQuantity,
        removeInventoryItem,
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
