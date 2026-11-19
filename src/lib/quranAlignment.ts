// ─────────────────────────────────────────────
// src/lib/quranAlignment.ts
// Word-level sequence alignment for Quran recitation scoring.
// Replaces naive `diffWords` (space-split comparison) with a proper
// edit-distance alignment (Needleman-Wunsch), so mismatches are
// classified as substitution / omission / insertion rather than
// just "wrong at position N" — which breaks the moment the student
// skips, repeats, or the ASR merges/splits a word.
//
// Intended to sit alongside your existing normalizeArabic() —
// this module assumes it receives ALREADY-NORMALIZED word arrays.
// ─────────────────────────────────────────────

export type WordStatus = 'correct' | 'substitution' | 'omission' | 'insertion';

export interface AlignedWord {
  status: WordStatus;
  /** Word from the canonical (mushaf) text. Null if this was an insertion. */
  expected: string | null;
  /** Word from the student's transcript. Null if this was an omission. */
  actual: string | null;
  /** Index into the canonical word array, for highlighting the right word in QuranPage.tsx */
  canonicalIndex: number | null;
}

export interface AlignmentResult {
  aligned: AlignedWord[];
  correctCount: number;
  substitutionCount: number;
  omissionCount: number;
  insertionCount: number;
  totalCanonicalWords: number;
  /** 0-100 score. Insertions penalize lightly; omissions/substitutions penalize fully. */
  accuracy: number;
}

const MATCH_SCORE = 2;
const MISMATCH_PENALTY = -1;
const GAP_PENALTY = -1;

/**
 * Needleman-Wunsch global alignment between the canonical (expected) words
 * and the transcribed (actual) words. Runs in O(m*n) time/space — for a
 * single Quran page (~15-20 words per line, ~15 lines ≈ 200-300 words max
 * per attempt) this is instant. If you ever align multi-page sessions,
 * consider banded alignment (Ukkonen) to bound the cost.
 */
export function alignWords(
  canonicalWords: string[],
  transcribedWords: string[]
): AlignmentResult {
  const m = canonicalWords.length;
  const n = transcribedWords.length;

  // dp[i][j] = best alignment score between canonical[0..i) and transcribed[0..j)
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i * GAP_PENALTY;
  for (let j = 0; j <= n; j++) dp[0][j] = j * GAP_PENALTY;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const match = canonicalWords[i - 1] === transcribedWords[j - 1];
      const diagonal = dp[i - 1][j - 1] + (match ? MATCH_SCORE : MISMATCH_PENALTY);
      const up = dp[i - 1][j] + GAP_PENALTY;   // omission (canonical word not recited)
      const left = dp[i][j - 1] + GAP_PENALTY; // insertion (extra word recited)
      dp[i][j] = Math.max(diagonal, up, left);
    }
  }

  // Traceback
  const aligned: AlignedWord[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const match = canonicalWords[i - 1] === transcribedWords[j - 1];
      const diagonalScore = dp[i - 1][j - 1] + (match ? MATCH_SCORE : MISMATCH_PENALTY);
      if (dp[i][j] === diagonalScore) {
        aligned.unshift({
          status: match ? 'correct' : 'substitution',
          expected: canonicalWords[i - 1],
          actual: transcribedWords[j - 1],
          canonicalIndex: i - 1,
        });
        i--; j--;
        continue;
      }
    }
    if (i > 0 && dp[i][j] === dp[i - 1][j] + GAP_PENALTY) {
      aligned.unshift({
        status: 'omission',
        expected: canonicalWords[i - 1],
        actual: null,
        canonicalIndex: i - 1,
      });
      i--;
      continue;
    }
    // insertion
    aligned.unshift({
      status: 'insertion',
      expected: null,
      actual: transcribedWords[j - 1],
      canonicalIndex: null,
    });
    j--;
  }

  const correctCount = aligned.filter((w) => w.status === 'correct').length;
  const substitutionCount = aligned.filter((w) => w.status === 'substitution').length;
  const omissionCount = aligned.filter((w) => w.status === 'omission').length;
  const insertionCount = aligned.filter((w) => w.status === 'insertion').length;

  // Score against the canonical word count (insertions don't inflate the
  // denominator — reciting extra words shouldn't help your score, but we
  // still surface them for feedback).
  const totalCanonicalWords = m;
  const accuracy =
    totalCanonicalWords === 0
      ? 0
      : Math.round((correctCount / totalCanonicalWords) * 100);

  return {
    aligned,
    correctCount,
    substitutionCount,
    omissionCount,
    insertionCount,
    totalCanonicalWords,
    accuracy,
  };
}

/**
 * Convenience wrapper: takes raw (already-normalized) strings, splits on
 * whitespace, and returns the alignment. Use this from hifz-review/route.ts
 * in place of your current diffWords + calculateAccuracy call.
 */
export function alignRecitation(canonicalText: string, transcribedText: string): AlignmentResult {
  const canonicalWords = canonicalText.trim().split(/\s+/).filter(Boolean);
  const transcribedWords = transcribedText.trim().split(/\s+/).filter(Boolean);
  return alignWords(canonicalWords, transcribedWords);
}
