import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export type HealthLevel = 'ok' | 'warn' | 'error';

export type HealthCheck = {
  id: string;
  group: string;
  title: string;
  status: HealthLevel;
  detail: string;
  latencyMs?: number;
};

export type HealthReport = {
  checkedAt: string;
  summary: { ok: number; warn: number; error: number };
  checks: HealthCheck[];
};

const CLASSROOM_PROXY = process.env.NEXT_PUBLIC_CLASSROOM_TOKEN_URL || '';
const CRITICAL_TABLES = [
  'users',
  'messages',
  'resources',
  'community_posts',
  'messaging_assignments',
  'system_settings',
];

function configured(value?: string | null): boolean {
  return Boolean(value && value.trim() && !value.includes('placeholder') && value !== 'not-used-locally-bypass-active');
}

async function timed<T>(fn: () => Promise<T>): Promise<{ value: T; ms: number }> {
  const start = Date.now();
  const value = await fn();
  return { value, ms: Date.now() - start };
}

async function httpProbe(
  url: string,
  init: RequestInit = {},
  timeoutMs = 8000
): Promise<{ reachable: boolean; ok: boolean; status?: number; ms: number; error?: string }> {
  const start = Date.now();
  try {
    const res = await fetch(url, { ...init, cache: 'no-store', signal: AbortSignal.timeout(timeoutMs) });
    return {
      reachable: true,
      ok: res.ok,
      status: res.status,
      ms: Date.now() - start,
    };
  } catch (err) {
    return {
      reachable: false,
      ok: false,
      ms: Date.now() - start,
      error: err instanceof Error ? err.message : 'Unreachable',
    };
  }
}

function check(
  id: string,
  group: string,
  title: string,
  status: HealthLevel,
  detail: string,
  latencyMs?: number
): HealthCheck {
  return { id, group, title, status, detail, latencyMs };
}

export async function runSystemHealthChecks(): Promise<HealthReport> {
  const admin = getSupabaseAdmin();
  const checks: HealthCheck[] = [];

  const hasService = configured(process.env.SUPABASE_SERVICE_ROLE_KEY) && configured(process.env.NEXT_PUBLIC_SUPABASE_URL);

  // Database (service role)
  if (!hasService) {
    checks.push(check('db-service', 'Core', 'Database (service role)', 'error', 'SUPABASE_SERVICE_ROLE_KEY or project URL is missing.'));
  } else {
    const { value, ms } = await timed(async () => {
      const row = await admin.from('users').select('id', { count: 'exact', head: true });
      return row;
    });
    if (value.error) {
      checks.push(check('db-service', 'Core', 'Database (service role)', 'error', value.error.message, ms));
    } else {
      checks.push(check('db-service', 'Core', 'Database (service role)', 'ok', `Connected · ${value.count ?? 0} user records`, ms));
    }
  }

  // Critical tables
  const missing: string[] = [];
  const tableErrors: string[] = [];
  if (hasService) {
    await Promise.all(CRITICAL_TABLES.map(async (table) => {
      const { error } = await admin.from(table).select('*', { count: 'exact', head: true });
      if (!error) return;
      if (/does not exist|schema cache/i.test(error.message)) missing.push(table);
      else tableErrors.push(`${table}: ${error.message}`);
    }));
  }
  checks.push(check(
    'db-tables',
    'Core',
    'Critical tables',
    missing.length || tableErrors.length ? 'error' : hasService ? 'ok' : 'warn',
    missing.length
      ? `Missing: ${missing.join(', ')}`
      : tableErrors.length
        ? tableErrors[0]
        : 'users, messages, resources, posts, assignments, settings reachable'
  ));

  // Auth admin API
  if (hasService) {
    const { value, ms } = await timed(() => admin.auth.admin.listUsers({ page: 1, perPage: 1 }));
    checks.push(check(
      'auth',
      'Core',
      'Supabase Auth',
      value.error ? 'error' : 'ok',
      value.error ? value.error.message : 'Admin auth API reachable',
      ms
    ));
  } else {
    checks.push(check('auth', 'Core', 'Supabase Auth', 'warn', 'Cannot verify — service role missing.'));
  }

  // Storage buckets
  if (hasService) {
    const { value, ms } = await timed(() => admin.storage.listBuckets());
    const names = (value.data || []).map(b => b.name);
    const needed = ['materials', 'gallery'];
    const absent = needed.filter(n => !names.includes(n));
    checks.push(check(
      'storage',
      'Core',
      'File storage',
      value.error ? 'error' : absent.length ? 'warn' : 'ok',
      value.error
        ? value.error.message
        : absent.length
          ? `Buckets missing: ${absent.join(', ')}. Run teacher_materials.sql for materials.`
          : `Public buckets ready (${needed.join(', ')})`,
      ms
    ));
  } else {
    checks.push(check('storage', 'Core', 'File storage', 'warn', 'Cannot list buckets — service role missing.'));
  }

  if (!CLASSROOM_PROXY) {
    checks.push(check(
      'classroom-proxy',
      'Classroom',
      'Cloud Classroom Proxy',
      'warn',
      'NEXT_PUBLIC_CLASSROOM_TOKEN_URL is not set.'
    ));
  } else {
    const classroom = await httpProbe(CLASSROOM_PROXY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room: 'health-check', name: 'Health', email: 'health@ilmversinstitute.com', role: 'admin' }),
    });
    checks.push(check(
      'classroom-proxy',
      'Classroom',
      'Cloud Classroom Proxy',
      classroom.reachable && (classroom.status || 0) < 500 ? 'ok' : 'error',
      classroom.reachable
        ? `Token service responded HTTP ${classroom.status}`
        : `Unreachable: ${classroom.error}`,
      classroom.ms
    ));
  }

  const jaasId = process.env.NEXT_PUBLIC_JAAS_APP_ID;
  checks.push(check(
    'jaas',
    'Classroom',
    'JaaS app ID',
    configured(jaasId) ? 'ok' : 'warn',
    configured(jaasId) ? 'NEXT_PUBLIC_JAAS_APP_ID is set' : 'Using bundled fallback app ID — set NEXT_PUBLIC_JAAS_APP_ID for production'
  ));

  const jitsi = await httpProbe('https://8x8.vc/external_api.js', { method: 'GET' });
  checks.push(check(
    'jitsi',
    'Classroom',
    'Ilmvers Virtual Classroom SDK',
    jitsi.ok ? 'ok' : jitsi.reachable ? 'warn' : 'error',
    jitsi.ok ? 'external_api.js reachable' : jitsi.reachable ? `HTTP ${jitsi.status}` : `Unreachable: ${jitsi.error}`,
    jitsi.ms
  ));

  // Hifz / AI
  let hifzMode = 'unset';
  if (hasService) {
    const { data } = await admin.from('system_settings').select('value').eq('key', 'hifz_mode').maybeSingle();
    if (data?.value != null) {
      hifzMode = typeof data.value === 'string' ? data.value.replace(/^"|"$/g, '') : String(data.value);
    }
  }
  const openaiKey = process.env.OPENAI_API_KEY;
  let openaiStatus: HealthLevel = configured(openaiKey) ? 'ok' : 'warn';
  let openaiDetail = configured(openaiKey) ? 'API key configured' : 'OPENAI_API_KEY missing — AI chat and premium Hifz will fail';
  let openaiMs: number | undefined;
  if (configured(openaiKey)) {
    const probe = await httpProbe('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${openaiKey}` },
    }, 10000);
    openaiMs = probe.ms;
    if (!probe.reachable) {
      openaiStatus = 'error';
      openaiDetail = `OpenAI unreachable: ${probe.error}`;
    } else if (!probe.ok) {
      openaiStatus = 'error';
      openaiDetail = `OpenAI rejected the key (HTTP ${probe.status})`;
    } else {
      openaiDetail = 'OpenAI API accepted the key';
    }
  }
  checks.push(check('openai', 'AI', 'OpenAI (chat + premium Hifz)', openaiStatus, openaiDetail, openaiMs));

  const aligner = await httpProbe('http://127.0.0.1:8000/docs', { method: 'GET' }, 2000);
  checks.push(check(
    'hifz-aligner',
    'AI',
    'Hifz alignment engine',
    aligner.ok ? 'ok' : 'warn',
    aligner.ok
      ? 'Local Wav2Vec2 aligner is running on :8000'
      : `Mode: ${hifzMode || 'unset'}. Local aligner at 127.0.0.1:8000 is not running on this host — /api/hifz-review will fail until it is deployed remotely.`,
    aligner.ms
  ));

  const quran = await httpProbe('https://api.quran.com/api/v4/chapters?language=en');
  checks.push(check(
    'quran-api',
    'AI',
    'Quran.com API',
    quran.ok ? 'ok' : 'error',
    quran.ok ? 'Search / verse lookup reachable' : quran.reachable ? `HTTP ${quran.status}` : `Unreachable: ${quran.error}`,
    quran.ms
  ));

  // Email
  const resendKey = process.env.RESEND_API_KEY;
  if (!configured(resendKey)) {
    checks.push(check('email', 'Comms', 'Transactional email (Resend)', 'error', 'RESEND_API_KEY is missing — receipts, reminders, and admin mail will not send.'));
  } else {
    const probe = await httpProbe('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${resendKey}` },
    });
    checks.push(check(
      'email',
      'Comms',
      'Transactional email (Resend)',
      probe.ok ? 'ok' : 'error',
      probe.ok ? 'Resend API key is valid' : probe.reachable ? `Resend HTTP ${probe.status}` : `Unreachable: ${probe.error}`,
      probe.ms
    ));
  }

  const waToken = process.env.META_WHATSAPP_TOKEN;
  const waPhone = process.env.META_PHONE_ID;
  checks.push(check(
    'whatsapp',
    'Comms',
    'WhatsApp alerts',
    configured(waToken) && configured(waPhone) ? 'ok' : 'warn',
    configured(waToken) && configured(waPhone)
      ? 'Meta token and phone ID are set'
      : 'META_WHATSAPP_TOKEN or META_PHONE_ID missing — assignment WhatsApp alerts are skipped'
  ));

  const vapidOk = configured(process.env.VAPID_PUBLIC_KEY) && configured(process.env.VAPID_PRIVATE_KEY);
  checks.push(check(
    'push',
    'Comms',
    'Web push (VAPID)',
    vapidOk ? 'ok' : 'warn',
    vapidOk ? 'VAPID keys configured' : 'VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY missing — browser push will fail'
  ));

  const turnstileSite = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
  checks.push(check(
    'turnstile',
    'Security',
    'Cloudflare Turnstile',
    configured(turnstileSite) && configured(turnstileSecret) ? 'ok' : 'warn',
    configured(turnstileSite) && configured(turnstileSecret)
      ? 'Site key and secret are set'
      : 'Turnstile keys missing — bot check is currently bypassed'
  ));

  const cronSecret = process.env.CRON_SECRET;
  checks.push(check(
    'cron-secret',
    'Jobs',
    'Cron authentication',
    configured(cronSecret) ? 'ok' : 'error',
    configured(cronSecret)
      ? 'CRON_SECRET set · jobs: subscriptions, class reminders, message purge, assignment sync'
      : 'CRON_SECRET missing — scheduled billing, reminders, and message purge will reject'
  ));

  // Payments
  const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
  const paystackPublic = process.env.NEXT_PUBLIC_PAYSTACK_KEY;
  if (!configured(paystackSecret)) {
    checks.push(check(
      'paystack',
      'Billing',
      'Paystack',
      configured(paystackPublic) ? 'warn' : 'error',
      configured(paystackPublic) ? 'Public key set but PAYSTACK_SECRET_KEY missing — webhooks and charging will fail' : 'Paystack keys are not configured'
    ));
  } else {
    const probe = await httpProbe('https://api.paystack.co/balance', {
      headers: { Authorization: `Bearer ${paystackSecret}` },
    });
    checks.push(check(
      'paystack',
      'Billing',
      'Paystack',
      probe.ok ? 'ok' : 'error',
      probe.ok ? 'Secret key accepted by Paystack' : probe.reachable ? `Paystack HTTP ${probe.status}` : `Unreachable: ${probe.error}`,
      probe.ms
    ));
  }

  const fwSecret = process.env.FLUTTERWAVE_SECRET_KEY;
  const fwPublic = process.env.NEXT_PUBLIC_FLUTTERWAVE_KEY;
  const fwHash = process.env.FLUTTERWAVE_SECRET_HASH;
  if (!configured(fwSecret)) {
    checks.push(check(
      'flutterwave',
      'Billing',
      'Flutterwave',
      configured(fwPublic) ? 'warn' : 'warn',
      configured(fwPublic) ? 'Public key set but FLUTTERWAVE_SECRET_KEY missing' : 'Flutterwave keys not configured'
    ));
  } else {
    const probe = await httpProbe('https://api.flutterwave.com/v3/balances', {
      headers: { Authorization: `Bearer ${fwSecret}` },
    });
    checks.push(check(
      'flutterwave',
      'Billing',
      'Flutterwave',
      probe.ok ? 'ok' : 'error',
      probe.ok
        ? (configured(fwHash) ? 'Secret key accepted' : 'Key works, but FLUTTERWAVE_SECRET_HASH is missing — webhooks are unverified')
        : probe.reachable ? `Flutterwave HTTP ${probe.status}` : `Unreachable: ${probe.error}`,
      probe.ms
    ));
  }

  const summary = checks.reduce(
    (acc, c) => {
      acc[c.status] += 1;
      return acc;
    },
    { ok: 0, warn: 0, error: 0 }
  );

  return { checkedAt: new Date().toISOString(), summary, checks };
}
