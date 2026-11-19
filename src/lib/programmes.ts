import { supabase } from '@/lib/supabase';

export type Programme = {
  slug: string;
  title: string;
  seoTitle: string;
  description: string;
  /** Shorter blurb for homepage cards */
  shortDescription?: string;
  tagline: string;
  audience: string;
  /** Subjects / topics covered (shown on public programme pages) */
  points: string[];
  /** Homepage badge labels */
  badges?: string[];
  published?: boolean;
  sortOrder?: number;
};

export const PROGRAMMES_SETTINGS_KEY = 'public_programmes';

export const DEFAULT_PROGRAMMES: Programme[] = [
  {
    slug: 'quran-tajweed',
    title: "Qur'an & Tajweed",
    seoTitle: "Qur'an and Tajweed classes",
    description:
      "Live Qur'an reading and Tajweed at Ilmvers Institute. A teacher listens, corrects pronunciation, and sets the next lesson. Fees are confirmed after a free assessment.",
    shortDescription:
      "Learn to read the Qur'an correctly with proper Tajweed and deepen your connection with Allah's words.",
    tagline: 'Read · Understand · Live',
    audience: 'Adults and older children who want to read the Qur’an correctly.',
    points: [
      'Tajweed rules, taught and then heard in recitation',
      'Articulation points (Makharij) with correction in class',
      'A short target for the next lesson',
      'Revision of what was read last time',
    ],
    badges: ['Proper Pronunciation', 'Tajweed Rules', 'Live instruction'],
    published: true,
    sortOrder: 1,
  },
  {
    slug: 'islamic-studies',
    title: 'Islamic Studies',
    seoTitle: 'Islamic Studies classes',
    description:
      'Live classes in creed, everyday fiqh, and the life of the Prophet ﷺ at Ilmvers Institute. This page is for study. A ruling for your own case comes from your teacher.',
    shortDescription:
      "Explore the life of the Prophet ﷺ, Qur'anic sciences, Fiqh, and the core principles of Islam.",
    tagline: 'Understand · Apply · Grow',
    audience: 'Learners who want a clear introduction to belief, worship, and seerah.',
    points: [
      'Foundations of creed (aqeedah)',
      'Fiqh of purification and prayer',
      'The life of the Prophet ﷺ',
      'How those lessons are lived at home',
    ],
    badges: ['Seerah & History', 'Fiqh & Aqidah', 'Contemporary Issues'],
    published: true,
    sortOrder: 2,
  },
  {
    slug: 'hifz',
    title: 'Hifz & Memorization',
    seoTitle: "Hifz and Qur'an memorization",
    description:
      "Structured Qur'an memorization at Ilmvers Institute, with a daily target and revision. A path toward ijazah opens only when a qualified teacher is assigned. Fees are confirmed at enrolment.",
    shortDescription:
      "Build a lifelong relationship with the Qur'an through structured and personalized memorization programs.",
    tagline: 'Memorize · Understand · Be Closer',
    audience: 'Students ready to memorize with a teacher checking new and old portions.',
    points: [
      'A daily memorization target set with your teacher',
      'Revision (muraja’ah) so earlier portions stay',
      'Recitation checked in the live class',
      'Ijazah only after a qualified teacher is assigned',
    ],
    badges: ['Structured Plans', 'Progress Tracking', 'Personalized Support'],
    published: true,
    sortOrder: 3,
  },
  {
    slug: 'arabic',
    title: 'Arabic Language',
    seoTitle: 'Arabic language classes',
    description:
      'Arabic classes at Ilmvers Institute, from reading and writing to grammar used in the Qur’an and classical texts. Speaking practice is with the teacher assigned to you.',
    shortDescription:
      'Learn Arabic from the basics to advanced levels with practical and interactive lessons.',
    tagline: 'Speak · Read · Understand',
    audience: 'Beginners and continuing students who want to read Arabic with understanding.',
    points: [
      'Reading and writing from the letters upward',
      'Grammar (nahw) and word patterns (sarf)',
      'Vocabulary taken from the lesson, including Qur’anic words',
      'Speaking practice with your assigned teacher',
    ],
    badges: ['Speaking Skills', 'Reading & Writing', 'Native Instructors'],
    published: true,
    sortOrder: 4,
  },
  {
    slug: 'children',
    title: "Children's Education",
    seoTitle: "Qur'an classes for children",
    description:
      "Age-appropriate Qur'an, Arabic sounds, and manners for children at Ilmvers Institute. Parents can follow attendance and teacher notes. Fees are confirmed at enrolment.",
    shortDescription:
      'Fun, engaging and age-appropriate Islamic education for a strong foundation in faith and values.',
    tagline: 'Play · Learn · Build Character',
    audience: 'Children whose parents want a calm, live class rather than unsupervised videos.',
    points: [
      'Short live lessons matched to the child’s age',
      'Qur’an reading, Arabic sounds, and manners (adab)',
      'A sister can request a female teacher for a girl',
      'Parents see attendance, homework, and teacher notes',
    ],
    badges: ['Interactive Lessons', 'Character Building', 'Safe & Supportive Environment'],
    published: true,
    sortOrder: 5,
  },
  {
    slug: 'advanced',
    title: 'Advanced Islamic Studies',
    seoTitle: 'Advanced Islamic studies',
    description:
      'Classes in tafsir, hadith, and the principles of fiqh for students who already have a foundation. Ilmvers confirms the level at the free assessment. This is study, not a fatwa service.',
    shortDescription:
      'For serious learners seeking advanced knowledge in Islamic scholarship and leadership.',
    tagline: 'Deeper Knowledge · Greater Impact',
    audience: 'Students who can already read and want a slower, more detailed text.',
    points: [
      'Tafsir and an introduction to hadith sciences',
      'Principles of fiqh for students past the basics',
      'Reading with a teacher, not a self-paced pack',
      'Placement decided at the free assessment',
    ],
    badges: ['Tafsir & Hadith', 'Islamic Law (Fiqh)', "Leadership & Da'wah"],
    published: true,
    sortOrder: 6,
  },
];

/** Sync fallback used by static pages until CMS data loads. */
export const programmes = DEFAULT_PROGRAMMES;

export function getProgramme(slug: string) {
  return programmes.find((programme) => programme.slug === slug);
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64);
}

export function normalizeProgramme(raw: unknown, index = 0): Programme | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const title = String(r.title || '').trim();
  if (!title) return null;
  const slug = slugify(String(r.slug || title)) || `programme-${index + 1}`;
  const points = Array.isArray(r.points)
    ? r.points.map((p) => String(p).trim()).filter(Boolean)
    : [];
  const badges = Array.isArray(r.badges)
    ? r.badges.map((b) => String(b).trim()).filter(Boolean)
    : [];
  return {
    slug,
    title,
    seoTitle: String(r.seoTitle || title).trim() || title,
    description: String(r.description || '').trim(),
    shortDescription: String(r.shortDescription || r.description || '').trim(),
    tagline: String(r.tagline || '').trim(),
    audience: String(r.audience || '').trim(),
    points,
    badges,
    published: r.published !== false,
    sortOrder: Number.isFinite(Number(r.sortOrder)) ? Number(r.sortOrder) : index + 1,
  };
}

export function parseProgrammesValue(value: unknown): Programme[] {
  let raw = value;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, i) => normalizeProgramme(item, i))
    .filter((p): p is Programme => Boolean(p))
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

/** Published programmes for homepage / public pages. Falls back to defaults. */
export async function loadPublicProgrammes(opts?: { includeUnpublished?: boolean }): Promise<Programme[]> {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', PROGRAMMES_SETTINGS_KEY)
      .maybeSingle();
    if (error || !data?.value) return DEFAULT_PROGRAMMES.filter((p) => p.published !== false);
    const parsed = parseProgrammesValue(data.value);
    if (!parsed.length) return DEFAULT_PROGRAMMES.filter((p) => p.published !== false);
    if (opts?.includeUnpublished) return parsed;
    return parsed.filter((p) => p.published !== false);
  } catch {
    return DEFAULT_PROGRAMMES.filter((p) => p.published !== false);
  }
}

export async function savePublicProgrammes(list: Programme[]): Promise<{ ok: boolean; error?: string }> {
  const cleaned = list
    .map((item, i) => normalizeProgramme(item, i))
    .filter((p): p is Programme => Boolean(p));
  const { error } = await supabase.from('system_settings').upsert(
    {
      key: PROGRAMMES_SETTINGS_KEY,
      value: JSON.stringify(cleaned),
    },
    { onConflict: 'key' }
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export function emptyProgrammeDraft(): Programme {
  return {
    slug: '',
    title: '',
    seoTitle: '',
    description: '',
    shortDescription: '',
    tagline: '',
    audience: '',
    points: [''],
    badges: [''],
    published: true,
    sortOrder: 99,
  };
}
