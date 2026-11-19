// ─────────────────────────────────────────────
// src/lib/arabicCompare.ts
// Comparing what a student actually said against what they were meant to say.
//
// Forced alignment cannot answer "did you skip a word". It is *forced*: every
// expected phoneme is assigned to some frame of audio whether or not it was
// spoken, so a skipped word gets silently smeared onto its neighbours and comes
// back looking merely mediocre rather than missing. Whisper's open transcript
// is the only signal that knows a word is absent, so omissions are detected by
// diffing it against the reference.
//
// The normalisation MUST match hifz-api/alignment.py's normalize_arabic. The two
// texts are written in different orthographies -- the app sends Uthmani, Whisper
// emits modern imlaa'i -- and mismatching the folding here would report every
// article-bearing word as skipped. See the comment in that file for the full
// account of what that cost.
// ─────────────────────────────────────────────

const DIACRITICS =
  /[ؐ-ًؚ-ٰٟۖ-ۭ࣓-ࣿـ]/g;
const ALEF_FORMS = /[آأإٱٲٳٵ]/g;
const YEH_FORMS = /[ئىی]/g;

/** Fold an Arabic string to its bare consonantal skeleton for comparison. */
export function normalizeArabic(text: string): string {
  return text
    .normalize('NFC')
    .replace(DIACRITICS, '')
    .replace(ALEF_FORMS, 'ا')
    .replace(/ؤ/g, 'و') // waw hamza -> waw
    .replace(YEH_FORMS, 'ي') // maqsura, yeh hamza, farsi yeh -> yeh
    .replace(/ة/g, 'ه') // ta marbuta -> ha
    .replace(/ء/g, '') // bare hamza is orthographic here
    .replace(/ا/g, '') // long /aa/: written in imlaa'i, a dagger in Uthmani
    .replace(/\s+/g, ' ')
    .trim();
}

/** Longest common subsequence over two token lists, as index pairs. */
function lcsPairs(a: string[], b: string[]): [number, number][] {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const pairs: [number, number][] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      pairs.push([i, j]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }
  return pairs;
}

/**
 * Indices of expected words with no counterpart in the transcript.
 *
 * Deliberately conservative. Whisper is genuinely noisy on recited Arabic --
 * it hears الحند for الحمد -- so a word marked missing here is a claim that
 * could be wrong about a student who recited correctly, which is the one kind
 * of mistake worth avoiding most. Two guards:
 *
 *   - a word is only reported missing if NOTHING resembling it survives the
 *     diff, and short words (<= 2 letters after folding) are never reported,
 *     since they are the ones a transcript most often swallows into a neighbour
 *   - if the transcript is badly degraded overall, nothing is reported at all:
 *     a transcript that lost a third of its words is evidence about Whisper,
 *     not about the student
 */
export function findOmittedWords(expectedWords: string[], transcript: string): number[] {
  const exp = expectedWords.map(normalizeArabic).filter(() => true);
  const heard = normalizeArabic(transcript).split(' ').filter(Boolean);
  if (heard.length === 0 || exp.length === 0) return [];

  const matched = new Set(lcsPairs(exp, heard).map(([i]) => i));

  // If a large share went unmatched the transcript is unreliable as a whole,
  // and naming individual words would be inventing detail it cannot support.
  const unmatchedRatio = 1 - matched.size / exp.length;
  if (unmatchedRatio > 0.35) return [];

  const omitted: number[] = [];
  for (let i = 0; i < exp.length; i++) {
    if (matched.has(i)) continue;
    if (exp[i].length <= 2) continue; // too short to distinguish from a slur
    // A near-match anywhere in the transcript means it was said, just heard
    // imperfectly -- not skipped.
    if (heard.some((h) => similar(h, exp[i]))) continue;
    omitted.push(i);
  }
  return omitted;
}

/** True when two folded words differ by at most one edit -- a mishearing. */
function similar(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  const [s, t] = a.length <= b.length ? [a, b] : [b, a];
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < s.length && j < t.length) {
    if (s[i] === t[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (s.length === t.length) {
      i++;
      j++;
    } else {
      j++;
    }
  }
  return edits + (t.length - j) + (s.length - i) <= 1;
}
