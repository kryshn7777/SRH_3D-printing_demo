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
- **Persistence**: Client-side `localStorage` keys prefixed with `srh_3dp_*_v6` in `src/context/AppContext.tsx`.
- **Seeded Demo Identities**:
  - **Student**: `Anna Müller` (`anna.mueller@srh-berlin.de`)
  - **Approver**: `Ajinkya Keskar` (`ajinkya.keskar@srh-berlin.de`) — sole approve/reject/revoke authority; also manages printers and users. No PC Admin role.
  - **Lab In-Charge**: `Lab In-Charge` (`lab.incharge@srh-berlin.de`) — edits the inventory (filament, spare parts) and printers, including maintenance notes + last-maintained date/person (students see these on the printer catalogue). Cannot approve requests.
  - Seeded staff/students have no password: they sign in via the 1-click demo cards. Self-registered students log in with matriculation number + password (salted PBKDF2 hash, stored in this browser's localStorage only; no backend yet).
- **Branding**: Official SRH University vector SVG logo (`#D54407` `.logoMain` + `#575756` `.logoMeta` scraped from `https://www.srh-university.de/en/`) and official SRH Berlin study programmes.
- **13 Implemented Routes**:
  1. `/login` — Matriculation number + password login for students; 1-click staff/demo accounts below the form.
  2. `/signup` — Student sign-up: name, SRH email, matriculation number, department, password + repeat.
  3. `/student/dashboard` — Student KPI summary, recent requests, and available printers.
  4. `/student/printers` — Searchable and filterable FDM printer catalogue, including maintenance notes and last-maintained date/person.
  5. `/student/requests/new` — 3-column request submission form with STL/3MF/OBJ validation.
  6. `/student/requests` — Student requests table with tabs, search, and sorting.
  7. `/student/requests/:id` — Student request details with 3D CAD preview and 3-stage timeline (Submitted, Approval, Access Granted).
  8. `/professor/dashboard` — Approver review queue scoped by department.
  9. `/professor/requests/:id/review` — Approve (assigns printer + grants access), reject, request changes, or revoke access.
  10. `/manage` — Printer management and maintenance info (approver + lab in-charge); user management (approver only).
  11. `/professor/log` — Searchable audit trail with date/status filters and CSV export.
  12. `/lab/inventory` — Inventory (filament, spare parts) with low-stock flags; editable by lab in-charge only.
  13. `/student/access/:id` — Gated printer access page showing credentials only after `APPROVED_ACCESS_GRANTED`.
