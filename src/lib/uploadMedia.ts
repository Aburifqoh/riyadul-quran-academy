import { supabase } from '@/lib/supabase';

export async function uploadMedia(file: File, folder = 'uploads'): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not signed in');

  const form = new FormData();
  form.append('file', file);
  form.append('folder', folder);

  const res = await fetch('/api/upload-media', {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: form,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.url) {
    throw new Error(json.error || 'Upload failed');
  }
  return json.url as string;
}
