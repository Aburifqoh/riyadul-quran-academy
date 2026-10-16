import type { UserData } from '@/types/user';
import type { JsonValue } from '@/types/json';
import type { HomeworkItem } from '@/types/content';
import type { ScheduleSlot } from '@/types/content';
import type { AdminRecord } from '@/types/records';
import { parseScheduleChangeRequest, parsePendingAvailabilityUpdate, getSchedule, parseUserRecord, getUserRole, getAvailabilitySlots, getAssignedClassSlots, getPreferredSchedule, getStudentPlanDays, getAttendanceArray, slotBelongsToTeacher, homeworkItemId, validateStudentPreferenceSlots } from '@/lib/userDataHelpers';
import { getErrorMessage } from '@/lib/errors';
import { fetchAllUsers, USER_FULL_SELECT, USER_METRICS_COLUMNS, USER_PUBLIC_TEACHER_COLUMNS, USER_TEACHER_LIST_COLUMNS, fetchUsersByRoles } from '@/lib/fetchAllUsers';
import { fetchAllRows } from '@/lib/supabasePaging';
import { dbClient } from './dbClient';
import { sendAssessmentApproval, sendScheduleAssignmentEmail, sendTeacherAssignmentAlert } from './email';
import { sendWhatsAppMessage } from './whatsapp';
import { grantPaidCycle, isSandboxAccount, monthlyTuitionAmount, parseHourlyRates, revokePaidAccess } from './billing';
import { insertWithColumnFallback, missingColumnFromError, updateWithColumnFallback } from './supabaseSafe';
import { getSupabaseAdmin } from './supabaseAdmin';
import { teacherClassroomRoom } from './classroomRoom';
import { applySlotBooking, isGroupTuitionPlan, releaseSlotBooking, slotBookedIds, slotIsOpenFor } from './slotCapacity';
import { formatDayAtTime } from './timeFormat';
import { convertSlotToTimezone, getUserTimezone } from './timezoneUtils';

const supabase = new Proxy({} as ReturnType<typeof dbClient>, {
  get(_, prop) {
    const client = dbClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(client) : value;
  },
});

// UTILS
export function getDeterministicRoomID(email: string) {
  return teacherClassroomRoom(email);
}

export { getLatestPosts, getCommunityPosts, getPostById, getTestimonials } from './publicContent';

export async function submitCommunityPost(post: {
  title: string;
  content: string;
  author: string;
  author_id?: string;
  status: 'pending_approval' | 'published';
  category?: string;
  coverImageUrl?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await insertWithColumnFallback(supabase, 'community_posts', {
    title: post.title,
    content: post.content,
    body: post.content,
    author: post.author,
    author_id: post.author_id || null,
    status: post.status,
    date: new Date().toISOString(),
    category: post.category || 'Insights',
    coverImage: post.coverImageUrl || null,
    coverImageUrl: post.coverImageUrl || null,
  });
  if (error || !data) return { success: false, error: error || 'Failed to save post' };
  return { success: true };
}


export async function submitTestimonial(data: { name: string, location: string, content: string, rating: number, user_id?: string }) {
  try {
    const { error } = await supabase.from('testimonials').insert([{ ...data, status: 'pending' }]);
    if (error) {
      console.error("Error submitting testimonial:", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error submitting testimonial:", error);
    return false;
  }
}

export async function getPublicTeachers() {
  try {
    const data = await fetchAllUsers(USER_PUBLIC_TEACHER_COLUMNS);
    return (data || [])
      .filter(t => getUserRole(t.role) === 'teacher' && t.publicProfile && (t.publicProfile as { isLive?: boolean }).isLive === true)
      .map(t => parseUserRecord(t) as unknown as UserData);
  } catch (error) {
    console.error("Error fetching public teachers:", error);
    return [];
  }
}

export async function toggleTeacherLiveStatus(teacherId: string, isLive: boolean) {
  try {
    const { data: snap } = await supabase.from('users').select('*').eq('id', teacherId).single();
    if (!snap) return false;
    
    const updatedProfile = {
      ...(snap.publicProfile || {}),
      isLive
    };
    
    await supabase.from('users').update({ publicProfile: updatedProfile }).eq('id', teacherId);
    return true;
  } catch (error) {
    console.error("Error toggling teacher live status:", error);
    return false;
  }
}

export async function getSiteMetrics() {
  try {
    const { data: snap } = await supabase.from('system_config').select('*').eq('id', 'site_metrics').single();
    if (snap) return snap;
    
    // Dynamic Fallback
    const allUsers = await fetchAllUsers(USER_METRICS_COLUMNS);
    const students = allUsers.filter(u => u.role === 'student' || u.role === 'parent').length;
    const teachers = allUsers.filter(u => u.role === 'teacher').length;

    return { 
      hoursTaught: 8900, 
      countriesReached: 20, 
      numStudents: students || 200, 
      numInstructors: teachers || 20, 
      qiraaatStudents: 20, 
      yearsOperation: 5 
    };
  } catch(e) {
    console.warn("getSiteMetrics fallback:", e);
    return { hoursTaught: 8900, countriesReached: 20, numStudents: 200, numInstructors: 20, qiraaatStudents: 20, yearsOperation: 5 };
  }
}

// TEACHER PORTAL LOGIC
export async function getTeacherStudents(teacher: { id?: string; email?: string } | string): Promise<UserData[]> {
  try {
    const teacherRef = typeof teacher === 'string' ? { email: teacher, id: teacher } : teacher;
    if (!teacherRef.id && !teacherRef.email) return [];
    const students: UserData[] = [];
    // NOTE: `role` is a JSON(B) column, so it can't be filtered with a plain
    // `.in('role', [...])` (PostgREST parses the values as JSON and rejects
    // them). Fetch the rows and filter by role client-side via getUserRole.
    const page = (from: number, to: number) =>
      supabase
        .from('users')
        .select(USER_FULL_SELECT)
        .range(from, to) as unknown as PromiseLike<{ data: AdminRecord[] | null; error: { message: string } | null }>;
    const snap = await fetchAllRows<AdminRecord>(page);

    snap.forEach(data => {
      const role = getUserRole(data.role);
      if (role !== 'student' && role !== 'parent') return;
      const schedule = getSchedule(data.schedule as string | ScheduleSlot[] | undefined);
      if (schedule.some((s) => slotBelongsToTeacher(s, teacherRef))) {
        students.push(parseUserRecord(data) as unknown as UserData);
      }
    });
    return students;
  } catch (error) {
    console.error("Error getting teacher students:", error);
    return [];
  }
}

export async function teacherUpdateStudent(
  studentId: string,
  payload: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const result = await updateWithColumnFallback(supabase, 'users', payload, {
    column: 'id',
    value: studentId,
  });
  if (result.error) return { success: false, error: result.error };
  return { success: true };
}

export async function updateAttendance(studentId: string, status: string, subject?: string, isTick?: boolean) {
  try {
    const { data: user } = await supabase.from('users').select('attendanceLog').eq('id', studentId).single();
    if (!user) return false;

    const logs = [...getAttendanceArray(user.attendanceLog)];
    const todayStr = new Date().toISOString().split('T')[0];
    const sub = subject || 'Class';
    const existingIndex = logs.findIndex((l) => l.date && l.date.startsWith(todayStr) && l.subject === sub);

    if (existingIndex >= 0) {
      const currentDuration = logs[existingIndex].durationMinutes || 0;
      const newDuration = isTick ? currentDuration + 1 : currentDuration;
      logs[existingIndex] = {
        ...logs[existingIndex],
        durationMinutes: newDuration,
        status: isTick ? (newDuration >= 40 ? 'Present' : 'Absent') : status,
        date: new Date().toISOString(),
      };
    } else {
      logs.push({
        date: new Date().toISOString(),
        subject: sub,
        status: isTick ? 'Absent' : status,
        durationMinutes: isTick ? 1 : 0,
      });
    }

    const result = await updateWithColumnFallback(supabase, 'users', { attendanceLog: logs }, {
      column: 'id',
      value: studentId,
    });
    return !result.error;
  } catch (error) {
    console.error('Error updating attendance:', error);
    return false;
  }
}



export async function autoLogAttendance(uid: string, userData: UserData) {
  try {
    if (!uid || !userData) return false;

    const logEntry = {
      name: userData.name,
      email: userData.email,
      role: userData.role || 'student',
      timestamp: new Date().toISOString(),
      id: 'att_' + Date.now()
    };

    await supabase.from('attendance_logs').insert(logEntry);
    
    return true;
  } catch (error) {
    console.error("Error auto-logging attendance:", error);
    return false;
  }
}

type UserClient = Pick<typeof supabase, 'from'>;

async function findTeacherRow(teacherKey: string, client: UserClient = supabase) {
  if (!teacherKey) return null;
  const byId = await client.from('users').select('*').eq('id', teacherKey).maybeSingle();
  if (byId.data) return byId.data;
  const byEmail = await client.from('users').select('*').eq('email', teacherKey).maybeSingle();
  return byEmail.data || null;
}

export async function getTeacherAvailability(teacherKey: string) {
  try {
    if (!teacherKey) return { slots: [], locked: false, changeRequested: false };
    const snap = await findTeacherRow(teacherKey);
    if (snap) {
      return {
        slots: getAvailabilitySlots(snap.availabilitySlots),
        locked: Boolean(snap.availabilityLocked),
        changeRequested: Boolean(snap.availabilityChangeRequested),
      };
    }
    return { slots: [], locked: false, changeRequested: false };
  } catch (error) {
    console.error("Error getting teacher availability:", error);
    return { slots: [], locked: false, changeRequested: false };
  }
}

export async function saveTeacherAvailability(
  teacherKey: string,
  slots: ScheduleSlot[],
  timezone: string = 'UTC',
  client: UserClient = supabase
): Promise<{ success: boolean; error?: string }> {
  try {
    const snap = await findTeacherRow(teacherKey, client);
    if (!snap) return { success: false, error: 'Teacher profile not found.' };

    const existing = getAvailabilitySlots(snap.availabilitySlots);
    const booked = existing.filter(s => slotBookedIds(s).length > 0 || s.isBooked);
    const merged = slots.map(s => {
      const prev = booked.find(b => b.day === s.day && b.time === s.time);
      return prev
        ? { ...s, isBooked: prev.isBooked, bookedBy: prev.bookedBy, groupSlot: prev.groupSlot }
        : { ...s, isBooked: false, bookedBy: undefined, groupSlot: undefined };
    });

    const result = await updateWithColumnFallback(
      client,
      'users',
      {
        availabilitySlots: merged,
        timezone,
        lastAvailabilityUpdate: new Date().toISOString(),
        availabilityLocked: true,
        availabilityChangeRequested: false,
        updatedAt: new Date().toISOString(),
      },
      { column: 'id', value: snap.id }
    );

    if (result.error) return { success: false, error: result.error };
    if (result.dropped.includes('availabilitySlots')) {
      return {
        success: false,
        error: 'The availabilitySlots column is missing. Run teacher_availability.sql in Supabase, then try again.',
      };
    }
    return { success: true };
  } catch (error) {
    console.error("Error saving availability:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function submitHomework(studentKey: string, teacherName: string, homeworkText: string, dueDate: string) {
  try {
    const { data: byId } = await supabase.from('users').select('*').eq('id', studentKey).maybeSingle();
    const snap = byId || null;
    if (!snap) return false;

    const parsed = parseUserRecord(snap as Record<string, unknown>);
    const inbox = Array.isArray(parsed.homeworkInbox) ? [...parsed.homeworkInbox as HomeworkItem[]] : [];
    inbox.push({
      id: 'hw_' + Date.now(),
      teacher: teacherName,
      title: homeworkText.slice(0, 80),
      task: homeworkText,
      text: homeworkText,
      dueDate,
      date: new Date().toISOString(),
      status: 'pending',
    });

    const result = await updateWithColumnFallback(supabase, 'users', { homeworkInbox: inbox }, {
      column: 'id',
      value: String(snap.id),
    });
    return !result.error;
  } catch (error) {
    console.error('Error submitting homework:', error);
    return false;
  }
}

export async function submitHomeworkResponse(studentId: string, hwId: string, responseType: 'text' | 'audio', responseData: string) {
  try {
    const { data: snap } = await supabase.from('users').select('*').eq('id', studentId).single();
    if (!snap) return false;
    
    const parsed = parseUserRecord(snap as Record<string, unknown>);
    const inbox = Array.isArray(parsed.homeworkInbox) ? parsed.homeworkInbox as HomeworkItem[] : [];
    
    const updatedInbox = inbox.map((hw: HomeworkItem, index: number) => {
      const matches = hw.id === hwId || (!hw.id && homeworkItemId(hw, index) === hwId);
      if (matches) {
        return { 
          ...hw,
          id: hw.id || hwId,
          status: 'submitted', 
          response: { type: responseType, data: responseData, submittedAt: new Date().toISOString() } 
        };
      }
      return hw;
    });

    const result = await updateWithColumnFallback(supabase, 'users', { homeworkInbox: updatedInbox }, {
      column: 'id',
      value: studentId,
    });
    return !result.error;
  } catch (error) {
    console.error("Error submitting homework response:", error);
    return false;
  }
}

export async function gradeHomework(studentId: string, hwId: string, grade: string, feedback: string) {
  try {
    const { data: snap } = await supabase.from('users').select('*').eq('id', studentId).single();
    if (!snap) return false;

    const parsed = parseUserRecord(snap as Record<string, unknown>);
    const inbox = Array.isArray(parsed.homeworkInbox) ? parsed.homeworkInbox as HomeworkItem[] : [];
    const updatedInbox = inbox.map((hw) => (
      hw.id === hwId
        ? { ...hw, status: 'graded', grade, teacherFeedback: feedback, gradedAt: new Date().toISOString() }
        : hw
    ));

    const result = await updateWithColumnFallback(supabase, 'users', { homeworkInbox: updatedInbox }, {
      column: 'id',
      value: studentId,
    });
    return !result.error;
  } catch (error) {
    console.error('Error grading homework:', error);
    return false;
  }
}

export async function activateUserPlan(uid: string, plan: string, amountPaid: number, days?: number, months = 1) {
  try {
    const baseRates: Record<string, number> = { 'group': 64, 'onetoone': 80, 'ijazah': 96, 'hifdh_intensive': 150 };
    const base = baseRates[plan] || 64;
    const discountAmount = Math.max(0, base - (amountPaid || base));

    const updateData: Record<string, JsonValue | string | number | boolean | null> = {
      ...grantPaidCycle({ tuitionPlan: plan, months }),
      paymentStatus: 'active',
      discountAmount: discountAmount,
      updatedAt: new Date().toISOString(),
    };

    if (days) {
      updateData.planDays = days;
    }

    await supabase.from('users').update(updateData).eq('id', uid);

    return true;
  } catch (error) {
    console.error("Error activating user plan:", error);
    return false;
  }
}

export async function getAllUsers() {
  try {
    const data = await fetchAllUsers('*');
    if (!data.length) return [];
    
    const jsonFields = [
      'schedule', 'homeworkInbox', 'inbox', 'feedback', 'progress', 
      'attendanceLog', 'assignedResources', 'studentProfile', 
      'publicProfile', 'pendingProfileUpdate', 'availabilitySlots', 
      'qualifications', 'preferredSchedule', 'stats',
      'scheduleChangeRequest', 'pendingAvailabilityUpdate',
    ];

    return data.map(user => {
      for (const field of jsonFields) {
        if (typeof user[field] === 'string') {
          try {
            user[field] = JSON.parse(user[field]);
          } catch {}
        }
      }
      return user;
    });
  } catch (error) {
    console.error("Error fetching all users:", error);
    return [];
  }
}

export async function getCertificate(id: string) {
  try {
    const { data } = await supabase.from('certificates').select('*').eq('id', id.toUpperCase()).single();
    return data;
  } catch (error) {
    console.error("Error fetching certificate:", error);
    return null;
  }
}

export async function getAvailableTeachersWithSlots() {
  try {
    const snap = await fetchAllUsers(USER_TEACHER_LIST_COLUMNS);
    const teachers = snap.filter(u => getUserRole(u.role) === 'teacher');
    const availableSlots: AdminRecord[] = [];

    teachers.forEach(raw => {
      const data = parseUserRecord(raw);
      const slots = data.availabilitySlots;
      if (slots && Array.isArray(slots)) {
        slots.forEach((slot) => {
          const s = slot as ScheduleSlot;
          if (slotIsOpenFor(s, true).ok || slotIsOpenFor(s, false).ok) {
            availableSlots.push({
              id: `${String(data.id)}_${s.day}_${s.time}`.replace(/\s+/g, ''),
              day: s.day,
              time: s.time,
              teacher: String(data.name || 'Instructor'),
              teacherEmail: String(data.email ?? ''),
              teacherId: String(data.id ?? ''),
              timezone: String(s.timezone || data.timezone || data.detectedTz || 'UTC'),
              available: true
            });
          }
        });
      }
    });
    return availableSlots;
  } catch (error) {
    console.error("Error fetching available teachers with slots:", error);
    return [];
  }
}

export async function bookTeacherSlot(teacherId: string, day: string, time: string) {
  try {
    const { data: snap } = await supabase.from('users').select('*').eq('id', teacherId).single();
    if (!snap) return false;

    const slots = snap.availabilitySlots || [];

    let updated = false;
    const newSlots = slots.map((s: ScheduleSlot) => {
      if (s.day === day && s.time === time && !s.isBooked) {
        updated = true;
        return { ...s, isBooked: true };
      }
      return s;
    });

    if (updated) {
      await supabase.from('users').update({ availabilitySlots: newSlots }).eq('id', teacherId);
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error booking teacher slot:", error);
    return false;
  }
}

export async function submitTeacherProfileForApproval(teacherId: string, profileData: Record<string, JsonValue>) {
  try {
    const result = await updateWithColumnFallback(supabase, 'users', {
      pendingProfileUpdate: {
        ...profileData,
        submittedAt: new Date().toISOString()
      }
    }, { column: 'id', value: teacherId });
    if (result.error) {
      console.error('Error submitting profile:', result.error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error submitting profile for approval:", error);
    return false;
  }
}

export async function approveTeacherProfile(teacherId: string) {
  try {
    const { data: snap } = await supabase.from('users').select('*').eq('id', teacherId).single();
    if (!snap) return false;
    
    if (snap.pendingProfileUpdate) {
      const updatedProfile = {
        ...(snap.publicProfile || {}),
        ...snap.pendingProfileUpdate
      };
      
      await supabase.from('users').update({
        publicProfile: updatedProfile, 
        pendingProfileUpdate: null 
      }).eq('id', teacherId);
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error approving profile:", error);
    return false;
  }
}

export async function rejectTeacherProfile(teacherId: string) {
  try {
    await supabase.from('users').update({
      pendingProfileUpdate: null
    }).eq('id', teacherId);
    return true;
  } catch (error) {
    console.error("Error rejecting profile:", error);
    return false;
  }
}

export interface TeacherProfileEdit {
  name: string;
  email?: string;
  kunyah?: string;
  gender?: string;
  qualifications: string[];
  specialization: string[];
  languages: string[];
  about: string;
  isLive?: boolean;
}

/** Super-admin direct write — skips the teacher approval queue. */
export async function adminSaveTeacherProfile(
  teacherId: string,
  input: TeacherProfileEdit
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = supabase;
    const { data: snap } = await client.from('users').select('*').eq('id', teacherId).single();
    if (!snap) return { success: false, error: 'Teacher not found.' };

    const existing = (snap.publicProfile && typeof snap.publicProfile === 'object' && !Array.isArray(snap.publicProfile))
      ? snap.publicProfile as Record<string, unknown>
      : {};

    const clean = (list: string[]) => list.map(s => s.trim()).filter(Boolean);

    const publicProfile = {
      ...existing,
      qualifications: clean(input.qualifications),
      specialization: clean(input.specialization),
      languages: clean(input.languages),
      about: input.about.trim(),
      kunyah: (input.kunyah ?? String(existing.kunyah || '')).trim(),
      gender: (input.gender || String(existing.gender || '')).trim(),
      isLive: input.isLive ?? Boolean(existing.isLive),
    };

    const payload: Record<string, unknown> = {
      name: input.name.trim(),
      gender: publicProfile.gender,
      publicProfile,
      pendingProfileUpdate: null,
      updatedAt: new Date().toISOString(),
    };
    if (input.email?.trim()) payload.email = input.email.trim();

    const result = await updateWithColumnFallback(client, 'users', payload, {
      column: 'id',
      value: teacherId,
    });
    if (result.error) return { success: false, error: result.error };
    return { success: true };
  } catch (error) {
    console.error('Error saving teacher profile:', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function submitStudentProfileUpdate(studentId: string, profileData: Record<string, JsonValue>) {
  try {
    const result = await updateWithColumnFallback(supabase, 'users', {
      studentProfile: {
        ...profileData,
        updatedAt: new Date().toISOString()
      }
    }, {
      column: 'id',
      value: studentId,
    });
    return !result.error;
  } catch (error) {
    console.error("Error updating student profile:", error);
    return false;
  }
}

export async function requestScheduleChange(studentId: string, requestText: string, slots?: ScheduleSlot[], timezone?: string) {
  try {
    const { data: existing } = await supabase.from('users').select('scheduleChangeRequest, planDays').eq('id', studentId).single();
    if (slots && slots.length > 0) {
      const preferenceError = validateStudentPreferenceSlots(slots, existing?.planDays);
      if (preferenceError) return { success: false, error: preferenceError };
    }
    const current = parseScheduleChangeRequest(existing?.scheduleChangeRequest);
    if (current?.status === 'pending') {
      return { success: false, error: 'You already have a pending schedule request. Withdraw it first or wait for a decision.' };
    }

    const payload = {
      type: 'change' as const,
      text: requestText,
      slots: slots || [],
      status: 'pending' as const,
      requestedAt: new Date().toISOString(),
      // Carry the student's timezone so admins/matching interpret the requested
      // slots in the right zone even if the request sits for a while.
      timezone: timezone || undefined,
    };

    const update: Record<string, unknown> = { scheduleChangeRequest: payload };
    // Keep the user's canonical timezone fresh with each request.
    if (timezone) update.timezone = timezone;

    let attempt = { ...update };
    let lastError: { message?: string } | null = null;
    for (let i = 0; i <= Object.keys(update).length; i++) {
      const { data, error } = await supabase.from('users').update(attempt).eq('id', studentId).select('id');
      if (!error) {
        if (!data || data.length === 0) {
          return { success: false, error: 'Update was blocked (permissions). Please sign out and back in, then try again.' };
        }
        lastError = null;
        break;
      }
      lastError = error;
      const missing = error.message.match(/Could not find the '(\w+)' column/);
      if (missing && missing[1] in attempt) {
        const { [missing[1]]: _drop, ...rest } = attempt;
        void _drop;
        attempt = rest;
        continue;
      }
      return { success: false, error: error.message };
    }
    if (lastError) return { success: false, error: lastError.message || 'Failed to submit request' };

    const { notifyAdminsNewScheduleRequest } = await import('@/lib/scheduleRequests');
    const { data: user } = await supabase.from('users').select('name').eq('id', studentId).single();
    await notifyAdminsNewScheduleRequest(user?.name || 'Student', 'schedule change');

    return { success: true };
  } catch (error) {
    console.error("Error submitting schedule change request:", error);
    return { success: false, error: 'Failed to submit request' };
  }
}

export async function requestTeacherAvailabilityChange(
  teacherKey: string,
  slots: ScheduleSlot[],
  timezone: string,
  client: UserClient = supabase
) {
  try {
    const teacher = await findTeacherRow(teacherKey, client);
    if (!teacher) return { success: false, error: 'Teacher not found' };

    const pending = parsePendingAvailabilityUpdate(teacher.pendingAvailabilityUpdate);
    if (pending?.status === 'pending') {
      return { success: false, error: 'You already have a pending availability request. Withdraw it first or wait for a decision.' };
    }

    const result = await updateWithColumnFallback(
      client,
      'users',
      {
        pendingAvailabilityUpdate: {
          status: 'pending',
          slots,
          previousSlots: getAvailabilitySlots(teacher.availabilitySlots),
          timezone,
          requestedAt: new Date().toISOString(),
        },
        availabilityChangeRequested: true,
        timezone,
        updatedAt: new Date().toISOString(),
      },
      { column: 'id', value: teacher.id }
    );
    if (result.error) return { success: false, error: result.error };

    const { notifyAdminsNewScheduleRequest } = await import('@/lib/scheduleRequests');
    await notifyAdminsNewScheduleRequest(teacher.name || 'Teacher', 'teacher availability');

    return { success: true };
  } catch (error) {
    console.error('Error submitting teacher availability change:', error);
    return { success: false, error: 'Failed to submit request' };
  }
}

// MATCHMAKING & SCHEDULING

export async function getUnassignedStudents(): Promise<UserData[]> {
  try {
    const data = await fetchUsersByRoles(['student', 'parent']);
    return data.filter(u => {
      if (isSandboxAccount(u)) return false;
      return getAssignedClassSlots(u.schedule).length < getStudentPlanDays(u);
    });
  } catch (error) {
    console.error("Error fetching unassigned students:", error);
    return [];
  }
}

export async function submitStudentPreferences(studentId: string, preferredSlots: ScheduleSlot[], timezone?: string) {
  try {
    const { data: existing } = await supabase.from('users').select('inbox, name, scheduleChangeRequest, planDays').eq('id', studentId).single();
    const current = parseScheduleChangeRequest(existing?.scheduleChangeRequest);
    if (current?.status === 'pending') {
      return { success: false, error: 'You already have a pending schedule request. Withdraw it before submitting a new one.' };
    }

    const preferenceError = validateStudentPreferenceSlots(preferredSlots, existing?.planDays);
    if (preferenceError) return { success: false, error: preferenceError };

    const slotSummary = preferredSlots.map(s => formatDayAtTime(s.day, s.time)).join(', ');
    const now = new Date().toISOString();

    let inbox = existing?.inbox || [];
    if (typeof inbox === 'string') {
      try { inbox = JSON.parse(inbox); } catch { inbox = []; }
    }
    if (!Array.isArray(inbox)) inbox = [];

    inbox.unshift({
      id: `msg_${Date.now()}`,
      subject: 'Schedule Preferences Submitted',
      body: `Your schedule preferences have been submitted and are pending review. Requested times: ${slotSummary}. We will notify you once a decision is made.`,
      date: now,
      read: false,
      teacher: 'Ilmvers Administration',
    });

    const payload: Record<string, unknown> = {
      preferredSchedule: preferredSlots,
      timezone: timezone || 'UTC',
      detectedTz: timezone || undefined,
      scheduleSelected: true,
      scheduleChangeRequest: {
        type: 'initial',
        status: 'pending',
        slots: preferredSlots,
        text: slotSummary,
        // Freeze the zone the student typed in, so later travel cannot rewrite matching.
        timezone: timezone || 'UTC',
        requestedAt: now,
      },
      inbox,
      updatedAt: now,
    };

    // Update, transparently dropping any column the schema doesn't have.
    let attempt = { ...payload };
    let lastError: { message?: string; details?: string; hint?: string; code?: string } | null = null;
    for (let i = 0; i <= Object.keys(payload).length; i++) {
      const { data, error } = await supabase.from('users').update(attempt).eq('id', studentId).select('id');
      if (!error) {
        if (!data || data.length === 0) {
          return { success: false, error: 'Update was blocked (permissions). Please sign out and back in, then try again.' };
        }
        lastError = null;
        break;
      }
      lastError = error;
      const missing = error.message?.match(/Could not find the '(\w+)' column/);
      if (missing && missing[1] in attempt) {
        const { [missing[1]]: _drop, ...rest } = attempt;
        void _drop;
        attempt = rest;
        continue;
      }
      break;
    }

    if (lastError) {
      console.error('Supabase update error:', {
        message: lastError.message,
        details: lastError.details,
        hint: lastError.hint,
        code: lastError.code,
      });
      return { success: false, error: lastError.message || 'Database rejected the update.' };
    }

    const { notifyAdminsNewScheduleRequest } = await import('@/lib/scheduleRequests');
    await notifyAdminsNewScheduleRequest(existing?.name || 'Student', 'initial schedule preferences');

    return { success: true };
  } catch (error) {
    console.error("Error submitting student preferences:", error);
    return { success: false, error: error instanceof Error ? error.message : 'Unexpected error.' };
  }
}

export async function adminAssignStudentToTeacher(studentId: string, teacherId: string, day: string, time: string, timezone: string = 'UTC') {
  try {
    const client = supabase;

    // 1. Fetch teacher to get their email and mark their slot as booked
    const { data: teacher } = await client.from('users').select('*').eq('id', teacherId).single();
    if (!teacher) return { success: false, error: 'Teacher not found' };

    const parsedTeacher = parseUserRecord((teacher || {}) as Record<string, unknown>);
    const slots = getAvailabilitySlots(teacher.availabilitySlots);
    
    // 2. Fetch student to update their official schedule
    const { data: student } = await client.from('users').select('*').eq('id', studentId).single();
    if (!student) return { success: false, error: 'Student not found' };

    const parsedStudent = parseUserRecord((student || {}) as Record<string, unknown>);
    const studentIsGroup = isGroupTuitionPlan(parsedStudent.tuitionPlan);

    let slotError: string | undefined;
    const newSlots = slots.map((s: ScheduleSlot) => {
      if (s.day !== day || s.time !== time) return s;
      const booked = applySlotBooking(s, studentId, studentIsGroup);
      if ('error' in booked) {
        slotError = booked.error;
        return s;
      }
      return booked.slot;
    });

    if (slotError) return { success: false, error: slotError };
    if (!slots.some((s) => s.day === day && s.time === time)) {
      return { success: false, error: 'Teacher slot is no longer available' };
    }

    const existingClasses = getAssignedClassSlots(parsedStudent.schedule as string | ScheduleSlot[] | undefined);
    const planLimit = getStudentPlanDays(parsedStudent);
    if (existingClasses.some((s) => s.day === day && s.time === time && (!s.teacherId || s.teacherId === teacherId))) {
      return { success: false, error: 'This class is already on the student schedule.' };
    }
    if (existingClasses.length >= planLimit) {
      return {
        success: false,
        error: `This student's plan allows ${planLimit} class${planLimit === 1 ? '' : 'es'} per week. Remove a pairing first.`,
      };
    }

    const teacherLabel = String(parsedTeacher.name || teacher.name || 'Instructor');
    const teacherEmail = String(parsedTeacher.email || teacher.email || '');
    const roomID = teacherClassroomRoom(teacherEmail);
    const newSchedule = [
      ...existingClasses,
      {
        teacherId: teacher.id,
        teacherEmail,
        teacher: teacherLabel,
        teacherName: teacherLabel,
        roomID: roomID,
        day: day,
        time: time,
        timezone: teacher.timezone || timezone,
        assignedAt: new Date().toISOString()
      }
    ];

    // 3. Perform Both Updates
    const { error: teacherUpdateError } = await client.from('users').update({ availabilitySlots: newSlots }).eq('id', teacherId);
    if (teacherUpdateError) return { success: false, error: 'Failed to update teacher availability' };

    const currentReq = parseScheduleChangeRequest(student.scheduleChangeRequest);
    const assignedTimezone = String(parsedTeacher.timezone || teacher.timezone || timezone);
    const studentTz = getUserTimezone(parsedStudent);
    const forStudent = convertSlotToTimezone(day, time, assignedTimezone, studentTz);
    const planFilled = newSchedule.length >= planLimit;
    const dropMatched = (slots: ScheduleSlot[]) => {
      let removed = false;
      return slots.filter((slot) => {
        if (!removed && slot.day === forStudent.day && slot.time === forStudent.time) {
          removed = true;
          return false;
        }
        return true;
      });
    };
    const preferred = getPreferredSchedule(parsedStudent.preferredSchedule);
    const remainingPreferred = planFilled ? [] : dropMatched(preferred);
    const requestSlots = currentReq?.slots?.length ? currentReq.slots : preferred;
    const remainingRequest = planFilled ? [] : dropMatched(requestSlots);
    const studentUpdate: Record<string, unknown> = {
      schedule: newSchedule,
      preferredSchedule: planFilled ? null : remainingPreferred,
      scheduleSelected: true,
    };
    if (currentReq || planFilled) {
      studentUpdate.scheduleChangeRequest = {
        type: currentReq?.type || 'initial',
        status: planFilled ? 'approved' : 'pending',
        slots: planFilled ? (currentReq?.slots || preferred) : remainingRequest,
        text: currentReq?.text,
        timezone: currentReq?.timezone,
        requestedAt: currentReq?.requestedAt,
        resolvedAt: planFilled ? new Date().toISOString() : undefined,
      };
    }
    const { data: studentUpdated, error: studentUpdateError } = await client
      .from('users')
      .update(studentUpdate)
      .eq('id', studentId)
      .select('id');
    if (studentUpdateError || !studentUpdated?.length) {
      await client.from('users').update({ availabilitySlots: slots }).eq('id', teacherId);
      return { success: false, error: studentUpdateError?.message || 'Failed to update student schedule' };
    }

    // 4. Send Email Notifications
    const teacherName = teacherLabel;
    const studentName = String(parsedStudent.name || student.name || 'Student');
    const studentEmail = String(parsedStudent.email || student.email || '');

    if (studentEmail) {
      sendScheduleAssignmentEmail(
        studentEmail,
        studentName,
        teacherName,
        forStudent.day,
        forStudent.time,
        studentTz
      ).catch(console.error);
    }
    if (student.phone) {
      sendWhatsAppMessage(
        student.phone,
        `Assalamu alaikum ${studentName.split(' ')[0]}! You have been assigned to Instructor ${teacherName} for classes on ${formatDayAtTime(forStudent.day, forStudent.time)} (${studentTz}). Log into your portal to see your classroom link.`
      ).catch(console.error);
    }
    if (teacherEmail) {
      sendTeacherAssignmentAlert(teacherEmail, teacherName, studentName, day, time).catch(console.error);
    }

    try {
      const { activateMessagingAssignment } = await import('@/lib/messaging');
      await activateMessagingAssignment(studentId, teacherId);
    } catch (messagingError) {
      console.error('Messaging assignment sync failed:', messagingError);
    }

    return { success: true };
  } catch (error: unknown) {
    console.error("Error matching student to teacher:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function adminRemoveStudentSlot(
  studentId: string,
  day: string,
  time: string,
  teacherId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = supabase;
    const { data: student } = await client.from('users').select('*').eq('id', studentId).single();
    if (!student) return { success: false, error: 'Student not found' };

    const current = getAssignedClassSlots(student.schedule as string | ScheduleSlot[] | undefined);
    const removed = current.find((s) =>
      s.day === day && s.time === time && (!teacherId || !s.teacherId || s.teacherId === teacherId)
    );
    if (!removed) return { success: false, error: 'That class was not found on the student schedule.' };

    const nextSchedule = current.filter((s) => s !== removed);
    const { error: studentError } = await client
      .from('users')
      .update({ schedule: nextSchedule })
      .eq('id', studentId);
    if (studentError) return { success: false, error: studentError.message };

    const bookedTeacherId = removed.teacherId || teacherId;
    if (bookedTeacherId) {
      const { data: teacher } = await client.from('users').select('availabilitySlots').eq('id', bookedTeacherId).single();
      if (teacher) {
        const slots = getAvailabilitySlots(teacher.availabilitySlots).map((s) =>
          s.day === day && s.time === time && (slotBookedIds(s).includes(studentId) || s.isBooked)
            ? releaseSlotBooking(s, studentId)
            : s
        );
        await client.from('users').update({ availabilitySlots: slots }).eq('id', bookedTeacherId);
      }
    }

    return { success: true };
  } catch (error: unknown) {
    console.error('Error removing student slot:', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function adminUpdateUser(userId: string, updateData: Record<string, JsonValue>) {
  try {
    const { error } = await supabase.from('users').update(updateData).eq('id', userId);
    if (error) throw error;
    return { success: true };
  } catch (error: unknown) {
    console.error("Error updating user:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}


export async function updateUserPaymentStatus(userId: string, isVerified: boolean) {
  try {
    await supabase.from('users').update({ paymentVerified: isVerified }).eq('id', userId);
    return true;
  } catch (error) {
    console.error('Error updating payment status:', error);
    return false;
  }
}

export type BillingAction = 'paid' | 'scholarship' | 'unpaid';

export async function adminApplyBilling(
  userId: string,
  action: BillingAction,
  tuitionPlan?: string | null,
  months?: number
): Promise<{ success: boolean; error?: string }> {
  const admin = getSupabaseAdmin();
  const { data: existing } = await admin
    .from('users')
    .select('id, tuitionPlan, planDays, base_usd_price')
    .eq('id', userId)
    .single();

  let hourlyRates = null;
  try {
    const { data: ratesRow } = await admin.from('system_settings').select('value').eq('key', 'pricing_rates').single();
    hourlyRates = parseHourlyRates(ratesRow?.value);
  } catch {
    hourlyRates = null;
  }

  const plan = tuitionPlan || existing?.tuitionPlan || undefined;
  const payload: Record<string, string | boolean | number | null> = action === 'unpaid'
    ? revokePaidAccess()
    : grantPaidCycle({
        scholarship: action === 'scholarship',
        tuitionPlan: plan,
        months,
      });

  if (action === 'paid') {
    const amount = monthlyTuitionAmount({
      base_usd_price: existing?.base_usd_price,
      tuitionPlan: plan,
      planDays: existing?.planDays,
    }, hourlyRates);
    if (amount > 0) payload.base_usd_price = amount;
  }

  const result = await updateWithColumnFallback(
    admin,
    'users',
    payload,
    { column: 'id', value: userId }
  );
  if (result.error) return { success: false, error: result.error };
  return { success: true };
}

export async function deleteUserFromDB(userId: string) {
  try {
    await supabase.from('users').delete().eq('id', userId);
    return true;
  } catch (error) {
    console.error('Error deleting user:', error);
    return false;
  }
}

export async function updateUserRole(userId: string, newRole: string) {
  try {
    await supabase.from('users').update({ role: newRole }).eq('id', userId);
    return true;
  } catch (error) {
    console.error('Error updating role:', error);
    return false;
  }
}

export async function updateUserPlan(userId: string, newPlan: string) {
  try {
    await supabase.from('users').update({ tuitionPlan: newPlan }).eq('id', userId);
    return true;
  } catch (error) {
    console.error('Error updating plan:', error);
    return false;
  }
}

// TRANSCRIPTIONS
// Stored in class_transcripts. attendance_logs was never created, so these
// writes used to disappear and the super admin viewer always showed nothing.
export async function saveTranscriptChunk(roomName: string, userId: string, role: string, text: string) {
  const body = text.trim().slice(0, 4000);
  const room = roomName.trim().slice(0, 200);
  const speaker = role.trim().slice(0, 32);
  if (!body || !room || !userId || userId === 'unknown') return false;
  try {
    const { error } = await supabase.from('class_transcripts').insert({
      id: 'tx_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      room_name: room,
      user_id: userId,
      speaker_role: speaker || 'student',
      body,
    });
    if (error) {
      console.error('Error saving transcript chunk:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error saving transcript chunk:', err);
    return false;
  }
}

export async function getTranscriptsBySession(roomName: string) {
  try {
    const { data, error } = await supabase
      .from('class_transcripts')
      .select('speaker_role, body, created_at')
      .eq('room_name', roomName)
      .order('created_at', { ascending: true })
      .limit(500);

    if (error) {
      console.error('Error getting transcripts:', error.message);
      return [];
    }

    return (data || []).map((row: { speaker_role?: string; body?: string; created_at?: string }) => ({
      name: row.speaker_role,
      timestamp: row.created_at,
      transcriptData: { text: row.body },
    }));
  } catch (err) {
    console.error('Error getting transcripts:', err);
    return [];
  }
}

// ─── RESOURCES (LIBRARY) ─────────────────────────────────────────────────────

export async function getResources(opts?: { includeUnapproved?: boolean }) {
  try {
    const { data } = await supabase
      .from('resources')
      .select('*')
      .order('created_at', { ascending: false });
    const rows = data || [];
    if (opts?.includeUnapproved) return rows;
    return rows.filter((r: { status?: string }) => !r.status || r.status === 'approved');
  } catch (error) {
    console.error('Error fetching resources:', error);
    return [];
  }
}

export async function addResource(resource: {
  title: string;
  type: string;
  url: string;
  category: string;
  description?: string;
  uploaded_by?: string;
  status?: string;
  submitted_by?: string;
  submitted_by_name?: string;
  source?: string;
}) {
  try {
    const { data, error } = await insertWithColumnFallback(supabase, 'resources', {
      ...resource,
    });
    if (error || !data) {
      console.error('Error adding resource:', error);
      return null;
    }
    return data;
  } catch (error) {
    console.error('Error adding resource:', error);
    return null;
  }
}

export async function setResourceStatus(id: string, status: 'approved' | 'rejected') {
  const { error } = await supabase.from('resources').update({ status }).eq('id', id);
  if (!error) return { success: true };
  if (missingColumnFromError(error.message)) {
    return { success: status === 'approved', error: status === 'rejected' ? 'Status column missing — run teacher_materials.sql' : undefined };
  }
  return { success: false, error: error.message };
}

export async function assignResourceToTeacherStudents(resourceId: string, teacherId: string) {
  const ids = new Set<string>();

  const { data: assignments } = await supabase
    .from('messaging_assignments')
    .select('student_id')
    .eq('teacher_id', teacherId)
    .eq('active', true);
  (assignments || []).forEach(a => {
    if (a.student_id) ids.add(String(a.student_id));
  });

  // Fallback: students whose schedule is paired with this teacher.
  if (ids.size === 0) {
    const { data: teacher } = await supabase.from('users').select('id, email').eq('id', teacherId).single();
    if (teacher) {
      const roster = await getTeacherStudents({
        id: String(teacher.id || teacherId),
        email: teacher.email ? String(teacher.email) : undefined,
      });
      roster.forEach(s => { if (s.id) ids.add(s.id); });
    }
  }

  for (const studentId of ids) {
    await assignResourceToStudent(studentId, resourceId);
  }
  return ids.size;
}

export async function deleteResource(id: string) {
  try {
    const { error } = await supabase.from('resources').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting resource:', error);
    return false;
  }
}

export async function assignResourceToStudent(studentId: string, resourceId: string) {
  try {
    const { data: student } = await supabase.from('users').select('assignedResources').eq('id', studentId).single();
    if (!student) return false;
    const parsed = parseUserRecord(student as Record<string, unknown>);
    const current: string[] = Array.isArray(parsed.assignedResources)
      ? (parsed.assignedResources as string[])
      : [];
    if (current.includes(resourceId)) return true; // already assigned
    await supabase.from('users').update({ assignedResources: [...current, resourceId] }).eq('id', studentId);
    return true;
  } catch (error) {
    console.error('Error assigning resource:', error);
    return false;
  }
}

export async function unassignResourceFromStudent(studentId: string, resourceId: string) {
  try {
    const { data: student } = await supabase.from('users').select('assignedResources').eq('id', studentId).single();
    if (!student) return false;
    const parsedAssign = parseUserRecord(student as Record<string, unknown>);
    const currentAssign: string[] = Array.isArray(parsedAssign.assignedResources)
      ? (parsedAssign.assignedResources as string[])
      : [];
    const updated = currentAssign.filter((id: string) => id !== resourceId);
    await supabase.from('users').update({ assignedResources: updated }).eq('id', studentId);
    return true;
  } catch (error) {
    console.error('Error unassigning resource:', error);
    return false;
  }
}

// ─── FEEDBACK ────────────────────────────────────────────────────────────────

export async function submitFeedback(data: {
  student_id: string;
  student_name: string;
  instructor_name: string;
  instructor_rating: number;
  institution_rating: number;
  instructor_comments: string;
  institution_comments: string;
  anonymous?: boolean;
}) {
  try {
    const { error } = await supabase.from('feedback').insert([{ ...data }]);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error submitting feedback:', error);
    return false;
  }
}

export async function getAllFeedback() {
  try {
    const { data } = await supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false });
    return data || [];
  } catch (error) {
    console.error('Error fetching feedback:', error);
    return [];
  }
}

// ─── ASSESSMENTS ─────────────────────────────────────────────────────────────

export async function getPendingAssessments() {
  try {
    const { data } = await supabase
      .from('assessments')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    return (data || []).filter((row) => !isSandboxAccount(row));
  } catch (error) {
    console.error('Error fetching assessments:', error);
    return [];
  }
}

export async function updateAssessmentStatus(id: string, status: 'approved' | 'rejected') {
  try {
    const { data, error } = await supabase.from('assessments').update({ status }).eq('id', id).select().single();
    if (error) throw error;

    const email = typeof data?.email === 'string'
      ? data.email
      : (typeof data?.contact === 'string' ? data.contact : '');
    if (status === 'approved' && email.includes('@')) {
      sendAssessmentApproval(email, data.name, 'Please proceed to enroll in a plan from your dashboard.').catch(console.error);
    }

    return true;
  } catch (error) {
    console.error('Error updating assessment:', error);
    return false;
  }
}

export async function saveClassRecapToStudents(
  studentIds: string[],
  teacherName: string,
  lesson: { chapterName: string; ayah: number; materialTitle?: string; materialUrl?: string }
) {
  const now = new Date().toISOString();
  const materialLine = lesson.materialTitle
    ? ` Shared file: ${lesson.materialTitle}${lesson.materialUrl ? ` (${lesson.materialUrl})` : ''}.`
    : '';
  const body = `Today's class left off at ${lesson.chapterName}, ayah ${lesson.ayah}.${materialLine} Open Library or Instructor Inbox to continue.`;

  for (const studentId of studentIds) {
    try {
      const { data: student } = await supabase.from('users').select('inbox').eq('id', studentId).single();
      if (!student) continue;
      let inbox = student.inbox || [];
      if (typeof inbox === 'string') {
        try { inbox = JSON.parse(inbox); } catch { inbox = []; }
      }
      if (!Array.isArray(inbox)) inbox = [];
      inbox.unshift({
        id: `recap_${Date.now()}_${studentId.slice(0, 8)}`,
        subject: "Today's class recap",
        body,
        date: now,
        read: false,
        teacher: teacherName,
      });
      await supabase.from('users').update({ inbox, updatedAt: now }).eq('id', studentId);
    } catch (error) {
      console.warn('Class recap save failed:', error);
    }
  }
}
