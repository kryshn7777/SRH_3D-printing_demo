// Runs supabase/schema.sql in an in-process Postgres (PGlite) with stubbed Supabase
// auth/storage, then checks the security rules as different roles.
//   npm run test:db
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const schema = readFileSync(join(here, '..', 'schema.sql'), 'utf8');
const db = new PGlite();

await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (
    id uuid primary key default gen_random_uuid(), email text,
    raw_user_meta_data jsonb, raw_app_meta_data jsonb default '{}'::jsonb,
    encrypted_password text default 'pw-initial', email_confirmed_at timestamptz);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean,
    file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(),
    bucket_id text, name text, owner_id text, created_at timestamptz default now(),
    metadata jsonb default '{}'::jsonb);
  alter table storage.objects enable row level security;
  grant usage on schema storage to authenticated, service_role;
  grant select, insert, update, delete on storage.objects to authenticated;
`);
await db.exec(schema);
await db.exec(schema); // must be re-runnable

let passed = 0;
const test = async (name, fn) => {
  try { await fn(); passed++; console.log('  ok  ', name); }
  catch (e) { console.error('  FAIL', name, '\n      ', e.message); process.exitCode = 1; }
};
const rejects = async (p, re) => {
  let err; try { await p; } catch (e) { err = e; }
  assert.ok(err, 'expected an error');
  if (re) assert.match(err.message, re);
};
const as = async (uid, role, sql, params) => {
  await db.exec('reset role');
  if (role) await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid ?? '']);
  if (role) await db.exec(`set role ${role}`);
  try { return await db.query(sql, params); } finally { await db.exec('reset role'); }
};
const signUp = (email, meta, confirmed = false) =>
  db.query(
    `insert into auth.users (email, raw_user_meta_data, email_confirmed_at)
     values ($1, $2::jsonb, ${confirmed ? 'now()' : 'null'}) returning id`,
    [email, JSON.stringify(meta)]
  ).then((r) => r.rows[0].id);
const confirm = (id) => db.query(`update auth.users set email_confirmed_at = now() where id = $1`, [id]);
const student = (n, matric) => ({
  name: `Student ${n}`, matriculation_number: matric,
  department: 'B.Eng. Applied Mechatronic Systems',
});
const payload = (path, over = {}) => JSON.stringify({
  projectTitle: 'Bracket', courseOrDepartment: 'B.Eng. Applied Mechatronic Systems',
  intendedUse: 'Test', contactedApprover: 'Prof Keskar', printerId: 'PR-01', material: 'PLA',
  quantity: 1, attachment: { fileName: 'a.stl', fileSizeBytes: 1000, fileType: 'STL', storageKey: path }, ...over,
});

console.log('sign-up rules');
await test('rejects non-SRH email', () =>
  rejects(signUp('x@gmail.com', student(0, '100000001')), /SRH university email/));
await test('rejects student without matriculation number', () =>
  rejects(signUp('nomatric@srh-berlin.de', { name: 'No Matric', department: 'B.Sc. Computer Science' }), /Matriculation/));
await test('rejects unknown department', () =>
  rejects(signUp('dep@srh-berlin.de', { ...student(0, '100000002'), department: 'Hacking' }), /department/));

const s1 = await signUp('s1@srh-berlin.de', { ...student(1, '100000011'), role: 'PROFESSOR' });
const s2 = await signUp('s2@srh-berlin.de', student(2, '100000012'));
await test('no profile before the mailbox is confirmed', async () => {
  const r = await db.query('select count(*)::int c from public.profiles where id = $1', [s1]);
  assert.equal(r.rows[0].c, 0);
});
await confirm(s1); await confirm(s2);
await test('confirmed student is a STUDENT even if metadata asks for PROFESSOR', async () => {
  const r = await db.query('select role from public.profiles where id = $1', [s1]);
  assert.equal(r.rows[0].role, 'STUDENT');
});
await test('duplicate matriculation number rejected', () =>
  rejects(signUp('dup@srh-berlin.de', student(3, '100000011')), /already registered/));
await test('any auto-confirmed sign-up is refused (Confirm email misconfigured)', async () => {
  await rejects(signUp('ajinkya.keskar@srh-berlin.de', { name: 'Imposter' }, true), /requires email confirmation/);
  await rejects(signUp('auto@srh-berlin.de', student(4, '100000014'), true), /requires email confirmation/);
});
await test('plus-addressing rejected', () =>
  rejects(signUp('s1+2@srh-berlin.de', student(5, '100000015')), /plain SRH email/));
await test('staff address cannot be pre-registered without the invitation code', async () => {
  await rejects(signUp('ajinkya.keskar@srh-berlin.de', { name: 'Imposter' }), /invitation code/);
  await rejects(signUp('ajinkya.keskar@srh-berlin.de', { name: 'Imposter', enrol_code: 'guess' }), /invitation code/);
  await rejects(signUp('ajinkya.keskar@srh-berlin.de', { name: 'Imposter', enrol_code: '' }), /invitation code/);
});
await db.exec(`update public.staff_roles set enrol_code = 'code-prof' where role = 'PROFESSOR';
               update public.staff_roles set enrol_code = 'code-lab'  where role = 'LAB_INCHARGE';`);
const prof = await signUp('ajinkya.keskar@srh-berlin.de', { name: 'Prof Keskar', enrol_code: 'code-prof' });
await test('invitation code is single use', async () => {
  await rejects(signUp('ajinkya.keskar@srh-berlin.de', { name: 'Imposter', enrol_code: 'code-prof' }), /invitation code/);
});
await test('unconfirmed staff password cannot be overwritten (GoTrue re-sign-up)', async () => {
  await rejects(db.query(`update auth.users set encrypted_password = 'attacker' where id = $1`, [prof]), /waiting for confirmation/);
});
await confirm(prof);
const lab = await signUp('lab.incharge@srh-berlin.de', { name: 'Lab Person', enrol_code: 'code-lab' });
await confirm(lab);
await test('confirmed staff can change password later', async () => {
  await db.query(`update auth.users set encrypted_password = 'new-pw' where id = $1`, [prof]);
});
await test('staff roles come from the allowlist on confirmation', async () => {
  const r = await db.query(`select email, role from public.profiles where id in ($1,$2) order by email`, [prof, lab]);
  assert.deepEqual(r.rows.map((x) => x.role), ['PROFESSOR', 'LAB_INCHARGE']);
});
await test('email cannot be changed to a non-SRH address', () =>
  rejects(db.query(`update auth.users set email = 'evil@gmail.com' where id = $1`, [s1]), /SRH university email/));

console.log('row level security');
await test('anon cannot read anything', () => rejects(as(null, 'anon', 'select * from public.printers'), /permission denied/));
await test('student sees printers but no endpoints', async () => {
  assert.ok((await as(s1, 'authenticated', 'select * from public.printers')).rows.length >= 9);
  assert.equal((await as(s1, 'authenticated', 'select * from public.printer_endpoints')).rows.length, 0);
});
await test('student cannot change own role or any profile', () =>
  rejects(as(s1, 'authenticated', `update public.profiles set role = 'PROFESSOR' where id = '${s1}'`), /permission denied/));
await test('student cannot write audit log or approvals', async () => {
  await rejects(as(s1, 'authenticated', `insert into public.audit_log (request_id,student_name,project_title,printer_name,printer_id,material,action,actor_id,actor_name,actor_role,status) values ('x','x','x','x','x','x','x','${s1}','x','x','x')`), /permission denied/);
  await rejects(as(s1, 'authenticated', `delete from public.approvals`), /permission denied/);
});
await test('student cannot edit printers (0 rows) or inventory', async () => {
  const r = await as(s1, 'authenticated', `update public.printers set availability_status = 'Maintenance' returning id`);
  assert.equal(r.rows.length, 0);
  assert.equal((await as(s1, 'authenticated', 'select * from public.inventory_items')).rows.length, 0);
});
await test('student cannot call reviewer functions', async () => {
  await rejects(as(s1, 'authenticated', `select public.review_request('PR-001','APPROVED')`), /Only the approver/);
  await rejects(as(s1, 'authenticated', `select public.set_user_active('${s2}', false)`), /Only the approver/);
});
await test('login guard functions are not callable by users', () =>
  rejects(as(s1, 'authenticated', `select public.login_guard_hit('k', '10 minutes')`), /permission denied/));
await test('professor and lab can edit printers incl. maintenance', async () => {
  const a = await as(lab, 'authenticated', `update public.printers set maintenance_notes = 'Greased rods', last_maintained_on = current_date, last_maintained_by = 'Lab' where id = 'PR-01' returning id`);
  assert.equal(a.rows.length, 1);
  const b = await as(prof, 'authenticated', `update public.printers set availability_status = 'In Use' where id = 'PR-02' returning id`);
  assert.equal(b.rows.length, 1);
  await rejects(as(lab, 'authenticated', `update public.printers set last_maintained_on = current_date + 3 where id = 'PR-01'`), /future/);
});
await test('inventory: only lab in-charge writes; staff read', async () => {
  const ins = await as(lab, 'authenticated', `insert into public.inventory_items (category,name,quantity,unit) values ('SPARE_PART','Fan',3,'pcs') returning id, updated_by_name`);
  assert.equal(ins.rows[0].updated_by_name, 'Lab Person');
  await rejects(as(prof, 'authenticated', `insert into public.inventory_items (category,name,quantity,unit) values ('SPARE_PART','X',1,'pcs')`), /row-level security/);
  await rejects(as(lab, 'authenticated', `insert into public.inventory_items (category,name,quantity,unit) values ('SPARE_PART','Neg',-1,'pcs')`), /check/);
  assert.ok((await as(prof, 'authenticated', 'select * from public.inventory_items')).rows.length > 0);
});

console.log('storage rules');
const own = (u, f = 'part.stl') => `${u}/${f}`;
const putObj = (u, name) => as(u, 'authenticated',
  `insert into storage.objects (bucket_id, name, owner_id) values ('models', $1, $2)`, [name, u]);
await test('student can upload into own folder only', async () => {
  await putObj(s1, own(s1));
  await rejects(putObj(s1, own(s2)), /row-level security/);
});
await test('wrong extension / path tricks rejected', async () => {
  await rejects(putObj(s1, own(s1, 'virus.exe')), /row-level security/);
  await rejects(putObj(s1, `${s1}/../${s2}/x.stl`), /row-level security/);
  await rejects(putObj(s1, `${s1}/sub/x.stl`), /row-level security/);
});
await test('staff cannot upload; professor can read all, other students cannot', async () => {
  await rejects(putObj(prof, own(prof)), /row-level security/);
  const r = await as(prof, 'authenticated', `select name from storage.objects where bucket_id = 'models'`);
  assert.equal(r.rows.length, 1);
  assert.equal((await as(s2, 'authenticated', `select name from storage.objects`)).rows.length, 0);
});
await test('upload quota: 20 per hour', async () => {
  for (let i = 0; i < 20; i++) await putObj(s2, own(s2, `f${i}.stl`));
  await rejects(putObj(s2, own(s2, 'one-too-many.stl')), /row-level security/);
});

const s3 = await signUp('s3@srh-berlin.de', student(6, '100000016'));
await confirm(s3);
await test('upload quota: 150 MB total per user', async () => {
  await db.query(`insert into storage.objects (bucket_id, name, owner_id, created_at, metadata)
                  values ('models', $1, $2, now() - interval '3 hours', '{"size": 157286400}')`, [own(s3, 'old-big.stl'), s3]);
  await rejects(putObj(s3, own(s3, 'next.stl')), /row-level security/);
});

console.log('request workflow');
let reqId;
await test('student submits a request (needs a real uploaded file)', async () => {
  await rejects(as(s1, 'authenticated', `select public.create_request($1::jsonb)`, [payload(own(s1, 'missing.stl'))]), /upload your 3D model/);
  const r = await as(s1, 'authenticated', `select (public.create_request($1::jsonb)).id as id`, [payload(own(s1))]);
  reqId = r.rows[0].id;
  assert.match(reqId, /^PR-\d{3}$/);
});
await test('input validation: quantity, printer material, department', async () => {
  await rejects(as(s1, 'authenticated', `select public.create_request($1::jsonb, true)`, [payload(null, { quantity: 99 })]), /Quantity/);
  await rejects(as(s1, 'authenticated', `select public.create_request($1::jsonb, true)`, [payload(null, { courseOrDepartment: 'Nope' })]), /course/);
  await rejects(as(s1, 'authenticated', `select public.create_request($1::jsonb, true)`, [payload(null, { printerId: 'PR-99' })]), /valid printer/);
});
await test("students only see their own requests; professor sees submitted ones", async () => {
  assert.equal((await as(s2, 'authenticated', 'select * from public.print_requests')).rows.length, 0);
  assert.equal((await as(s1, 'authenticated', 'select * from public.print_requests where id = $1', [reqId])).rows.length, 1);
  assert.equal((await as(prof, 'authenticated', 'select * from public.print_requests where id = $1', [reqId])).rows.length, 1);
});
await test('reject / changes need a reason; lab in-charge cannot review', async () => {
  await rejects(as(prof, 'authenticated', `select public.review_request($1,'REJECTED','')`, [reqId]), /clear reason/);
  await rejects(as(lab, 'authenticated', `select public.review_request($1,'APPROVED')`, [reqId]), /Only the approver/);
});
await test('approval grants access and issues a token only the owner/professor can read', async () => {
  const r = await as(prof, 'authenticated', `select (public.review_request($1,'APPROVED','ok','PR-05', current_date + 3)).status as s`, [reqId]);
  assert.equal(r.rows[0].s, 'APPROVED_ACCESS_GRANTED');
  const g = await as(s1, 'authenticated', 'select token, username, backend_url, printer_id from public.access_grants where request_id = $1', [reqId]);
  assert.equal(g.rows.length, 1);
  assert.match(g.rows[0].token, /^SRH-PR-05-/);
  assert.equal(g.rows[0].backend_url, 'http://192.168.1.25');
  assert.equal((await as(s2, 'authenticated', 'select * from public.access_grants')).rows.length, 0);
});
await test('state machine: cannot review twice; audit trail written', async () => {
  await rejects(as(prof, 'authenticated', `select public.review_request($1,'REJECTED','late')`, [reqId]), /cannot be reviewed/);
  const a = await as(prof, 'authenticated', 'select action from public.audit_log where request_id = $1 order by id', [reqId]);
  assert.deepEqual(a.rows.map((x) => x.action), ['REQUEST_SUBMITTED', 'PROFESSOR_APPROVED']);
  assert.equal((await as(s1, 'authenticated', 'select * from public.audit_log')).rows.length, 0);
});
await test('audit log is append-only', async () => {
  await rejects(as(prof, 'authenticated', `update public.audit_log set notes = 'x'`), /permission denied/);
  await rejects(as(prof, 'authenticated', `delete from public.audit_log`), /permission denied/);
});
await test('revoke needs the approver and a reason', async () => {
  await rejects(as(s1, 'authenticated', `select public.revoke_access($1,'x')`, [reqId]), /Only the approver/);
  await rejects(as(prof, 'authenticated', `select public.revoke_access($1,'')`, [reqId]), /reason/);
  const r = await as(prof, 'authenticated', `select (public.revoke_access($1,'safety')).status as s`, [reqId]);
  assert.equal(r.rows[0].s, 'ACCESS_REVOKED');
  const g = await as(s1, 'authenticated', 'select revoked_reason from public.access_grants where request_id = $1', [reqId]);
  assert.equal(g.rows[0].revoked_reason, 'safety');
});
await test('draft can be submitted later; other students cannot touch it', async () => {
  const d = await as(s1, 'authenticated', `select (public.create_request($1::jsonb, true)).id as id`, [payload(own(s1))]);
  await rejects(as(s2, 'authenticated', `select public.submit_draft($1)`, [d.rows[0].id]), /own draft/);
  const r = await as(s1, 'authenticated', `select (public.submit_draft($1)).status as s`, [d.rows[0].id]);
  assert.equal(r.rows[0].s, 'PENDING_PROFESSOR_APPROVAL');
});

console.log('abuse protection');
await test('rate limit on request creation (20 per hour)', async () => {
  await db.exec(`delete from private.rate_limits`);
  for (let i = 0; i < 20; i++) await as(s2, 'authenticated', `select public.create_request($1::jsonb, true)`, [payload(null)]);
  await rejects(as(s2, 'authenticated', `select public.create_request($1::jsonb, true)`, [payload(null)]), /rate_limited/);
});
await test('deactivating a user cuts access at once; cannot deactivate yourself', async () => {
  await rejects(as(prof, 'authenticated', `select public.set_user_active('${prof}', false)`), /own account/);
  await as(prof, 'authenticated', `select public.set_user_active('${s1}', false)`);
  await rejects(as(s1, 'authenticated', `select public.create_request($1::jsonb, true)`, [payload(null)]), /Only students/);
  assert.equal((await as(s1, 'authenticated', 'select * from public.print_requests')).rows.length, 0);
});
await test('login guard: atomic hit returns the new count; release undoes one', async () => {
  const hit = async () => (await as(null, 'service_role', `select public.login_guard_hit('id:100000011', '15 minutes') as n`)).rows[0].n;
  assert.equal(await hit(), 1);
  assert.equal(await hit(), 2);
  await as(null, 'service_role', `select public.login_guard_release('id:100000011', '15 minutes')`);
  assert.equal(await hit(), 2);
  await rejects(as(s1, 'authenticated', `select public.login_guard_release('k', '10 minutes')`), /permission denied/);
});
await test('removing someone from staff_roles switches their account off', async () => {
  await db.exec(`delete from public.staff_roles where role = 'LAB_INCHARGE'`);
  const r = await db.query('select active from public.profiles where id = $1', [lab]);
  assert.equal(r.rows[0].active, false);
  const st = await db.query(`select active from public.profiles where id = $1`, [s2]);
  assert.equal(st.rows[0].active, true);
});

console.log(`\n${passed} passed${process.exitCode ? ' — SOME FAILED' : ''}`);
