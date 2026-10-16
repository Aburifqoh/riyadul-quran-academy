'use client';

import type { UserData } from '@/types/user';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchUsersByRoles } from '@/lib/fetchAllUsers';
import { authFetch } from '@/lib/authFetch';
import { getErrorMessage } from '@/lib/errors';
import {
  agingBucket,
  billingStatus,
  collectionMethod,
  collectionMethodLabel,
  daysUntil,
  formatBillingDate,
  formatUsd,
  isSubscriptionActive,
  isSandboxAccount,
  monthlyTuitionAmount,
  paidThisCycle,
  planLabel,
  recordedTuitionAmount,
  PREPAID_MONTH_OPTIONS,
  prepaidTotal,
  subscriptionExpiryIso,
  TUITION_PLANS,
  type HourlyRates,
} from '@/lib/billing';
import { updatePricingRates } from '@/app/actions/settings';
import {
  AlertTriangle,
  Banknote,
  CalendarClock,
  CreditCard,
  Download,
  GraduationCap,
  RefreshCw,
  Search,
  Settings2,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Tab = 'overview' | 'accounts' | 'collections' | 'scholarships' | 'ledger' | 'pricing';
type StatusFilter = 'all' | 'paid' | 'scholarship' | 'expired' | 'unpaid';

type LedgerRow = {
  id: string;
  reference: string;
  gateway: string;
  email: string;
  amount: number;
  processed_at: string;
};

function toneClass(tone: 'paid' | 'scholarship' | 'expired' | 'unpaid') {
  return {
    paid: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    scholarship: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    expired: 'bg-red-50 text-red-700 border-red-100',
    unpaid: 'bg-amber-50 text-amber-700 border-amber-100',
  }[tone];
}

export function RevenueBillingOffice({ compact = false }: { compact?: boolean }) {
  const [students, setStudents] = useState<UserData[]>([]);
  const [payments, setPayments] = useState<LedgerRow[]>([]);
  const [hourlyRates, setHourlyRates] = useState<HourlyRates | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [savingId, setSavingId] = useState('');
  const [paidMonths, setPaidMonths] = useState(1);
  const [scholarshipTarget, setScholarshipTarget] = useState<UserData | null>(null);
  const [scholarshipPlan, setScholarshipPlan] = useState('onetoone');
  const [scholarshipMonths, setScholarshipMonths] = useState(1);
  const [pricing, setPricing] = useState({ group: 8, oneToOne: 10, ijazah: 12 });
  const [savingPricing, setSavingPricing] = useState(false);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    const [roster, billing] = await Promise.all([
      fetchUsersByRoles(['student', 'parent']),
      authFetch('/api/admin/billing').then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not load billing.');
        return data as { payments: LedgerRow[]; rates: HourlyRates };
      }),
    ]);
    setStudents(roster);
    setPayments((billing.payments || []).map((p) => ({ ...p, amount: Number(p.amount) || 0 })));
    setHourlyRates(billing.rates);
    if (billing.rates) setPricing(billing.rates);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [roster, billing] = await Promise.all([
          fetchUsersByRoles(['student', 'parent']),
          authFetch('/api/admin/billing').then(async (res) => {
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Could not load billing.');
            return data as { payments: LedgerRow[]; rates: HourlyRates };
          }),
        ]);
        if (cancelled) return;
        setStudents(roster);
        setPayments((billing.payments || []).map((p) => ({ ...p, amount: Number(p.amount) || 0 })));
        setHourlyRates(billing.rates);
        if (billing.rates) setPricing(billing.rates);
        setLoading(false);
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setNotice(getErrorMessage(err) || 'Could not load finance data.');
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const applyBilling = async (
    id: string,
    action: 'paid' | 'scholarship' | 'unpaid',
    tuitionPlan?: string | null,
    months = 1
  ) => {
    setSavingId(id);
    setNotice('');
    try {
      const res = await authFetch('/api/admin/billing', {
        method: 'POST',
        body: JSON.stringify({ userId: id, action, tuitionPlan, months }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      await load();
    } catch (err: unknown) {
      setNotice(getErrorMessage(err) || 'Billing update failed.');
    } finally {
      setSavingId('');
    }
  };

  const stats = useMemo(() => {
    const live = students.filter((s) => !isSandboxAccount(s));
    const sandboxCount = students.length - live.length;
    const amount = (s: UserData) => recordedTuitionAmount(s);
    const paying = live.filter((s) => isSubscriptionActive(s) && !s.scholarship);
    const scholarships = live.filter((s) => s.scholarship && isSubscriptionActive(s));
    const overdue = live.filter((s) => agingBucket(s) === 'overdue');
    const unpaid = live.filter((s) => agingBucket(s) === 'unpaid');
    const dueSoon = live.filter((s) => agingBucket(s) === 'due_soon');
    const autoRenew = live.filter((s) => collectionMethod(s) === 'auto_renew');
    const mrr = paying.reduce((sum, s) => sum + amount(s), 0);
    const waived = scholarships.reduce((sum, s) => sum + amount(s), 0);
    const outstanding = [...overdue, ...unpaid].reduce((sum, s) => sum + amount(s), 0);
    const realized = live.filter(paidThisCycle).reduce((sum, s) => sum + amount(s), 0);
    const receipts = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const planMix = TUITION_PLANS.map((plan) => ({
      label: plan.label,
      count: live.filter((s) => planLabel(s.tuitionPlan) === plan.label).length,
      mrr: paying.filter((s) => planLabel(s.tuitionPlan) === plan.label).reduce((sum, s) => sum + amount(s), 0),
    })).filter((row) => row.count > 0);
    return {
      enrolled: live.length,
      sandboxCount,
      paying: paying.length,
      scholarships: scholarships.length,
      overdue: overdue.length,
      unpaid: unpaid.length,
      dueSoon: dueSoon.length,
      autoRenew: autoRenew.length,
      mrr,
      waived,
      outstanding,
      realized,
      receipts,
      avg: paying.length ? Math.round(mrr / paying.length) : 0,
      started: receipts === 0 && mrr === 0 && realized === 0,
      planMix,
      overdueList: overdue,
      unpaidList: unpaid,
      dueSoonList: dueSoon,
      scholarshipList: scholarships,
    };
  }, [students, payments]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      const status = billingStatus(s);
      if (statusFilter !== 'all' && status.tone !== statusFilter) return false;
      if (!q) return true;
      return [s.name, s.email, s.tuitionPlan, s.country, s.payment_gateway]
        .some((value) => String(value || '').toLowerCase().includes(q));
    });
  }, [students, search, statusFilter]);

  const exportCsv = (rows: UserData[], filename: string) => {
    const header = 'Name,Email,Plan,Days/week,Monthly USD,Status,Collection,Started,Expires,Country,Gateway';
    const body = rows.map((s) => {
      const status = billingStatus(s);
      return [
        s.name, s.email, planLabel(s.tuitionPlan), s.planDays || '',
        monthlyTuitionAmount(s, hourlyRates), status.label,
        collectionMethodLabel(collectionMethod(s)),
        formatBillingDate(s.lastPaymentDate),
        formatBillingDate(subscriptionExpiryIso(s)),
        s.country || '', s.payment_gateway || '',
      ].map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',');
    });
    const blob = new Blob([[header, ...body].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const savePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPricing(true);
    const result = await updatePricingRates(pricing);
    setSavingPricing(false);
    if (!result.success) {
      setNotice(result.error || 'Could not save rates.');
      return;
    }
    setHourlyRates(pricing);
    setNotice('Hourly rates updated. New enrolments use these prices immediately.');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'accounts', label: 'Student accounts' },
    { id: 'collections', label: `Collections (${stats.dueSoon + stats.overdue + stats.unpaid})` },
    { id: 'scholarships', label: `Scholarships (${stats.scholarships})` },
    { id: 'ledger', label: 'Gateway ledger' },
    { id: 'pricing', label: 'Tuition rates' },
  ];

  return (
    <div className={cn('space-y-6', !compact && 'max-w-7xl mx-auto pb-10')}>
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h2 className={cn('font-headers font-bold text-secondary m-0 flex items-center gap-3', compact ? 'text-2xl' : 'text-3xl')}>
            <Banknote className="w-8 h-8 text-emerald-500" /> Revenue & Billing
          </h2>
          <p className="text-gray-500 m-0 mt-1">
            Only recorded tuition and real Paystack/Flutterwave receipts. Rate-card estimates and test seats are not counted as money.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void load()} className="px-4 py-2 rounded-full text-sm font-bold border border-gray-200 text-gray-600 hover:bg-gray-50 inline-flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button type="button" onClick={() => exportCsv(students, `ilmvers-billing-${new Date().toISOString().slice(0, 10)}.csv`)} className="px-4 py-2 rounded-full text-sm font-bold bg-secondary text-white hover:bg-secondary/90 inline-flex items-center gap-2">
            <Download className="w-4 h-4" /> Export accounts
          </button>
        </div>
      </div>

      {notice && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 text-sm font-medium text-amber-800">{notice}</div>
      )}

      <div className="flex flex-wrap gap-2 bg-white border border-gray-100 rounded-2xl p-1.5 shadow-sm">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-bold transition-colors',
              tab === item.id ? 'bg-secondary text-white' : 'text-gray-500 hover:bg-gray-50'
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          {stats.started && (
            <div className="p-5 rounded-[28px] bg-emerald-50 border border-emerald-100">
              <p className="font-bold text-emerald-800 m-0">Institute start — no live payments yet</p>
              <p className="text-sm text-emerald-700 m-0 mt-1">
                August has $0 in recorded tuition and $0 in gateway receipts. Totals stay at zero until a real checkout or a stored fee is written on a student.
                {stats.sandboxCount > 0 ? ` ${stats.sandboxCount} test seat${stats.sandboxCount === 1 ? '' : 's'} are hidden from these numbers.` : ''}
              </p>
            </div>
          )}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <Kpi title="Monthly recurring" value={formatUsd(stats.mrr)} hint={stats.mrr ? `${stats.paying} seats with a stored fee` : 'No stored tuition yet'} icon={<Wallet className="w-5 h-5" />} tone="emerald" />
            <Kpi title="Collected this cycle" value={formatUsd(stats.realized)} hint="Recorded fees paid in the last 30 days" icon={<Banknote className="w-5 h-5" />} tone="blue" />
            <Kpi title="Outstanding" value={formatUsd(stats.outstanding)} hint={`${stats.overdue} overdue · ${stats.unpaid} never paid`} icon={<AlertTriangle className="w-5 h-5" />} tone="amber" />
            <Kpi title="Scholarship waiver" value={formatUsd(stats.waived)} hint={`${stats.scholarships} funded seats`} icon={<GraduationCap className="w-5 h-5" />} tone="indigo" />
          </div>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <Kpi title="Live enrolments" value={String(stats.enrolled)} hint={stats.sandboxCount ? `${stats.sandboxCount} test seats excluded` : 'Students and parents'} />
            <Kpi title="Auto-renew cards" value={String(stats.autoRenew)} hint="Paystack / Flutterwave token on file" icon={<CreditCard className="w-5 h-5" />} />
            <Kpi title="Renewals in 7 days" value={String(stats.dueSoon)} hint="Manual cycles ending soon" icon={<CalendarClock className="w-5 h-5" />} />
            <Kpi title="Avg. paying tuition" value={formatUsd(stats.avg)} hint="Among active paid seats" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-[32px] border border-gray-100 p-6 shadow-sm">
              <h3 className="font-headers font-bold text-secondary m-0 mb-4">Plan mix</h3>
              {stats.planMix.length === 0 ? (
                <p className="text-sm text-gray-400 m-0">No tuition plans assigned yet.</p>
              ) : (
                <div className="space-y-3">
                  {stats.planMix.map((row) => (
                    <div key={row.label}>
                      <div className="flex justify-between text-sm font-medium text-gray-600 mb-1">
                        <span>{row.label}</span>
                        <span>{row.count} · {formatUsd(row.mrr)}/mo</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.max(8, (row.count / Math.max(stats.enrolled, 1)) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-white rounded-[32px] border border-gray-100 p-6 shadow-sm">
              <h3 className="font-headers font-bold text-secondary m-0 mb-4">Gateway receipts</h3>
              <p className="text-3xl font-headers font-bold text-secondary m-0">{formatUsd(stats.receipts)}</p>
              <p className="text-sm text-gray-500 mt-1">
                {payments.length === 0 ? 'No live gateway payments posted yet.' : `${payments.length} captured Paystack/Flutterwave payments`}
              </p>
              <p className="text-xs text-gray-400 mt-4 m-0">
                Only webhook receipts from real checkouts. Test/e2e rows are excluded. Recurring totals above use a stored fee on the student, not a guessed rate-card price.
              </p>
            </div>
          </div>
        </div>
      )}

      {tab === 'accounts' && (
        <AccountsPanel
          rows={filtered}
          hourlyRates={hourlyRates}
          search={search}
          setSearch={setSearch}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          paidMonths={paidMonths}
          setPaidMonths={setPaidMonths}
          savingId={savingId}
          onPaid={(s) => applyBilling(s.id, 'paid', s.tuitionPlan, paidMonths)}
          onUnpaid={(s) => applyBilling(s.id, 'unpaid')}
          onScholarship={(s) => { setScholarshipTarget(s); setScholarshipPlan(s.tuitionPlan || 'onetoone'); }}
        />
      )}

      {tab === 'collections' && (
        <div className="space-y-6">
          <AccountTable title="Due in the next 7 days" rows={stats.dueSoonList} hourlyRates={hourlyRates} savingId={savingId} paidMonths={paidMonths} onPaid={(s) => applyBilling(s.id, 'paid', s.tuitionPlan, paidMonths)} onUnpaid={(s) => applyBilling(s.id, 'unpaid')} onScholarship={(s) => { setScholarshipTarget(s); setScholarshipPlan(s.tuitionPlan || 'onetoone'); }} />
          <AccountTable title="Overdue" rows={stats.overdueList} hourlyRates={hourlyRates} savingId={savingId} paidMonths={paidMonths} onPaid={(s) => applyBilling(s.id, 'paid', s.tuitionPlan, paidMonths)} onUnpaid={(s) => applyBilling(s.id, 'unpaid')} onScholarship={(s) => { setScholarshipTarget(s); setScholarshipPlan(s.tuitionPlan || 'onetoone'); }} />
          <AccountTable title="Never paid" rows={stats.unpaidList} hourlyRates={hourlyRates} savingId={savingId} paidMonths={paidMonths} onPaid={(s) => applyBilling(s.id, 'paid', s.tuitionPlan, paidMonths)} onUnpaid={(s) => applyBilling(s.id, 'unpaid')} onScholarship={(s) => { setScholarshipTarget(s); setScholarshipPlan(s.tuitionPlan || 'onetoone'); }} />
        </div>
      )}

      {tab === 'scholarships' && (
        <AccountTable
          title="Active scholarships"
          empty="No funded seats right now."
          rows={stats.scholarshipList}
          hourlyRates={hourlyRates}
          savingId={savingId}
          paidMonths={paidMonths}
          onPaid={(s) => applyBilling(s.id, 'paid', s.tuitionPlan, paidMonths)}
          onUnpaid={(s) => applyBilling(s.id, 'unpaid')}
          onScholarship={(s) => { setScholarshipTarget(s); setScholarshipPlan(s.tuitionPlan || 'onetoone'); }}
        />
      )}

      {tab === 'ledger' && (
        <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <h3 className="font-headers font-bold text-secondary m-0">Payment gateway ledger</h3>
            <p className="text-sm text-gray-500 m-0 mt-1">References posted by Paystack and Flutterwave webhooks.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-[10px] uppercase tracking-widest text-gray-400 font-black">
                <tr>
                  <th className="px-6 py-3">When</th>
                  <th className="px-6 py-3">Payer</th>
                  <th className="px-6 py-3">Gateway</th>
                  <th className="px-6 py-3">Reference</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {payments.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-bold">No gateway receipts yet.</td></tr>
                ) : payments.map((p) => (
                  <tr key={p.id}>
                    <td className="px-6 py-4 whitespace-nowrap">{formatBillingDate(p.processed_at)}</td>
                    <td className="px-6 py-4">{p.email}</td>
                    <td className="px-6 py-4 capitalize">{p.gateway}</td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-500">{p.reference}</td>
                    <td className="px-6 py-4 text-right font-bold">{formatUsd(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'pricing' && (
        <form onSubmit={savePricing} className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm space-y-6">
          <div>
            <h3 className="font-headers font-bold text-secondary m-0 flex items-center gap-2"><Settings2 className="w-5 h-5" /> Base hourly rates (USD)</h3>
            <p className="text-sm text-gray-500 mt-1">Public pricing and new enrolments use these rates × class days. Stored student prices are not overwritten.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {([
              ['group', 'Group class'],
              ['oneToOne', 'One-to-one'],
              ['ijazah', 'Ijazah'],
            ] as const).map(([key, label]) => (
              <label key={key} className="block">
                <span className="text-xs font-black uppercase tracking-widest text-gray-400">{label}</span>
                <div className="relative mt-2">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    required
                    value={pricing[key]}
                    onChange={(e) => setPricing((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
                    className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl font-bold outline-none focus:border-emerald-400"
                  />
                </div>
              </label>
            ))}
          </div>
          <button type="submit" disabled={savingPricing} className="px-6 py-3 rounded-full font-bold bg-secondary text-white disabled:opacity-50">
            {savingPricing ? 'Saving…' : 'Save tuition rates'}
          </button>
        </form>
      )}

      {scholarshipTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-bold font-headers text-secondary m-0 mb-2">Award scholarship</h3>
            <p className="text-sm text-gray-500 mb-6">
              {scholarshipTarget.name} gets class access with no payment. This is not marked as revenue. Re-award when the cycle ends.
            </p>
            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Plan</label>
            <select value={scholarshipPlan} onChange={(e) => setScholarshipPlan(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl mb-4">
              {TUITION_PLANS.map((plan) => <option key={plan.value} value={plan.value}>{plan.label}</option>)}
            </select>
            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Duration</label>
            <select value={scholarshipMonths} onChange={(e) => setScholarshipMonths(Number(e.target.value))} className="w-full px-4 py-3 border border-gray-200 rounded-xl mb-6">
              {PREPAID_MONTH_OPTIONS.map((opt) => <option key={opt.months} value={opt.months}>{opt.label}</option>)}
            </select>
            <div className="flex gap-3">
              <button type="button" onClick={() => setScholarshipTarget(null)} className="flex-1 py-3 rounded-full font-bold border">Cancel</button>
              <button
                type="button"
                disabled={!!savingId}
                onClick={async () => {
                  await applyBilling(scholarshipTarget.id, 'scholarship', scholarshipPlan, scholarshipMonths);
                  setScholarshipTarget(null);
                }}
                className="flex-1 py-3 rounded-full font-bold bg-indigo-600 text-white disabled:opacity-50"
              >
                Award {scholarshipMonths} mo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ title, value, hint, icon, tone }: { title: string; value: string; hint?: string; icon?: React.ReactNode; tone?: 'emerald' | 'blue' | 'amber' | 'indigo' }) {
  const colors = {
    emerald: 'text-emerald-600',
    blue: 'text-blue-600',
    amber: 'text-amber-600',
    indigo: 'text-indigo-600',
  };
  return (
    <div className="bg-white rounded-[28px] border border-gray-100 p-5 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 m-0 flex items-center gap-2">{icon}{title}</p>
      <p className={cn('text-2xl font-headers font-bold m-0 mt-2', tone ? colors[tone] : 'text-secondary')}>{value}</p>
      {hint && <p className="text-xs text-gray-400 m-0 mt-1">{hint}</p>}
    </div>
  );
}

function AccountsPanel(props: {
  rows: UserData[];
  hourlyRates: HourlyRates | null;
  search: string;
  setSearch: (v: string) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (v: StatusFilter) => void;
  paidMonths: number;
  setPaidMonths: (v: number) => void;
  savingId: string;
  onPaid: (s: UserData) => void;
  onUnpaid: (s: UserData) => void;
  onScholarship: (s: UserData) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={props.search} onChange={(e) => props.setSearch(e.target.value)} placeholder="Search name, email, country, gateway…" className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-2xl outline-none focus:border-emerald-400" />
        </div>
        <select value={props.statusFilter} onChange={(e) => props.setStatusFilter(e.target.value as StatusFilter)} className="px-4 py-3 border border-gray-200 rounded-2xl font-bold text-sm">
          <option value="all">All statuses</option>
          <option value="paid">Paid</option>
          <option value="scholarship">Scholarship</option>
          <option value="expired">Expired</option>
          <option value="unpaid">Unpaid</option>
        </select>
        <select value={props.paidMonths} onChange={(e) => props.setPaidMonths(Number(e.target.value))} className="px-4 py-3 border border-gray-200 rounded-2xl font-bold text-sm">
          {PREPAID_MONTH_OPTIONS.map((opt) => <option key={opt.months} value={opt.months}>Grant {opt.label}</option>)}
        </select>
      </div>
      <AccountTable
        rows={props.rows}
        hourlyRates={props.hourlyRates}
        savingId={props.savingId}
        paidMonths={props.paidMonths}
        onPaid={props.onPaid}
        onUnpaid={props.onUnpaid}
        onScholarship={props.onScholarship}
      />
    </div>
  );
}

function AccountTable({
  title,
  empty = 'No accounts in this list.',
  rows,
  hourlyRates,
  savingId,
  paidMonths,
  onPaid,
  onUnpaid,
  onScholarship,
}: {
  title?: string;
  empty?: string;
  rows: UserData[];
  hourlyRates: HourlyRates | null;
  savingId: string;
  paidMonths: number;
  onPaid: (s: UserData) => void;
  onUnpaid: (s: UserData) => void;
  onScholarship: (s: UserData) => void;
}) {
  return (
    <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
      {title && (
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-headers font-bold text-secondary m-0">{title}</h3>
          <span className="text-xs font-bold text-gray-400">{rows.length}</span>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-[10px] uppercase tracking-widest text-gray-400 font-black">
            <tr>
              <th className="px-5 py-3">Account</th>
              <th className="px-5 py-3">Plan / fee</th>
              <th className="px-5 py-3">Collection</th>
              <th className="px-5 py-3">Cycle</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-bold">{empty}</td></tr>
            ) : rows.map((s) => {
              const status = billingStatus(s);
              const method = collectionMethod(s);
              const expiry = subscriptionExpiryIso(s);
              const days = daysUntil(expiry);
              const recorded = recordedTuitionAmount(s);
              const quoted = monthlyTuitionAmount(s, hourlyRates);
              const prepaid = prepaidTotal(quoted, paidMonths);
              const sandbox = isSandboxAccount(s);
              return (
                <tr key={s.id} className="align-top">
                  <td className="px-5 py-4">
                    <div className="font-bold text-secondary">{s.name || 'Unnamed'}</div>
                    <div className="text-xs text-gray-400">{s.email}</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {sandbox && <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Test seat</span>}
                      {s.country && <span className="text-[11px] text-gray-400">{s.country}</span>}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-medium">{planLabel(s.tuitionPlan)}</div>
                    <div className="text-xs text-gray-500">
                      {recorded > 0 ? `${formatUsd(recorded)}/mo recorded` : 'No recorded fee'}
                      {s.planDays ? ` · ${s.planDays}d/wk` : ''}
                    </div>
                    {recorded === 0 && quoted > 0 && (
                      <div className="text-[11px] text-gray-400">Rate card quote {formatUsd(quoted)}/mo</div>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div>{collectionMethodLabel(method)}</div>
                    <div className="text-xs text-gray-400 capitalize">{s.payment_gateway || 'No card'}</div>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div>{formatBillingDate(s.lastPaymentDate)} → {formatBillingDate(expiry)}</div>
                    <div className="text-xs text-gray-400">
                      {days === null ? 'No cycle date' : days < 0 ? `${Math.abs(days)}d overdue` : `${days}d left`}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={cn('px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border', toneClass(status.tone))}>{status.label}</span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button type="button" disabled={savingId === s.id} onClick={() => onPaid(s)} className="text-xs font-bold px-3 py-2 rounded-full border text-emerald-600 border-emerald-200 hover:bg-emerald-50 disabled:opacity-50">
                        Paid {prepaid.months}mo {quoted > 0 ? `${recorded > 0 ? '' : 'est. '}${formatUsd(prepaid.total)}` : ''}
                      </button>
                      <button type="button" disabled={savingId === s.id} onClick={() => onScholarship(s)} className="text-xs font-bold px-3 py-2 rounded-full border text-indigo-600 border-indigo-200 hover:bg-indigo-50 disabled:opacity-50" title="Opens class access with no payment. Does not count as revenue.">
                        {s.scholarship ? 'Extend scholarship' : 'Scholarship (free)'}
                      </button>
                      {isSubscriptionActive(s) && (
                        <button type="button" disabled={savingId === s.id} onClick={() => onUnpaid(s)} className="text-xs font-bold px-3 py-2 rounded-full border text-amber-600 border-amber-200 hover:bg-amber-50 disabled:opacity-50">
                          Unpaid
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
