import { getSchedule } from '@/lib/userDataHelpers';
import { unwrapJsonString } from '@/lib/userDataHelpers';
import { resolveClassStatus } from '@/lib/timezoneUtils';
import type { ScheduleSlot } from '@/types/content';

/** Same sanitizer teachers and assigned slots already use for Jitsi room names. */
export function teacherClassroomRoom(email?: string | null): string {
  const clean = unwrapJsonString(email) || '';
  if (!clean) return 'Ilmvers_General';
  return 'Ilmvers_' + clean.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
}

export function slotClassroomRoom(slot?: ScheduleSlot | null): string {
  if (slot?.roomID) return slot.roomID;
  if (slot?.teacherEmail) return teacherClassroomRoom(slot.teacherEmail);
  return 'Ilmvers_General';
}

/** Student's live / today / first assigned room — always the teacher's room. */
export function studentClassroomRoom(schedule: unknown, now = new Date()): string {
  const slots = getSchedule(schedule as ScheduleSlot[] | string | undefined);
  for (const slot of slots) {
    if (!slot.day || !slot.time) continue;
    const tz = slot.timezone || 'UTC';
    const { isLive } = resolveClassStatus(slot.day, slot.time, tz);
    if (isLive) return slotClassroomRoom(slot);
  }
  for (const slot of slots) {
    if (!slot.day) continue;
    const tz = slot.timezone || 'UTC';
    try {
      const day = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'long' }).format(now);
      if (slot.day.toLowerCase() === day.toLowerCase()) return slotClassroomRoom(slot);
    } catch {
      /* ignore invalid tz */
    }
  }
  const withRoom = slots.find((s) => s.roomID || s.teacherEmail);
  return slotClassroomRoom(withRoom);
}

export function classroomSessionHref(opts: { role?: 'teacher' | 'student'; room: string }): string {
  const params = new URLSearchParams({ room: opts.room });
  if (opts.role === 'teacher') params.set('role', 'teacher');
  return `/portal/classroom/session?${params.toString()}`;
}

export function isPracticeClassroom(room?: string | null): boolean {
  return (room || '').includes('_practice_');
}

export function practiceClassroomHref(opts: {
  role?: 'teacher' | 'student';
  liveRoom: string;
  email?: string | null;
}): string {
  const local = (unwrapJsonString(opts.email) || 'guest').split('@')[0].replace(/[^a-zA-Z0-9]/g, '_');
  return classroomSessionHref({
    role: opts.role,
    room: `${opts.liveRoom}_practice_${local}`,
  });
}
