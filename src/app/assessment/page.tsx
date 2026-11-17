'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { bookAssessment } from '@/lib/assessmentDb';
import { registerAdult } from '@/lib/auth';
import { TurnstileWidget } from '@/components/TurnstileWidget';
import { getErrorMessage } from '@/lib/errors';
import { passwordPolicyError } from '@/lib/passwordPolicy';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { CountryPhoneInput } from '@/components/ui/CountryPhoneInput';
import { 
  CheckCircle2, 
  Lock, 
  Calendar, 
  Star, 
  Mail,
  ArrowRight,
  Loader2
} from 'lucide-react';

export default function AssessmentPage() {
  const { userData, loading } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [isIframeLoading, setIsIframeLoading] = useState(true);

  const generateEventId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const [formData, setFormData] = useState({
    name: '',
    age: '',
    email: '',
    phone: '',
    level: '',
    goal: '',
    nationality: '',
    country: '',
    city: '',
    referral: ''
  });

  useEffect(() => {
    if (!loading && userData) {
      setFormData(prev => ({
        ...prev,
        name: userData.name || '',
        email: userData.email || '',
        phone: userData.phone || '',
        nationality: userData.nationality || '',
        country: userData.country || '',
        city: userData.city || ''
      }));
    }
  }, [userData, loading]);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.event && e.data.event === 'calendly.event_scheduled') {
        const scheduleEventId = generateEventId('schedule');
        // @ts-ignore
        if (window.fbq) {
          // @ts-ignore
          window.fbq('track', 'Schedule', { content_name: 'Assessment Booked' }, { eventID: scheduleEventId });
        }
        fetch('/api/fb-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventName: 'Schedule',
            eventId: scheduleEventId,
            email: formData.email,
            phone: formData.phone,
            name: formData.name,
            url: window.location.href
          })
        }).catch(console.error);

        // Automatically advance to Step 3
        setStep(3);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [formData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handlePhoneChange = (value: string) => {
    setFormData(prev => ({ ...prev, phone: value }));
  };

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (userData) {
        await supabase.from('users').update({
          age: formData.age,
          level: formData.level,
          goal: formData.goal,
          nationality: formData.nationality,
          country: formData.country,
          city: formData.city
        }).eq('id', userData.id);
      }

      await bookAssessment(formData);

      const leadEventId = generateEventId('lead');
      // @ts-ignore
      if (window.fbq) {
        // @ts-ignore
        window.fbq('track', 'Lead', { content_name: 'Assessment Started' }, { eventID: leadEventId });
      }

      // Fire and forget FB event tracking (do not await to prevent adblockers from hanging the form)
      fetch('/api/fb-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventName: 'Lead',
          eventId: leadEventId,
          email: formData.email,
          phone: formData.phone,
          name: formData.name,
          url: window.location.href
        })
      }).catch(console.error);

      setStep(2);
    } catch (error) {
      console.error("Error submitting lead:", error);
      setStep(2);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turnstileToken) {
      alert('Wait for the security check below to finish (or tap Retry / Continue without box), then try again.');
      return;
    }
    if (password !== confirmPassword) {
      alert("Passwords do not match. Please re-type carefully.");
      return;
    }
    const policyError = passwordPolicyError(password);
    if (policyError) {
      alert(policyError);
      return;
    }
    setIsRegistering(true);
    try {
      const data = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: password,
        age: formData.age,
        level: formData.level,
        goal: formData.goal,
        nationality: formData.nationality,
        country: formData.country,
        city: formData.city,
        referral: formData.referral,
        detectedTz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        tuitionPlan: ''
      };
      
      await registerAdult(data, turnstileToken);
      
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: password
      });
      
      if (loginError) throw loginError;
      
      const registerEventId = generateEventId('register');
      // @ts-ignore
      if (window.fbq) {
        // @ts-ignore
        window.fbq('track', 'CompleteRegistration', {
          content_name: 'Portal Activated'
        }, { eventID: registerEventId });
      }

      await fetch('/api/fb-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventName: 'CompleteRegistration',
          eventId: registerEventId,
          email: formData.email,
          phone: formData.phone,
          name: formData.name,
          url: window.location.href
        })
      }).catch(console.error);
      
      router.push('/portal');
    } catch (error: unknown) {
      alert(getErrorMessage(error) || 'We could not create your account. Please try again.');
      setTurnstileToken('');
      setTurnstileKey((key) => key + 1);
    } finally {
      setIsRegistering(false);
    }
  };

  const slideVariants = {
    initial: { opacity: 0, y: 12 },
    enter: { opacity: 1, y: 0, transition: { duration: 0.4 } },
    exit: { opacity: 0, y: -12, transition: { duration: 0.4 } }
  };

  const InputClass = "w-full px-5 py-3.5 border-2 border-border-subtle rounded-xl text-text-body focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all bg-zinc-50 hover:bg-white text-base shadow-sm";
  const LabelClass = "block font-bold mb-2 text-secondary text-sm uppercase tracking-wider ml-1";
  const ButtonClass = "w-full bg-primary text-white py-4 rounded-2xl font-bold text-lg hover:bg-primary/90 hover:scale-[1.02] transition-all disabled:opacity-50 mt-8 flex items-center justify-center gap-2";

  return (
    <div className="bg-bg-neutral min-h-screen flex flex-col relative overflow-hidden">
      {/* Background accents matching Register page */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/5 rounded-full blur-3xl pointer-events-none" />

      <main className="flex-1 flex flex-col items-center justify-start py-16 px-6 relative z-10 w-full">
        
        {/* STEPPER PROGRESS */}
        <div className="w-full max-w-[600px] mb-12">
          <div className="flex items-center justify-between relative px-4">
            <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 bg-border-subtle z-0 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-primary rounded-full" 
                initial={{ width: '16%' }}
                animate={{ width: step === 1 ? '16%' : step === 2 ? '50%' : '100%' }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              />
            </div>

            {[1, 2, 3].map((num) => (
              <div key={num} className="flex flex-col items-center z-10 relative">
                <motion.div 
                  initial={false}
                  animate={{
                    backgroundColor: step >= num ? 'var(--color-primary)' : 'var(--color-bg-neutral)',
                    color: step >= num ? '#FFFFFF' : 'var(--color-text-muted)',
                    borderColor: step >= num ? 'var(--color-primary)' : 'var(--color-border-subtle)',
                    scale: step === num ? 1.1 : 1
                  }}
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm border-2 transition-colors"
                >
                  {step > num ? <CheckCircle2 className="w-5 h-5" /> : num}
                </motion.div>
                <span className={`text-[11px] md:text-xs font-bold mt-2 uppercase tracking-wider ${
                  step >= num ? 'text-primary' : 'text-text-muted'
                }`}>
                  {num === 1 ? 'Details' : num === 2 ? 'Schedule' : 'Activate'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              variants={slideVariants}
              initial="initial"
              animate="enter"
              exit="exit"
              className="bg-white rounded-3xl p-5 sm:p-8 md:p-12 shadow-xl border border-white/80 max-w-[600px] w-full relative overflow-hidden"
            >
              <div className="text-center mb-10 mt-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
                  <Star className="w-8 h-8 fill-current" />
                </div>
                <h2 className="text-3xl font-headers font-bold text-secondary mb-2">Diagnostic Intake</h2>
                <p className="text-text-body">Fill in the details below to prepare your live 1-on-1 placement call with an instructor.</p>
              </div>

              <form onSubmit={handleStep1Submit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="name" className={LabelClass}>Student Name</label>
                    <input type="text" id="name" value={formData.name} onChange={handleInputChange} required className={InputClass} placeholder="e.g. Ahmad Abdullah" />
                  </div>
                  <div>
                    <label htmlFor="age" className={LabelClass}>Student Age</label>
                    <input type="number" id="age" value={formData.age} onChange={handleInputChange} required className={InputClass} placeholder="e.g. 10 or 35" />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="email" className={LabelClass}>Email Address</label>
                    <input type="email" id="email" value={formData.email} onChange={handleInputChange} required className={InputClass} placeholder="name@example.com" />
                  </div>
                  <div>
                    <label htmlFor="phone" className={LabelClass}>WhatsApp Number</label>
                    <CountryPhoneInput 
                      value={formData.phone} 
                      onChange={handlePhoneChange} 
                      required 
                      className="shadow-sm" 
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="level" className={LabelClass}>Current Quran Level</label>
                    <select id="level" value={formData.level} onChange={handleInputChange} required className={InputClass}>
                      <option value="">Choose current level...</option>
                      <option value="Beginner (Cannot read Arabic)">Beginner (Cannot read Arabic)</option>
                      <option value="Basic (Can read slowly, no Tajweed)">Basic (Can read slowly, no Tajweed)</option>
                      <option value="Intermediate (Reads fluently, basic Tajweed)">Intermediate (Reads fluently, basic Tajweed)</option>
                      <option value="Advanced (Fluent reading & Tajweed, Hifz candidate)">Advanced (Fluent reading & Tajweed, Hifz candidate)</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="goal" className={LabelClass}>Primary Goal</label>
                    <select id="goal" value={formData.goal} onChange={handleInputChange} required className={InputClass}>
                      <option value="">Select a learning goal...</option>
                      <option value="Learn to read from scratch">Learn to read from scratch</option>
                      <option value="Correct my Tajweed">Correct my Tajweed</option>
                      <option value="Start Hifz (Memorization)">Start Hifz (Memorization)</option>
                      <option value="Understand Quranic Arabic">Understand Quranic Arabic</option>
                    </select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="nationality" className={LabelClass}>Nationality</label>
                    <input type="text" id="nationality" value={formData.nationality} onChange={handleInputChange} required className={InputClass} placeholder="e.g. Nigerian, British" />
                  </div>
                  <div>
                    <label htmlFor="country" className={LabelClass}>Residence Country</label>
                    <input type="text" id="country" value={formData.country} onChange={handleInputChange} required className={InputClass} placeholder="e.g. UK, UAE, Nigeria" />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="city" className={LabelClass}>City / Time Zone</label>
                    <input type="text" id="city" value={formData.city} onChange={handleInputChange} required className={InputClass} placeholder="e.g. London (GMT)" />
                  </div>
                  <div>
                    <label htmlFor="referral" className={LabelClass}>How did you hear about us?</label>
                    <select id="referral" value={formData.referral} onChange={handleInputChange} className={InputClass}>
                      <option value="">-- Choose --</option>
                      <option value="facebook">Facebook / Instagram Ads</option>
                      <option value="youtube">YouTube</option>
                      <option value="google">Google Search</option>
                      <option value="friend">Friend / Family Recommendation</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className={ButtonClass}
                >
                  {isSubmitting ? "Processing..." : "Continue to Schedule"} <ArrowRight className="w-5 h-5" />
                </button>
              </form>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="step2"
              variants={slideVariants}
              initial="initial"
              animate="enter"
              exit="exit"
              className="bg-white rounded-3xl p-5 sm:p-8 md:p-12 shadow-xl border border-white/80 max-w-[600px] w-full relative overflow-hidden text-center"
            >
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
                <Calendar className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-headers font-bold text-secondary mb-2">Select Assessment Slot</h2>
              <p className="text-text-body mb-8">Please choose a convenient 15-minute slot. The calendar adjusts to your timezone automatically.</p>
              
              <div className="bg-white border-2 border-border-subtle rounded-2xl overflow-hidden shadow-inner mb-8 relative min-h-[600px] flex items-center justify-center">
                {process.env.NEXT_PUBLIC_CALENDLY_URL && isIframeLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/50 z-10">
                    <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                    <p className="text-text-muted text-sm font-medium">Loading Calendar...</p>
                  </div>
                )}
                {process.env.NEXT_PUBLIC_CALENDLY_URL ? (
                <iframe 
                  src={`${process.env.NEXT_PUBLIC_CALENDLY_URL}?hide_event_type_details=1&hide_gdpr_banner=1&name=${encodeURIComponent(formData.name)}&email=${encodeURIComponent(formData.email)}`}
                  width="100%"
                  height="600"
                  frameBorder="0"
                  title="Assessment scheduling"
                  onLoad={() => setIsIframeLoading(false)}
                  className={isIframeLoading ? "opacity-0" : "opacity-100 transition-opacity duration-500"}
                ></iframe>
                ) : (
                  <p className="px-6 text-center text-text-muted">Scheduling is not configured yet. You can skip this step and the team will follow up.</p>
                )}
              </div>

              <div className="pt-6 border-t border-border-subtle flex flex-col sm:flex-row justify-between items-center text-sm text-text-muted gap-4">
                <p>Having trouble booking? You can skip this step.</p>
                <button 
                  onClick={() => setStep(3)}
                  className="text-primary font-bold hover:text-primary/80 transition-colors flex items-center gap-1 bg-primary/5 px-5 py-2 rounded-full"
                >
                  Skip to Portal <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div 
              key="step3"
              variants={slideVariants}
              initial="initial"
              animate="enter"
              exit="exit"
              className="bg-white rounded-3xl p-5 sm:p-8 md:p-12 shadow-xl border border-white/80 max-w-[600px] w-full relative overflow-hidden"
            >
              <div className="text-center mb-10 mt-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h2 className="text-3xl font-headers font-bold text-secondary mb-2">Assessment Registered!</h2>
                
                {userData ? (
                  <>
                    <p className="text-text-body mb-10">Your assessment session has been registered. You can view your slot details and link directly from your dashboard.</p>
                    <Link 
                      href="/portal" 
                      className={ButtonClass}
                    >
                      Go to Dashboard <ArrowRight className="w-5 h-5" />
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="text-text-body mb-8 text-center">Set a secure password below to activate your Student Portal account and prepare for your Tajweed diagnostic session.</p>
                  </>
                )}
              </div>

              {!userData && (
                <form onSubmit={handleRegisterSubmit} className="space-y-5">
                  <div>
                    <label className={LabelClass}>Registered Email</label>
                    <div className="relative">
                      <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input 
                        type="email" 
                        value={formData.email} 
                        disabled 
                        className={InputClass + " pl-12 cursor-not-allowed opacity-70"} 
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="password" className={LabelClass}>Create Password</label>
                    <div className="relative">
                      <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input 
                        type="password" 
                        id="password" 
                        value={password} 
                        onChange={e => setPassword(e.target.value)} 
                        required 
                        minLength={8}
                        className={InputClass + " pl-12"} 
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className={LabelClass}>Confirm Password</label>
                    <div className="relative">
                      <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input 
                        type="password" 
                        id="confirmPassword" 
                        value={confirmPassword} 
                        onChange={e => setConfirmPassword(e.target.value)} 
                        required 
                        minLength={8}
                        className={InputClass + " pl-12"} 
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <TurnstileWidget
                    key={turnstileKey}
                    onVerify={setTurnstileToken}
                    onExpire={() => setTurnstileToken('')}
                    onError={() => setTurnstileToken('')}
                  />

                  <button 
                    type="submit" 
                    disabled={isRegistering}
                    className={ButtonClass}
                  >
                    {isRegistering ? "Activating Account..." : "Activate & Access Portal"} <ArrowRight className="w-5 h-5" />
                  </button>
                </form>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
