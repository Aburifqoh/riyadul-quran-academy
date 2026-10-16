import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendSecureMessage } from '@/lib/messaging';

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

    const payload = await request.json().catch(() => null) as { receiverId?: string; content?: string; studentContextId?: string } | null;
    const receiverId = payload?.receiverId;
    const content = payload?.content;
    const studentContextId = payload?.studentContextId;
    if (!receiverId || !content) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const result = await sendSecureMessage({
      senderId: user.id,
      receiverId,
      content,
      studentContextId,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: result.message });
  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
