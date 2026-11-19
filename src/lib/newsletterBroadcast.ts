import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { sendNewsletterIssue } from '@/lib/email';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://ilmvers.com';

async function signEmail(email: string): Promise<string> {
  const secret = process.env.NEWSLETTER_UNSUBSCRIBE_SECRET || '';
  if (!secret) return '';
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(email.trim().toLowerCase()));
  return [...new Uint8Array(sig)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function unsubscribeTokenMatches(email: string, token: string): Promise<boolean> {
  const expected = await signEmail(email);
  if (!expected || expected.length !== token.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  return diff === 0;
}

export async function unsubscribeUrl(email: string): Promise<string> {
  const token = await signEmail(email);
  if (!token) return `mailto:info@ilmversinstitute.com?subject=Unsubscribe`;
  return `${SITE}/api/newsletter/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`;
}

export async function broadcastPublishedUpdate(input: {
  title: string;
  excerpt: string;
  link: string;
}): Promise<{ ok: boolean; sent: number; error?: string }> {
  const { data, error } = await getSupabaseAdmin().from('newsletter_subscribers').select('email');
  if (error) return { ok: false, sent: 0, error: error.message };

  const seen = new Set<string>();
  let sent = 0;
  for (const row of data || []) {
    const email = typeof row.email === 'string' ? row.email.trim() : '';
    const key = email.toLowerCase();
    if (!email.includes('@') || seen.has(key)) continue;
    seen.add(key);
    const unsub = await unsubscribeUrl(email);
    const ok = await sendNewsletterIssue(email, input.title, input.excerpt, input.link, unsub);
    if (ok) sent += 1;
  }
  return { ok: true, sent };
}
