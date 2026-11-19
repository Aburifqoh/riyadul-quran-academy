import { unwrapJsonString } from '@/lib/userDataHelpers';
import type { ScheduleSlot } from '@/types/content';

/** Max students who can share one teacher + day + time on a group plan. */
export const GROUP_CLASS_CAPACITY = 5;

export function isGroupTuitionPlan(plan?: unknown): boolean {
  const key = (unwrapJsonString(plan) || String(plan || ''))
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  return key === 'group';
}

export function slotBookedIds(slot?: ScheduleSlot | null): string[] {
  if (!slot) return [];
  const raw = slot.bookedBy;
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (typeof raw === 'string' && raw.trim()) return [raw.trim()];
  return [];
}

export function slotIsOpenFor(
  slot: ScheduleSlot,
  studentIsGroup: boolean
): { ok: boolean; error?: string; ids: string[] } {
  const ids = slotBookedIds(slot);
  if (ids.length === 0) return { ok: true, ids };
  if (slot.groupSlot && studentIsGroup) {
    if (ids.length >= GROUP_CLASS_CAPACITY) {
      return {
        ok: false,
        error: `This group class is full (${GROUP_CLASS_CAPACITY} students).`,
        ids,
      };
    }
    return { ok: true, ids };
  }
  return {
    ok: false,
    error: 'This time is already booked for a one-to-one class.',
    ids,
  };
}

export function applySlotBooking(
  slot: ScheduleSlot,
  studentId: string,
  studentIsGroup: boolean
): { slot: ScheduleSlot } | { error: string } {
  const check = slotIsOpenFor(slot, studentIsGroup);
  if (!check.ok) return { error: check.error || 'This slot is not available.' };
  if (check.ids.includes(studentId)) {
    return { error: 'This student is already assigned to this time.' };
  }
  const ids = [...check.ids, studentId];
  const groupSlot = studentIsGroup || Boolean(slot.groupSlot);
  return {
    slot: {
      ...slot,
      groupSlot,
      bookedBy: groupSlot ? ids : studentId,
      isBooked: groupSlot ? ids.length >= GROUP_CLASS_CAPACITY : true,
    },
  };
}

export function releaseSlotBooking(slot: ScheduleSlot, studentId: string): ScheduleSlot {
  const ids = slotBookedIds(slot).filter((id) => id !== studentId);
  if (ids.length === 0) {
    return { ...slot, isBooked: false, bookedBy: undefined, groupSlot: undefined };
  }
  return {
    ...slot,
    bookedBy: slot.groupSlot ? ids : ids[0],
    isBooked: slot.groupSlot ? ids.length >= GROUP_CLASS_CAPACITY : true,
    groupSlot: slot.groupSlot,
  };
}
