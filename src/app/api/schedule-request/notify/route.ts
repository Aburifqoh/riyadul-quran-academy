import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendAdminScheduleRequestAlert } from '@/lib/email';
import { ADMIN_ALERT_EMAIL } from '@/lib/config';

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

    const payload = await request.json().catch(() => null) as { requesterName?: string; requestType?: string } | null;
    const requesterName = payload?.requesterName;
    const requestType = payload?.requestType;
    if (!requesterName || !requestType) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    await sendAdminScheduleRequestAlert(ADMIN_ALERT_EMAIL, requesterName, requestType);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Schedule request notify error:', error);
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
  }
}
