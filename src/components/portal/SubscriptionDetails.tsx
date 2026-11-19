'use client';

import Link from 'next/link';
import type { UserData } from '@/types/user';
import {
  billingStatus,
  formatBillingDate,
  hasActiveCard,
  planLabel,
  subscriptionExpiryIso,
  subscriptionStartIso,
} from '@/lib/billing';

const TONE: Record<string, string> = {
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  scholarship: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  expired: 'bg-red-50 text-red-700 border-red-100',
  unpaid: 'bg-amber-50 text-amber-700 border-amber-100',
};

export function SubscriptionDetails({
  user,
  compact = false,
}: {
  user?: UserData | null;
  compact?: boolean;
}) {
  if (!user) return null;
  const status = billingStatus(user);
  const start = formatBillingDate(subscriptionStartIso(user));
  const end = formatBillingDate(subscriptionExpiryIso(user));
  const endLabel = hasActiveCard(user) ? 'Next billing' : 'Expires';

  if (compact) {
    return (
      <div className="mt-3 rounded-2xl border border-gray-100 bg-gray-50 px-3 py-2.5">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 m-0">Subscription</p>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${TONE[status.tone]}`}>
            {status.label}
          </span>
        </div>
        <p className="text-xs text-gray-600 m-0 leading-relaxed">
          Started {start} · {endLabel} {end}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[32px] p-6 md:p-8 shadow-sm border border-gray-100">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest m-0 mb-1">Subscription</p>
          <h3 className="text-2xl font-headers font-bold text-secondary m-0">{planLabel(user.tuitionPlan)}</h3>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${TONE[status.tone]}`}>
          {status.label}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 m-0 mb-1">Started</p>
          <p className="text-lg font-bold text-secondary m-0">{start}</p>
        </div>
        <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 m-0 mb-1">{endLabel}</p>
          <p className="text-lg font-bold text-secondary m-0">{end}</p>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500 m-0">
          {start === '—' && end === '—'
            ? 'No billing cycle is on file yet. Dates appear after payment or a scholarship award.'
            : user.scholarship
              ? 'Scholarship access lasts 30 days and must be re-awarded after it expires.'
              : hasActiveCard(user)
                ? 'Your card renews automatically each month.'
                : 'Monthly plans last 30 days from the start date.'}
        </p>
        <Link href="/portal/settings?tab=billing" className="text-sm font-bold text-primary no-underline hover:underline">
          Billing details →
        </Link>
      </div>
    </div>
  );
}
