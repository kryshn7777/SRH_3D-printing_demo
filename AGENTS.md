# Project Memory — SRH Berlin FDM 3D Printing Management System

## Repository & Deployment Memory
- **GitHub Remote Repository**: `https://github.com/kryshn7777/SRH_3D-printing_demo`
- **Default Branch**: `main`
- **Git Workflow Rule**: When asked to save, commit, or push changes in this project, stage all relevant tracked/project files (excluding `node_modules/`, `dist/`, and `.playwright-mcp/`), commit with a descriptive message, and push to `origin` (`https://github.com/kryshn7777/SRH_3D-printing_demo`).

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
