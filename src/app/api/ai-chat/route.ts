import { getErrorMessage } from '@/lib/errors';
import { replyAsStudyAssistant } from '@/lib/workersAi';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const rateLimit = new Map<string, { count: number; expiresAt: number }>();

function clientKey(req: Request, userId?: string) {
  if (userId) return `user:${userId}`;
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return `ip:${forwarded || 'unknown'}`;
}

function allow(key: string, max: number) {
  const now = Date.now();
  const current = rateLimit.get(key);
  if (current && current.expiresAt > now) {
    if (current.count >= max) return false;
    current.count += 1;
    return true;
  }
  rateLimit.set(key, { count: 1, expiresAt: now + 60_000 });
  return true;
}

export async function POST(req: Request) {
  try {
    let userId: string | undefined;
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
      );
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id;
    }

    const key = clientKey(req, userId);
    if (!allow(key, userId ? 20 : 8)) {
      return NextResponse.json({ error: 'Please wait a minute before asking again.' }, { status: 429 });
    }

    const payload = await req.json().catch(() => null) as { messages?: unknown } | null;
    const raw = payload?.messages;
    if (!raw || !Array.isArray(raw)) {
      return NextResponse.json({ error: 'Invalid messages array' }, { status: 400 });
    }

    const messages = raw
      .filter((item): item is { role: string; content: string } => {
        if (!item || typeof item !== 'object') return false;
        const row = item as { role?: unknown; content?: unknown };
        return (row.role === 'user' || row.role === 'assistant') && typeof row.content === 'string';
      })
      .slice(-8)
      .map((item) => ({ role: item.role, content: item.content.slice(0, 800) }));

    const last = messages[messages.length - 1];
    if (!last || last.role !== 'user' || !last.content.trim()) {
      return NextResponse.json({ error: 'Ask a study question first.' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are the Ilmvers Institute study assistant. Help with Qur\'an practice, Tajweed, Arabic practice, and the student portal. You support study and you are not a mufti: do not give a fatwa, medical advice, or financial advice. Keep replies under 180 words.',
            },
            ...messages,
          ],
          max_tokens: 300,
          temperature: 0.7,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content;
        if (typeof reply === 'string' && reply.trim()) {
          return NextResponse.json({ reply });
        }
      }
    }

    const reply = await replyAsStudyAssistant(messages);
    if (!reply) {
      return NextResponse.json({ error: 'The study assistant could not answer just now. Please try again.' }, { status: 502 });
    }
    return NextResponse.json({ reply });
  } catch (error: unknown) {
    console.error('[AI Chat]', error);
    return NextResponse.json({ error: getErrorMessage(error) || 'Internal Server Error' }, { status: 500 });
  }
}
