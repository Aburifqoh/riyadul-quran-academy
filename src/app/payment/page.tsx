'use client';
import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { activateUserPlan } from '@/lib/db';
import { recordedTuitionAmount } from '@/lib/billing';
import { supabase } from '@/lib/supabase';
import { CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <div className="bg-[#FAF9F6] flex justify-center items-center min-h-screen">
        <div className="w-[50px] h-[50px] [border:3px_solid_var(--border-subtle)] [border-top-color:#004D4A] rounded-full"></div>
      </div>
    }>
      <PaymentContent />
    </Suspense>
  );
}

function PaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, userData, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [resolvingAmount, setResolvingAmount] = useState(true);

  const [plan, setPlan] = useState('group');
  const [amount, setAmount] = useState(0);
  const [days, setDays] = useState(2);
  const [isConfigurable, setIsConfigurable] = useState(true);
  const [paymentType, setPaymentType] = useState('recurring'); // 'recurring' or 'onetime'
  const [payForUserId, setPayForUserId] = useState<string | null>(null);

  const [country, setCountry] = useState('NG');
  const [exchangeRate, setExchangeRate] = useState(1600);
  const [gateway, setGateway] = useState('paystack');

  // Resolve plan/amount from URL, then fall back to the signed-in (or child) profile.
  useEffect(() => {
    let cancelled = false;

    async function resolveCheckout() {
      const urlPlan = searchParams.get('plan') || '';
      const urlDays = parseInt(searchParams.get('days') || '0', 10);
      const dynamicAmount = parseInt(searchParams.get('amount') || '0', 10);
      const studentId = searchParams.get('studentId');

      if (urlPlan) setPlan(urlPlan);
      if (urlDays > 0) setDays(urlDays);

      if (dynamicAmount > 0) {
        if (!cancelled) {
          setAmount(dynamicAmount);
          setIsConfigurable(false);
          setPayForUserId(studentId);
          setResolvingAmount(false);
        }
        return;
      }

      // Parent paying for a linked child — load that child's stored fee.
      if (studentId && user?.id) {
        try {
          const { data: child } = await supabase
            .from('users')
            .select('id, parentId, base_usd_price, tuitionPlan, planDays')
            .eq('id', studentId)
            .maybeSingle();

          if (cancelled) return;

          if (child && (child.parentId === user.id || child.id === user.id)) {
            const recorded = recordedTuitionAmount(child);
            if (child.tuitionPlan) setPlan(String(child.tuitionPlan));
            if (child.planDays) setDays(Number(child.planDays) || 2);
            if (recorded > 0) {
              setAmount(recorded);
              setIsConfigurable(false);
              setPayForUserId(child.id);
              setResolvingAmount(false);
              return;
            }
          }
        } catch (err) {
          console.warn('Could not load child tuition for payment:', err);
        }
      }

      // Logged-in student / self — use fee already stored on the profile.
      if (userData) {
        const recorded = recordedTuitionAmount(userData);
        if (!urlPlan && userData.tuitionPlan) setPlan(String(userData.tuitionPlan));
        if (!(urlDays > 0) && userData.planDays) setDays(Number(userData.planDays) || 2);
        if (recorded > 0) {
          if (!cancelled) {
            setAmount(recorded);
            setIsConfigurable(false);
            setPayForUserId(user?.id ?? null);
            setResolvingAmount(false);
          }
          return;
        }
      }

      // Still no fee — keep the gate (do not invent a price).
      if (!cancelled) {
        setIsConfigurable(true);
        setResolvingAmount(Boolean(authLoading || (user && !userData && !studentId)));
      }
    }

    void resolveCheckout();
    return () => {
      cancelled = true;
    };
  }, [searchParams, user, userData, authLoading]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        const timer = setTimeout(() => {
          const returnTo = `/payment${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
          router.push(`/login?next=${encodeURIComponent(returnTo)}`);
        }, 1500);
        return () => clearTimeout(timer);
      }
      void initEnvironment();
    }
  }, [user, authLoading, router, searchParams]);

  const initEnvironment = async () => {
    try {
      const [ipData, rateData] = await Promise.all([
        fetch('https://ipapi.co/json/').then(r => r.json()).catch(() => ({ country: 'NG' })),
        fetch('https://open.er-api.com/v6/latest/USD').then(r => r.json()).catch(() => ({ rates: { NGN: 1600 } })),
      ]);

      const userCountry = ipData.country || 'NG';
      const rate = rateData?.rates?.NGN || 1600;
      setCountry(userCountry);
      setExchangeRate(rate);

      const amountNGN = amount * rate;
      if (['NG', 'GH', 'KE', 'ZA', 'RW', 'CI', 'SN'].includes(userCountry) || amountNGN < 5000) {
        setGateway('paystack');
      } else {
        setGateway('flutterwave');
      }
      setLoading(false);
    } catch (e) {
      console.warn('Env init failed, using defaults:', e);
      setLoading(false);
    }
  };

  const planTitle =
    plan === 'onetoone'
      ? 'One-to-One'
      : plan === 'ijazah'
        ? 'Ijazah / Advanced Track'
        : plan === 'hifdh_intensive'
          ? 'Hifdh Intensive'
          : 'Group Classes (Standard)';

  const startPaymentFlow = async () => {
    if (!user) return alert('Session lost.');
    if (isConfigurable || amount <= 0) {
      setErrorMsg('Tuition is confirmed with you before any charge.');
      return;
    }
    setProcessing(true);
    setErrorMsg('');

    try {
      if (gateway === 'paystack') {
        await attemptPaystack();
      } else {
        await attemptFlutterwave();
      }
    } catch (err) {
      console.warn('Primary gateway failed, attempting failover...', err);
      if (gateway === 'paystack') {
        try {
          await attemptFlutterwave();
        } catch {
          setProcessing(false);
          setErrorMsg('All payment channels are currently congested. Please try again.');
        }
      } else {
        try {
          await attemptPaystack();
        } catch {
          setProcessing(false);
          setErrorMsg('All payment channels are currently congested. Please try again.');
        }
      }
    }
  };

  const attemptPaystack = () => {
    return new Promise((resolve, reject) => {
      const amountNGN = Math.floor(amount * exchangeRate);
      // @ts-expect-error Paystack global
      if (typeof PaystackPop === 'undefined') return reject('Paystack script not loaded');

      // @ts-expect-error Paystack global
      const handler = PaystackPop.setup({
        key: process.env.NEXT_PUBLIC_PAYSTACK_KEY || '',
        email: user?.email || '',
        amount: amountNGN * 100,
        currency: 'NGN',
        metadata: {
          custom_fields: [
            { display_name: 'Base USD Price', variable_name: 'base_usd_price', value: amount.toString() },
            { display_name: 'Is Recurring', variable_name: 'is_recurring', value: paymentType === 'recurring' ? 'true' : 'false' },
            { display_name: 'Plan Days', variable_name: 'plan_days', value: days.toString() },
            ...(payForUserId
              ? [{ display_name: 'Student ID', variable_name: 'student_id', value: payForUserId }]
              : []),
          ],
        },
        ref: 'ALMQ_PS_' + Date.now(),
        callback: (res: unknown) => resolve(handleSuccess(res)),
        onClose: () => {
          setProcessing(false);
          reject('User closed Paystack');
        },
      });
      handler.openIframe();
    });
  };

  const attemptFlutterwave = () => {
    return new Promise((resolve, reject) => {
      const amountNGN = Math.floor(amount * exchangeRate);
      // @ts-expect-error Flutterwave global
      if (typeof FlutterwaveCheckout === 'undefined') return reject('Flutterwave script not loaded');

      // @ts-expect-error Flutterwave global
      FlutterwaveCheckout({
        public_key: process.env.NEXT_PUBLIC_FLUTTERWAVE_KEY || '',
        tx_ref: 'ALMQ_FW_' + Date.now(),
        amount: amountNGN,
        currency: 'NGN',
        payment_options: 'card, account, ussd',
        meta: {
          base_usd_price: amount.toString(),
          is_recurring: paymentType === 'recurring' ? 'true' : 'false',
          plan_days: days.toString(),
          ...(payForUserId ? { student_id: payForUserId } : {}),
        },
        customer: { email: user?.email || '', name: userData?.name || 'Student' },
        customizations: {
          title: 'Ilmvers Institution',
          description:
            planTitle + (paymentType === 'recurring' ? ' (Dynamic Recurring Subscription)' : ' (One-Time Payment)'),
        },
        callback: (res: unknown) => resolve(handleSuccess(res)),
        onclose: () => {
          setProcessing(false);
          reject('User closed Flutterwave');
        },
      });
    });
  };

  const handleSuccess = async (_response: unknown) => {
    try {
      const activateId = payForUserId || user?.id;
      if (activateId) {
        await activateUserPlan(activateId, plan, amount, days);
      }
      setSuccess(true);
      setTimeout(() => {
        router.push('/portal/schedule-picker');
      }, 3000);
    } catch {
      alert('Activation error. Contact support.');
      setProcessing(false);
    }
  };

  const showGate = isConfigurable && !resolvingAmount;

  return (
    <div className="bg-[#FAF9F6] min-h-screen flex flex-col">
      <Script src="https://js.paystack.co/v1/inline.js" strategy="lazyOnload" />
      <Script src="https://checkout.flutterwave.com/v3.js" strategy="lazyOnload" />

      <main className="py-20 w-full max-w-[1200px] mx-auto px-6 flex items-center justify-center flex-1 relative z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#D4AF37]/20 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#004D4A]/10 rounded-full blur-[80px] pointer-events-none" />

        <div className="bg-white/80 backdrop-blur-xl rounded-[40px] p-10 md:p-12 shadow-2xl border border-white relative overflow-hidden transition-all duration-500 max-w-[700px] w-full group">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#004D4A] to-[#D4AF37]" />

          {success ? (
            <div className="text-center animate-fade-in py-10">
              <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 border-4 border-emerald-100 shadow-inner">
                <CheckCircle className="w-12 h-12" />
              </div>
              <h2 className="text-4xl font-black font-headers text-secondary mb-4">Enrollment Complete!</h2>
              <p className="text-gray-500 text-lg mb-8">Alhamdulillah! Your spot is secured.</p>

              <div className="p-6 bg-[#F0F4F2]/80 rounded-2xl border border-[#E2E9E7] mb-8">
                <p className="m-0 text-sm text-[#004D4A] font-medium leading-relaxed">
                  Admin verification is pending. You will receive your receipt and dashboard login links shortly.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 text-[#004D4A] font-bold uppercase tracking-widest text-sm">
                <div className="w-2.5 h-2.5 rounded-full bg-[#F0F4F2]0 animate-pulse"></div>
                Activating Dashboard...
              </div>
            </div>
          ) : (
            <div className="animate-fade-in relative z-10">
              <div className="text-center mb-10">
                <h2 className="text-4xl font-black font-headers text-secondary mb-3">
                  {showGate ? 'Enrolment' : 'Secure Checkout'}
                </h2>
                <p className="text-gray-500 text-lg">
                  {showGate
                    ? 'Fees are agreed with you after the free assessment.'
                    : 'Complete the fee Ilmvers has confirmed with you.'}
                </p>
              </div>

              {(resolvingAmount || (loading && !showGate)) && (
                <div className="text-center py-8">
                  <div className="w-10 h-10 border-4 border-gray-100 border-t-[#004D4A] rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-xs uppercase tracking-widest text-gray-400 font-bold">
                    Preparing checkout...
                  </p>
                </div>
              )}

              {showGate && (
                <div className="text-center py-8">
                  <h3 className="text-2xl font-headers font-bold text-[#004D4A] mb-3">
                    {user ? 'Your fee is not on file yet' : 'Tuition is confirmed at enrolment'}
                  </h3>
                  <p className="text-[#5A6E6C] mb-8 max-w-lg mx-auto">
                    {user
                      ? 'Ilmvers must confirm your tuition before checkout opens. Contact support — you do not need to book another assessment session.'
                      : 'This checkout opens only after Ilmvers agrees a fee with you. The site does not publish a price.'}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    {user ? (
                      <>
                        <Link href="/contact" className="rounded-full bg-[#004D4A] text-white px-8 py-3 font-semibold">
                          Contact support
                        </Link>
                        <Link
                          href="/portal"
                          className="rounded-full border-2 border-[#004D4A] text-[#004D4A] px-8 py-3 font-semibold"
                        >
                          Back to portal
                        </Link>
                      </>
                    ) : (
                      <>
                        <Link href="/admissions" className="rounded-full bg-[#004D4A] text-white px-8 py-3 font-semibold">
                          Continue enrolment
                        </Link>
                        <Link
                          href="/contact"
                          className="rounded-full border-2 border-[#004D4A] text-[#004D4A] px-8 py-3 font-semibold"
                        >
                          Ask a question
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              )}

              {!isConfigurable && amount > 0 && (
                <>
                  <div className="bg-gradient-to-br from-[#F0F4F2] to-white rounded-[32px] p-8 border border-[#E2E9E7] mb-8 relative shadow-sm">
                    <h4 className="text-xs uppercase tracking-widest text-[#004D4A] border-b border-[#E2E9E7] pb-4 mb-6 flex items-center justify-between font-bold">
                      <span className="flex items-center">
                        <span className="w-2 h-2 rounded-full bg-[#F0F4F2]0 mr-2"></span> Order Summary
                      </span>
                    </h4>

                    <div className="flex justify-between items-center mb-4">
                      <span className="text-gray-500 font-medium text-sm">Selected Plan:</span>
                      <strong className="text-secondary">{planTitle}</strong>
                    </div>

                    <div className="flex justify-between items-center text-sm mb-4">
                      <span className="text-gray-500">Total NGN (approx)</span>
                      <span className="font-semibold text-secondary">
                        ₦{(amount * exchangeRate).toLocaleString()}
                      </span>
                    </div>

                    {paymentType === 'recurring' && (
                      <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 text-xs text-blue-600 mb-4 flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <p className="m-0 leading-relaxed">
                          Note: The recurring NGN payment amount is not fixed. Future monthly deductions will fluctuate based
                          on the live USD-to-NGN exchange rate at the time of renewal to ensure fair pricing.
                        </p>
                      </div>
                    )}

                    <div className="flex justify-between items-center mb-6">
                      <span className="text-gray-500 font-medium text-sm">Learning Style:</span>
                      <strong className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-white text-[#004D4A] border border-[#E2E9E7] shadow-sm">
                        Live online class
                      </strong>
                    </div>

                    <div className="flex justify-between items-center mb-6 pt-6 border-t border-[#E2E9E7]">
                      <span className="text-gray-500 font-medium text-sm">Billing Frequency:</span>
                      <div className="flex bg-[#E6F3F2] rounded-full p-1 border border-[#E2E9E7]">
                        <button
                          type="button"
                          onClick={() => setPaymentType('recurring')}
                          className={cn(
                            'px-4 py-1.5 rounded-full text-xs font-bold transition-all',
                            paymentType === 'recurring'
                              ? 'bg-white shadow-sm text-[#004D4A]'
                              : 'text-[#004D4A]/60 hover:text-[#0F3D38]'
                          )}
                        >
                          Monthly
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentType('onetime')}
                          className={cn(
                            'px-4 py-1.5 rounded-full text-xs font-bold transition-all',
                            paymentType === 'onetime'
                              ? 'bg-white shadow-sm text-[#004D4A]'
                              : 'text-[#004D4A]/60 hover:text-[#0F3D38]'
                          )}
                        >
                          One-Time
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-end pt-6 border-t border-[#E2E9E7]">
                      <strong className="text-lg text-secondary">Total Amount:</strong>
                      <div className="text-right">
                        <strong className="text-5xl font-black text-[#004D4A] tracking-tight">
                          ${amount}
                          <span className="text-2xl text-[#004D4A]/50">.00</span>
                        </strong>
                        <span className="block text-xs uppercase tracking-widest text-[#0F3D38]/70 font-black mt-1">
                          {paymentType === 'recurring' ? 'Per Month' : 'One Time Payment'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl flex items-start gap-4 bg-blue-50/50 border border-blue-100 text-blue-700 mb-4">
                    <div className="shrink-0 p-2 bg-blue-100 rounded-full">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                      </svg>
                    </div>
                    <p className="m-0 font-medium text-sm leading-relaxed pt-1">
                      You will be redirected to our PCI-DSS compliant secure payment gateway to complete your transaction
                      safely.
                    </p>
                  </div>

                  <div
                    className={cn(
                      'p-5 rounded-2xl flex items-start gap-4 border mb-10 transition-colors',
                      paymentType === 'recurring'
                        ? 'bg-[#F0F4F2] border-[#E2E9E7] text-[#004D4A]'
                        : 'bg-gray-50 border-gray-200 text-gray-600'
                    )}
                  >
                    <div
                      className={cn(
                        'shrink-0 p-2 rounded-full',
                        paymentType === 'recurring' ? 'bg-[#E6F3F2] text-[#004D4A]' : 'bg-gray-200 text-gray-500'
                      )}
                    >
                      {paymentType === 'recurring' ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21.5 2v6h-6M2.13 15.57a9 9 0 0 0 15.22 3.75l4.15-4.15M2.5 22v-6h6M21.87 8.43a9 9 0 0 0-15.22-3.75L2.5 8.83"></path>
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect>
                          <path d="M2 8h20"></path>
                          <path d="M6 16h.01"></path>
                          <path d="M10 16h.01"></path>
                        </svg>
                      )}
                    </div>
                    <p className="m-0 font-medium text-sm leading-relaxed pt-1">
                      {paymentType === 'recurring' ? (
                        <>
                          <strong>Automatic Recurring Subscription:</strong> This is a recurring monthly payment that will
                          be automatically deducted according to the plan chosen to ensure uninterrupted access. You can
                          cancel anytime.
                        </>
                      ) : (
                        <>
                          <strong>One-Time Payment:</strong> This payment will only be charged once. It will not renew
                          automatically next month. You will need to renew manually to retain access.
                        </>
                      )}
                    </p>
                  </div>

                  {loading || authLoading ? (
                    <div className="text-center py-6">
                      <div className="w-10 h-10 border-4 border-gray-100 border-t-[#004D4A] rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-xs uppercase tracking-widest text-gray-400 font-bold">
                        Verifying security tokens...
                      </p>
                    </div>
                  ) : (
                    <div>
                      <button
                        type="button"
                        onClick={startPaymentFlow}
                        disabled={processing}
                        className="w-full py-5 rounded-full font-black text-white bg-gradient-to-r from-[#004D4A] to-[#0F3D38] shadow-[0_10px_30px_rgba(0,77,74,0.3)] hover:shadow-[0_15px_40px_rgba(0,77,74,0.5)] hover:-translate-y-1 transition-all duration-300 disabled:opacity-70 disabled:hover:translate-y-0 flex items-center justify-center gap-3 text-lg"
                      >
                        {processing ? (
                          <>
                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Securing Channel...
                          </>
                        ) : (
                          <>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                            Proceed to Secure Checkout
                          </>
                        )}
                      </button>
                      {errorMsg && (
                        <p className="text-red-500 text-sm text-center mt-4 font-bold bg-red-50 p-4 rounded-xl border border-red-100">
                          {errorMsg}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
