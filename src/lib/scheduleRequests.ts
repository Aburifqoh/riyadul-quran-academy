import { authFetch } from '@/lib/authFetch';
import { dbClient } from '@/lib/dbClient';

const supabase = new Proxy({} as ReturnType<typeof dbClient>, {
  get(_, prop) {
    const client = dbClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(client) : value;
  },
});
import { getSchedule, getPreferredSchedule, parseUserRecord, parseScheduleChangeRequest, parsePendingAvailabilityUpdate, getAvailabilitySlots, getAssignedClassSlots, getUserRole, getStudentPlanDays } from '@/lib/userDataHelpers';
import { isGroupTuitionPlan, slotBookedIds, slotIsOpenFor } from '@/lib/slotCapacity';
import { logActivity } from '@/lib/activityLog';
import { fetchAllUsersParsed } from '@/lib/fetchAllUsers';
import {
  sendScheduleRequestApprovedEmail,
  sendScheduleRequestRejectedEmail,
  sendAdminScheduleRequestAlert,
} from '@/lib/email';
import type { ScheduleSlot } from '@/types/content';
import type { InboxMessage } from '@/types/content';
import type { UserData } from '@/types/user';
import { formatDayAtTime } from '@/lib/timeFormat';
import type {
  ScheduleChangeRequest,
  PendingAvailabilityUpdate,
  UnifiedScheduleRequest,
  ScheduleRequestType,
} from '@/types/scheduling';
import { SCHEDULE_REQUEST_EXPIRY_DAYS } from '@/types/scheduling';
import { adminAssignStudentToTeacher } from '@/lib/db';
import { ADMIN_ALERT_EMAIL } from '@/lib/config';

function parseChangeRequest(raw: ScheduleChangeRequest | string | undefined): ScheduleChangeRequest | null {
  return parseScheduleChangeRequest(raw);
}

function parseAvailabilityUpdate(raw: PendingAvailabilityUpdate | string | undefined): PendingAvailabilityUpdate | null {
  return parsePendingAvailabilityUpdate(raw);
}

function isExpired(requestedAt?: string): boolean {
  if (!requestedAt) return false;
  const age = Date.now() - new Date(requestedAt).getTime();
  return age > SCHEDULE_REQUEST_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
}

export function buildScheduleRequestsFromUsers(users: UserData[]): UnifiedScheduleRequest[] {
  const requests: UnifiedScheduleRequest[] = [];
  const userNameById = new Map(users.map(u => [u.id, u.name || 'Unknown']));

  const resolveReviewer = (resolvedBy?: string) =>
    resolvedBy ? userNameById.get(resolvedBy) || 'Admin' : undefined;

  for (const user of users) {
    const schedule = getSchedule(user.schedule);
    const changeReq = parseChangeRequest(user.scheduleChangeRequest as ScheduleChangeRequest | undefined);
    const availReq = parseAvailabilityUpdate(user.pendingAvailabilityUpdate as PendingAvailabilityUpdate | undefined);

    if (changeReq) {
      const type: ScheduleRequestType =
        changeReq.type === 'initial' || (!schedule.length && getPreferredSchedule(user.preferredSchedule).length > 0)
          ? 'student_initial'
          : 'student_change';

      requests.push({
        id: `${user.id}-change`,
        userId: user.id,
        userName: user.name || 'Unknown',
        userEmail: user.email || '',
        userRole: user.role || 'student',
        type,
        status: changeReq.status || 'pending',
        requestedSlots: changeReq.slots || getPreferredSchedule(user.preferredSchedule),
        currentSlots: schedule,
        requestText: changeReq.text,
        rejectionNote: changeReq.rejectionNote,
        requestedAt: changeReq.requestedAt || new Date().toISOString(),
        resolvedAt: changeReq.resolvedAt,
        resolvedBy: changeReq.resolvedBy,
        resolvedByName: resolveReviewer(changeReq.resolvedBy),
        timezone: changeReq.timezone || user.timezone || user.detectedTz,
        planDays: user.planDays,
      });
    } else if (
      (getUserRole(user.role) === 'student' || getUserRole(user.role) === 'parent') &&
      getPreferredSchedule(user.preferredSchedule).length > 0 &&
      schedule.length === 0
    ) {
      requests.push({
        id: `${user.id}-initial`,
        userId: user.id,
        userName: user.name || 'Unknown',
        userEmail: user.email || '',
        userRole: user.role || 'student',
        type: 'student_initial',
        status: 'pending',
        requestedSlots: getPreferredSchedule(user.preferredSchedule),
        currentSlots: [],
        requestText: 'Initial schedule preferences',
        requestedAt: user.updatedAt || user.created_at || new Date().toISOString(),
        timezone: user.timezone || user.detectedTz,
        planDays: user.planDays,
      });
    }

    if (getUserRole(user.role) === 'teacher' && availReq) {
      requests.push({
        id: `${user.id}-availability`,
        userId: user.id,
        userName: user.name || 'Unknown',
        userEmail: user.email || '',
        userRole: 'teacher',
        type: 'teacher_availability',
        status: availReq.status || 'pending',
        requestedSlots: availReq.slots || [],
        currentSlots: user.availabilitySlots || [],
        requestText: 'Teacher availability change request',
        rejectionNote: availReq.rejectionNote,
        requestedAt: availReq.requestedAt || new Date().toISOString(),
        resolvedAt: availReq.resolvedAt,
        resolvedBy: availReq.resolvedBy,
        resolvedByName: resolveReviewer(availReq.resolvedBy),
        timezone: availReq.timezone || user.timezone,
      });
    }
  }

  return requests.sort(
    (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
  );
}

export async function getPendingScheduleRequestCount(): Promise<number> {
  const users = await fetchAllUsersParsed();
  return buildScheduleRequestsFromUsers(users).filter(r => r.status === 'pending').length;
}

async function pushInboxMessage(userId: string, subject: string, body: string) {
  const { data: user } = await supabase.from('users').select('inbox').eq('id', userId).single();
  if (!user) return;

  const inbox = (user.inbox || []) as InboxMessage[];
  inbox.unshift({
    id: `msg_${Date.now()}`,
    subject,
    body,
    date: new Date().toISOString(),
    read: false,
    teacher: 'Ilmvers Administration',
  });

  await supabase.from('users').update({ inbox }).eq('id', userId);
}

export async function notifyUserScheduleDecision(
  userId: string,
  userEmail: string,
  userName: string,
  approved: boolean,
  rejectionNote?: string
) {
  const subject = approved
    ? '✅ Your schedule request was approved'
    : 'Schedule decision: your request was not approved';
  const body = approved
    ? 'Your schedule request has been approved. Log in to your portal dashboard to view your updated schedule and class times.'
    : `Your schedule request was not approved.${rejectionNote ? ` Reason: ${rejectionNote}` : ''} You may submit a new request from your portal settings.`;

  await pushInboxMessage(userId, subject, body);

  if (userEmail && typeof window === 'undefined') {
    if (approved) {
      await sendScheduleRequestApprovedEmail(userEmail, userName);
    } else {
      await sendScheduleRequestRejectedEmail(userEmail, userName, rejectionNote || 'No reason provided.');
    }
  }
}

export async function notifyAdminsNewScheduleRequest(
  requesterName: string,
  requestType: string
) {
  if (typeof window !== 'undefined') {
    try {
      await authFetch('/api/schedule-request/notify', {
        method: 'POST',
        body: JSON.stringify({ requesterName, requestType }),
      });
    } catch (error) {
      console.error('Failed to notify admins of schedule request:', error);
    }
    return;
  }

  await sendAdminScheduleRequestAlert(ADMIN_ALERT_EMAIL, requesterName, requestType);
}

export function checkSlotConflicts(
  allUsers: UserData[],
  teacherId: string,
  day: string,
  time: string,
  excludeStudentId?: string
): string | null {
  const teacher = allUsers.find(u => u.id === teacherId);
  if (!teacher) return 'Teacher not found';

  const slots = teacher.availabilitySlots || [];
  const slot = slots.find(s => s.day === day && s.time === time);
  if (!slot) return 'This time slot does not exist on the teacher schedule';
  const student = excludeStudentId ? allUsers.find(u => u.id === excludeStudentId) : undefined;
  const studentIsGroup = isGroupTuitionPlan(student?.tuitionPlan);
  const occupancy = slotIsOpenFor(slot, studentIsGroup);
  if (excludeStudentId && occupancy.ids.includes(excludeStudentId)) {
    return null;
  }
  if (!occupancy.ok) {
    return occupancy.error || 'This slot is already booked by another student';
  }
  if (teacher.availabilityLocked === false && slots.length === 0) {
    return 'Teacher has no availability set';
  }

  return null;
}

export function validateStudentSlotCount(slots: ScheduleSlot[]): string | null {
  if (slots.length === 0) return 'At least one time slot is required';
  if (slots.some(s => !s.day || !s.time)) return 'All slots must have a day and time';
  return null;
}

export interface AvailabilityOrphan {
  studentId: string;
  studentName: string;
  day: string;
  time: string;
}

/** Students who would lose their booked slot if teacher availability is applied. */
export function getTeacherAvailabilityOrphans(
  allUsers: UserData[],
  currentSlots: ScheduleSlot[],
  newSlots: ScheduleSlot[]
): AvailabilityOrphan[] {
  const newSlotKeys = new Set(newSlots.map(s => `${s.day}|${s.time}`));
  const orphans: AvailabilityOrphan[] = [];

  for (const slot of currentSlots) {
    const bookedIds = slotBookedIds(slot);
    if (bookedIds.length === 0) continue;
    if (newSlotKeys.has(`${slot.day}|${slot.time}`)) continue;
    if (!slot.day || !slot.time) continue;

    for (const studentId of bookedIds) {
      const student = allUsers.find(u => u.id === studentId);
      orphans.push({
        studentId,
        studentName: student?.name || 'Student',
        day: slot.day,
        time: slot.time,
      });
    }
  }

  return orphans;
}

type SupabaseLike = Pick<typeof supabase, 'from'>;

export async function withdrawScheduleRequest(
  userId: string,
  client: SupabaseLike = supabase
): Promise<{ success: boolean; error?: string }> {
  const { data: user } = await client.from('users').select('*').eq('id', userId).single();
  if (!user) return { success: false, error: 'User not found' };

  const parsed = parseUserRecord(user) as UserData;
  const changeReq = parseChangeRequest(parsed.scheduleChangeRequest as ScheduleChangeRequest | undefined);
  const availReq = parseAvailabilityUpdate(parsed.pendingAvailabilityUpdate as PendingAvailabilityUpdate | undefined);

  const applyUpdate = async (updates: Record<string, unknown>) => {
    const { data, error } = await client
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select('id');
    if (error) return { success: false, error: error.message };
    if (!data || data.length === 0) {
      return { success: false, error: 'Update was blocked. Please refresh and try again.' };
    }
    return { success: true };
  };

  if (changeReq?.status === 'pending') {
    const updates: Record<string, unknown> = {
      scheduleChangeRequest: null,
      updatedAt: new Date().toISOString(),
    };
    if (changeReq.type === 'initial') {
      updates.preferredSchedule = null;
      updates.scheduleSelected = false;
    }
    return applyUpdate(updates);
  }

  if (getUserRole(parsed.role) === 'teacher' && availReq?.status === 'pending') {
    return applyUpdate({
      pendingAvailabilityUpdate: null,
      availabilityChangeRequested: false,
      updatedAt: new Date().toISOString(),
    });
  }

  // Initial preferences stored only as preferredSchedule (no scheduleChangeRequest
  // record, or a record without a pending status). The portal still shows these as
  // a pending request, so allow the student/parent to withdraw them.
  const preferred = getPreferredSchedule(parsed.preferredSchedule);
  const schedule = getSchedule(parsed.schedule);
  if (
    (getUserRole(parsed.role) === 'student' || getUserRole(parsed.role) === 'parent') &&
    preferred.length > 0 &&
    schedule.length === 0 &&
    changeReq?.status !== 'approved'
  ) {
    return applyUpdate({
      preferredSchedule: null,
      scheduleChangeRequest: null,
      scheduleSelected: false,
      updatedAt: new Date().toISOString(),
    });
  }

  return { success: false, error: 'No pending request to withdraw' };
}

interface ApproveOptions {
  actorId: string;
  actorRole: string;
  teacherId?: string;
  assignDay?: string;
  assignTime?: string;
  acknowledgeOrphans?: boolean;
  /** When set, only this requested slot is approved; remaining slots stay pending. */
  slotIndex?: number;
}

export async function approveScheduleRequest(
  request: UnifiedScheduleRequest,
  options: ApproveOptions
): Promise<{ success: boolean; error?: string }> {
  const allUsers = await fetchAllUsersParsed();

  if (request.type === 'student_initial' || request.type === 'student_change') {
    if (!options.teacherId || !options.assignDay || !options.assignTime) {
      return { success: false, error: 'Teacher and time slot are required to approve student requests' };
    }

    const slotError = checkSlotConflicts(
      allUsers,
      options.teacherId,
      options.assignDay,
      options.assignTime,
      request.userId
    );
    if (slotError) return { success: false, error: slotError };

    if (options.slotIndex == null && request.type === 'student_initial') {
      const countError = validateStudentSlotCount(request.requestedSlots);
      if (countError) return { success: false, error: countError };
    }

    const student = allUsers.find(u => u.id === request.userId);
    const assignedBefore = getAssignedClassSlots(student?.schedule).length;
    const planLimit = getStudentPlanDays({ planDays: request.planDays ?? student?.planDays });

    const result = await adminAssignStudentToTeacher(
      request.userId,
      options.teacherId,
      options.assignDay,
      options.assignTime,
      request.timezone || 'UTC'
    );

    if (!result.success) return result;

    const planFilled = assignedBefore + 1 >= planLimit;
    const stillOpen = options.slotIndex != null
      ? request.requestedSlots.filter((_, i) => i !== options.slotIndex)
      : request.requestedSlots;
    const remaining = planFilled ? [] : stillOpen;
    const fullyDone = remaining.length === 0;
    const closedExtras = planFilled && stillOpen.length > 0;

    await supabase.from('users').update({
      scheduleChangeRequest: {
        type: request.type === 'student_initial' ? 'initial' : 'change',
        status: fullyDone ? 'approved' : 'pending',
        slots: fullyDone ? request.requestedSlots : remaining,
        text: request.requestText,
        requestedAt: request.requestedAt,
        resolvedAt: fullyDone ? new Date().toISOString() : undefined,
        resolvedBy: fullyDone ? options.actorId : undefined,
      },
      preferredSchedule: fullyDone ? null : remaining,
    }).eq('id', request.userId);

    if (fullyDone) {
      await notifyUserScheduleDecision(
        request.userId,
        request.userEmail,
        request.userName,
        true
      );
    }

    await logActivity(supabase, {
      actorId: options.actorId,
      actorRole: options.actorRole,
      actionType: 'schedule.request_approved',
      summary: `Approved ${request.type} for ${request.userName} → ${options.assignDay} ${options.assignTime}${closedExtras ? ' (plan filled; extra options closed)' : fullyDone ? '' : ' (options remaining)'}`,
      targetType: 'student',
      targetId: request.userId,
      metadata: { teacherId: options.teacherId, day: options.assignDay, time: options.assignTime, slotIndex: options.slotIndex },
    });

    return { success: true };
  }

  if (request.type === 'teacher_availability') {
    const { data: teacher } = await supabase.from('users').select('*').eq('id', request.userId).single();
    if (!teacher) return { success: false, error: 'Teacher not found' };

    const pending = parseAvailabilityUpdate(teacher.pendingAvailabilityUpdate as PendingAvailabilityUpdate | undefined);
    const newSlots = pending?.slots || request.requestedSlots;
    const currentSlots = getAvailabilitySlots(teacher.availabilitySlots);
    const orphans = getTeacherAvailabilityOrphans(allUsers, currentSlots, newSlots);

    if (orphans.length > 0 && !options.acknowledgeOrphans) {
      const summary = orphans.map(o => `${o.studentName} (${formatDayAtTime(o.day, o.time)})`).join(', ');
      return {
        success: false,
        error: `This removes ${orphans.length} booked slot(s): ${summary}. Reassign those students first, or confirm approval to proceed anyway.`,
      };
    }

    await supabase.from('users').update({
      availabilitySlots: newSlots,
      timezone: pending?.timezone || teacher.timezone,
      availabilityLocked: true,
      availabilityChangeRequested: false,
      pendingAvailabilityUpdate: {
        ...pending,
        status: 'approved',
        resolvedAt: new Date().toISOString(),
        resolvedBy: options.actorId,
      },
      lastAvailabilityUpdate: new Date().toISOString(),
    }).eq('id', request.userId);

    await notifyUserScheduleDecision(
      request.userId,
      request.userEmail,
      request.userName,
      true
    );

    await logActivity(supabase, {
      actorId: options.actorId,
      actorRole: options.actorRole,
      actionType: 'schedule.request_approved',
      summary: `Approved availability change for ${request.userName}`,
      targetType: 'teacher',
      targetId: request.userId,
    });

    return { success: true };
  }

  return { success: false, error: 'Unknown request type' };
}

export async function rejectScheduleRequest(
  request: UnifiedScheduleRequest,
  actorId: string,
  actorRole: string,
  rejectionNote: string,
  slotIndex?: number
): Promise<{ success: boolean; error?: string }> {
  if (!rejectionNote.trim()) {
    return { success: false, error: 'A rejection note is required' };
  }

  const remaining = slotIndex != null
    ? request.requestedSlots.filter((_, i) => i !== slotIndex)
    : [];
  const fullyRejected = slotIndex == null || remaining.length === 0;
  const rejectedSlot = slotIndex != null ? request.requestedSlots[slotIndex] : undefined;

  if (request.type === 'teacher_availability') {
    if (fullyRejected) {
      await supabase.from('users').update({
        availabilityChangeRequested: false,
        pendingAvailabilityUpdate: {
          status: 'rejected',
          slots: request.requestedSlots,
          previousSlots: request.currentSlots,
          requestedAt: request.requestedAt,
          resolvedAt: new Date().toISOString(),
          resolvedBy: actorId,
          rejectionNote: rejectionNote.trim(),
        },
      }).eq('id', request.userId);
    } else {
      await supabase.from('users').update({
        availabilityChangeRequested: true,
        pendingAvailabilityUpdate: {
          status: 'pending',
          slots: remaining,
          previousSlots: request.currentSlots,
          requestedAt: request.requestedAt,
          rejectionNote: rejectionNote.trim(),
        },
      }).eq('id', request.userId);
    }
  } else if (fullyRejected) {
    const updates: Record<string, unknown> = {
      scheduleChangeRequest: {
        type: request.type === 'student_initial' ? 'initial' : 'change',
        status: 'rejected',
        slots: request.requestedSlots,
        text: request.requestText,
        requestedAt: request.requestedAt,
        resolvedAt: new Date().toISOString(),
        resolvedBy: actorId,
        rejectionNote: rejectionNote.trim(),
      },
    };

    if (request.type === 'student_initial') {
      updates.preferredSchedule = null;
    }

    await supabase.from('users').update(updates).eq('id', request.userId);
  } else {
    await supabase.from('users').update({
      scheduleChangeRequest: {
        type: request.type === 'student_initial' ? 'initial' : 'change',
        status: 'pending',
        slots: remaining,
        text: request.requestText,
        requestedAt: request.requestedAt,
        rejectionNote: rejectionNote.trim(),
      },
      preferredSchedule: remaining,
    }).eq('id', request.userId);
  }

  if (fullyRejected) {
    await notifyUserScheduleDecision(
      request.userId,
      request.userEmail,
      request.userName,
      false,
      rejectionNote.trim()
    );
  }

  await logActivity(supabase, {
    actorId,
    actorRole,
    actionType: 'schedule.request_rejected',
    summary: rejectedSlot && !fullyRejected
      ? `Rejected ${formatDayAtTime(rejectedSlot.day, rejectedSlot.time)} for ${request.userName}: ${rejectionNote.trim()}`
      : `Rejected ${request.type} for ${request.userName}: ${rejectionNote.trim()}`,
    targetType: request.userRole === 'teacher' ? 'teacher' : 'student',
    targetId: request.userId,
    metadata: { rejectionNote: rejectionNote.trim(), slotIndex },
  });

  return { success: true };
}

export async function expireStaleScheduleRequests(actorId: string, actorRole: string): Promise<number> {
  const users = await fetchAllUsersParsed();
  let expired = 0;

  for (const user of users) {
    const changeReq = parseChangeRequest(user.scheduleChangeRequest as ScheduleChangeRequest | undefined);
    const availReq = parseAvailabilityUpdate(user.pendingAvailabilityUpdate as PendingAvailabilityUpdate | undefined);

    if (changeReq?.status === 'pending' && isExpired(changeReq.requestedAt)) {
      await supabase.from('users').update({
        scheduleChangeRequest: {
          ...changeReq,
          status: 'expired',
          resolvedAt: new Date().toISOString(),
          resolvedBy: actorId,
          rejectionNote: `Automatically expired after ${SCHEDULE_REQUEST_EXPIRY_DAYS} days without a decision.`,
        },
      }).eq('id', user.id);
      expired++;
    }

    if (availReq?.status === 'pending' && isExpired(availReq.requestedAt)) {
      await supabase.from('users').update({
        pendingAvailabilityUpdate: {
          ...availReq,
          status: 'expired',
          resolvedAt: new Date().toISOString(),
          resolvedBy: actorId,
          rejectionNote: `Automatically expired after ${SCHEDULE_REQUEST_EXPIRY_DAYS} days without a decision.`,
        },
        availabilityChangeRequested: false,
      }).eq('id', user.id);
      expired++;
    }
  }

  if (expired > 0) {
    await logActivity(supabase, {
      actorId,
      actorRole,
      actionType: 'schedule.requests_expired',
      summary: `Expired ${expired} stale schedule request(s)`,
    });
  }

  return expired;
}

export async function bulkRejectScheduleRequests(
  requests: UnifiedScheduleRequest[],
  actorId: string,
  actorRole: string,
  rejectionNote: string
): Promise<{ succeeded: number; failed: number }> {
  let succeeded = 0;
  let failed = 0;

  for (const req of requests) {
    const result = await rejectScheduleRequest(req, actorId, actorRole, rejectionNote);
    if (result.success) succeeded++;
    else failed++;
  }

  return { succeeded, failed };
}
