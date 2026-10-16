'use client';
import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { activateUserPlan } from '@/lib/db';
import { CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <div className="bg-[#FDF8F3] flex justify-center items-center min-h-screen">
        <div className="w-[50px] h-[50px] [border:3px_solid_var(--border-subtle)] [border-top-color:#F59A23] rounded-full"></div>
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
  
  const [plan, setPlan] = useState('group');
  const [amount, setAmount] = useState(64);
  const [days, setDays] = useState(2);
  const [students, setStudents] = useState(1);
  const [isConfigurable, setIsConfigurable] = useState(true);
  const [paymentType, setPaymentType] = useState('recurring'); // 'recurring' or 'onetime'
  
  const [country, setCountry] = useState('NG');
  const [exchangeRate, setExchangeRate] = useState(1600);
  const [gateway, setGateway] = useState('paystack');

  useEffect(() => {
    const urlPlan = searchParams.get('plan') || 'group';
    const urlDays = parseInt(searchParams.get('days') || '2');
    const urlStudents = parseInt(searchParams.get('students') || '1');
    const dynamicAmount = parseInt(searchParams.get('amount') || '0');
    
    setPlan(urlPlan);
    setDays(urlDays);
    setStudents(urlStudents);
    
    if (dynamicAmount) {
      setAmount(dynamicAmount);
      setIsConfigurable(false);
    } else {
      setIsConfigurable(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!isConfigurable) return;

    // Dynamic Pricing Calculation
    let familyMultiplier = 0;
    for (let i = 1; i <= students; i++) {
      if (i === 1) familyMultiplier += 1.0;
      else if (i === 2) familyMultiplier += 0.95; 
      else familyMultiplier += 0.90; 
    }
    
    const hoursPerMonth = days * 4; 
    
    const prices: any = {
      group: Math.round(8 * hoursPerMonth * familyMultiplier),
      onetoone: Math.round(10 * hoursPerMonth * familyMultiplier),
      ijazah: Math.round(12 * hoursPerMonth * familyMultiplier),
      hifdh_intensive: Math.round(15 * hoursPerMonth * familyMultiplier) // approx
    };

    setAmount(prices[plan] || 64);
  }, [plan, days, students, isConfigurable]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        // Give a small delay for state to settle, then redirect
        const timer = setTimeout(() => {
          router.push(`/register?${searchParams.toString()}`);
        }, 1500);
        return () => clearTimeout(timer);
      } else {
        initEnvironment();
      }
    }
  }, [user, authLoading, router, searchParams]);

  const initEnvironment = async () => {
    try {
      const [ipData, rateData] = await Promise.all([
        fetch('https://ipapi.co/json/').then(r => r.json()).catch(() => ({ country: "NG" })),
        fetch('https://open.er-api.com/v6/latest/USD').then(r => r.json()).catch(() => ({ rates: { NGN: 1600 } }))
      ]);

      const userCountry = ipData.country || "NG";
      const rate = rateData?.rates?.NGN || 1600;
      setCountry(userCountry);
      setExchangeRate(rate);

      // Smart Routing
      const amountNGN = amount * rate;
      if (["NG", "GH", "KE", "ZA", "RW", "CI", "SN"].includes(userCountry) || (amountNGN < 5000)) {
        setGateway('paystack');
      } else {
        setGateway('flutterwave');
      }
      setLoading(false);
    } catch (e) {
      console.warn("Env init failed, using defaults:", e);
      setLoading(false);
    }
  };

  const planTitle = (plan === 'onetoone') ? "One-to-One" : (plan === 'ijazah') ? "Ijazah / Advanced Track" : (plan === 'hifdh_intensive') ? "Hifdh Intensive" : "Group Classes (Standard)";

  const startPaymentFlow = async () => {
    if (!user) return alert("Session lost.");
    setProcessing(true);
    setErrorMsg('');

    try {
      if (gateway === 'paystack') {
        await attemptPaystack();
      } else {
        await attemptFlutterwave();
      }
    } catch (err) {
      console.warn("Primary gateway failed, attempting failover...", err);
      if (gateway === 'paystack') {
        try {
          await attemptFlutterwave();
        } catch (e2) {
          setProcessing(false);
          setErrorMsg("All payment channels are currently congested. Please try again.");
        }
      } else {
        try {
          await attemptPaystack();
        } catch (e2) {
          setProcessing(false);
          setErrorMsg("All payment channels are currently congested. Please try again.");
        }
      }
    }
  };

  const attemptPaystack = () => {
    return new Promise((resolve, reject) => {
      const amountNGN = Math.floor(amount * exchangeRate);
      // @ts-ignore
      if (typeof PaystackPop === 'undefined') return reject("Paystack script not loaded");

      // @ts-ignore
      let handler = PaystackPop.setup({
        key: process.env.NEXT_PUBLIC_PAYSTACK_KEY || '', 
        email: user?.email || '',
        amount: amountNGN * 100,
        currency: "NGN",
        metadata: {
          custom_fields: [
            { display_name: "Base USD Price", variable_name: "base_usd_price", value: amount.toString() },
            { display_name: "Is Recurring", variable_name: "is_recurring", value: paymentType === 'recurring' ? 'true' : 'false' },
            { display_name: "Plan Days", variable_name: "plan_days", value: days.toString() }
          ]
        },
        ref: "ALMQ_PS_" + Date.now(),
        callback: (res: any) => resolve(handleSuccess(res)),
        onClose: () => { setProcessing(false); reject("User closed Paystack"); }
      });
      handler.openIframe();
    });
  };

  const attemptFlutterwave = () => {
    return new Promise((resolve, reject) => {
      const amountNGN = Math.floor(amount * exchangeRate);
      // @ts-ignore
      if (typeof FlutterwaveCheckout === 'undefined') return reject("Flutterwave script not loaded");

      // @ts-ignore
      FlutterwaveCheckout({
        public_key: process.env.NEXT_PUBLIC_FLUTTERWAVE_KEY || '', 
        tx_ref: "ALMQ_FW_" + Date.now(),
        amount: amountNGN,
        currency: "NGN",
        payment_options: "card, account, ussd",
        meta: {
          base_usd_price: amount.toString(),
          is_recurring: paymentType === 'recurring' ? 'true' : 'false',
          plan_days: days.toString()
        },
        customer: { email: user?.email || '', name: userData?.name || "Student" },
        customizations: { title: "Ilmvers Institution", description: planTitle + (paymentType === 'recurring' ? " (Dynamic Recurring Subscription)" : " (One-Time Payment)") },
        callback: (res: any) => resolve(handleSuccess(res)),
        onclose: () => { setProcessing(false); reject("User closed Flutterwave"); }
      });
    });
  };

  const handleSuccess = async (response: any) => {
    try {
      if (user) {
        await activateUserPlan(user.id, plan, amount, days);
      }
      setSuccess(true);
      setTimeout(() => { router.push("/portal/schedule-picker"); }, 3000);
    } catch (e) {
      alert("Activation error. Contact support.");
      setProcessing(false);
    }
  };

  return (
    <div className="bg-[#FDF8F3] min-h-screen flex flex-col">
      <Script src="https://js.paystack.co/v1/inline.js" strategy="lazyOnload" />
      <Script src="https://checkout.flutterwave.com/v3.js" strategy="lazyOnload" />

      <main className="py-20 w-full max-w-[1200px] mx-auto px-6 flex items-center justify-center flex-1 relative z-10">
        
        {/* Decorative Background Elements */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-200/40 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-200/40 rounded-full blur-[80px] pointer-events-none" />

        <div className="bg-white/80 backdrop-blur-xl rounded-[40px] p-10 md:p-12 shadow-2xl border border-white relative overflow-hidden transition-all duration-500 max-w-[700px] w-full group">
          
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-400 to-orange-500" />

          {success ? (
            <div className="text-center animate-fade-in py-10">
              <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 border-4 border-emerald-100 shadow-inner">
                <CheckCircle className="w-12 h-12" />
              </div>
              <h2 className="text-4xl font-black font-headers text-secondary mb-4">Enrollment Complete!</h2>
              <p className="text-gray-500 text-lg mb-8">Alhamdulillah! Your spot is secured.</p>
              
              <div className="p-6 bg-amber-50/50 rounded-2xl border border-amber-100/50 mb-8">
                 <p className="m-0 text-sm text-amber-800 font-medium leading-relaxed">
                   Admin verification is pending. You will receive your receipt and dashboard login links shortly.
                 </p>
              </div>

              <div className="flex items-center justify-center gap-3 text-amber-500 font-bold uppercase tracking-widest text-sm">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></div>
                Activating Dashboard...
              </div>
            </div>
          ) : (
            <div className="animate-fade-in relative z-10">
              <div className="text-center mb-10">
                <h2 className="text-4xl font-black font-headers text-secondary mb-3">Secure Checkout</h2>
                <p className="text-gray-500 text-lg">Configure your learning plan and complete your enrollment.</p>
              </div>

              {/* CONFIGURABLE SELECTORS */}
              {isConfigurable && (
                <>
                  <div className="mb-10">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                       <span className="w-6 h-[1px] bg-gray-200"></span> Select Your Plan
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { id: 'group', title: 'Group Classes' },
                        { id: 'onetoone', title: 'One-to-One' },
                        { id: 'ijazah', title: 'Ijazah Track' },
                        { id: 'hifdh_intensive', title: 'Hifdh Intensive' }
                      ].map(p => (
                        <div 
                          key={p.id}
                          onClick={() => setPlan(p.id)}
                          className={cn(
                            "p-4 rounded-2xl cursor-pointer transition-all duration-300 text-center border-2 flex flex-col items-center justify-center min-h-[100px]",
                            plan === p.id 
                              ? "border-amber-400 bg-amber-50 shadow-md scale-[1.02]" 
                              : "border-gray-100 bg-gray-50/50 hover:bg-gray-100 hover:border-gray-200"
                          )}
                        >
                          {plan === p.id && (
                            <div className="absolute top-2 right-2 w-5 h-5 bg-amber-500 text-white rounded-full flex items-center justify-center shadow-sm">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </div>
                          )}
                          <strong className={cn("block text-sm", plan === p.id ? "text-amber-700" : "text-gray-600")}>{p.title}</strong>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6 mb-10">
                    <div className="bg-gray-50/50 border border-gray-100 p-6 rounded-3xl">
                      <label className="block font-bold mb-4 text-secondary text-sm">Days Per Week</label>
                      <input type="range" min="2" max="5" value={days} onChange={(e) => setDays(parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-500" />
                      <div className="flex justify-between font-bold mt-4 items-center">
                        <span className="text-xs text-gray-400">2 Days</span>
                        <span className="inline-block px-4 py-1.5 rounded-full text-sm font-bold bg-amber-100 text-amber-700">{days} Days</span>
                        <span className="text-xs text-gray-400">5 Days</span>
                      </div>
                    </div>

                    <div className="bg-gray-50/50 border border-gray-100 p-6 rounded-3xl">
                      <label className="block font-bold mb-4 text-secondary text-sm">Students (Family)</label>
                      <input type="range" min="1" max="5" value={students} onChange={(e) => setStudents(parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-500" />
                      <div className="flex justify-between font-bold mt-4 items-center">
                        <span className="text-xs text-gray-400">1</span>
                        <span className="inline-block px-4 py-1.5 rounded-full text-sm font-bold bg-gray-200 text-gray-700">{students} {students === 1 ? 'Student' : 'Students'}</span>
                        <span className="text-xs text-gray-400">5+</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="bg-gradient-to-br from-amber-50 to-orange-50/30 rounded-[32px] p-8 border border-amber-100/50 mb-8 relative shadow-sm">
                <h4 className="text-xs uppercase tracking-widest text-amber-800 border-b border-amber-200/50 pb-4 mb-6 flex items-center justify-between font-bold">
                  <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-amber-500 mr-2"></span> Order Summary</span>
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
                      Note: The recurring NGN payment amount is not fixed. Future monthly deductions will fluctuate based on the live USD-to-NGN exchange rate at the time of renewal to ensure fair pricing.
                    </p>
                  </div>
                )}
                
                <div className="flex justify-between items-center mb-6">
                  <span className="text-gray-500 font-medium text-sm">Learning Style:</span>
                  <strong className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-white text-amber-600 border border-amber-100 shadow-sm">Online / Zoom</strong>
                </div>
                
                {/* Billing Frequency Toggle */}
                <div className="flex justify-between items-center mb-6 pt-6 border-t border-amber-200/50">
                   <span className="text-gray-500 font-medium text-sm">Billing Frequency:</span>
                   <div className="flex bg-amber-100/50 rounded-full p-1 border border-amber-200/50">
                     <button
                       onClick={() => setPaymentType('recurring')}
                       className={cn("px-4 py-1.5 rounded-full text-xs font-bold transition-all", paymentType === 'recurring' ? 'bg-white shadow-sm text-amber-600' : 'text-amber-800/60 hover:text-amber-800')}
                     >
                       Monthly
                     </button>
                     <button
                       onClick={() => setPaymentType('onetime')}
                       className={cn("px-4 py-1.5 rounded-full text-xs font-bold transition-all", paymentType === 'onetime' ? 'bg-white shadow-sm text-amber-600' : 'text-amber-800/60 hover:text-amber-800')}
                     >
                       One-Time
                     </button>
                   </div>
                </div>

                <div className="flex justify-between items-end pt-6 border-t border-amber-200/50">
                  <strong className="text-lg text-secondary">Total Amount:</strong>
                  <div className="text-right">
                     <strong className="text-5xl font-black text-amber-500 tracking-tight">${amount}<span className="text-2xl text-amber-500/50">.00</span></strong>
                     <span className="block text-xs uppercase tracking-widest text-amber-700/70 font-black mt-1">
                       {paymentType === 'recurring' ? 'Per Month' : 'One Time Payment'}
                     </span>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl flex items-start gap-4 bg-blue-50/50 border border-blue-100 text-blue-700 mb-4">
                <div className="shrink-0 p-2 bg-blue-100 rounded-full">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                </div>
                <p className="m-0 font-medium text-sm leading-relaxed pt-1">You will be redirected to our PCI-DSS compliant secure payment gateway to complete your transaction safely.</p>
              </div>

              <div className={cn("p-5 rounded-2xl flex items-start gap-4 border mb-10 transition-colors", paymentType === 'recurring' ? 'bg-amber-50/30 border-amber-200 text-amber-800' : 'bg-gray-50 border-gray-200 text-gray-600')}>
                 <div className={cn("shrink-0 p-2 rounded-full", paymentType === 'recurring' ? 'bg-amber-100 text-amber-600' : 'bg-gray-200 text-gray-500')}>
                   {paymentType === 'recurring' ? (
                     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M2.13 15.57a9 9 0 0 0 15.22 3.75l4.15-4.15M2.5 22v-6h6M21.87 8.43a9 9 0 0 0-15.22-3.75L2.5 8.83"></path></svg>
                   ) : (
                     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect><path d="M2 8h20"></path><path d="M6 16h.01"></path><path d="M10 16h.01"></path></svg>
                   )}
                 </div>
                 <p className="m-0 font-medium text-sm leading-relaxed pt-1">
                    {paymentType === 'recurring' ? (
                      <><strong>Automatic Recurring Subscription:</strong> This is a recurring monthly payment that will be automatically deducted according to the plan chosen to ensure uninterrupted access. You can cancel anytime.</>
                    ) : (
                      <><strong>One-Time Payment:</strong> This payment will only be charged once. It will not renew automatically next month. You will need to renew manually to retain access.</>
                    )}
                 </p>
              </div>

              {loading || authLoading ? (
                <div className="text-center py-6">
                  <div className="w-10 h-10 border-4 border-gray-100 border-t-amber-500 rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-xs uppercase tracking-widest text-gray-400 font-bold">Verifying security tokens...</p>
                </div>
              ) : (
                <div>
                  <button 
                    onClick={startPaymentFlow}
                    disabled={processing}
                    className="w-full py-5 rounded-full font-black text-white bg-gradient-to-r from-amber-500 to-orange-500 shadow-[0_10px_30px_rgba(245,154,35,0.3)] hover:shadow-[0_15px_40px_rgba(245,154,35,0.5)] hover:-translate-y-1 transition-all duration-300 disabled:opacity-70 disabled:hover:translate-y-0 flex items-center justify-center gap-3 text-lg"
                  >
                    {processing ? (
                      <>
                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Securing Channel...
                      </>
                    ) : (
                      <>
                         <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                         Proceed to Secure Checkout
                      </>
                    )}
                  </button>
                  {errorMsg && <p className="text-red-500 text-sm text-center mt-4 font-bold bg-red-50 p-4 rounded-xl border border-red-100">{errorMsg}</p>}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

