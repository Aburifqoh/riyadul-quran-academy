// ─────────────────────────────────────────────
// src/lib/turnstile.ts
// One implementation of the Turnstile check, for every route that needs it.
//
// This logic previously existed only inside api/verify-turnstile, which the
// registration pages called as a separate step before registering. That is a
// check on the honour system: nothing stopped a caller from skipping it and
// POSTing straight to the registration endpoint.
//
// It matters more now than it did. Registration used to go through
// supabase.auth.signUp() from the browser, which Supabase rate-limits on its
// own. It now runs server-side with the service role, which has no such limit
// — so without this, account creation is wide open.
//
// The bypasses below are deliberate and carried over unchanged: a
// misconfigured widget or a missing secret lets people through rather than
// locking out every real visitor. Turnstile here is a speed bump against
// automated abuse, not an access control.
// ─────────────────────────────────────────────

/** Siteverify codes meaning OUR setup is wrong, not that the visitor failed. */
const CONFIG_ERROR_CODES = new Set([
  'invalid-input-secret',
  'missing-input-secret',
  'invalid-widget-id',
  'invalid-parsed-secret',
  'hostname-mismatch',
  'domain-mismatch',
]);

export async function getTurnstileSecret(): Promise<string | undefined> {
  const fromEnv = process.env.TURNSTILE_SECRET_KEY;
  if (fromEnv && fromEnv !== 'not-used-locally-bypass-active') return fromEnv;
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = await getCloudflareContext({ async: true });
    const secret = (ctx.env as { TURNSTILE_SECRET_KEY?: string }).TURNSTILE_SECRET_KEY;
    if (secret && secret !== 'not-used-locally-bypass-active') return secret;
  } catch {
    // next dev has no Worker bindings
  }
  return undefined;
}

export interface TurnstileResult {
  ok: boolean;
  /** Why it passed or failed, for logging. Never shown to a visitor. */
  reason: string;
  errorCodes?: string[];
}

export async function verifyTurnstile(opts: {
  token: string;
  email?: string;
  host?: string | null;
  remoteip?: string | null;
}): Promise<TurnstileResult> {
  const token = (opts.token ?? '').trim();

  if (!token) return { ok: false, reason: 'no-token' };
  if (token === 'bypass-token') return { ok: true, reason: 'bypass-token' };

  const host = opts.host ?? '';
  if (process.env.NODE_ENV === 'development' || host.includes('localhost') || host.includes('127.0.0.1')) {
    return { ok: true, reason: 'local-dev' };
  }

  const secretKey = await getTurnstileSecret();
  if (!secretKey) return { ok: true, reason: 'no-secret-configured' };

  const params = new URLSearchParams();
  params.append('secret', secretKey);
  params.append('response', token);
  if (opts.remoteip) params.append('remoteip', opts.remoteip);

  let data: { success?: boolean; 'error-codes'?: string[] };
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    data = await res.json();
  } catch {
    // Cloudflare unreachable. Failing closed here would take registration down
    // with it, which is a worse outcome than letting a bot through.
    return { ok: true, reason: 'siteverify-unreachable' };
  }

  if (data.success) return { ok: true, reason: 'verified' };

  const errorCodes = data['error-codes'] ?? [];
  if (errorCodes.some((c) => CONFIG_ERROR_CODES.has(c))) {
    return { ok: true, reason: 'config-mismatch-allowed', errorCodes };
  }
  return { ok: false, reason: 'failed', errorCodes };
}
