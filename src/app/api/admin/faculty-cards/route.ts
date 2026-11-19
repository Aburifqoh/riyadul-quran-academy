import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getCallerPermissions, hasPermission } from '@/lib/permissions';
import { normalizeFacultyCard } from '@/lib/facultyCards';
import { deleteFacultyCard, updateFacultyCard } from '@/lib/facultyCardsStore';

async function requireFacultyAdmin(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const token = authHeader.slice(7);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const caller = await getCallerPermissions(getSupabaseAdmin(), user.id);
  if (!hasPermission(caller, 'can_manage_students')) {
    return { error: NextResponse.json({ error: 'Faculty management permission required.' }, { status: 403 }) };
  }
  return { user };
}

export async function PUT(request: Request) {
  const auth = await requireFacultyAdmin(request);
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => null);
  const card = normalizeFacultyCard(body?.card);
  if (!card || !card.role || !card.category || !card.credentials || !card.bio) {
    return NextResponse.json({ error: 'Name, role, category, qualifications, and bio are required.' }, { status: 400 });
  }

  try {
    const cards = await updateFacultyCard(card);
    return NextResponse.json({ cards });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not save this profile.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const auth = await requireFacultyAdmin(request);
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === 'string' ? body.id.trim() : '';
  if (!id) {
    return NextResponse.json({ error: 'Profile id is required.' }, { status: 400 });
  }

  try {
    const cards = await deleteFacultyCard(id);
    return NextResponse.json({ cards });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not delete this profile.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
