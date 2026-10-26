import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  UserCheck,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Info,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SrhLogo } from '../components/SrhLogo';

export const LoginPage: React.FC = () => {
  const { loginByEmail, switchRoleUser, users } = useApp();
  const navigate = useNavigate();

  const [email, setEmail] = useState('anna.mueller@srh-berlin.de');
  const [password, setPassword] = useState('srh2024');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [infoModal, setInfoModal] = useState<
    null | 'printers' | 'how-it-works' | 'contact'
  >(null);
  const [ssoOpen, setSsoOpen] = useState(false);

  const routeForRole = (role: string) => {
    if (role === 'STUDENT') navigate('/student/dashboard');
    else if (role === 'PROFESSOR') navigate('/professor/dashboard');
    else navigate('/pc/dashboard');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = loginByEmail(email, password);
    if (!res.ok || !res.data) {
      setError(res.error || 'Invalid credentials.');
      return;
    }
    routeForRole(res.data.role);
  };

  const handleQuickDemoLogin = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    setEmail(user.email);
    setPassword('srh2024');
    setError(null);
    switchRoleUser(user.id);
    routeForRole(user.role);
  };

  return (
    <div className="min-h-screen bg-[#070E1B] text-white flex flex-col justify-between relative overflow-hidden">
      {/* Realistic FDM 3D Printer Dark Background Graphic matching Screen 1 */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
        {/* Deep ambient studio lighting gradients */}
        <div className="absolute -top-24 left-1/4 w-[620px] h-[620px] rounded-full bg-blue-600/15 blur-[130px]" />
        <div className="absolute bottom-0 left-10 w-[520px] h-[420px] rounded-full bg-sky-500/10 blur-[120px]" />

        {/* Detailed SVG recreation of the dark FDM 3D printer & lattice dome in reference Screen 1 */}
        <svg
          viewBox="0 0 1440 900"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full object-cover opacity-55"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <linearGradient id="gantryMetal" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#1E293B" />
              <stop offset="50%" stopColor="#0F172A" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>
            <linearGradient id="latticeGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#1E3A8A" stopOpacity="0.3" />
            </linearGradient>
          </defs>

          {/* Left & Center Printer Frame Extrusions */}
          <rect x="280" y="0" width="42" height="900" fill="url(#gantryMetal)" />
          <rect x="315" y="0" width="4" height="900" fill="#334155" opacity="0.5" />
          <rect x="760" y="0" width="38" height="900" fill="url(#gantryMetal)" />

          {/* Horizontal X-Axis Carbon/Steel Rods & Extruder Carriage */}
          <rect x="120" y="130" width="980" height="22" fill="#1E293B" />
          <rect x="120" y="168" width="980" height="14" fill="#334155" />

          {/* Hotend Print Head Assembly */}
          <rect
            x="450"
            y="88"
            width="160"
            height="135"
            rx="10"
            fill="#0F172A"
            stroke="#334155"
            strokeWidth="2"
          />
          <rect x="475" y="110" width="110" height="65" rx="6" fill="#1E293B" />
          {/* Cooling fan shroud & brass nozzle */}
          <path d="M495 223H565L548 256H512L495 223Z" fill="#334155" />
          <path d="M522 256H538L533 272H527L522 256Z" fill="#F59E0B" />
          {/* Nozzle LED worklight glow */}
          <circle cx="530" cy="275" r="45" fill="#38BDF8" fillOpacity="0.22" />

          {/* Complex Voronoi / Gyroid 3D Printed Lattice Dome on Build Plate */}
          <g transform="translate(365, 272)">
            {/* Outer dome silhouette */}
            <path
              d="M30 430 C30 160, 110 20, 165 4 C220 20, 300 160, 300 430 Z"
              fill="#0F172A"
              stroke="url(#latticeGlow)"
              strokeWidth="3"
            />
            {/* Lattice structural ribs */}
            <path
              d="M55 430 C65 230, 120 75, 165 18 C210 75, 265 230, 275 430"
              stroke="#475569"
              strokeWidth="4"
              fill="none"
            />
            <path
              d="M90 430 C100 260, 135 110, 165 36 C195 110, 230 260, 240 430"
              stroke="#64748B"
              strokeWidth="3.5"
              fill="none"
            />
            {/* Diagonal cross-hatching of the 3D printed mesh */}
            <path
              d="M45 360 L265 210 M60 290 L245 140 M85 210 L220 90 M40 415 L285 280 M75 430 L290 340"
              stroke="#334155"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M285 360 L65 210 M270 290 L85 140 M245 210 L110 90 M290 415 L45 280 M255 430 L40 340"
              stroke="#475569"
              strokeWidth="5"
              strokeLinecap="round"
            />
            {/* Perforated Voronoi cells */}
            <ellipse cx="165" cy="120" rx="16" ry="24" fill="#070E1B" stroke="#64748B" strokeWidth="2.5" />
            <ellipse cx="128" cy="185" rx="18" ry="28" fill="#070E1B" stroke="#475569" strokeWidth="2.5" />
            <ellipse cx="202" cy="185" rx="18" ry="28" fill="#070E1B" stroke="#475569" strokeWidth="2.5" />
            <ellipse cx="165" cy="245" rx="22" ry="32" fill="#070E1B" stroke="#64748B" strokeWidth="2.5" />
            <ellipse cx="115" cy="295" rx="20" ry="30" fill="#070E1B" stroke="#475569" strokeWidth="2.5" />
            <ellipse cx="215" cy="295" rx="20" ry="30" fill="#070E1B" stroke="#475569" strokeWidth="2.5" />
            <ellipse cx="165" cy="355" rx="24" ry="34" fill="#070E1B" stroke="#64748B" strokeWidth="2.5" />
          </g>

          {/* Textured PEI Print Bed Platform */}
          <rect
            x="220"
            y="700"
            width="620"
            height="24"
            rx="4"
            fill="#1E293B"
            stroke="#475569"
            strokeWidth="2"
          />
          <rect x="180" y="724" width="700" height="60" fill="#09101F" />
        </svg>

        {/* Dark vignette overlay for crisp text legibility */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#070E1B]/95 via-[#070E1B]/65 to-[#070E1B]/85" />
      </div>

      {/* Official SRH University Website White Header Bar (matching srh-university.de) */}
      <div className="relative z-10 bg-white text-[#171717] border-b border-[#DDDAD8] shadow-xs">
        <div className="h-1 w-full bg-gradient-to-r from-[#D54407] via-[#D54407] to-[#37484E]" />
        <header className="max-w-7xl w-full mx-auto px-6 lg:px-12 h-20 flex items-center justify-between">
          <SrhLogo variant="dark-text" subtitle="university" />

          <nav className="hidden md:flex items-center gap-8 text-sm font-bold text-[#171717]">
            <button
              type="button"
              onClick={() => setInfoModal(null)}
              className="hover:text-[#D54407] transition-colors cursor-pointer"
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => setInfoModal('printers')}
              className="hover:text-[#D54407] transition-colors cursor-pointer"
            >
              Printers
            </button>
            <button
              type="button"
              onClick={() => setInfoModal('how-it-works')}
              className="hover:text-[#D54407] transition-colors cursor-pointer"
            >
              How it works
            </button>
            <button
              type="button"
              onClick={() => setInfoModal('contact')}
              className="hover:text-[#D54407] transition-colors cursor-pointer"
            >
              Contact
            </button>
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('srh-email-input');
                el?.focus();
              }}
              className="px-6 py-2.5 rounded-[20px_20px_20px_2px] bg-[#D54407] hover:bg-[#C12D00] text-white font-bold shadow-xs transition-colors cursor-pointer"
            >
              Login
            </button>
          </nav>
        </header>
      </div>

      {/* Main Split Content */}
      <main className="relative z-10 max-w-7xl w-full mx-auto px-6 lg:px-12 py-8 flex-1 flex flex-col lg:flex-row items-center justify-between gap-12">
        {/* Left Hero Column */}
        <div className="flex-1 max-w-xl space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D54407]/20 border border-[#D54407]/40 text-[#FF7A45] text-xs font-bold uppercase tracking-wider">
              SRH University Berlin • Design Your Future
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-[52px] font-extrabold tracking-tight leading-[1.12] text-white">
              3D Printing for
              <br />
              Ideas that Matter
            </h1>
            <p className="text-lg sm:text-xl text-slate-200 font-normal leading-relaxed max-w-lg">
              FDM Printer Request, Approval and
              <br />
              Access Management System
            </p>
          </div>

          {/* Three concise role descriptions matching Screen 1 */}
          <div className="pt-6 lg:pt-12 grid grid-cols-1 sm:grid-cols-3 gap-5">
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('USR-STU-01')}
              className="flex items-center gap-3.5 text-left group cursor-pointer focus:outline-none"
            >
              <div className="w-11 h-11 rounded-full bg-slate-800/80 border border-slate-600/80 flex items-center justify-center text-slate-200 group-hover:border-blue-400 group-hover:text-blue-400 transition-colors shrink-0">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">
                  For Students
                </div>
                <div className="text-xs text-slate-300">Submit print requests</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemoLogin('USR-PROF-01')}
              className="flex items-center gap-3.5 text-left group cursor-pointer focus:outline-none"
            >
              <div className="w-11 h-11 rounded-full bg-slate-800/80 border border-slate-600/80 flex items-center justify-center text-slate-200 group-hover:border-blue-400 group-hover:text-blue-400 transition-colors shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">
                  For Professors
                </div>
                <div className="text-xs text-slate-300">Review and approve</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemoLogin('USR-PC-01')}
              className="flex items-center gap-3.5 text-left group cursor-pointer focus:outline-none"
            >
              <div className="w-11 h-11 rounded-full bg-slate-800/80 border border-slate-600/80 flex items-center justify-center text-slate-200 group-hover:border-blue-400 group-hover:text-blue-400 transition-colors shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">
                  For PC Admin
                </div>
                <div className="text-xs text-slate-300">Manage and authorize</div>
              </div>
            </button>
          </div>
        </div>

        {/* Right Floating White Login Card */}
        <div className="w-full max-w-[420px] bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-100 p-7 sm:p-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">
              Login to your Account
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Use your SRH credentials to access the system.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label
                htmlFor="srh-email-input"
                className="block text-xs font-semibold text-slate-800 mb-1.5"
              >
                Email (SRH)
              </label>
              <input
                id="srh-email-input"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@srh-berlin.de"
                required
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1662F3] focus:border-transparent"
              />
            </div>

            <div>
              <label
                htmlFor="srh-password-input"
                className="block text-xs font-semibold text-slate-800 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="srh-password-input"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1662F3] focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <div className="mt-1.5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setForgotModalOpen(true)}
                  className="text-xs font-semibold text-[#1662F3] hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-lg bg-[#1662F3] hover:bg-[#1251D1] text-white font-semibold text-sm shadow-sm transition-colors cursor-pointer"
            >
              Login
            </button>
          </form>

          {/* Divider */}
          <div className="my-4 flex items-center gap-3">
            <div className="h-[1px] flex-1 bg-slate-200" />
            <span className="text-xs text-slate-400 font-medium">or</span>
            <div className="h-[1px] flex-1 bg-slate-200" />
          </div>

          {/* Microsoft SSO Demo Button */}
          <button
            type="button"
            onClick={() => setSsoOpen(true)}
            className="w-full py-2.5 px-4 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 21 21" aria-hidden="true">
              <rect x="1" y="1" width="9" height="9" fill="#F25022" />
              <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
              <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
              <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
            </svg>
            Login with Microsoft (SRH)
          </button>

          {/* Clearly Labeled Demonstration Authentication Switcher */}
          <div className="mt-6 pt-4 border-t border-slate-200/90">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Demonstration Accounts (1-Click Sign In)
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('USR-STU-01')}
                className="px-2.5 py-2 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-[#1662F3] border border-slate-200 text-left transition-colors cursor-pointer"
              >
                <div className="text-xs font-bold text-slate-900">Student</div>
                <div className="text-[10px] text-slate-500 truncate">
                  Anna Müller
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('USR-PROF-01')}
                className="px-2.5 py-2 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-[#1662F3] border border-slate-200 text-left transition-colors cursor-pointer"
              >
                <div className="text-xs font-bold text-slate-900">Professor</div>
                <div className="text-[10px] text-slate-500 truncate">
                  Ajinkya Keskar
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('USR-PC-01')}
                className="px-2.5 py-2 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-[#1662F3] border border-slate-200 text-left transition-colors cursor-pointer"
              >
                <div className="text-xs font-bold text-slate-900">PC Admin</div>
                <div className="text-[10px] text-slate-500 truncate">
                  PC Admin
                </div>
              </button>
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 max-w-7xl w-full mx-auto px-6 lg:px-12 py-4 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2">
        <span>
          © 2024–2026 SRH Berlin University of Applied Sciences — MakerLab & FDM Print Center
        </span>
        <span className="text-slate-500">
          Demonstration Environment • Local Storage Persistence Active
        </span>
      </footer>

      {/* Simulated Microsoft SSO Modal */}
      {ssoOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white text-slate-900 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 21 21">
                  <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                  <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                  <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                  <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
                </svg>
                <span className="text-sm font-bold">
                  Microsoft Entra ID — SRH Berlin (Simulated Demo)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSsoOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600 mt-3">
              Select a seeded SRH Berlin campus identity to complete simulated single sign-on:
            </p>
            <div className="mt-4 space-y-2">
              {users.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    setSsoOpen(false);
                    handleQuickDemoLogin(u.id);
                  }}
                  className="w-full p-3 rounded-lg border border-slate-200 hover:border-[#1662F3] hover:bg-blue-50/50 flex items-center justify-between text-left transition-colors cursor-pointer"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      {u.name}
                    </div>
                    <div className="text-[11px] text-slate-500">{u.email}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                    {u.role}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Forgot Password Modal */}
      {forgotModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white text-slate-900 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">SRH Password Recovery (Demo)</h3>
              <button
                type="button"
                onClick={() => setForgotModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              In this demonstration environment, any password of 4+ characters (default:{' '}
              <code className="px-1.5 py-0.5 rounded bg-slate-100 font-mono">
                srh2024
              </code>
              ) works with our seeded SRH emails:
            </p>
            <ul className="mt-3 space-y-1.5 text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <li>
                <strong>Student:</strong> anna.mueller@srh-berlin.de
              </li>
              <li>
                <strong>Professor (Ajinkya Keskar):</strong> ajinkya.keskar@srh-berlin.de
              </li>
              <li>
                <strong>PC Admin:</strong> pc.admin@srh-berlin.de
              </li>
            </ul>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setForgotModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-[#1662F3] text-white text-xs font-semibold cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info Modal for Top Nav links (Printers / How it works / Contact) */}
      {infoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white text-slate-900 rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold capitalize">
                {infoModal.replace(/-/g, ' ')} — SRH Berlin 3D Printing Lab
              </h3>
              <button
                type="button"
                onClick={() => setInfoModal(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {infoModal === 'printers' && (
              <div className="mt-3 space-y-2 text-xs text-slate-600">
                <p>
                  Our Berlin MakerLab operates industrial and prosumer FDM systems:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-700">
                  <li>
                    <strong>Prusa MK4 (PR-01):</strong> 250 × 210 × 220 mm • PLA, PETG, ABS
                  </li>
                  <li>
                    <strong>Ultimaker S5 (PR-02):</strong> 330 × 240 × 300 mm • PLA, PETG, TPU
                  </li>
                  <li>
                    <strong>Creality K1 (PR-03):</strong> 220 × 220 × 250 mm • PLA, PETG, ABS
                  </li>
                  <li>
                    <strong>Bambu Lab X1E (PR-04):</strong> 256 × 256 × 256 mm • PLA, PETG, ABS, ASA, PC
                  </li>
                </ul>
              </div>
            )}
            {infoModal === 'how-it-works' && (
              <ol className="mt-3 list-decimal pl-5 space-y-2 text-xs text-slate-700">
                <li>
                  <strong>Submit Request:</strong> Students upload their STL/3MF file and specify academic course, printer, and filament.
                </li>
                <li>
                  <strong>Professor Approval:</strong> Course professors review academic relevance and part feasibility.
                </li>
                <li>
                  <strong>PC Administrator Final Approval:</strong> The Print Center Admin verifies printer availability, logs the job, and grants time-limited printer backend credentials.
                </li>
                <li>
                  <strong>Printer Access:</strong> Students access connection credentials on the Printer Access page.
                </li>
              </ol>
            )}
            {infoModal === 'contact' && (
              <div className="mt-3 space-y-2 text-xs text-slate-700">
                <p>
                  <strong>SRH Berlin MakerLab &amp; Print Center</strong>
                </p>
                <p>Ernst-Reuter-Platz 10, 10587 Berlin — Building B, Room 104</p>
                <p>Professor: Ajinkya Keskar (ajinkya.keskar@srh-berlin.de)</p>
                <p>Print Center Administration: PC Admin (pc.admin@srh-berlin.de)</p>
                <p>Lab Hours: Mon–Fri, 08:30 – 19:00 CET</p>
              </div>
            )}
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setInfoModal(null)}
                className="px-4 py-2 rounded-lg bg-[#1662F3] text-white text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
