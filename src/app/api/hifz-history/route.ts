import { getErrorMessage } from '@/lib/errors';
// ─────────────────────────────────────────────
// app/api/hifz-history/route.ts
// The browsable archive, and what it adds up to.
//
// Every session has always been written to hifz_sessions, errors included --
// nothing ever read them back. So a student could be missing the same word
// every day for a month and the lab would greet them each morning with no
// memory of it. This route is that memory: the sessions themselves, which
// words go wrong most often, and which pages are weakest.
// ─────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/** How far back the aggregates look. Enough to be meaningful, bounded enough
 *  to stay one quick query. */
const AGGREGATE_WINDOW = 200;

interface SessionRow {
  id: string;
  created_at: string;
  page_number: number | null;
  verse_key: string | null;
  score: number | null;
  errors: string[] | null;
  feedback: string | null;
  word_count: number | null;
  correct_count: number | null;
  duration_seconds: number | null;
}

/** Stored as "wordIndex:word:reason|reason". The word itself can't contain a
 *  colon, but split defensively anyway — a malformed row should drop one
 *  entry, not throw away the student's whole history. */
function parseError(entry: string): { word: string; reasons: string[] } | null {
  const first = entry.indexOf(':');
  const second = entry.indexOf(':', first + 1);
  if (first === -1 || second === -1) return null;
  const word = entry.slice(first + 1, second).trim();
  if (!word) return null;
  return { word, reasons: entry.slice(second + 1).split('|').filter(Boolean) };
}

/** Reason codes are internal; students get the tajweed vocabulary. */
function kindOf(reason: string): 'omitted' | 'tashkeel' | 'makhraj' | 'timing' {
  if (reason === 'omitted') return 'omitted';
  if (reason.startsWith('madd_')) return 'tashkeel';
  if (reason.startsWith('tajweed_')) return 'timing';
  return 'makhraj';
}

export async function GET(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_HIFZ_LAB_ENABLED !== 'true') {
    return NextResponse.json({ error: 'Hifz Lab is not enabled.' }, { status: 404 });
  }
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const authed = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await authed.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? 20) || 20, 50);
    const before = req.nextUrl.searchParams.get('before');

    // ── the archive page the student is looking at ──
    let q = supabase
      .from('hifz_sessions')
      .select('id, created_at, page_number, verse_key, score, errors, feedback, word_count, correct_count, duration_seconds')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit + 1); // one extra: its existence is the "there is more" signal
    if (before) q = q.lt('created_at', before);

    const { data: page, error } = await q;
    if (error) throw error;

    const rows = (page ?? []) as SessionRow[];
    const hasMore = rows.length > limit;
    const sessions = rows.slice(0, limit).map((r) => ({
      id: r.id,
      at: r.created_at,
      page: r.page_number,
      verseKey: r.verse_key,
      score: r.score,
      feedback: r.feedback,
      wordCount: r.word_count,
      correctCount: r.correct_count,
      durationSeconds: r.duration_seconds,
      mistakeCount: (r.errors ?? []).length,
    }));

    // ── aggregates, over a wider window than the page being shown ──
    const { data: recent } = await supabase
      .from('hifz_sessions')
      .select('page_number, verse_key, score, errors, created_at')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false })
      .limit(AGGREGATE_WINDOW);

    const window = (recent ?? []) as SessionRow[];

    // Which words go wrong, and how they go wrong.
    const byWord = new Map<string, {
      word: string; count: number; lastSeen: string;
      kinds: Record<string, number>; verseKeys: Set<string>;
    }>();
    for (const s of window) {
      for (const raw of s.errors ?? []) {
        const parsed = parseError(raw);
        if (!parsed) continue;
        const cur = byWord.get(parsed.word) ?? {
          word: parsed.word, count: 0, lastSeen: s.created_at,
          kinds: {}, verseKeys: new Set<string>(),
        };
        cur.count += 1;
        if (s.verse_key) cur.verseKeys.add(s.verse_key);
        for (const r of parsed.reasons) {
          const k = kindOf(r);
          cur.kinds[k] = (cur.kinds[k] ?? 0) + 1;
        }
        byWord.set(parsed.word, cur);
      }
    }
    const mistakes = Array.from(byWord.values())
      // A word missed once is noise; twice is a pattern worth showing.
      .filter((m) => m.count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 25)
      .map((m) => ({
        word: m.word, count: m.count, lastSeen: m.lastSeen,
        kinds: m.kinds, verseKeys: Array.from(m.verseKeys).slice(0, 6),
      }));

    // Which pages are weakest. Averaged, not last-score, so one bad morning
    // does not brand a page the student otherwise knows.
    const byPage = new Map<number, { page: number; attempts: number; total: number; best: number }>();
    for (const s of window) {
      if (s.page_number == null || typeof s.score !== 'number') continue;
      const cur = byPage.get(s.page_number) ?? { page: s.page_number, attempts: 0, total: 0, best: 0 };
      cur.attempts += 1;
      cur.total += s.score;
      cur.best = Math.max(cur.best, s.score);
      byPage.set(s.page_number, cur);
    }
    const weakest = Array.from(byPage.values())
      .map((p) => ({ page: p.page, attempts: p.attempts, avgScore: Math.round(p.total / p.attempts), bestScore: p.best }))
      .filter((p) => p.avgScore < 90)
      .sort((a, b) => a.avgScore - b.avgScore)
      .slice(0, 10);

    return NextResponse.json({
      sessions,
      nextCursor: hasMore ? sessions[sessions.length - 1]?.at ?? null : null,
      mistakes,
      weakest,
      windowSize: window.length,
    });
  } catch (error: unknown) {
    console.error('Hifz history error:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
