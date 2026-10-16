'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  billingStatus,
  formatBillingDate,
  isSubscriptionActive,
  monthlyTuitionAmount,
  parseHourlyRates,
  subscriptionExpiryIso,
} from '@/lib/billing';

type Child = {
  id: string;
  name: string;
  tuitionPlan?: string;
  planDays?: number;
  paymentVerified?: boolean;
  status?: string;
  lastPaymentDate?: string;
  next_billing_date?: string;
  payment_gateway?: string;
  base_usd_price?: number;
  scholarship?: boolean;
};

export default function ParentBillingPage() {
  const { user } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [hourlyRates, setHourlyRates] = useState<ReturnType<typeof parseHourlyRates> | null>(null);

  useEffect(() => {
    async function loadRates() {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'pricing_rates')
        .maybeSingle();
      setHourlyRates(parseHourlyRates(data?.value));
    }
    loadRates();
  }, []);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      try {
        const { data } = await supabase
          .from('users')
          .select('id,name,tuitionPlan,planDays,paymentVerified,status,lastPaymentDate,next_billing_date,payment_gateway,base_usd_price,scholarship')
          .eq('parentId', user.id);
        setChildren(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  const totalMonthly = children
    .filter(c => isSubscriptionActive(c) && !c.scholarship)
    .reduce((sum, c) => sum + monthlyTuitionAmount(c, hourlyRates), 0);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map(i => <div key={i} className="animate-pulse bg-slate-100 rounded-2xl h-32" />)}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Billing & Payments</h2>
        <p className="text-slate-500 mt-1">Manage subscriptions and payment status for all your children.</p>
      </div>

      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-xl shadow-emerald-500/20">
        <p className="text-sm font-semibold opacity-80 uppercase tracking-wider">Total Monthly Tuition</p>
        <p className="text-5xl font-black mt-2">${totalMonthly}<span className="text-2xl font-normal opacity-70">/mo</span></p>
        <p className="text-sm opacity-70 mt-3">{children.filter(c => isSubscriptionActive(c)).length} of {children.length} enrolment{children.length !== 1 ? 's' : ''} active</p>
      </div>

      {children.length === 0 ? (
        <div className="bg-slate-50 rounded-2xl p-12 border-2 border-dashed border-slate-200 text-center">
          <p className="text-slate-500 font-medium">No children linked to this account.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {children.map(child => {
            const isActive = isSubscriptionActive(child);
            const status = billingStatus(child);
            const price = monthlyTuitionAmount(child, hourlyRates);
            const isExpanded = expandedId === child.id;

            return (
              <div key={child.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <button
                  className="w-full text-left p-6 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : child.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">
                      {child.name?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{child.name}</p>
                      <p className="text-sm text-slate-500 capitalize">{child.tuitionPlan?.replace(/_/g, ' ') || 'No plan'} · <span className="font-semibold">${price}/mo</span></p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full ${
                      status.tone === 'paid' ? 'bg-emerald-100 text-emerald-800'
                      : status.tone === 'scholarship' ? 'bg-indigo-100 text-indigo-800'
                      : status.tone === 'expired' ? 'bg-red-100 text-red-800'
                      : 'bg-amber-100 text-amber-800'
                    }`}>{status.label}</span>
                    <svg className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-6 pb-6 border-t border-slate-100 space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-400 font-medium uppercase text-[11px] tracking-wider">Payment Method</p>
                        <p className="text-slate-900 font-semibold capitalize mt-0.5">{child.payment_gateway || 'Not set'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-medium uppercase text-[11px] tracking-wider">Started</p>
                        <p className="text-slate-900 font-semibold mt-0.5">{formatBillingDate(child.lastPaymentDate)}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-medium uppercase text-[11px] tracking-wider">Expires</p>
                        <p className="text-slate-900 font-semibold mt-0.5">{formatBillingDate(subscriptionExpiryIso(child))}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-medium uppercase text-[11px] tracking-wider">Monthly Amount</p>
                        <p className="text-slate-900 font-bold text-lg mt-0.5">${price}</p>
                      </div>
                    </div>

                    {!isActive && (
                      <Link
                        href={`/payment?studentId=${child.id}&plan=${child.tuitionPlan}`}
                        className="block w-full text-center bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-all hover:scale-[1.01] shadow-md shadow-emerald-500/20"
                      >
                        Pay Now — ${price}
                      </Link>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-800">
        <p className="font-bold mb-1">Payment questions?</p>
        <p>For billing issues, refunds, or plan changes, <Link href="/parent/support" className="underline font-semibold">contact support</Link>. Payments are handled through Paystack and Flutterwave.</p>
      </div>
    </div>
  );
}
