// ─────────────────────────────────────────────
// app/api/hifz-progress/route.ts
// Fetch student's Hifz progress for page grid
// ─────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';



export async function GET(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_HIFZ_LAB_ENABLED !== 'true') {
    return NextResponse.json({ error: 'Hifz Lab is not enabled.' }, { status: 404 });
  }
  try {
    const studentId = req.nextUrl.searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json({ error: 'Missing studentId' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: progress, error } = await supabase
      .from('hifz_progress')
      .select('page_number, status, best_score, attempt_count, last_reviewed')
      .eq('student_id', studentId);

    if (error) throw error;

    return NextResponse.json({ progress });
  } catch (error: any) {
    console.error('Hifz progress error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
