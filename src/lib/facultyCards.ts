export type FacultyCard = {
  id: string;
  name: string;
  role: string;
  category: string;
  credentials: string;
  specialization?: string;
  bio: string;
};

export const DEFAULT_FACULTY_CARDS: FacultyCard[] = [
  {
    id: 'ahmad-yusuf',
    name: 'Ustadh Ahmad Yusuf',
    role: "Qur'an & Tajweed Specialist",
    category: "QUR'AN & TAJWEED",
    credentials: 'B.A. Islamic Studies (Al-Madinah University) · Ijazah in Qur\'an & Tajweed',
    bio: 'With over 12 years of experience, Ustadh Ahmad helps students master proper recitation and the beauty of the Qur\'an.',
  },
  {
    id: 'omar-khalid',
    name: 'Shaykh Omar Khalid',
    role: 'Islamic Studies Scholar',
    category: 'ISLAMIC STUDIES',
    credentials: 'Ph.D. in Islamic Studies (International Islamic University)',
    specialization: 'Aqeedah, Fiqh, Seerah',
    bio: 'Shaykh Omar provides deep, structured and practical knowledge of Islamic sciences for all levels.',
  },
  {
    id: 'bilal-hassan',
    name: 'Ustadh Bilal Hassan',
    role: 'Arabic Language Instructor',
    category: 'ARABIC LANGUAGE',
    credentials: 'B.A. Arabic Language (Al-Azhar University) · Certified Arabic Teacher',
    bio: 'Ustadh Bilal makes Arabic simple, practical and enjoyable, helping students build strong language skills for real-life use.',
  },
  {
    id: 'aisha-bello',
    name: 'Ustazah Aisha Bello',
    role: "Children's Islamic Education Specialist",
    category: "CHILDREN'S EDUCATION",
    credentials: 'B.Ed. (Early Childhood Education) · Islamic Studies Certification',
    bio: 'Ustazah Aisha creates a fun, engaging and nurturing learning environment for young minds.',
  },
  {
    id: 'ibrahim-musa',
    name: 'Shaykh Ibrahim Musa',
    role: "Hifz & Qur'an Memorization Coach",
    category: "HIFZ & QUR'AN MEMORIZATION",
    credentials: "Hifz (Memorized the Qur'an) · Ijazah in Qur'an Recitation",
    bio: 'Shaykh Ibrahim specializes in helping students memorize the Qur\'an with correct tajweed and strong retention methods.',
  },
  {
    id: 'fatimah-al-zahra',
    name: 'Dr. Fatimah Al-Zahra',
    role: 'Advanced Islamic Studies Scholar',
    category: 'ADVANCED ISLAMIC STUDIES',
    credentials: 'Ph.D. in Islamic Thought & Civilization',
    specialization: 'Tafsir, Hadith, Fiqh',
    bio: 'Dr. Fatimah offers advanced courses for serious learners seeking deeper understanding and application.',
  },
];

export function normalizeFacultyCard(row: unknown): FacultyCard | null {
  if (!row || typeof row !== 'object') return null;
  const record = row as Record<string, unknown>;
  const id = String(record.id || '').trim();
  const name = String(record.name || '').trim();
  if (!id || !name) return null;
  const specialization = String(record.specialization || '').trim();
  return {
    id,
    name,
    role: String(record.role || '').trim(),
    category: String(record.category || '').trim(),
    credentials: String(record.credentials || '').trim(),
    specialization: specialization || undefined,
    bio: String(record.bio || '').trim(),
  };
}

export function parseFacultyCards(value: unknown): FacultyCard[] | null {
  let raw = value;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(raw)) return null;
  return raw.map(normalizeFacultyCard).filter((card): card is FacultyCard => Boolean(card));
}
