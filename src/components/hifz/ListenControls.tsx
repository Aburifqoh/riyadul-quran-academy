'use client';

// ─────────────────────────────────────────────
// components/hifz/ListenControls.tsx
// Hear the reference, and hear yourself.
//
// Two separate gaps this closes. A student had no qari to imitate before
// reciting, which for memorisation matters more than any feedback we generate
// afterwards. And after grading they were told a sound was wrong with no way to
// hear what they had actually said, which makes the correction unactionable.
// Putting both in one row is deliberate: the comparison is the point.
// ─────────────────────────────────────────────
import { useCallback, useEffect, useRef, useState } from 'react';

/** Mahmoud Khalil Al-Husary, one file per ayah, keyed SSSAAA. */
function husaryUrl(verseKey: string): string | null {
  const [surah, ayah] = verseKey.split(':');
  if (!surah || !ayah) return null;
  const pad = (n: string) => n.padStart(3, '0');
  return `https://everyayah.com/data/Husary_128kbps/${pad(surah)}${pad(ayah)}.mp3`;
}

type Track = 'reference' | 'own';

export function ListenControls({
  verseKeys,
  recordingUrl,
  className = '',
}: {
  verseKeys: string[];
  recordingUrl?: string | null;
  className?: string;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<string[]>([]);
  const queueIndex = useRef(0);
  const [playing, setPlaying] = useState<Track | null>(null);
  const [failed, setFailed] = useState(false);
  // Repeat count for the reference. Imitation is how a passage is learnt, and
  // re-pressing play after every pass is the thing that breaks the rhythm.
  const [repeat, setRepeat] = useState(1);
  // State, not a ref: this is rendered. A ref read during render does not
  // re-render when it changes, so the counter would sit on "pass 1" forever.
  const [pass, setPass] = useState(1);

  const stop = useCallback(() => {
    const el = audioRef.current;
    if (el) {
      el.pause();
      el.removeAttribute('src');
      el.load();
    }
    queueRef.current = [];
    queueIndex.current = 0;
    setPlaying(null);
  }, []);

  // A new selection or a new take invalidates whatever is mid-playback. Stopping
  // happens in the cleanup rather than the body so it runs when the inputs
  // change or the component goes away, without setState during the effect.
  const selectionId = verseKeys.join(',');
  useEffect(() => stop, [selectionId, recordingUrl, stop]);

  const playQueue = useCallback((urls: string[], track: Track) => {
    if (urls.length === 0) return;
    setFailed(false);
    queueRef.current = urls;
    queueIndex.current = 0;
    setPass(1);
    setPlaying(track);

    const el = audioRef.current;
    if (!el) return;
    el.src = urls[0];
    void el.play().catch(() => {
      setFailed(true);
      setPlaying(null);
    });
  }, []);

  const handleEnded = useCallback(() => {
    const el = audioRef.current;
    if (!el) { setPlaying(null); return; }
    const next = queueIndex.current + 1;
    // A multi-ayah passage is several files; play them back to back so the
    // passage sounds continuous rather than one ayah at a time.
    if (next < queueRef.current.length) {
      queueIndex.current = next;
      el.src = queueRef.current[next];
      void el.play().catch(() => { setFailed(true); setPlaying(null); });
      return;
    }
    // Whole passage finished. Repeat it if there are passes left. `repeat` is
    // read from the ref-free closure via the state setter's own value below,
    // so a change mid-playback takes effect on the next pass rather than being
    // captured stale at press time.
    if (repeat === 0 || pass < repeat) {
      setPass((n) => n + 1);
      queueIndex.current = 0;
      el.src = queueRef.current[0];
      void el.play().catch(() => { setFailed(true); setPlaying(null); });
      return;
    }
    setPlaying(null);
  }, [repeat, pass]);

  const onReference = () => {
    if (playing === 'reference') return stop();
    const urls = verseKeys.map(husaryUrl).filter((u): u is string => Boolean(u));
    playQueue(urls, 'reference');
  };

  const onOwn = () => {
    if (playing === 'own') return stop();
    if (recordingUrl) playQueue([recordingUrl], 'own');
  };

  const base =
    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <audio ref={audioRef} onEnded={handleEnded} preload="none" className="hidden" />

      <button
        type="button"
        onClick={onReference}
        disabled={verseKeys.length === 0}
        className={`${base} border-[#2F6F5E]/30 bg-[#2F6F5E]/10 text-[#2F6F5E] hover:bg-[#2F6F5E]/20`}
        title="Listen to Shaykh Mahmoud Khalil Al-Husary recite this passage"
      >
        {playing === 'reference' ? '⏹ Stop' : '▶ Husary'}
      </button>

      <button
        type="button"
        onClick={onOwn}
        disabled={!recordingUrl}
        className={`${base} border-stone-300 bg-white text-stone-700 hover:bg-stone-100`}
        title={recordingUrl ? 'Hear your own recitation back' : 'Record first, then you can hear yourself'}
      >
        {playing === 'own' ? '⏹ Stop' : '▶ You'}
      </button>

      <label className="flex items-center gap-1 text-[11px] text-stone-500">
        <span className="sr-only">Repeat the reference</span>
        <span aria-hidden>⟳</span>
        <select
          value={repeat}
          onChange={(e) => setRepeat(Number(e.target.value))}
          title="How many times to repeat the reference recitation"
          className="bg-transparent border border-stone-300 rounded-md px-1.5 py-1 text-[11px] font-bold text-stone-700"
        >
          <option value={1}>×1</option>
          <option value={3}>×3</option>
          <option value={5}>×5</option>
          <option value={10}>×10</option>
          <option value={0}>loop</option>
        </select>
      </label>

      {playing === 'reference' && repeat !== 1 && (
        <span className="text-[11px] text-stone-500 tabular-nums">
          pass {pass}{repeat > 0 ? ` / ${repeat}` : ''}
        </span>
      )}

      {failed && (
        <span className="text-[11px] text-stone-500">Audio unavailable — check your connection.</span>
      )}
    </div>
  );
}
