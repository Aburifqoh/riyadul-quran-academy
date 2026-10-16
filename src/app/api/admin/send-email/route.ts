import { getErrorMessage } from '@/lib/errors';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUserRole } from '@/lib/userDataHelpers';



const getSupabaseAdmin = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
};

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    // 1. Verify Authentication & Admin Role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userData, error: roleError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = getUserRole(userData?.role);
    if (roleError || role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden: Super admin access required' }, { status: 403 });
    }

    // 2. Parse Request Body
    const body = await req.json().catch(() => null) as { recipients?: unknown; subject?: string; htmlContent?: string } | null;
    if (!body) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }
    const { recipients, subject, htmlContent } = body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json({ error: 'No recipients provided' }, { status: 400 });
    }

    if (!subject || !htmlContent) {
      return NextResponse.json({ error: 'Subject and content are required' }, { status: 400 });
    }

    // 3. Send Emails in Bulk using Resend HTTP API (Edge compatible)
    const emailPromises = recipients.map(email => {
      return fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Ilmvers Admin <admin@ilmversinstitute.com>', // Replace with your verified Resend domain
          to: email,
          subject: subject,
          html: htmlContent,
        })
      });
    });

    const responses = await Promise.all(emailPromises);
    
    // Check for any errors
    for (const res of responses) {
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Failed to send email via Resend:', errorText);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully sent ${recipients.length} emails.` 
    });

  } catch (error: unknown) {
    console.error('Error sending mass email:', error);
    return NextResponse.json({ error: getErrorMessage(error) || 'Internal server error' }, { status: 500 });
  }
}

