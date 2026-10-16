import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { flagMessage } from '@/lib/messaging';

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

    const payload = await request.json().catch(() => null) as { messageId?: string; reason?: string } | null;
    const messageId = payload?.messageId;
    const reason = payload?.reason;
    if (!messageId || !reason) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const result = await flagMessage(messageId, user.id, reason);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Flag message error:', error);
    return NextResponse.json({ error: 'Failed to flag message' }, { status: 500 });
  }
}
