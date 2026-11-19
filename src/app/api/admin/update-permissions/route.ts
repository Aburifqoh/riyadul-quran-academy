import { getErrorMessage } from '@/lib/errors';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  getCallerPermissions,
  requireSuperAdmin,
  PermissionError,
  AdminPermissionKey,
} from '@/lib/permissions';
import { logActivity } from '@/lib/activityLog';
import { getUserRole } from '@/lib/userDataHelpers';

const PERMISSION_KEYS: AdminPermissionKey[] = [
  'can_manage_students',
  'can_manage_live_classes',
  'can_manage_cms_gallery',
  'can_access_communications',
];

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }
    const { targetUserId, permissions } = body as {
      targetUserId: string;
      permissions: Partial<Record<AdminPermissionKey, boolean>>;
    };
    const callerId = user.id;

    if (!targetUserId || !permissions) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    const invalidKeys = Object.keys(permissions).filter(
      k => !PERMISSION_KEYS.includes(k as AdminPermissionKey)
    );
    if (invalidKeys.length > 0) {
      return NextResponse.json(
        { error: `Unknown permission key(s): ${invalidKeys.join(', ')}` },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    // --- Authorization: only Super Admin can change another admin's permissions ---
    const caller = await getCallerPermissions(supabase, callerId);
    requireSuperAdmin(caller);

    // --- Confirm the target is actually a regular admin ---
    // Super Admins are not subject to these toggles at all (has_permission()
    // short-circuits to true for them), so attempting to "restrict" a
    // Super Admin here would silently do nothing useful — better to
    // reject the request outright and say why.
    const { data: targetUser, error: targetError } = await supabase
      .from('users')
      .select('role, permissions')
      .eq('id', targetUserId)
      .single();

    if (targetError || !targetUser) {
      return NextResponse.json({ error: 'Target user not found.' }, { status: 404 });
    }
    if (getUserRole(targetUser.role) !== 'admin') {
      return NextResponse.json(
        { error: 'Granular permissions only apply to regular admins, not super admins or other roles.' },
        { status: 400 }
      );
    }

    const previousPermissions = targetUser.permissions;
    const updatedPermissions = { ...targetUser.permissions, ...permissions };

    const { error: updateError } = await supabase
      .from('users')
      .update({ permissions: updatedPermissions })
      .eq('id', targetUserId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Permissions live in the `users` table and are read directly by
    // has_permission() server-side (security definer), so RLS reflects
    // this change immediately — no JWT refresh needed for THIS specific
    // change, unlike role changes which do require an app_metadata sync.

    const changedKeys = Object.keys(permissions).filter(
      k => previousPermissions?.[k] !== updatedPermissions[k]
    );

    await logActivity(supabase, {
      actorId: callerId,
      actorRole: 'super_admin',
      actionType: 'user.permissions_changed',
      summary: `Updated permissions for admin ${targetUserId}: ${changedKeys
        .map(k => `${k} \u2192 ${updatedPermissions[k]}`)
        .join(', ')}`,
      targetType: 'user',
      targetId: targetUserId,
      metadata: { previousPermissions, updatedPermissions },
    });

    return NextResponse.json({ success: true, permissions: updatedPermissions });
  } catch (err: unknown) {
    if (err instanceof PermissionError) {
      return NextResponse.json({ error: getErrorMessage(err) }, { status: err.status });
    }
    console.error('update-permissions error:', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
