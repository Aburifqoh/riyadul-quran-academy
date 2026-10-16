import type { ScheduleSlot } from './content';

export type ScheduleRequestType = 'student_initial' | 'student_change' | 'teacher_availability';
export type ScheduleRequestStatus = 'pending' | 'approved' | 'rejected' | 'expired';

/** Stored on student/parent users for initial prefs and change requests. */
export interface ScheduleChangeRequest {
  type?: 'initial' | 'change';
  status?: ScheduleRequestStatus;
  slots?: ScheduleSlot[];
  text?: string;
  /** IANA zone the requested slots were expressed in (student's browser at submit). */
  timezone?: string;
  requestedAt?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  rejectionNote?: string;
}

/** Stored on teacher users when they request an availability update while locked. */
export interface PendingAvailabilityUpdate {
  status?: ScheduleRequestStatus;
  slots?: ScheduleSlot[];
  previousSlots?: ScheduleSlot[];
  timezone?: string;
  requestedAt?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  rejectionNote?: string;
}

/** Unified view for the super-admin Schedule Requests queue. */
export interface UnifiedScheduleRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  type: ScheduleRequestType;
  status: ScheduleRequestStatus;
  requestedSlots: ScheduleSlot[];
  currentSlots: ScheduleSlot[];
  requestText?: string;
  rejectionNote?: string;
  requestedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolvedByName?: string;
  timezone?: string;
  planDays?: number;
}

export const SCHEDULE_REQUEST_EXPIRY_DAYS = 14;
