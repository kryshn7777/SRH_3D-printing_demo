import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  User,
  Printer,
  PrintRequest,
  Approval,
  PCLogEntry,
  AccessGrant,
  InventoryItem,
  Role,
  RequestStatus,
  SupportedMaterial,
} from '../types/models';
import { DEPARTMENTS } from '../data/seedData';
import { supabase } from '../lib/supabase';
import '../lib/modelStore';
import { AppContext, AppContextValue, ServiceResult, ToastNotification } from './appTypes';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const MATRIC_RE = /^\d{6,10}$/;
const SRH_EMAIL_RE = /@([a-z0-9-]+\.)*(srh-berlin|srh)\.de$/i;
const REFRESH_MS = 45_000;

const fmt = (iso?: string | null) =>
  iso
    ? new Date(iso)
        .toLocaleString('en-GB', {
          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
          timeZone: 'Europe/Berlin',
        })
        .replace(' at ', ', ')
    : '';
const fmtDate = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Europe/Berlin',
      })
    : '';
const fmtSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

const ROLE_TITLE: Record<Role, string> = {
  STUDENT: 'Student',
  PROFESSOR: 'Approver — Engineering & 3D Manufacturing',
  LAB_INCHARGE: 'Lab In-Charge — Inventory & Equipment',
};
const ROLE_COLOR: Record<Role, string> = { STUDENT: '#1662F3', PROFESSOR: '#D54407', LAB_INCHARGE: '#37484E' };

/* ---------- row -> app model mappers ---------- */
const mapProfile = (p: Row): User => ({
  id: p.id,
  name: p.name,
  email: p.email,
  role: p.role,
  department: p.department ?? '',
  active: p.active,
  matriculationNumber: p.matriculation_number ?? undefined,
  avatarRoleColor: ROLE_COLOR[p.role as Role],
  title: ROLE_TITLE[p.role as Role],
  assignedDepartments: p.role === 'PROFESSOR' ? [...DEPARTMENTS] : undefined,
});

const mapPrinter = (p: Row, url?: string): Printer => ({
  id: p.id,
  name: p.name,
  model: p.model,
  technology: p.technology,
  buildVolume: p.build_volume,
  supportedMaterials: p.supported_materials,
  availabilityStatus: p.availability_status,
  backendUrl: url ?? '',
  usageRestrictions: p.usage_restrictions ?? [],
  nozzleDiameter: p.nozzle_diameter,
  layerResolution: p.layer_resolution,
  location: p.location,
  illustrationKey: p.illustration_key,
  maintenanceNotes: p.maintenance_notes || undefined,
  lastMaintainedOn: p.last_maintained_on ?? undefined,
  lastMaintainedBy: p.last_maintained_by ?? undefined,
});

const mapRequest = (r: Row): PrintRequest => ({
  id: r.id,
  studentId: r.student_id,
  studentName: r.student_name,
  studentEmail: r.student_email,
  matriculationNumber: r.matriculation_number,
  projectTitle: r.project_title,
  courseOrDepartment: r.course_or_department,
  intendedUse: r.intended_use,
  contactedApprover: (r.contacted_approver_name || 'Ajinkya Keskar') as PrintRequest['contactedApprover'],
  printerId: r.printer_id,
  printerName: r.printer_name,
  material: r.material as SupportedMaterial,
  quantity: r.quantity,
  attachment: {
    fileName: r.file_name,
    fileSizeBytes: Number(r.file_size_bytes),
    fileSizeFormatted: fmtSize(Number(r.file_size_bytes)),
    fileType: r.file_type,
    uploadedAt: fmt(r.submitted_at),
    dimensionsMm: r.dimensions_mm ?? undefined,
    previewKey: (r.preview_key ?? 'generic-stl') as any,
    storageKey: r.storage_path ?? undefined,
    triangleCount: r.triangle_count ?? undefined,
    volumeCm3: r.volume_cm3 != null ? Number(r.volume_cm3) : undefined,
  },
  submissionTimestamp: r.submitted_at,
  submissionDateFormatted: fmtDate(r.submitted_at),
  submissionDateTimeFormatted: fmt(r.submitted_at),
  currentStatus: r.status as RequestStatus,
  assignedProfessorId: r.assigned_professor_id ?? undefined,
  assignedProfessorName: r.assigned_professor_name ?? undefined,
});

const mapApproval = (a: Row): Approval => ({
  id: a.id,
  requestId: a.request_id,
  reviewerId: a.reviewer_id,
  reviewerName: a.reviewer_name,
  reviewerRole: a.reviewer_role,
  decision: a.decision,
  comments: a.comments,
  timestamp: a.created_at,
  timestampFormatted: fmt(a.created_at),
});

const mapAudit = (l: Row): PCLogEntry => ({
  id: String(l.id),
  requestId: l.request_id,
  studentName: l.student_name,
  projectTitle: l.project_title,
  printerName: l.printer_name,
  printerId: l.printer_id,
  material: l.material,
  professorApprovalSummary: l.approval_summary,
  accessSummary: l.access_summary,
  action: l.action,
  actorId: l.actor_id,
  actorName: l.actor_name,
  actorRole: l.actor_role,
  timestamp: l.created_at,
  timestampFormatted: fmt(l.created_at),
  currentStatus: l.status,
  notes: l.notes,
});

const mapGrant = (g: Row): AccessGrant => ({
  id: g.id,
  requestId: g.request_id,
  printerId: g.printer_id,
  printerName: g.printer_name,
  backendUrl: g.backend_url,
  demoUsername: g.username,
  demoTokenMasked: '••••••••••',
  demoTokenPlain: g.token,
  grantedBy: g.granted_by,
  grantedByName: g.granted_by_name,
  grantTimestamp: g.granted_at,
  grantTimestampFormatted: fmt(g.granted_at),
  expiryTimestamp: g.expires_at,
  expiryTimestampFormatted: fmt(g.expires_at),
  revokedTimestamp: g.revoked_at ? fmt(g.revoked_at) : undefined,
  revokedReason: g.revoked_reason ?? undefined,
});

const mapInventory = (i: Row): InventoryItem => ({
  id: i.id,
  category: i.category,
  name: i.name,
  material: i.material ?? undefined,
  quantity: i.quantity,
  unit: i.unit,
  lowStockThreshold: i.low_stock_threshold,
  updatedAt: fmt(i.updated_at),
  updatedBy: i.updated_by_name,
});

/** Turn a database/API error into a message that is safe to show. */
function friendly(e: { code?: string; message?: string } | null | undefined): string {
  if (!e) return 'Something went wrong. Please try again.';
  if (e.code === 'P0429' || /rate_limited/.test(e.message ?? '')) {
    return 'Too many requests. Please wait a few minutes and try again.';
  }
  if (e.code === 'P0001') return e.message ?? 'Something went wrong.'; // raised on purpose by schema.sql
  if (e.code === '42501') return 'You are not allowed to do that.';
  if (e.code && /^23/.test(e.code)) return 'Please check the values you entered.';
  return 'Something went wrong. Please try again.';
}

const fail = <T,>(e: { code?: string; message?: string } | null | undefined): ServiceResult<T> => ({
  ok: false,
  error: friendly(e),
});

export const LiveProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [dataReady, setDataReady] = useState(false);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [requests, setRequests] = useState<PrintRequest[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [pcLogs, setPcLogs] = useState<PCLogEntry[]>([]);
  const [accessGrants, setAccessGrants] = useState<AccessGrant[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const loadedFor = useRef<string | null>(null);
  const inFlight = useRef<{ uid: string; p: Promise<User | null> } | null>(null);

  const addToast = useCallback((type: ToastNotification['type'], title: string, message: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
  }, []);
  const dismissToast = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const clearData = useCallback(() => {
    loadedFor.current = null;
    setCurrentUser(null);
    setUsers([]);
    setPrinters([]);
    setRequests([]);
    setApprovals([]);
    setPcLogs([]);
    setAccessGrants([]);
    setInventory([]);
  }, []);

  /** Load everything the signed-in user is allowed to see (row level security does the filtering). */
  const doRefresh = useCallback(
    async (uid: string, quiet: boolean): Promise<User | null> => {
      try {
        const { data: me, error: meErr } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
        if (meErr) throw meErr;
        if (!me) {
          // signed in but no profile: email not confirmed yet, or sign-up was rejected
          clearData();
          await supabase.auth.signOut();
          return null;
        }
        if (!me.active) {
          clearData();
          await supabase.auth.signOut();
          addToast('error', 'Account Deactivated', 'This account is deactivated. Contact Ajinkya Keskar.');
          return null;
        }
        const role = me.role as Role;
        const staff = role !== 'STUDENT';
        const empty = Promise.resolve({ data: [] as Row[], error: null });
        const [pr, ep, rq, ap, gr, au, inv, prof] = await Promise.all([
          supabase.from('printers').select('*').order('id'),
          staff ? supabase.from('printer_endpoints').select('*') : empty,
          supabase.from('print_requests').select('*').order('created_at', { ascending: false }),
          supabase.from('approvals').select('*').order('created_at', { ascending: false }),
          supabase.from('access_grants').select('*').order('granted_at', { ascending: false }),
          role === 'PROFESSOR'
            ? supabase.from('audit_log').select('*').order('id', { ascending: false }).limit(500)
            : empty,
          staff ? supabase.from('inventory_items').select('*').order('category').order('name') : empty,
          role === 'PROFESSOR' ? supabase.from('profiles').select('*').order('created_at') : empty,
        ]);
        const firstError = [pr, ep, rq, ap, gr, au, inv, prof].find((r) => r.error)?.error;
        if (firstError) throw firstError;

        const urls = new Map((ep.data as Row[]).map((e) => [e.printer_id, e.backend_url]));
        const mapped = mapProfile(me);
        setCurrentUser(mapped);
        setUsers(role === 'PROFESSOR' ? (prof.data as Row[]).map(mapProfile) : [mapped]);
        setPrinters((pr.data as Row[]).map((p) => mapPrinter(p, urls.get(p.id))));
        setRequests((rq.data as Row[]).map(mapRequest));
        setApprovals((ap.data as Row[]).map(mapApproval));
        setAccessGrants((gr.data as Row[]).map(mapGrant));
        setPcLogs((au.data as Row[]).map(mapAudit));
        setInventory((inv.data as Row[]).map(mapInventory));
        loadedFor.current = uid;
        return mapped;
      } catch {
        if (!quiet) addToast('error', 'Could Not Load Data', 'Please check your connection and try again.');
        return null;
      } finally {
        setDataReady(true);
      }
    },
    [addToast, clearData]
  );

  /** One fetch at a time. `fresh` (after a write) waits for any running fetch, then fetches again. */
  const refresh = useCallback(
    async (uid: string, quiet = true, fresh = false): Promise<User | null> => {
      const running = inFlight.current;
      if (running?.uid === uid) {
        if (!fresh) return running.p;
        await running.p;
      }
      const p: Promise<User | null> = doRefresh(uid, quiet).finally(() => {
        if (inFlight.current?.p === p) inFlight.current = null;
      });
      inFlight.current = { uid, p };
      return p;
    },
    [doRefresh]
  );

  /* ---------- session lifecycle ---------- */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoaded(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const uid = session?.user.id ?? null;
  useEffect(() => {
    if (!sessionLoaded) return;
    if (!uid) {
      clearData();
      setDataReady(true);
      return;
    }
    if (loadedFor.current !== uid) void refresh(uid, false);
  }, [uid, sessionLoaded, refresh, clearData]);

  // keep data fresh: poll while the tab is visible, refresh when it regains focus
  useEffect(() => {
    if (!uid) return;
    const tick = () => document.visibilityState === 'visible' && void refresh(uid);
    const t = setInterval(tick, REFRESH_MS);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [uid, refresh]);

  const reload = async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) await refresh(data.session.user.id, true, true);
  };

  /* ---------- auth ---------- */
  const loginByMatriculation: AppContextValue['loginByMatriculation'] = async (identifier, password) => {
    const id = identifier.trim();
    if (!id || !password) return { ok: false, error: 'Please enter your matriculation number and password.' };
    const { data, error } = await supabase.functions.invoke('login', { body: { identifier: id, password } });
    if (error) {
      let message = 'Could not log in. Please try again.';
      try {
        const body = await (error as any).context?.json();
        if (typeof body?.error === 'string') message = body.error;
      } catch {
        /* keep generic message */
      }
      return { ok: false, error: message };
    }
    const { error: sessErr } = await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });
    if (sessErr) return { ok: false, error: 'Could not log in. Please try again.' };
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user ? await refresh(auth.user.id, false) : null;
    if (!user) return { ok: false, error: 'Could not load your account. Please try again.' };
    addToast('success', 'Signed In', `Welcome back, ${user.name}!`);
    return { ok: true, data: user };
  };

  const signUpStudent: AppContextValue['signUpStudent'] = async (p) => {
    const name = p.name.trim();
    const email = p.email.trim().toLowerCase();
    const matric = (p.matriculationNumber ?? '').trim();
    if (!name) return { ok: false, error: 'Please enter your full name.' };
    if (!SRH_EMAIL_RE.test(email)) return { ok: false, error: 'Please use your SRH university email (@srh-berlin.de).' };
    if (p.staff) {
      if (!(p.enrolCode ?? '').trim()) return { ok: false, error: 'Please enter the invitation code you received.' };
    } else {
      if (!MATRIC_RE.test(matric)) return { ok: false, error: 'Matriculation number must be 6 to 10 digits.' };
      if (!DEPARTMENTS.includes(p.department ?? '')) return { ok: false, error: 'Please choose your department.' };
    }
    if (p.password.length < 8) return { ok: false, error: 'Password must be at least 8 characters.' };

    const { data, error } = await supabase.auth.signUp({
      email,
      password: p.password,
      options: {
        data: p.staff
          ? { name, enrol_code: (p.enrolCode ?? '').trim() }
          : { name, matriculation_number: matric, department: p.department },
        emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}login`,
      },
    });
    if (error) {
      if (error.code === 'weak_password') return { ok: false, error: 'That password is too weak. Use at least 8 characters with letters and numbers.' };
      if (error.code === 'over_email_send_rate_limit' || error.status === 429) {
        return { ok: false, error: 'Too many sign-up attempts. Please wait a few minutes and try again.' };
      }
      return {
        ok: false,
        error: 'Could not create the account. Check your details; the matriculation number and email must not be registered yet.',
      };
    }
    if (data.session) {
      const user = await refresh(data.session.user.id, false);
      return user ? { ok: true, data: user } : { ok: false, error: 'Could not load your account.' };
    }
    return {
      ok: true,
      message: `We sent a confirmation link to ${email}. Open it, then log in${p.staff ? ' with your email' : ' with your matriculation number'}.`,
    };
  };

  const logout = () => {
    void supabase.auth.signOut();
    clearData();
    addToast('info', 'Signed Out', 'You have logged out of the SRH 3D Printing System.');
  };

  /* ---------- requests ---------- */
  const createOrSubmitRequest: AppContextValue['createOrSubmitRequest'] = async (payload) => {
    const { matriculationNumber: _ignored, saveAsDraft, existingDraftId, ...rest } = payload;
    void _ignored;
    const { data, error } = await supabase.rpc('create_request', {
      p_payload: rest,
      p_draft: Boolean(saveAsDraft),
      p_existing_id: existingDraftId ?? null,
    });
    if (error) return fail(error);
    await reload();
    const req = mapRequest(data as Row);
    addToast(
      saveAsDraft ? 'info' : 'success',
      saveAsDraft ? `Draft #${req.id} Saved` : `Request #${req.id} Submitted`,
      saveAsDraft ? 'Your draft request has been saved to My Requests.' : `Your request has been routed to ${req.contactedApprover} for approval.`
    );
    return { ok: true, data: req };
  };

  const submitDraftRequest: AppContextValue['submitDraftRequest'] = async (requestId) => {
    const { data, error } = await supabase.rpc('submit_draft', { p_id: requestId });
    if (error) {
      const res = fail<PrintRequest>(error);
      addToast('error', 'Could Not Submit', res.error!);
      return res;
    }
    await reload();
    const req = mapRequest(data as Row);
    addToast('success', `Request #${req.id} Submitted`, 'Sent for approval.');
    return { ok: true, data: req };
  };

  const professorReviewRequest: AppContextValue['professorReviewRequest'] = async (
    requestId, decision, comments, assignedPrinterId, validUntil
  ) => {
    const { data, error } = await supabase.rpc('review_request', {
      p_id: requestId,
      p_decision: decision,
      p_comments: comments,
      p_printer_id: assignedPrinterId ?? null,
      p_valid_until: validUntil || null,
    });
    if (error) return fail(error);
    await reload();
    addToast(
      decision === 'APPROVED' ? 'success' : decision === 'REJECTED' ? 'warning' : 'info',
      decision === 'APPROVED' ? `Request #${requestId} Approved` : decision === 'REJECTED' ? `Request #${requestId} Rejected` : `Changes Requested on #${requestId}`,
      decision === 'APPROVED' ? 'Printer access unlocked for the student.' : 'The student has been notified with your review feedback.'
    );
    return { ok: true, data: mapRequest(data as Row) };
  };

  const revokePrinterAccess: AppContextValue['revokePrinterAccess'] = async (requestId, reason) => {
    const { error } = await supabase.rpc('revoke_access', { p_id: requestId, p_reason: reason });
    if (error) {
      const res = fail<void>(error);
      addToast('error', 'Could Not Revoke', res.error!);
      return res;
    }
    await reload();
    addToast('warning', `Access Revoked for #${requestId}`, 'Printer credentials invalidated and logged.');
    return { ok: true };
  };

  /* ---------- printers ---------- */
  const updatePrinterStatus: AppContextValue['updatePrinterStatus'] = async (printerId, availabilityStatus) => {
    const { data, error } = await supabase.from('printers').update({ availability_status: availabilityStatus }).eq('id', printerId).select('id');
    if (error || !data?.length) return fail(error ?? { code: '42501' });
    await reload();
    addToast('info', 'Printer Updated', `Printer ${printerId} status changed to ${availabilityStatus}.`);
    return { ok: true };
  };

  const addPrinter: AppContextValue['addPrinter'] = async (np) => {
    if (np.backendUrl && !/^https?:\/\/\S{1,190}$/.test(np.backendUrl)) {
      return { ok: false, error: 'Backend URL must start with http:// or https://.' };
    }
    const { data, error } = await supabase
      .from('printers')
      .insert({
        name: np.name, model: np.model, technology: np.technology, build_volume: np.buildVolume,
        supported_materials: np.supportedMaterials, availability_status: np.availabilityStatus,
        nozzle_diameter: np.nozzleDiameter, layer_resolution: np.layerResolution, location: np.location,
        illustration_key: np.illustrationKey, usage_restrictions: np.usageRestrictions,
      })
      .select()
      .single();
    if (error || !data) return fail(error ?? { code: '42501' });
    if (np.backendUrl) {
      const { error: epErr } = await supabase.from('printer_endpoints').insert({ printer_id: data.id, backend_url: np.backendUrl });
      if (epErr) addToast('warning', 'Printer Added Without Address', 'The printer was saved, but its network address was rejected.');
    }
    await reload();
    addToast('success', 'Printer Added', `${data.name} (${data.id}) added to inventory.`);
    return { ok: true, data: mapPrinter(data, np.backendUrl) };
  };

  const updatePrinterMaintenance: AppContextValue['updatePrinterMaintenance'] = async (printerId, info) => {
    const { data, error } = await supabase
      .from('printers')
      .update({ maintenance_notes: info.notes.trim(), last_maintained_on: info.on, last_maintained_by: info.by.trim() })
      .eq('id', printerId)
      .select('id');
    if (error) {
      return /future/.test(error.message) ? { ok: false, error: 'Maintenance date cannot be in the future.' } : fail(error);
    }
    if (!data?.length) return fail({ code: '42501' });
    await reload();
    addToast('success', 'Maintenance Recorded', `Printer ${printerId} maintenance info saved.`);
    return { ok: true };
  };

  const toggleUserActive: AppContextValue['toggleUserActive'] = async (userId) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return { ok: false, error: 'User not found.' };
    const { error } = await supabase.rpc('set_user_active', { p_user_id: userId, p_active: !target.active });
    if (error) {
      const res = fail<void>(error);
      addToast('error', 'Could Not Update User', res.error!);
      return res;
    }
    await reload();
    addToast('info', 'User Updated', 'User account status updated.');
    return { ok: true };
  };

  /* ---------- inventory ---------- */
  const addInventoryItem: AppContextValue['addInventoryItem'] = async (item) => {
    const { data, error } = await supabase
      .from('inventory_items')
      .insert({
        category: item.category, name: item.name.trim(), material: item.material ?? null,
        quantity: item.quantity, unit: item.unit, low_stock_threshold: item.lowStockThreshold,
      })
      .select()
      .single();
    if (error || !data) return fail(error ?? { code: '42501' });
    const created = mapInventory(data);
    setInventory((prev) => [...prev, created]);
    addToast('success', 'Inventory Updated', `${created.name} added.`);
    return { ok: true, data: created };
  };

  const setInventoryQuantity: AppContextValue['setInventoryQuantity'] = async (itemId, quantity) => {
    if (!Number.isInteger(quantity) || quantity < 0) return { ok: false, error: 'Quantity must be a whole number, 0 or more.' };
    const previous = inventory;
    setInventory((prev) => prev.map((i) => (i.id === itemId ? { ...i, quantity } : i))); // optimistic
    const { data, error } = await supabase.from('inventory_items').update({ quantity }).eq('id', itemId).select().single();
    if (error || !data) {
      setInventory(previous);
      return fail(error ?? { code: '42501' });
    }
    setInventory((prev) => prev.map((i) => (i.id === itemId ? mapInventory(data) : i)));
    return { ok: true };
  };

  const removeInventoryItem: AppContextValue['removeInventoryItem'] = async (itemId) => {
    const { data, error } = await supabase.from('inventory_items').delete().eq('id', itemId).select('id');
    if (error || !data?.length) return fail(error ?? { code: '42501' });
    setInventory((prev) => prev.filter((i) => i.id !== itemId));
    addToast('info', 'Inventory Updated', 'Item removed.');
    return { ok: true };
  };

  return (
    <AppContext.Provider
      value={{
        isLive: true,
        ready: sessionLoaded && dataReady,
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
        switchRoleUser: () => addToast('info', 'Not Available', 'Role switching is only available in demo mode.'),
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
        resetDemoData: () => {},
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export default LiveProvider;
