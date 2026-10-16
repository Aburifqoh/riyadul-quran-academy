import { supabase } from './supabase';
import { parseUserRecord } from './userDataHelpers';
import type { UserData } from '@/types/user';

export async function getUserData(uid: string): Promise<UserData | null> {
  try {
    const { data: userData } = await supabase.from('users').select('*').eq('id', uid).single();
    if (!userData) return null;
    return parseUserRecord(userData as Record<string, unknown>) as unknown as UserData;
  } catch (error) {
    console.error('Error fetching unified user data:', error);
    return null;
  }
}
