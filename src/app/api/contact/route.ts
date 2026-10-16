import { NextResponse } from 'next/server';
import { getErrorMessage } from '@/lib/errors';
import { sendAdminContactAlert } from '@/lib/email';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Name, email, and message are required.' }, { status: 400 });
    }

    const name = String((body as { name?: unknown }).name ?? '').trim();
    const email = String((body as { email?: unknown }).email ?? '').trim().toLowerCase();
    const message = String((body as { message?: unknown }).message ?? '').trim();

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Name, email, and message are required.' }, { status: 400 });
    }
    if (name.length > 120 || email.length > 200 || message.length > 5000 || !EMAIL_PATTERN.test(email)) {
      return NextResponse.json({ error: 'Check the name, email, and message, then try again.' }, { status: 400 });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('Contact form is missing the Supabase service role.');
      return NextResponse.json({ error: 'We could not send your message. Please try again later.' }, { status: 500 });
    }

    const { error } = await getSupabaseAdmin().from('contact_messages').insert({
      name,
      email,
      message,
      status: 'unread',
      created_at: new Date().toISOString(),
    });
    if (error) throw error;

    const mailed = await sendAdminContactAlert(name, email, message);
    if (!mailed) console.error('Contact alert email was not delivered');

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Contact form error:', getErrorMessage(error) || error);
    return NextResponse.json({ error: 'We could not send your message. Please try again later.' }, { status: 500 });
  }
}
