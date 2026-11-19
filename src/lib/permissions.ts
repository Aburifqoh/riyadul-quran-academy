import { SupabaseClient } from '@supabase/supabase-js';
import { getUserRole } from '@/lib/userDataHelpers';

export type AdminPermissionKey =
  | 'can_manage_students'
  | 'can_manage_live_classes'
  | 'can_manage_cms_gallery'
  | 'can_access_communications';

export interface UserPermissionRow {
  role: 'super_admin' | 'admin' | 'teacher' | 'student' | 'parent';
  permissions: Record<AdminPermissionKey, boolean> | null;
}

export const DEFAULT_ADMIN_PERMISSIONS: Record<AdminPermissionKey, boolean> = {
  can_manage_students: true,
  can_manage_live_classes: true,
  can_manage_cms_gallery: true,
  can_access_communications: true,
};

/**
 * Mirrors the SQL has_permission() function in
 * 01-permissions-and-activity-log.sql. Used in API routes (where you
 * have a service-role client and need to check before doing something
 * RLS won't catch, e.g. before calling supabase.auth.admin.* methods)
 * and in the UI (to decide what to render).
 *
 * IMPORTANT: this function is a UX/defense-in-depth convenience. The
 * real enforcement is the SQL has_permission() inside RLS policies.
 * Never rely on this TS check alone to protect a write — always also
 * have the RLS policy use has_permission() server-side.
 */
export type PermissionCheckUser = UserPermissionRow | {
  role?: string;
  permissions?: Record<string, boolean> | null;
} | null | undefined;

export function hasPermission(
  user: PermissionCheckUser,
  permission: AdminPermissionKey
): boolean {
  if (!user) return false;
  const role = getUserRole(user.role);
  if (role === 'super_admin') return true;
  if (role !== 'admin') return false;
  return Boolean(user.permissions?.[permission]);
}

export function isSuperAdmin(user: PermissionCheckUser): boolean {
  return getUserRole(user?.role) === 'super_admin';
}

export function isAdminOrAbove(user: PermissionCheckUser): boolean {
  const role = getUserRole(user?.role);
  return role === 'admin' || role === 'super_admin';
}

/**
 * Server-side only — requires the service role key. Use this inside
 * API routes (never in client components) to fetch the current
 * caller's role + permissions before deciding whether to proceed.
 */
export async function getCallerPermissions(
  supabaseServiceClient: SupabaseClient,
  callerId: string
): Promise<UserPermissionRow | null> {
  const { data, error } = await supabaseServiceClient
    .from('users')
    .select('role, permissions')
    .eq('id', callerId)
    .single();

  if (error || !data) return null;
  return {
    role: (getUserRole(data.role) || data.role) as UserPermissionRow['role'],
    permissions: data.permissions,
  };
}

/**
 * Throws-style guard for API routes. Call at the top of any route that
 * should be Super Admin only. Pairs with the activity logger below —
 * call logActivity() AFTER the real action succeeds, not before.
 */
export function requireSuperAdmin(user: PermissionCheckUser): void {
  if (!isSuperAdmin(user)) {
    throw new PermissionError('Super Admin access required.');
  }
}

export function requirePermission(
  user: PermissionCheckUser,
  permission: AdminPermissionKey
): void {
  if (!hasPermission(user, permission)) {
    throw new PermissionError(`Missing permission: ${permission}`);
  }
}

export class PermissionError extends Error {
  status = 403;
  constructor(message: string) {
    super(message);
    this.name = 'PermissionError';
  }
}
