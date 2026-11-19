import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUnreadCount, markMessagesRead } from '@/lib/messaging';
import { getUserRole } from '@/lib/userDataHelpers';

async function getAuthedUser(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  return { id: user.id, role: getUserRole(profile?.role) };
}

export async function GET(request: Request) {
  const user = await getAuthedUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const count = await getUnreadCount(user.id, user.role);
  return NextResponse.json({ count });
}

export async function POST(request: Request) {
  const user = await getAuthedUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { messageIds?: string[]; markAll?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const result = await markMessagesRead({
    userId: user.id,
    role: user.role,
    messageIds: body.messageIds,
    markAll: body.markAll === true,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  const count = await getUnreadCount(user.id, user.role);
  return NextResponse.json({ success: true, updated: result.updated, count });
}
