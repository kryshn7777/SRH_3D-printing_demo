import { createContext, useContext } from 'react';
import {
  User,
  Printer,
  PrintRequest,
  Approval,
  PCLogEntry,
  AccessGrant,
  InventoryItem,
  SupportedMaterial,
  PrinterAvailability,
  AttachmentMetadata,
  ApprovalContact,
} from '../types/models';

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
}

export interface SignUpPayload {
  name: string;
  email: string;
  password: string;
  // students only
  matriculationNumber?: string;
  department?: string;
  // staff register with name + email + the one-time invitation code the owner gave them;
  // the server decides the role
  staff?: boolean;
  enrolCode?: string;
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

export interface ServiceResult<T = void> {
  ok: boolean;
  error?: string;
  data?: T;
  /** Set when the call succeeded but the user must act (e.g. confirm their email). */
  message?: string;
}

type Async<T = void> = Promise<ServiceResult<T>>;

export interface AppContextValue {
  /** true = real Supabase backend, false = local demo data in this browser */
  isLive: boolean;
  /** false while a live session is still being restored */
  ready: boolean;
  currentUser: User | null;
  users: User[];
  printers: Printer[];
  requests: PrintRequest[];
  approvals: Approval[];
  pcLogs: PCLogEntry[];
  accessGrants: AccessGrant[];
  inventory: InventoryItem[];
  toasts: ToastNotification[];
  signUpStudent: (payload: SignUpPayload) => Async<User>;
  /** Matriculation number (students) or SRH email (staff, live mode) + password. */
  loginByMatriculation: (identifier: string, password: string) => Async<User>;
  /** Demo only: no-op on the live backend. */
  switchRoleUser: (userId: string) => void;
  logout: () => void;
  addToast: (type: ToastNotification['type'], title: string, message: string) => void;
  dismissToast: (id: string) => void;
  createOrSubmitRequest: (payload: CreateRequestPayload) => Async<PrintRequest>;
  submitDraftRequest: (requestId: string) => Async<PrintRequest>;
  professorReviewRequest: (
    requestId: string,
    decision: 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED',
    comments: string,
    assignedPrinterId?: string,
    /** ISO date (YYYY-MM-DD), access ends at 23:59 that day; default 7 days */
    validUntil?: string
  ) => Async<PrintRequest>;
  revokePrinterAccess: (requestId: string, reason: string) => Async;
  updatePrinterStatus: (printerId: string, availabilityStatus: PrinterAvailability) => Async;
  addPrinter: (newPrinter: Omit<Printer, 'id'>) => Async<Printer>;
  updatePrinterMaintenance: (
    printerId: string,
    info: { notes: string; on: string; by: string }
  ) => Async;
  toggleUserActive: (userId: string) => Async;
  addInventoryItem: (
    item: Omit<InventoryItem, 'id' | 'updatedAt' | 'updatedBy'>
  ) => Async<InventoryItem>;
  setInventoryQuantity: (itemId: string, quantity: number) => Async;
  removeInventoryItem: (itemId: string) => Async;
  /** Demo only: no-op on the live backend. */
  resetDemoData: () => void;
}

export const AppContext = createContext<AppContextValue | undefined>(undefined);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used inside AppProvider');
  }
  return ctx;
}
