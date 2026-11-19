import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import {
  DEFAULT_FACULTY_CARDS,
  parseFacultyCards,
  type FacultyCard,
} from '@/lib/facultyCards';

const SETTINGS_KEY = 'public_faculty_cards';

async function readRow(): Promise<{ value: unknown } | null> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('system_settings')
    .select('value')
    .eq('key', SETTINGS_KEY)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function writeCards(cards: FacultyCard[]) {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from('system_settings').upsert(
    {
      key: SETTINGS_KEY,
      value: cards,
      description: 'Public scholar cards shown on the Scholars & Instructors page.',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' }
  );
  if (error) throw new Error(error.message);
}

/** Returns the saved cards. The six sample profiles are stored the first time this runs. */
export async function listFacultyCards(): Promise<FacultyCard[]> {
  const row = await readRow();
  if (!row) {
    await writeCards(DEFAULT_FACULTY_CARDS);
    return DEFAULT_FACULTY_CARDS;
  }
  return parseFacultyCards(row.value) ?? [];
}

export async function updateFacultyCard(card: FacultyCard): Promise<FacultyCard[]> {
  const cards = await listFacultyCards();
  const index = cards.findIndex((item) => item.id === card.id);
  if (index < 0) throw new Error('That instructor profile was not found.');
  const next = cards.slice();
  next[index] = card;
  await writeCards(next);
  return next;
}

export async function deleteFacultyCard(id: string): Promise<FacultyCard[]> {
  const cards = await listFacultyCards();
  if (!cards.some((item) => item.id === id)) {
    throw new Error('That instructor profile was not found.');
  }
  const next = cards.filter((item) => item.id !== id);
  await writeCards(next);
  return next;
}
