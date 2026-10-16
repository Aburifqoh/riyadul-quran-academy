import { getErrorMessage } from '@/lib/errors';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const rateLimit = new Map<string, { count: number; expiresAt: number }>();

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

    const payload = await req.json().catch(() => null) as { messages?: unknown } | null;
    const messages = payload?.messages;
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages array' }, { status: 400 });
    }

    const now = Date.now();
    const currentLimit = rateLimit.get(user.id);
    if (currentLimit && currentLimit.expiresAt > now) {
      if (currentLimit.count >= 20) {
        return NextResponse.json({ error: 'Rate limit exceeded. Try again in a minute.' }, { status: 429 });
      }
      currentLimit.count++;
    } else {
      rateLimit.set(user.id, { count: 1, expiresAt: now + 60_000 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'The study assistant is not configured yet.' }, { status: 503 });
    }

    const systemPrompt = {
      role: 'system',
      content: 'You are an Islamic education assistant for Ilmvers Institute, an online Quran school. Help students with Tajweed, memorization tips, Islamic studies, the portal, and scheduling. Begin greetings with Assalamu Alaikum. Keep replies under 200 words. Stay on Islamic education and this school.',
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [systemPrompt, ...messages.slice(-12)],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      console.error('[AI Chat] provider error', response.status);
      return NextResponse.json({ error: 'The study assistant could not answer.' }, { status: 502 });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'I am sorry, I could not understand that.';
    return NextResponse.json({ reply });
  } catch (error: unknown) {
    console.error('[AI Chat]', error);
    return NextResponse.json({ error: getErrorMessage(error) || 'Internal Server Error' }, { status: 500 });
  }
}
