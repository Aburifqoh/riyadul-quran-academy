'use client';

// ─────────────────────────────────────────────
// components/hifz/HifzLab.tsx
// Main Hifz Lab component — Tarteel-like interface
// for ilmversinstitute.com student portal
// ─────────────────────────────────────────────
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { QuranPage } from './QuranPage';
import { RecordButton } from './RecordButton';
import { ScorePanel } from './ScorePanel';
import { PageSelector, PageStatus } from './PageSelector';
import { MAX_RECITATION_SECONDS, useHifzRecorder } from '@/hooks/useHifzRecorder';
import { GeometricScoreStar } from './GeometricScoreStar';
import { ListenControls } from './ListenControls';
import { HistoryPanel } from './HistoryPanel';
import { SearchBox } from './SearchBox';
import { supabase } from '@/lib/supabase';

interface HifzLabProps {
  studentId: string;
  studentName: string;
  assignedPageStart?: number;
  assignedPageEnd?: number;
}

type Mode = 'memorize' | 'revise';

interface PageProgress {
  status: PageStatus;
  bestScore: number;
  attemptCount: number;
}

export function HifzLab({
  studentId,
  assignedPageStart = 1,
  assignedPageEnd = 604,
}: HifzLabProps) {
  const [currentPage, setCurrentPage] = useState(assignedPageStart);
  const [showPageSelector, setShowPageSelector] = useState(false);
  const [progress, setProgress] = useState<Record<number, PageProgress>>({});
  // Memorize = read along with the mushaf. Revise = the words stay covered and
  // are uncovered, with mistakes marked, once you have recited them. Previously
  // these two were a toggle that changed nothing.
  const [mode, setMode] = useState<Mode>('memorize');

  // A passage, not a single ayah. Reciting one verse at a time meant stopping,
  // grading and re-selecting every few seconds, which is not how anyone revises.
  const [pageVerses, setPageVerses] = useState<{ verse_key: string; text_uthmani: string }[]>([]);
  const [anchorKey, setAnchorKey] = useState<string>('');
  const [endKey, setEndKey] = useState<string>('');
  // Every ayah in the graded passage, not just the first. The marks used to
  // be pinned to selection.keys[0], so selecting two ayahs and reciting both
  // returned feedback on one of them and silently ignored the rest.
  const [gradedKeys, setGradedKeys] = useState<string[]>([]);
  const [streak, setStreak] = useState(0);
  const [week, setWeek] = useState<{ day: string; count: number; avgScore: number | null }[]>([]);
  const [resume, setResume] = useState<{ page: number | null; verseKey: string | null } | null>(null);
  // The best score before this take, so the panel can say whether it improved.
  const [scoreBefore, setScoreBefore] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  // Revise hides the words; peeking lifts that for as long as the button is
  // held. Separate from `mode` on purpose -- a peek must not silently leave the
  // student in Memorize, which is what toggling the mode to check a word did.
  const [peeking, setPeeking] = useState(false);
  const [showMeaning, setShowMeaning] = useState(false);
  // Daily goal, in sessions. Held per-browser rather than in the database:
  // it needs no schema change and nothing depends on it being authoritative.
  // The cost is that it does not follow the student to another device, which
  // is the honest trade for shipping it now.
  const [dailyGoal, setDailyGoal] = useState(0);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('ilmvers.hifz.dailyGoal');
    // localStorage does not exist during SSR, so this cannot be a lazy initial value without a hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setDailyGoal(Number(raw) || 0);
    } catch { /* private window; the goal just stays unset */ }
  }, []);
  const saveGoal = useCallback((n: number) => {
    setDailyGoal(n);
    try { localStorage.setItem('ilmvers.hifz.dailyGoal', String(n)); } catch { /* ignore */ }
  }, []);
  const todayCount = week.length > 0 ? week[week.length - 1].count : 0;

  const selection = useMemo(() => {
    if (!anchorKey || pageVerses.length === 0) {
      return { keys: [] as string[], ayahs: [] as string[], words: [] as string[], text: '' };
    }
    const iA = pageVerses.findIndex(v => v.verse_key === anchorKey);
    const iB = pageVerses.findIndex(v => v.verse_key === (endKey || anchorKey));
    if (iA < 0) return { keys: [], ayahs: [], words: [], text: '' };
    const [lo, hi] = iB < 0 ? [iA, iA] : [Math.min(iA, iB), Math.max(iA, iB)];
    const picked = pageVerses.slice(lo, hi + 1);
    const ayahs = picked.map(v => v.text_uthmani);
    const text = ayahs.join(' ');
    return {
      keys: picked.map(v => v.verse_key),
      ayahs,
      words: text.split(/\s+/).filter(Boolean),
      text,
    };
  }, [anchorKey, endKey, pageVerses]);

  // Recitation runs roughly 2 words a second, so flag a passage that will not
  // fit in one take BEFORE the student starts, rather than cutting them off
  // mid-ayah and leaving them to work out why.
  const estimatedSeconds = Math.round(selection.words.length / 2);
  const tooLongToRecite = estimatedSeconds > MAX_RECITATION_SECONDS - 10;

  const stopRecordingRef = useRef<(() => Promise<void>) | null>(null);
  const recorder = useHifzRecorder(() => {
    void stopRecordingRef.current?.();
  });

  // Wake the grader as soon as the lab opens. Modal scales to zero, so the
  // first recitation otherwise waits ~30s for the models to load; the student
  // spends roughly that long choosing a page, so overlapping the two removes
  // the wait entirely in the common case. Fire-and-forget on purpose -- if it
  // fails the only cost is the cold start we already have today.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled || !session) return;
        await fetch('/api/hifz-warm', {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
      } catch {
        // Nothing to tell the student: the grader still works cold.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Load progress on mount. Authenticated now: the endpoint reads a student's
  // whole history and used to take the id straight from the query string.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const tzOffset = new Date().getTimezoneOffset();
        const res = await fetch(`/api/hifz-progress?tzOffset=${tzOffset}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json();
        if (cancelled || !res.ok) return;
        if (data.progress) {
          const map: Record<number, PageProgress> = {};
          data.progress.forEach((p: { page_number: number; status: PageStatus; best_score: number; attempt_count: number }) => {
            map[p.page_number] = {
              status: p.status,
              bestScore: p.best_score,
              attemptCount: p.attempt_count,
            };
          });
          setProgress(map);
        }
        setStreak(data.streak ?? 0);
        setWeek(data.week ?? []);
        setResume(data.resume ?? null);
      } catch {
        /* progress is cosmetic — never block the lab on it */
      }
    })();
    return () => { cancelled = true; };
  }, [studentId]);

  const handleVerseTap = useCallback((verseKey: string) => {
    if (recorder.state === 'recording' || recorder.state === 'processing') return;
    recorder.reset();
    setGradedKeys([]);
    // First tap anchors the passage, a second tap extends it to that ayah, and
    // tapping the lone selected ayah again clears it.
    if (!anchorKey) {
      setAnchorKey(verseKey);
      setEndKey('');
      return;
    }
    if (anchorKey === verseKey && !endKey) {
      setAnchorKey('');
      setEndKey('');
      return;
    }
    setEndKey(verseKey);
  }, [recorder, anchorKey, endKey]);

  const clearSelection = useCallback(() => {
    recorder.reset();
    setAnchorKey('');
    setEndKey('');
    setGradedKeys([]);
  }, [recorder]);

  const handleStartRecording = useCallback(async () => {
    if (selection.keys.length === 0) return;
    await recorder.startRecording();
  }, [selection.keys.length, recorder]);

  const handleStopRecording = useCallback(async () => {
    if (selection.keys.length === 0 || !selection.text) return;

    setScoreBefore(progress[currentPage]?.bestScore ?? null);
    const result = await recorder.stopAndGrade(
      selection.words,
      selection.text,
      currentPage,
      selection.keys.join(','),
      studentId,
      selection.ayahs,
    );
    setGradedKeys(selection.keys);

    if (result) {
      // Update local progress optimistically
      const prev = progress[currentPage];
      setProgress(p => ({
        ...p,
        [currentPage]: {
          status: result.score >= 90 ? 'memorized' : 'in_progress',
          bestScore: Math.max(result.score, prev?.bestScore ?? 0),
          attemptCount: (prev?.attemptCount ?? 0) + 1,
        },
      }));
    }
  }, [selection, currentPage, studentId, progress, recorder]);

  useEffect(() => {
    stopRecordingRef.current = handleStopRecording;
  }, [handleStopRecording]);

  const handleRetry = useCallback(() => {
    recorder.reset();
  }, [recorder]);

  const handleNextAyah = useCallback(() => {
    // Step to the ayah after the passage just graded, staying on ayahs that
    // actually exist on this page rather than blindly incrementing.
    const last = selection.keys[selection.keys.length - 1];
    const idx = pageVerses.findIndex(v => v.verse_key === last);
    recorder.reset();
    setGradedKeys([]);
    setEndKey('');
    if (idx >= 0 && idx + 1 < pageVerses.length) {
      setAnchorKey(pageVerses[idx + 1].verse_key);
    } else {
      setAnchorKey('');
    }
  }, [selection.keys, pageVerses, recorder]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    recorder.reset();
    setAnchorKey('');
    setEndKey('');
    setGradedKeys([]);
    setPageVerses([]);
    setShowPageSelector(false);
  }, [recorder]);

  const completedPages = Object.values(progress).filter(p => p.status === 'memorized').length;
  const totalAssigned = assignedPageEnd - assignedPageStart + 1;
  const overallProgress = Math.round((completedPages / totalAssigned) * 100);

  return (
    // h-full, not min-h-screen: the portal mounts this inside a fixed-height
    // container with overflow-hidden, so asking for a full viewport made the
    // bottom of the page unreachable -- the tips card and, on a short screen,
    // the score panel were simply cut off with no way to scroll to them.
    <div className="h-full flex flex-col bg-stone-50" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Top bar ── */}
      {/* `relative` matters: the page-selector dropdown below is positioned
          `absolute top-full`, and without a positioned ancestor here it resolved
          against the portal's own fixed container instead -- so the button
          toggled but the panel opened somewhere off the header entirely. */}
      <header className="relative shrink-0 z-20 bg-white border-b border-[#004D4A]/20 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">

          {/* Left: page + progress. A second academy lockup used to sit here and
              wrapped onto two lines on a phone, pushing the controls off the row. */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPageSelector(v => !v)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-[#004D4A]/10 transition-colors text-sm"
            >
              <span className="text-stone-500 text-xs">Page</span>
              <span className="font-bold text-[#004D4A]">{currentPage}</span>
              <span className="text-stone-400 text-xs">▾</span>
            </button>

            <SearchBox
              onJump={(page, verseKey) => {
                handlePageChange(page);
                setAnchorKey(verseKey);
                setEndKey(verseKey);
              }}
            />

            <button
              onClick={() => setShowMeaning(v => !v)}
              aria-pressed={showMeaning}
              title="Show meaning and transliteration under each ayah"
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors ${
                showMeaning
                  ? 'border-[#2F6F5E] bg-[#2F6F5E]/10 text-[#2F6F5E]'
                  : 'border-stone-200 text-[#004D4A] hover:bg-[#004D4A]/10'
              }`}
            >
              Meaning
            </button>

            <button
              onClick={() => setShowHistory(true)}
              title="Your past sessions, the words you keep missing, and your weakest pages"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-[#004D4A]/10 transition-colors text-sm text-[#004D4A]"
            >
              <span className="text-xs">🕮</span>
              <span className="text-xs font-bold">History</span>
            </button>

            {/* Overall progress bar */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-32 h-1.5 bg-stone-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#004D4A] to-[#166B67] rounded-full transition-all duration-500"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
              <span className="text-xs text-[#004D4A] opacity-80">{completedPages}/{totalAssigned} pages</span>
            </div>
          </div>

          {/* Memorize / Revise. This pair used to change nothing at all --
              QuranPage took a `mode` prop and never read it. Revise now covers
              the ayahs so they have to be recited from memory, and uncovers
              them with the mistakes marked once they have been graded. */}
          <div className="flex items-center bg-[#004D4A]/5 rounded-lg p-0.5 shrink-0">
            {mode === 'revise' && (
              <button
                type="button"
                onMouseDown={() => setPeeking(true)}
                onMouseUp={() => setPeeking(false)}
                onMouseLeave={() => setPeeking(false)}
                onTouchStart={(e) => { e.preventDefault(); setPeeking(true); }}
                onTouchEnd={() => setPeeking(false)}
                onTouchCancel={() => setPeeking(false)}
                // Keyboard users get the same thing without a hold.
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPeeking(true); } }}
                onKeyUp={() => setPeeking(false)}
                onBlur={() => setPeeking(false)}
                title="Hold to glance at the words, release to hide them again"
                className={`mr-1 px-3 py-1.5 rounded-md text-xs font-bold transition-all select-none ${
                  peeking
                    ? 'bg-[#004D4A] text-white'
                    : 'bg-[#004D4A]/5 text-[#004D4A]/70 hover:text-[#004D4A]'
                }`}
              >
                {peeking ? '👁 Showing' : '👁 Peek'}
              </button>
            )}
            {(['memorize', 'revise'] as Mode[]).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                title={m === 'memorize'
                  ? 'Read along with the page'
                  : 'Hide the words and recite from memory'}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all capitalize ${
                  mode === m
                    ? 'bg-white text-[#004D4A] shadow-sm font-bold border border-[#004D4A]/20'
                    : 'text-[#004D4A]/60 hover:text-[#004D4A]'
                }`}
              >
                {m === 'memorize' ? '🧠 Memorize' : '🙈 Revise'}
              </button>
            ))}
          </div>
        </div>

        {/* Page selector dropdown */}
        {showPageSelector && (
          <div className="absolute top-full left-0 right-0 bg-white border-b border-stone-200 shadow-lg z-30 max-h-80 overflow-y-auto">
            <div className="max-w-6xl mx-auto px-4 py-4">
              <PageSelector
                currentPage={currentPage}
                progress={progress}
                assignedRange={{ start: assignedPageStart, end: assignedPageEnd }}
                onSelect={handlePageChange}
              />
            </div>
          </div>
        )}
      </header>

      {/* ── Main layout ── */}
      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 py-4 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">

          {/* ── Left: Quran page ── */}
          <div className="min-w-0">

            {/* The "tap an ayah then hold to recite" hint that used to sit here
                said the same thing as the recite bar's own caption, twice on one
                screen. The bar is always visible now, so the card was just
                stealing height from the mushaf. */}
            {/* Selected passage indicator */}
            {selection.keys.length > 0 && (
              <div className="mb-3 flex items-center justify-between gap-3 bg-[#004D4A]/10 border border-[#004D4A]/30 rounded-xl px-4 py-2.5 shadow-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[#004D4A]">🎯</span>
                  <span className="text-sm text-[#004D4A] font-medium truncate">
                    Practising:{' '}
                    <span className="font-mono font-bold">
                      {selection.keys.length === 1
                        ? selection.keys[0]
                        : `${selection.keys[0]} – ${selection.keys[selection.keys.length - 1]}`}
                    </span>
                    <span className="text-[#004D4A]/60">
                      {' '}· {selection.keys.length} {selection.keys.length === 1 ? 'ayah' : 'ayahs'}
                    </span>
                  </span>
                </div>
                <button
                  onClick={clearSelection}
                  className="shrink-0 text-xs text-[#004D4A]/60 hover:text-[#004D4A] font-bold"
                >
                  Clear ✕
                </button>
              </div>
            )}

            {selection.keys.length === 1 && (
              <p className="mb-3 -mt-1 text-[11px] text-stone-500">
                Tap another ayah to recite a longer passage.
              </p>
            )}

            {selection.keys.length > 1 && !tooLongToRecite && (
              <p className="mb-3 -mt-1 text-[11px] text-stone-500">
                About {estimatedSeconds}s to recite · limit {MAX_RECITATION_SECONDS / 60} min per take
              </p>
            )}

            {tooLongToRecite && (
              <div className="mb-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
                This passage is roughly {estimatedSeconds}s of recitation and a single take
                stops at {MAX_RECITATION_SECONDS / 60} minutes. Select fewer ayahs so you are not cut off.
              </div>
            )}

            {/* The Quran page */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">

              {/* Page header */}
              <div className="flex items-center justify-between px-5 py-2.5 border-b border-stone-100 bg-stone-50/50">
                {/* A mushaf turns right-to-left, so "next page" is the LEFT
                    control. Previously the glyphs pointed one way and their
                    positions the other: ▶ sat on the left edge and meant
                    Previous. Labelled now, so neither can be misread. */}
                <button
                  onClick={() => currentPage < 604 && handlePageChange(currentPage + 1)}
                  disabled={currentPage >= 604}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium hover:bg-stone-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-stone-600"
                  aria-label="Next page"
                >
                  <span aria-hidden>‹</span> Next
                </button>
                <span className="text-xs text-stone-500 font-medium tracking-wide">
                  Page {currentPage} of 604
                </span>
                <button
                  onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium hover:bg-stone-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-stone-600"
                  aria-label="Previous page"
                >
                  Previous <span aria-hidden>›</span>
                </button>
              </div>

              <QuranPage
                pageNumber={currentPage}
                alignment={recorder.result?.alignment}
                selectedKeys={selection.keys}
                gradedKeys={gradedKeys}
                onVerseTap={handleVerseTap}
                onVersesLoaded={setPageVerses}
                hideUngraded={mode === 'revise' && !peeking}
                showMeaning={showMeaning}
                isRecording={recorder.state === 'recording'}
                isProcessing={recorder.state === 'processing'}
              />
            </div>

            {/* Mode explanation removed as it is now continuous phoneme-level highlighting */}
          </div>

          {/* ── Right: Controls ── */}
          <div className="flex flex-col gap-4">

            {/* Score panel — shown after grading */}
            {recorder.state === 'done' && recorder.result && (
              <ScorePanel
                result={recorder.result}
                previousBest={scoreBefore}
                onRetry={handleRetry}
                onNext={handleNextAyah}
              />
            )}

            {/* Practice habit. Page-level best scores said nothing about whether
                a student is actually turning up, which is most of what
                memorisation depends on. */}
            {(streak > 0 || week.some(d => d.count > 0) || resume) && (
              <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4">
                <div className="flex items-baseline justify-between mb-3">
                  <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide m-0">
                    Your practice
                  </h3>
                  {streak > 0 && (
                    <span className="text-xs font-bold text-[#004D4A]">
                      🔥 {streak} day{streak === 1 ? '' : 's'}
                    </span>
                  )}
                </div>

                {/* Daily goal. Deliberately a target the student sets, not one
                    the app assigns — an imposed number that is wrong for someone's
                    schedule is a reason to stop opening the app. */}
                <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-stone-100">
                  {dailyGoal > 0 ? (
                    <>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between text-[11px] mb-1">
                          <span className="font-bold text-stone-600">
                            Today {todayCount} of {dailyGoal}
                          </span>
                          {todayCount >= dailyGoal && (
                            <span className="text-[#2F6F5E] font-bold">done ✓</span>
                          )}
                        </div>
                        <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#2F6F5E] rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, (todayCount / dailyGoal) * 100)}%` }}
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => saveGoal(0)}
                        title="Remove your daily goal"
                        className="text-[11px] text-stone-400 hover:text-stone-600 shrink-0"
                      >
                        clear
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 w-full">
                      <span className="text-[11px] text-stone-500">Set a daily goal</span>
                      <div className="flex gap-1 ml-auto">
                        {[1, 3, 5, 10].map(n => (
                          <button
                            key={n}
                            onClick={() => saveGoal(n)}
                            className="px-2 py-1 rounded-md border border-stone-200 text-[11px] font-bold text-stone-600 hover:bg-[#2F6F5E]/10 hover:border-[#2F6F5E]/30"
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-end justify-between gap-1 mb-1" aria-hidden>
                  {week.map(d => {
                    const height = d.count === 0 ? 4 : Math.min(28, 8 + d.count * 6);
                    return (
                      <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className={`w-full rounded-sm ${d.count > 0 ? 'bg-[#004D4A]' : 'bg-stone-200'}`}
                          style={{ height }}
                          title={`${d.day}: ${d.count} recitation${d.count === 1 ? '' : 's'}${
                            d.avgScore != null ? `, avg ${d.avgScore}` : ''
                          }`}
                        />
                        <span className="text-[9px] text-stone-400">
                          {new Date(`${d.day}T00:00:00Z`).toLocaleDateString(undefined, { weekday: 'narrow' })}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[11px] text-stone-500 m-0 mt-1">
                  {week.reduce((n, d) => n + d.count, 0)} recitations in the last 7 days
                </p>

                {resume?.page != null && resume.page !== currentPage && (
                  <button
                    type="button"
                    onClick={() => handlePageChange(resume.page as number)}
                    className="mt-3 w-full rounded-xl border border-[#004D4A]/30 bg-[#004D4A]/10 px-3 py-2 text-xs font-bold text-[#004D4A] hover:bg-[#004D4A]/20"
                  >
                    Resume page {resume.page}
                    {resume.verseKey ? ` · last at ${resume.verseKey.split(',')[0]}` : ''}
                  </button>
                )}
              </div>
            )}

            {/* Page progress card */}
            {progress[currentPage] && (
              <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 flex flex-col items-center">
                <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3 w-full text-left">
                  Page {currentPage} History
                </h3>
                <div className="py-2 scale-90">
                  <GeometricScoreStar score={progress[currentPage].bestScore} size={130} label="BEST SCORE" />
                </div>
                <div className="grid grid-cols-2 gap-8 mt-2 w-full px-4 text-center">
                  <div>
                    <div className="text-xl font-bold text-stone-800">
                      {progress[currentPage].attemptCount}
                    </div>
                    <div className="text-[10px] text-stone-400 uppercase tracking-wide">Attempts</div>
                  </div>
                  <div>
                    <div className={`text-sm font-bold mt-1 capitalize ${
                      progress[currentPage].status === 'memorized' ? 'text-emerald-700' :
                      progress[currentPage].status === 'in_progress' ? 'text-amber-700' :
                      'text-stone-400'
                    }`}>
                      {progress[currentPage].status.replace('_', ' ')}
                    </div>
                    <div className="text-[10px] text-stone-400 uppercase tracking-wide">Status</div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick tips */}
            <div className="bg-gradient-to-br from-[#004D4A]/10 to-[#004D4A]/5 rounded-2xl border border-[#004D4A]/20 p-4">
              <p className="text-xs font-bold text-[#004D4A] mb-2">📚 How to use Hifz Lab</p>
              <ol className="text-xs text-[#004D4A]/80 space-y-1.5 list-decimal list-inside leading-relaxed">
                <li>Tap an ayah to select it, then tap another to recite a longer passage</li>
                <li>Tap <strong>Recite</strong> to start, and tap again when you finish</li>
                <li><strong>🙈 Revise</strong> hides the words so you recite from memory</li>
                <li><strong>Red dots</strong> appear on specific pronunciation errors</li>
                <li><strong>Dashed underlines</strong> check your Madd durations</li>
              </ol>
            </div>
          </div>
        </div>
      </main>

      {/* Recite bar. It lives outside <main> so it is always on screen: the
          control and the ayah you just tapped were previously in the same
          scrolling column, so on a phone the button was a full page-scroll away
          from the text. A sticky element inside that column could not fix it --
          the column is only as tall as its content, so it had no scroll range
          to stick within. */}
      <footer className="shrink-0 border-t border-stone-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        {/* ONE row. This was a three-row stack -- heading, status line and listen
            buttons in a column beside a 96px button, with the listen buttons
            repeated again underneath on a phone -- and it stood ~170px tall
            before recording even started. <main> above is flex-1, so every one
            of those pixels came straight out of the visible mushaf. Nothing here
            was wrong, there was just too much of it: the heading labelled a bar
            whose only control is a button that already reads "Recite". */}
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center gap-3">
          <p className="hidden sm:block flex-1 min-w-0 text-xs text-stone-500 truncate">
            {selection.keys.length > 0
              ? `Ready to grade ${selection.keys.length === 1 ? selection.keys[0] : `${selection.keys[0]} – ${selection.keys[selection.keys.length - 1]}`}`
              : 'Select an ayah from the page to begin'}
          </p>

          <RecordButton
            recorderState={recorder.state}
            waveform={recorder.waveform}
            duration={recorder.duration}
            onStart={handleStartRecording}
            onStop={handleStopRecording}
            disabled={selection.keys.length === 0}
          />

          {/* Balances the status text so the button stays optically centred. */}
          <div className="flex-1 min-w-0 flex justify-end">
            <ListenControls verseKeys={selection.keys} recordingUrl={recorder.recordingUrl} />

      <HistoryPanel
        open={showHistory}
        onClose={() => setShowHistory(false)}
        onPractisePage={(page) => handlePageChange(page)}
      />
          </div>
        </div>

        {recorder.state === 'error' && recorder.errorMsg && (
          <div className="px-4 pb-2 -mt-1 text-xs text-red-700 text-center">
            {recorder.errorMsg}{' '}
            <button onClick={recorder.reset} className="underline hover:no-underline">Try again</button>
          </div>
        )}
      </footer>
    </div>
  );
}
