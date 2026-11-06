// Edge function: log in with a matriculation number (students) or an SRH email (staff).
//
// Why a function: Supabase Auth only knows emails. Looking up "matriculation number -> email"
// in the browser would let anyone harvest student emails, so the lookup happens here, with the
// service role key, and the email is never returned.
//
// Brute-force guard: every attempt is counted BEFORE the password is checked (atomic RPC, so
// parallel requests cannot slip past), per (identifier, IP), per identifier and per IP. A good
// login gives the attempt back. If the counter store fails we refuse (fail closed, HTTP 503).
//
// Deploy: Supabase Dashboard > Edge Functions > New function "login" > paste this file.
// (SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are provided automatically.)
// Optional secret ALLOWED_ORIGINS="https://kryshn7777.github.io,http://localhost:5173".
import { createClient } from 'npm:@supabase/supabase-js@2';

const url = Deno.env.get('SUPABASE_URL')!;
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map((s) => s.trim()).filter(Boolean);

const LIMITS = {
  idIp: { max: 6, window: '15 minutes' },
  id: { max: 30, window: '15 minutes' },
  ip: { max: 40, window: '10 minutes' },
};
const GENERIC = 'Matriculation number or password is incorrect.';

const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

function cors(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  const allow = allowedOrigins.length === 0 ? '*' : allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

const json = (req: Request, status: number, body: unknown, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(req), 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extra },
  });

// The platform proxy appends the real client address as the LAST x-forwarded-for entry; anything
// before it is client-supplied. cf-connecting-ip / x-real-ip are not used: a client could send them.
// No address = no per-IP limits (the per-identifier limit still applies); never one shared bucket.
// After deploying, verify with a spoofed header that the last entry is yours.
function clientIp(req: Request): string | null {
  const last = req.headers.get('x-forwarded-for')?.split(',').pop()?.trim();
  return last && last.length <= 64 ? last : null;
}

type Guard = { key: string; max: number; window: string };

async function reserve(g: Guard): Promise<number> {
  const { data, error } = await service.rpc('login_guard_hit', { p_key: g.key, p_window: g.window });
  if (error || typeof data !== 'number') throw new Error('guard unavailable');
  return data;
}
const release = (guards: Guard[]) =>
  Promise.all(guards.map((g) => service.rpc('login_guard_release', { p_key: g.key, p_window: g.window }))).catch(() => {});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== 'POST') return json(req, 405, { error: 'Method not allowed.' });

  const raw = await req.text();
  if (raw.length > 2048) return json(req, 413, { error: 'Request too large.' });
  let body: { identifier?: unknown; password?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return json(req, 400, { error: 'Invalid request.' });
  }

  const identifier = typeof body.identifier === 'string' ? body.identifier.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const isMatric = /^[0-9]{6,10}$/.test(identifier);
  const isEmail = /^[^@\s]{1,64}@[^@\s]{1,120}$/.test(identifier);
  if ((!isMatric && !isEmail) || password.length < 1 || password.length > 200) {
    return json(req, 400, { error: GENERIC });
  }

  const ip = clientIp(req);
  const guards: Guard[] = [{ key: `id:${identifier}`, ...LIMITS.id }];
  if (ip) {
    guards.push({ key: `idip:${identifier}|${ip}`, ...LIMITS.idIp }, { key: `ip:${ip}`, ...LIMITS.ip });
  }

  let counts: number[];
  try {
    counts = await Promise.all(guards.map(reserve));
  } catch {
    return json(req, 503, { error: 'Login is temporarily unavailable. Please try again in a minute.' });
  }
  if (counts.some((n, i) => n > guards[i].max)) {
    return json(req, 429, { error: 'Too many attempts. Please wait 15 minutes and try again.' }, { 'Retry-After': '900' });
  }

  // Resolve the login email server-side; never send it back to the browser.
  let email: string | null = isEmail ? identifier : null;
  if (isMatric) {
    const { data } = await service.from('profiles').select('email').eq('matriculation_number', identifier).maybeSingle();
    email = data?.email ?? null;
  }

  const anon = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  // Unknown identifiers still run a sign-in so the response does not obviously reveal who exists.
  const { data, error } = await anon.auth.signInWithPassword({
    email: email ?? `nobody-${crypto.randomUUID()}@srh-berlin.de`,
    password,
  });

  if (error || !data.session || !email) {
    // Auth itself is throttling or down: not the user's fault, do not count it against them.
    if (error && (error.status === 429 || (error.status ?? 0) >= 500 || error.code === 'over_request_rate_limit')) {
      await release(guards);
      return json(req, 503, { error: 'Login is busy. Please try again in a minute.' });
    }
    // GoTrue checks the password first, so this only appears for a correct password.
    if (error?.code === 'email_not_confirmed') {
      await release(guards);
      return json(req, 403, { error: 'Please confirm your email address first. Check your SRH inbox.' });
    }
    return json(req, 401, { error: GENERIC }); // attempt stays counted
  }

  await release(guards); // correct password: give the attempt back

  const { data: profile } = await service.from('profiles').select('active').eq('id', data.user.id).maybeSingle();
  if (!profile) {
    await service.auth.admin.signOut(data.session.access_token).catch(() => {});
    return json(req, 403, { error: 'Your account is not activated yet. Please confirm your email address.' });
  }
  if (!profile.active) {
    await service.auth.admin.signOut(data.session.access_token).catch(() => {});
    return json(req, 403, { error: 'This account is deactivated. Contact Ajinkya Keskar.' });
  }

  return json(req, 200, {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
});
