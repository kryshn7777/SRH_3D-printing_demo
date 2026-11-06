import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Production-only Content-Security-Policy (a <meta> tag; GitHub Pages cannot set headers).
// connect-src is limited to this site plus the Supabase project, so injected script cannot
// ship data anywhere else. Dev server is left alone (Vite HMR needs inline scripts/ws).
function csp(supabaseUrl: string): Plugin {
  const supabase = supabaseUrl ? new URL(supabaseUrl).origin : '';
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    `connect-src 'self' blob: ${supabase}`.trim(),
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
  return {
    name: 'srh-csp',
    apply: 'build',
    transformIndexHtml: () => [
      { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: policy }, injectTo: 'head-prepend' },
      { tag: 'meta', attrs: { name: 'referrer', content: 'no-referrer' }, injectTo: 'head-prepend' },
    ],
  };
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    base: command === 'build' ? '/SRH_3D-printing_demo/' : '/',
    plugins: [react(), tailwindcss(), csp(env.VITE_SUPABASE_URL ?? '')],
    server: { port: 5173, host: true },
  };
});
