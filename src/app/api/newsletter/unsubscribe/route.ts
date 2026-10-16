import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { unsubscribeTokenMatches } from '@/lib/newsletterBroadcast';

function page(message: string) {
  const safe = message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"><title>Ilmvers newsletter</title></head><body style="font-family:sans-serif;max-width:520px;margin:48px auto;padding:0 16px;color:#333;"><h1 style="color:#0F3D38;">Ilmvers Institute</h1><p>${safe}</p><p><a href="https://ilmversinstitute.com">Back to the site</a></p></body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

async function removeSubscriber(request: Request) {
  const url = new URL(request.url);
  const email = (url.searchParams.get('email') || '').trim();
  const token = (url.searchParams.get('token') || '').trim();
  if (!email.includes('@') || !token || !(await unsubscribeTokenMatches(email, token))) {
    return page('This unsubscribe link is not valid.');
  }
  const safe = email.replace(/[%_]/g, '');
  const { error } = await getSupabaseAdmin().from('newsletter_subscribers').delete().ilike('email', safe);
  if (error) {
    console.error('unsubscribe failed:', error.message);
    return page('We could not remove that address. Please write to info@ilmversinstitute.com.');
  }
  return page(`${email} has been removed from the Ilmvers newsletter.`);
}

export async function GET(request: Request) {
  return removeSubscriber(request);
}

export async function POST(request: Request) {
  return removeSubscriber(request);
}
