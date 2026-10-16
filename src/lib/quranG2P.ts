// ─────────────────────────────────────────────
// src/lib/quranG2P.ts
// Phase 0: Quranic grapheme-to-phoneme engine.
//
// Converts fully-diacritized (Uthmani) Quran text into a sequence of
// PhonemeUnit objects — the "expected" phoneme sequence that Phase 1's
// forced-alignment step will compare recorded audio against, and that
// Phase 2's tajweed heuristics (madd duration, qalqalah, ghunnah) will
// check timing/spectral features against.
//
// SCOPE / HONESTY NOTE (updated 2026-09-06): covers noon-sakinah/tanwin
// (izhar/idgham/iqlab/ikhfa), meem-sakinah (the "shafawi" labial
// counterparts), qalqalah, madd detection, shadda, and laam-of-Allah /
// raa tafkhim-tarqiq CLASSIFICATION. Both sound-changes are real, not just
// labels: iqlab substitutes the 'm', and idgham deletes the noon/tanwin/meem
// and geminates the consonant it merges into (with izhar mutlaq correctly
// excluded, since idgham needs a word boundary).
//
// Two things this does NOT do, on purpose, not by oversight:
// 1. Tafkhim/tarqiq (laam of Allah, raa) are classified correctly but NOT
//    acoustically verified. The acoustic model behind this pipeline has
//    exactly one phoneme token for "l" and one for "r" -- no
//    velarized/heavy variant -- confirmed directly against its vocab.
//    A follow-up attempt at a formant-based (F2) acoustic check gave a
//    genuine NEGATIVE result on real audio (see hifz-api/calibration/
//    formant_experiment.py) -- not silently assumed to work.
// 2. Waqf is applied at the END of the text (opt in with { waqf: true }),
//    which is the only place it is unambiguous -- Hifz Lab records one ayah
//    per take, so the reciter always stops there. Pause marks MID-ayah are
//    still not covered: those need reliable pause-boundary detection, and
//    this project's own VAD experiment (see hifz-api/CALIBRATION.md) found
//    real false-positive issues on a known-correct clip.
//
// Also not covered: hamzat al-wasl edge cases, waqf marks in the MIDDLE of an
// ayah (only the stop at the end of the recording is handled, which is what
// Hifz Lab actually records), and a handful of orthographically-irregular
// words. Treat this as the v1 ruleset --
// extend it as you hit real mismatches against known-correct reference
// recitations, the same way every rule above was found and fixed: by
// testing against real verses, not just reading the theory.
// ─────────────────────────────────────────────

export type TajweedRule =
  | 'izhar'          // clear pronunciation of noon sakinah/tanwin
  | 'idgham_ghunnah' // merges with nasalization (ي ن م و)
  | 'idgham_no_ghunnah' // merges without nasalization (ل ر)
  | 'iqlab'          // noon sakinah/tanwin -> m sound before ب
  | 'ikhfa'          // partial merge, nasalized, before remaining 15 letters
  | 'qalqalah'       // "bounce" on ق ط ب ج د when sakinah
  | 'ikhfa_shafawi'   // meem sakinah before ب — nasalized "labial concealment", ~2-count ghunnah
  | 'idgham_shafawi'  // meem sakinah before another م — merges with ghunnah
  | 'izhar_shafawi'   // meem sakinah before any of the other 26 letters — clear, no ghunnah
  | 'tafkhim'        // heavy/velarized articulation (lam of Allah after fatha/damma; raa per its own rules)
  | 'tarqiq'         // light/plain articulation (lam of Allah after kasra; raa per its own rules)
  | null;

export type MaddClass =
  | 'natural'   // 2 counts, standard madd letter with no following hamza/sukun
  | 'required4' // 4-6 counts, madd letter followed by hamza in the same word
  | 'required6' // 6 counts, madd + shadda (madd lazim)
  | 'aarid'     // madd 'aarid lis-sukoon: long vowel before the letter you stop on.
                // 2, 4 or 6 counts are ALL correct, so its duration window is
                // deliberately the widest of any madd class.
  | null;

export interface PhonemeUnit {
  /** Source Arabic character this phoneme derives from */
  char: string;
  /** Approximate IPA phoneme label */
  phoneme: string;
  /** Index into the original (stripped) character string, for UI mapping back to the word/letter being highlighted */
  sourceIndex: number;
  /** Is this unit a vowel (short or long)? */
  isVowel: boolean;
  /** Madd (elongation) classification, if this is a long vowel */
  madd: MaddClass;
  /** Tajweed rule applying to this unit, if any */
  tajweedRule: TajweedRule;
  /** True if this consonant is geminated (shadda) — held twice as long */
  geminated: boolean;
}

// ── Unicode diacritic points ──────────────────────────────────
const FATHA = '\u064E';
const DAMMA = '\u064F';
const KASRA = '\u0650';
const SUKUN = '\u0652';
const SUKUN_ALT = '\u06E1'; // ARABIC SMALL HIGH ROUNDED ZERO — used as sukun in Tanzil-derived Uthmani text; same meaning as U+0652, sources vary in which they use.
const SHADDA = '\u0651';
const FATHATAN = '\u064B';
const DAMMATAN = '\u064C';
const KASRATAN = '\u064D';
const DAGGER_ALEF = '\u0670';
// ARABIC MADDAH ABOVE. In the Uthmani mushaf this sits over a madd letter to
// mark an elongation longer than the natural two counts -- muttasil, munfasil
// and every kind of laazim carry it. It was in none of the skip sets, so it
// was left sitting in the character stream directly after the madd letter,
// which is precisely where the old classifier looked for a following hamza.
// That is why `required4` almost never fired.
const MADDAH = '\u0653';
const TATWEEL = '\u0640';
const ALEF_WASLA = '\u0671'; // ٱ — hamzat al-wasl. Elided/silent in connected recitation (the normal case within a Hifz session); only pronounced as a helping vowel when starting recitation from that exact word. Treated as silent here.

// Small Quranic annotation marks (waqf/pause signs, and the tiny meem/noon
// shapes some Tanzil-derived Uthmani text uses to visually flag iqlab/ikhfa
// in-line, e.g. \u06E2 above a noon before ب for iqlab) -- carry no phonetic
// value themselves. Found via a direct bug: without skipping these, the
// small-meem iqlab mark on "مِنۢ بَعْدِ" (2:27) got treated as if IT were
// the next consonant during noon-sakinah classification, breaking iqlab
// detection outright (fell through to the 'ikhfa' catch-all instead).
const QURANIC_ANNOTATION_MARKS = /[\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/;
function isQuranicAnnotationMark(ch: string): boolean {
  return QURANIC_ANNOTATION_MARKS.test(ch);
}

const HARAKAT = new Set([FATHA, DAMMA, KASRA, SUKUN, SUKUN_ALT, FATHATAN, DAMMATAN, KASRATAN]);
const SUKUN_MARKS = new Set([SUKUN, SUKUN_ALT]);
const TANWIN = new Set([FATHATAN, DAMMATAN, KASRATAN]);

// ── Base consonant phoneme table (simplified IPA) ─────────────
const CONSONANT_PHONEME: Record<string, string> = {
  '\u0628': 'b',   // ب
  '\u062A': 't',   // ت
  '\u062B': 'θ',   // ث
  '\u062C': 'dʒ',  // ج
  '\u062D': 'ħ',   // ح
  '\u062E': 'x',   // خ
  '\u062F': 'd',   // د
  '\u0630': 'ð',   // ذ
  '\u0631': 'r',   // ر
  '\u0632': 'z',   // ز
  '\u0633': 's',   // س
  '\u0634': 'ʃ',   // ش
  '\u0635': 'sˤ',  // ص
  '\u0636': 'dˤ',  // ض
  '\u0637': 'tˤ',  // ط
  '\u0638': 'ðˤ',  // ظ
  '\u0639': 'ʕ',   // ع
  '\u063A': 'ɣ',   // غ
  '\u0641': 'f',   // ف
  '\u0642': 'q',   // ق
  '\u0643': 'k',   // ك
  '\u0644': 'l',   // ل
  '\u0645': 'm',   // م
  '\u0646': 'n',   // ن
  '\u0647': 'h',   // ه
  '\u0621': 'ʔ',   // ء
  '\u0623': 'ʔ',   // أ
  '\u0625': 'ʔ',   // إ
  '\u0624': 'ʔ',   // ؤ
  '\u0626': 'ʔ',   // ئ
  '\u0648': 'w',   // و — consonant/diphthong-glide form (overridden by madd handling when it lengthens a preceding damma)
  '\u064A': 'j',   // ي — consonant/diphthong-glide form (overridden by madd handling when it lengthens a preceding kasra)
  // \u0629 -- the continuing form. applyWaqf swaps it to 'h' when you stop
  // on it. It was missing from this table entirely, so all 2,344 of its
  // occurrences produced no phoneme at all -- and took their harakah with them.
  '\u0629': 't',
};

const SUN_LETTERS = new Set([
  '\u062A', '\u062B', '\u062F', '\u0630', '\u0631', '\u0632', '\u0633',
  '\u0634', '\u0635', '\u0636', '\u0637', '\u0638', '\u0644', '\u0646',
]); // ت ث د ذ ر ز س ش ص ض ط ظ ل ن

const QALQALAH_LETTERS = new Set(['\u0642', '\u0637', '\u0628', '\u062C', '\u062F']); // ق ط ب ج د

// Noon sakinah / tanwin classification by the FOLLOWING letter
const IZHAR_LETTERS = new Set(['\u0621', '\u0623', '\u0625', '\u0647', '\u0639', '\u062D', '\u063A', '\u062E']); // ء أ إ ه ع ح غ خ
const IDGHAM_GHUNNAH_LETTERS = new Set(['\u064A', '\u0646', '\u0645', '\u0648']); // ي ن م و
const IDGHAM_NO_GHUNNAH_LETTERS = new Set(['\u0644', '\u0631']); // ل ر
const IQLAB_LETTER = '\u0628'; // ب

// Meem sakinah classification by the FOLLOWING letter (ikhfa shafawi /
// idgham shafawi / izhar shafawi -- the "labial" counterparts of the noon
// sakinah rules above, since م and ب share the same place of articulation).
const MEEM = '\u0645';
const IKHFA_SHAFAWI_LETTER = '\u0628'; // ب

const WAW = '\u0648';
const YA = '\u064A';
const ALEF = '\u0627';
const LAM = '\u0644';
const RAA = '\u0631';
const ALEF_MAQSURA = '\u0649'; // alef maqsura -- always a long vowel in Uthmani text, never a consonant
const TA_MARBUTA = '\u0629';   // ta marbuta -- 't' when the word continues, 'h' when you stop on it

// Raa tafkhim (heavy) override set: letters that, when they immediately
// follow a sakinah raa preceded by kasra, still force tafkhim rather than
// the tarqiq the kasra would otherwise give (e.g. قِرْطَاٍ). These are the
// remaining emphatic/uvular consonants (ص ض ط ظ ق خ غ --
// see QALQALAH_LETTERS and CONSONANT_PHONEME's sˤ/dˤ/tˤ/ðˤ/q/x/ɣ entries).
const RAA_TAFKHIM_OVERRIDE_LETTERS = new Set([
  '\u0635', '\u0636', '\u0637', '\u0638', '\u0642', '\u062E', '\u063A',
]); // ص ض ط ظ ق خ غ

function isHarakah(ch: string): boolean {
  return HARAKAT.has(ch);
}

/**
 * Collects up to `count` CONSONANT-only characters (skipping any harakat /
 * shadda / dagger-alef between them) ending at and including chars[endIndex],
 * in left-to-right order. Used to detect fixed consonant patterns (like the
 * doubled lam of لفظ الجلالة, "الله") regardless of exactly which
 * harakat happen to sit between them in the source text.
 */
function precedingConsonantSkeleton(chars: string[], endIndex: number, count: number): string[] {
  const result: string[] = [];
  let idx = endIndex;
  while (idx >= 0 && result.length < count) {
    const c = chars[idx];
    if (!isHarakah(c) && c !== SHADDA && c !== DAGGER_ALEF) {
      result.unshift(c);
    }
    idx--;
  }
  return result;
}

/**
 * Scans forward from `startIdx` to find the true next CONSONANT SOUND, for
 * classifying noon-sakinah/tanwin/meem-sakinah rules and the raa tafkhim
 * override. Handles two real cases the naive "skip whitespace/harakat"
 * loop got wrong (confirmed by direct testing against real verses):
 *
 * 1. The silent bearer alef Uthmani orthography adds after word-final
 *    tanwin fatha (e.g. the ا in "...ًا", as in 2:10's "مَرَضًا") carries no
 *    sound -- without skipping it, it gets treated as if it were the next
 *    consonant, and classification falls through to the wrong default for
 *    essentially every tanwin-fatha word.
 * 2. A following word starting with alef-wasla (silent, e.g. "ٱلرَّحْمَـٰنِ")
 *    is extremely common (the definite article "ال" alone). Skip past it to
 *    the real first sound -- and if that's a lam followed by a shadda'd sun
 *    letter (the same assimilation pattern handled elsewhere in this file),
 *    skip the silent lam too and land on the sun letter itself, matching
 *    what's actually audible (e.g. "مِن" + "الشَّمْسِ" -> heard as "min-ash-
 *    shams", so the sun letter ش is the real next consonant, not ل).
 */
function skipToNextConsonant(chars: string[], startIdx: number): string | null {
  const isSkippable = (c: string) => c === ' ' || isHarakah(c) || c === SHADDA || c === DAGGER_ALEF || c === ALEF || isQuranicAnnotationMark(c);
  let idx = startIdx;
  while (idx < chars.length && isSkippable(chars[idx])) idx++;
  if (idx >= chars.length) return null;

  if (chars[idx] === ALEF_WASLA) {
    idx++;
    while (idx < chars.length && isSkippable(chars[idx])) idx++;
    if (idx >= chars.length) return null;
    if (chars[idx] === LAM) {
      let lb = idx + 1;
      let nextHasShadda = false;
      while (lb < chars.length && (isHarakah(chars[lb]) || chars[lb] === SHADDA)) {
        if (chars[lb] === SHADDA) nextHasShadda = true;
        lb++;
      }
      const letterAfterLam = chars[lb] ?? null;
      if (nextHasShadda && letterAfterLam && SUN_LETTERS.has(letterAfterLam)) {
        return letterAfterLam; // lam silent -- the sun letter is the real next consonant
      }
    }
  }
  return chars[idx];
}

/**
 * True when the next consonant sound after `startIdx` lies in the SAME word.
 * Idgham only operates across a word boundary: a noon sakinah followed by an
 * idgham letter inside one word -- which in the Quran means only دنيا، بنيان،
 * صنوان، قنوان -- is izhar mutlaq, pronounced clearly and never merged.
 * "الدنيا" alone makes this worth handling: it was previously classified as
 * idgham_ghunnah, which was harmless while idgham was only a label but wrong
 * the moment the merge below starts deleting the noon.
 */
function nextConsonantIsSameWord(chars: string[], startIdx: number): boolean {
  for (let idx = startIdx; idx < chars.length; idx++) {
    const c = chars[idx];
    if (c === ' ') return false;
    if (isHarakah(c) || c === SHADDA || c === DAGGER_ALEF || c === ALEF || isQuranicAnnotationMark(c)) continue;
    return true;
  }
  return false; // ran off the end -- no next consonant at all
}

/**
 * Walks backward through already-emitted units to find the phoneme of the
 * most recent VOWEL, skipping any interstitial non-vowel units (e.g. a
 * tanwin's nasal 'n' unit that's about to merge into a following word via
 * idgham -- the true "preceding vowel" for lam-of-Allah/raa tafkhim-tarqiq
 * purposes is the vowel before that nasal, not the nasal itself). Returns
 * null if there's no preceding vowel at all (start of recitation).
 */
function lastVowelPhoneme(units: PhonemeUnit[]): string | null {
  for (let k = units.length - 1; k >= 0; k--) {
    if (units[k].isVowel) return units[k].phoneme.replace('ː', '');
  }
  return null;
}

function classifyNoonSakinahOrTanwin(nextConsonant: string | null): TajweedRule {
  if (!nextConsonant) return 'izhar';
  if (IZHAR_LETTERS.has(nextConsonant)) return 'izhar';
  if (IDGHAM_GHUNNAH_LETTERS.has(nextConsonant)) return 'idgham_ghunnah';
  if (IDGHAM_NO_GHUNNAH_LETTERS.has(nextConsonant)) return 'idgham_no_ghunnah';
  if (nextConsonant === IQLAB_LETTER) return 'iqlab';
  return 'ikhfa'; // remaining ~15 letters
}

function classifyMeemSakinah(nextConsonant: string | null): TajweedRule {
  if (!nextConsonant) return 'izhar_shafawi';
  if (nextConsonant === MEEM) return 'idgham_shafawi';
  if (nextConsonant === IKHFA_SHAFAWI_LETTER) return 'ikhfa_shafawi';
  return 'izhar_shafawi'; // remaining 26 letters
}

const IDGHAM_MERGE_RULES = new Set<string>(['idgham_ghunnah', 'idgham_no_ghunnah', 'idgham_shafawi']);

/**
 * Idgham is a sound-merge, not just a label. The noon/tanwin/meem stops being
 * pronounced as its own sound and the FOLLOWING consonant is held doubled in
 * its place -- "min rabbihim" is recited "mir-rabbihim", one long r, no n.
 *
 * Emitting the noon anyway had two real consequences: forced alignment expected
 * a sound that a correct reciter deliberately does not make (so correct
 * recitation was scored against), and the ghunnah duration check measured the
 * short nasal instead of the held merged consonant that actually carries the
 * ghunnah. This pass runs over the finished unit list, where the target
 * consonant already exists, rather than trying to look ahead mid-emission.
 */
function applyIdghamMerges(units: PhonemeUnit[]): PhonemeUnit[] {
  const merged: PhonemeUnit[] = [];
  for (let i = 0; i < units.length; i++) {
    const unit = units[i];
    const rule = unit.tajweedRule;
    if (!rule || !IDGHAM_MERGE_RULES.has(rule)) {
      merged.push(unit);
      continue;
    }
    const target = units[i + 1];
    // Nothing to merge into (end of ayah, or a vowel where a consonant was
    // expected): keep the nasal audible rather than silently dropping a sound.
    if (!target || target.isVowel) {
      merged.push(unit);
      continue;
    }
    target.geminated = true;
    // The idgham claims the target's single rule slot. For idgham_ghunnah and
    // idgham_shafawi that is required -- the ghunnah duration heuristic reads
    // the rule off this unit, and this unit is now where the ghunnah is held.
    // The only rule it can displace is tafkhim/tarqiq on a raa (idgham's other
    // targets -- ي ن م و ل -- never carry one outside the lam of Allah, which
    // never follows a noon sakinah); that is classification-only and never
    // acoustically verified, while a missed merge is a real, common error.
    target.tajweedRule = rule;
  }
  return merged;
}

const SHORT_VOWELS = new Set(['a', 'u', 'i']);

/**
 * Waqf — what changes because the reciter STOPS here.
 *
 * Hifz Lab records one ayah at a time (see HifzLab.tsx: the student holds the
 * button for a single verse), so every recording ends in a stop. Reciting the
 * final harakah anyway is not just unusual, it is wrong. Until now the expected
 * sequence kept it, which means the pipeline was asking the student to produce
 * a sound correct recitation omits, on every single recording. That is almost
 * certainly why the utterance-final confidence bucket needed a threshold of
 * -10.163 when ordinary phonemes sit at -3.657: the last phoneme scored badly
 * because it frequently was not there.
 *
 * The rules applied here are the uncontroversial ones for stopping on a word:
 *   - tanwin ٌ / ٍ  -> the whole tanwin drops, the letter takes sukoon
 *                     ("aḥadun" is recited "aḥad")
 *   - tanwin ً      -> becomes a 2-count alef ("'alīman" -> "'alīmā")
 *   - final short vowel -> drops ("al-'ālamīna" -> "al-'ālamīn")
 *   - the now-final consonant is sakinah, so a qalqalah letter there bounces
 *   - a long vowel now sitting before that sakinah letter becomes madd 'aarid
 *
 * Deliberately NOT handled: ta marbuta -> h (the letter produces no phoneme at
 * all today, so that is a separate gap), and pause marks mid-ayah (that is the
 * part still blocked on the VAD gate).
 */
function applyWaqf(units: PhonemeUnit[]): PhonemeUnit[] {
  const out = [...units];
  if (!out.length) return out;

  const last = out[out.length - 1];
  const isTanwinNasal = !last.isVowel && TANWIN.has(last.char);

  if (isTanwinNasal) {
    out.pop();
    const vowel = out[out.length - 1];
    if (vowel?.isVowel && TANWIN.has(vowel.char)) {
      // "رَحْمَةً" is recited "raḥmah" when you stop -- the tanwin goes entirely
      // and the ta marbuta becomes h. It does NOT become the long "raḥmatā"
      // that the ordinary tanwin-fatha rule would produce.
      const bearer = out[out.length - 2];
      if (bearer && bearer.char === TA_MARBUTA) {
        out.pop();
      } else if (vowel.char === FATHATAN) {
        vowel.phoneme = 'aː';
        vowel.madd = 'natural';
      } else {
        out.pop();
      }
    }
  } else if (last.isVowel && SHORT_VOWELS.has(last.phoneme)) {
    out.pop();
  }

  const final = out[out.length - 1];
  if (!final || final.isVowel) return out;

  if (final.char === TA_MARBUTA) final.phoneme = 'h';

  if (!final.tajweedRule && QALQALAH_LETTERS.has(final.char)) {
    final.tajweedRule = 'qalqalah';
  }
  const beforeFinal = out[out.length - 2];
  if (beforeFinal?.isVowel && beforeFinal.madd === 'natural') {
    beforeFinal.madd = 'aarid';
  }
  return out;
}

/**
 * Convert diacritized Uthmani text into a phoneme sequence with tajweed
 * annotations. Operates word-by-word (madd/noon-sakinah rules are mostly
 * word-internal or at word boundaries, handled here at the whole-string
 * level since Quranic recitation rules do cross word boundaries for
 * noon sakinah/tanwin).
 */
const HAMZA_FORMS = new Set(['\u0621', '\u0623', '\u0625', '\u0624', '\u0626', '\u0622']);

/**
 * How long a madd letter is held, in the Hafs 'an 'Asim reading.
 *
 * The previous version read chars[i+1] and chars[i+2] directly. That only ever
 * works if nothing sits between the madd letter and the next letter, and in
 * Uthmani text something almost always does -- the maddah mark, an annotation,
 * or the next letter's own harakah, with the shadda arriving a character later
 * still. So `required4` and `required6` were both close to unreachable and
 * nearly every madd in the Quran was labelled `natural`.
 *
 * A student who correctly held a six-count madd laazim was therefore told they
 * had held a two-count natural madd too long. That is the bug behind the
 * "these corrections are hallucinations" report, and it was not a threshold
 * problem -- the expected length itself was wrong.
 *
 * Scans forward properly instead: skip the marks, find the next real letter,
 * and note whether a word boundary was crossed to reach it.
 */
function classifyMadd(chars: string[], maddLetterIndex: number): MaddClass {
  let j = maddLetterIndex + 1;
  let crossedWordBoundary = false;

  // Walk to the next actual letter, remembering whether a space intervened.
  while (j < chars.length) {
    const c = chars[j];
    if (c === ' ') { crossedWordBoundary = true; j++; continue; }
    if (isHarakah(c) || c === SHADDA || c === DAGGER_ALEF || c === MADDAH ||
        c === ALEF_WASLA || isQuranicAnnotationMark(c)) { j++; continue; }
    break;
  }
  if (j >= chars.length) return 'natural'; // end of input; waqf handles the rest

  const nextLetter = chars[j];

  // Collect that letter's own marks.
  let k = j + 1;
  let nextHasShadda = false;
  let nextHasSukun = false;
  while (k < chars.length &&
         (isHarakah(chars[k]) || chars[k] === SHADDA || chars[k] === DAGGER_ALEF ||
          chars[k] === MADDAH || isQuranicAnnotationMark(chars[k]))) {
    if (chars[k] === SHADDA) nextHasShadda = true;
    else if (SUKUN_MARKS.has(chars[k])) nextHasSukun = true;
    k++;
  }

  // مد متصل -- madd and hamza inside one word. Obligatory, 4-5 counts.
  if (HAMZA_FORMS.has(nextLetter) && !crossedWordBoundary) return 'required4';

  // مد منفصل -- madd ends the word, hamza opens the next. 4-5 counts in Hafs
  // via ash-Shatibiyyah. Never detected before: the old code could not see
  // across a space at all.
  if (HAMZA_FORMS.has(nextLetter) && crossedWordBoundary) return 'required4';

  // The laazim family is six counts and only ever occurs inside one word.
  if (!crossedWordBoundary) {
    // مد لازم كلمي مثقل -- next letter is shadda'd, e.g. ٱلضَّآلِّينَ, تَحَآجُّونَ.
    if (nextHasShadda) return 'required6';
    // مد لازم كلمي مخفف -- next letter is sakin. Occurs in exactly one word in
    // the Quran, ءَآلْـَٰٔنَ (Yunus 51 and 91), but costs nothing to handle.
    if (nextHasSukun) return 'required6';
  }

  // مد طبيعي. Also the correct answer for مد بدل (hamza before the madd letter)
  // and مد عوض, both of which are two counts.
  return 'natural';
}

export function textToPhonemes(
  uthmaniText: string,
  options: { waqf?: boolean } = {}
): PhonemeUnit[] {
  // Strip tatweel (decorative stretch character) — carries no phonetic value
  const text = uthmaniText.replace(new RegExp(TATWEEL, 'g'), '');
  const chars = Array.from(text);
  const units: PhonemeUnit[] = [];

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (ch === ' ' || isHarakah(ch) || ch === SHADDA || ch === DAGGER_ALEF || ch === MADDAH || isQuranicAnnotationMark(ch)) continue;
    if (ch === ALEF_WASLA) continue; // silent in connected recitation — see constant note above

    // Diacritics can appear in either order in real Uthmani text (e.g.
    // fatha-then-shadda vs shadda-then-fatha depending on source/font) —
    // scan forward and collect them regardless of order, rather than
    // assuming a fixed sequence.
    let cursor = i + 1;
    let hasShadda = false;
    let hasDaggerAlef = false;
    let harakahChar: string | null = null;
    while (
      cursor < chars.length &&
      (isHarakah(chars[cursor]) || chars[cursor] === SHADDA || chars[cursor] === DAGGER_ALEF ||
       chars[cursor] === MADDAH || isQuranicAnnotationMark(chars[cursor]))
    ) {
      if (chars[cursor] === SHADDA) hasShadda = true;
      else if (chars[cursor] === DAGGER_ALEF) hasDaggerAlef = true;
      else if (isHarakah(chars[cursor])) harakahChar = chars[cursor];
      cursor++;
    }
    const isSakinah = (harakahChar !== null && SUKUN_MARKS.has(harakahChar)) || harakahChar === null;
    const isTanwinHere = harakahChar !== null && TANWIN.has(harakahChar);

    // ── Sun-letter assimilation: a lam directly preceding a shadda'd sun
    // letter is the definite article's lam being assimilated — it is
    // silent, and the following letter's existing shadda already carries
    // the gemination via the normal hasShadda path below. This pattern
    // essentially only occurs for لا التعريف, so no need to explicitly
    // detect the "ال" prefix.
    if (ch === '\u0644') {
      const nextLetter = chars[cursor];
      let lb = cursor + 1;
      let nextHasShadda = false;
      while (lb < chars.length && (isHarakah(chars[lb]) || chars[lb] === SHADDA)) {
        if (chars[lb] === SHADDA) nextHasShadda = true;
        lb++;
      }
      if (nextLetter && nextHasShadda && SUN_LETTERS.has(nextLetter)) {
        continue; // silent lam — skip emitting a unit for it
      }
    }

    // ── Long vowel letters (ا و ي ى) acting as madd, not consonants ──
    if (ch === ALEF || ch === WAW || ch === YA || ch === ALEF_MAQSURA) {
      // Only a madd letter if it follows a matching short vowel with no
      // harakah of its own (i.e. it's "silent" as a letter, purely lengthening)
      const prevUnit = units[units.length - 1];
      // A madd letter is silent — it only lengthens the vowel before it. If the
      // letter carries a vowel of its own it is a consonant, however well the
      // surrounding vowels match. Without this, "هُوَ" (huwa) came out as "hū"
      // and "قُوَّة" (quwwa) lost its geminated waw, because a damma before a
      // waw was enough on its own to trigger the madd branch. Sukun still
      // allows madd: some Uthmani conventions mark the silent letter.
      const carriesOwnVowel = harakahChar !== null && !SUKUN_MARKS.has(harakahChar);
      const isMaddContext =
        !carriesOwnVowel && !hasShadda &&
        ((ch === ALEF && prevUnit?.phoneme === 'a') ||
         (ch === WAW && prevUnit?.phoneme === 'u') ||
         (ch === YA && prevUnit?.phoneme === 'i') ||
         // ى is never a consonant in Uthmani text -- it lengthens whichever
         // short vowel precedes it ("مُوسَىٰ" mūsā, "ٱلَّذِى" alladhī). It was
         // matching no branch at all, so 6,603 occurrences were silently lost.
         (ch === ALEF_MAQSURA && prevUnit != null && SHORT_VOWELS.has(prevUnit.phoneme)));

      if (isMaddContext && prevUnit) {
        prevUnit.madd = classifyMadd(chars, i);
        prevUnit.phoneme = prevUnit.phoneme + 'ː'; // lengthen the IPA symbol
        continue; // this letter itself produces no separate phoneme unit
      }
    }

    // ── Consonants ──
    const basePhoneme = CONSONANT_PHONEME[ch];
    if (basePhoneme) {
      let tajweedRule: TajweedRule = null;
      // For tanwin, the noon/tanwin rule (izhar/idgham/iqlab/ikhfa) applies to
      // the NASAL SOUND that follows this consonant (emitted as a separate
      // 'n' unit below), not to this consonant itself \u2014 held separately so
      // it can be attached to the right unit instead of this one.
      let tanwinNasalRule: TajweedRule = null;

      // Qalqalah: this consonant, when sakinah (no vowel), "bounces"
      if (isSakinah && !isTanwinHere && QALQALAH_LETTERS.has(ch)) {
        tajweedRule = 'qalqalah';
      }

      // Noon sakinah / tanwin: classify by the NEXT consonant in the stream
      const isNoonSakinah = ch === '\u0646' && isSakinah && !isTanwinHere;
      if (isNoonSakinah || isTanwinHere) {
        const nextConsonant = skipToNextConsonant(chars, cursor);
        let rule = classifyNoonSakinahOrTanwin(nextConsonant);
        if (isNoonSakinah) {
          // Izhar mutlaq: idgham needs a word boundary. Tanwin is always
          // word-final, so it can never reach this case.
          if (
            (rule === 'idgham_ghunnah' || rule === 'idgham_no_ghunnah') &&
            nextConsonantIsSameWord(chars, cursor)
          ) {
            rule = 'izhar';
          }
          // This consonant IS the noon sakinah \u2014 the rule belongs here.
          tajweedRule = rule;
        } else {
          // This consonant just carries the tanwin diacritic; the rule
          // belongs on the nasal 'n' unit emitted after it, below.
          tanwinNasalRule = rule;
        }
      }

      // Meem sakinah: classify by the NEXT consonant in the stream (the
      // "labial" counterpart of noon sakinah -- ikhfa/idgham/izhar shafawi).
      const isMeemSakinah = ch === MEEM && isSakinah && !isTanwinHere;
      if (isMeemSakinah) {
        const nextConsonant = skipToNextConsonant(chars, cursor);
        tajweedRule = classifyMeemSakinah(nextConsonant);
      }

      // Laam of Allah (لفظ الجلالة): the doubled lam in "الله" is tafkhim
      // (heavy) if preceded by fatha/damma, tarqiq (light) if preceded by
      // kasra, tafkhim by default at the very start of recitation. Detected
      // via its consonant skeleton (alef-wasla/alef, lam, lam) rather than a
      // word lookup, since that pattern is otherwise unique to this word.
      // NOTE: the acoustic model behind this pipeline (facebook/wav2vec2-
      // lv-60-espeak-cv-ft) has exactly ONE phoneme token for "l" -- no
      // velarized/heavy variant -- so this classification cannot currently
      // be acoustically verified, only displayed. See CALIBRATION.md.
      if (ch === LAM && hasShadda) {
        const skeleton = precedingConsonantSkeleton(chars, i, 3);
        const isLamOfAllah =
          skeleton.length === 3 &&
          skeleton[1] === LAM &&
          skeleton[2] === LAM &&
          (skeleton[0] === ALEF_WASLA || skeleton[0] === ALEF);
        if (isLamOfAllah) {
          const precedingVowel = lastVowelPhoneme(units);
          tajweedRule = precedingVowel === 'i' ? 'tarqiq' : 'tafkhim';
        }
      }

      // Raa tafkhim/tarqiq: heavy with fatha/damma (or sakinah after
      // fatha/damma), light with kasra (or sakinah after kasra, unless an
      // emphatic letter immediately follows the sukun -- see
      // RAA_TAFKHIM_OVERRIDE_LETTERS). Same acoustic-verification caveat as
      // the lam of Allah above -- classification only, not yet acoustically checked.
      if (ch === RAA) {
        if (harakahChar === FATHA || harakahChar === DAMMA || harakahChar === FATHATAN || harakahChar === DAMMATAN) {
          tajweedRule = 'tafkhim';
        } else if (harakahChar === KASRA || harakahChar === KASRATAN) {
          tajweedRule = 'tarqiq';
        } else if (isSakinah) {
          const precedingVowel = lastVowelPhoneme(units);
          if (precedingVowel === 'i') {
            const nextConsonant = skipToNextConsonant(chars, cursor);
            tajweedRule = (nextConsonant && RAA_TAFKHIM_OVERRIDE_LETTERS.has(nextConsonant)) ? 'tafkhim' : 'tarqiq';
          } else {
            tajweedRule = 'tafkhim';
          }
        }
      }

      // Iqlab substitutes the noon/tanwin sound for an 'm' before ب -- true
      // for both the noon-sakinah consonant itself (here) and the tanwin nasal
      // unit emitted below. Idgham's merge is handled afterwards, by
      // applyIdghamMerges, which needs the target consonant to exist first.
      const emittedPhoneme = tajweedRule === 'iqlab' ? 'm' : basePhoneme;
      units.push({
        char: ch,
        phoneme: emittedPhoneme,
        sourceIndex: i,
        isVowel: false,
        madd: null,
        tajweedRule,
        geminated: hasShadda,
      });

      // Attach the vowel produced by this consonant's harakah, if any
      if (!isSakinah) {
        const vowelPhoneme =
          harakahChar === FATHA || harakahChar === FATHATAN
            ? 'a'
            : harakahChar === DAMMA || harakahChar === DAMMATAN
            ? 'u'
            : harakahChar === KASRA || harakahChar === KASRATAN
            ? 'i'
            : null;
        if (vowelPhoneme) {
          // A superscript (dagger) alef IS an alef -- "ٱلْعَٰلَمِين" is ʿālamīn,
          // not ʿalamīn. It was being swallowed by the diacritic scan above and
          // never lengthening anything, which mis-rendered some of the most
          // common words in the Quran (ٱلرَّحْمَٰن, ذَٰلِكَ, هَٰذَا).
          const lengthened = hasDaggerAlef ? `${vowelPhoneme}ː` : vowelPhoneme;
          units.push({
            char: harakahChar as string,
            phoneme: lengthened,
            sourceIndex: i,
            isVowel: true,
            // A dagger alef is a madd letter like any other, so it takes the
            // same classification. It used to be hardcoded to 'natural', which
            // meant every madd written with a superscript alef -- ٱلرَّحْمَٰن,
            // عَلَىٰ, أُو۟لَٰٓئِكَ -- was two counts no matter what followed it, including
            // the muttasil in أُو۟لَٰٓئِكَ. classifyMadd starts from the consonant and
            // skips the marks, so passing `i` lands it on the right next letter.
            madd: hasDaggerAlef ? classifyMadd(chars, i) : null,
            tajweedRule: null, // plain vowel unit never carries a rule -- for noon sakinah it's on the consonant unit above, for tanwin it's on the nasal 'n' unit emitted below
            geminated: false,
          });
          // Tanwin phonetically resolves to vowel + a nasal "n" sound
          // (before izhar) — represent that explicitly. Iqlab substitutes
          // it for 'm' here; idgham removes it altogether in the merge pass
          // that runs once the whole sequence exists.
          if (isTanwinHere) {
            units.push({
              char: harakahChar as string,
              phoneme: tanwinNasalRule === 'iqlab' ? 'm' : 'n',
              sourceIndex: i,
              isVowel: false,
              madd: null,
              tajweedRule: tanwinNasalRule,
              geminated: false,
            });
          }
        }
      }
    }
  }

  const merged = applyIdghamMerges(units);
  return options.waqf ? applyWaqf(merged) : merged;
}

/**
 * Convenience: flatten to just the IPA string, e.g. for quick display
 * or for feeding as a target sequence into forced-alignment tooling
 * that expects a plain phoneme string.
 */
export function phonemesToString(units: PhonemeUnit[]): string {
  return units.map((u) => u.phoneme).join(' ');
}

// ── Known v1.1 scope (not yet implemented, flagged deliberately) ──
// - Idgham's merge IS implemented (applyIdghamMerges). One honesty note on
//   it: the ghunnah duration range in hifz-api was calibrated on an IKHFA
//   noon, and the merge now points that same range at the held, geminated
//   merge consonant. Standard teaching gives both ~2 counts, so the range
//   should transfer, but it has NOT been measured on a real idgham clip --
//   see CALIBRATION.md. Treat idgham ghunnah timing as advisory until it has.
// - Noon-sakinah detection requires an explicit SUKUN mark on the noon.
//   Verify this holds across your actual quran_verses.text_uthmani data
//   — some Uthmani conventions omit it before idgham letters. If you see
//   missed detections, that's the first place to look.
// - Waqf (pause) rules, hamzat al-wasl realization, and a handful of
//   orthographically-irregular words are not covered.
