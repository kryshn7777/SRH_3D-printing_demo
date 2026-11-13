import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';

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

// Self-host the OCR engine (worker, LSTM wasm cores, English data) under dist/tesseract/ so screenshot
// reading works under the CSP above and offline, with no CDN calls. Loaded on demand by estimateOcr.ts.
function tesseractAssets(): Plugin {
  const nm = 'node_modules/';
  const files: Record<string, string> = {
    'tesseract/worker.min.js': nm + 'tesseract.js/dist/worker.min.js',
    'tesseract/lang/eng.traineddata.gz': nm + '@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz',
  };
  for (const v of ['lstm', 'simd-lstm', 'relaxedsimd-lstm'])
    files[`tesseract/core/tesseract-core-${v}.wasm.js`] = nm + `tesseract.js-core/tesseract-core-${v}.wasm.js`;
  return {
    name: 'srh-tesseract-assets',
    apply: 'build',
    generateBundle() {
      for (const [fileName, src] of Object.entries(files)) this.emitFile({ type: 'asset', fileName, source: readFileSync(src) });
    },
  };
}

export default defineConfig(({ command, mode, isPreview }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    base: command === 'build' || isPreview ? '/SRH_3D-printing_demo/' : '/',
    plugins: [react(), tailwindcss(), csp(env.VITE_SUPABASE_URL ?? ''), tesseractAssets()],
    server: { port: 5173, host: true },
  };
});
