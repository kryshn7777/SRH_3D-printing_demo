import { supabase } from './supabase';
import { registerRemoteModelStore } from '../utils/stlStorageAndParser';

// 3D models live in the private "models" bucket, one folder per user (see supabase/schema.sql).
registerRemoteModelStore({
  async save(buffer, fileName, fileType) {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error('Please log in again to upload files.');
    const ext = fileType.toLowerCase();
    const base = fileName.replace(/\.[^.]+$/, '').replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 60) || 'model';
    const path = `${auth.user.id}/${Date.now()}-${base}.${ext}`;
    const { error } = await supabase.storage
      .from('models')
      .upload(path, new Blob([buffer], { type: 'application/octet-stream' }), {
        contentType: 'application/octet-stream',
        upsert: false,
      });
    if (error) {
      throw new Error(
        /row-level security|policy|exceeded/i.test(error.message)
          ? 'Upload was refused (too many uploads this hour, or the file is not allowed).'
          : 'Upload failed. Please try again.'
      );
    }
    return path;
  },
  async load(key) {
    const { data, error } = await supabase.storage.from('models').download(key);
    if (error || !data) return null;
    return { key, buffer: await data.arrayBuffer(), fileName: key.split('/').pop() ?? key, fileType: '', savedAt: '' };
  },
});
