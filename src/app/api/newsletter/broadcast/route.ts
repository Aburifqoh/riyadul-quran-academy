import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getCallerPermissions, hasPermission } from '@/lib/permissions';
import { broadcastPublishedUpdate } from '@/lib/newsletterBroadcast';
import { getErrorMessage } from '@/lib/errors';

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
    if (!hasPermission(caller, 'can_manage_cms_gallery')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json().catch(() => null) as { title?: string; excerpt?: string; id?: string } | null;
    const title = typeof body?.title === 'string' ? body.title.trim() : '';
    const excerpt = typeof body?.excerpt === 'string' ? body.excerpt.trim() : '';
    const id = typeof body?.id === 'string' ? body.id.trim() : '';
    if (!title) {
      return NextResponse.json({ error: 'A title is required.' }, { status: 400 });
    }

    const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://ilmversinstitute.com';
    const result = await broadcastPublishedUpdate({
      title,
      excerpt,
      link: id ? `${site}/blog` : site,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error || 'Could not email subscribers.' }, { status: 502 });
    }
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('newsletter broadcast:', getErrorMessage(error) || error);
    return NextResponse.json({ error: 'Could not email subscribers.' }, { status: 500 });
  }
}
