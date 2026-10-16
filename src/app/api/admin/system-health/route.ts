import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getCallerPermissions, hasPermission } from '@/lib/permissions';
import { runSystemHealthChecks } from '@/lib/systemHealth';

export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const caller = await getCallerPermissions(getSupabaseAdmin(), user.id);
    if (!hasPermission(caller, 'can_manage_cms_gallery')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const report = await runSystemHealthChecks();
    return NextResponse.json(report);
  } catch (err) {
    console.error('system-health error:', err);
    return NextResponse.json({ error: 'Health check failed' }, { status: 500 });
  }
}
