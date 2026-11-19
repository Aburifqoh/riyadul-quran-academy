import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getUserRole, parseUserRecord } from '@/lib/userDataHelpers';

const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
  'application/pdf',
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/webm', 'audio/mp4',
  'video/mp4', 'video/webm',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const FOLDER_RE = /^[a-z0-9/_-]{1,80}$/i;

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: raw } = await supabase.from('users').select('id, role').eq('id', user.id).single();
    const role = getUserRole(parseUserRecord((raw || {}) as Record<string, unknown>).role);
    const isStaff = role === 'teacher' || role === 'admin' || role === 'super_admin';
    const isStudent = role === 'student' || role === 'parent';
    if (!isStaff && !isStudent) {
      return NextResponse.json({ error: 'Not allowed to upload' }, { status: 403 });
    }

    const form = await request.formData();
    const file = form.get('file');
    const folderRaw = String(form.get('folder') || 'uploads');
    const folder = FOLDER_RE.test(folderRaw) ? folderRaw.replace(/^\/+|\/+$/g, '') : 'uploads';

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File is larger than 15MB' }, { status: 400 });
    }
    if (file.type && !ALLOWED.has(file.type)) {
      return NextResponse.json({ error: 'File type is not allowed' }, { status: 400 });
    }
    if (isStudent && !file.type.startsWith('audio/')) {
      return NextResponse.json({ error: 'Students can only upload audio answers' }, { status: 403 });
    }

    const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
    const path = `${folder}/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const admin = getSupabaseAdmin();
    const { error: uploadError } = await admin.storage
      .from('materials')
      .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type || undefined });

    if (uploadError) {
      return NextResponse.json({ error: 'The file could not be stored.' }, { status: 500 });
    }

    const { data: pub } = admin.storage.from('materials').getPublicUrl(path);
    return NextResponse.json({ url: pub.publicUrl, path });
  } catch (error) {
    console.error('upload-media:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
