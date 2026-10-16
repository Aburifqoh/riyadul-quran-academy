import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ADMIN_ALERT_EMAIL } from '@/lib/config';
import { getUserRole, parseUserRecord } from '@/lib/userDataHelpers';

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
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
    const { data: raw } = await supabase.from('users').select('role').eq('id', user.id).single();
    const role = getUserRole(parseUserRecord((raw || {}) as Record<string, unknown>).role);
    if (role !== 'teacher' && role !== 'admin' && role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const payload = await req.json().catch(() => ({})) as { title?: string; authorName?: string };
    const title = escapeHtml(String(payload.title || 'Untitled'));
    const authorName = escapeHtml(String(payload.authorName || 'A teacher'));
    const apiKey = process.env.RESEND_API_KEY || '';
    if (!apiKey) {
      return NextResponse.json({ success: true, message: 'Skipped email' });
    }

    const from = process.env.EMAIL_FROM || 'Ilmvers Institute <noreply@ilmversinstitute.com>';
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: ADMIN_ALERT_EMAIL,
        subject: `New community post pending approval: ${title}`,
        html: `<h3>New post pending</h3><p><strong>${authorName}</strong> submitted "<strong>${title}</strong>".</p><p>Review it in the admin CMS.</p>`,
      }),
    });

    if (!response.ok) {
      console.error('Resend error:', await response.text());
      return NextResponse.json({ success: false }, { status: 502 });
    }
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('notify-post:', err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
