-- =====================================================================
--  SRH Berlin 3D Printing — Supabase backend (single file, re-runnable)
--
--  Paste into Supabase Dashboard > SQL Editor > Run.   See supabase/README.md.
--
--  Security model
--   * Every table has row level security (RLS). The browser only ever holds
--     the public anon key; what a user may read/write is decided HERE.
--   * Roles live in public.profiles.role and can never be edited by a user.
--     Staff roles are granted only to the emails listed in public.staff_roles
--     AND only after that mailbox is confirmed.
--   * Request workflow (submit / review / revoke) runs through SECURITY DEFINER
--     functions that validate input, enforce the state machine, write the
--     audit log and rate-limit the caller. Tables have no direct write access.
--   * Rate limits: private.rate_limit() (per-user, per-action, fixed windows).
-- =====================================================================

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

-- ---------------------------------------------------------------------
-- 1. Reference tables
-- ---------------------------------------------------------------------
create table if not exists public.departments (name text primary key);

insert into public.departments (name) values
  ('B.Eng. Applied Mechatronic Systems'),
  ('M.Eng. Engineering & Sustainable Technology Management — Industry 4.0: Automation, Robotics & 3D Manufacturing'),
  ('M.Eng. Engineering & Sustainable Technology Management — Mobility & Automotive Industry'),
  ('M.Eng. Engineering & Sustainable Technology Management — Smart Building Technologies'),
  ('M.Eng. Engineering for Renewable Energy, Water & Waste Management'),
  ('B.Sc. / B.Eng. Business Engineering'),
  ('B.Sc. Computer Science'),
  ('M.Eng. Information Technology — Artificial Intelligence'),
  ('B.Sc. Web Development / UX-UI Design'),
  ('M.Sc. User Experience & Data-Driven Design'),
  ('M.A. Strategic Design'),
  ('M.Sc. Supply Chain Management')
on conflict do nothing;

-- Owner-managed allowlist: who becomes staff once their SRH mailbox is confirmed.
-- Edit this table in the SQL editor to add/remove staff. No API access.
create table if not exists public.staff_roles (
  email text primary key check (email = lower(email)),
  role  text not null check (role in ('PROFESSOR', 'LAB_INCHARGE'))
);

-- Single-use invitation code. Without it nobody can register a staff address, so a stranger
-- cannot pre-register (and set the password of) the approver's or lab in-charge's account.
-- Owner generates it:  update public.staff_roles set enrol_code = replace(gen_random_uuid()::text,'-','') where email = '...';
-- and hands it to that person; it is wiped the moment it is used.
alter table public.staff_roles add column if not exists enrol_code text;

insert into public.staff_roles (email, role) values
  ('ajinkya.keskar@srh-berlin.de', 'PROFESSOR'),
  ('lab.incharge@srh-berlin.de',   'LAB_INCHARGE')
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 2. Profiles (one per confirmed auth user)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id                   uuid primary key references auth.users (id) on delete cascade,
  email                text not null unique check (email = lower(email)),
  name                 text not null check (char_length(name) between 2 and 100),
  role                 text not null default 'STUDENT'
                         check (role in ('STUDENT', 'PROFESSOR', 'LAB_INCHARGE')),
  department           text references public.departments (name),
  matriculation_number text unique check (matriculation_number ~ '^[0-9]{6,10}$'),
  active               boolean not null default true,
  created_at           timestamptz not null default now(),
  constraint student_needs_matric_and_department
    check (role <> 'STUDENT' or (matriculation_number is not null and department is not null))
);

-- ---------------------------------------------------------------------
-- 3. Helpers (private schema, never exposed through the API)
-- ---------------------------------------------------------------------
create table if not exists private.rate_limits (
  key    text        not null,
  bucket timestamptz not null,
  hits   int         not null default 0,
  primary key (key, bucket)
);

create or replace function private.user_role()
returns text language sql stable security definer set search_path = '' as $$
  select p.role from public.profiles p where p.id = (select auth.uid()) and p.active
$$;

create or replace function private.is_professor()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select private.user_role()) = 'PROFESSOR', false)
$$;

create or replace function private.is_lab()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select private.user_role()) = 'LAB_INCHARGE', false)
$$;

create or replace function private.is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select private.user_role()) in ('PROFESSOR', 'LAB_INCHARGE'), false)
$$;

create or replace function private.is_student()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select private.user_role()) = 'STUDENT', false)
$$;

-- Fixed-window rate limiter. Raises SQLSTATE P0429 once p_max is exceeded.
create or replace function private.rate_limit(p_key text, p_max int, p_window interval)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_bucket timestamptz := date_bin(p_window, now(), timestamptz '2000-01-01 00:00:00+00');
  v_hits   int;
begin
  insert into private.rate_limits (key, bucket, hits)
  values (p_key, v_bucket, 1)
  on conflict (key, bucket) do update set hits = private.rate_limits.hits + 1
  returning hits into v_hits;

  if v_hits > p_max then
    raise exception 'rate_limited' using errcode = 'P0429';
  end if;

  if random() < 0.02 then   -- opportunistic cleanup
    delete from private.rate_limits where bucket < now() - interval '2 days';
  end if;
end
$$;

create or replace function private.int_or_null(p text)
returns int language sql immutable set search_path = '' as $$
  select case when p ~ '^[0-9]{1,9}$' then p::int end
$$;

-- ---------------------------------------------------------------------
-- 4. Sign-up: validate early, create the profile only after the mailbox
--    is confirmed. Staff roles are assigned only on confirmation.
-- ---------------------------------------------------------------------
create or replace function private.validate_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_email  text := lower(new.email);
  v_meta   jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_staff  text;
  v_code   text;
begin
  if v_email !~ '@([a-z0-9-]+\.)*(srh-berlin|srh)\.de$' then
    raise exception 'Please use your SRH university email address.';
  end if;
  -- one mailbox, one account: no plus-addressing (me+2@...) to multiply quotas
  if position('+' in split_part(v_email, '@', 1)) > 0 then
    raise exception 'Please use your plain SRH email address (no + part).';
  end if;
  -- With "Confirm email" switched off anyone could claim any address: fail loudly.
  if new.email_confirmed_at is not null then
    raise exception 'Sign-up requires email confirmation to be enabled.';
  end if;
  if char_length(btrim(coalesce(v_meta ->> 'name', ''))) not between 2 and 100 then
    raise exception 'Please enter your full name.';
  end if;

  select role, enrol_code into v_staff, v_code from public.staff_roles where email = v_email for update;

  if v_staff is not null then
    if v_code is null or coalesce(v_meta ->> 'enrol_code', '') <> v_code then
      raise exception 'A valid staff invitation code is required for this address.';
    end if;
    update public.staff_roles set enrol_code = null where email = v_email;   -- single use
    -- app metadata cannot be set by the caller; provision_profile insists on this flag
    new.raw_app_meta_data := coalesce(new.raw_app_meta_data, '{}'::jsonb) || '{"staff_ok": true}'::jsonb;
  else
    if coalesce(v_meta ->> 'matriculation_number', '') !~ '^[0-9]{6,10}$' then
      raise exception 'Matriculation number must be 6 to 10 digits.';
    end if;
    if not exists (select 1 from public.departments where name = v_meta ->> 'department') then
      raise exception 'Please choose your department.';
    end if;
    if exists (select 1 from public.profiles where matriculation_number = v_meta ->> 'matriculation_number') then
      raise exception 'This matriculation number is already registered.';
    end if;
  end if;
  return new;
end
$$;

create or replace function private.provision_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(new.email);
  v_meta  jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_staff text;
begin
  if new.email_confirmed_at is null then return new; end if;
  if tg_op = 'UPDATE' and old.email_confirmed_at is not null then return new; end if;
  if exists (select 1 from public.profiles where id = new.id) then return new; end if;

  -- role comes ONLY from the owner-managed allowlist, never from user metadata
  select role into v_staff from public.staff_roles where email = v_email;

  if v_staff is not null then
    -- staff profile only for accounts created with a valid invitation code
    if tg_op = 'UPDATE' and coalesce(new.raw_app_meta_data ->> 'staff_ok', '') = 'true' then
      insert into public.profiles (id, email, name, role)
      values (new.id, v_email, btrim(v_meta ->> 'name'), v_staff);
    end if;
  else
    insert into public.profiles (id, email, name, role, department, matriculation_number)
    values (new.id, v_email, btrim(v_meta ->> 'name'), 'STUDENT',
            v_meta ->> 'department', v_meta ->> 'matriculation_number');
  end if;
  return new;
end
$$;

create or replace function private.guard_email_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if lower(new.email) !~ '@([a-z0-9-]+\.)*(srh-berlin|srh)\.de$' then
    raise exception 'Please use your SRH university email address.';
  end if;
  update public.profiles set email = lower(new.email) where id = new.id;
  return new;
end
$$;

-- A staff account that is still unconfirmed must not have its password replaced (GoTrue
-- re-sign-up overwrites it) by someone who does not hold the mailbox.
create or replace function private.guard_staff_password()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.email_confirmed_at is null and exists (select 1 from public.staff_roles where email = lower(old.email)) then
    raise exception 'This staff account is waiting for confirmation. Use the link in your email.';
  end if;
  return new;
end
$$;

-- Removing someone from staff_roles also switches their account off.
create or replace function private.staff_removed()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set active = false where email = old.email and role <> 'STUDENT';
  return old;
end
$$;

drop trigger if exists on_auth_user_validate  on auth.users;
drop trigger if exists on_auth_user_password  on auth.users;
drop trigger if exists on_staff_role_removed  on public.staff_roles;
drop trigger if exists on_auth_user_provision on auth.users;
drop trigger if exists on_auth_user_email     on auth.users;

create trigger on_auth_user_validate  before insert on auth.users
  for each row execute function private.validate_new_user();
create trigger on_auth_user_provision after insert or update of email_confirmed_at on auth.users
  for each row execute function private.provision_profile();
create trigger on_auth_user_password  before update of encrypted_password on auth.users
  for each row when (old.encrypted_password is distinct from new.encrypted_password)
  execute function private.guard_staff_password();
create trigger on_staff_role_removed  after delete on public.staff_roles
  for each row execute function private.staff_removed();
create trigger on_auth_user_email     before update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function private.guard_email_change();

-- ---------------------------------------------------------------------
-- 5. Printers
-- ---------------------------------------------------------------------
create sequence if not exists public.printer_number_seq;

create table if not exists public.printers (
  id                  text primary key
                        default ('PR-' || lpad(nextval('public.printer_number_seq')::text, 2, '0'))
                        check (id ~ '^PR-[0-9]{2,9}$'),
  name                text not null check (char_length(name) between 1 and 80),
  model               text not null default '' check (char_length(model) <= 120),
  technology          text not null default 'FDM' check (technology in ('FDM', 'SLA')),
  build_volume        text not null default '' check (char_length(build_volume) <= 80),
  supported_materials text[] not null default '{PLA,PETG,ABS}'
                        check (supported_materials <@ array['PLA','PETG','ABS','ASA','PA6 CF','TPU']),
  availability_status text not null default 'Available'
                        check (availability_status in ('Available', 'In Use', 'Maintenance')),
  nozzle_diameter     text not null default '' check (char_length(nozzle_diameter) <= 80),
  layer_resolution    text not null default '' check (char_length(layer_resolution) <= 80),
  location            text not null default '' check (char_length(location) <= 120),
  illustration_key    text not null default 'prusa-mk4'
                        check (illustration_key in ('prusa-mk4', 'ultimaker-s5', 'creality-k1', 'bambu-x1e')),
  usage_restrictions  text[] not null default '{}',
  maintenance_notes   text not null default '' check (char_length(maintenance_notes) <= 2000),
  last_maintained_on  date,
  last_maintained_by  text check (char_length(last_maintained_by) <= 100)
);

-- Internal network address: staff only (students never see it).
create table if not exists public.printer_endpoints (
  printer_id  text primary key references public.printers (id) on delete cascade,
  backend_url text not null check (backend_url ~ '^https?://[^[:space:]]{1,190}$')
);

create or replace function private.printers_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.last_maintained_on is not null and new.last_maintained_on > current_date then
    raise exception 'Maintenance date cannot be in the future.';
  end if;
  return new;
end
$$;

drop trigger if exists printers_guard on public.printers;
create trigger printers_guard before insert or update on public.printers
  for each row execute function private.printers_guard();

-- ---------------------------------------------------------------------
-- 6. Requests, approvals, audit log, access grants
-- ---------------------------------------------------------------------
create sequence if not exists public.request_number_seq;

create table if not exists public.print_requests (
  id                      text primary key
                            default ('PR-' || lpad(nextval('public.request_number_seq')::text, 3, '0')),
  student_id              uuid not null references public.profiles (id),
  student_name            text not null,
  student_email           text not null,
  matriculation_number    text not null,
  project_title           text not null check (char_length(project_title) between 1 and 120),
  course_or_department    text not null references public.departments (name),
  intended_use            text not null default '' check (char_length(intended_use) <= 1000),
  contacted_approver_id   uuid references public.profiles (id),
  contacted_approver_name text not null default '',
  printer_id              text not null references public.printers (id),
  printer_name            text not null,
  material                text not null check (material in ('PLA','PETG','ABS','ASA','PA6 CF','TPU')),
  quantity                int  not null check (quantity between 1 and 50),
  file_name               text not null check (char_length(file_name) between 1 and 200),
  file_size_bytes         bigint not null check (file_size_bytes between 1 and 52428800),
  file_type               text not null check (file_type in ('STL', '3MF', 'OBJ')),
  storage_path            text check (char_length(storage_path) <= 300),
  dimensions_mm           text check (char_length(dimensions_mm) <= 60),
  preview_key             text check (char_length(preview_key) <= 40),
  triangle_count          int  check (triangle_count >= 0),
  volume_cm3              numeric check (volume_cm3 >= 0),
  status                  text not null default 'DRAFT' check (status in (
                            'DRAFT','SUBMITTED','PENDING_PROFESSOR_APPROVAL','CHANGES_REQUESTED',
                            'REJECTED_BY_PROFESSOR','APPROVED_ACCESS_GRANTED','ACCESS_REVOKED')),
  assigned_professor_id   uuid references public.profiles (id),
  assigned_professor_name text,
  submitted_at            timestamptz not null default now(),
  created_at              timestamptz not null default now()
);
create index if not exists print_requests_student_idx on public.print_requests (student_id);
create index if not exists print_requests_status_idx  on public.print_requests (status);

create table if not exists public.approvals (
  id            text primary key
                  default ('APR-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
  request_id    text not null references public.print_requests (id) on delete cascade,
  reviewer_id   uuid not null references public.profiles (id),
  reviewer_name text not null,
  reviewer_role text not null,
  decision      text not null check (decision in ('APPROVED','REJECTED','CHANGES_REQUESTED','REVOKED')),
  comments      text not null default '' check (char_length(comments) <= 1000),
  created_at    timestamptz not null default now()
);
create index if not exists approvals_request_idx on public.approvals (request_id);

-- Append-only: no policy and no privilege allows update or delete.
create table if not exists public.audit_log (
  id                    bigint generated always as identity primary key,
  request_id            text not null,
  student_name          text not null,
  project_title         text not null,
  printer_name          text not null,
  printer_id            text not null,
  material              text not null,
  approval_summary      text not null default '',
  access_summary        text not null default '',
  action                text not null,
  actor_id              uuid not null,
  actor_name            text not null,
  actor_role            text not null,
  status                text not null,
  notes                 text not null default '',
  created_at            timestamptz not null default now()
);

create table if not exists public.access_grants (
  id             text primary key
                   default ('ACC-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
  request_id     text not null references public.print_requests (id) on delete cascade,
  printer_id     text not null,
  printer_name   text not null,
  backend_url    text not null default '',
  username       text not null,
  token          text not null,
  granted_by     uuid not null references public.profiles (id),
  granted_by_name text not null,
  granted_at     timestamptz not null default now(),
  expires_at     timestamptz not null,
  revoked_at     timestamptz,
  revoked_reason text
);
create index if not exists access_grants_request_idx on public.access_grants (request_id);

create or replace function private.write_audit(
  p_req public.print_requests, p_action text, p_approval text, p_access text,
  p_actor public.profiles, p_notes text
) returns void language sql security definer set search_path = '' as $$
  insert into public.audit_log (request_id, student_name, project_title, printer_name, printer_id,
                                material, approval_summary, access_summary, action,
                                actor_id, actor_name, actor_role, status, notes)
  values (p_req.id, p_req.student_name, p_req.project_title, p_req.printer_name, p_req.printer_id,
          p_req.material, p_approval, p_access, p_action,
          p_actor.id, p_actor.name, p_actor.role, p_req.status, p_notes)
$$;

-- ---------------------------------------------------------------------
-- 7. Inventory
-- ---------------------------------------------------------------------
create table if not exists public.inventory_items (
  id                  text primary key
                        default ('INV-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  category            text not null check (category in ('FILAMENT', 'SPARE_PART')),
  name                text not null check (char_length(name) between 1 and 120),
  material            text check (material in ('PLA','PETG','ABS','ASA','PA6 CF','TPU')),
  quantity            int  not null check (quantity between 0 and 100000),
  unit                text not null default 'pcs' check (unit in ('spools', 'pcs')),
  low_stock_threshold int  not null default 1 check (low_stock_threshold between 0 and 100000),
  updated_at          timestamptz not null default now(),
  updated_by_name     text not null default ''
);

create or replace function private.inventory_stamp()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.updated_at := now();
  new.updated_by_name := coalesce((select p.name from public.profiles p where p.id = (select auth.uid())), '');
  return new;
end
$$;

create or replace function private.throttle_writes()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.rate_limit('write:' || coalesce((select auth.uid())::text, 'anon'), 300, interval '1 hour');
  if tg_op = 'DELETE' then return old; end if;
  return new;
end
$$;

drop trigger if exists inventory_stamp    on public.inventory_items;
drop trigger if exists inventory_throttle on public.inventory_items;
drop trigger if exists printers_throttle  on public.printers;
drop trigger if exists endpoints_throttle on public.printer_endpoints;
create trigger inventory_stamp    before insert or update on public.inventory_items
  for each row execute function private.inventory_stamp();
create trigger inventory_throttle before insert or update or delete on public.inventory_items
  for each row execute function private.throttle_writes();
create trigger printers_throttle  before insert or update on public.printers
  for each row execute function private.throttle_writes();
create trigger endpoints_throttle before insert or update on public.printer_endpoints
  for each row execute function private.throttle_writes();

-- ---------------------------------------------------------------------
-- 8. Workflow functions (the only way to change requests)
-- ---------------------------------------------------------------------
create or replace function private.valid_model_path(p_path text, p_uid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_path is not null
     and split_part(p_path, '/', 1) = p_uid::text
     and exists (select 1 from storage.objects o
                 where o.bucket_id = 'models' and o.name = p_path and o.owner_id = p_uid::text)
$$;

-- Upload quota: at most 20 files per hour and 150 MB in total per user. (A policy cannot
-- query its own table, hence a SECURITY DEFINER helper.)
create or replace function private.upload_quota_ok()
returns boolean language sql stable security definer set search_path = '' as $$
  select count(*) filter (where o.created_at > now() - interval '1 hour') < 20
     and coalesce(sum(coalesce((o.metadata ->> 'size')::bigint, 0)), 0) < 157286400
    from storage.objects o
   where o.bucket_id = 'models' and o.owner_id = (select auth.uid())::text
$$;

create or replace function public.create_request(
  p_payload     jsonb,
  p_draft       boolean default false,
  p_existing_id text default null
) returns public.print_requests
language plpgsql security definer set search_path = '' as $$
declare
  v_uid      uuid := (select auth.uid());
  v_me       public.profiles;
  v_printer  public.printers;
  v_approver public.profiles;
  v_row      public.print_requests;
  v_title    text := btrim(coalesce(p_payload ->> 'projectTitle', ''));
  v_dept     text := btrim(coalesce(p_payload ->> 'courseOrDepartment', ''));
  v_use      text := btrim(coalesce(p_payload ->> 'intendedUse', ''));
  v_material text := p_payload ->> 'material';
  v_qty      int  := private.int_or_null(p_payload ->> 'quantity');
  v_fname    text := btrim(coalesce(p_payload #>> '{attachment,fileName}', ''));
  v_fsize    int  := private.int_or_null(p_payload #>> '{attachment,fileSizeBytes}');
  v_ftype    text := upper(coalesce(p_payload #>> '{attachment,fileType}', ''));
  v_path     text := nullif(p_payload #>> '{attachment,storageKey}', '');
  v_status   text := case when p_draft then 'DRAFT' else 'PENDING_PROFESSOR_APPROVAL' end;
begin
  select * into v_me from public.profiles where id = v_uid and active and role = 'STUDENT';
  if not found then raise exception 'Only students can submit print requests.'; end if;
  perform private.rate_limit('create_request:' || v_uid, 20, interval '1 hour');

  if char_length(v_title) not between 1 and 120 then
    raise exception 'Print item must be 1 to 120 characters.';
  end if;
  if not exists (select 1 from public.departments where name = v_dept) then
    raise exception 'Please choose a valid course / department.';
  end if;
  if char_length(v_use) > 1000 or (not p_draft and v_use = '') then
    raise exception 'Intended use is required (max. 1000 characters).';
  end if;

  select * into v_printer from public.printers where id = p_payload ->> 'printerId';
  if not found then raise exception 'Please select a valid printer.'; end if;
  if v_material is null or not (v_material = any (v_printer.supported_materials)) then
    raise exception '% does not support the selected filament.', v_printer.name;
  end if;
  if v_qty is null or v_qty not between 1 and 50 then
    raise exception 'Quantity must be between 1 and 50.';
  end if;

  if char_length(v_fname) not between 1 and 200 or v_fname ~ '[/\\]' then
    raise exception 'Invalid 3D model file name.';
  end if;
  if v_ftype not in ('STL', '3MF', 'OBJ') then raise exception 'Only STL, 3MF and OBJ files are allowed.'; end if;
  if v_fsize is null or v_fsize not between 1 and 52428800 then
    raise exception '3D model files must be between 1 byte and 50 MB.';
  end if;
  if not p_draft and not private.valid_model_path(v_path, v_uid) then
    raise exception 'Please upload your 3D model file again.';
  end if;
  if v_path is not null and not private.valid_model_path(v_path, v_uid) then v_path := null; end if;

  select * into v_approver from public.profiles
   where role = 'PROFESSOR' and active
   order by (name = btrim(coalesce(p_payload ->> 'contactedApprover', ''))) desc, created_at
   limit 1;
  if not found and not p_draft then
    raise exception 'No approver is available yet. Please contact the lab.';
  end if;

  if p_existing_id is not null then
    select * into v_row from public.print_requests
     where id = p_existing_id and student_id = v_uid and status in ('DRAFT', 'CHANGES_REQUESTED')
     for update;
    if not found then raise exception 'Draft not found.'; end if;
    update public.print_requests set
      project_title = v_title, course_or_department = v_dept, intended_use = v_use,
      contacted_approver_id = v_approver.id, contacted_approver_name = coalesce(v_approver.name, ''),
      assigned_professor_id = v_approver.id, assigned_professor_name = v_approver.name,
      printer_id = v_printer.id, printer_name = v_printer.name, material = v_material, quantity = v_qty,
      file_name = v_fname, file_size_bytes = v_fsize, file_type = v_ftype, storage_path = v_path,
      dimensions_mm = left(p_payload #>> '{attachment,dimensionsMm}', 60),
      preview_key = left(p_payload #>> '{attachment,previewKey}', 40),
      triangle_count = private.int_or_null(p_payload #>> '{attachment,triangleCount}'),
      volume_cm3 = case when (p_payload #>> '{attachment,volumeCm3}') ~ '^[0-9]{1,9}(\.[0-9]{1,6})?$'
                        then (p_payload #>> '{attachment,volumeCm3}')::numeric end,
      status = v_status, submitted_at = now()
    where id = p_existing_id
    returning * into v_row;
  else
    insert into public.print_requests (
      student_id, student_name, student_email, matriculation_number, project_title,
      course_or_department, intended_use, contacted_approver_id, contacted_approver_name,
      printer_id, printer_name, material, quantity, file_name, file_size_bytes, file_type,
      storage_path, dimensions_mm, preview_key, triangle_count, volume_cm3, status,
      assigned_professor_id, assigned_professor_name)
    values (
      v_me.id, v_me.name, v_me.email, v_me.matriculation_number, v_title,
      v_dept, v_use, v_approver.id, coalesce(v_approver.name, ''),
      v_printer.id, v_printer.name, v_material, v_qty, v_fname, v_fsize, v_ftype,
      v_path, left(p_payload #>> '{attachment,dimensionsMm}', 60),
      left(p_payload #>> '{attachment,previewKey}', 40),
      private.int_or_null(p_payload #>> '{attachment,triangleCount}'),
      case when (p_payload #>> '{attachment,volumeCm3}') ~ '^[0-9]{1,9}(\.[0-9]{1,6})?$'
           then (p_payload #>> '{attachment,volumeCm3}')::numeric end,
      v_status, v_approver.id, v_approver.name)
    returning * into v_row;
  end if;

  if not p_draft then
    perform private.write_audit(v_row, 'REQUEST_SUBMITTED', 'Pending ' || v_row.contacted_approver_name,
      'Awaiting decision', v_me, 'Submitted request with 3D model ' || v_row.file_name || '.');
  end if;
  return v_row;
end
$$;

create or replace function public.submit_draft(p_id text)
returns public.print_requests
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_me  public.profiles;
  v_row public.print_requests;
begin
  select * into v_me from public.profiles where id = v_uid and active and role = 'STUDENT';
  if not found then raise exception 'Only the student owner can submit a draft.'; end if;
  perform private.rate_limit('create_request:' || v_uid, 20, interval '1 hour');

  select * into v_row from public.print_requests
   where id = p_id and student_id = v_uid and status in ('DRAFT', 'CHANGES_REQUESTED') for update;
  if not found then raise exception 'Only your own draft or change-requested items can be submitted.'; end if;
  if v_row.contacted_approver_id is null then raise exception 'No approver is available yet. Please contact the lab.'; end if;
  if btrim(v_row.intended_use) = '' or not private.valid_model_path(v_row.storage_path, v_uid) then
    raise exception 'Please complete the form and upload your 3D model before submitting.';
  end if;

  update public.print_requests set status = 'PENDING_PROFESSOR_APPROVAL', submitted_at = now()
   where id = p_id returning * into v_row;
  perform private.write_audit(v_row, 'REQUEST_SUBMITTED', 'Pending ' || v_row.contacted_approver_name,
    'Awaiting decision', v_me, 'Student submitted request for review.');
  return v_row;
end
$$;

create or replace function public.review_request(
  p_id          text,
  p_decision    text,
  p_comments    text default '',
  p_printer_id  text default null,
  p_valid_until date default null
) returns public.print_requests
language plpgsql security definer set search_path = '' as $$
declare
  v_uid      uuid := (select auth.uid());
  v_me       public.profiles;
  v_req      public.print_requests;
  v_printer  public.printers;
  v_comments text := btrim(coalesce(p_comments, ''));
  v_next     text;
  v_expires  timestamptz;
  v_url      text;
begin
  select * into v_me from public.profiles where id = v_uid and active and role = 'PROFESSOR';
  if not found then raise exception 'Only the approver can review requests.'; end if;
  perform private.rate_limit('review:' || v_uid, 120, interval '1 hour');

  if p_decision not in ('APPROVED', 'REJECTED', 'CHANGES_REQUESTED') then
    raise exception 'Invalid decision.';
  end if;
  if char_length(v_comments) > 1000 then raise exception 'Comments are limited to 1000 characters.'; end if;
  if p_decision <> 'APPROVED' and v_comments = '' then
    raise exception 'Please give a clear reason when rejecting or requesting changes.';
  end if;

  select * into v_req from public.print_requests where id = p_id for update;
  if not found or v_req.status = 'DRAFT' then raise exception 'Request not found.'; end if;
  if v_req.status <> 'PENDING_PROFESSOR_APPROVAL' then
    raise exception 'Request #% is % and cannot be reviewed.', v_req.id, v_req.status;
  end if;
  if v_req.contacted_approver_id is not null and v_req.contacted_approver_id <> v_uid then
    raise exception 'Request #% was sent to another approver.', v_req.id;
  end if;

  v_next := case p_decision when 'APPROVED' then 'APPROVED_ACCESS_GRANTED'
                            when 'REJECTED' then 'REJECTED_BY_PROFESSOR'
                            else 'CHANGES_REQUESTED' end;

  select * into v_printer from public.printers where id = coalesce(p_printer_id, v_req.printer_id);
  if not found then raise exception 'Printer not found.'; end if;

  if p_decision = 'APPROVED' then
    if not (v_req.material = any (v_printer.supported_materials)) then
      raise exception '% does not support %.', v_printer.name, v_req.material;
    end if;
    if p_valid_until is not null and (p_valid_until < current_date or p_valid_until > current_date + 90) then
      raise exception 'Access end date must be within the next 90 days.';
    end if;
  end if;

  insert into public.approvals (request_id, reviewer_id, reviewer_name, reviewer_role, decision, comments)
  values (v_req.id, v_uid, v_me.name, v_me.role, p_decision,
          case when v_comments = '' then 'Approved for academic project. Suitable material and printer.'
               else v_comments end);

  update public.print_requests set
    status = v_next,
    printer_id   = case when p_decision = 'APPROVED' then v_printer.id else printer_id end,
    printer_name = case when p_decision = 'APPROVED' then v_printer.name else printer_name end,
    assigned_professor_id = v_uid, assigned_professor_name = v_me.name
  where id = v_req.id returning * into v_req;

  if p_decision = 'APPROVED' then
    v_expires := coalesce(((p_valid_until + 1)::timestamp - interval '1 minute') at time zone 'Europe/Berlin',
                          now() + interval '7 days');
    select backend_url into v_url from public.printer_endpoints where printer_id = v_printer.id;
    delete from public.access_grants where request_id = v_req.id;
    insert into public.access_grants (request_id, printer_id, printer_name, backend_url, username, token,
                                      granted_by, granted_by_name, expires_at)
    values (v_req.id, v_printer.id, v_printer.name || ' (' || v_printer.id || ')', coalesce(v_url, ''),
            'student_' || lower(regexp_replace(v_req.id, '[^a-zA-Z0-9]', '', 'g')),
            'SRH-' || v_printer.id || '-' || v_req.id || '-' ||
              upper(substr(replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''), 1, 24)),
            v_uid, v_me.name, v_expires);
  end if;

  perform private.write_audit(v_req,
    case p_decision when 'APPROVED' then 'PROFESSOR_APPROVED' when 'REJECTED' then 'PROFESSOR_REJECTED'
                    else 'PROFESSOR_REQUESTED_CHANGES' end,
    initcap(replace(lower(p_decision), '_', ' ')) || ' by ' || v_me.name || ' (' || to_char(now(), 'DD Mon YYYY') || ')',
    case p_decision when 'APPROVED' then 'Access granted on ' || v_printer.name
                    when 'REJECTED' then 'Rejected, no access granted' else 'Returned to student' end,
    v_me, case when v_comments = '' then 'Approved.' else v_comments end);
  return v_req;
end
$$;

create or replace function public.revoke_access(p_id text, p_reason text)
returns public.print_requests
language plpgsql security definer set search_path = '' as $$
declare
  v_uid    uuid := (select auth.uid());
  v_me     public.profiles;
  v_req    public.print_requests;
  v_reason text := btrim(coalesce(p_reason, ''));
begin
  select * into v_me from public.profiles where id = v_uid and active and role = 'PROFESSOR';
  if not found then raise exception 'Only the approver can revoke printer access.'; end if;
  perform private.rate_limit('review:' || v_uid, 120, interval '1 hour');
  if v_reason = '' or char_length(v_reason) > 500 then
    raise exception 'Please give a reason for revoking access (max. 500 characters).';
  end if;

  select * into v_req from public.print_requests where id = p_id for update;
  if not found or v_req.status <> 'APPROVED_ACCESS_GRANTED' then
    raise exception 'Request does not currently have active access.';
  end if;

  update public.print_requests set status = 'ACCESS_REVOKED' where id = v_req.id returning * into v_req;
  update public.access_grants set revoked_at = now(), revoked_reason = v_reason where request_id = v_req.id;
  insert into public.approvals (request_id, reviewer_id, reviewer_name, reviewer_role, decision, comments)
  values (v_req.id, v_uid, v_me.name, v_me.role, 'REVOKED', v_reason);
  perform private.write_audit(v_req, 'ACCESS_REVOKED',
    'Approved by ' || coalesce(v_req.assigned_professor_name, v_me.name),
    'Revoked by ' || v_me.name || ' (' || to_char(now(), 'DD Mon YYYY') || ')', v_me, 'Access revoked: ' || v_reason);
  return v_req;
end
$$;

create or replace function public.set_user_active(p_user_id uuid, p_active boolean)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid());
begin
  if not private.is_professor() then raise exception 'Only the approver can manage user accounts.'; end if;
  perform private.rate_limit('write:' || v_uid, 300, interval '1 hour');
  if p_user_id = v_uid then raise exception 'You cannot deactivate your own account.'; end if;
  update public.profiles set active = p_active where id = p_user_id;
  if not found then raise exception 'User not found.'; end if;
end
$$;

-- Login guard counters, used only by the `login` edge function (service role).
-- hit() is atomic and returns the new count; release() undoes one hit after a good login.
drop function if exists public.login_guard_count(text, interval);
drop function if exists public.login_guard_hit(text, interval);
create or replace function public.login_guard_hit(p_key text, p_window interval)
returns int language plpgsql security definer set search_path = '' as $$
declare v_hits int;
begin
  insert into private.rate_limits (key, bucket, hits)
  values (p_key, date_bin(p_window, now(), timestamptz '2000-01-01 00:00:00+00'), 1)
  on conflict (key, bucket) do update set hits = private.rate_limits.hits + 1
  returning hits into v_hits;
  if random() < 0.02 then
    delete from private.rate_limits where bucket < now() - interval '2 days';
  end if;
  return v_hits;
end
$$;

create or replace function public.login_guard_release(p_key text, p_window interval)
returns void language sql security definer set search_path = '' as $$
  update private.rate_limits set hits = greatest(hits - 1, 0)
   where key = p_key and bucket = date_bin(p_window, now(), timestamptz '2000-01-01 00:00:00+00')
$$;

-- ---------------------------------------------------------------------
-- 9. Row level security
-- ---------------------------------------------------------------------
alter table public.departments       enable row level security;
alter table public.staff_roles       enable row level security;
alter table public.profiles          enable row level security;
alter table public.printers          enable row level security;
alter table public.printer_endpoints enable row level security;
alter table public.print_requests    enable row level security;
alter table public.approvals         enable row level security;
alter table public.audit_log         enable row level security;
alter table public.access_grants     enable row level security;
alter table public.inventory_items   enable row level security;
alter table private.rate_limits      enable row level security;

drop policy if exists departments_read on public.departments;
create policy departments_read on public.departments for select to authenticated using (true);

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select private.is_professor()));

drop policy if exists printers_read   on public.printers;
drop policy if exists printers_insert on public.printers;
drop policy if exists printers_update on public.printers;
create policy printers_read   on public.printers for select to authenticated using (true);
create policy printers_insert on public.printers for insert to authenticated with check ((select private.is_staff()));
create policy printers_update on public.printers for update to authenticated
  using ((select private.is_staff())) with check ((select private.is_staff()));

drop policy if exists endpoints_read   on public.printer_endpoints;
drop policy if exists endpoints_insert on public.printer_endpoints;
drop policy if exists endpoints_update on public.printer_endpoints;
create policy endpoints_read   on public.printer_endpoints for select to authenticated using ((select private.is_staff()));
create policy endpoints_insert on public.printer_endpoints for insert to authenticated with check ((select private.is_staff()));
create policy endpoints_update on public.printer_endpoints for update to authenticated
  using ((select private.is_staff())) with check ((select private.is_staff()));

drop policy if exists requests_read on public.print_requests;
create policy requests_read on public.print_requests for select to authenticated
  using (
    (student_id = (select auth.uid()) and (select private.is_student()))
    or ((select private.is_professor()) and status <> 'DRAFT'));

drop policy if exists approvals_read on public.approvals;
create policy approvals_read on public.approvals for select to authenticated
  using (exists (select 1 from public.print_requests r where r.id = request_id));

drop policy if exists audit_read on public.audit_log;
create policy audit_read on public.audit_log for select to authenticated using ((select private.is_professor()));

drop policy if exists grants_read on public.access_grants;
create policy grants_read on public.access_grants for select to authenticated
  using (exists (select 1 from public.print_requests r where r.id = request_id));

drop policy if exists inventory_read   on public.inventory_items;
drop policy if exists inventory_insert on public.inventory_items;
drop policy if exists inventory_update on public.inventory_items;
drop policy if exists inventory_delete on public.inventory_items;
create policy inventory_read   on public.inventory_items for select to authenticated using ((select private.is_staff()));
create policy inventory_insert on public.inventory_items for insert to authenticated with check ((select private.is_lab()));
create policy inventory_update on public.inventory_items for update to authenticated
  using ((select private.is_lab())) with check ((select private.is_lab()));
create policy inventory_delete on public.inventory_items for delete to authenticated using ((select private.is_lab()));

-- ---------------------------------------------------------------------
-- 10. Privileges (defence in depth on top of RLS)
-- ---------------------------------------------------------------------
revoke all on all tables    in schema public  from anon, authenticated;
revoke all on all sequences in schema public  from anon, authenticated;
revoke all on all tables    in schema private from anon, authenticated;
revoke all on all functions in schema private from public, anon;
revoke all on all functions in schema public  from public, anon, authenticated;

grant select on public.departments, public.profiles, public.printers, public.printer_endpoints,
                public.print_requests, public.approvals, public.audit_log, public.access_grants,
                public.inventory_items to authenticated;
grant insert, update on public.printers, public.printer_endpoints to authenticated;
grant insert, update, delete on public.inventory_items to authenticated;
grant usage on sequence public.printer_number_seq to authenticated;

-- RLS helpers + trigger helpers must be callable by the roles that evaluate policies
grant execute on function private.user_role(), private.is_professor(), private.is_lab(),
                          private.is_staff(), private.is_student(), private.rate_limit(text, int, interval),
                          private.int_or_null(text), private.valid_model_path(text, uuid),
                          private.inventory_stamp(), private.throttle_writes(), private.printers_guard(),
                          private.upload_quota_ok()
  to authenticated, service_role;

grant execute on function public.create_request(jsonb, boolean, text),
                          public.submit_draft(text),
                          public.review_request(text, text, text, text, date),
                          public.revoke_access(text, text),
                          public.set_user_active(uuid, boolean)
  to authenticated;
grant execute on function public.login_guard_hit(text, interval),
                          public.login_guard_release(text, interval)
  to service_role;

-- Objects created later in `public` must not be open to the API roles by default.
alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from public, anon, authenticated;

grant all on all tables in schema public to service_role;

-- ---------------------------------------------------------------------
-- 11. Storage: private bucket for 3D models
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('models', 'models', false, 52428800, array['application/octet-stream'])
on conflict (id) do update
  set public = false, file_size_limit = 52428800, allowed_mime_types = array['application/octet-stream'];

drop policy if exists models_insert on storage.objects;
drop policy if exists models_select on storage.objects;

-- Students may add files only inside their own folder, only .stl/.3mf/.obj,
-- and at most 20 uploads per hour. Nobody can update or delete through the API.
create policy models_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'models'
    and (select private.is_student())
    and split_part(name, '/', 1) = (select auth.uid())::text
    and name ~* '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,120}\.(stl|3mf|obj)$'
    and (select private.upload_quota_ok())
  );

create policy models_select on storage.objects for select to authenticated
  using (
    bucket_id = 'models'
    and (split_part(name, '/', 1) = (select auth.uid())::text or (select private.is_professor()))
  );

-- ---------------------------------------------------------------------
-- 12. Seed data (printers, endpoints, inventory) — only when empty
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from public.printers) then
    insert into public.printers (id, name, model, technology, build_volume, supported_materials,
                                 nozzle_diameter, layer_resolution, location, illustration_key,
                                 usage_restrictions, maintenance_notes, last_maintained_on, last_maintained_by)
    select 'PR-0' || n, 'Bambu P1P - ' || nm, 'Bambu Lab P1P (open frame)', 'FDM', '256 × 256 × 256 mm',
           array['PLA','PETG','ABS','ASA','PA6 CF','TPU'], '0.4 mm Stainless Steel', '0.08 – 0.28 mm',
           'SRH Berlin MakerLab', 'bambu-x1e',
           array['Open frame: ABS / ASA may warp, prefer the X1C or a Voron for these',
                 'PA6 CF needs a hardened steel nozzle, confirm with lab staff first'],
           '', null, null
    from (values (1, '528'), (2, '537'), (3, '623'), (4, '763')) as t(n, nm);

    insert into public.printers (id, name, model, technology, build_volume, supported_materials,
                                 nozzle_diameter, layer_resolution, location, illustration_key, usage_restrictions)
    values ('PR-05', 'Bambu X1C', 'Bambu Lab X1 Carbon (enclosed)', 'FDM', '256 × 256 × 256 mm',
            array['PLA','PETG','ABS','ASA','PA6 CF','TPU'], '0.4 mm Hardened Steel', '0.08 – 0.28 mm',
            'SRH Berlin MakerLab', 'bambu-x1e',
            array['Enclosed with hardened steel nozzle: suitable for ABS / ASA / PA6 CF',
                  'Check AMS desiccant before long prints']),
           ('PR-09', 'Form Labs - Form 3', 'Formlabs Form 3 (resin)', 'SLA', '145 × 145 × 185 mm',
            array['PLA','PETG','ABS','ASA','PA6 CF','TPU'], 'N/A (85 µm laser spot)', '0.025 – 0.30 mm',
            'SRH Berlin MakerLab', 'ultimaker-s5',
            array['Resin printer: filament choice does not apply, confirm resin with lab staff',
                  'Wear nitrile gloves; wash and cure parts after printing']);

    insert into public.printers (id, name, model, technology, build_volume, supported_materials,
                                 nozzle_diameter, layer_resolution, location, illustration_key, usage_restrictions)
    select 'PR-0' || n, 'Voron 2.4 - ' || (n - 5), 'Voron 2.4 CoreXY (enclosed)', 'FDM',
           '250 / 300 / 350 mm cube (build-dependent)',
           array['PLA','PETG','ABS','ASA','PA6 CF','TPU'], '0.4 mm', '0.08 – 0.28 mm',
           'SRH Berlin MakerLab', 'creality-k1',
           array['Enclosed CoreXY: suited to ABS / ASA, let the chamber heat-soak first']
    from generate_series(6, 8) as n;

    perform setval('public.printer_number_seq', 9);

    -- Replace the example addresses with the real lab network addresses.
    insert into public.printer_endpoints (printer_id, backend_url)
    select id, 'http://192.168.1.' || (20 + right(id, 2)::int) from public.printers;
  end if;

  if not exists (select 1 from public.inventory_items) then
    insert into public.inventory_items (category, name, material, quantity, unit, low_stock_threshold) values
      ('FILAMENT',   'PLA — Black',  'PLA',    6, 'spools', 2),
      ('FILAMENT',   'PLA — White',  'PLA',    4, 'spools', 2),
      ('FILAMENT',   'PETG — Black', 'PETG',   3, 'spools', 2),
      ('FILAMENT',   'PETG — Grey',  'PETG',   1, 'spools', 2),
      ('FILAMENT',   'ABS — Black',  'ABS',    2, 'spools', 1),
      ('FILAMENT',   'ASA — White',  'ASA',    0, 'spools', 1),
      ('FILAMENT',   'PA6 CF — Black', 'PA6 CF', 1, 'spools', 1),
      ('FILAMENT',   'TPU — Blue',   'TPU',    2, 'spools', 1),
      ('SPARE_PART', '0.4 mm brass nozzle',           null, 10, 'pcs', 3),
      ('SPARE_PART', '0.4 mm hardened steel nozzle',  null,  2, 'pcs', 2),
      ('SPARE_PART', 'PEI build plate 256 mm',        null,  2, 'pcs', 1),
      ('SPARE_PART', 'Glue stick',                    null,  5, 'pcs', 2);
  end if;
end
$$;
