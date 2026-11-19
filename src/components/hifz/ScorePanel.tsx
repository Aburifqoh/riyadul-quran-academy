'use client';

import type { PhonemeAlignment } from '@/types/globals';

// ─────────────────────────────────────────────
// components/hifz/ScorePanel.tsx
// Score ring, phoneme breakdown, GPT feedback
// ─────────────────────────────────────────────
import { GradeResult } from '@/hooks/useHifzRecorder';
import { GeometricScoreStar } from './GeometricScoreStar';
import { guideFor, maddName, ruleName } from '@/lib/phonemeGuide';

interface Props {
  result: GradeResult;
  /** Best score on this page before this take, so 88 can be read as progress
   *  or a slip rather than a bare number with no reference point. */
  previousBest?: number | null;
  onRetry: () => void;
  onNext: () => void;
}

/** A sound the student did not actually produce correctly. Drives the score. */
function isFlagged(a: PhonemeAlignment): boolean {
  // vad_judgement deliberately excluded -- see route.ts's note on why
  // it's diagnostic-only for now, not wired into scoring yet.
  if (a.confidence_log < a.confidence_threshold) return true;
  // Madd, ghunnah and qalqalah length all count now, and this must match
  // route.ts's phonemeFailureReason exactly -- if the two disagree the ring
  // says one thing and the list below it says another.
  if (a.madd_judgement === 'too_short' || a.madd_judgement === 'too_long') return true;
  return a.tajweed_judgement === 'too_short' || a.tajweed_judgement === 'too_long';
}

/** Right sound, questionable length. Advice only -- never counted as an error. */

/** Was this a LENGTH failure or a SOUND failure? They need different advice:
 *  telling someone to move their tongue when the makhraj was already correct
 *  and the ghunnah was simply short sends them to practise the wrong thing. */
function isLengthFailure(a: PhonemeAlignment): boolean {
  return a.madd_judgement === 'too_short' || a.madd_judgement === 'too_long'
      || a.tajweed_judgement === 'too_short' || a.tajweed_judgement === 'too_long';
}

function PhonemeBreakdown({ alignment }: { alignment: PhonemeAlignment[] }) {
  if (!alignment || alignment.length === 0) return null;

  const wrong = alignment.filter(isFlagged).length;
  const correct = alignment.length - wrong;
  const total = alignment.length;

  return (
    <div className="grid grid-cols-3 gap-3 w-full text-center">
      {[
        { ar: 'صَحِيح', en: 'Correct', count: correct, color: 'text-[#2F6F5E] bg-[#2F6F5E]/10 border-[#2F6F5E]/20' },
        { ar: 'لَحْن', en: 'To fix', count: wrong, color: 'text-[#A63D3D] bg-[#A63D3D]/10 border-[#A63D3D]/20' },
        { ar: 'الْمَجْمُوع', en: 'Total', count: total, color: 'text-stone-600 bg-stone-50 border-stone-200' },
      ].map(({ ar, en, count, color }) => (
        <div key={en} className={`rounded-xl border px-2 py-2.5 ${color}`}>
          <div className="text-xl font-bold">{count}</div>
          <div className="text-[11px] font-bold leading-tight" style={{ fontFamily: "'Amiri Quran', 'Amiri', serif" }}>{ar}</div>
          <div className="text-[9px] uppercase tracking-widest font-bold opacity-70">{en}</div>
        </div>
      ))}
    </div>
  );
}

function MistakeKinds({ result }: { result: GradeResult }) {
  const kinds = [
    { n: result.tashkeelMistakes ?? 0, ar: 'التَّشْكِيل', en: 'tashkeel', hint: 'harakah or madd read differently from the text' },
    { n: result.makhrajMistakes ?? 0, ar: 'الْمَخَارِج', en: 'makhraj', hint: 'the letter formed in the wrong place' },
    { n: result.tajweedMistakes ?? 0, ar: 'التَّجْوِيد', en: 'ghunnah / qalqalah', hint: 'the rule not held for its measure' },
    { n: result.omittedWords?.length ?? 0, ar: 'كَلِمَات مَتْرُوكَة', en: 'skipped', hint: 'a word not recited at all' },
  ].filter((k) => k.n > 0);

  if (kinds.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {kinds.map((k) => (
        <span
          key={k.en}
          title={k.hint}
          className="inline-flex items-baseline gap-1.5 px-2.5 py-1 rounded-lg border border-[#A63D3D]/20 bg-[#A63D3D]/5"
        >
          <span className="text-sm font-bold text-[#A63D3D] tabular-nums">{k.n}</span>
          <span className="text-[11px]" dir="rtl" style={{ fontFamily: "'Amiri Quran', 'Amiri', serif" }}>{k.ar}</span>
          <span className="text-[10px] text-stone-500">{k.en}</span>
        </span>
      ))}
    </div>
  );
}

function getScoreLabel(score: number) {
  if (score === 100) return { label: 'Perfect!', icon: '🌟', color: 'text-[#2F6F5E]' };
  if (score >= 90) return { label: 'Excellent', icon: '✨', color: 'text-[#2F6F5E]' };
  if (score >= 75) return { label: 'Good', icon: '👍', color: 'text-[#8A7357]' };
  if (score >= 60) return { label: 'Keep Going', icon: '📖', color: 'text-[#8A7357]' };
  return { label: 'Needs Practice', icon: '🔄', color: 'text-[#A63D3D]' };
}

export function ScorePanel({ result, previousBest, onRetry, onNext }: Props) {
  const { label, icon, color } = getScoreLabel(result.score);

  return (
    <div className="flex flex-col gap-5 p-5 bg-white rounded-2xl border border-stone-200 shadow-sm">

      {/* Header */}
      <div className="flex items-center gap-4">
        <GeometricScoreStar score={result.score} size={112} />
        <div className="flex flex-col gap-1.5 flex-1">
          <span className={`text-lg font-bold ${color}`}>{icon} {label}</span>
          {typeof previousBest === 'number' && (
            <span className="text-xs font-semibold self-start">
              {result.score > previousBest ? (
                <span className="text-emerald-700">▲ {result.score - previousBest} better than your best ({previousBest})</span>
              ) : result.score === previousBest ? (
                <span className="text-stone-500">Matches your best ({previousBest})</span>
              ) : (
                <span className="text-stone-500">Your best here is {previousBest}</span>
              )}
            </span>
          )}
          <span className="text-xs text-stone-500 font-mono bg-stone-100 px-2 py-1 rounded-md self-start">{result.ayahRange}</span>
          {result.transcript && (
            <span
              className="mt-1 block text-right text-base leading-relaxed text-stone-600 border-r-2 border-stone-200 pr-2 line-clamp-2"
              dir="rtl"
              style={{ fontFamily: "'Amiri Quran', 'Amiri', serif" }}
              title={result.transcript}
            >
              {result.transcript}
            </span>
          )}
        </div>
      </div>

      {/* Phoneme breakdown */}
      {result.alignment && <PhonemeBreakdown alignment={result.alignment} />}

      {/* What kind of mistakes, not just how many. The counts were already
          being computed and returned by the API and nothing rendered them, so
          "3 to fix" gave a student no idea which of three quite different
          things to go and practise. */}
      <MistakeKinds result={result} />

      {/* Teacher feedback */}
      {result.tajweedFeedback && (
        <div className="bg-[#004D4A]/10 border border-[#004D4A]/30 rounded-xl p-3.5 text-sm text-[#004D4A] leading-relaxed">
          <div className="flex items-center gap-1.5 mb-2">
            <span>🎓</span>
            <span className="font-bold text-xs uppercase tracking-wider text-[#004D4A]">
              <span className="text-sm normal-case" style={{ fontFamily: "'Amiri Quran', 'Amiri', serif" }}>مُلَاحَظَة</span>
              <span className="ml-2">Teacher&apos;s note</span>
            </span>
          </div>
          <p>{result.tajweedFeedback}</p>
        </div>
      )}

      {/* Skipped words. Listed FIRST and in its own colour because leaving a
          word out is a different order of mistake from mispronouncing one --
          and until now nothing in the lab told a student it had happened. */}
      {result.omittedWords && result.omittedWords.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-stone-500">
            <span className="text-sm" style={{ fontFamily: "'Amiri Quran', 'Amiri', serif" }}>كَلِمَات مَتْرُوكَة</span>
            <span className="uppercase tracking-wide ml-2">Words left out</span>
          </p>
          <div className="rounded-xl border border-[#A63D3D]/30 bg-[#A63D3D]/5 px-3 py-2.5">
            <div className="flex flex-wrap gap-2 justify-end" dir="rtl">
              {result.omittedWords.map((w) => (
                <span
                  key={w.index}
                  className="px-2.5 py-1 rounded-lg bg-white border border-[#A63D3D]/30 text-[#A63D3D] text-base"
                  style={{ fontFamily: "'Amiri Quran', 'Amiri', serif" }}
                >
                  {w.word}
                </span>
              ))}
            </div>
            <p className="m-0 mt-2 text-[11px] text-stone-600 leading-snug">
              {result.omittedWords.length === 1
                ? 'This word was not heard in your recitation.'
                : `These ${result.omittedWords.length} words were not heard in your recitation.`}{' '}
              Listen to the reference, then recite the passage again without stopping.
            </p>
          </div>
        </div>
      )}

      {/* Error phoneme list */}
      {result.alignment && result.alignment.filter(isFlagged).length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-stone-500">
            {/* Was الْمَخَارِج, which stopped being true when madd and ghunnah
                joined this list -- most of these rows are not makhraj at all. */}
            <span className="text-sm" style={{ fontFamily: "'Amiri Quran', 'Amiri', serif" }}>مَوَاضِع اللَّحْن</span>
            <span className="uppercase tracking-wide ml-2">What to correct</span>
          </p>
          {/* Left-to-right: these are IPA symbols, and the confidence figure that
              used to sit here rendered as "5.7-" inside an RTL run. It is also a
              raw log-probability -- meaningless to a student -- so the makhraj
              (where the sound is made) is the useful hint instead. */}
          {/* One row per flagged sound: the Arabic letter, and how to produce
              it. A red dot and a transliterated makhraj name was not something a
              student could act on. Everything shown is derived from the EXPECTED
              sound, so it is reference data rather than a guess about what they
              actually said -- see lib/phonemeGuide.ts for why that distinction
              matters here. */}
          <ul className="space-y-1.5">
            {result.alignment.filter(isFlagged).map((a, i) => {
              const guide = guideFor(a.phoneme);

              // Length failures get the rule and its measure, not a makhraj
              // instruction. This branch used to live in a separate "advice"
              // section below; once length started counting toward the score,
              // isFlagged caught these first and that section became
              // unreachable, so the useful wording stopped appearing at all.
              if (isLengthFailure(a)) {
                const madd = maddName(a.madd_class);
                const rule = ruleName(a.tajweed_rule);
                const isMadd = a.madd_judgement === 'too_short' || a.madd_judgement === 'too_long';
                const tooLong = (isMadd ? a.madd_judgement : a.tajweed_judgement) === 'too_long';
                const term = isMadd ? madd : rule;
                return (
                  <li key={i} className="rounded-xl border border-[#A63D3D]/20 bg-[#A63D3D]/5 px-3 py-2">
                    <p className="m-0 text-xs font-bold text-[#A63D3D] flex flex-wrap items-baseline gap-x-2">
                      {a.word && (
                        <span className="text-sm text-stone-700" style={{ fontFamily: "'Amiri Quran', 'Amiri', serif" }} dir="rtl">
                          {a.word}
                        </span>
                      )}
                      {guide?.letter && (
                        <span className="text-sm" style={{ fontFamily: "'Amiri Quran', 'Amiri', serif" }}>{guide.letter}</span>
                      )}
                      {term && (
                        <span className="text-[11px] font-normal" dir="rtl" style={{ fontFamily: "'Amiri Quran', 'Amiri', serif" }}>{term.ar}</span>
                      )}
                      {term && <span className="text-[10px] font-normal opacity-70">{term.en}</span>}
                    </p>
                    <p className="m-0 mt-0.5 text-[11px] text-stone-600 leading-snug">
                      {tooLong ? 'You held this longer than its measure. ' : 'You cut this shorter than its measure. '}
                      {isMadd && madd
                        ? `A ${madd.en} is ${madd.counts} — keep every one of them the same length.`
                        : rule
                        ? `For ${rule.en}, ${rule.hold}.`
                        : 'Match the length you hear in the reference recitation.'}
                    </p>
                  </li>
                );
              }

              return (
                <li
                  key={i}
                  className="flex items-start gap-2.5 rounded-xl border border-[#A63D3D]/20 bg-[#A63D3D]/5 px-3 py-2"
                >
                  <span
                    className="shrink-0 mt-0.5 text-lg leading-none text-[#A63D3D]"
                    style={{ fontFamily: "'Amiri Quran', 'Amiri', serif" }}
                    aria-hidden
                  >
                    {guide?.letter ?? a.phoneme}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#A63D3D] m-0 flex flex-wrap items-baseline gap-x-2">
                      {a.word && (
                        <span className="text-sm text-stone-700" style={{ fontFamily: "'Amiri Quran', 'Amiri', serif" }} dir="rtl">
                          {a.word}
                        </span>
                      )}
                      {guide?.makhrajAr && (
                        <span className="text-[11px] font-normal text-stone-500" dir="rtl" style={{ fontFamily: "'Amiri Quran', 'Amiri', serif" }}>
                          {guide.makhrajAr}
                        </span>
                      )}
                      {guide?.makhraj && (
                        <span className="text-[10px] font-normal text-stone-400">{guide.makhraj}</span>
                      )}
                    </p>
                    <p className="text-[11px] text-stone-600 m-0 mt-0.5 leading-snug">
                      {guide?.how ?? 'Listen to the reference recitation and compare it with your own.'}
                    </p>
                    {guide?.watchFor && (
                      <p className="text-[11px] text-[#A63D3D]/80 m-0 mt-1 leading-snug">
                        <span className="font-semibold">Common slip:</span> {guide.watchFor}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onRetry}
          className="flex-1 py-3 rounded-xl border-2 border-stone-200 text-stone-600 text-sm font-bold hover:bg-stone-50 hover:border-stone-300 active:scale-95 transition-all"
        >
          🔄 Retry Ayah
        </button>
        <button
          onClick={onNext}
          className="flex-1 py-3 rounded-xl bg-gradient-to-br from-[#004D4A] to-[#166B67] shadow-[0_4px_15px_rgba(0,77,74,0.3)] text-white text-sm font-bold hover:shadow-[0_8px_25px_rgba(0,77,74,0.4)] active:scale-95 transition-all"
        >
          Next Ayah →
        </button>
      </div>
    </div>
  );
}
