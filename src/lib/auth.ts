import { supabase } from './supabase';
type RegistrationData = {
  email: string;
  password: string;
  name: string;
  phone?: string;
  gender?: string;
  country?: string;
  [key: string]: string | undefined;
};

type ChildRegistrationData = {
  name: string;
  age?: string;
  level?: string;
  email?: string;
  tuitionPlan?: string;
  timezone?: string;
  detectedTz?: string;
};

/**
 * Registration now happens in api/register, with the service role.
 *
 * It used to run here in the browser and could not have worked: this project
 * requires email confirmation, so supabase.auth.signUp() returns no session,
 * and the users insert that followed ran as `anon` and was refused. On top of
 * that the forms sent confirmPassword, age, level, goal and gender as if they
 * were columns, and nothing set the NOT NULL permissions column.
 *
 * Every failed attempt left an auth account with no profile row, taking the
 * address permanently — and the cleanup here called auth.admin.deleteUser from
 * the browser, which needs the service role and so never once ran.
 *
 * Signatures are unchanged so the two registration pages did not have to move.
 */
async function postRegistration(payload: unknown) {
  const res = await fetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  let data: { ok?: boolean; error?: string; userId?: string } = {};
  try {
    data = await res.json();
  } catch {
    throw new Error('The server did not respond properly. Please try again.');
  }
  if (!res.ok || !data.ok) {
    throw new Error(data.error || 'We could not complete your registration. Please try again.');
  }
  return data.userId;
}

export async function registerUser(data: RegistrationData) {
  return registerAdult(data);
}

export async function registerAdult(data: RegistrationData, turnstileToken?: string) {
  return postRegistration({ accountType: 'adult', profile: data, turnstileToken });
}

export async function registerParent(
  parentData: RegistrationData,
  childrenData: ChildRegistrationData[],
  turnstileToken?: string
) {
  return postRegistration({
    accountType: 'parent',
    profile: parentData,
    children: childrenData,
    turnstileToken,
  });
}

export async function loginUser(email: string, pass: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
  if (error) throw error;
  return data;
}

export async function logoutUser() {
  return await supabase.auth.signOut();
}

export { getUserData } from './getUserData';
