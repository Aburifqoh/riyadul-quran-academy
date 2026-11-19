import { NextResponse } from 'next/server';
import { getErrorMessage } from '@/lib/errors';
import { sendAdminNewsletterAlert } from '@/lib/email';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null) as { email?: string } | null;
    const email = String(body?.email ?? '').trim().toLowerCase();
    if (!email || email.length > 200 || !EMAIL_PATTERN.test(email)) {
      return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 });
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Newsletter signup is not configured yet.' }, { status: 500 });
    }

    const { error } = await getSupabaseAdmin().from('newsletter_subscribers').insert({
      email,
      created_at: new Date().toISOString(),
    });
    if (error && !/duplicate|unique/i.test(error.message)) throw error;

    const mailed = await sendAdminNewsletterAlert(email);
    if (!mailed) console.error('Newsletter alert email was not delivered');

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Newsletter form error:', getErrorMessage(error) || error);
    return NextResponse.json({ error: 'We could not save that subscription.' }, { status: 500 });
  }
}
