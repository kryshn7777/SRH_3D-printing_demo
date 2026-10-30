import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  UserCheck,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertCircle,
  Plus,
  ArrowRight,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DEPARTMENTS } from '../data/seedData';
import { msalConfigured, signInWithMicrosoft } from '../utils/msalAuth';

export const LoginPage: React.FC = () => {
  const { loginByEmail, loginWithMicrosoft, switchRoleUser, users } = useApp();
  const navigate = useNavigate();

  const [email, setEmail] = useState('anna.mueller@srh-berlin.de');
  const [password, setPassword] = useState('srh2024');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [infoModal, setInfoModal] = useState<
    null | 'programmes' | 'printers' | 'how-it-works' | 'contact'
  >(null);
  const [ssoOpen, setSsoOpen] = useState(false);
  const [lang, setLang] = useState<'EN' | 'DE'>('EN');

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

  const handleMicrosoftLogin = async () => {
    setError(null);
    if (!msalConfigured) {
      setSsoOpen(true);
      return;
    }
    try {
      const { email: msEmail, name } = await signInWithMicrosoft();
      const res = loginWithMicrosoft(msEmail, name);
      if (!res.ok || !res.data) {
        setError(res.error || 'Microsoft sign-in failed.');
        return;
      }
      routeForRole(res.data.role);
    } catch (err) {
      if ((err as { errorCode?: string }).errorCode === 'user_cancelled') return;
      setError(`Microsoft sign-in failed: ${(err as Error).message}`);
    }
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
    <div className="min-h-screen bg-[#F5F4F3] text-[#575756] flex flex-col justify-between relative overflow-x-hidden">
      {/* ===================================================================
          1. OFFICIAL SRH UNIVERSITY HEADER (.b_header on srh-university.de)
             Height: 85px desktop / 55px mobile, #FFFFFF bg, SRHHeadline 20px links
         =================================================================== */}
      <header className="sticky top-0 z-40 bg-white text-[#171717] h-[68px] lg:h-[85px] px-4 sm:px-8 flex items-center shadow-[1px_1px_1px_1px_rgba(0,0,0,0.05)]">
        <div className="w-full max-w-[1602px] mx-auto flex items-center justify-between h-full">
          {/* Official SRH University Vector SVG (.b_svg--logo-1he) */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setInfoModal(null);
            }}
            className="flex items-center gap-4 group focus:outline-none"
            aria-label="SRH University Berlin"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 600 168"
              className="h-[42px] sm:h-[52px] lg:h-[62px] w-auto shrink-0 transition-transform duration-200"
            >
              <path
                className="logoMain"
                fill="#D54407"
                d="M141.5 136.5h20V.5h-20v136zm44.107-91.93c-3.756-.186-8.431 0-13.107.555v18.732c17.6 0 24.018 2.609 24.018 19.109V136.5H216.5V80.468c0-20.685-11.642-35.157-30.893-35.899v.001zm-137.73.991C26.493 46.673 17 60.935 17 83.627v45.76c0 13.336-2.674 19.08-16.499 19.358v18.513c1.658.28 4.33.28 5.714.186 21.477-1.296 30.878-15.652 30.878-38.066v-45.76c0-13.428 2.49-19.078 16.408-19.356V45.654c-1.569-.186-4.24-.186-5.623-.093h-.001zm62.002 0C88.93 46.671 79.5 60.994 79.5 83.545V136.5h19.769V83.536c0-13.307 2.629-19.037 16.231-19.314V45.654c-1.633-.186-4.26-.186-5.621-.093z"
              />
              <path
                className="logoMeta"
                fill="#575756"
                fillRule="nonzero"
                d="M311.25 136.72c-4.05 0-7.55-.81-10.49-2.43-2.94-1.62-5.2-3.93-6.78-6.94-1.58-3.01-2.37-6.54-2.37-10.59V90.72h9.79v26.04c0 3.37.86 5.96 2.59 7.77 1.73 1.81 4.15 2.72 7.26 2.72 3.11 0 5.62-.91 7.39-2.72 1.77-1.81 2.66-4.4 2.66-7.77V90.72h9.79v26.04c0 4.05-.8 7.58-2.4 10.59-1.6 3.01-3.88 5.32-6.85 6.94-2.96 1.62-6.49 2.43-10.59 2.43zM337.29 135.5v-18.68c0-4.69 1.33-8.32 4-10.88 2.67-2.56 6.37-3.84 11.1-3.84 4.73 0 8.43 1.28 11.1 3.84 2.67 2.56 4 6.18 4 10.88v18.68h-9.08v-18.55c0-2.05-.55-3.64-1.66-4.77-1.11-1.13-2.56-1.7-4.35-1.7-1.79 0-3.24.57-4.35 1.7-1.11 1.13-1.66 2.72-1.66 4.77v18.55h-9.1zM377.72 99.99c-1.58 0-2.9-.52-3.97-1.57-1.07-1.04-1.6-2.33-1.6-3.87s.53-2.83 1.6-3.87 2.39-1.57 3.97-1.57 2.9.52 3.97 1.57c1.07 1.05 1.6 2.34 1.6 3.87 0 1.53-.53 2.83-1.6 3.87-1.07 1.05-2.39 1.57-3.97 1.57zm-4.54 35.51v-32.31h9.08v32.31h-9.08zM397.88 135.5l-12.48-32.31h10.04l7.36 21.11 7.29-21.11h9.72L407.4 135.5h-9.53.01zM437.86 136.59c-3.33 0-6.31-.76-8.96-2.27-2.65-1.51-4.72-3.58-6.24-6.21-1.51-2.62-2.27-5.6-2.27-8.92 0-3.32.75-6.02 2.24-8.61 1.49-2.58 3.53-4.64 6.11-6.17 2.58-1.54 5.49-2.3 8.73-2.3s6.23.73 8.7 2.18c2.47 1.45 4.4 3.42 5.79 5.92 1.39 2.5 2.08 5.32 2.08 8.48v3.39h-24.18c.43 2.09 1.38 3.71 2.85 4.86 1.47 1.15 3.32 1.73 5.53 1.73 1.54 0 2.93-.34 4.19-1.02 1.26-.68 2.38-1.81 3.36-3.39l7.29 4.73c-1.58 2.47-3.61 4.36-6.11 5.66-2.5 1.3-5.54 1.95-9.12 1.95l.01-.01zm-.38-26.55c-1.83 0-3.39.5-4.67 1.5-1.28 1-2.2 2.36-2.75 4.06h14.59c-.38-1.66-1.19-3.01-2.43-4.03-1.24-1.02-2.82-1.54-4.74-1.54v.01zM458.79 135.5v-18.43c0-4.78 1.35-8.38 4.06-10.81 2.71-2.43 6.22-3.65 10.52-3.65.85 0 1.71.05 2.56.16.85.11 1.62.25 2.3.42v8.06c-.51-.08-1.06-.15-1.63-.19-.58-.04-1.18-.06-1.82-.06-2.09 0-3.76.58-5.02 1.73-1.26 1.15-1.89 2.73-1.89 4.73v18.04h-9.08zM494.42 136.59c-3.11 0-5.98-.6-8.61-1.79-2.62-1.19-4.55-2.77-5.79-4.73l6.27-5.05c2.3 2.69 5.05 4.03 8.25 4.03 1.49 0 2.64-.27 3.46-.8.81-.53 1.21-1.27 1.21-2.21 0-1.37-1.04-2.2-3.13-2.5l-4.61-.7c-6.83-1.02-10.24-4.42-10.24-10.17 0-3.2 1.24-5.76 3.71-7.68 2.47-1.92 5.78-2.88 9.92-2.88 2.52 0 4.92.53 7.2 1.6 2.28 1.07 4.08 2.5 5.41 4.29l-5.95 4.86c-1.79-2.13-4.01-3.2-6.65-3.2-1.32 0-2.39.25-3.2.74s-1.22 1.16-1.22 2.02c0 1.45.98 2.33 2.94 2.62l4.09.58c7.25 1.02 10.88 4.31 10.88 9.85 0 3.5-1.24 6.23-3.71 8.19-2.47 1.96-5.89 2.94-10.24 2.94l.01-.01zM518.29 99.99c-1.58 0-2.9-.52-3.97-1.57-1.07-1.04-1.6-2.33-1.6-3.87s.53-2.83 1.6-3.87 2.39-1.57 3.97-1.57 2.9.52 3.97 1.57c1.07 1.05 1.6 2.34 1.6 3.87 0 1.53-.53 2.83-1.6 3.87-1.07 1.05-2.39 1.57-3.97 1.57zm-4.55 35.51v-32.31h9.08v32.31h-9.08zM540.74 136.08c-3.75 0-6.68-1.02-8.77-3.07s-3.13-5.16-3.13-9.34V94.62h9.08v8.57h8.19v7.68h-8.19v12.8c0 1.66.42 2.83 1.25 3.49.83.66 2.08.99 3.74.99.47 0 1.01-.02 1.63-.06.62-.04 1.18-.08 1.7-.13v7.55c-.9.17-1.77.31-2.62.42-.85.11-1.81.16-2.88.16v-.01zM563.07 135.5c-3.88 0-6.91-1.28-9.09-3.84-2.17-2.56-3.26-6.14-3.26-10.75v-17.72h9.08v16.83c0 2.22.51 3.92 1.54 5.12 1.02 1.19 2.5 1.79 4.41 1.79 1.91 0 3.56-.61 4.67-1.82 1.11-1.22 1.66-2.91 1.66-5.09v-16.83h9.08v30.13c0 5.46-1.42 9.75-4.25 12.86-2.84 3.11-6.75 4.67-11.74 4.67-3.37 0-6.31-.66-8.83-1.98-2.52-1.32-4.41-3.18-5.69-5.57l6.85-4.99c1.07 1.45 2.19 2.53 3.36 3.23 1.17.7 2.61 1.06 4.32 1.06 4.61 0 6.91-2.75 6.91-8.25v-2.62c-1.11 1.19-2.43 2.12-3.97 2.78-1.54.66-3.22.99-5.05.99z"
              />
            </svg>
          </a>

          {/* Primary & Meta Navigation (.b_header__nav) */}
          <nav className="flex items-center justify-end h-full">
            {/* Primary Links (.b_header__list--primary) in SRHHeadline 20px */}
            <ul className="hidden lg:flex items-center mr-4">
              <li>
                <button
                  type="button"
                  onClick={() => setInfoModal('programmes')}
                  className="px-[15px] font-srh-headline text-[20px] font-normal text-[#171717] hover:text-[#C12D00] transition-colors cursor-pointer"
                >
                  <span className="block py-[5px] border-b-2 border-transparent hover:border-current transition-colors">
                    Bachelor &amp; Master
                  </span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setInfoModal('printers')}
                  className="px-[15px] font-srh-headline text-[20px] font-normal text-[#171717] hover:text-[#C12D00] transition-colors cursor-pointer"
                >
                  <span className="block py-[5px] border-b-2 border-transparent hover:border-current transition-colors">
                    FDM Printers
                  </span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setInfoModal('how-it-works')}
                  className="px-[15px] font-srh-headline text-[20px] font-normal text-[#171717] hover:text-[#C12D00] transition-colors cursor-pointer"
                >
                  <span className="block py-[5px] border-b-2 border-transparent hover:border-current transition-colors">
                    How it works
                  </span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setInfoModal('contact')}
                  className="px-[15px] font-srh-headline text-[20px] font-normal text-[#171717] hover:text-[#C12D00] transition-colors cursor-pointer"
                >
                  <span className="block py-[5px] border-b-2 border-transparent hover:border-current transition-colors">
                    Campus Berlin
                  </span>
                </button>
              </li>
            </ul>

            {/* Meta Links (.b_header__list--meta) with | separator, DE/EN, Search & Hamburger */}
            <ul className="flex items-center">
              <li className="hidden lg:block text-[#575756] text-[18px] leading-[30px] mx-2 select-none">
                |
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setLang(lang === 'EN' ? 'DE' : 'EN')}
                  className="px-[10px] font-srh-headline text-[18px] lg:text-[20px] font-normal uppercase text-[#171717] hover:text-[#C12D00] transition-colors cursor-pointer"
                  title="Switch language (DE / EN)"
                >
                  <span className="block py-[5px] border-b-2 border-transparent hover:border-current">
                    {lang === 'EN' ? 'DE' : 'EN'}
                  </span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setInfoModal('printers')}
                  aria-label="Search printers and programmes"
                  className="w-[40px] h-[40px] flex items-center justify-center text-[#171717] hover:text-[#C12D00] transition-colors cursor-pointer"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="w-[22px] h-[22px]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="17" y2="17" />
                  </svg>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setInfoModal('how-it-works')}
                  aria-label="Open navigation menu"
                  className="w-[40px] h-[40px] flex items-center justify-center text-[#171717] hover:text-[#C12D00] transition-colors cursor-pointer"
                >
                  {/* Exact SRH .b_svg--menu asymmetric 3-line icon */}
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="w-[22px] h-[22px]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <line x1="21" y1="5" x2="3" y2="5" />
                    <line x1="21" y1="12" x2="7" y2="12" />
                    <line x1="21" y1="19" x2="3" y2="19" />
                  </svg>
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      {/* ===================================================================
          2. OFFICIAL SRH STAGE HERO (.b_cm_stage)
             Features:
             - Deep #001725 (--color-black-blue) & FDM 3D Printer visual stage
             - Official SRH .b_flow__svg S-Curve Wave Ribbon (#ff6a30 -> #e9501e)
             - Official .b_stage-headline solid #D54407 inline boxed headline
             - Right floating SRH Speech-Bubble Login Card (rounded-[20px_20px_20px_0px])
         =================================================================== */}
      <section className="relative bg-[#001725] text-white overflow-hidden py-10 lg:py-14 flex-1 flex items-center">
        {/* Background Layer: Studio FDM 3D Printer & SRH Berlin Campus Architecture */}
        <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
          <svg
            viewBox="0 0 1440 900"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full object-cover opacity-50"
            preserveAspectRatio="xMidYMid slice"
          >
            <defs>
              <linearGradient id="gantryMetal" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#1E293B" />
                <stop offset="50%" stopColor="#0F172A" />
                <stop offset="100%" stopColor="#001725" />
              </linearGradient>
              <linearGradient id="latticeGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FF6A30" stopOpacity="0.65" />
                <stop offset="100%" stopColor="#00699A" stopOpacity="0.4" />
              </linearGradient>
            </defs>

            {/* SRH Campus Architectural Vertical Mullions (like Header-2025-August-Neu.jpg) */}
            <rect x="60" y="0" width="24" height="900" fill="#0D2538" opacity="0.7" />
            <rect x="190" y="0" width="24" height="900" fill="#0D2538" opacity="0.7" />
            <rect x="320" y="0" width="24" height="900" fill="#0D2538" opacity="0.7" />
            <rect x="450" y="0" width="24" height="900" fill="#0D2538" opacity="0.7" />

            {/* Left & Center Printer Frame Extrusions */}
            <rect x="250" y="0" width="42" height="900" fill="url(#gantryMetal)" />
            <rect x="285" y="0" width="4" height="900" fill="#475569" opacity="0.5" />
            <rect x="730" y="0" width="38" height="900" fill="url(#gantryMetal)" />

            {/* Horizontal X-Axis Carbon/Steel Rods & Extruder Carriage */}
            <rect x="90" y="120" width="980" height="22" fill="#1E293B" />
            <rect x="90" y="158" width="980" height="14" fill="#334155" />

            {/* Hotend Print Head Assembly */}
            <rect
              x="420"
              y="78"
              width="160"
              height="135"
              rx="10"
              fill="#0F172A"
              stroke="#475569"
              strokeWidth="2"
            />
            <rect x="445" y="100" width="110" height="65" rx="6" fill="#1E293B" />
            <path d="M465 213H535L518 246H482L465 213Z" fill="#334155" />
            <path d="M492 246H508L503 262H497L492 246Z" fill="#F59E0B" />
            <circle cx="500" cy="265" r="48" fill="#FF6A30" fillOpacity="0.22" />

            {/* Complex Voronoi / Gyroid 3D Printed Lattice Dome on Build Plate */}
            <g transform="translate(335, 262)">
              <path
                d="M30 430 C30 160, 110 20, 165 4 C220 20, 300 160, 300 430 Z"
                fill="#071320"
                stroke="url(#latticeGlow)"
                strokeWidth="3"
              />
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
              <ellipse cx="165" cy="120" rx="16" ry="24" fill="#001725" stroke="#64748B" strokeWidth="2.5" />
              <ellipse cx="128" cy="185" rx="18" ry="28" fill="#001725" stroke="#475569" strokeWidth="2.5" />
              <ellipse cx="202" cy="185" rx="18" ry="28" fill="#001725" stroke="#475569" strokeWidth="2.5" />
              <ellipse cx="165" cy="245" rx="22" ry="32" fill="#001725" stroke="#64748B" strokeWidth="2.5" />
              <ellipse cx="115" cy="295" rx="20" ry="30" fill="#001725" stroke="#475569" strokeWidth="2.5" />
              <ellipse cx="215" cy="295" rx="20" ry="30" fill="#001725" stroke="#475569" strokeWidth="2.5" />
              <ellipse cx="165" cy="355" rx="24" ry="34" fill="#001725" stroke="#64748B" strokeWidth="2.5" />
            </g>

            {/* Textured PEI Print Bed Platform */}
            <rect
              x="190"
              y="690"
              width="620"
              height="24"
              rx="4"
              fill="#1E293B"
              stroke="#475569"
              strokeWidth="2"
            />
            <rect x="150" y="714" width="700" height="60" fill="#00111C" />
          </svg>

          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#001725]/80 via-[#001725]/45 to-[#001725]/70" />

          {/* Official SRH .b_flow__svg S-Curve Wave Ribbon scraped directly from srh-university.de */}
          <div className="absolute right-0 bottom-[-120px] lg:top-[28%] w-full min-w-[1800px] pointer-events-none opacity-55">
            <svg
              viewBox="0 0 1800 760"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-auto"
              aria-hidden="true"
            >
              <defs>
                <linearGradient
                  x1="-2.941%"
                  y1="61.505%"
                  x2="100%"
                  y2="38.495%"
                  id="srh_flow_gradient"
                >
                  <stop offset="0%" stopColor="#ff6a30" />
                  <stop offset="50%" stopColor="#f45d27" />
                  <stop offset="100%" stopColor="#e9501e" />
                </linearGradient>
              </defs>
              <path
                d="M0 660h1280c85 0 260 0 260-280s173.898-280 260-280"
                stroke="url(#srh_flow_gradient)"
                strokeWidth="190"
                strokeLinecap="butt"
                strokeLinejoin="miter"
                fill="none"
              />
            </svg>
          </div>
        </div>

        {/* Stage Content Grid (.b_st-content__container) */}
        <div className="relative z-10 w-full max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-[6%] flex flex-col lg:flex-row items-center justify-between gap-12">
          {/* Left Column: Official SRH .b_stage-headline Boxed Headline & Role Cards */}
          <div className="flex-1 max-w-[680px] space-y-8">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-[12px_12px_12px_2px] bg-[#001725]/85 border border-white/20 text-white font-srh-headline text-[12px] font-bold uppercase tracking-[0.166em]">
                <span className="w-2 h-2 rounded-full bg-[#D54407]" />
                SRH University Berlin • MakerLab &amp; FDM Print Center
              </div>

              {/* Exact SRH .b_headline--h2 > .b_stage-headline with box-decoration-break: clone */}
              <h1 className="font-srh-headline text-[36px] sm:text-[46px] lg:text-[54px] font-bold leading-[1.275] tracking-[0.3px]">
                <span className="srh-stage-headline">
                  3D Printing for Ideas that Matter - SRH University
                </span>
              </h1>

              <p className="text-[18px] sm:text-[20px] leading-[32px] text-white font-normal max-w-xl drop-shadow-xs">
                FDM Printer Request, Academic Approval and Lab Access Management System for students, faculty, and laboratory administrators at Campus Berlin.
              </p>
            </div>

            {/* Three Role Quick-Select Cards on Stage */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('USR-STU-01')}
                className="group text-left p-4 rounded-[20px_20px_20px_2px] bg-[#001725]/85 hover:bg-[#D54407] border border-white/20 hover:border-[#D54407] transition-all cursor-pointer backdrop-blur-xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-white/60 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                </div>
                <div className="font-srh-headline text-[16px] font-bold text-white">
                  For Students
                </div>
                <div className="text-[13px] text-white/80 mt-0.5">
                  Submit STL print requests
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('USR-PROF-01')}
                className="group text-left p-4 rounded-[20px_20px_20px_2px] bg-[#001725]/85 hover:bg-[#D54407] border border-white/20 hover:border-[#D54407] transition-all cursor-pointer backdrop-blur-xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-white/60 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                </div>
                <div className="font-srh-headline text-[16px] font-bold text-white">
                  For Professors
                </div>
                <div className="text-[13px] text-white/80 mt-0.5">
                  Review and approve
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('USR-PC-01')}
                className="group text-left p-4 rounded-[20px_20px_20px_2px] bg-[#001725]/85 hover:bg-[#D54407] border border-white/20 hover:border-[#D54407] transition-all cursor-pointer backdrop-blur-xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-white/60 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                </div>
                <div className="font-srh-headline text-[16px] font-bold text-white">
                  For PC Admin
                </div>
                <div className="text-[13px] text-white/80 mt-0.5">
                  Manage and authorize
                </div>
              </button>
            </div>
          </div>

          {/* Right Column: Official SRH Speech-Bubble Login Card (border-radius: 20px 20px 20px 0px) */}
          <div className="w-full max-w-[440px] bg-white text-[#575756] rounded-[20px_20px_20px_0px] shadow-[0_24px_60px_rgba(0,0,0,0.45)] border border-[#DDDAD8] p-7 sm:p-9">
            <div className="mb-6">
              <span className="srh-overline block mb-1.5">
                mySRH Campus Portal • Login
              </span>
              <h2 className="font-srh-headline text-[28px] leading-[34px] font-bold text-[#171717]">
                Login to your Account
              </h2>
              <p className="text-[15px] leading-[22px] text-[#575756] mt-1">
                Use your SRH credentials to access the system.
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-5 p-3.5 rounded-[10px] bg-red-50 border border-[#E60000]/40 flex items-start gap-2.5 text-[13px] text-[#B91C1C]"
              >
                <AlertCircle className="w-4 h-4 text-[#E60000] shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Authentic SRH .b_form & .b_textinput styling */}
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="flex flex-col">
                <label
                  htmlFor="srh-email-input"
                  className="text-[14px] leading-[20px] text-[#575756] mx-[10px] mb-[5px] inline-flex items-center"
                >
                  <span>Email (SRH)</span>
                  <span className="text-[#D54407] ml-0.5 font-bold">*</span>
                </label>
                <input
                  id="srh-email-input"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@srh-berlin.de"
                  required
                  className="srh-textinput"
                />
              </div>

              <div className="flex flex-col">
                <label
                  htmlFor="srh-password-input"
                  className="text-[14px] leading-[20px] text-[#575756] mx-[10px] mb-[5px] inline-flex items-center"
                >
                  <span>Password</span>
                  <span className="text-[#D54407] ml-0.5 font-bold">*</span>
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
                    className="srh-textinput pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 px-4 flex items-center text-[#575756] hover:text-[#171717] cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div className="mt-2 flex justify-end px-1">
                  <button
                    type="button"
                    onClick={() => setForgotModalOpen(true)}
                    className="text-[13px] font-bold text-[#171717] hover:text-[#C12D00] underline underline-offset-2 transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>

              {/* Official SRH .b_button--primary (border-radius: 20px 20px 20px 2px) */}
              <button
                type="submit"
                className="srh-btn-primary w-full cursor-pointer mt-1"
              >
                Login
              </button>
            </form>

            {/* Divider */}
            <div className="my-4 flex items-center gap-3">
              <div className="h-[1px] flex-1 bg-[#DDDAD8]" />
              <span className="text-[12px] text-[#736E6B] font-normal">or</span>
              <div className="h-[1px] flex-1 bg-[#DDDAD8]" />
            </div>

            {/* Official SRH .b_button--secondary speech-bubble button for Microsoft SSO */}
            <button
              type="button"
              onClick={() => void handleMicrosoftLogin()}
              className="srh-btn-secondary w-full gap-2.5 cursor-pointer"
            >
              <svg width="16" height="16" viewBox="0 0 21 21" aria-hidden="true">
                <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
              </svg>
              <span>Login with Microsoft (SRH)</span>
            </button>

            {/* Demonstration Accounts (1-Click Sign In) styled with SRH #F5F4F3 & #DDDAD8 */}
            <div className="mt-6 pt-4 border-t border-[#DDDAD8]">
              <div className="flex items-center justify-between mb-2.5">
                <span className="font-srh-headline text-[11px] font-bold uppercase tracking-[0.14em] text-[#575756]">
                  Demonstration Accounts (1-Click Sign In)
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('USR-STU-01')}
                  className="px-3 py-2.5 rounded-[12px_12px_12px_2px] bg-[#F5F4F3] hover:bg-[#D54407] text-[#171717] hover:text-white border border-[#DDDAD8] hover:border-[#D54407] text-left transition-colors group cursor-pointer"
                >
                  <div className="font-srh-headline text-[13px] font-bold">
                    Student
                  </div>
                  <div className="text-[11px] text-[#575756] group-hover:text-white/90 truncate">
                    Anna Müller
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('USR-PROF-01')}
                  className="px-3 py-2.5 rounded-[12px_12px_12px_2px] bg-[#F5F4F3] hover:bg-[#D54407] text-[#171717] hover:text-white border border-[#DDDAD8] hover:border-[#D54407] text-left transition-colors group cursor-pointer"
                >
                  <div className="font-srh-headline text-[13px] font-bold">
                    Professor
                  </div>
                  <div className="text-[11px] text-[#575756] group-hover:text-white/90 truncate">
                    Ajinkya Keskar
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('USR-PC-01')}
                  className="px-3 py-2.5 rounded-[12px_12px_12px_2px] bg-[#F5F4F3] hover:bg-[#D54407] text-[#171717] hover:text-white border border-[#DDDAD8] hover:border-[#D54407] text-left transition-colors group cursor-pointer"
                >
                  <div className="font-srh-headline text-[13px] font-bold">
                    PC Admin
                  </div>
                  <div className="text-[11px] text-[#575756] group-hover:text-white/90 truncate">
                    PC Admin
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          3. OFFICIAL SRH .b_programfinder-stage BAR (#001725)
             Matches "Find your dream study programme" bar on srh-university.de
         =================================================================== */}
      <section className="bg-[#001725] text-white py-[30px] px-4 sm:px-8 border-t border-white/10">
        <div className="max-w-[1160px] mx-auto">
          <div className="font-srh-headline text-[20px] lg:text-[24px] font-bold leading-[30px] tracking-[0.3px] text-white">
            Select your role in the SRH Berlin 3D Printing Workflow
          </div>

          <div className="mt-[15px] flex flex-col lg:flex-row bg-white lg:bg-[#001725] rounded-[20px_20px_20px_0px] lg:rounded-none overflow-hidden shadow-lg">
            {/* Column 1: Student Portal */}
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('USR-STU-01')}
              className="flex-1 bg-white hover:bg-[#F5F4F3] text-[#575756] py-[20px] px-[30px] border-b lg:border-b-0 lg:border-r border-[#AAA39D] text-left relative group transition-colors cursor-pointer"
            >
              <span className="block text-[12px] font-normal leading-[20px] tracking-[0.3px] text-[#575756]">
                Step 01 • Students &amp; Applicants
              </span>
              <span className="block text-[15px] lg:text-[16px] font-bold leading-[28px] tracking-[0.3px] text-[#171717] group-hover:text-[#D54407] transition-colors pr-6">
                Anna Müller — Upload STL &amp; Request Print
              </span>
              <Plus className="w-6 h-6 text-[#D54407] absolute right-5 top-1/2 -translate-y-1/2 group-hover:rotate-90 transition-transform" />
            </button>

            {/* Column 2: Professor Portal */}
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('USR-PROF-01')}
              className="flex-1 bg-white hover:bg-[#F5F4F3] text-[#575756] py-[20px] px-[30px] border-b lg:border-b-0 lg:border-r border-[#AAA39D] text-left relative group transition-colors cursor-pointer"
            >
              <span className="block text-[12px] font-normal leading-[20px] tracking-[0.3px] text-[#575756]">
                Step 02 • Academic Review
              </span>
              <span className="block text-[15px] lg:text-[16px] font-bold leading-[28px] tracking-[0.3px] text-[#171717] group-hover:text-[#D54407] transition-colors pr-6">
                Prof. Ajinkya Keskar — Approve Course Models
              </span>
              <Plus className="w-6 h-6 text-[#D54407] absolute right-5 top-1/2 -translate-y-1/2 group-hover:rotate-90 transition-transform" />
            </button>

            {/* Column 3: PC Admin Portal */}
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('USR-PC-01')}
              className="flex-1 bg-white hover:bg-[#F5F4F3] text-[#575756] py-[20px] px-[30px] text-left relative group transition-colors cursor-pointer"
            >
              <span className="block text-[12px] font-normal leading-[20px] tracking-[0.3px] text-[#575756]">
                Step 03 • Lab Authorization
              </span>
              <span className="block text-[15px] lg:text-[16px] font-bold leading-[28px] tracking-[0.3px] text-[#171717] group-hover:text-[#D54407] transition-colors pr-6">
                PC Admin — Assign Printer &amp; Grant Access
              </span>
              <Plus className="w-6 h-6 text-[#D54407] absolute right-5 top-1/2 -translate-y-1/2 group-hover:rotate-90 transition-transform" />
            </button>

            {/* Right CTA Button (.b_programfinder-stage .b_button--primary) */}
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('srh-email-input');
                el?.focus();
              }}
              className="bg-[#D54407] hover:bg-[#C12D00] text-white font-bold text-[16px] leading-[20px] py-[18px] px-[28px] lg:w-[220px] lg:rounded-[0px_20px_20px_0px] flex items-center justify-center transition-colors cursor-pointer shrink-0"
            >
              Find printer
            </button>
          </div>
        </div>
      </section>

      {/* ===================================================================
          4. OFFICIAL SRH FOOTER (.b_footer & .b_footer__bottom in #D54407)
         =================================================================== */}
      <footer className="bg-[#F5F4F3] text-[#575756] border-t border-[#DDDAD8]">
        {/* Upper Campus Info Strip */}
        <div className="max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-[6%] py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <span className="srh-overline block">
              Quality is measurable • Berlin Campus
            </span>
            <h3 className="font-srh-headline text-[22px] sm:text-[26px] font-bold text-[#575756] mt-1">
              Study &amp; prototype with excellence — SRH Berlin MakerLab &amp; FDM Print Center
            </h3>
          </div>
          <div className="text-[14px] text-[#575756] space-y-0.5 md:text-right">
            <div className="font-bold text-[#171717]">
              Ernst-Reuter-Platz 10, 10587 Berlin
            </div>
            <div>
              Faculty Supervisor: Prof. Ajinkya Keskar • Lab Operations: PC Admin
            </div>
          </div>
        </div>

        {/* Official SRH Orange Bottom Footer (.b_footer__bottom) */}
        <div className="bg-[#D54407] text-white py-[30px] px-6 sm:px-10 lg:px-[6%]">
          <div className="max-w-[1440px] mx-auto flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              {/* All-white SRH University Logo (.b_footer__logo-link) */}
              <svg
                aria-hidden="true"
                viewBox="0 0 600 168"
                className="h-[42px] sm:h-[50px] w-auto"
              >
                <path
                  fill="#FFFFFF"
                  d="M141.5 136.5h20V.5h-20v136zm44.107-91.93c-3.756-.186-8.431 0-13.107.555v18.732c17.6 0 24.018 2.609 24.018 19.109V136.5H216.5V80.468c0-20.685-11.642-35.157-30.893-35.899v.001zm-137.73.991C26.493 46.673 17 60.935 17 83.627v45.76c0 13.336-2.674 19.08-16.499 19.358v18.513c1.658.28 4.33.28 5.714.186 21.477-1.296 30.878-15.652 30.878-38.066v-45.76c0-13.428 2.49-19.078 16.408-19.356V45.654c-1.569-.186-4.24-.186-5.623-.093h-.001zm62.002 0C88.93 46.671 79.5 60.994 79.5 83.545V136.5h19.769V83.536c0-13.307 2.629-19.037 16.231-19.314V45.654c-1.633-.186-4.26-.186-5.621-.093z"
                />
                <path
                  fill="#FFFFFF"
                  fillRule="nonzero"
                  d="M311.25 136.72c-4.05 0-7.55-.81-10.49-2.43-2.94-1.62-5.2-3.93-6.78-6.94-1.58-3.01-2.37-6.54-2.37-10.59V90.72h9.79v26.04c0 3.37.86 5.96 2.59 7.77 1.73 1.81 4.15 2.72 7.26 2.72 3.11 0 5.62-.91 7.39-2.72 1.77-1.81 2.66-4.4 2.66-7.77V90.72h9.79v26.04c0 4.05-.8 7.58-2.4 10.59-1.6 3.01-3.88 5.32-6.85 6.94-2.96 1.62-6.49 2.43-10.59 2.43zM337.29 135.5v-18.68c0-4.69 1.33-8.32 4-10.88 2.67-2.56 6.37-3.84 11.1-3.84 4.73 0 8.43 1.28 11.1 3.84 2.67 2.56 4 6.18 4 10.88v18.68h-9.08v-18.55c0-2.05-.55-3.64-1.66-4.77-1.11-1.13-2.56-1.7-4.35-1.7-1.79 0-3.24.57-4.35 1.7-1.11 1.13-1.66 2.72-1.66 4.77v18.55h-9.1zM377.72 99.99c-1.58 0-2.9-.52-3.97-1.57-1.07-1.04-1.6-2.33-1.6-3.87s.53-2.83 1.6-3.87 2.39-1.57 3.97-1.57 2.9.52 3.97 1.57c1.07 1.05 1.6 2.34 1.6 3.87 0 1.53-.53 2.83-1.6 3.87-1.07 1.05-2.39 1.57-3.97 1.57zm-4.54 35.51v-32.31h9.08v32.31h-9.08zM397.88 135.5l-12.48-32.31h10.04l7.36 21.11 7.29-21.11h9.72L407.4 135.5h-9.53.01zM437.86 136.59c-3.33 0-6.31-.76-8.96-2.27-2.65-1.51-4.72-3.58-6.24-6.21-1.51-2.62-2.27-5.6-2.27-8.92 0-3.32.75-6.02 2.24-8.61 1.49-2.58 3.53-4.64 6.11-6.17 2.58-1.54 5.49-2.3 8.73-2.3s6.23.73 8.7 2.18c2.47 1.45 4.4 3.42 5.79 5.92 1.39 2.5 2.08 5.32 2.08 8.48v3.39h-24.18c.43 2.09 1.38 3.71 2.85 4.86 1.47 1.15 3.32 1.73 5.53 1.73 1.54 0 2.93-.34 4.19-1.02 1.26-.68 2.38-1.81 3.36-3.39l7.29 4.73c-1.58 2.47-3.61 4.36-6.11 5.66-2.5 1.3-5.54 1.95-9.12 1.95l.01-.01zm-.38-26.55c-1.83 0-3.39.5-4.67 1.5-1.28 1-2.2 2.36-2.75 4.06h14.59c-.38-1.66-1.19-3.01-2.43-4.03-1.24-1.02-2.82-1.54-4.74-1.54v.01zM458.79 135.5v-18.43c0-4.78 1.35-8.38 4.06-10.81 2.71-2.43 6.22-3.65 10.52-3.65.85 0 1.71.05 2.56.16.85.11 1.62.25 2.3.42v8.06c-.51-.08-1.06-.15-1.63-.19-.58-.04-1.18-.06-1.82-.06-2.09 0-3.76.58-5.02 1.73-1.26 1.15-1.89 2.73-1.89 4.73v18.04h-9.08zM494.42 136.59c-3.11 0-5.98-.6-8.61-1.79-2.62-1.19-4.55-2.77-5.79-4.73l6.27-5.05c2.3 2.69 5.05 4.03 8.25 4.03 1.49 0 2.64-.27 3.46-.8.81-.53 1.21-1.27 1.21-2.21 0-1.37-1.04-2.2-3.13-2.5l-4.61-.7c-6.83-1.02-10.24-4.42-10.24-10.17 0-3.2 1.24-5.76 3.71-7.68 2.47-1.92 5.78-2.88 9.92-2.88 2.52 0 4.92.53 7.2 1.6 2.28 1.07 4.08 2.5 5.41 4.29l-5.95 4.86c-1.79-2.13-4.01-3.2-6.65-3.2-1.32 0-2.39.25-3.2.74s-1.22 1.16-1.22 2.02c0 1.45.98 2.33 2.94 2.62l4.09.58c7.25 1.02 10.88 4.31 10.88 9.85 0 3.5-1.24 6.23-3.71 8.19-2.47 1.96-5.89 2.94-10.24 2.94l.01-.01zM518.29 99.99c-1.58 0-2.9-.52-3.97-1.57-1.07-1.04-1.6-2.33-1.6-3.87s.53-2.83 1.6-3.87 2.39-1.57 3.97-1.57 2.9.52 3.97 1.57c1.07 1.05 1.6 2.34 1.6 3.87 0 1.53-.53 2.83-1.6 3.87-1.07 1.05-2.39 1.57-3.97 1.57zm-4.55 35.51v-32.31h9.08v32.31h-9.08zM540.74 136.08c-3.75 0-6.68-1.02-8.77-3.07s-3.13-5.16-3.13-9.34V94.62h9.08v8.57h8.19v7.68h-8.19v12.8c0 1.66.42 2.83 1.25 3.49.83.66 2.08.99 3.74.99.47 0 1.01-.02 1.63-.06.62-.04 1.18-.08 1.7-.13v7.55c-.9.17-1.77.31-2.62.42-.85.11-1.81.16-2.88.16v-.01zM563.07 135.5c-3.88 0-6.91-1.28-9.09-3.84-2.17-2.56-3.26-6.14-3.26-10.75v-17.72h9.08v16.83c0 2.22.51 3.92 1.54 5.12 1.02 1.19 2.5 1.79 4.41 1.79 1.91 0 3.56-.61 4.67-1.82 1.11-1.22 1.66-2.91 1.66-5.09v-16.83h9.08v30.13c0 5.46-1.42 9.75-4.25 12.86-2.84 3.11-6.75 4.67-11.74 4.67-3.37 0-6.31-.66-8.83-1.98-2.52-1.32-4.41-3.18-5.69-5.57l6.85-4.99c1.07 1.45 2.19 2.53 3.36 3.23 1.17.7 2.61 1.06 4.32 1.06 4.61 0 6.91-2.75 6.91-8.25v-2.62c-1.11 1.19-2.43 2.12-3.97 2.78-1.54.66-3.22.99-5.05.99z"
                />
              </svg>

              {/* Official SRH Social Icons (.b_footer__social-list) */}
              <ul className="flex items-center gap-5">
                <li>
                  <a
                    href="https://www.instagram.com/srh_university_international/"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Instagram"
                    className="text-white hover:opacity-80 transition-opacity"
                  >
                    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2.5" y="2.5" width="19" height="19" rx="4.75" />
                      <path d="M15.8,11.4a3.8,3.8,0,1,1-4.32-3.2,4.2,4.2,0,0,1,1.12,0A3.82,3.82,0,0,1,15.8,11.4Z" />
                      <line x1="17.22" y1="6.77" x2="17.23" y2="6.77" />
                    </svg>
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.facebook.com/srhuniversityinternational"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Facebook"
                    className="text-white hover:opacity-80 transition-opacity"
                  >
                    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.73,2.5H14.88a4.76,4.76,0,0,0-4.76,4.75V10.1H7.28v3.8h2.84v7.6h3.8V13.9h2.86l.95-3.8H13.92V7.25a1,1,0,0,1,1-1h2.85Z" />
                    </svg>
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.youtube.com/@srhuniversity"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="YouTube"
                    className="text-white hover:opacity-80 transition-opacity"
                  >
                    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21.51,6.94a2.52,2.52,0,0,0-1.75-1.81A64.79,64.79,0,0,0,12,4.75s-6.21,0-7.76.42A2.49,2.49,0,0,0,2.49,7a25.59,25.59,0,0,0-.42,4.78,25.91,25.91,0,0,0,.42,4.81,2.5,2.5,0,0,0,1.75,1.73c1.55.42,7.76.42,7.76.42s6.21,0,7.76-.42a2.49,2.49,0,0,0,1.75-1.8,27,27,0,0,0,.42-4.74A25.83,25.83,0,0,0,21.51,6.94Z" />
                      <polygon points="9.97 14.7 15.16 11.75 9.97 8.8 9.97 14.7" />
                    </svg>
                  </a>
                </li>
                <li>
                  <a
                    href="https://linkedin.com/school/srh-university"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="LinkedIn"
                    className="text-white hover:opacity-80 transition-opacity"
                  >
                    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M15.8,8.18a5.7,5.7,0,0,1,5.7,5.7v6.65H17.7V13.88a1.9,1.9,0,1,0-3.8,0v6.65H10.1V13.88A5.7,5.7,0,0,1,15.8,8.18Z" />
                      <rect x="2.5" y="9.13" width="3.8" height="11.4" />
                      <circle cx="4.4" cy="4.38" r="1.9" />
                    </svg>
                  </a>
                </li>
              </ul>
            </div>

            {/* Official SRH Secondary Footer Links (.b_footer__secondary-nav-list) */}
            <ul className="flex flex-wrap items-center gap-x-7 gap-y-2 text-[12px] leading-[24px] text-white">
              <li>© 2026 SRH University Berlin</li>
              <li>
                <button
                  type="button"
                  onClick={() => setInfoModal('contact')}
                  className="hover:underline underline-offset-2 cursor-pointer"
                >
                  Your contact
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setInfoModal('how-it-works')}
                  className="hover:underline underline-offset-2 cursor-pointer"
                >
                  Accessibility Statement
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setInfoModal('contact')}
                  className="hover:underline underline-offset-2 cursor-pointer"
                >
                  Legal Notice
                </button>
              </li>
              <li>
                <a
                  href="https://www.srh.de/de"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline underline-offset-2"
                >
                  SRH Holding
                </a>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setInfoModal('how-it-works')}
                  className="hover:underline underline-offset-2 cursor-pointer"
                >
                  Data Privacy Policy
                </button>
              </li>
              <li className="text-white/80 ml-auto">
                Demonstration Environment • IndexedDB &amp; LocalStorage Persistence Active
              </li>
            </ul>
          </div>
        </div>
      </footer>

      {/* ===================================================================
          MODALS (Microsoft SSO, Password Recovery, Header Info)
         =================================================================== */}
      {ssoOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white text-[#575756] rounded-[20px_20px_20px_0px] max-w-md w-full p-7 shadow-2xl border border-[#DDDAD8]">
            <div className="flex items-center justify-between pb-3 border-b border-[#DDDAD8]">
              <div className="flex items-center gap-2.5">
                <svg width="18" height="18" viewBox="0 0 21 21">
                  <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                  <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                  <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                  <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
                </svg>
                <span className="font-srh-headline text-[16px] font-bold text-[#171717]">
                  Microsoft Entra ID — SRH University
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSsoOpen(false)}
                className="text-[#575756] hover:text-[#171717] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-[14px] text-[#575756] mt-3">
              Real Microsoft sign-in is not configured yet (set VITE_MSAL_CLIENT_ID and
              VITE_MSAL_TENANT_ID). Select a seeded SRH Berlin campus identity to complete simulated
              single sign-on:
            </p>
            <div className="mt-4 space-y-2.5">
              {users.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    setSsoOpen(false);
                    handleQuickDemoLogin(u.id);
                  }}
                  className="w-full p-3.5 rounded-[14px_14px_14px_2px] border border-[#DDDAD8] hover:border-[#D54407] hover:bg-[#F5F4F3] flex items-center justify-between text-left transition-colors cursor-pointer"
                >
                  <div>
                    <div className="font-srh-headline text-[15px] font-bold text-[#171717]">
                      {u.name}
                    </div>
                    <div className="text-[12px] text-[#575756]">{u.email}</div>
                  </div>
                  <span className="px-2.5 py-1 rounded text-[11px] font-bold bg-[#001725] text-white">
                    {u.role}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {forgotModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white text-[#575756] rounded-[20px_20px_20px_0px] max-w-md w-full p-7 shadow-2xl border border-[#DDDAD8]">
            <div className="flex items-center justify-between">
              <div>
                <span className="srh-overline block">mySRH Identity</span>
                <h3 className="font-srh-headline text-[22px] font-bold text-[#171717]">
                  SRH Password Recovery (Demo)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setForgotModalOpen(false)}
                className="text-[#575756] hover:text-[#171717] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-[14px] text-[#575756] mt-3 leading-relaxed">
              In this demonstration environment, any password of 4+ characters (default:{' '}
              <code className="px-1.5 py-0.5 rounded bg-[#F5F4F3] text-[#171717] font-mono">
                srh2024
              </code>
              ) works with our seeded SRH emails:
            </p>
            <ul className="mt-3 space-y-1.5 text-[13px] text-[#171717] bg-[#F5F4F3] p-4 rounded-[12px] border border-[#DDDAD8]">
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
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setForgotModalOpen(false)}
                className="srh-btn-primary cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {infoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white text-[#575756] rounded-[20px_20px_20px_0px] max-w-lg w-full p-7 shadow-2xl border border-[#DDDAD8]">
            <div className="flex items-center justify-between pb-3 border-b border-[#DDDAD8]">
              <div>
                <span className="srh-overline block">SRH University Berlin</span>
                <h3 className="font-srh-headline text-[22px] font-bold text-[#171717] capitalize">
                  {infoModal.replace(/-/g, ' ')} — Campus Berlin
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInfoModal(null)}
                className="text-[#575756] hover:text-[#171717] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {infoModal === 'programmes' && (
              <div className="mt-4 space-y-2 text-[13px] text-[#575756] max-h-72 overflow-y-auto pr-2">
                <p className="font-bold text-[#171717]">
                  Official SRH University Berlin Study Programmes with MakerLab Access:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-[#171717]">
                  {DEPARTMENTS.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
            )}

            {infoModal === 'printers' && (
              <div className="mt-4 space-y-2 text-[14px] text-[#575756]">
                <p>
                  Our Berlin MakerLab operates these printers:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-[#171717]">
                  <li>
                    <strong>Bambu P1P - 528 / 537 / 623 / 763:</strong> 256 × 256 × 256 mm • open frame
                  </li>
                  <li>
                    <strong>Bambu X1C:</strong> 256 × 256 × 256 mm • enclosed, hardened nozzle
                  </li>
                  <li>
                    <strong>Voron 2.4 - 1 / 2 / 3:</strong> enclosed CoreXY
                  </li>
                  <li>
                    <strong>Form Labs - Form 3:</strong> 145 × 145 × 185 mm • resin (SLA)
                  </li>
                </ul>
                <p>Filaments: PLA, PETG, ABS, ASA, PA6 CF, TPU</p>
              </div>
            )}

            {infoModal === 'how-it-works' && (
              <ol className="mt-4 list-decimal pl-5 space-y-2 text-[14px] text-[#171717]">
                <li>
                  <strong>Submit Request:</strong> Students upload their binary/ASCII STL, 3MF, or OBJ file and specify their SRH Berlin study programme, printer, and filament.
                </li>
                <li>
                  <strong>Professor Approval:</strong> Faculty (Prof. Ajinkya Keskar) inspect the 3D mesh in the browser, download the STL if needed, and approve academic relevance.
                </li>
                <li>
                  <strong>PC Administrator Final Approval:</strong> PC Admin verifies printer availability, assigns a machine, and grants time-limited access credentials.
                </li>
                <li>
                  <strong>Printer Access:</strong> Students view their unlocked printer connection details on the Printer Access screen.
                </li>
              </ol>
            )}

            {infoModal === 'contact' && (
              <div className="mt-4 space-y-2 text-[14px] text-[#171717]">
                <p className="font-bold">SRH Berlin MakerLab &amp; Print Center</p>
                <p>Ernst-Reuter-Platz 10, 10587 Berlin — Building B, Room 104</p>
                <p>Professor: Ajinkya Keskar (ajinkya.keskar@srh-berlin.de)</p>
                <p>Print Center Administration: PC Admin (pc.admin@srh-berlin.de)</p>
                <p>Lab Hours: Mon–Fri, 08:30 – 19:00 CET</p>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setInfoModal(null)}
                className="srh-btn-primary cursor-pointer"
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
