# Parity status

Ilmvers is the only brand. The interface is English. Hifz Lab is built in the repo and switched off. Full Arabic/RTL layout is out of scope.

## Done in this app

- Parent area: `/parent` opens the portal; children, billing, settings, and support are real pages.
- Registration with Turnstile, password rules, profile rows, and rollback if the profile insert fails.
- Contact form saved with the service role.
- Newsletter signup, unsubscribe links, and an admin broadcast when a community post is approved.
- Assessment notification emails.
- Authenticated uploads to the `materials` bucket.
- Attendance, schedule-request alerts, and community-post alerts require a signed-in caller.
- Cron routes for class reminders, billing, messaging sync, and message purge. The Worker maps those schedules.
- Payment webhooks no longer write Hifz credits.
- Live classroom reads `NEXT_PUBLIC_JAAS_APP_ID` and `NEXT_PUBLIC_CLASSROOM_TOKEN_URL`. Room names use the `Ilmvers_` prefix.
- Password reset page at `/reset-password`.
- Admin pricing reads and writes `system_settings` as the signed-in admin.
- `/admin-override` and `/seed-teachers` return not found.
- Hifz review, progress, history, and warm-up return 404 while the flag is off.

## Still a key, not code

Create these on Ilmvers accounts. Names and placeholders are in `.env.example` and `SETUP.md`.

- Supabase URL, anon key, service role, then the SQL in `sql/`.
- Resend on `ilmversinstitute.com`, plus `ADMIN_ALERT_EMAIL` and `EMAIL_FROM`.
- Turnstile site key and secret.
- Paystack and Flutterwave keys and plan codes.
- 8x8 JaaS app id and a classroom token URL that belongs to Ilmvers.
- Calendly event URL for assessment booking.
- `CRON_SECRET` and `NEWSLETTER_UNSUBSCRIBE_SECRET`.
- Optional: Meta pixel, OpenAI key, R2 buckets, Hifz grader URL and token.

## Not in this build

- Applying the SQL. The configured local URL is not an Ilmvers project.
- Hifz scoring. Leave `NEXT_PUBLIC_HIFZ_LAB_ENABLED` false until a separate grader exists.
- Web push.
- Arabic and right-to-left layout.
