import { normalizeBillingFields } from '@/lib/billing';
import type { HomeworkItem, ProgressItem, ScheduleSlot } from '@/types/content';
import type { JsonValue } from '@/types/json';
import type { AdminRecord } from '@/types/records';
import type { UserData } from '@/types/user';
import type { ScheduleChangeRequest, PendingAvailabilityUpdate } from '@/types/scheduling';

/** JSON/JSONB columns on the users table that may arrive as strings from Supabase. */
export const USER_JSON_FIELDS = [
  'schedule', 'homeworkInbox', 'inbox', 'feedback', 'progress',
  'attendanceLog', 'assignedResources', 'studentProfile',
  'publicProfile', 'pendingProfileUpdate', 'availabilitySlots',
  'qualifications', 'preferredSchedule', 'stats',
  'scheduleChangeRequest', 'pendingAvailabilityUpdate',
] as const;

/** Normalize role from users table (stored as JSON in some environments). */
export function getUserRole(role: unknown): string | undefined {
  if (role == null || role === '') return undefined;
  if (typeof role === 'string') {
    const trimmed = role.trim();
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      trimmed.startsWith('{') ||
      trimmed.startsWith('[')
    ) {
      try {
        return getUserRole(JSON.parse(trimmed));
      } catch {
        if (trimmed.startsWith('"') && trimmed.endsWith('"')) return trimmed.slice(1, -1);
      }
    }
    return trimmed;
  }
  if (Array.isArray(role)) return getUserRole(role[0]);
  if (typeof role === 'object') {
    const rec = role as Record<string, unknown>;
    if ('role' in rec) return getUserRole(rec.role);
    if (typeof rec.value === 'string') return getUserRole(rec.value);
  }
  const asString = String(role);
  return asString === '[object Object]' ? undefined : asString;
}

const LOGIN_PORTAL_KEY = 'ilmvers_login_portal';

export type LoginPortal = 'admin' | 'teacher' | 'student';

function portalFromRole(role: unknown): LoginPortal | undefined {
  const resolved = getUserRole(role);
  if (resolved === 'admin' || resolved === 'super_admin') return 'admin';
  if (resolved === 'teacher') return 'teacher';
  if (resolved === 'student' || resolved === 'parent') return 'student';
  return undefined;
}

function portalFromPathname(pathname?: string): LoginPortal | undefined {
  if (!pathname) return undefined;
  if (
    pathname.startsWith('/portal/admin')
    || pathname.startsWith('/admin-login')
    || pathname === '/admin'
    || pathname.startsWith('/admin/')
  ) {
    return 'admin';
  }
  if (pathname.startsWith('/portal/teacher') || pathname.startsWith('/teacher-login')) {
    return 'teacher';
  }
  if (pathname === '/login' || pathname.startsWith('/parent')) return 'student';
  return undefined;
}

function pathForPortal(portal: LoginPortal): string {
  if (portal === 'admin') return '/portal/admin/login';
  if (portal === 'teacher') return '/teacher-login';
  return '/login';
}

/** Persist which login screen this tab should return to after logout. */
export function rememberLoginPortal(hint?: unknown, pathname?: string): void {
  if (typeof window === 'undefined') return;
  const portal = portalFromRole(hint) || portalFromPathname(typeof hint === 'string' ? hint : pathname);
  if (!portal) return;
  try {
    sessionStorage.setItem(LOGIN_PORTAL_KEY, portal);
  } catch {
    /* ignore */
  }
}

export function rememberedLoginPath(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const portal = sessionStorage.getItem(LOGIN_PORTAL_KEY);
    if (portal === 'admin' || portal === 'teacher' || portal === 'student') {
      return pathForPortal(portal);
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

/** Where to send someone after logout or a missing session. */
export function loginPathFor(opts: { role?: unknown; pathname?: string; search?: string } = {}): string {
  const pathname = opts.pathname
    || (typeof window !== 'undefined' ? window.location.pathname : undefined);
  const role = getUserRole(opts.role);
  const query = opts.search?.startsWith('?') ? opts.search.slice(1) : opts.search;
  const urlRole = query ? new URLSearchParams(query).get('role') : null;
  const urlPortal = query ? new URLSearchParams(query).get('portal') : null;

  if (urlPortal === 'student' || urlRole === 'student') return '/login';
  if (urlRole === 'teacher' || urlPortal === 'teacher') return '/teacher-login';
  if (urlRole === 'admin' || urlPortal === 'admin') return '/portal/admin/login';

  const portal = portalFromRole(role) || portalFromPathname(pathname);
  if (portal) return pathForPortal(portal);
  return rememberedLoginPath() || '/login';
}

export function hasPendingProfileUpdate(value: unknown): boolean {
  if (value == null || value === false) return false;
  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase();
    return trimmed !== '' && trimmed !== 'null' && trimmed !== '{}' && trimmed !== '[]';
  }
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value as object).length > 0;
  return Boolean(value);
}

export function unwrapJsonString(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      trimmed.startsWith('{') ||
      trimmed.startsWith('[')
    ) {
      try {
        const parsed = JSON.parse(trimmed);
        if (typeof parsed === 'string') return parsed;
      } catch {
        if (trimmed.startsWith('"') && trimmed.endsWith('"')) return trimmed.slice(1, -1);
      }
    }
    return trimmed;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return undefined;
}

export function parseUserRecord<T extends Record<string, unknown>>(user: T): T {
  const parsed = { ...user };
  for (const field of USER_JSON_FIELDS) {
    const value = parsed[field as keyof T];
    if (typeof value === 'string') {
      try {
        (parsed as Record<string, unknown>)[field] = JSON.parse(value);
      } catch {
        // keep original string
      }
    }
  }
  if ('role' in parsed) {
    (parsed as Record<string, unknown>).role = getUserRole(parsed.role);
  }
  for (const field of ['email', 'name', 'tuitionPlan'] as const) {
    if (field in parsed) {
      const unwrapped = unwrapJsonString(parsed[field as keyof T]);
      if (unwrapped !== undefined) {
        (parsed as Record<string, unknown>)[field] = unwrapped;
      }
    }
  }
  return normalizeBillingFields(parsed);
}

export function parseScheduleChangeRequest(
  raw: ScheduleChangeRequest | string | undefined | null
): ScheduleChangeRequest | null {
  if (!raw) return null;
  let value: unknown = raw;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  return typeof value === 'object' && value !== null ? value as ScheduleChangeRequest : null;
}

export function parsePendingAvailabilityUpdate(
  raw: PendingAvailabilityUpdate | string | undefined | null
): PendingAvailabilityUpdate | null {
  if (!raw) return null;
  let value: unknown = raw;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  return typeof value === 'object' && value !== null ? value as PendingAvailabilityUpdate : null;
}

export function getSchedule(schedule?: ScheduleSlot[] | string): ScheduleSlot[] {
  if (!schedule) return [];
  if (Array.isArray(schedule)) return schedule;
  try {
    const parsed = JSON.parse(schedule);
    return Array.isArray(parsed) ? parsed as ScheduleSlot[] : [];
  } catch {
    return [];
  }
}

export function getAssignedTeacherName(schedule?: ScheduleSlot[] | string): string {
  const slot = getAssignedClassSlots(schedule)[0];
  return slot?.teacherName || slot?.teacher || 'Unassigned';
}

export function getAssignedClassSlots(schedule?: ScheduleSlot[] | string): ScheduleSlot[] {
  return getSchedule(schedule).filter((slot) => Boolean(slot.day && slot.time));
}

export function slotBelongsToTeacher(
  slot: ScheduleSlot,
  teacher: { id?: string; email?: string } | string
): boolean {
  const keys = (typeof teacher === 'string'
    ? [teacher]
    : [teacher.id, teacher.email]
  )
    .filter(Boolean)
    .map((value) => String(value).toLowerCase().trim());
  if (keys.length === 0) return false;
  const slotKeys = [slot.teacherId, slot.teacherEmail]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase().trim());
  return slotKeys.some((key) => keys.includes(key));
}

export function getStudentPlanDays(user?: { planDays?: number } | null): number {
  return typeof user?.planDays === 'number' && user.planDays > 0 ? user.planDays : 2;
}

/** How many free periods a student may offer. The plan size is the minimum; extras give matching more choices. */
export const MAX_STUDENT_PREFERENCE_SLOTS = 14;

export function studentPreferenceBounds(planDays?: number): { plan: number; min: number; max: number } {
  const plan = getStudentPlanDays({ planDays });
  return { plan, min: plan, max: Math.max(plan, MAX_STUDENT_PREFERENCE_SLOTS) };
}

/** Preferences are a pool of free periods, not the classes that will be booked. */
export function validateStudentPreferenceSlots(slots: ScheduleSlot[], planDays?: number): string | null {
  const { plan, min, max } = studentPreferenceBounds(planDays);
  if (slots.some(s => !s.day || !s.time)) return 'All free periods must have a day and time';
  if (slots.length < min) {
    return `Add at least ${min} free period${min === 1 ? '' : 's'}. Your plan includes ${plan} class${plan === 1 ? '' : 'es'} a week, and extra times give us more ways to match a teacher.`;
  }
  if (slots.length > max) return `You can list up to ${max} free periods.`;
  const keys = slots.map(s => `${s.day}|${s.time}`);
  if (new Set(keys).size !== keys.length) return 'Each day and time can only be listed once.';
  return null;
}

export function getProgressArray(progress?: ProgressItem[] | JsonValue): ProgressItem[] {
  if (!progress) return [];
  return Array.isArray(progress) ? progress as ProgressItem[] : [];
}

function parseHomeworkList(inbox?: HomeworkItem[] | JsonValue | string | null): HomeworkItem[] {
  if (!inbox) return [];
  if (Array.isArray(inbox)) return inbox as HomeworkItem[];
  if (typeof inbox === 'string') {
    try {
      const parsed = JSON.parse(inbox);
      return Array.isArray(parsed) ? parsed as HomeworkItem[] : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function homeworkItemId(hw: HomeworkItem, index = 0): string {
  if (hw.id) return hw.id;
  return `legacy_${index}_${hw.dateAssigned || hw.date || hw.dueDate || index}`;
}

export function getHomeworkArray(inbox?: HomeworkItem[] | JsonValue | string | null): HomeworkItem[] {
  return parseHomeworkList(inbox).map((hw, index) => (
    hw.id ? hw : { ...hw, id: homeworkItemId(hw, index) }
  ));
}

/** Teachers store instructions in `text`; older rows used `task` or `title`. */
export function homeworkLabel(hw?: HomeworkItem | null): string {
  if (!hw) return 'Assignment';
  const label = hw.title || hw.task || hw.text;
  return (typeof label === 'string' && label.trim()) ? label.trim() : 'Assignment';
}

export function getAttendanceArray(
  log?: JsonValue[] | string | null
): Array<{ date?: string; subject?: string; status?: string; durationMinutes?: number }> {
  if (!log) return [];
  if (Array.isArray(log)) {
    return log as Array<{ date?: string; subject?: string; status?: string; durationMinutes?: number }>;
  }
  if (typeof log === 'string') {
    try {
      const parsed = JSON.parse(log);
      return Array.isArray(parsed)
        ? parsed as Array<{ date?: string; subject?: string; status?: string; durationMinutes?: number }>
        : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function displayValue(value: JsonValue | undefined | null): string {
  if (value == null) return '';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '[]' || trimmed === '{}' ? '' : value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    const strings = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
    return strings.join(', ');
  }
  if (typeof value === 'object') return '';
  return '';
}

export function asAdminRecord(data: UserData | AdminRecord): AdminRecord {
  return data as unknown as AdminRecord;
}

export function asUserData(record: AdminRecord | UserData): UserData {
  return { ...record, id: record.id ?? '' } as UserData;
}

export function asString(value: string | undefined | null): string {
  return value ?? '';
}

export function asNumber(value: JsonValue | undefined | null, fallback = 0): number {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

export function asStringArray(value: JsonValue | undefined | null): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

export function getAvailabilitySlots(slots?: ScheduleSlot[] | string | JsonValue[]): ScheduleSlot[] {
  if (!slots) return [];
  if (Array.isArray(slots)) return slots as ScheduleSlot[];
  if (typeof slots === 'string') {
    try {
      const parsed = JSON.parse(slots);
      return Array.isArray(parsed) ? parsed as ScheduleSlot[] : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function getPreferredSchedule(schedule?: ScheduleSlot[] | string | JsonValue[]): ScheduleSlot[] {
  if (!schedule) return [];
  if (Array.isArray(schedule)) return schedule as ScheduleSlot[];
  if (typeof schedule === 'string') {
    try {
      const parsed = JSON.parse(schedule);
      return Array.isArray(parsed) ? parsed as ScheduleSlot[] : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** Honorifics that lead a teacher's name and should stay in front of the kunyah. */
const TEACHER_HONORIFICS = new Set([
  'ustadh', 'ustaadh', 'ustadha', 'ustadhah', 'ustaadha', 'ustaadhah',
  'sheikh', 'shaykh', 'shaikh', 'sheikha', 'shaykhah', 'sheikhah',
  'imam', 'imaam', 'qari', 'qariah', 'hafiz', 'hafidh', 'hafidha', 'dr',
]);

function splitHonorific(name: string): { title: string; rest: string[] } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const title: string[] = [];
  while (parts.length > 1 && TEACHER_HONORIFICS.has(parts[0].toLowerCase().replace(/\.$/, ''))) {
    title.push(parts.shift() as string);
  }
  return { title: title.join(' '), rest: parts };
}

/** First given name, with any leading honorific stripped. */
export function teacherFirstName(name?: string | null): string {
  const clean = unwrapJsonString(name) || '';
  const { rest } = splitHonorific(clean);
  return rest[0] || clean.trim();
}

/**
 * Public-facing teacher name: honorific + first name + kunyah.
 * Falls back to the stored full name when no kunyah is set, so teachers
 * without one render exactly as they did before.
 */
export function teacherPublicName(name?: string | null, kunyah?: JsonValue | null): string {
  const fullName = (unwrapJsonString(name) || '').trim();
  const kunya = displayValue(kunyah as JsonValue).trim();
  if (!kunya) return fullName;
  const { title, rest } = splitHonorific(fullName);
  const first = rest[0] || '';
  return [title, first, kunya].filter(Boolean).join(' ');
}
