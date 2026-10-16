import { dbClient } from './dbClient';
import { fetchAllRows } from './supabasePaging';
import { getUserRole, parseUserRecord } from './userDataHelpers';
import type { UserData } from '@/types/user';

/**
 * Full row select — avoids PostgREST failures when optional columns are missing
 * from the schema (a bad column list returns zero rows / throws).
 */
export const USER_FULL_SELECT = '*';

/** @deprecated Use USER_FULL_SELECT — kept for call-site compatibility. */
export const USER_ADMIN_COLUMNS = USER_FULL_SELECT;

export const USER_BILLING_COLUMNS =
  'id,name,email,role,status,paymentVerified,tuitionPlan,base_usd_price';

export const USER_CONTACT_COLUMNS = 'id,name,email,role';

// Uses full select: `pendingProfileUpdate` and other optional fields are not
// guaranteed top-level columns in every environment, and a bad column list makes
// PostgREST throw / return zero rows. `*` is safe and still returns everything.
export const USER_TEACHER_LIST_COLUMNS = USER_FULL_SELECT;

export const USER_TEACHER_STUDENT_MATCH_COLUMNS =
  'id,name,email,role,schedule';

export const USER_TEACHER_PORTAL_COLUMNS =
  'id,name,email,role,schedule,tuitionPlan,homeworkInbox,feedback,progress,attendanceLog,country';

export const USER_ANALYTICS_COLUMNS =
  'id,role,status,base_usd_price,name,tuitionPlan,paymentVerified,createdAt,date';

export const USER_EMAIL_COLUMNS = 'id,email,role,name';

export const USER_LIVE_CLASS_COLUMNS = 'id,name,email,role,publicProfile';

export const USER_METRICS_COLUMNS = 'id,role';

// The public Teachers page is fetched from the BROWSER by logged-out visitors,
// so this query runs as the anon role against the users table. It used to be
// `*`, which handed every column to anyone who asked -- including teacher email
// addresses and phone numbers, harvestable with nothing but the anon key that
// ships in the client bundle.
//
// Narrowed to exactly what the page renders. This is also what makes the
// column-level GRANT in sql/2026-09-07-rls-hardening.sql safe: with `*` the
// page would break the moment anon loses the other columns.
export const USER_PUBLIC_TEACHER_COLUMNS = 'id,name,role,publicProfile';

type UserRow = Record<string, unknown>;

interface PageResult<T> {
  data: T[] | null;
  error: { message: string } | null;
}

type UserPageQuery = (from: number, to: number) => PromiseLike<PageResult<UserRow>>;

function usersSelectPage(select: string): UserPageQuery {
  return (from, to) =>
    dbClient().from('users').select(select).range(from, to) as unknown as PromiseLike<PageResult<UserRow>>;
}

function parseRows(rows: UserRow[]): UserData[] {
  return rows.map((row) => parseUserRecord(row)) as unknown as UserData[];
}

function roleMatches(user: UserRow, roles: string[]): boolean {
  const role = getUserRole(user.role)?.toLowerCase();
  if (!role) return false;
  return roles.some((r) => r.toLowerCase() === role);
}

function hasPreferredSchedule(user: UserRow): boolean {
  const pref = user.preferredSchedule;
  if (pref == null) return false;
  if (Array.isArray(pref)) return pref.length > 0;
  if (typeof pref === 'string') {
    const trimmed = pref.trim();
    return trimmed !== '' && trimmed !== '[]' && trimmed !== 'null';
  }
  return true;
}

/** Fetch every user row, paging past the PostgREST 1000-row cap. */
export async function fetchAllUsers(select = USER_FULL_SELECT): Promise<UserRow[]> {
  return fetchAllRows<UserRow>(usersSelectPage(select));
}

export async function fetchAllUsersParsed(select = USER_FULL_SELECT): Promise<UserData[]> {
  return parseRows(await fetchAllUsers(select));
}

/** Fetch users matching any of the given roles (filters client-side — role is JSON in DB). */
export async function fetchUsersByRoles(
  roles: string[],
  select = USER_FULL_SELECT
): Promise<UserData[]> {
  const rows = await fetchAllUsers(select);
  return parseRows(rows.filter((u) => roleMatches(u, roles)));
}

export async function fetchUsersByRolesRaw(
  roles: string[],
  select = USER_FULL_SELECT
): Promise<UserRow[]> {
  const rows = await fetchAllUsers(select);
  return rows.filter((u) => roleMatches(u, roles));
}

/** Non-admin users for communications / broadcast pickers. */
export async function fetchNonAdminUsers(): Promise<UserRow[]> {
  const all = await fetchAllUsers(USER_FULL_SELECT);
  return all
    .filter((u) => {
      const role = getUserRole(u.role);
      return role !== 'admin' && role !== 'super_admin';
    })
    .sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? '')));
}

/** Students/parents with a preferred schedule set (for matchmaking). */
export async function fetchStudentsWithPreferredSchedule(): Promise<UserRow[]> {
  const all = await fetchAllUsers(USER_FULL_SELECT);
  return all.filter(
    (u) => roleMatches(u, ['student', 'parent']) && hasPreferredSchedule(u)
  );
}
