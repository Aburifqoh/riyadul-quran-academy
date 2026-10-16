import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────
// app/api/hifz-warm/route.ts
// Start the grader's container before the student needs it.
//
// Modal scales to zero, so the first recitation of a session waits ~30s for
// Wav2Vec2, Whisper and Silero to load onto the GPU. Those load in
// @modal.enter(), which runs before a container serves anything at all, so a
// hit on /health pays the whole warm-up. Fire this when the lab opens and the
// student spends the next 10-40s choosing a page — by the time they press
// record, it is hot.
//
// Deliberately NOT fired at login. A warm container is billed for at least
// scaledown_window (300s), so warming every student who signs in bills for
// everyone who never opens the lab. Opening the lab is the first honest signal
// of intent.
//
// This route exists at all because HIFZ_SCORING_TOKEN is a server secret. The
// browser must never hold it, so it cannot call Modal directly.
// ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_HIFZ_LAB_ENABLED !== 'true') {
    return NextResponse.json({ error: 'Hifz Lab is not enabled.' }, { status: 404 });
  }
  // Authenticated: an open warm endpoint is a free way for anyone to spin up a
  // GPU on our account for five minutes at a time.
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const authed = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user }, error } = await authed.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const scoringUrl = process.env.HIFZ_SCORING_URL;
  if (!scoringUrl) return NextResponse.json({ warmed: false, reason: 'not configured' });

  const healthUrl = scoringUrl.replace(/\/align\/?$/, '') + '/health';
  const token = process.env.HIFZ_SCORING_TOKEN;

  try {
    // The point is to START the container, not to wait for it. A cold start
    // takes ~30s; holding the request open that long would just move the wait
    // rather than remove it, so give up early and let it finish in the
    // background — the container keeps booting regardless of who is listening.
    const controller = new AbortController();
    const giveUp = setTimeout(() => controller.abort(), 3000);
    await fetch(healthUrl, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: controller.signal,
    });
    clearTimeout(giveUp);
    return NextResponse.json({ warmed: true, alreadyHot: true });
  } catch {
    // An abort here is the expected path on a cold start, not a failure.
    return NextResponse.json({ warmed: true, alreadyHot: false });
  }
}
