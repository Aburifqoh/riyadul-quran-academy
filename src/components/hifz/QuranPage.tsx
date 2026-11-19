'use client';

// ─────────────────────────────────────────────
// components/hifz/QuranPage.tsx
// Renders a full Quran page with phoneme-level acoustic grading
// using manuscript palette (parchment, ink, rubricated red)
// ─────────────────────────────────────────────
import type { PhonemeAlignment } from '@/types/globals';
import { useEffect, useRef, useState } from 'react';

interface Verse {
  verse_key: string;
  text_uthmani: string;
  verse_number: number;
  surah_number: number;
  translations?: { text: string }[];
  words?: { transliteration?: { text: string | null } | null }[];
}

interface QuranPageProps {
  pageNumber: number;
  /** Every ayah in the current selection, so a student can recite a passage
   *  rather than being forced back to the button after each single verse. */
  selectedKeys?: string[];
  /** Every ayah covered by the take just graded, in recitation order. */
  gradedKeys?: string[];
  onVerseTap?: (verseKey: string) => void;
  /** Lets the parent resolve a range to real text without duplicating the fetch. */
  onVersesLoaded?: (verses: { verse_key: string; text_uthmani: string }[]) => void;
  /** Revise mode: keep the words covered until they have been recited. */
  hideUngraded?: boolean;
  isRecording?: boolean;
  isProcessing?: boolean;
  alignment?: PhonemeAlignment[]; // The new phoneme-level acoustic alignment data
  /** Show meaning and transliteration under each ayah. Off by default: this is
   *  a memorisation surface first, and a wall of English under every line is
   *  exactly the crutch a hafiz is trying to put down. */
  showMeaning?: boolean;
}

// Surah name map (full 114 surahs to fix NaN bug)
const SURAH_NAMES: Record<number, string> = {
  1: 'Al-Fātihah', 2: 'Al-Baqarah', 3: 'Āl ʿImrān', 4: 'An-Nisāʾ', 5: 'Al-Māʾidah', 
  6: 'Al-Anʿām', 7: 'Al-Aʿrāf', 8: 'Al-Anfāl', 9: 'At-Tawbah', 10: 'Yūnus', 
  11: 'Hūd', 12: 'Yūsuf', 13: 'Ar-Raʿd', 14: 'Ibrāhīm', 15: 'Al-Hijr', 
  16: 'An-Nahl', 17: 'Al-Isrāʾ', 18: 'Al-Kahf', 19: 'Maryam', 20: 'Ṭā Hā',
  21: 'Al-Anbiyāʾ', 22: 'Al-Hajj', 23: 'Al-Muʾminūn', 24: 'An-Nūr', 25: 'Al-Furqān',
  26: 'Ash-Shuʿarāʾ', 27: 'An-Naml', 28: 'Al-Qaṣaṣ', 29: 'Al-ʿAnkabūt', 30: 'Ar-Rūm',
  31: 'Luqmān', 32: 'As-Sajdah', 33: 'Al-Aḥzāb', 34: 'Sabaʾ', 35: 'Fāṭir',
  36: 'Yā Sīn', 37: 'Aṣ-Ṣāffāt', 38: 'Ṣād', 39: 'Az-Zumar', 40: 'Ghāfir',
  41: 'Fuṣṣilat', 42: 'Ash-Shūrā', 43: 'Az-Zukhruf', 44: 'Ad-Dukhān', 45: 'Al-Jāthiyah',
  46: 'Al-Aḥqāf', 47: 'Muḥammad', 48: 'Al-Fatḥ', 49: 'Al-Ḥujurāt', 50: 'Qāf',
  51: 'Adh-Dhāriyāt', 52: 'Aṭ-Ṭūr', 53: 'An-Najm', 54: 'Al-Qamar', 55: 'Ar-Raḥmān',
  56: 'Al-Wāqiʿah', 57: 'Al-Ḥadīd', 58: 'Al-Mujādilah', 59: 'Al-Ḥashr', 60: 'Al-Mumtaḥanah',
  61: 'Aṣ-Ṣaff', 62: 'Al-Jumuʿah', 63: 'Al-Munāfiqūn', 64: 'At-Taghābun', 65: 'Aṭ-Ṭalāq',
  66: 'At-Taḥrīm', 67: 'Al-Mulk', 68: 'Al-Qalam', 69: 'Al-Ḥāqqah', 70: 'Al-Maʿārij',
  71: 'Nūḥ', 72: 'Al-Jinn', 73: 'Al-Muzzammil', 74: 'Al-Muddaththir', 75: 'Al-Qiyāmah',
  76: 'Al-Insān', 77: 'Al-Mursalāt', 78: 'An-Nabaʾ', 79: 'An-Nāziʿāt', 80: 'ʿAbasa',
  81: 'At-Takwīr', 82: 'Al-Infiṭār', 83: 'Al-Muṭaffifīn', 84: 'Al-Inshiqāq', 85: 'Al-Burūj',
  86: 'Aṭ-Ṭāriq', 87: 'Al-Aʿlā', 88: 'Al-Ghāshiyah', 89: 'Al-Fajr', 90: 'Al-Balad',
  91: 'Ash-Shams', 92: 'Al-Layl', 93: 'Aḍ-Ḍuḥā', 94: 'Ash-Sharḥ', 95: 'At-Tīn',
  96: 'Al-ʿAlaq', 97: 'Al-Qadr', 98: 'Al-Bayyinah', 99: 'Az-Zalzalah', 100: 'Al-ʿĀdiyāt',
  101: 'Al-Qāriʿah', 102: 'At-Takāthur', 103: 'Al-ʿAṣr', 104: 'Al-Humazah', 105: 'Al-Fīl',
  106: 'Quraysh', 107: 'Al-Māʿūn', 108: 'Al-Kawthar', 109: 'Al-Kāfirūn', 110: 'An-Naṣr',
  111: 'Al-Masad', 112: 'Al-Ikhlāṣ', 113: 'Al-Falaq', 114: 'An-Nās'
};

function AyahNumber({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center justify-center mx-1 my-0.5 align-middle" aria-label={`Ayah ${n}`}>
      <span className="relative inline-flex items-center justify-center w-8 h-8">
        <svg viewBox="0 0 32 32" className="absolute inset-0 w-full h-full text-[#C89B3C]" fill="none">
          <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <circle cx="16" cy="16" r="10" stroke="currentColor" strokeWidth="0.75" fill="none" opacity="0.4" />
        </svg>
        <span className="relative text-[9px] font-bold text-[#C89B3C] font-mono leading-none">
          {n}
        </span>
      </span>
    </span>
  );
}

const SKELETON_WIDTHS = [
  [52, 68, 44, 72, 56, 64],
  [48, 60, 76, 42, 58],
  [70, 54, 62, 48, 66, 50],
  [46, 72, 58, 64, 40],
  [60, 52, 68, 56, 74, 48],
  [64, 44, 58, 70, 52],
  [50, 66, 54, 62, 48, 72],
  [58, 46, 64, 52, 68],
];

function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-4 p-6 bg-[#F1E9D2]">
      {SKELETON_WIDTHS.map((row, i) => (
        <div key={i} className="flex gap-2 justify-end flex-wrap">
          {row.map((width, j) => (
            <div key={j} className="h-7 bg-[#E3D9BC] rounded" style={{ width: `${width}px` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function QuranPage({
  pageNumber,
  isRecording,
  isProcessing,
  alignment,
  selectedKeys = [],
  gradedKeys = [],
  onVerseTap,
  onVersesLoaded,
  hideUngraded = false,
  showMeaning = false,
}: QuranPageProps) {
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loadedPage, setLoadedPage] = useState<number | null>(null);
  const [error, setError] = useState('');

  // Held in a ref so a new callback identity from the parent cannot re-trigger
  // the page fetch on every render.
  const onVersesLoadedRef = useRef(onVersesLoaded);
  useEffect(() => {
    onVersesLoadedRef.current = onVersesLoaded;
  });

  useEffect(() => {
    let cancelled = false;
    // Translation 203 is Al-Hilali & Khan, chosen by the academy.
    //
    // It was 131 (Clear Quran), which returns an EMPTY translations array from
    // this endpoint -- the request succeeded and the key was simply absent, so
    // the meaning panel silently rendered transliteration only with no error
    // anywhere. Verified against the live API: 20, 85 and 203 return text, 131
    // returns nothing.
    //
    // Al-Hilali & Khan carries <sup> footnote markers and bracketed glosses.
    // The renderer strips tags and shows the result as text, so the markers
    // disappear and the bracketed additions -- which are part of how this
    // translation reads -- stay.
    //
    // Word-level transliteration rides along on the words array, which is
    // already being requested, so both are fetched unconditionally and
    // toggling the display costs no extra round trip.
    fetch(
      `https://api.quran.com/api/v4/verses/by_page/${pageNumber}?fields=text_uthmani&per_page=50` +
      `&translations=203&words=true&word_fields=text_uthmani,transliteration`
    )
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        setVerses(data.verses || []);
        setError('');
        setLoadedPage(pageNumber);
        onVersesLoadedRef.current?.(data.verses || []);
      })
      .catch(() => {
        if (cancelled) return;
        setError('Failed to load page. Check your connection.');
        setLoadedPage(pageNumber);
      });
    return () => {
      cancelled = true;
    };
  }, [pageNumber]);

  const loading = loadedPage !== pageNumber;
  if (loading) return <PageSkeleton />;
  if (error) return (
    <div className="flex items-center justify-center h-64 text-red-500 text-sm bg-[#F1E9D2]">{error}</div>
  );

  // Offsets must be built from the GRADED passage in recitation order and with
  // the same tatweel stripping api/hifz-review applies, or every mark after the
  // first ayah lands on the wrong letter.
  const ayahOffsets = new Map<string, number>();
  {
    let offset = 0;
    for (const key of gradedKeys) {
      const v = verses.find(x => x.verse_key === key);
      if (!v) continue;
      ayahOffsets.set(key, offset);
      offset += v.text_uthmani.replace(/ـ/g, '').length + 1; // + the joining space
    }
  }

  const surahGroups = verses.reduce((acc, v) => {
    const key = parseInt(v.verse_key.split(':')[0]);
    if (!acc[key]) acc[key] = [];
    acc[key].push(v);
    return acc;
  }, {} as Record<number, Verse[]>);

  return (
    <div
      className="relative font-uthmani px-6 py-6 bg-[#F1E9D2] text-[#16211D] rounded-xl border border-[#C9B98C] shadow-sm"
      dir="rtl"
      style={{ fontFamily: "'Amiri Quran', 'Amiri', 'me_quran', serif" }}
    >
      {Object.entries(surahGroups).map(([surahNum, surahVerses]) => {
        const sNum = parseInt(surahNum);
        const isFirstVerseOfSurah = surahVerses[0].verse_number === 1 && sNum !== 1 && sNum !== 9;

        return (
          <div key={surahNum}>
            {isFirstVerseOfSurah && (
              <div className="text-center my-6">
                <div className="inline-block border border-[#C9B98C] rounded-lg px-6 py-1.5 text-[#5C5142] text-base font-semibold tracking-widest bg-[#F1E9D2]/50">
                  سُورَةُ {SURAH_NAMES[sNum] || `${sNum}`}
                </div>
                <div className="mt-3 text-[#16211D] text-xl">
                  بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
                </div>
              </div>
            )}

            <div className="inline">
              {surahVerses.map(verse => {
                const isSelected = selectedKeys.includes(verse.verse_key);
                // EVERY graded ayah shows its marks. This used to compare
                // against a single key set to selection.keys[0], so reciting a
                // two-ayah passage marked the first ayah and left the second
                // looking clean no matter what was recited.
                const isActive = gradedKeys.includes(verse.verse_key);
                // api/hifz-review joins the passage with single spaces and
                // shifts each ayah's source indices by everything before it, so
                // a mark for the second ayah arrives numbered past the end of
                // the first. Subtract this ayah's offset to get back to an
                // index into its own text.
                const indexOffset = ayahOffsets.get(verse.verse_key) ?? 0;
                // Revise mode covers what has not been recited yet. Blur rather
                // than blanks: the shape and length of the line stay visible, so
                // it still reads as the mushaf instead of a fill-in-the-blank.
                const masked = hideUngraded && !isActive;
                const cleanText = verse.text_uthmani.replace(/\u0640/g, ''); // strip tatweel
                
                const charErrors = new Set<number>();
                const charMadds = new Map<number, string>();
                const charTajweed = new Map<number, string>();

                if (isActive && alignment && alignment.length > 0) {
                    // Use each phoneme's own source_index (its position in this
                    // verse's text) rather than assuming array-index parity with
                    // a freshly recomputed phoneme list — the API may drop a
                    // phoneme that isn't in the acoustic model's vocab, which
                    // would silently shift every highlight after it.
                    for (const alignItem of alignment) {
                        if (alignItem.source_index == null) continue;
                        const idx = alignItem.source_index - indexOffset;
                        // Anything outside this ayah belongs to a neighbour in
                        // the same passage.
                        if (idx < 0 || idx >= cleanText.length) continue;

                        // A dropped madd -- مَلِكِ read where the text says مَٰلِكِ --
                        // is a confident short vowel, so confidence alone can
                        // never catch it. The duration is the only evidence,
                        // and it makes the word wrong, not merely noteworthy.
                        const maddWrong = alignItem.madd_judgement === 'too_short'
                                       || alignItem.madd_judgement === 'too_long';
                        const tajweedWrong = alignItem.tajweed_judgement === 'too_short'
                                          || alignItem.tajweed_judgement === 'too_long';
                        if (alignItem.confidence_log < alignItem.confidence_threshold || maddWrong || tajweedWrong) {
                            charErrors.add(idx);
                        }
                        // Underline the ones held WRONG, not every madd there is.
                        // Keying this off madd_class meant a correct recitation
                        // came back with a coloured underline under every long
                        // vowel in the passage -- decoration the student had to
                        // learn to ignore, which is the opposite of feedback.
                        if (maddWrong) {
                            charMadds.set(idx, alignItem.madd_judgement === 'too_short'
                                ? 'underline decoration-[#A63D3D] decoration-dashed decoration-2 underline-offset-4'
                                : 'underline decoration-[#6B5A8E] decoration-dashed decoration-2 underline-offset-4');
                        }
                        // Qalqalah/ghunnah duration checks — preliminary heuristic,
                        // shown distinctly from madd (dotted vs. dashed underline)
                        if (tajweedWrong) {
                            charTajweed.set(idx, 'underline decoration-[#2F6F5E] decoration-dotted decoration-2 underline-offset-4');
                        }
                    }
                }

                return (
                  <span
                    key={verse.verse_key}
                    role="button"
                    tabIndex={0}
                    onClick={() => onVerseTap?.(verse.verse_key)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onVerseTap?.(verse.verse_key);
                      }
                    }}
                    className={`
                      ${showMeaning ? 'block mb-5' : 'inline'} cursor-pointer rounded transition-all duration-150 mx-1 leading-loose
                      focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C89B3C]
                      ${isSelected ? 'bg-[#C9B98C]/25 shadow-[inset_0_-2px_0_0_#C89B3C]' : 'hover:bg-[#C9B98C]/10'}
                      ${masked ? 'select-none' : ''}
                    `}
                    /* A CSS filter does nothing on a display:inline element, so
                       Tailwind's blur-* silently computed to blur(0px) here.
                       Transparent text with a soft shadow gives the same effect
                       and does work inline -- and the ayah number keeps its own
                       colour, so you can still see which verse you are on. */
                    style={masked
                      ? { color: 'transparent', textShadow: '0 0 9px rgba(22,33,29,0.55)' }
                      : undefined}
                    aria-label={`Ayah ${verse.verse_key}${isSelected ? ', selected' : ''}`}
                    title={`Tap to select ${verse.verse_key}; tap another ayah to extend the range`}
                  >
                    {cleanText.split('').map((char, ci) => {
                      const isError = isActive && alignment ? charErrors.has(ci) : false;
                      const maddStyle = isActive && alignment ? charMadds.get(ci) || '' : '';
                      const tajweedStyle = isActive && alignment ? charTajweed.get(ci) || '' : '';
                      // While masked, inherit the parent's transparent colour and
                      // its text-shadow. Setting an explicit colour here is what
                      // made the Revise mask look like it did nothing: the parent
                      // went transparent and every character span painted over it.
                      const colorClass = masked
                        ? ''
                        : isError ? 'text-[#A63D3D]' : 'text-[#16211D]';

                      return (
                        <span
                          key={`${verse.verse_key}-${ci}`}
                          className={`
                            transition-all duration-300
                            ${colorClass}
                            ${maddStyle}
                            ${tajweedStyle}
                            ${isError ? 'relative' : ''}
                          `}
                        >
                          {char}
                          {isError && char !== ' ' && (
                            <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#A63D3D] opacity-80" />
                          )}
                        </span>
                      );
                    })}
                    <span className="inline-block mx-1">
                      <AyahNumber n={verse.verse_number} />
                    </span>
                    {showMeaning && (
                      /* Stays out of the masked path deliberately: in Revise the
                         Arabic is hidden, and showing an English translation of
                         the very words being recalled would hand the answer back. */
                      !masked && (
                        <span className="block text-left mt-1.5" dir="ltr">
                          {(() => {
                            const translit = (verse.words ?? [])
                              .map((w) => w.transliteration?.text)
                              .filter(Boolean)
                              .join(' ');
                            return translit ? (
                              <span className="block text-[12.5px] italic text-[#8A7357] leading-snug">
                                {translit}
                              </span>
                            ) : null;
                          })()}
                          {verse.translations?.[0]?.text && (
                            <span className="block text-[13px] text-[#4A423A] leading-snug mt-0.5">
                              {/* The API returns footnote markup inside the
                                  translation text. Strip the tags and render the
                                  result as TEXT -- putting third-party HTML
                                  through dangerouslySetInnerHTML to preserve a
                                  superscript is not a trade worth making. */}
                              {verse.translations[0].text
                                // Drop footnote markers CONTENT AND ALL. Stripping
                                // only the tags leaves the number welded to the
                                // previous word -- Al-Hilali & Khan renders as
                                // "the Lord1 of the 'Aalamin ...2", which reads
                                // like a typo rather than a citation.
                                .replace(/<sup[^>]*>[\s\S]*?<\/sup>/g, '')
                                .replace(/<[^>]*>/g, '')
                                .replace(/\s+([.,;:!?])/g, '$1')
                                .replace(/\s{2,}/g, ' ')
                                .trim()}
                            </span>
                          )}
                        </span>
                      )
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}

      {isRecording && (
        <div className="absolute inset-0 rounded-xl ring-2 ring-[#A63D3D] ring-opacity-60 animate-pulse pointer-events-none" />
      )}

      {isProcessing && (
        <div className="absolute inset-0 bg-[#F1E9D2]/70 backdrop-blur-[1px] rounded-xl flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-1.5">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-2.5 h-2.5 bg-[#A63D3D] rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 120}ms` }}
                />
              ))}
            </div>
            <span className="text-xs text-[#5C5142] font-medium">Grading recitation…</span>
          </div>
        </div>
      )}
    </div>
  );
}
