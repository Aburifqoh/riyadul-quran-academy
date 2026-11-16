export type Programme = {
  slug: string;
  title: string;
  seoTitle: string;
  description: string;
  tagline: string;
  audience: string;
  points: string[];
};

export const programmes: Programme[] = [
  {
    slug: 'quran-tajweed',
    title: "Qur'an & Tajweed",
    seoTitle: "Qur'an and Tajweed classes",
    description: "Live Qur'an reading and Tajweed at Ilmvers Institute. A teacher listens, corrects pronunciation, and sets the next lesson. Fees are confirmed after a free assessment.",
    tagline: 'Read · Understand · Live',
    audience: 'Adults and older children who want to read the Qur’an correctly.',
    points: [
      'Tajweed rules, taught and then heard in recitation',
      'Articulation points (Makharij) with correction in class',
      'A short target for the next lesson',
      'Revision of what was read last time',
    ],
  },
  {
    slug: 'islamic-studies',
    title: 'Islamic Studies',
    seoTitle: 'Islamic Studies classes',
    description: 'Live classes in creed, everyday fiqh, and the life of the Prophet ﷺ at Ilmvers Institute. This page is for study. A ruling for your own case comes from your teacher.',
    tagline: 'Understand · Apply · Grow',
    audience: 'Learners who want a clear introduction to belief, worship, and seerah.',
    points: [
      'Foundations of creed (aqeedah)',
      'Fiqh of purification and prayer',
      'The life of the Prophet ﷺ',
      'How those lessons are lived at home',
    ],
  },
  {
    slug: 'hifz',
    title: 'Hifz & Memorization',
    seoTitle: "Hifz and Qur'an memorization",
    description: "Structured Qur'an memorization at Ilmvers Institute, with a daily target and revision. A path toward ijazah opens only when a qualified teacher is assigned. Fees are confirmed at enrolment.",
    tagline: 'Memorize · Understand · Be Closer',
    audience: 'Students ready to memorize with a teacher checking new and old portions.',
    points: [
      'A daily memorization target set with your teacher',
      'Revision (muraja’ah) so earlier portions stay',
      'Recitation checked in the live class',
      'Ijazah only after a qualified teacher is assigned',
    ],
  },
  {
    slug: 'arabic',
    title: 'Arabic Language',
    seoTitle: 'Arabic language classes',
    description: 'Arabic classes at Ilmvers Institute, from reading and writing to grammar used in the Qur’an and classical texts. Speaking practice is with the teacher assigned to you.',
    tagline: 'Speak · Read · Understand',
    audience: 'Beginners and continuing students who want to read Arabic with understanding.',
    points: [
      'Reading and writing from the letters upward',
      'Grammar (nahw) and word patterns (sarf)',
      'Vocabulary taken from the lesson, including Qur’anic words',
      'Speaking practice with your assigned teacher',
    ],
  },
  {
    slug: 'children',
    title: "Children's Education",
    seoTitle: "Qur'an classes for children",
    description: "Age-appropriate Qur'an, Arabic sounds, and manners for children at Ilmvers Institute. Parents can follow attendance and teacher notes. Fees are confirmed at enrolment.",
    tagline: 'Play · Learn · Build Character',
    audience: 'Children whose parents want a calm, live class rather than unsupervised videos.',
    points: [
      'Short live lessons matched to the child’s age',
      'Qur’an reading, Arabic sounds, and manners (adab)',
      'A sister can request a female teacher for a girl',
      'Parents see attendance, homework, and teacher notes',
    ],
  },
  {
    slug: 'advanced',
    title: 'Advanced Islamic Studies',
    seoTitle: 'Advanced Islamic studies',
    description: 'Classes in tafsir, hadith, and the principles of fiqh for students who already have a foundation. Ilmvers confirms the level at the free assessment. This is study, not a fatwa service.',
    tagline: 'Deeper Knowledge · Greater Impact',
    audience: 'Students who can already read and want a slower, more detailed text.',
    points: [
      'Tafsir and an introduction to hadith sciences',
      'Principles of fiqh for students past the basics',
      'Reading with a teacher, not a self-paced pack',
      'Placement decided at the free assessment',
    ],
  },
];

export function getProgramme(slug: string) {
  return programmes.find((programme) => programme.slug === slug);
}
