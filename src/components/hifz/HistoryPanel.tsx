'use client';

// ─────────────────────────────────────────────
// components/hifz/HistoryPanel.tsx
// What the lab remembers about you.
//
// Sessions were being written from the very first day and never read back, so
// a student could miss the same word every morning for a month and be met each
// time by a lab with no memory of it. Three views over that data: the archive,
// the words that actually keep going wrong, and the pages worth revisiting.
//
// "Practise this" is the point of the whole panel — a list of weaknesses you
// cannot act on is just a report card.
// ─────────────────────────────────────────────
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';

interface SessionItem {
  id: string;
  at: string;
  page: number | null;
  verseKey: string | null;
  score: number | null;
  feedback: string | null;
  wordCount: number | null;
  correctCount: number | null;
  durationSeconds: number | null;
  mistakeCount: number;
}
interface MistakeItem {
  word: string;
  count: number;
  lastSeen: string;
  kinds: Record<string, number>;
  verseKeys: string[];
}
interface WeakItem { page: number; attempts: number; avgScore: number; bestScore: number }

type Tab = 'sessions' | 'mistakes' | 'weakest';

const KIND_LABEL: Record<string, string> = {
  tashkeel: 'tashkeel',
  makhraj: 'makhraj',
  omitted: 'skipped',
  timing: 'ghunnah / qalqalah',
};

function when(iso: string): string {
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function HistoryPanel({
  open,
  onClose,
  onPractisePage,
}: {
  open: boolean;
  onClose: () => void;
  onPractisePage: (page: number) => void;
}) {
  const [tab, setTab] = useState<Tab>('sessions');
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [mistakes, setMistakes] = useState<MistakeItem[]>([]);
  const [weakest, setWeakest] = useState<WeakItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async (before?: string) => {
    setLoading(true);
    setFailed(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setFailed(true); return; }
      const qs = new URLSearchParams({ limit: '20' });
      if (before) qs.set('before', before);
      const res = await fetch(`/api/hifz-history?${qs}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) { setFailed(true); return; }
      const d = await res.json();
      // Appending only when paging keeps "load more" from duplicating the
      // first page on a re-open.
      setSessions((prev) => (before ? [...prev, ...d.sessions] : d.sessions));
      setMistakes(d.mistakes ?? []);
      setWeakest(d.weakest ?? []);
      setCursor(d.nextCursor ?? null);
      setLoaded(true);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on open rather than on mount: most sessions never open this panel,
  // and it is two queries.
  //
  // Every open, not just the first. It was guarded by `loaded`, which meant
  // that after recording a new take the panel still showed the history from
  // before it -- the one moment a student is most likely to go looking.
  //
  // The lint rule cannot tell a fetch-on-open from a render loop; this fires
  // on the open transition only, and every setState it reaches is inside the
  // async callback rather than the effect body.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (open) void load(); }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Mounted flag: createPortal needs document.body, which does not exist while
  // the component is being rendered on the server.
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMounted(true); }, []);

  if (!open || !mounted) return null;

  const tabBtn = (id: Tab, label: string, n?: number) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`px-3 py-2 text-xs font-bold rounded-lg transition-colors ${
        tab === id ? 'bg-[#2F6F5E] text-white' : 'text-stone-600 hover:bg-stone-100'
      }`}
    >
      {label}{typeof n === 'number' && n > 0 ? ` (${n})` : ''}
    </button>
  );

  // Rendered into <body>. The Hifz Lab lives inside a
  // `h-[calc(100vh-100px)] overflow-hidden` box, and the portal shell around it
  // establishes a containing block, so a position:fixed child was being sized
  // and clipped against the lab pane instead of the viewport -- the panel came
  // up cut off. A portal is the only fix that does not depend on knowing every
  // ancestor's transform.
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-end" role="dialog" aria-modal="true" aria-label="Your practice history">
      <button
        type="button"
        aria-label="Close history"
        onClick={onClose}
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
      />
      <div className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col">

        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200">
          <h2 className="text-base font-bold text-stone-800 m-0">Your practice history</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-stone-100 text-stone-500 text-lg leading-none"
          >
            ×
          </button>
        </div>

        <div className="flex gap-1 px-4 py-2.5 border-b border-stone-100">
          {tabBtn('sessions', 'Sessions')}
          {tabBtn('mistakes', 'Mistakes', mistakes.length)}
          {tabBtn('weakest', 'Weakest', weakest.length)}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {failed && (
            <p className="text-sm text-stone-500">
              Could not load your history. Check your connection and reopen this panel.
            </p>
          )}

          {!failed && loading && sessions.length === 0 && (
            <p className="text-sm text-stone-400">Loading…</p>
          )}

          {/* ── Sessions ── */}
          {!failed && tab === 'sessions' && (
            sessions.length === 0 && loaded ? (
              <p className="text-sm text-stone-500">
                No sessions yet. Recite a passage and it will appear here.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {sessions.map((s) => (
                  <div key={s.id} className="rounded-xl border border-stone-200 px-3.5 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-xs text-stone-500">
                        {s.verseKey ?? `page ${s.page}`}
                      </span>
                      <span className={`text-sm font-bold ${
                        (s.score ?? 0) >= 90 ? 'text-[#2F6F5E]'
                        : (s.score ?? 0) >= 75 ? 'text-[#8A7357]' : 'text-[#A63D3D]'
                      }`}>
                        {s.score ?? '—'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-stone-500">
                      <span>{when(s.at)}</span>
                      {s.durationSeconds ? <span>· {s.durationSeconds}s</span> : null}
                      {s.mistakeCount > 0
                        ? <span>· {s.mistakeCount} {s.mistakeCount === 1 ? 'word' : 'words'} marked</span>
                        : <span className="text-[#2F6F5E]">· clean</span>}
                    </div>
                    {s.feedback && (
                      <p className="text-[11.5px] text-stone-600 mt-1.5 mb-0 leading-snug">{s.feedback}</p>
                    )}
                  </div>
                ))}
                {cursor && (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => void load(cursor)}
                    className="mt-1 py-2.5 rounded-xl border border-stone-200 text-xs font-bold text-stone-600 hover:bg-stone-50 disabled:opacity-50"
                  >
                    {loading ? 'Loading…' : 'Load older sessions'}
                  </button>
                )}
              </div>
            )
          )}

          {/* ── Mistakes ── */}
          {!failed && tab === 'mistakes' && (
            mistakes.length === 0 && loaded ? (
              <p className="text-sm text-stone-500">
                Nothing has gone wrong twice yet. A word appears here once it has been
                missed more than once, so a single slip is not treated as a pattern.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {mistakes.map((m) => (
                  <div key={m.word} className="rounded-xl border border-stone-200 px-3.5 py-3 flex items-start gap-3">
                    <span
                      className="text-xl text-[#A63D3D] shrink-0"
                      style={{ fontFamily: "'Amiri Quran', 'Amiri', serif" }}
                      dir="rtl"
                    >
                      {m.word}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-stone-700">
                        missed {m.count} times
                        <span className="font-normal text-stone-400"> · last {when(m.lastSeen)}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {Object.entries(m.kinds).map(([k, n]) => (
                          <span key={k} className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-100 text-stone-600">
                            {KIND_LABEL[k] ?? k} ×{n}
                          </span>
                        ))}
                      </div>
                      {m.verseKeys.length > 0 && (
                        <div className="text-[10.5px] text-stone-400 mt-1 font-mono">
                          {m.verseKeys.join('  ')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* ── Weakest ── */}
          {!failed && tab === 'weakest' && (
            weakest.length === 0 && loaded ? (
              <p className="text-sm text-stone-500">
                No weak pages — everything you have recited averages 90 or above.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {weakest.map((w) => (
                  <div key={w.page} className="rounded-xl border border-stone-200 px-3.5 py-3 flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-stone-800">Page {w.page}</div>
                      <div className="text-[11px] text-stone-500">
                        {w.attempts} {w.attempts === 1 ? 'attempt' : 'attempts'} · average {w.avgScore} · best {w.bestScore}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { onPractisePage(w.page); onClose(); }}
                      className="shrink-0 px-3 py-2 rounded-lg bg-[#2F6F5E] text-white text-xs font-bold hover:bg-[#255a4c]"
                    >
                      Practise
                    </button>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
