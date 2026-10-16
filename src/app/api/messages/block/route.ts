import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { blockUser } from '@/lib/messaging';

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

    const payload = await request.json().catch(() => null) as { blockedId?: string; reason?: string } | null;
    const blockedId = payload?.blockedId;
    const reason = payload?.reason;
    if (!blockedId) {
      return NextResponse.json({ error: 'Missing blockedId' }, { status: 400 });
    }

    const result = await blockUser(user.id, blockedId, reason);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Block user error:', error);
    return NextResponse.json({ error: 'Failed to block user' }, { status: 500 });
  }
}
