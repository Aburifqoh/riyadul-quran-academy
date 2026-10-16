// ─────────────────────────────────────────────
// lib/arabicUtils.ts
// Arabic text normalization + diff engine for Hifz Lab
// ─────────────────────────────────────────────

export function normalizeArabic(text: string): string {
  return text
    .replace(/[۝ۖۗۘۙۚۛ\u06D6-\u06DC\u06DF-\u06E4\u06EA-\u06ED]/g, '') // ayah markers
    .replace(/[\u064B-\u065F\u0670]/g, '')   // harakat
    .replace(/\u0640/g, '')                   // tatweel
    .replace(/\u06E2/g, '')                   // uthmani small ya on ha
    .replace(/\u0671/g, 'ا')                  // alef wasla → alef
    .replace(/[أإآ]/g, 'ا')                   // variant alefs
    .replace(/ة/g, 'ه')                        // ta marbuta → ha
    .replace(/ى/g, 'ي')                        // alef maqsura → ya
    .replace(/[ءٕٔ]/g, '')                     // standalone/attached hamzas
    .replace(/ؤ/g, 'و')                        // hamza on waw
    .replace(/ئ/g, 'ي')                        // hamza on ya
    .trim();
}

export function stripPreamble(text: string): string {
  const norm = normalizeArabic(text);
  const terms = [
    'اعوذ بالله من الشيطان الرجيم',
    'بسم الله الرحمن الرحيم'
  ];
  let result = norm;
  for (const term of terms) {
    if (result.startsWith(term)) {
      result = result.substring(term.length).trim();
    }
  }
  return result;
}

export interface WordResult {
  word: string;           // Original Uthmani word
  normalized: string;     // Normalized form for diffing
  status: 'correct' | 'wrong' | 'missing';
  spokenAs?: string;      // What Whisper heard instead
}

/**
 * Advanced Arabic string differ designed specifically for Quran recitation.
 * Takes the raw Reference Words array to guarantee exact mapping back to the UI.
 */
export function diffWords(referenceWordsRaw: string[], transcriptString: string): WordResult[] {
  const reference = referenceWordsRaw.map(word => ({
    raw: word,
    norm: normalizeArabic(word),
  }));

  const spoken = splitMergedWords(
    stripPreamble(transcriptString)
  ).map(normalizeArabic);

  const results: WordResult[] = [];
  let i = 0; // index in reference
  let j = 0; // index in spoken

  while (i < reference.length) {
    const refWord = reference[i];

    if (j >= spoken.length) {
      // Reached end of audio, rest is missing
      results.push({
        word: refWord.raw,
        normalized: refWord.norm,
        status: 'missing'
      });
      i++;
      continue;
    }

    const spkWord = spoken[j];

    // 1. Exact match
    if (refWord.norm === spkWord) {
      results.push({
        word: refWord.raw,
        normalized: refWord.norm,
        status: 'correct'
      });
      i++;
      j++;
      continue;
    }

    // 2. Look ahead in spoken (did they insert an extra word?)
    let foundInSpoken = false;
    for (let k = 1; k <= 3 && j + k < spoken.length; k++) {
      if (refWord.norm === spoken[j + k]) {
        foundInSpoken = true;
        j = j + k; // skip the extra spoken words
        break;
      }
    }
    if (foundInSpoken) {
      results.push({
        word: refWord.raw,
        normalized: refWord.norm,
        status: 'correct'
      });
      i++;
      j++;
      continue;
    }

    // 3. Look ahead in reference (did they skip a word?)
    let foundInRef = false;
    for (let k = 1; k <= 3 && i + k < reference.length; k++) {
      if (reference[i + k].norm === spkWord) {
        foundInRef = true;
        // Mark skipped words as missing
        for (let m = 0; m < k; m++) {
          results.push({
            word: reference[i + m].raw,
            normalized: reference[i + m].norm,
            status: 'missing'
          });
        }
        i = i + k;
        break;
      }
    }
    if (foundInRef) {
      results.push({
        word: reference[i].raw,
        normalized: reference[i].norm,
        status: 'correct'
      });
      i++;
      j++;
      continue;
    }

    // 4. Substitution (Wrong word)
    results.push({
      word: refWord.raw,
      normalized: refWord.norm,
      status: 'wrong',
      spokenAs: spkWord
    });
    i++;
    j++;
  }

  return results;
}

/**
 * Whisper often merges small Arabic words (e.g. "فما" instead of "ف ما").
 * This function attempts to split known prefixes if they cause mismatches.
 */
export function splitMergedWords(text: string): string[] {
  // A simplistic version: just split by space.
  // In a production app, you might use a dictionary to detect merged "wa", "fa", "bi", etc.
  return text.split(/\s+/).filter(Boolean);
}

export function calculateAccuracy(diff: WordResult[]): number {
  if (diff.length === 0) return 0;
  const correct = diff.filter(d => d.status === 'correct').length;
  return Math.round((correct / diff.length) * 100);
}
