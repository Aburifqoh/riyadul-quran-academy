'use client';

// ─────────────────────────────────────────────
// components/hifz/SearchBox.tsx
// Find a passage by what it says, not by what number it is.
//
// Navigation was page number only, which assumes the student already knows
// where the thing they want to practise lives. Search closes that gap: type a
// few words, land on the page.
//
// Recent searches are kept per-browser in localStorage. They are a convenience,
// never state anything depends on — every read is guarded, because the accessor
// itself throws in a private window or with site data blocked.
// ─────────────────────────────────────────────
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const RECENTS_KEY = 'ilmvers.hifz.recentSearches';
const MAX_RECENTS = 6;

interface Hit {
  verseKey: string;
  page: number;
  text: string;
}

function readRecents(): string[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string').slice(0, MAX_RECENTS) : [];
  } catch {
    return [];
  }
}

function writeRecents(list: string[]) {
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(list.slice(0, MAX_RECENTS)));
  } catch {
    // Private window, or site data blocked. Search still works.
  }
}

export function SearchBox({ onJump }: { onJump: (page: number, verseKey: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [searched, setSearched] = useState(false);
  const [recents, setRecents] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const runId = useRef(0);

    // Same reason: recents live in localStorage and can only be read on the client.
    // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (open) { setRecents(readRecents()); inputRef.current?.focus(); } }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const run = useCallback(async (term: string) => {
    const query = term.trim();
    if (query.length < 2) return;
    // Every run gets a ticket; a slow earlier response must not overwrite the
    // results of a later, faster one.
    const ticket = ++runId.current;
    setBusy(true);
    setFailed(false);
    try {
      const res = await fetch(
        `https://api.quran.com/api/v4/search?q=${encodeURIComponent(query)}&size=20`
      );
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      if (ticket !== runId.current) return;

      const results = (data?.search?.results ?? []) as { verse_key: string; text: string }[];
      // The search endpoint does not return a page number, and asking for one
      // per hit would be twenty round trips. The verse endpoint takes a list.
      const keys = results.map((r) => r.verse_key).filter(Boolean);
      const pageByKey = new Map<string, number>();
      if (keys.length > 0) {
        const detail = await fetch(
          `https://api.quran.com/api/v4/verses/by_key/${keys[0]}?fields=page_number`
        ).then((r) => (r.ok ? r.json() : null)).catch(() => null);
        // by_key is one verse at a time, so resolve lazily: the first hit gets
        // a real page immediately and the rest resolve on click. Better than
        // blocking the whole result list on twenty requests.
        if (detail?.verse?.page_number) pageByKey.set(keys[0], detail.verse.page_number);
      }
      if (ticket !== runId.current) return;

      setHits(results.slice(0, 20).map((r) => ({
        verseKey: r.verse_key,
        page: pageByKey.get(r.verse_key) ?? 0,
        text: (r.text ?? '').replace(/<[^>]*>/g, ''),
      })));
      setSearched(true);

      const next = [query, ...readRecents().filter((x) => x !== query)];
      writeRecents(next);
      setRecents(next.slice(0, MAX_RECENTS));
    } catch {
      if (ticket === runId.current) { setFailed(true); setHits([]); setSearched(true); }
    } finally {
      if (ticket === runId.current) setBusy(false);
    }
  }, []);

  const jump = useCallback(async (hit: Hit) => {
    let page = hit.page;
    if (!page) {
      try {
        const d = await fetch(
          `https://api.quran.com/api/v4/verses/by_key/${hit.verseKey}?fields=page_number`
        ).then((r) => (r.ok ? r.json() : null));
        page = d?.verse?.page_number ?? 0;
      } catch {
        page = 0;
      }
    }
    if (page) { onJump(page, hit.verseKey); setOpen(false); }
  }, [onJump]);

  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMounted(true); }, []);

  if (!open || !mounted) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Search the Qur'an by text"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-[#004D4A]/10 transition-colors text-sm text-[#004D4A]"
      >
        <span className="text-xs" aria-hidden>⌕</span>
        <span className="text-xs font-bold">Search</span>
      </button>
    );
  }

  // Portalled for the same reason as HistoryPanel: the lab pane clips fixed
  // children.
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[10vh] px-4" role="dialog" aria-modal="true" aria-label="Search the Qur'an">
      <button type="button" aria-label="Close search" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh]">
        <form
          onSubmit={(e) => { e.preventDefault(); void run(q); }}
          className="flex items-center gap-2 px-4 py-3 border-b border-stone-200"
        >
          <span className="text-stone-400" aria-hidden>⌕</span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by words, in Arabic or English…"
            className="flex-1 text-sm outline-none bg-transparent text-stone-800 placeholder:text-stone-400"
          />
          <button type="submit" disabled={busy || q.trim().length < 2}
            className="px-3 py-1.5 rounded-lg bg-[#2F6F5E] text-white text-xs font-bold disabled:opacity-40">
            {busy ? '…' : 'Search'}
          </button>
        </form>

        <div className="overflow-y-auto px-4 py-3">
          {!searched && recents.length > 0 && (
            <>
              <p className="text-[11px] font-bold uppercase tracking-wide text-stone-400 mt-0 mb-2">Recent</p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {recents.map((r) => (
                  <button key={r} onClick={() => { setQ(r); void run(r); }}
                    className="px-2.5 py-1 rounded-full bg-stone-100 hover:bg-stone-200 text-xs text-stone-700">
                    {r}
                  </button>
                ))}
              </div>
            </>
          )}

          {failed && <p className="text-sm text-stone-500">Search is unavailable right now. Check your connection.</p>}

          {searched && !failed && hits.length === 0 && (
            <p className="text-sm text-stone-500">Nothing matched “{q}”.</p>
          )}

          <div className="flex flex-col gap-1">
            {hits.map((h) => (
              <button
                key={h.verseKey}
                onClick={() => void jump(h)}
                className="text-left rounded-xl px-3 py-2.5 hover:bg-stone-50 border border-transparent hover:border-stone-200"
              >
                <span className="font-mono text-[11px] text-stone-500">{h.verseKey}</span>
                <span
                  className="block text-right text-base leading-relaxed text-stone-800 mt-0.5"
                  dir="rtl"
                  style={{ fontFamily: "'Amiri Quran', 'Amiri', serif" }}
                >
                  {h.text}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
