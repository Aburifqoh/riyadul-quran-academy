import { NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '@/lib/whatsapp';



// Pure fetch-based Supabase REST helper (Edge compatible, no SDK)
async function supabaseQuery(table: string, query: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase environment variables');
  const res = await fetch(`${url}/rest/v1/${table}?${query}`, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
    },
  });
  if (!res.ok) throw new Error(`DB Error: ${await res.text()}`);
  return res.json();
}

async function sendEmailViaResend(to: string, name: string, isTeacher: boolean, timeStr: string) {
  const apiKey = process.env.RESEND_API_KEY || '';
  const link = isTeacher ? 'https://ilmversinstitute.com/portal/teacher' : 'https://ilmversinstitute.com/portal/classroom/session';
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: "Ilmvers Institute <noreply@ilmversinstitute.com>",
      to,
      subject: 'Your class starts in 30 minutes!',
      html: `<div style="font-family:sans-serif;max-width:600px;margin:auto;">
        <h2>Assalamu Alaikum ${name},</h2>
        <p>Your upcoming class starts in <strong>30 minutes</strong> (${timeStr}).</p>
        <br/>
        <a href="${link}" style="background:#F59A23;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold;">Join Classroom</a>
      </div>`,
    }),
  });
}

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // 1. Target time: 30 minutes from now
    const targetDate = new Date(Date.now() + 30 * 60 * 1000);

    // 2. Fetch students from users table via REST API
    const students: any[] = await supabaseQuery(
      'users',
      'select=id,name,email,phone,detectedTz,schedule,paymentVerified&role=eq.%22student%22&paymentVerified=eq.true&schedule=not.is.null'
    );

    let remindersSent = 0;

    for (const student of students || []) {
      const schedule = student.schedule;
      if (!schedule || !Array.isArray(schedule) || schedule.length === 0) continue;

      const tz = student.detectedTz || 'UTC';
      let dayString: string, timeString: string;

      try {
        dayString = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'long' }).format(targetDate);
        let rawTime = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: true }).format(targetDate);
        if (rawTime.length === 7) rawTime = '0' + rawTime;
        timeString = rawTime;
      } catch {
        continue;
      }

      const upcomingClass = schedule.find((slot: any) =>
        slot.day?.toLowerCase() === dayString?.toLowerCase() &&
        slot.time?.toLowerCase() === timeString?.toLowerCase()
      );

      if (upcomingClass) {
        remindersSent++;

        // Email student
        sendEmailViaResend(student.email, student.name, false, timeString).catch(console.error);

        // WhatsApp student
        if (student.phone) {
          sendWhatsAppMessage(
            student.phone,
            `Assalamu Alaikum ${student.name}, your Ilmvers class starts in 30 minutes! Log in: https://ilmversinstitute.com/portal`
          ).catch(console.error);
        }

        // Notify teacher if assigned
        if (upcomingClass.teacherEmail) {
          try {
            const teachers: any[] = await supabaseQuery(
              'users',
              `select=name,email,phone&email=eq.%22${encodeURIComponent(upcomingClass.teacherEmail)}%22`
            );
            const teacher = teachers?.[0];
            if (teacher) {
              sendEmailViaResend(teacher.email, teacher.name, true, timeString).catch(console.error);
              if (teacher.phone) {
                sendWhatsAppMessage(
                  teacher.phone,
                  `Assalamu Alaikum ${teacher.name}, you have a class with ${student.name} in 30 minutes: https://ilmversinstitute.com/portal/teacher`
                ).catch(console.error);
              }
            }
          } catch { /* teacher lookup failure shouldn't block */ }
        }
      }
    }

    return NextResponse.json({ success: true, remindersSent });

  } catch (err: any) {
    console.error('[Class Reminders] Fatal Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

