# Ilmvers setup

The application is built. What is left is a new Ilmvers Supabase project, the keys in `.env.example`, and the Cloudflare resources named in `wrangler.toml`.

Do not point `NEXT_PUBLIC_SUPABASE_URL` at any existing school project. Do not copy that project's service role, R2 buckets, JaaS app, Modal app, or email domain.

## 1. Database

Create a new Supabase project. Apply the SQL files in `sql/` in filename order, on that project only. They are additive and each file has a rollback note. The base `public.users` table is assumed to exist before `sql/2026-10-16-01-user-columns.sql`.

Also create a public Storage bucket named `materials`. Uploads go there.

In the Supabase Auth settings, add `https://ilmversinstitute.com/reset-password` (and `http://localhost:3000/reset-password` for local work) to the redirect allow list.

## 2. Keys

Copy `.env.example` to `.env.local` and fill every value you are ready to use. Empty optional keys leave that feature quiet:

- No `RESEND_API_KEY`: accounts and messages still save; mail is skipped.
- No Turnstile keys: localhost passes; production should have both the site key and the secret.
- No `NEXT_PUBLIC_CALENDLY_URL`: the assessment page says scheduling is not configured and the visitor can skip it.
- No `NEXT_PUBLIC_JAAS_APP_ID` or `NEXT_PUBLIC_CLASSROOM_TOKEN_URL`: live class shows that it is not configured.
- No `OPENAI_API_KEY`: the study assistant route answers that it is not configured.
- `NEXT_PUBLIC_HIFZ_LAB_ENABLED` stays `false`.

For the Worker, set the same secrets with `wrangler secret put` rather than putting them in `wrangler.toml`.

## 3. Cloudflare

The Worker name in `wrangler.toml` is `ilmvers-institute`. Create R2 buckets `ilmvers-assets`, `ilmvers-audio`, and `ilmvers-vault` only when you need them, then uncomment those bindings. Attach `ilmversinstitute.com` when the domain is on this account.

`NEWSLETTER_UNSUBSCRIBE_SECRET` can be any long random string. It signs unsubscribe links.

## 4. Local check

```bash
npm install
npm run dev
```

Open http://localhost:3000. Registration, contact, and the footer newsletter return a clear error until the new database and service role are in `.env.local`.
