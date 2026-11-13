import { saveModelBlob, loadModelBlob } from './stlStorageAndParser';

interface RemoteImageStore {
  save(png: Blob): Promise<string>;
  load(key: string): Promise<Blob | null>;
}
let remote: RemoteImageStore | null = null;

/** Live mode registers the private "estimates" bucket (see lib/modelStore.ts). */
export function registerRemoteImageStore(s: RemoteImageStore): void {
  remote = s;
}

export async function saveEstimateImage(png: Blob): Promise<string> {
  if (remote) return remote.save(png);
  return saveModelBlob(`est_${Date.now()}`, await png.arrayBuffer(), 'estimate.png', 'PNG');
}

export async function loadEstimateImage(key: string): Promise<Blob | null> {
  if (remote && key.includes('/')) return remote.load(key).catch(() => null);
  const rec = await loadModelBlob(key);
  return rec?.buffer ? new Blob([rec.buffer], { type: 'image/png' }) : null;
}
