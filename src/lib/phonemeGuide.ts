// ─────────────────────────────────────────────
// src/lib/phonemeGuide.ts
// Turning a flagged phoneme into something a student can act on.
//
// A red dot plus "hafat al-lisan" tells a student nothing they can use, and
// neither does a bare IPA symbol. Each sound here carries its Arabic letter,
// the makhraj it comes from in the traditional naming, how to produce it, and
// the mistake most often made with it -- because "you got ع wrong" is not
// actionable, while "you produced it as a hamza, from the very bottom of the
// throat instead of the middle" is.
//
// Note what this deliberately is NOT: a claim about what the student said. The
// acoustic model does expose a runner-up guess, but measured against this
// project's own reference recitations -- where every phoneme is correct by
// definition -- that guess disagrees with the expected phoneme 60 times. Every
// one would be a false "you said X". So everything here is derived only from
// the EXPECTED sound, which is known-correct reference data and cannot mislead.
// ─────────────────────────────────────────────

export interface PhonemeGuide {
  /** The Arabic letter this sound belongs to. */
  letter: string;
  /** Makhraj in Arabic, as a student would hear it named in class. */
  makhrajAr: string;
  /** The same, transliterated. */
  makhraj: string;
  /** How to produce it, in plain language. */
  how: string;
  /** The error students most commonly make on this letter. */
  watchFor?: string;
}

const G = (
  letter: string,
  makhrajAr: string,
  makhraj: string,
  how: string,
  watchFor?: string
): PhonemeGuide => ({ letter, makhrajAr, makhraj, how, watchFor });

export const PHONEME_GUIDE: Record<string, PhonemeGuide> = {
  // ── الحلق · the throat ──
  ʔ: G('ء', 'أقصى الحلق', 'aqṣā al-ḥalq (deepest throat)', 'A clean, sharp stop from the deepest part of the throat, then release.', 'Softening it until it disappears between two vowels.'),
  h: G('ه', 'أقصى الحلق', 'aqṣā al-ḥalq (deepest throat)', 'An open breath from the deepest part of the throat, with no voice.', 'Letting it vanish at the end of a word — it must still be heard.'),
  ʕ: G('ع', 'وسط الحلق', 'wasaṭ al-ḥalq (middle throat)', 'Squeeze the middle of the throat with the voice running through it.', 'Producing it as a hamza (ء) from too deep, or as a plain vowel.'),
  ħ: G('ح', 'وسط الحلق', 'wasaṭ al-ḥalq (middle throat)', 'From the middle of the throat, breathy and with no voice at all.', 'Letting it slide into خ, which is higher and scraped.'),
  ɣ: G('غ', 'أدنى الحلق', 'adnā al-ḥalq (upper throat)', 'A voiced gargle at the very top of the throat, near the uvula.', 'Making it a French r, or hardening it into ق.'),
  x: G('خ', 'أدنى الحلق', 'adnā al-ḥalq (upper throat)', 'A voiceless scrape at the top of the throat.', 'Voicing it, which turns it into غ.'),

  // ── اللسان · the tongue ──
  q: G('ق', 'أقصى اللسان', 'aqṣā al-lisān (back of tongue)', 'Back of the tongue against the soft palate. Heavy (مُفَخَّم) always.', 'Producing it as ك, which is lighter and further forward.'),
  k: G('ك', 'أقصى اللسان', 'aqṣā al-lisān (back of tongue)', 'Back of the tongue against the hard palate. Always light (مُرَقَّق).', 'Letting it thicken toward ق.'),
  'dʒ': G('ج', 'وسط اللسان', 'wasaṭ al-lisān (middle of tongue)', 'Middle of the tongue pressed to the roof of the mouth, then released.', 'Producing a soft French j instead of a full stop-then-release.'),
  ʃ: G('ش', 'وسط اللسان', 'wasaṭ al-lisān (middle of tongue)', 'Middle of the tongue near the roof, air spreading out, no voice.', 'Cutting the spread (تَفَشِّي) short.'),
  j: G('ي', 'وسط اللسان', 'wasaṭ al-lisān (middle of tongue)', 'Middle of the tongue rises toward the roof without touching it.', 'Touching the roof, which turns it into a consonant cluster.'),
  'dˤ': G('ض', 'حافة اللسان', 'ḥāffat al-lisān (side of tongue)', 'Side of the tongue against the upper molars. Heavy and held.', 'Producing it as د or ظ — ض is the hardest letter in the language.'),
  l: G('ل', 'حافة اللسان', 'ḥāffat al-lisān (tongue edge)', 'Tip and front edge of the tongue on the upper gums.', 'Thickening it — it is light except in the name ٱللَّه after fatha or damma.'),
  n: G('ن', 'طرف اللسان', 'ṭaraf al-lisān (tongue tip)', 'Tongue tip on the upper gums, with the sound running through the nose.', 'Dropping the ghunnah, which is part of the letter itself.'),
  r: G('ر', 'طرف اللسان', 'ṭaraf al-lisān (tongue tip)', 'One light tap of the tongue tip against the upper gums.', 'Rolling it repeatedly — a single tap is what is required.'),
  'tˤ': G('ط', 'طرف اللسان', 'ṭaraf al-lisān (tongue tip)', 'Tongue tip firmly on the upper gums, heavy, with the tongue raised.', 'Producing it as ت, which is light and unraised.'),
  d: G('د', 'طرف اللسان', 'ṭaraf al-lisān (tongue tip)', 'Tongue tip on the upper gums, voiced, tongue flat.', 'Letting it thicken toward ض or ط.'),
  t: G('ت', 'طرف اللسان', 'ṭaraf al-lisān (tongue tip)', 'Tongue tip on the upper gums, no voice, tongue flat.', 'Adding a puff of breath after it.'),
  'sˤ': G('ص', 'طرف اللسان', 'ṭaraf al-lisān (tongue tip)', 'Tongue tip near the upper teeth with the tongue raised — a heavy hiss.', 'Producing it as س, which is light.'),
  z: G('ز', 'طرف اللسان', 'ṭaraf al-lisān (tongue tip)', 'Tongue tip near the upper teeth, voiced — a buzz.', 'Devoicing it into س.'),
  s: G('س', 'طرف اللسان', 'ṭaraf al-lisān (tongue tip)', 'Tongue tip near the upper teeth — a light, thin hiss.', 'Thickening it toward ص.'),
  'ðˤ': G('ظ', 'طرف اللسان', 'ṭaraf al-lisān (tongue tip)', 'Tongue tip touching the tips of the upper front teeth. Heavy.', 'Producing it as ز or ض.'),
  ð: G('ذ', 'طرف اللسان', 'ṭaraf al-lisān (tongue tip)', 'Tongue tip touching the tips of the upper front teeth, voiced.', 'Producing it as ز, which is made behind the teeth, not on them.'),
  θ: G('ث', 'طرف اللسان', 'ṭaraf al-lisān (tongue tip)', 'Tongue tip touching the tips of the upper front teeth, no voice.', 'Producing it as س.'),

  // ── الشفتان · the lips ──
  f: G('ف', 'الشفتان', 'ash-shafatān (the lips)', 'Inside of the lower lip against the edges of the upper front teeth.', 'Using both lips instead of lip-to-teeth.'),
  b: G('ب', 'الشفتان', 'ash-shafatān (the lips)', 'Both lips together, voiced, released cleanly.', 'Losing its qalqalah when it carries sukun.'),
  m: G('م', 'الشفتان', 'ash-shafatān (the lips)', 'Both lips together with the sound running through the nose.', 'Dropping the ghunnah, or opening the lips too early.'),
  w: G('و', 'الشفتان', 'ash-shafatān (the lips)', 'Round the lips without letting them touch, then move off the shape.', 'Closing the lips, which turns it toward ب or م.'),

  // ── المدود · the long vowels ──
  'aː': G('ا', 'الجوف', 'al-jawf (the mouth cavity)', 'An open "aa" flowing from the empty space of the mouth, held two counts.', 'Cutting it to a single count, or bending it toward "e".'),
  'uː': G('و', 'الجوف', 'al-jawf (the mouth cavity)', 'A rounded "oo" held two counts, lips steady throughout.', 'Letting the lips move, which adds a consonant to the end.'),
  'iː': G('ي', 'الجوف', 'al-jawf (the mouth cavity)', 'A stretched "ee" held two counts, tongue steady throughout.', 'Shortening it to a plain kasra.'),

  // ── الحركات · the short vowels ──
  a: G('◌َ', 'الحركة', 'fatḥah', 'A short, open fatha — one count, mouth opened, not stretched.', 'Stretching it into a madd.'),
  u: G('◌ُ', 'الحركة', 'ḍammah', 'A short, rounded damma — one count, lips rounded, not stretched.', 'Flattening it toward a fatha.'),
  i: G('◌ِ', 'الحركة', 'kasrah', 'A short kasra — one count, jaw lowered slightly, not stretched.', 'Stretching it, or raising it toward a fatha.'),
};

export function guideFor(phoneme: string | null | undefined): PhonemeGuide | null {
  if (!phoneme) return null;
  return PHONEME_GUIDE[phoneme] ?? null;
}

/** Plain-language name for a madd class, with the term a teacher would use. */
export function maddName(maddClass: string | null | undefined): { ar: string; en: string; counts: string } | null {
  switch (maddClass) {
    case 'natural':
      return { ar: 'مَدّ طَبِيعِي', en: 'natural madd', counts: '2 counts' };
    case 'required4':
      return { ar: 'مَدّ وَاجِب', en: 'obligatory madd', counts: '4–5 counts' };
    case 'required6':
      return { ar: 'مَدّ لَازِم', en: 'necessary madd', counts: '6 counts' };
    case 'aarid':
      return { ar: 'مَدّ عَارِض لِلسُّكُون', en: 'madd before a stop', counts: '2, 4 or 6 counts' };
    default:
      return null;
  }
}

/** Plain-language name for a tajweed rule the duration check can comment on. */
export function ruleName(rule: string | null | undefined): { ar: string; en: string; hold: string } | null {
  switch (rule) {
    case 'ikhfa':
      return { ar: 'إِخْفَاء', en: 'ikhfaa', hold: 'hide the nūn and hum for two counts' };
    case 'ikhfa_shafawi':
      return { ar: 'إِخْفَاء شَفَوِي', en: 'ikhfaa shafawi', hold: 'lips lightly apart, hum for two counts' };
    case 'idgham_ghunnah':
      return { ar: 'إِدْغَام بِغُنَّة', en: 'idghaam with ghunnah', hold: 'merge into the next letter and hum for two counts' };
    case 'idgham_shafawi':
      return { ar: 'إِدْغَام شَفَوِي', en: 'idghaam shafawi', hold: 'merge the two mīms and hum for two counts' };
    case 'iqlab':
      return { ar: 'إِقْلَاب', en: 'iqlaab', hold: 'turn the nūn into a hidden mīm and hum for two counts' };
    case 'izhar':
      return { ar: 'إِظْهَار', en: 'izhaar', hold: 'sound the nūn clearly, with no hum' };
    case 'qalqalah':
      return { ar: 'قَلْقَلَة', en: 'qalqalah', hold: 'a clean bounce off the letter, without adding a vowel' };
    case 'ghunnah':
      return { ar: 'غُنَّة', en: 'ghunnah', hold: 'hum through the nose for two counts' };
    default:
      return null;
  }
}
