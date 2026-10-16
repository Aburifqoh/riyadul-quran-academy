import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getOpenFlags, resolveFlag } from '@/lib/messaging';
import { getUserRole } from '@/lib/userDataHelpers';

async function getAdminUser(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  const role = getUserRole(profile?.role);
  if (!profile || (role !== 'admin' && role !== 'super_admin')) return null;

  return user;
}

export async function GET(request: Request) {
  const user = await getAdminUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const flags = await getOpenFlags();
  return NextResponse.json({ flags });
}

export async function PATCH(request: Request) {
  const user = await getAdminUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payload = await request.json().catch(() => null) as {
    flagId?: string;
    status?: 'reviewed' | 'dismissed' | 'action_taken';
    adminNote?: string;
  } | null;
  const flagId = payload?.flagId;
  const status = payload?.status;
  const adminNote = payload?.adminNote;
  if (!flagId || !status || !['reviewed', 'dismissed', 'action_taken'].includes(status)) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  await resolveFlag(flagId, user.id, status, adminNote);
  return NextResponse.json({ success: true });
}
