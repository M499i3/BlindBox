import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const DEFAULT_BUCKET = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET ?? 'blindbox-assets';

let _client: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('缺少 Supabase 設定，無法上傳圖片');
  }
  if (!_client) {
    _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _client;
}

function extFromFile(file: File): string {
  const byName = file.name.split('.').pop()?.toLowerCase();
  if (byName) return byName;
  const byMime = file.type.split('/').pop()?.toLowerCase();
  return byMime || 'jpg';
}

function safeExt(ext: string): string {
  const cleaned = ext.toLowerCase().replace(/[^a-z0-9]/g, '');
  return cleaned || 'jpg';
}

export async function uploadImageToStorage(options: {
  file: File;
  folder: 'listings' | 'avatars';
  userId?: string;
  bucket?: string;
}): Promise<string> {
  const { file, folder, userId, bucket = DEFAULT_BUCKET } = options;
  const client = getClient();
  const ext = safeExt(extFromFile(file));
  const owner = userId ?? 'anonymous';
  const key = `${folder}/${owner}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const normalizedFile = new File([file], `upload.${ext}`, { type: file.type || `image/${ext}` });

  const { error } = await client.storage.from(bucket).upload(key, normalizedFile, {
    cacheControl: '3600',
    upsert: false,
    contentType: normalizedFile.type || undefined,
  });
  if (error) throw new Error(`Storage 上傳失敗：${error.message}`);

  const { data } = client.storage.from(bucket).getPublicUrl(key);
  if (!data.publicUrl) throw new Error('Storage 取得公開 URL 失敗');
  return data.publicUrl;
}
