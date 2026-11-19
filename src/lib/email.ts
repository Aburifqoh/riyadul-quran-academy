import type { AdminRecord } from '@/types/records';
import type { JsonValue } from '@/types/json';
import { ADMIN_ALERT_EMAIL } from '@/lib/config';
import { formatDayAtTime } from '@/lib/timeFormat';
// Edge-runtime compatible email sender — uses raw fetch instead of Resend SDK

const SENDER = process.env.EMAIL_FROM || 'Ilmvers Institute <noreply@ilmversinstitute.com>';

async function sendEmail(to: string, subject: string, html: string, replyTo?: string): Promise<boolean> {
  // Browser bundles import this module for types/helpers; never call Resend
  // from the client — the key is server-only and fetch would be a no-op here.
  if (typeof window !== 'undefined') {
    console.error('sendEmail skipped: called from the browser for', subject);
    return false;
  }
  const apiKey = process.env.RESEND_API_KEY || '';
  if (!apiKey) {
    console.error('RESEND_API_KEY missing — email not sent:', subject, '→', to);
    return false;
  }
  if (!to || !to.includes('@')) {
    console.error('sendEmail skipped: invalid recipient for', subject);
    return false;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: SENDER,
        to: [to],
        subject,
        html,
        ...(replyTo && replyTo.includes('@') ? { reply_to: replyTo } : {}),
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('Resend send failed:', res.status, detail, '→', to, subject);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Resend send failed:', error);
    return false;
  }
}

export async function sendWelcomeEmail(email: string, name: string) {
  try {
    await sendEmail(
      email,
      'Welcome to Ilmvers Institute!',
      `<div style="font-family: sans-serif; max-width: 600px; margin: auto;">
        <h2>Welcome, ${name}!</h2>
        <p>Alhamdulillah, we are glad you have joined Ilmvers Institute.</p>
        <p>You can now log in to your portal. If you have chosen a tuition plan, complete payment so classes can be scheduled.</p>
        <br/>
        <a href="https://ilmvers.com/login" style="background-color: #004D4A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Log in to Portal</a>
        <br/><br/>
        <p>JazakAllah Khair,<br/>Ilmvers Institute</p>
      </div>`
    );
  } catch (error) {
    console.error("Failed to send welcome email:", error);
  }
}

export async function sendPaymentReceipt(email: string, planName: string, amount: string) {
  try {
    await sendEmail(
      email,
      'Payment Successful - Ilmvers Institute',
      `<div style="font-family: sans-serif; max-width: 600px; margin: auto;">
        <h2>Payment Received</h2>
        <p>We have successfully received your payment of <strong>$${amount}</strong> for the <strong>${planName}</strong> plan.</p>
        <p>Your subscription is now active. An admin will assign your instructor shortly.</p>
        <br/>
        <a href="https://ilmvers.com/portal" style="background-color: #004D4A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Go to Dashboard</a>
      </div>`
    );
  } catch (error) {
    console.error("Failed to send payment receipt:", error);
  }
}

export async function sendAssessmentConfirmation(
  email: string,
  name: string,
  extra?: { whenLabel?: string; booked?: boolean }
) {
  try {
    const when = extra?.whenLabel
      ? `<p><strong>Time:</strong> ${escapeHtml(extra.whenLabel)}</p>`
      : '';
    await sendEmail(
      email,
      'Assessment Booked Successfully',
      `<div style="font-family: sans-serif; max-width: 600px; margin: auto;">
        <h2>Assalamu Alaikum ${escapeHtml(name)},</h2>
        <p>Your free assessment has been received.</p>
        ${when}
        <p>An instructor will meet with you to evaluate your level and recommend the best plan.</p>
      </div>`
    );
  } catch (error) {
    console.error("Failed to send assessment confirmation:", error);
  }
}

export async function sendAssessmentApproval(email: string, name: string, notes: string) {
  try {
    await sendEmail(
      email,
      'Assessment Approved - Next Steps',
      `<div style="font-family: sans-serif; max-width: 600px; margin: auto;">
        <h2>Congratulations ${name}!</h2>
        <p>Your assessment has been reviewed and approved by our admin team.</p>
        <p><strong>Instructor Notes:</strong><br/>${notes}</p>
        <br/>
        <p>You can now proceed to select your plan and finalize your enrollment.</p>
        <br/>
        <a href="https://ilmvers.com/login?next=/payment" style="background-color: #004D4A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Complete Enrollment</a>
      </div>`
    );
  } catch (error) {
    console.error("Failed to send assessment approval email:", error);
  }
}

export async function sendClassReminder(email: string, name: string, isTeacher: boolean, timeStr: string) {
  try {
    await sendEmail(
      email,
      'Your class starts in 30 minutes!',
      `<div style="font-family: sans-serif; max-width: 600px; margin: auto;">
        <h2>Assalamu Alaikum ${name},</h2>
        <p>This is a quick reminder that your upcoming class is scheduled to begin in <strong>30 minutes</strong> (${timeStr}).</p>
        <p>Please log in to your portal and join the virtual classroom so you are ready when the session starts.</p>
        <br/>
        <a href="https://ilmvers.com/portal/classroom/session" style="background-color: #004D4A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Join Classroom</a>
      </div>`
    );
  } catch (error) {
    console.error("Failed to send class reminder email:", error);
  }
}

function alertCell(value: JsonValue | undefined) {
  if (value == null || value === '') return 'N/A';
  return escapeHtml(String(value));
}

export async function sendAdminNewUserAlert(adminEmail: string, newUserData: AdminRecord | Record<string, JsonValue>) {
  try {
    const children = Array.isArray(newUserData.children) ? newUserData.children : [];
    const childRows = children.map((child, index) => {
      const row = (child && typeof child === 'object' && !Array.isArray(child) ? child : {}) as Record<string, JsonValue>;
      const shade = index % 2 === 0 ? ' style="background-color: #f9f9f9;"' : '';
      return `<tr${shade}><td style="padding: 10px; border: 1px solid #ddd;">${alertCell(row.name)}</td><td style="padding: 10px; border: 1px solid #ddd;">${alertCell(row.age)}</td><td style="padding: 10px; border: 1px solid #ddd;">${alertCell(row.gender)}</td><td style="padding: 10px; border: 1px solid #ddd;">${alertCell(row.level)}</td><td style="padding: 10px; border: 1px solid #ddd;">${alertCell(row.email)}</td></tr>`;
    }).join('');
    const childrenBlock = childRows
      ? `<h3 style="margin-top: 28px;">Children enrolled</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="background-color: #F0F4F2;"><th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Name</th><th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Age</th><th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Gender</th><th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Level</th><th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Email</th></tr>
          ${childRows}
        </table>`
      : '';
    const html = `<div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
        <h2 style="color: #2b2b2b;">New User Registration!</h2>
        <p>A new student has just registered on Ilmvers Institute.</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <tr style="background-color: #f9f9f9;"><td style="padding: 10px; border: 1px solid #ddd;"><strong>Name:</strong></td><td style="padding: 10px; border: 1px solid #ddd;">${alertCell(newUserData.name)}</td></tr>
          <tr><td style="padding: 10px; border: 1px solid #ddd;"><strong>Email:</strong></td><td style="padding: 10px; border: 1px solid #ddd;">${alertCell(newUserData.email)}</td></tr>
          <tr style="background-color: #f9f9f9;"><td style="padding: 10px; border: 1px solid #ddd;"><strong>WhatsApp:</strong></td><td style="padding: 10px; border: 1px solid #ddd;">${alertCell(newUserData.phone)}</td></tr>
          <tr><td style="padding: 10px; border: 1px solid #ddd;"><strong>Gender:</strong></td><td style="padding: 10px; border: 1px solid #ddd;">${alertCell(newUserData.gender)}</td></tr>
          <tr style="background-color: #f9f9f9;"><td style="padding: 10px; border: 1px solid #ddd;"><strong>Nationality:</strong></td><td style="padding: 10px; border: 1px solid #ddd;">${alertCell(newUserData.nationality)}</td></tr>
          <tr><td style="padding: 10px; border: 1px solid #ddd;"><strong>Country:</strong></td><td style="padding: 10px; border: 1px solid #ddd;">${alertCell(newUserData.country)}</td></tr>
          <tr style="background-color: #f9f9f9;"><td style="padding: 10px; border: 1px solid #ddd;"><strong>City / Province:</strong></td><td style="padding: 10px; border: 1px solid #ddd;">${alertCell(newUserData.city)}</td></tr>
          <tr><td style="padding: 10px; border: 1px solid #ddd;"><strong>Heard about us:</strong></td><td style="padding: 10px; border: 1px solid #ddd;">${alertCell(newUserData.referral)}</td></tr>
          <tr style="background-color: #f9f9f9;"><td style="padding: 10px; border: 1px solid #ddd;"><strong>Account Type:</strong></td><td style="padding: 10px; border: 1px solid #ddd;">${alertCell(newUserData.accountType || newUserData.role)}</td></tr>
        </table>
        ${childrenBlock}
        <br/>
        <a href="https://ilmvers.com/portal/admin" style="background-color: #004D4A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Log in to Admin Panel</a>
      </div>`;
    
    await sendEmail(
      adminEmail,
      '🎉 New Registration: ' + newUserData.name,
      html
    );
  } catch (error) {
    console.error("Failed to send admin alert email:", error);
  }
}

export async function sendAdminNewLeadAlert(adminEmail: string, leadData: AdminRecord | Record<string, JsonValue>) {
  try {
    const html = `<div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
        <h2 style="color: #2b2b2b;">New Lead Captured / Assessment Booked!</h2>
        <p>A user has filled out the diagnostic assessment intake form.</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <tr style="background-color: #f9f9f9;"><td style="padding: 10px; border: 1px solid #ddd;"><strong>Name:</strong></td><td style="padding: 10px; border: 1px solid #ddd;">${alertCell(leadData.name)}</td></tr>
          <tr><td style="padding: 10px; border: 1px solid #ddd;"><strong>Email:</strong></td><td style="padding: 10px; border: 1px solid #ddd;">${alertCell(leadData.email || leadData.contact)}</td></tr>
          <tr style="background-color: #f9f9f9;"><td style="padding: 10px; border: 1px solid #ddd;"><strong>WhatsApp:</strong></td><td style="padding: 10px; border: 1px solid #ddd;">${alertCell(leadData.phone)}</td></tr>
          <tr><td style="padding: 10px; border: 1px solid #ddd;"><strong>Age:</strong></td><td style="padding: 10px; border: 1px solid #ddd;">${alertCell(leadData.age)}</td></tr>
          <tr style="background-color: #f9f9f9;"><td style="padding: 10px; border: 1px solid #ddd;"><strong>Gender:</strong></td><td style="padding: 10px; border: 1px solid #ddd;">${alertCell(leadData.gender)}</td></tr>
          <tr><td style="padding: 10px; border: 1px solid #ddd;"><strong>Level:</strong></td><td style="padding: 10px; border: 1px solid #ddd;">${alertCell(leadData.level)}</td></tr>
          <tr style="background-color: #f9f9f9;"><td style="padding: 10px; border: 1px solid #ddd;"><strong>Goal:</strong></td><td style="padding: 10px; border: 1px solid #ddd;">${alertCell(leadData.goal)}</td></tr>
          <tr><td style="padding: 10px; border: 1px solid #ddd;"><strong>Nationality:</strong></td><td style="padding: 10px; border: 1px solid #ddd;">${alertCell(leadData.nationality)}</td></tr>
          <tr style="background-color: #f9f9f9;"><td style="padding: 10px; border: 1px solid #ddd;"><strong>Country:</strong></td><td style="padding: 10px; border: 1px solid #ddd;">${alertCell(leadData.country)}</td></tr>
          <tr><td style="padding: 10px; border: 1px solid #ddd;"><strong>City/TZ:</strong></td><td style="padding: 10px; border: 1px solid #ddd;">${alertCell(leadData.city)}</td></tr>
          <tr style="background-color: #f9f9f9;"><td style="padding: 10px; border: 1px solid #ddd;"><strong>Referral:</strong></td><td style="padding: 10px; border: 1px solid #ddd;">${alertCell(leadData.referral)}</td></tr>
        </table>
        <br/>
        <a href="https://ilmvers.com/portal/admin" style="background-color: #004D4A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Log in to Admin Panel</a>
      </div>`;
    
    await sendEmail(
      adminEmail,
      '🎯 New Assessment Lead: ' + leadData.name,
      html
    );
  } catch (error) {
    console.error("Failed to send admin lead alert email:", error);
  }
}

export async function sendScheduleAssignmentEmail(email: string, studentName: string, teacherName: string, day: string, time: string, timezone: string) {
  try {
    await sendEmail(
      email,
      'Your Class Schedule is Confirmed! - Ilmvers Institute',
      `<div style="font-family: sans-serif; max-width: 600px; margin: auto;">
        <h2>Assalamu Alaikum ${studentName},</h2>
        <p>Great news! Your class schedule has been officially confirmed and a teacher has been assigned to you.</p>
        <p><strong>Your Instructor:</strong> ${teacherName}</p>
        <p><strong>Class Timing:</strong> ${formatDayAtTime(day, time)} (${timezone})</p>
        <br/>
        <p>Please log in to your portal to view your full schedule and access the virtual classroom.</p>
        <br/>
        <a href="https://ilmvers.com/portal" style="background-color: #004D4A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Go to Dashboard</a>
      </div>`
    );
  } catch (error) {
    console.error("Failed to send schedule assignment email to student:", error);
  }
}

export async function sendTeacherAssignmentAlert(email: string, teacherName: string, studentName: string, day: string, time: string) {
  try {
    await sendEmail(
      email,
      'New Student Assigned! - Ilmvers Institute',
      `<div style="font-family: sans-serif; max-width: 600px; margin: auto;">
        <h2>Assalamu Alaikum ${teacherName},</h2>
        <p>A new student has been assigned to your class schedule.</p>
        <p><strong>Student Name:</strong> ${studentName}</p>
        <p><strong>Assigned Slot:</strong> ${formatDayAtTime(day, time)}</p>
        <br/>
        <p>Please log in to your teacher portal to view their details and prepare for your upcoming sessions.</p>
        <br/>
        <a href="https://ilmvers.com/teacher-login" style="background-color: #004D4A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Go to Teacher Portal</a>
      </div>`
    );
  } catch (error) {
    console.error("Failed to send assignment alert email to teacher:", error);
  }
}

export async function sendScheduleRequestApprovedEmail(email: string, name: string) {
  try {
    await sendEmail(
      email,
      'Schedule Request Approved - Ilmvers Institute',
      `<div style="font-family: sans-serif; max-width: 600px; margin: auto;">
        <h2>Assalamu Alaikum ${name},</h2>
        <p>Your schedule request has been <strong>approved</strong>.</p>
        <p>Log in to your portal to view your updated schedule.</p>
        <br/>
        <a href="https://ilmvers.com/portal" style="background-color: #004D4A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Go to Portal</a>
      </div>`
    );
  } catch (error) {
    console.error('Failed to send schedule approval email:', error);
  }
}

export async function sendScheduleRequestRejectedEmail(email: string, name: string, reason: string) {
  try {
    await sendEmail(
      email,
      'Schedule Request Update - Ilmvers Institute',
      `<div style="font-family: sans-serif; max-width: 600px; margin: auto;">
        <h2>Assalamu Alaikum ${name},</h2>
        <p>Your schedule request was <strong>not approved</strong> at this time.</p>
        <p><strong>Reason:</strong><br/>${reason}</p>
        <p>You may submit a new request from your portal settings.</p>
        <br/>
        <a href="https://ilmvers.com/portal/settings" style="background-color: #004D4A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Go to Settings</a>
      </div>`
    );
  } catch (error) {
    console.error('Failed to send schedule rejection email:', error);
  }
}

export async function sendAdminScheduleRequestAlert(adminEmail: string, requesterName: string, requestType: string) {
  try {
    await sendEmail(
      adminEmail,
      `New Schedule Request: ${requesterName}`,
      `<div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px;">
        <h2>New Schedule Request</h2>
        <p><strong>${requesterName}</strong> submitted a <strong>${requestType}</strong> schedule request.</p>
        <p>Review it in the Super Admin Schedule Requests queue.</p>
        <br/>
        <a href="https://ilmvers.com/portal/admin" style="background-color: #004D4A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Open Admin Portal</a>
      </div>`
    );
  } catch (error) {
    console.error('Failed to send admin schedule request alert:', error);
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function sendTeacherWelcomeEmail(email: string, name: string, password: string) {
  try {
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safePassword = escapeHtml(password);
    await sendEmail(
      email,
      'Your Ilmvers Faculty Account is Ready',
      `<div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; color: #1f2937;">
        <h2 style="color: #004D4A;">Assalamu Alaikum ${safeName},</h2>
        <p>Your instructor account at Ilmvers Institute has been created. Please save these login details and sign in as soon as you can.</p>
        <div style="background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px 20px; margin: 20px 0;">
          <p style="margin: 0 0 8px;"><strong>Faculty login:</strong> <a href="https://ilmvers.com/teacher-login">https://ilmvers.com/teacher-login</a></p>
          <p style="margin: 0 0 8px;"><strong>Email:</strong> ${safeEmail}</p>
          <p style="margin: 0;"><strong>Temporary password:</strong> ${safePassword}</p>
        </div>
        <h3 style="color: #004D4A;">1. Change your password</h3>
        <p>After you log in, open <strong>Account Settings</strong> and change this temporary password immediately.</p>
        <h3 style="color: #004D4A;">2. Complete your public profile</h3>
        <p>Please update these fields so students can see your background:</p>
        <ul>
          <li><strong>Qualifications</strong> — e.g. Ijazah in Hafs</li>
          <li><strong>Specialization</strong> — e.g. Tajweed, Hifz</li>
          <li><strong>Spoken languages</strong> — e.g. English, Arabic</li>
          <li><strong>About / biography</strong> — a short instructor biography for the public site</li>
        </ul>
        <p>You can do this from <a href="https://ilmvers.com/portal/teacher/settings">Teacher Settings</a>. An administrator will review and publish your profile.</p>
        <h3 style="color: #004D4A;">3. Get familiar with the platform</h3>
        <p>Please browse the website and try the <strong>live classroom</strong> so you are comfortable before your first student is assigned.</p>
        <p>
          <a href="https://ilmvers.com" style="color: #004D4A;">ilmvers.com</a> &nbsp;·&nbsp;
          <a href="https://ilmvers.com/teachers" style="color: #004D4A;">Teachers page</a> &nbsp;·&nbsp;
          <a href="https://ilmvers.com/portal/classroom" style="color: #004D4A;">Live classroom</a>
        </p>
        <br/>
        <a href="https://ilmvers.com/teacher-login" style="background-color: #004D4A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Log in to Teacher Portal</a>
        <br/><br/>
        <p>JazakAllah Khair,<br/>The Ilmvers Team</p>
      </div>`
    );
  } catch (error) {
    console.error('Failed to send teacher welcome email:', error);
  }
}

export async function sendNewMessageEmail(to: string, fromName: string, preview: string) {
  try {
    await sendEmail(
      to,
      `New message from ${fromName}`,
      `<div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px;">
        <h2>New Secure Message</h2>
        <p><strong>${fromName}</strong> sent you a message:</p>
        <blockquote style="background: #f9fafb; border-left: 4px solid #004D4A; padding: 12px 16px; margin: 16px 0; color: #374151;">
          ${preview.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
        </blockquote>
        <p>Log in to your portal to read and reply.</p>
        <br/>
        <a href="https://ilmvers.com/portal/inbox" style="background-color: #004D4A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Open Secure Inbox</a>
      </div>`
    );
  } catch (error) {
    console.error('Failed to send new message email:', error);
  }
}

export async function sendAdminContactAlert(name: string, email: string, message: string) {
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeMessage = escapeHtml(message);
  return sendEmail(
    ADMIN_ALERT_EMAIL,
    `New contact message from ${name}`,
    `<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:20px;border:1px solid #eee;border-radius:10px;">
      <h2 style="color:#004D4A;">New contact message</h2>
      <p><strong>Name:</strong> ${safeName}</p>
      <p><strong>Email:</strong> ${safeEmail}</p>
      <hr style="border:0;border-top:1px solid #eee;margin:20px 0;" />
      <p style="white-space:pre-wrap;">${safeMessage}</p>
      <p><a href="https://ilmvers.com/portal/admin">Open the admin hub</a> and choose Contact Messages.</p>
    </div>`,
    email
  );
}

export async function sendAdminNewsletterAlert(subscriberEmail: string) {
  const safe = escapeHtml(subscriberEmail);
  return sendEmail(
    ADMIN_ALERT_EMAIL,
    'New newsletter subscriber',
    `<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:20px;">
      <h2>New newsletter subscriber</h2>
      <p><strong>${safe}</strong> asked to receive Ilmvers updates.</p>
    </div>`
  );
}

export async function sendNewsletterIssue(
  to: string,
  title: string,
  excerpt: string,
  link: string,
  unsubscribeUrl: string
) {
  const safeTitle = escapeHtml(title);
  const safeExcerpt = escapeHtml(excerpt);
  return sendEmail(
    to,
    safeTitle || 'Update from Ilmvers Institute',
    `<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:20px;">
      <h2 style="color:#0F3D38;">${safeTitle}</h2>
      <p>${safeExcerpt}</p>
      <p><a href="${escapeHtml(link)}">Read it on Ilmvers</a></p>
      <p style="font-size:12px;color:#666;"><a href="${escapeHtml(unsubscribeUrl)}">Unsubscribe</a></p>
    </div>`
  );
}

export async function sendTeacherFollowUp(email: string, teacherName: string, followUp: string) {
  const safeName = escapeHtml(teacherName || 'Instructor');
  const safeBody = escapeHtml(followUp).replace(/\n/g, '<br/>');
  return sendEmail(
    email,
    'Recommended follow-up for your class',
    `<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:20px;">
      <h2>Assalamu Alaikum ${safeName},</h2>
      <p>The admin team reviewed a class and sent this follow-up:</p>
      <blockquote style="background:#F0F4F2;border-left:4px solid #004D4A;padding:12px 16px;margin:16px 0;">${safeBody}</blockquote>
      <p>JazakAllah Khair,<br/>Ilmvers Institute</p>
    </div>`
  );
}
