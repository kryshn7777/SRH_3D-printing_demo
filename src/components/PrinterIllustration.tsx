import React from 'react';

export const PrinterIllustration: React.FC<{
  printerKey: 'prusa-mk4' | 'ultimaker-s5' | 'creality-k1' | 'bambu-x1e';
  className?: string;
}> = ({ printerKey, className = 'w-14 h-14' }) => {
  if (printerKey === 'prusa-mk4') {
    return (
      <div
        className={`rounded-lg bg-slate-100 border border-slate-200/80 flex items-center justify-center overflow-hidden shrink-0 ${className}`}
      >
        <svg viewBox="0 0 80 80" className="w-full h-full p-1.5">
          {/* Spool on top */}
          <circle cx="40" cy="13" r="8" fill="#1E293B" />
          <circle cx="40" cy="13" r="3.5" fill="#94A3B8" />
          {/* Gantry frame */}
          <rect x="18" y="18" width="4" height="44" rx="1" fill="#0F172A" />
          <rect x="58" y="18" width="4" height="44" rx="1" fill="#0F172A" />
          <rect x="18" y="18" width="44" height="4" rx="1" fill="#EA580C" />
          {/* X-axis rail & Nextruder */}
          <rect x="20" y="36" width="40" height="3" fill="#64748B" />
          <rect x="34" y="31" width="12" height="12" rx="2" fill="#EA580C" />
          <rect x="36" y="33" width="8" height="6" rx="1" fill="#0F172A" />
          {/* Printed part on bed */}
          <path d="M35 55L40 46L45 55Z" fill="#3B82F6" />
          {/* Heated bed & base */}
          <rect x="22" y="55" width="36" height="3" rx="1" fill="#334155" />
          <rect x="14" y="60" width="52" height="10" rx="2" fill="#0F172A" />
          <rect x="46" y="62" width="14" height="6" rx="1" fill="#EA580C" />
          <rect x="48" y="63" width="10" height="4" fill="#38BDF8" />
        </svg>
      </div>
    );
  }

  if (printerKey === 'ultimaker-s5') {
    return (
      <div
        className={`rounded-lg bg-slate-100 border border-slate-200/80 flex items-center justify-center overflow-hidden shrink-0 ${className}`}
      >
        <svg viewBox="0 0 80 80" className="w-full h-full p-1.5">
          {/* White Ultimaker enclosure */}
          <rect
            x="14"
            y="10"
            width="52"
            height="60"
            rx="4"
            fill="#F8FAFC"
            stroke="#CBD5E1"
            strokeWidth="2"
          />
          {/* Chamber interior */}
          <rect x="20" y="16" width="40" height="38" rx="2" fill="#1E293B" />
          {/* Top gantry & dual print head */}
          <line x1="20" y1="24" x2="60" y2="24" stroke="#94A3B8" strokeWidth="2" />
          <rect x="35" y="19" width="10" height="10" rx="2" fill="#F8FAFC" />
          {/* Glass doors with cyan glow */}
          <rect
            x="21"
            y="17"
            width="19"
            height="36"
            fill="#38BDF8"
            fillOpacity="0.14"
            stroke="#7DD3FC"
            strokeWidth="0.8"
          />
          <rect
            x="40"
            y="17"
            width="19"
            height="36"
            fill="#38BDF8"
            fillOpacity="0.14"
            stroke="#7DD3FC"
            strokeWidth="0.8"
          />
          {/* Printed bracket inside */}
          <rect x="33" y="42" width="14" height="8" rx="1" fill="#38BDF8" />
          <line x1="23" y1="50" x2="57" y2="50" stroke="#E2E8F0" strokeWidth="2" />
          {/* Touchscreen on bottom right */}
          <rect x="46" y="58" width="12" height="8" rx="1.5" fill="#0F172A" />
          <rect x="48" y="60" width="8" height="4" fill="#38BDF8" />
        </svg>
      </div>
    );
  }

  if (printerKey === 'creality-k1') {
    return (
      <div
        className={`rounded-lg bg-slate-100 border border-slate-200/80 flex items-center justify-center overflow-hidden shrink-0 ${className}`}
      >
        <svg viewBox="0 0 80 80" className="w-full h-full p-1.5">
          {/* Dark CoreXY enclosure */}
          <rect x="15" y="10" width="50" height="60" rx="4" fill="#0F172A" />
          {/* Smoked glass front door */}
          <rect
            x="20"
            y="16"
            width="40"
            height="40"
            rx="2"
            fill="#1E293B"
            stroke="#334155"
            strokeWidth="1.5"
          />
          {/* CoreXY toolhead */}
          <line x1="21" y1="26" x2="59" y2="26" stroke="#64748B" strokeWidth="2" />
          <rect x="35" y="21" width="10" height="11" rx="2" fill="#EF4444" />
          {/* Model on bed */}
          <path d="M32 50L40 36L48 50Z" fill="#F97316" />
          <line x1="23" y1="50" x2="57" y2="50" stroke="#94A3B8" strokeWidth="2" />
          {/* Screen */}
          <rect x="48" y="59" width="11" height="8" rx="1.5" fill="#334155" />
          <rect x="50" y="61" width="7" height="4" fill="#22C55E" />
        </svg>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg bg-slate-100 border border-slate-200/80 flex items-center justify-center overflow-hidden shrink-0 ${className}`}
    >
      <svg viewBox="0 0 80 80" className="w-full h-full p-1.5">
        {/* AMS on top */}
        <rect x="18" y="7" width="44" height="10" rx="2.5" fill="#475569" />
        {/* Bambu Lab X1E metallic body */}
        <rect x="15" y="17" width="50" height="53" rx="3" fill="#334155" />
        <rect x="20" y="22" width="40" height="36" rx="2" fill="#0F172A" />
        <line x1="21" y1="30" x2="59" y2="30" stroke="#94A3B8" strokeWidth="2" />
        <rect x="35" y="25" width="10" height="10" rx="1.5" fill="#CBD5E1" />
        <rect x="33" y="45" width="14" height="9" rx="1" fill="#10B981" />
        <line x1="23" y1="54" x2="57" y2="54" stroke="#64748B" strokeWidth="2" />
      </svg>
    </div>
  );
};

/**
 * Recreates the 3D CAD mechanical bracket render shown in Screen 6 & Screen 8
 * ("robot_arm_joint.stl" — dark metallic L-bracket with cylindrical shaft boss and 3 counterbored mounting holes)
 */
export const CadModelPreview: React.FC<{
  previewKey?: string;
  className?: string;
}> = ({ previewKey = 'bracket-joint', className = 'w-full h-36' }) => {
  return (
    <div
      className={`rounded-xl bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200 border border-slate-200/90 flex items-center justify-center overflow-hidden relative ${className}`}
    >
      {previewKey === 'bracket-joint' ? (
        <svg
          viewBox="0 0 220 160"
          className="w-full h-full max-w-[200px] max-h-[145px] drop-shadow-md"
        >
          <defs>
            <linearGradient id="metalTop" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#64748B" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>
            <linearGradient id="metalSide" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="100%" stopColor="#1E293B" />
            </linearGradient>
            <linearGradient id="metalDark" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="100%" stopColor="#0F172A" />
            </linearGradient>
          </defs>
          {/* Soft floor shadow */}
          <ellipse cx="112" cy="134" rx="74" ry="14" fill="#0F172A" fillOpacity="0.16" />

          {/* Isometric base plate of the robot arm bracket */}
          <polygon
            points="35,96 125,58 185,88 95,128"
            fill="url(#metalTop)"
            stroke="#1E293B"
            strokeWidth="1.5"
          />
          {/* Left-front thickness wall */}
          <polygon
            points="35,96 95,128 95,142 35,110"
            fill="url(#metalSide)"
            stroke="#0F172A"
            strokeWidth="1.2"
          />
          {/* Right-front thickness wall */}
          <polygon
            points="95,128 185,88 185,102 95,142"
            fill="url(#metalDark)"
            stroke="#0F172A"
            strokeWidth="1.2"
          />

          {/* Vertical housing tower on back-right */}
          <polygon
            points="115,32 168,58 168,96 115,70"
            fill="url(#metalSide)"
            stroke="#1E293B"
            strokeWidth="1.4"
          />
          {/* Diagonal reinforcement gusset rib */}
          <polygon
            points="82,82 115,32 115,70"
            fill="#475569"
            stroke="#1E293B"
            strokeWidth="1.2"
          />
          <polygon
            points="128,104 168,58 168,96"
            fill="#334155"
            stroke="#1E293B"
            strokeWidth="1.2"
          />

          {/* Top cylindrical boss for robotic joint shaft */}
          <ellipse
            cx="142"
            cy="42"
            rx="24"
            ry="13"
            fill="url(#metalTop)"
            stroke="#1E293B"
            strokeWidth="1.5"
          />
          <ellipse cx="142" cy="42" rx="11" ry="6" fill="#0F172A" />

          {/* Three counterbored mounting holes on the base flange */}
          <g>
            <ellipse cx="66" cy="96" rx="8" ry="4.8" fill="#1E293B" />
            <ellipse cx="66" cy="97" rx="5" ry="3" fill="#CBD5E1" />
          </g>
          <g>
            <ellipse cx="94" cy="110" rx="8" ry="4.8" fill="#1E293B" />
            <ellipse cx="94" cy="111" rx="5" ry="3" fill="#CBD5E1" />
          </g>
          <g>
            <ellipse cx="96" cy="82" rx="8" ry="4.8" fill="#1E293B" />
            <ellipse cx="96" cy="83" rx="5" ry="3" fill="#CBD5E1" />
          </g>
        </svg>
      ) : (
        <svg
          viewBox="0 0 220 160"
          className="w-full h-full max-w-[190px] max-h-[140px] drop-shadow-md"
        >
          <ellipse cx="110" cy="132" rx="68" ry="12" fill="#0F172A" fillOpacity="0.14" />
          <polygon
            points="48,88 110,54 172,88 110,122"
            fill="#475569"
            stroke="#1E293B"
            strokeWidth="1.5"
          />
          <polygon
            points="48,88 110,122 110,136 48,102"
            fill="#334155"
            stroke="#0F172A"
            strokeWidth="1.2"
          />
          <polygon
            points="110,122 172,88 172,102 110,136"
            fill="#1E293B"
            stroke="#0F172A"
            strokeWidth="1.2"
          />
          <circle cx="110" cy="88" r="16" fill="#1E293B" stroke="#94A3B8" strokeWidth="1.5" />
          <circle cx="76" cy="88" r="5" fill="#0F172A" />
          <circle cx="144" cy="88" r="5" fill="#0F172A" />
          <circle cx="110" cy="69" r="5" fill="#0F172A" />
          <circle cx="110" cy="107" r="5" fill="#0F172A" />
        </svg>
      )}
    </div>
  );
};
