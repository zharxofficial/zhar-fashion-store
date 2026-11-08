import { createClient } from '@supabase/supabase-js';

const STORE_PATH = '/storage/v1/object/public/store-media/';
export const isStoreMedia = (url: string) => url.includes(STORE_PATH);

/** Admin-only. The server validates type/size and returns a one-time signed upload token; filenames are generated server-side. */
export async function uploadMedia(file: File, folder: 'products' | 'banners' | 'video' | 'promo' | 'logo', token: string): Promise<string> {
  const r = await fetch('/api/admin/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ contentType: file.type, size: file.size, folder })
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Upload not allowed.');
  const client = createClient(j.supabaseUrl, j.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await client.storage.from(j.bucket).uploadToSignedUrl(j.path, j.token, file, { contentType: file.type });
  if (error) throw new Error(error.message || 'Upload failed.');
  return j.publicUrl as string;
}

/** Removes a file from Supabase Storage (no-op for external or bundled URLs). */
export async function deleteMedia(url: string, token: string): Promise<void> {
  if (!url || !isStoreMedia(url)) return;
  await fetch('/api/admin/media', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ url })
  });
}
