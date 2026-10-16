import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Deliberately small, fixed vocabulary of action types. Resist the urge
 * to log everything — the point of this file existing is to keep the
 * Super Admin's activity feed answering "what crucial decisions did
 * admins make", not "what did they click". Add new types here only
 * when a genuinely high-impact action needs visibility.
 */
export type ActivityActionType =
  | 'student.schedule_changed'
  | 'schedule.request_approved'
  | 'schedule.request_rejected'
  | 'schedule.requests_expired'
  | 'student.enrolled'
  | 'student.removed'
  | 'teacher.assigned'
  | 'teacher.unassigned'
  | 'gallery.photo_uploaded'
  | 'gallery.photo_approved'
  | 'gallery.photo_rejected'
  | 'live_class.cancelled'
  | 'live_class.rescheduled'
  | 'user.permissions_changed'
  | 'user.created'
  | 'user.deleted';

interface LogActivityParams {
  actorId: string;
  actorRole: string;
  actionType: ActivityActionType;
  summary: string;            // human-readable, e.g. "Moved Fatima K. to the 6pm Tuesday slot"
  targetType?: string;        // e.g. 'student', 'gallery_photo'
  targetId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Call this AFTER the real database action has already succeeded.
 * Never block or roll back the real action if logging fails — log
 * failures should be swallowed (and optionally reported to your error
 * tracker), not surfaced as a failure of the action itself.
 */
export async function logActivity(
  supabase: SupabaseClient,
  params: LogActivityParams
): Promise<void> {
  try {
    await supabase.from('admin_activity_log').insert({
      actor_id: params.actorId,
      actor_role: params.actorRole,
      action_type: params.actionType,
      target_type: params.targetType ?? null,
      target_id: params.targetId ?? null,
      summary: params.summary,
      metadata: params.metadata ?? null,
    });
  } catch (err) {
    // Intentionally non-fatal. A missed log entry is far less costly
    // than blocking a real action (e.g. rescheduling a class) because
    // the logging insert hiccuped.
    console.error('[activityLog] failed to write entry:', err);
  }
}

/**
 * Example usage inside an existing route, AFTER the real update:
 *
 *   const { error } = await supabase
 *     .from('students')
 *     .update({ scheduled_slot: newSlot })
 *     .eq('id', studentId);
 *
 *   if (!error) {
 *     await logActivity(supabase, {
 *       actorId: caller.id,
 *       actorRole: caller.role,
 *       actionType: 'student.schedule_changed',
 *       summary: `Moved ${student.name} to ${newSlot}`,
 *       targetType: 'student',
 *       targetId: studentId,
 *       metadata: { previousSlot, newSlot },
 *     });
 *   }
 */
