import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/SRH_3D-printing_demo/' : '/',
  plugins: [react(), tailwindcss()],
  build: {
    // redirect.html is the MSAL redirect bridge for Microsoft sign-in
    rollupOptions: { input: ['index.html', 'redirect.html'] },
  },
  server: {
    port: 5173,
    host: true,
  },
}));
