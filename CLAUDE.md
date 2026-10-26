# CLAUDE.md — Project Memory (SRH Berlin FDM 3D Printing Management System)

## Git & GitHub Pages Hosting Memory
- **Remote URL**: `https://github.com/kryshn7777/SRH_3D-printing_demo`
- **Live Hosted URL (GitHub Pages)**: `https://kryshn7777.github.io/SRH_3D-printing_demo/`
- **Source Branch**: `main`
- **Hosting Branch**: `gh-pages` + `.github/workflows/deploy.yml`
- **Workflow**: Always stage project changes, commit, and push to `origin main`, and publish the built `dist/` (with `404.html` SPA fallback) to `origin gh-pages`.

## Commands
- `npm run dev` — Start Vite development server
- `npm run build` — Run `tsc -b && vite build` typecheck and production bundle (configured with `base: '/SRH_3D-printing_demo/'`)
