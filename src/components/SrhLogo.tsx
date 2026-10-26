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
  const markColor = isLight ? '#FFFFFF' : '#0F172A';

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* SRH geometric lowercase mark */}
      <svg
        width="54"
        height="30"
        viewBox="0 0 64 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="SRH Logo"
        className="shrink-0"
      >
        {/* 's' */}
        <path
          d="M15.5 11.5C12.5 11.5 9.5 13 9.5 16C9.5 21 17.5 19.5 17.5 25C17.5 28.5 14.2 30.5 9.5 30.5"
          stroke={markColor}
          strokeWidth="4.2"
          strokeLinecap="round"
        />
        {/* 'r' */}
        <path
          d="M25.5 30.5V19C25.5 14.2 28.8 11.5 33.5 11.5"
          stroke={markColor}
          strokeWidth="4.2"
          strokeLinecap="round"
        />
        {/* 'h' */}
        <path
          d="M41.5 4.5V30.5M41.5 18.5C41.5 14.2 44.8 11.5 49 11.5C53.2 11.5 56 14.2 56 18.5V30.5"
          stroke={markColor}
          strokeWidth="4.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {subtitle === 'university' ? (
        <div className="flex flex-col leading-tight">
          <span
            className={`text-[13px] font-semibold tracking-tight ${
              isLight ? 'text-white' : 'text-slate-900'
            }`}
          >
            Berlin
          </span>
          <span
            className={`text-[12px] font-medium ${
              isLight ? 'text-slate-200' : 'text-slate-600'
            }`}
          >
            University of Applied Sciences
          </span>
        </div>
      ) : (
        <span
          className={`text-[15px] font-medium tracking-tight ${
            isLight ? 'text-slate-100' : 'text-slate-700'
          }`}
        >
          3D Printing System
        </span>
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

  const isAnna = name.toLowerCase().includes('anna');
  const isWeber = name.toLowerCase().includes('weber');
  const isMarkus = name.toLowerCase().includes('markus');

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

  if (isWeber) {
    // Portrait avatar matching Prof. Dr. Weber
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
          <path d="M31 46L33 46L34 57L32 60L30 57Z" fill="#1662F3" />
          {/* Face */}
          <rect x="27" y="36" width="10" height="9" rx="3" fill="#E8B89A" />
          <ellipse cx="32" cy="26" rx="11.5" ry="13.5" fill="#F1C6AA" />
          {/* Hair & beard */}
          <path
            d="M20.5 23C20.5 14 25.5 11 32 11C38.5 11 43.5 14 43.5 23C41 18 37 16 32 16C27 16 23 18 20.5 23Z"
            fill="#475569"
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

  if (isMarkus) {
    // Portrait avatar matching Markus Klein (PC Administrator)
    return (
      <div
        className={`${dims} rounded-full overflow-hidden border border-slate-200 bg-slate-100 shrink-0 shadow-2xs`}
        title={`${name} (${role})`}
      >
        <svg viewBox="0 0 64 64" className="w-full h-full">
          <rect width="64" height="64" fill="#E2E8F0" />
          <path d="M11 64C11 48 20 43 32 43C44 43 53 48 53 64" fill="#1E293B" />
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
