import { supabase } from '@/lib/supabase';

/** Authenticated fetch using the current Supabase session bearer token. */
export async function authFetch(path: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not signed in');
  try {
    return await fetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        ...(options.headers || {}),
      },
    });
  } catch (err) {
    console.error('authFetch failed:', path, err);
    throw err;
  }
}
