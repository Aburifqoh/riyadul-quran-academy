import type { UserData } from '@/types/user';

export const BILLING_CYCLE_DAYS = 30;
export const MULTI_MONTH_DISCOUNT = 0.02;

export const PREPAID_MONTH_OPTIONS = [
  { months: 1, label: '1 month', hint: 'Standard monthly rate' },
  { months: 3, label: '3 months', hint: '2% off' },
  { months: 6, label: '6 months', hint: '2% off' },
  { months: 12, label: '12 months', hint: '2% off' },
] as const;

export function prepaidDiscountRate(months: number): number {
  return months > 1 ? MULTI_MONTH_DISCOUNT : 0;
}

export function prepaidTotal(monthlyAmount: number, months: number): {
  months: number;
  monthly: number;
  subtotal: number;
  discountRate: number;
  discount: number;
  total: number;
} {
  const safeMonths = Math.max(1, Math.round(months) || 1);
  const monthly = Math.max(0, monthlyAmount);
  const subtotal = monthly * safeMonths;
  const discountRate = prepaidDiscountRate(safeMonths);
  const discount = Math.round(subtotal * discountRate);
  return {
    months: safeMonths,
    monthly,
    subtotal,
    discountRate,
    discount,
    total: Math.max(0, subtotal - discount),
  };
}

export const TUITION_PLANS = [
  { value: 'group', label: 'Group Class' },
  { value: 'onetoone', label: 'One-to-One Class' },
  { value: 'ijazah', label: 'Ijazah Program' },
  { value: 'hifdh_intensive', label: 'Hifz Intensive' },
  { value: 'Weekend School', label: 'Weekend School' },
] as const;

export function addBillingDays(from = new Date(), days = BILLING_CYCLE_DAYS): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d;
}

export function formatBillingDate(iso?: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function hasActiveCard(user: Pick<UserData, 'gateway_auth_token' | 'cancelled_at' | 'scholarship'>): boolean {
  return !!user.gateway_auth_token && !user.cancelled_at && !user.scholarship;
}

/** Live card auto-renew uses next_billing_date as the next charge, not an access cutoff. */
export function isManualBillingCycle(user: Pick<UserData, 'gateway_auth_token' | 'cancelled_at' | 'scholarship'>): boolean {
  return !hasActiveCard(user);
}

function firstValidIso(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value !== 'string' || !value.trim()) continue;
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return null;
}

/** Map whatever column name the DB used onto lastPaymentDate / next_billing_date. */
export function normalizeBillingFields<T extends Record<string, unknown> | UserData>(user: T): T {
  const row = user as Record<string, unknown>;
  const start = firstValidIso(
    row.lastPaymentDate,
    row.last_payment_date,
    row.lastpaymentdate,
  );
  const expiry = firstValidIso(
    row.next_billing_date,
    row.nextBillingDate,
    row.nextbillingdate,
  );
  if (start && !row.lastPaymentDate) row.lastPaymentDate = start;
  if (expiry && !row.next_billing_date) row.next_billing_date = expiry;
  return user;
}

export function subscriptionStartIso(user?: UserData | Record<string, unknown> | null): string | null {
  if (!user) return null;
  const row = user as Record<string, unknown>;
  return firstValidIso(
    row.lastPaymentDate,
    row.last_payment_date,
    row.lastpaymentdate,
    row.createdAt,
    row.created_at,
  );
}

export function subscriptionExpiryIso(user?: UserData | Record<string, unknown> | null): string | null {
  if (!user) return null;
  const row = user as Record<string, unknown>;
  const explicit = firstValidIso(row.next_billing_date, row.nextBillingDate, row.nextbillingdate);
  if (explicit) return explicit;
  const start = firstValidIso(row.lastPaymentDate, row.last_payment_date, row.lastpaymentdate);
  if (start) return addBillingDays(new Date(start)).toISOString();
  return null;
}

export function isSubscriptionExpired(user: UserData): boolean {
  if (hasActiveCard(user)) return false;
  const expiry = subscriptionExpiryIso(user);
  if (!expiry) return false;
  return new Date(expiry) <= new Date();
}

export function isSubscriptionActive(user: UserData): boolean {
  if (user.grace_period_until && new Date(user.grace_period_until) > new Date()) return true;
  if (isSubscriptionExpired(user)) return false;
  return !!(user.paymentVerified || user.status === 'active');
}

export function planLabel(plan?: string | null): string {
  if (!plan) return 'No plan';
  const key = plan.trim().toLowerCase().replace(/[\s-]+/g, '_');
  const aliases: Record<string, string> = {
    onetoone: 'onetoone',
    one_on_one: 'onetoone',
    one_to_one: 'onetoone',
    '1_1': 'onetoone',
  };
  const mapped = aliases[key] || plan;
  return TUITION_PLANS.find(p => p.value === mapped || p.value === plan)?.label || plan;
}

export type HourlyRates = { group: number; oneToOne: number; ijazah: number };

export function parseHourlyRates(value: unknown): HourlyRates {
  let raw = value;
  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw); } catch { raw = null; }
  }
  const rec = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const group = Number(rec.group);
  const oneToOne = Number(rec.oneToOne);
  const ijazah = Number(rec.ijazah);
  return {
    group: Number.isFinite(group) && group > 0 ? group : 0,
    oneToOne: Number.isFinite(oneToOne) && oneToOne > 0 ? oneToOne : 0,
    ijazah: Number.isFinite(ijazah) && ijazah > 0 ? ijazah : 0,
  };
}

/** True for QA / e2e seats that must never count as institute revenue. */
export function isSandboxFinanceEmail(email?: string | null): boolean {
  const e = String(email || '').trim().toLowerCase();
  if (!e) return false;
  return (
    e.includes('e2e-test')
    || e.startsWith('testing_')
    || e.startsWith('testing+')
    || e.includes('+test@')
    || e.endsWith('@example.com')
    || e.endsWith('@test.com')
  );
}

export function isSandboxAccount(user?: { email?: unknown; name?: unknown } | null): boolean {
  if (!user) return false;
  const name = String(user.name ?? '').trim().toLowerCase();
  return (
    isSandboxFinanceEmail(String(user.email ?? ''))
    || name.startsWith('testing ')
    || name.startsWith('testing_')
    || name.includes('test student')
    || name === 'testing teacher'
    || /^test(?:ing)?[\s_\d]*$/.test(name)
  );
}

export function isSandboxFinanceReference(reference?: string | null): boolean {
  const ref = String(reference || '').trim().toLowerCase();
  return ref.startsWith('test-ref') || ref.includes('e2e-test') || ref.startsWith('test_');
}

/** Only a price that was actually stored on the student. Never a rate-card estimate. */
export function recordedTuitionAmount(user: Pick<UserData, 'base_usd_price'>): number {
  const stored = Number(user.base_usd_price);
  return Number.isFinite(stored) && stored > 0 ? Math.round(stored) : 0;
}

/** Stored payment amount, or rate-card estimate for quoting a new grant. Not live revenue. */
export function monthlyTuitionAmount(
  user: Pick<UserData, 'base_usd_price' | 'tuitionPlan' | 'planDays'>,
  hourlyRates?: HourlyRates | null
): number {
  const recorded = recordedTuitionAmount(user);
  if (recorded > 0) return recorded;

  const key = String(user.tuitionPlan || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!key || !hourlyRates) return 0;
  const hours = Math.max(1, Number(user.planDays) || 2) * 4;

  if (key.includes('group') && hourlyRates.group > 0) return Math.round(hourlyRates.group * hours);
  if ((key.includes('onetoone') || key.includes('oneonone')) && hourlyRates.oneToOne > 0) {
    return Math.round(hourlyRates.oneToOne * hours);
  }
  if (key.includes('ijazah') && hourlyRates.ijazah > 0) return Math.round(hourlyRates.ijazah * hours);
  return 0;
}

export function paidThisCycle(user: UserData): boolean {
  if (!isSubscriptionActive(user) || user.scholarship) return false;
  const start = firstValidIso(user.lastPaymentDate);
  if (!start) return false;
  return new Date(start).getTime() > Date.now() - BILLING_CYCLE_DAYS * 24 * 60 * 60 * 1000;
}

export function grantPaidCycle(options: {
  scholarship?: boolean;
  tuitionPlan?: string;
  from?: Date;
  months?: number;
}): Record<string, string | boolean | null> {
  const start = options.from || new Date();
  const months = Math.max(1, Math.round(options.months || 1));
  return {
    paymentVerified: true,
    status: 'active',
    scholarship: !!options.scholarship,
    lastPaymentDate: start.toISOString(),
    next_billing_date: addBillingDays(start, months * BILLING_CYCLE_DAYS).toISOString(),
    grace_period_until: null,
    ...(options.tuitionPlan ? { tuitionPlan: options.tuitionPlan } : {}),
  };
}

export function revokePaidAccess(): Record<string, string | boolean | null> {
  return {
    paymentVerified: false,
    status: 'pending',
    scholarship: false,
    grace_period_until: null,
  };
}

export function billingStatus(user: UserData): {
  label: string;
  tone: 'paid' | 'scholarship' | 'expired' | 'unpaid';
} {
  if (isSubscriptionExpired(user)) return { label: 'Expired', tone: 'expired' };
  if (user.scholarship && isSubscriptionActive(user)) return { label: 'Scholarship', tone: 'scholarship' };
  if (isSubscriptionActive(user)) return { label: 'Paid', tone: 'paid' };
  return { label: 'Unpaid', tone: 'unpaid' };
}

export function daysUntil(iso?: string | null): number | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return Math.ceil((date.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

export type CollectionMethod = 'auto_renew' | 'manual' | 'scholarship' | 'cancelled' | 'grace';

export function collectionMethod(user: UserData): CollectionMethod {
  if (user.scholarship && isSubscriptionActive(user)) return 'scholarship';
  if (user.cancelled_at) return 'cancelled';
  if (user.grace_period_until && new Date(user.grace_period_until) > new Date()) return 'grace';
  if (hasActiveCard(user)) return 'auto_renew';
  return 'manual';
}

export function collectionMethodLabel(method: CollectionMethod): string {
  return {
    auto_renew: 'Card auto-renew',
    manual: 'Manual / invoice',
    scholarship: 'Scholarship',
    cancelled: 'Cancelled card',
    grace: 'Grace period',
  }[method];
}

export type AgingBucket = 'current' | 'due_soon' | 'overdue' | 'unpaid';

export function agingBucket(user: UserData): AgingBucket {
  if (isSubscriptionExpired(user)) return 'overdue';
  if (!isSubscriptionActive(user)) return 'unpaid';
  const days = daysUntil(subscriptionExpiryIso(user));
  if (days !== null && days <= 7 && isManualBillingCycle(user)) return 'due_soon';
  return 'current';
}

export function formatUsd(amount: number): string {
  const n = Number.isFinite(amount) ? amount : 0;
  return `$${Math.round(n).toLocaleString('en-US')}`;
}
