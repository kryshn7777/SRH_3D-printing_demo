import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/SRH_3D-printing_demo/' : '/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: true,
  },
}));
