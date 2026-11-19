import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getCallerPermissions, hasPermission } from '@/lib/permissions';
import { analyzeClassTranscript } from '@/lib/workersAi';
import { getErrorMessage } from '@/lib/errors';

export const maxDuration = 30;

export async function POST(request: Request) {
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
    if (!hasPermission(caller, 'can_manage_live_classes')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const transcript = typeof body?.transcript === 'string' ? body.transcript.trim() : '';
    const roomName = typeof body?.roomName === 'string' ? body.roomName : '';
    if (!transcript) {
      return NextResponse.json({ error: 'Transcript text is required.' }, { status: 400 });
    }

    const analysis = await analyzeClassTranscript(transcript, roomName);
    return NextResponse.json({ success: true, analysis });
  } catch (error: unknown) {
    console.error('[analyze-transcript]', error);
    return NextResponse.json({ error: getErrorMessage(error) || 'Internal server error' }, { status: 500 });
  }
}
