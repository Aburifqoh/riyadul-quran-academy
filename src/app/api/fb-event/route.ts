import { NextResponse } from 'next/server';
import crypto from 'crypto';

function hashSHA256(val: string) {
  if (!val) return '';
  return crypto.createHash('sha256').update(val.trim().toLowerCase()).digest('hex');
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { eventName, eventId, email, phone, name, ip, userAgent, url } = body;

    const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID || process.env.META_PIXEL_ID;
    const accessToken = process.env.META_ACCESS_TOKEN;

    if (!pixelId || !accessToken) {
      // Return success true but log warning so it doesn't break the client if env vars aren't set yet
      console.warn("Meta Pixel ID or Access Token is missing from environment variables.");
      return NextResponse.json({ success: true, message: 'Meta CAPI skipped (env variables missing)' });
    }

    // Prepare hashed user data (SHA-256 is required by Meta for privacy compliance)
    const hashedEmail = email ? hashSHA256(email) : '';
    const hashedPhone = phone ? hashSHA256(phone) : '';
    const hashedFirstName = name ? hashSHA256(name.split(' ')[0]) : '';

    const payload = {
      data: [
        {
          event_name: eventName,
          event_time: Math.floor(Date.now() / 1000),
          event_id: eventId || undefined,
          action_source: "website",
          event_source_url: url || "https://ilmvers.com",
          user_data: {
            em: hashedEmail ? [hashedEmail] : [],
            ph: hashedPhone ? [hashedPhone] : [],
            fn: hashedFirstName ? [hashedFirstName] : [],
            client_ip_address: ip || null,
            client_user_agent: userAgent || null
          }
        }
      ]
    };

    const testCode = process.env.META_TEST_EVENT_CODE;

    const response = await fetch(`https://graph.facebook.com/v17.0/${pixelId}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        access_token: accessToken,
        ...(testCode ? { test_event_code: testCode } : {}),
        ...payload
      })
    });

    const resData = await response.json();
    return NextResponse.json({ success: true, metaResponse: resData });
  } catch (error: any) {
    console.error("Meta Conversions API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
