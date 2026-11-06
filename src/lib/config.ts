// Plug and play: set both variables (see supabase/README.md) and the app talks to your
// Supabase project. Leave them empty and it keeps running on local demo data.
export const SUPABASE_URL = ((import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? '').trim();
export const SUPABASE_ANON_KEY = ((import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '').trim();
export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
