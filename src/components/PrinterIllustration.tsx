import React, { useEffect, useRef, useState } from 'react';
import { RotateCcw, ZoomIn, ZoomOut, Box } from 'lucide-react';
import {
  loadModelBlob,
  parseStlOrObjGeometry,
  generateSeedStlArrayBuffer,
  ParsedMeshGeometry,
} from '../utils/stlStorageAndParser';

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
 * Interactive 3D STL / OBJ Mesh Viewer for Student, Professor (Ajinkya Keskar), and PC Admin.
 * Renders real uploaded .STL / .OBJ files from IndexedDB (or real binary STL meshes for seeded requests)
 * with mouse/touch drag-to-orbit, zoom controls, wireframe toggle, and build-plate grid.
 */
export const CadModelPreview: React.FC<{
  previewKey?: string;
  storageKey?: string;
  fileName?: string;
  className?: string;
}> = ({
  previewKey = 'bracket-joint',
  storageKey,
  fileName = 'model.stl',
  className = 'w-full h-44',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mesh, setMesh] = useState<ParsedMeshGeometry | null>(null);
  const [yaw, setYaw] = useState(-0.65);
  const [pitch, setPitch] = useState(0.52);
  const [zoom, setZoom] = useState(1.0);
  const [wireframe, setWireframe] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; yaw: number; pitch: number }>({
    x: 0,
    y: 0,
    yaw: -0.65,
    pitch: 0.52,
  });

  useEffect(() => {
    let cancelled = false;
    async function loadGeometry() {
      let buffer: ArrayBuffer | null = null;
      let targetName = fileName || 'model.stl';
      if (storageKey) {
        const stored = await loadModelBlob(storageKey);
        if (stored && stored.buffer) {
          buffer = stored.buffer;
          targetName = stored.fileName || targetName;
        }
      }
      if (!buffer) {
        buffer = generateSeedStlArrayBuffer(previewKey);
        targetName = 'seed.stl';
      }
      const parsed = parseStlOrObjGeometry(buffer, targetName);
      if (!cancelled && parsed) {
        setMesh(parsed);
      }
    }
    loadGeometry();
    return () => {
      cancelled = true;
    };
  }, [storageKey, previewKey, fileName]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !mesh) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(180, Math.floor(rect.width));
    const height = Math.max(130, Math.floor(rect.height));
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }
    ctx.save();
    ctx.scale(dpr, dpr);

    // Background studio gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#0F172A');
    bgGrad.addColorStop(1, '#1E293B');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    const { vertices, normals, triangleCount } = mesh;

    // Compute bounding box center and radius
    let minX = Infinity,
      minY = Infinity,
      minZ = Infinity;
    let maxX = -Infinity,
      maxY = -Infinity,
      maxZ = -Infinity;
    for (let i = 0; i < vertices.length; i += 3) {
      const vx = vertices[i];
      const vy = vertices[i + 1];
      const vz = vertices[i + 2];
      if (vx < minX) minX = vx;
      if (vx > maxX) maxX = vx;
      if (vy < minY) minY = vy;
      if (vy > maxY) maxY = vy;
      if (vz < minZ) minZ = vz;
      if (vz > maxZ) maxZ = vz;
    }
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const cz = (minZ + maxZ) / 2;
    const maxDim = Math.max(maxX - minX, maxY - minY, maxZ - minZ, 1);
    const scale = (Math.min(width, height) * 0.62 * zoom) / maxDim;

    // Rotation matrix (Z-up CAD convention -> screen space)
    const cosYaw = Math.cos(yaw);
    const sinYaw = Math.sin(yaw);
    const cosPitch = Math.cos(pitch);
    const sinPitch = Math.sin(pitch);

    const projectPoint = (x: number, y: number, z: number) => {
      const dx = x - cx;
      const dy = y - cy;
      const dz = z - cz;
      // Rotate around Z (yaw)
      const x1 = dx * cosYaw - dy * sinYaw;
      const y1 = dx * sinYaw + dy * cosYaw;
      const z1 = dz;
      // Rotate around X (pitch) so Z points up
      const x2 = x1;
      const y2 = y1 * sinPitch - z1 * cosPitch;
      const z2 = y1 * cosPitch + z1 * sinPitch;

      const fov = 420;
      const perspective = fov / (fov + z2 * 0.45);
      return {
        sx: width / 2 + x2 * scale * perspective,
        sy: height / 2 + y2 * scale * perspective,
        depth: z2,
      };
    };

    // Draw 3D Build Plate Grid at z = minZ
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
    ctx.lineWidth = 1;
    const gridHalf = maxDim * 0.68;
    const steps = 6;
    for (let i = -steps; i <= steps; i++) {
      const offset = (i / steps) * gridHalf;
      const p1 = projectPoint(cx - gridHalf, cy + offset, minZ);
      const p2 = projectPoint(cx + gridHalf, cy + offset, minZ);
      ctx.beginPath();
      ctx.moveTo(p1.sx, p1.sy);
      ctx.lineTo(p2.sx, p2.sy);
      ctx.stroke();

      const q1 = projectPoint(cx + offset, cy - gridHalf, minZ);
      const q2 = projectPoint(cx + offset, cy + gridHalf, minZ);
      ctx.beginPath();
      ctx.moveTo(q1.sx, q1.sy);
      ctx.lineTo(q2.sx, q2.sy);
      ctx.stroke();
    }

    // Decimate step if mesh is very dense (> 8000 triangles) for smooth 60fps canvas rendering
    const step = Math.max(1, Math.ceil(triangleCount / 8000));

    interface ProjectedTri {
      ax: number;
      ay: number;
      bx: number;
      by: number;
      cx: number;
      cy: number;
      depth: number;
      shade: number;
    }

    const projected: ProjectedTri[] = [];
    // Light direction in view space
    const lx = -0.45;
    const ly = -0.65;
    const lz = -0.61;

    for (let i = 0; i < triangleCount; i += step) {
      const vIdx = i * 9;
      const pA = projectPoint(
        vertices[vIdx],
        vertices[vIdx + 1],
        vertices[vIdx + 2]
      );
      const pB = projectPoint(
        vertices[vIdx + 3],
        vertices[vIdx + 4],
        vertices[vIdx + 5]
      );
      const pC = projectPoint(
        vertices[vIdx + 6],
        vertices[vIdx + 7],
        vertices[vIdx + 8]
      );

      const nIdx = i * 3;
      const nx = normals[nIdx];
      const ny = normals[nIdx + 1];
      const nz = normals[nIdx + 2];

      const rx1 = nx * cosYaw - ny * sinYaw;
      const ry1 = nx * sinYaw + ny * cosYaw;
      const rz1 = nz;

      const rnx = rx1;
      const rny = ry1 * sinPitch - rz1 * cosPitch;
      const rnz = ry1 * cosPitch + rz1 * sinPitch;

      const dot = Math.abs(rnx * lx + rny * ly + rnz * lz);
      const shade = Math.min(1, 0.28 + dot * 0.72);

      projected.push({
        ax: pA.sx,
        ay: pA.sy,
        bx: pB.sx,
        by: pB.sy,
        cx: pC.sx,
        cy: pC.sy,
        depth: (pA.depth + pB.depth + pC.depth) / 3,
        shade,
      });
    }

    // Painter's sort back-to-front
    projected.sort((a, b) => b.depth - a.depth);

    for (const t of projected) {
      ctx.beginPath();
      ctx.moveTo(t.ax, t.ay);
      ctx.lineTo(t.bx, t.by);
      ctx.lineTo(t.cx, t.cy);
      ctx.closePath();

      if (!wireframe) {
        // Metallic CAD blue-slate shading with SRH accent rim
        const r = Math.round(35 + t.shade * 145);
        const g = Math.round(75 + t.shade * 155);
        const b = Math.round(135 + t.shade * 115);
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(15, 23, 42, 0.22)`;
        ctx.lineWidth = 0.45;
        ctx.stroke();
      } else {
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 0.75;
        ctx.stroke();
      }
    }

    ctx.restore();
  }, [mesh, yaw, pitch, zoom, wireframe]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      yaw,
      pitch,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setYaw(dragStartRef.current.yaw + dx * 0.012);
    setPitch(
      Math.max(
        -1.4,
        Math.min(1.4, dragStartRef.current.pitch + dy * 0.012)
      )
    );
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  return (
    <div
      className={`rounded-xl bg-slate-900 border border-slate-700/80 overflow-hidden relative select-none group ${className}`}
    >
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="w-full h-full block cursor-grab active:cursor-grabbing touch-none"
      />

      {/* Top-Left 3D Viewer Badge */}
      <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-slate-950/75 border border-slate-700/80 text-[10px] font-semibold text-sky-300 flex items-center gap-1 pointer-events-none">
        <Box className="w-3 h-3 text-[#D54407]" />
        <span>3D STL • Orbit</span>
      </div>

      {/* Top-Right Interactive Controls (Wireframe, Zoom, Reset) */}
      <div className="absolute top-2 right-2 flex items-center gap-1">
        <button
          type="button"
          onClick={() => setWireframe((w) => !w)}
          title="Toggle Wireframe / Solid Mesh"
          className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
            wireframe
              ? 'bg-[#D54407] text-white border-[#D54407]'
              : 'bg-slate-950/75 text-slate-200 border-slate-700 hover:bg-slate-800'
          }`}
        >
          Wire
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(2.2, Number((z + 0.2).toFixed(2))))}
          title="Zoom In"
          className="p-1 rounded bg-slate-950/75 text-slate-200 border border-slate-700 hover:bg-slate-800 cursor-pointer"
        >
          <ZoomIn className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.2).toFixed(2))))}
          title="Zoom Out"
          className="p-1 rounded bg-slate-950/75 text-slate-200 border border-slate-700 hover:bg-slate-800 cursor-pointer"
        >
          <ZoomOut className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={() => {
            setYaw(-0.65);
            setPitch(0.52);
            setZoom(1.0);
          }}
          title="Reset 3D Camera"
          className="p-1 rounded bg-slate-950/75 text-slate-200 border border-slate-700 hover:bg-slate-800 cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>

      {/* Bottom Mesh Telemetry Bar */}
      {mesh && (
        <div className="absolute bottom-1.5 inset-x-2 px-2 py-0.5 rounded bg-slate-950/75 border border-slate-800 text-[10px] text-slate-300 flex items-center justify-between pointer-events-none">
          <span>{mesh.triangleCount.toLocaleString()} tris</span>
          <span>{mesh.dimensionsMm}</span>
        </div>
      )}
    </div>
  );
};
