import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendAdminBroadcast } from '@/lib/messaging';
import { getUserRole } from '@/lib/userDataHelpers';

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

    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
    const role = getUserRole(profile?.role);
    if (role !== 'admin' && role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const payload = await request.json().catch(() => null) as { target?: string; userIds?: string[]; content?: string } | null;
    const target = payload?.target;
    const userIds = payload?.userIds;
    const content = payload?.content;
    if (!content?.trim()) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    }

    const result = await sendAdminBroadcast({
      senderId: user.id,
      target: target || 'all_users',
      userIds: Array.isArray(userIds) ? userIds : undefined,
      content: content.trim(),
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, count: result.count });
  } catch (error) {
    console.error('Broadcast error:', error);
    return NextResponse.json({ error: 'Failed to send broadcast' }, { status: 500 });
  }
}
