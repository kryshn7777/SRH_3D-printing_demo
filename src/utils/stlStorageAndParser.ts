// IndexedDB storage + Binary/ASCII STL & OBJ 3D Mesh Parser + Seed Binary STL Generator

export interface ParsedMeshGeometry {
  /** Flat array of triangle vertices: [x1,y1,z1, x2,y2,z2, x3,y3,z3, ...] */
  vertices: Float32Array;
  /** Flat array of face unit normals: [nx,ny,nz, ...] (1 normal per triangle = 3 floats) */
  normals: Float32Array;
  triangleCount: number;
  dimensionsMm: string;
  sizeX: number;
  sizeY: number;
  sizeZ: number;
  volumeCm3: number;
}

const DB_NAME = 'srh_3dp_files_db_v1';
const STORE_NAME = 'model_files';

interface StoredModelRecord {
  key: string;
  buffer: ArrayBuffer;
  fileName: string;
  fileType: string;
  savedAt: string;
}

function openFilesDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveModelBlob(
  key: string,
  buffer: ArrayBuffer,
  fileName: string,
  fileType: string
): Promise<void> {
  try {
    const db = await openFilesDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record: StoredModelRecord = {
        key,
        buffer,
        fileName,
        fileType,
        savedAt: new Date().toISOString(),
      };
      store.put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Fallback if IndexedDB is blocked in private mode
  }
}

export async function loadModelBlob(
  key: string
): Promise<StoredModelRecord | null> {
  try {
    const db = await openFilesDb();
    const result = await new Promise<StoredModelRecord | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(key);
      getReq.onsuccess = () => resolve((getReq.result as StoredModelRecord) || null);
      getReq.onerror = () => reject(getReq.error);
    });
    db.close();
    return result;
  } catch {
    return null;
  }
}

/**
 * Parses a Binary STL, ASCII STL, or Wavefront OBJ ArrayBuffer into 3D triangles,
 * computing exact millimeter dimensions, triangle count, and mesh volume in cm³.
 */
export function parseStlOrObjGeometry(
  buffer: ArrayBuffer,
  fileName: string
): ParsedMeshGeometry | null {
  const ext = fileName.split('.').pop()?.toLowerCase() || 'stl';
  if (ext === 'obj') {
    const text = new TextDecoder().decode(buffer);
    return parseObjText(text);
  }
  if (ext === 'stl') {
    if (isBinaryStl(buffer)) {
      return parseBinaryStl(buffer);
    }
    const text = new TextDecoder().decode(buffer);
    const asciiParsed = parseAsciiStl(text);
    if (asciiParsed && asciiParsed.triangleCount > 0) {
      return asciiParsed;
    }
    // Fallback to binary if header was misleading
    return parseBinaryStl(buffer);
  }
  return null;
}

function isBinaryStl(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 84) return false;
  const view = new DataView(buffer);
  const triCount = view.getUint32(80, true);
  const expectedByteLength = 84 + triCount * 50;
  if (expectedByteLength === buffer.byteLength && triCount > 0) {
    return true;
  }
  // Check if file starts with "solid" and contains "facet"
  const headerBytes = new Uint8Array(buffer, 0, Math.min(256, buffer.byteLength));
  const headerStr = new TextDecoder().decode(headerBytes);
  if (headerStr.trimStart().startsWith('solid') && headerStr.includes('facet')) {
    return false;
  }
  return buffer.byteLength >= 84 && triCount > 0 && triCount < 5_000_000;
}

function parseBinaryStl(buffer: ArrayBuffer): ParsedMeshGeometry | null {
  if (buffer.byteLength < 84) return null;
  const view = new DataView(buffer);
  const rawTriCount = view.getUint32(80, true);
  const maxPossibleTris = Math.floor((buffer.byteLength - 84) / 50);
  const triCount = Math.min(rawTriCount, maxPossibleTris);
  if (triCount <= 0) return null;

  const vertices = new Float32Array(triCount * 9);
  const normals = new Float32Array(triCount * 3);

  for (let i = 0; i < triCount; i++) {
    const offset = 84 + i * 50;
    const ax = view.getFloat32(offset + 12, true);
    const ay = view.getFloat32(offset + 16, true);
    const az = view.getFloat32(offset + 20, true);

    const bx = view.getFloat32(offset + 24, true);
    const by = view.getFloat32(offset + 28, true);
    const bz = view.getFloat32(offset + 32, true);

    const cx = view.getFloat32(offset + 36, true);
    const cy = view.getFloat32(offset + 40, true);
    const cz = view.getFloat32(offset + 44, true);

    const vIdx = i * 9;
    vertices[vIdx] = ax;
    vertices[vIdx + 1] = ay;
    vertices[vIdx + 2] = az;
    vertices[vIdx + 3] = bx;
    vertices[vIdx + 4] = by;
    vertices[vIdx + 5] = bz;
    vertices[vIdx + 6] = cx;
    vertices[vIdx + 7] = cy;
    vertices[vIdx + 8] = cz;

    // Compute geometric face normal for reliable shading
    const ux = bx - ax;
    const uy = by - ay;
    const uz = bz - az;
    const vx = cx - ax;
    const vy = cy - ay;
    const vz = cz - az;
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len;
    ny /= len;
    nz /= len;

    const nIdx = i * 3;
    normals[nIdx] = nx;
    normals[nIdx + 1] = ny;
    normals[nIdx + 2] = nz;
  }

  return finalizeGeometry(vertices, normals, triCount);
}

function parseAsciiStl(text: string): ParsedMeshGeometry | null {
  const vertexRegex =
    /vertex\s+([+-]?\d*\.?\d+(?:[eE][+-]?\d+)?)\s+([+-]?\d*\.?\d+(?:[eE][+-]?\d+)?)\s+([+-]?\d*\.?\d+(?:[eE][+-]?\d+)?)/g;
  const coords: number[] = [];
  let match: RegExpExecArray | null;
  while ((match = vertexRegex.exec(text)) !== null) {
    coords.push(parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3]));
  }
  const triCount = Math.floor(coords.length / 9);
  if (triCount <= 0) return null;

  const vertices = new Float32Array(coords.slice(0, triCount * 9));
  const normals = new Float32Array(triCount * 3);

  for (let i = 0; i < triCount; i++) {
    const vIdx = i * 9;
    const ax = vertices[vIdx];
    const ay = vertices[vIdx + 1];
    const az = vertices[vIdx + 2];
    const bx = vertices[vIdx + 3];
    const by = vertices[vIdx + 4];
    const bz = vertices[vIdx + 5];
    const cx = vertices[vIdx + 6];
    const cy = vertices[vIdx + 7];
    const cz = vertices[vIdx + 8];

    const ux = bx - ax;
    const uy = by - ay;
    const uz = bz - az;
    const vx = cx - ax;
    const vy = cy - ay;
    const vz = cz - az;
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    normals[i * 3] = nx / len;
    normals[i * 3 + 1] = ny / len;
    normals[i * 3 + 2] = nz / len;
  }

  return finalizeGeometry(vertices, normals, triCount);
}

function parseObjText(text: string): ParsedMeshGeometry | null {
  const posList: [number, number, number][] = [];
  const triCoords: number[] = [];
  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('v ')) {
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 4) {
        posList.push([
          parseFloat(parts[1]) || 0,
          parseFloat(parts[2]) || 0,
          parseFloat(parts[3]) || 0,
        ]);
      }
    } else if (trimmed.startsWith('f ')) {
      const parts = trimmed.split(/\s+/).slice(1);
      const indices = parts.map((p) => {
        const idx = parseInt(p.split('/')[0], 10);
        return idx > 0 ? idx - 1 : posList.length + idx;
      });
      for (let i = 1; i + 1 < indices.length; i++) {
        const a = posList[indices[0]];
        const b = posList[indices[i]];
        const c = posList[indices[i + 1]];
        if (a && b && c) {
          triCoords.push(...a, ...b, ...c);
        }
      }
    }
  }

  const triCount = Math.floor(triCoords.length / 9);
  if (triCount <= 0) return null;
  const vertices = new Float32Array(triCoords);
  const normals = new Float32Array(triCount * 3);

  for (let i = 0; i < triCount; i++) {
    const vIdx = i * 9;
    const ux = vertices[vIdx + 3] - vertices[vIdx];
    const uy = vertices[vIdx + 4] - vertices[vIdx + 1];
    const uz = vertices[vIdx + 5] - vertices[vIdx + 2];
    const vx = vertices[vIdx + 6] - vertices[vIdx];
    const vy = vertices[vIdx + 7] - vertices[vIdx + 1];
    const vz = vertices[vIdx + 8] - vertices[vIdx + 2];
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    normals[i * 3] = nx / len;
    normals[i * 3 + 1] = ny / len;
    normals[i * 3 + 2] = nz / len;
  }

  return finalizeGeometry(vertices, normals, triCount);
}

function finalizeGeometry(
  vertices: Float32Array,
  normals: Float32Array,
  triangleCount: number
): ParsedMeshGeometry {
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  let signedVolumeMm3 = 0;

  for (let i = 0; i < triangleCount; i++) {
    const idx = i * 9;
    const ax = vertices[idx];
    const ay = vertices[idx + 1];
    const az = vertices[idx + 2];
    const bx = vertices[idx + 3];
    const by = vertices[idx + 4];
    const bz = vertices[idx + 5];
    const cx = vertices[idx + 6];
    const cy = vertices[idx + 7];
    const cz = vertices[idx + 8];

    if (ax < minX) minX = ax;
    if (bx < minX) minX = bx;
    if (cx < minX) minX = cx;
    if (ax > maxX) maxX = ax;
    if (bx > maxX) maxX = bx;
    if (cx > maxX) maxX = cx;

    if (ay < minY) minY = ay;
    if (by < minY) minY = by;
    if (cy < minY) minY = cy;
    if (ay > maxY) maxY = ay;
    if (by > maxY) maxY = by;
    if (cy > maxY) maxY = cy;

    if (az < minZ) minZ = az;
    if (bz < minZ) minZ = bz;
    if (cz < minZ) minZ = cz;
    if (az > maxZ) maxZ = az;
    if (bz > maxZ) maxZ = bz;
    if (cz > maxZ) maxZ = cz;

    // Signed tetrahedron volume
    signedVolumeMm3 +=
      (ax * (by * cz - bz * cy) +
        ay * (bz * cx - bx * cz) +
        az * (bx * cy - by * cx)) /
      6;
  }

  const sizeX = Math.max(0.1, Number((maxX - minX).toFixed(1)));
  const sizeY = Math.max(0.1, Number((maxY - minY).toFixed(1)));
  const sizeZ = Math.max(0.1, Number((maxZ - minZ).toFixed(1)));
  const volumeCm3 = Math.max(
    0.1,
    Number((Math.abs(signedVolumeMm3) / 1000).toFixed(2))
  );

  return {
    vertices,
    normals,
    triangleCount,
    dimensionsMm: `${sizeX} × ${sizeY} × ${sizeZ} mm`,
    sizeX,
    sizeY,
    sizeZ,
    volumeCm3,
  };
}

/**
 * Generates a real, slicer-compatible Binary STL ArrayBuffer for seeded demo models
 * (e.g., 'bracket-joint', 'drone-mount', 'enclosure-case', 'sensor-housing')
 * so that all seeded requests also render in the 3D STL viewer and download real binary .STL files.
 */
export function generateSeedStlArrayBuffer(
  previewKey: string = 'bracket-joint'
): ArrayBuffer {
  const tris: number[][] = [];

  const addBox = (
    x0: number,
    y0: number,
    z0: number,
    x1: number,
    y1: number,
    z1: number
  ) => {
    const p = [
      [x0, y0, z0],
      [x1, y0, z0],
      [x1, y1, z0],
      [x0, y1, z0],
      [x0, y0, z1],
      [x1, y0, z1],
      [x1, y1, z1],
      [x0, y1, z1],
    ];
    const faces = [
      [0, 2, 1],
      [0, 3, 2],
      [4, 5, 6],
      [4, 6, 7],
      [0, 1, 5],
      [0, 5, 4],
      [2, 3, 7],
      [2, 7, 6],
      [1, 2, 6],
      [1, 6, 5],
      [3, 0, 4],
      [3, 4, 7],
    ];
    for (const [a, b, c] of faces) {
      tris.push([...p[a], ...p[b], ...p[c]]);
    }
  };

  const addCylinderZ = (
    cx: number,
    cy: number,
    z0: number,
    z1: number,
    rOuter: number,
    rInner = 0,
    segments = 24
  ) => {
    for (let i = 0; i < segments; i++) {
      const a0 = (i / segments) * Math.PI * 2;
      const a1 = ((i + 1) / segments) * Math.PI * 2;
      const cos0 = Math.cos(a0);
      const sin0 = Math.sin(a0);
      const cos1 = Math.cos(a1);
      const sin1 = Math.sin(a1);

      const ox0 = cx + cos0 * rOuter;
      const oy0 = cy + sin0 * rOuter;
      const ox1 = cx + cos1 * rOuter;
      const oy1 = cy + sin1 * rOuter;

      // Outer wall
      tris.push([ox0, oy0, z0, ox1, oy1, z0, ox1, oy1, z1]);
      tris.push([ox0, oy0, z0, ox1, oy1, z1, ox0, oy0, z1]);

      if (rInner > 0) {
        const ix0 = cx + cos0 * rInner;
        const iy0 = cy + sin0 * rInner;
        const ix1 = cx + cos1 * rInner;
        const iy1 = cy + sin1 * rInner;
        // Inner bore wall
        tris.push([ix1, iy1, z0, ix0, iy0, z0, ix0, iy0, z1]);
        tris.push([ix1, iy1, z0, ix0, iy0, z1, ix1, iy1, z1]);
        // Top & bottom annulus
        tris.push([ix0, iy0, z1, ox0, oy0, z1, ox1, oy1, z1]);
        tris.push([ix0, iy0, z1, ox1, oy1, z1, ix1, iy1, z1]);
        tris.push([ox0, oy0, z0, ix0, iy0, z0, ox1, oy1, z0]);
        tris.push([ix0, iy0, z0, ix1, iy1, z0, ox1, oy1, z0]);
      } else {
        tris.push([cx, cy, z1, ox0, oy0, z1, ox1, oy1, z1]);
        tris.push([cx, cy, z0, ox1, oy1, z0, ox0, oy0, z0]);
      }
    }
  };

  if (previewKey === 'drone-mount') {
    // X-frame quadcopter vibration mount plate + central flight controller tower + 4 motor bosses
    addBox(-45, -12, 0, 45, 12, 6);
    addBox(-12, -45, 0, 12, 45, 6);
    addCylinderZ(0, 0, 6, 22, 18, 9, 28);
    addCylinderZ(-36, 0, 6, 14, 9, 4, 18);
    addCylinderZ(36, 0, 6, 14, 9, 4, 18);
    addCylinderZ(0, -36, 6, 14, 9, 4, 18);
    addCylinderZ(0, 36, 6, 14, 9, 4, 18);
  } else if (previewKey === 'enclosure-case') {
    // Hollow electronics enclosure shell with 4 corner standoffs
    addBox(-55, -36, 0, 55, 36, 4); // floor
    addBox(-55, -36, 4, 55, -31, 32); // front wall
    addBox(-55, 31, 4, 55, 36, 32); // back wall
    addBox(-55, -31, 4, -50, 31, 32); // left wall
    addBox(50, -31, 4, 55, 31, 32); // right wall
    addCylinderZ(-44, -25, 4, 24, 5, 2, 16);
    addCylinderZ(44, -25, 4, 24, 5, 2, 16);
    addCylinderZ(-44, 25, 4, 24, 5, 2, 16);
    addCylinderZ(44, 25, 4, 24, 5, 2, 16);
  } else if (previewKey === 'sensor-housing') {
    // LiDAR & depth camera bracket
    addBox(-42, -26, 0, 42, 26, 7);
    addBox(-38, 16, 7, 38, 26, 42);
    addCylinderZ(-20, 0, 7, 18, 12, 6, 20);
    addCylinderZ(20, 0, 7, 18, 12, 6, 20);
  } else {
    // Default 'bracket-joint': Robotic arm L-bracket with cylindrical shaft boss, gusset ribs, and mounting bosses
    addBox(-52, -32, 0, 52, 32, 8); // Base flange
    addBox(12, -32, 8, 48, 32, 34); // Vertical bearing tower
    addBox(-15, -28, 8, 12, -22, 26); // Front gusset rib
    addBox(-15, 22, 8, 12, 28, 26); // Back gusset rib
    addCylinderZ(30, 0, 34, 54, 18, 8, 28); // Top robotic joint shaft collar
    addCylinderZ(-32, -16, 8, 12, 7, 3.5, 18); // Mounting boss 1
    addCylinderZ(-32, 16, 8, 12, 7, 3.5, 18); // Mounting boss 2
    addCylinderZ(-8, 0, 8, 12, 7, 3.5, 18); // Mounting boss 3
  }

  const triCount = tris.length;
  const buffer = new ArrayBuffer(84 + triCount * 50);
  const headerText = `SRH Berlin MakerLab Binary STL - ${previewKey}`;
  const headerBytes = new TextEncoder().encode(headerText);
  new Uint8Array(buffer, 0, Math.min(80, headerBytes.length)).set(
    headerBytes.slice(0, 80)
  );

  const view = new DataView(buffer);
  view.setUint32(80, triCount, true);

  for (let i = 0; i < triCount; i++) {
    const [ax, ay, az, bx, by, bz, cx, cy, cz] = tris[i];
    const ux = bx - ax;
    const uy = by - ay;
    const uz = bz - az;
    const vx = cx - ax;
    const vy = cy - ay;
    const vz = cz - az;
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len;
    ny /= len;
    nz /= len;

    const offset = 84 + i * 50;
    view.setFloat32(offset, nx, true);
    view.setFloat32(offset + 4, ny, true);
    view.setFloat32(offset + 8, nz, true);
    view.setFloat32(offset + 12, ax, true);
    view.setFloat32(offset + 16, ay, true);
    view.setFloat32(offset + 20, az, true);
    view.setFloat32(offset + 24, bx, true);
    view.setFloat32(offset + 28, by, true);
    view.setFloat32(offset + 32, bz, true);
    view.setFloat32(offset + 36, cx, true);
    view.setFloat32(offset + 40, cy, true);
    view.setFloat32(offset + 44, cz, true);
    view.setUint16(offset + 48, 0, true);
  }

  return buffer;
}

/**
 * Downloads either the real uploaded file from IndexedDB or the procedural binary STL for seeded requests.
 */
export async function triggerModelDownload(
  fileName: string,
  storageKey?: string,
  previewKey?: string
): Promise<void> {
  let buffer: ArrayBuffer | null = null;
  if (storageKey) {
    const record = await loadModelBlob(storageKey);
    if (record && record.buffer) {
      buffer = record.buffer;
    }
  }
  if (!buffer) {
    buffer = generateSeedStlArrayBuffer(previewKey || 'bracket-joint');
  }

  const blob = new Blob([buffer], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName || 'srh_model.stl';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
