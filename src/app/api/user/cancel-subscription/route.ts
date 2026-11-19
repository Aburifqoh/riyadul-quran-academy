import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { ADMIN_ALERT_EMAIL } from '@/lib/config';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Edge-compatible email sender
async function sendCancellationEmail(to: string, isAdmin: boolean) {
  const apiKey = process.env.RESEND_API_KEY || '';
  const subject = isAdmin ? 'Student Cancelled Subscription' : 'Subscription Cancelled - Ilmvers Institute';
  const html = isAdmin 
    ? `<p>A student has cancelled their auto-renewal. Their access will expire at the end of their current billing cycle.</p>`
    : `<p>Your auto-renewal subscription has been successfully cancelled.</p>
       <p>You will retain access to your classes until the end of your current paid billing cycle.</p>
       <p>If you change your mind, you can re-activate your subscription anytime from the billing portal.</p>`;
       
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'Ilmvers Institute <noreply@ilmversinstitute.com>',
      to,
      subject,
      html,
    }),
  });
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServiceClient();
    
    // Server-side extraction of user ID from session token (IDOR protection)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    const userId = user.id;

    // Fetch user info to ensure they have an active token and get their phone number
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('email, phone, gateway_auth_token, name, next_billing_date')
      .eq('id', userId)
      .single();

    if (fetchError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Idempotency / Double-Cancel Protection
    if (!userData.gateway_auth_token) {
      return NextResponse.json({ success: true, note: 'Already cancelled' });
    }

    // Nullify the token and record the cancellation time
    const { error: updateError } = await supabase
      .from('users')
      .update({
        gateway_auth_token: null,
        cancelled_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Failed to cancel subscription:', updateError);
      return NextResponse.json({ error: 'Failed to update database' }, { status: 500 });
    }

    // Notify Student
    if (userData.email) {
      sendCancellationEmail(userData.email, false).catch(console.error);
    }
    if (userData.phone) {
      sendWhatsAppMessage(userData.phone, `Assalamu alaikum ${userData.name?.split(' ')[0] || 'Student'}! Your auto-renewal subscription has been cancelled. You will retain access until your current cycle ends on ${new Date(userData.next_billing_date).toLocaleDateString()}.`).catch(console.error);
    }

    // Notify Admin
    sendCancellationEmail(ADMIN_ALERT_EMAIL, true).catch(console.error);

    return NextResponse.json({ success: true, message: 'Subscription cancelled successfully' });

  } catch (error: unknown) {
    console.error('Cancellation API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
