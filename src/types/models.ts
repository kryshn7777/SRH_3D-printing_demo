export type Role = 'STUDENT' | 'PROFESSOR' | 'PC_ADMIN' | 'SYSTEM_ADMIN';

export type RequestStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'PENDING_PROFESSOR_APPROVAL'
  | 'CHANGES_REQUESTED'
  | 'REJECTED_BY_PROFESSOR'
  | 'PENDING_PC_APPROVAL'
  | 'REJECTED_BY_PC'
  | 'APPROVED_ACCESS_GRANTED'
  | 'ACCESS_REVOKED';

export type PrinterAvailability = 'Available' | 'In Use' | 'Maintenance';

export type SupportedMaterial = 'PLA' | 'PETG' | 'ABS' | 'TPU' | 'ASA' | 'PC';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string;
  active: boolean;
  avatarRoleColor: string;
  assignedDepartments?: string[]; // Scope for PROFESSOR role
  title?: string;
}

export interface Printer {
  id: string; // e.g. 'PR-01'
  name: string; // e.g. 'Prusa MK4'
  model: string;
  technology: 'FDM';
  buildVolume: string; // e.g. '250 × 210 × 220 mm'
  supportedMaterials: SupportedMaterial[];
  availabilityStatus: PrinterAvailability;
  backendUrl: string; // Demo placeholder URL e.g. 'http://192.168.1.21'
  usageRestrictions: string[];
  nozzleDiameter: string;
  layerResolution: string;
  location: string;
  illustrationKey: 'prusa-mk4' | 'ultimaker-s5' | 'creality-k1' | 'bambu-x1e';
}

export interface AttachmentMetadata {
  fileName: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  fileType: 'STL' | '3MF' | 'OBJ';
  uploadedAt: string;
  dimensionsMm?: string;
  previewKey?: 'bracket-joint' | 'drone-mount' | 'enclosure-case' | 'sensor-housing' | 'generic-stl';
  storageKey?: string;
  triangleCount?: number;
  volumeCm3?: number;
}

export interface PrintRequest {
  id: string; // e.g. 'PR-003'
  studentId: string;
  studentName: string;
  studentEmail: string;
  projectTitle: string;
  courseOrDepartment: string;
  description: string;
  purpose: string; // Academic purpose / why required
  intendedUse: string; // Functional testing, thesis prototype, etc.
  printerId: string;
  printerName: string;
  material: SupportedMaterial;
  estimatedDuration: string; // e.g. '4 hours'
  estimatedHoursNumeric: number;
  quantity: number;
  requestedDateTime?: string;
  attachment: AttachmentMetadata;
  submissionTimestamp: string; // ISO string
  submissionDateFormatted: string; // e.g. '10 Oct 2024'
  submissionDateTimeFormatted: string; // e.g. '10 Oct 2024, 14:30'
  currentStatus: RequestStatus;
  assignedProfessorName?: string;
  assignedProfessorId?: string;
}

export type ApprovalDecision =
  | 'APPROVED'
  | 'REJECTED'
  | 'CHANGES_REQUESTED'
  | 'REVOKED';

export interface Approval {
  id: string;
  requestId: string;
  reviewerId: string;
  reviewerName: string;
  reviewerRole: Role;
  decision: ApprovalDecision;
  comments: string;
  timestamp: string;
  timestampFormatted: string;
}

export type PCLogAction =
  | 'REQUEST_SUBMITTED'
  | 'PROFESSOR_APPROVED'
  | 'PROFESSOR_REJECTED'
  | 'PROFESSOR_REQUESTED_CHANGES'
  | 'PC_FINAL_APPROVED'
  | 'PC_FINAL_REJECTED'
  | 'PRINTER_REASSIGNED'
  | 'ACCESS_REVOKED';

export interface PCLogEntry {
  id: string;
  requestId: string;
  studentName: string;
  projectTitle: string;
  printerName: string;
  printerId: string;
  material: SupportedMaterial;
  professorApprovalSummary: string;
  pcAdminDecisionSummary: string;
  action: PCLogAction;
  actorId: string;
  actorName: string;
  actorRole: Role;
  timestamp: string;
  timestampFormatted: string;
  currentStatus: RequestStatus;
  notes: string;
}

export interface AccessGrant {
  id: string;
  requestId: string;
  printerId: string;
  printerName: string;
  backendUrl: string;
  demoUsername: string;
  demoTokenMasked: string;
  demoTokenPlain: string;
  grantedBy: string;
  grantedByName: string;
  grantTimestamp: string;
  grantTimestampFormatted: string;
  expiryTimestamp: string;
  expiryTimestampFormatted: string; // e.g. '18 Oct 2024, 23:59'
  revokedTimestamp?: string;
  revokedReason?: string;
}
