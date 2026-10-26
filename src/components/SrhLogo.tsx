import React from 'react';
import { Role } from '../types/models';

interface SrhLogoProps {
  variant?: 'dark-text' | 'light-text';
  subtitle?: 'system' | 'university';
  className?: string;
}

export const SrhLogo: React.FC<SrhLogoProps> = ({
  variant = 'dark-text',
  subtitle = 'system',
  className = '',
}) => {
  const isLight = variant === 'light-text';
  // Official SRH University brand colors scraped from https://www.srh-university.de/en/
  // --color-edu-primary: #d54407 (rgb(213, 68, 7))
  // --color-text-default: #575756 (rgb(87, 87, 86))
  const srhOrange = '#D54407';
  const metaColor = isLight ? '#FFFFFF' : '#575756';

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Official SRH University vector logo (.b_svg--logo-1he) from srh-university.de */}
      <svg
        viewBox="0 0 600 168"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="SRH University Logo"
        className="h-8 sm:h-9 w-auto shrink-0"
      >
        <path
          className="logoMain"
          fill={srhOrange}
          d="M141.5 136.5h20V.5h-20v136zm44.107-91.93c-3.756-.186-8.431 0-13.107.555v18.732c17.6 0 24.018 2.609 24.018 19.109V136.5H216.5V80.468c0-20.685-11.642-35.157-30.893-35.899v.001zm-137.73.991C26.493 46.673 17 60.935 17 83.627v45.76c0 13.336-2.674 19.08-16.499 19.358v18.513c1.658.28 4.33.28 5.714.186 21.477-1.296 30.878-15.652 30.878-38.066v-45.76c0-13.428 2.49-19.078 16.408-19.356V45.654c-1.569-.186-4.24-.186-5.623-.093h-.001zm62.002 0C88.93 46.671 79.5 60.994 79.5 83.545V136.5h19.769V83.536c0-13.307 2.629-19.037 16.231-19.314V45.654c-1.633-.186-4.26-.186-5.621-.093z"
        />
        <path
          className="logoMeta"
          fill={metaColor}
          fillRule="nonzero"
          d="M311.25 136.72c-4.05 0-7.55-.81-10.49-2.43-2.94-1.62-5.2-3.93-6.78-6.94-1.58-3.01-2.37-6.54-2.37-10.59V90.72h9.79v26.04c0 3.37.86 5.96 2.59 7.77 1.73 1.81 4.15 2.72 7.26 2.72 3.11 0 5.62-.91 7.39-2.72 1.77-1.81 2.66-4.4 2.66-7.77V90.72h9.79v26.04c0 4.05-.8 7.58-2.4 10.59-1.6 3.01-3.88 5.32-6.85 6.94-2.96 1.62-6.49 2.43-10.59 2.43zM337.29 135.5v-18.68c0-4.69 1.33-8.32 4-10.88 2.67-2.56 6.37-3.84 11.1-3.84 4.73 0 8.43 1.28 11.1 3.84 2.67 2.56 4 6.18 4 10.88v18.68h-9.08v-18.55c0-2.05-.55-3.64-1.66-4.77-1.11-1.13-2.56-1.7-4.35-1.7-1.79 0-3.24.57-4.35 1.7-1.11 1.13-1.66 2.72-1.66 4.77v18.55h-9.1zM377.72 99.99c-1.58 0-2.9-.52-3.97-1.57-1.07-1.04-1.6-2.33-1.6-3.87s.53-2.83 1.6-3.87 2.39-1.57 3.97-1.57 2.9.52 3.97 1.57c1.07 1.05 1.6 2.34 1.6 3.87 0 1.53-.53 2.83-1.6 3.87-1.07 1.05-2.39 1.57-3.97 1.57zm-4.54 35.51v-32.31h9.08v32.31h-9.08zM397.88 135.5l-12.48-32.31h10.04l7.36 21.11 7.29-21.11h9.72L407.4 135.5h-9.53.01zM437.86 136.59c-3.33 0-6.31-.76-8.96-2.27-2.65-1.51-4.72-3.58-6.24-6.21-1.51-2.62-2.27-5.6-2.27-8.92 0-3.32.75-6.02 2.24-8.61 1.49-2.58 3.53-4.64 6.11-6.17 2.58-1.54 5.49-2.3 8.73-2.3s6.23.73 8.7 2.18c2.47 1.45 4.4 3.42 5.79 5.92 1.39 2.5 2.08 5.32 2.08 8.48v3.39h-24.18c.43 2.09 1.38 3.71 2.85 4.86 1.47 1.15 3.32 1.73 5.53 1.73 1.54 0 2.93-.34 4.19-1.02 1.26-.68 2.38-1.81 3.36-3.39l7.29 4.73c-1.58 2.47-3.61 4.36-6.11 5.66-2.5 1.3-5.54 1.95-9.12 1.95l.01-.01zm-.38-26.55c-1.83 0-3.39.5-4.67 1.5-1.28 1-2.2 2.36-2.75 4.06h14.59c-.38-1.66-1.19-3.01-2.43-4.03-1.24-1.02-2.82-1.54-4.74-1.54v.01zM458.79 135.5v-18.43c0-4.78 1.35-8.38 4.06-10.81 2.71-2.43 6.22-3.65 10.52-3.65.85 0 1.71.05 2.56.16.85.11 1.62.25 2.3.42v8.06c-.51-.08-1.06-.15-1.63-.19-.58-.04-1.18-.06-1.82-.06-2.09 0-3.76.58-5.02 1.73-1.26 1.15-1.89 2.73-1.89 4.73v18.04h-9.08zM494.42 136.59c-3.11 0-5.98-.6-8.61-1.79-2.62-1.19-4.55-2.77-5.79-4.73l6.27-5.05c2.3 2.69 5.05 4.03 8.25 4.03 1.49 0 2.64-.27 3.46-.8.81-.53 1.21-1.27 1.21-2.21 0-1.37-1.04-2.2-3.13-2.5l-4.61-.7c-6.83-1.02-10.24-4.42-10.24-10.17 0-3.2 1.24-5.76 3.71-7.68 2.47-1.92 5.78-2.88 9.92-2.88 2.52 0 4.92.53 7.2 1.6 2.28 1.07 4.08 2.5 5.41 4.29l-5.95 4.86c-1.79-2.13-4.01-3.2-6.65-3.2-1.32 0-2.39.25-3.2.74s-1.22 1.16-1.22 2.02c0 1.45.98 2.33 2.94 2.62l4.09.58c7.25 1.02 10.88 4.31 10.88 9.85 0 3.5-1.24 6.23-3.71 8.19-2.47 1.96-5.89 2.94-10.24 2.94l.01-.01zM518.29 99.99c-1.58 0-2.9-.52-3.97-1.57-1.07-1.04-1.6-2.33-1.6-3.87s.53-2.83 1.6-3.87 2.39-1.57 3.97-1.57 2.9.52 3.97 1.57c1.07 1.05 1.6 2.34 1.6 3.87 0 1.53-.53 2.83-1.6 3.87-1.07 1.05-2.39 1.57-3.97 1.57zm-4.55 35.51v-32.31h9.08v32.31h-9.08zM540.74 136.08c-3.75 0-6.68-1.02-8.77-3.07s-3.13-5.16-3.13-9.34V94.62h9.08v8.57h8.19v7.68h-8.19v12.8c0 1.66.42 2.83 1.25 3.49.83.66 2.08.99 3.74.99.47 0 1.01-.02 1.63-.06.62-.04 1.18-.08 1.7-.13v7.55c-.9.17-1.77.31-2.62.42-.85.11-1.81.16-2.88.16v-.01zM563.07 135.5c-3.88 0-6.91-1.28-9.09-3.84-2.17-2.56-3.26-6.14-3.26-10.75v-17.72h9.08v16.83c0 2.22.51 3.92 1.54 5.12 1.02 1.19 2.5 1.79 4.41 1.79 1.91 0 3.56-.61 4.67-1.82 1.11-1.22 1.66-2.91 1.66-5.09v-16.83h9.08v30.13c0 5.46-1.42 9.75-4.25 12.86-2.84 3.11-6.75 4.67-11.74 4.67-3.37 0-6.31-.66-8.83-1.98-2.52-1.32-4.41-3.18-5.69-5.57l6.85-4.99c1.07 1.45 2.19 2.53 3.36 3.23 1.17.7 2.61 1.06 4.32 1.06 4.61 0 6.91-2.75 6.91-8.25v-2.62c-1.11 1.19-2.43 2.12-3.97 2.78-1.54.66-3.22.99-5.05.99z"
        />
      </svg>

      <div
        className={`h-6 w-[1px] shrink-0 ${
          isLight ? 'bg-white/25' : 'bg-[#DDDAD8]'
        }`}
      />

      {subtitle === 'university' ? (
        <div className="flex flex-col leading-tight">
          <span
            className={`text-[11px] font-bold uppercase tracking-wider ${
              isLight ? 'text-[#D54407]' : 'text-[#D54407]'
            }`}
          >
            Campus Berlin
          </span>
          <span
            className={`text-[12px] font-semibold ${
              isLight ? 'text-slate-200' : 'text-[#575756]'
            }`}
          >
            3D Printing &amp; MakerLab
          </span>
        </div>
      ) : (
        <div className="flex flex-col leading-tight text-left">
          <span
            className={`text-[10px] font-bold uppercase tracking-wider ${
              isLight ? 'text-[#D54407]' : 'text-[#D54407]'
            }`}
          >
            Campus Berlin
          </span>
          <span
            className={`text-[13px] font-bold tracking-tight ${
              isLight ? 'text-slate-100' : 'text-[#171717]'
            }`}
          >
            3D Printing System
          </span>
        </div>
      )}
    </div>
  );
};

interface UserAvatarProps {
  name: string;
  role: Role;
  size?: 'sm' | 'md' | 'lg';
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  name,
  role,
  size = 'md',
}) => {
  const dims =
    size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-11 h-11' : 'w-9 h-9';

  const lower = name.toLowerCase();
  const isAnna = lower.includes('anna');
  const isProf =
    role === 'PROFESSOR' ||
    lower.includes('ajinkya') ||
    lower.includes('keskar');
  const isPcAdmin = role === 'PC_ADMIN' || lower.includes('pc admin');

  if (isAnna) {
    // Portrait avatar matching Anna Müller in the reference UI
    return (
      <div
        className={`${dims} rounded-full overflow-hidden border border-slate-200 bg-amber-50 shrink-0 shadow-2xs`}
        title={`${name} (${role})`}
      >
        <svg viewBox="0 0 64 64" className="w-full h-full">
          <rect width="64" height="64" fill="#E2E8F0" />
          <circle cx="32" cy="32" r="30" fill="#CBD5E1" />
          {/* Shoulders / blazer */}
          <path d="M12 64C12 49 21 44 32 44C43 44 52 49 52 64" fill="#1E293B" />
          <path d="M25 44L32 54L39 44" fill="#F8FAFC" />
          {/* Neck & Face */}
          <rect x="28" y="36" width="8" height="10" rx="3" fill="#F1C2A5" />
          <ellipse cx="32" cy="27" rx="11" ry="13" fill="#F6D0B8" />
          {/* Dark brown hair */}
          <path
            d="M19 28C19 15 25 11 32 11C39 11 45 15 45 28C45 34 44 41 42 44C41 35 41 25 38 21C34 18 28 19 25 22C22 25 23 36 22 44C20 41 19 34 19 28Z"
            fill="#271B14"
          />
          {/* Eyes & smile */}
          <circle cx="28" cy="27" r="1.4" fill="#1E293B" />
          <circle cx="36" cy="27" r="1.4" fill="#1E293B" />
          <path
            d="M29 33C30.5 34.4 33.5 34.4 35 33"
            stroke="#B45309"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </div>
    );
  }

  if (isProf) {
    // Portrait avatar for Professor Ajinkya Keskar
    return (
      <div
        className={`${dims} rounded-full overflow-hidden border border-slate-200 bg-slate-100 shrink-0 shadow-2xs`}
        title={`${name} (${role})`}
      >
        <svg viewBox="0 0 64 64" className="w-full h-full">
          <rect width="64" height="64" fill="#DBEAFE" />
          {/* Suit & tie */}
          <path d="M10 64C10 48 20 43 32 43C44 43 54 48 54 64" fill="#0F172A" />
          <path d="M26 43L32 56L38 43" fill="#FFFFFF" />
          <path d="M31 46L33 46L34 57L32 60L30 57Z" fill="#D54407" />
          {/* Face */}
          <rect x="27" y="36" width="10" height="9" rx="3" fill="#E8B89A" />
          <ellipse cx="32" cy="26" rx="11.5" ry="13.5" fill="#F1C6AA" />
          {/* Hair */}
          <path
            d="M20.5 23C20.5 14 25.5 11 32 11C38.5 11 43.5 14 43.5 23C41 18 37 16 32 16C27 16 23 18 20.5 23Z"
            fill="#1E293B"
          />
          {/* Glasses */}
          <rect
            x="23.5"
            y="23.5"
            width="7"
            height="5"
            rx="1.2"
            stroke="#1E293B"
            strokeWidth="1.4"
            fill="none"
          />
          <rect
            x="33.5"
            y="23.5"
            width="7"
            height="5"
            rx="1.2"
            stroke="#1E293B"
            strokeWidth="1.4"
            fill="none"
          />
          <line x1="30.5" y1="25.5" x2="33.5" y2="25.5" stroke="#1E293B" strokeWidth="1.4" />
          <path
            d="M28.5 33.5C30.5 34.5 33.5 34.5 35.5 33.5"
            stroke="#475569"
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </div>
    );
  }

  if (isPcAdmin) {
    // Portrait avatar for PC Admin
    return (
      <div
        className={`${dims} rounded-full overflow-hidden border border-slate-200 bg-slate-100 shrink-0 shadow-2xs`}
        title={`${name} (${role})`}
      >
        <svg viewBox="0 0 64 64" className="w-full h-full">
          <rect width="64" height="64" fill="#E2E8F0" />
          <path d="M11 64C11 48 20 43 32 43C44 43 53 48 53 64" fill="#37484E" />
          <path d="M26 43L32 53L38 43" fill="#CBD5E1" />
          <rect x="27" y="36" width="10" height="9" rx="3" fill="#E5B596" />
          <ellipse cx="32" cy="26" rx="11" ry="13" fill="#F0C4A8" />
          <path
            d="M21 22C21 13 26 10 32 10C38 10 43 13 43 22C40 17 35 16 32 16C28 16 24 17 21 22Z"
            fill="#1E293B"
          />
          <circle cx="28" cy="26" r="1.4" fill="#0F172A" />
          <circle cx="36" cy="26" r="1.4" fill="#0F172A" />
          <path
            d="M28.5 33C30.5 34.5 33.5 34.5 35.5 33"
            stroke="#78350F"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </div>
    );
  }

  const initials = name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={`${dims} rounded-full bg-blue-600 text-white font-semibold text-xs flex items-center justify-center shrink-0`}
    >
      {initials}
    </div>
  );
};
