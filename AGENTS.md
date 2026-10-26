# Project Memory — SRH Berlin FDM 3D Printing Management System

## Repository & GitHub Hosting Memory
- **GitHub Remote Repository**: `https://github.com/kryshn7777/SRH_3D-printing_demo`
- **GitHub Pages Live URL**: `https://kryshn7777.github.io/SRH_3D-printing_demo/`
- **Default Source Branch**: `main`
- **GitHub Pages Hosting Branch / Workflow**:
  - Automated GitHub Actions workflow: `.github/workflows/deploy.yml`
  - Pre-built static hosting branch: `gh-pages` (with `dist/index.html` duplicated to `dist/404.html` for React Router SPA deep-link support under `/SRH_3D-printing_demo/`).
- **Git Workflow Rule**: When asked to save, commit, push, or update hosting in this project:
  1. Stage and commit all relevant tracked/project files (excluding `node_modules/`, `dist/`, `.playwright-mcp/`, and `tsconfig.tsbuildinfo`) to `main` and push to `origin main`.
  2. Build the production bundle (`npm run build` + copy `dist/index.html` to `dist/404.html`) and push the `dist/` contents to `origin gh-pages` so GitHub Pages hosting updates immediately.

## Architecture Summary
- **Stack**: React 19, TypeScript, Vite 6, Tailwind CSS v4, React Router v7, Lucide Icons.
- **Persistence**: Client-side `localStorage` keys prefixed with `srh_3dp_*_v1` in `src/context/AppContext.tsx`.
- **12 Implemented Routes**:
  1. `/login` — Split-screen SRH Berlin login with demo role quick-select.
  2. `/student/dashboard` — Student KPI summary, recent requests, and available printers.
  3. `/student/printers` — Searchable and filterable FDM printer catalogue.
  4. `/student/requests/new` — 3-column request submission form with STL/3MF/OBJ validation.
  5. `/student/requests` — Student requests table with tabs, search, and sorting.
  6. `/student/requests/:id` — Student request details with 3D CAD preview and 4-stage approval timeline.
  7. `/professor/dashboard` — Professor review queue scoped by department.
  8. `/professor/requests/:id/review` — Professor academic approval, rejection, and change-request screen.
  9. `/pc/dashboard` — PC Administrator dashboard with waiting queue, printer management, and user management.
  10. `/pc/requests/:id/review` — PC final authorization screen with printer assignment and confirmation modal.
  11. `/pc/log` — Searchable audit trail with date/status filters and CSV export.
  12. `/student/access/:id` — Gated printer access page showing credentials only after `APPROVED_ACCESS_GRANTED`.
