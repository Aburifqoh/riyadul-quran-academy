'use client';

import React, { useState, Suspense, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { registerAdult, registerParent } from '@/lib/auth';
import { TurnstileWidget } from '@/components/TurnstileWidget';
import { supabase } from '@/lib/supabase';
import { getErrorMessage } from '@/lib/errors';
import { passwordPolicyError } from '@/lib/passwordPolicy';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Users, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center h-screen bg-background">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <RegisterContent />
    </Suspense>
  );
}

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedPlan = searchParams.get('plan');
  const { user } = useAuth();

  const [enrollmentType, setEnrollmentType] = useState<'self' | 'child' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileKey, setTurnstileKey] = useState(0);

  useEffect(() => {
    setTurnstileToken('');
    setTurnstileKey((key) => key + 1);
  }, [enrollmentType]);

  // Adult Form State
  const [adultForm, setAdultForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    phone: '', nationality: '', country: '', city: '', referral: '', gender: ''
  });

  // Parent Form State
  const [parentForm, setParentForm] = useState({
    name: '', email: '', password: '', confirmPassword: '', phone: ''
  });
  
  const [childrenForm, setChildrenForm] = useState([{
    name: '', age: '', gender: '', level: 'beginner', email: ''
  }]);

  // Handlers
  const handleAdultChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setAdultForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleParentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setParentForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleChildChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const newChildren = [...childrenForm];
    newChildren[index] = { ...newChildren[index], [e.target.name]: e.target.value };
    setChildrenForm(newChildren);
  };

  const addChild = () => {
    setChildrenForm([...childrenForm, { name: '', age: '', gender: '', level: 'beginner', email: '' }]);
  };

  const removeChild = (index: number) => {
    if (childrenForm.length > 1) {
      setChildrenForm(childrenForm.filter((_, i) => i !== index));
    }
  };

  const handleAdultSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turnstileToken) {
      alert('Tick the security box below, then try again. If the box never appears, turn off your ad blocker and refresh.');
      return;
    }
    if (adultForm.password !== adultForm.confirmPassword) {
      alert("Passwords do not match. Please re-type carefully.");
      return;
    }
    const adultPasswordError = passwordPolicyError(adultForm.password);
    if (adultPasswordError) {
      alert(adultPasswordError);
      return;
    }
    setIsSubmitting(true);

    try {
      const data = {
        ...adultForm,
        detectedTz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        tuitionPlan: selectedPlan || 'one_on_one'
      };
      await registerAdult(data, turnstileToken);
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: adultForm.email.trim().toLowerCase(),
        password: adultForm.password,
      });
      if (loginError) throw loginError;
      router.push('/portal');
    } catch (error: unknown) {
      alert(getErrorMessage(error) || 'We could not complete your registration. Please try again.');
      setTurnstileToken('');
      setTurnstileKey((key) => key + 1);
      setIsSubmitting(false);
    }
  };

  const handleParentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turnstileToken) {
      alert('Tick the security box below, then try again. If the box never appears, turn off your ad blocker and refresh.');
      return;
    }
    if (parentForm.password !== parentForm.confirmPassword) {
      alert("Passwords do not match. Please re-type carefully.");
      return;
    }
    const parentPasswordError = passwordPolicyError(parentForm.password);
    if (parentPasswordError) {
      alert(parentPasswordError);
      return;
    }
    setIsSubmitting(true);

    try {
      const pData = {
        ...parentForm,
        detectedTz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
      const cData = childrenForm.map(c => ({
        ...c,
        tuitionPlan: selectedPlan || 'one_on_one'
      }));
      await registerParent(pData, cData, turnstileToken);
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: parentForm.email.trim().toLowerCase(),
        password: parentForm.password,
      });
      if (loginError) throw loginError;
      router.push('/portal');
    } catch (error: unknown) {
      alert(getErrorMessage(error) || 'We could not complete your registration. Please try again.');
      setTurnstileToken('');
      setTurnstileKey((key) => key + 1);
      setIsSubmitting(false);
    }
  };

  const InputClass = "w-full px-5 py-3.5 border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all bg-background hover:bg-white text-base";
  const LabelClass = "block font-bold mb-2 text-foreground text-xs uppercase tracking-wider";

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      
      {/* Left Column: Branding & Visuals (Hidden on small screens) */}
      <div className="hidden md:flex md:w-1/2 lg:w-5/12 bg-primary relative overflow-hidden flex-col justify-between p-12">
        {/* Background Patterns */}
        <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="islamic-pattern" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M30 0L60 30L30 60L0 30L30 0Z" fill="none" stroke="currentColor" strokeWidth="1" />
                <circle cx="30" cy="30" r="15" fill="none" stroke="currentColor" strokeWidth="1" />
              </pattern>
            </defs>
            <rect x="0" y="0" width="100%" height="100%" fill="url(#islamic-pattern)" />
          </svg>
        </div>
        
        {/* Ambient Glows */}
        <div className="absolute top-[-10%] left-[-20%] w-[500px] h-[500px] bg-accent/20 rounded-full filter blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-20%] w-[400px] h-[400px] bg-primary-light/30 rounded-full filter blur-[100px] pointer-events-none" />

        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors font-medium">
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Home</span>
          </Link>
        </div>

        <div className="relative z-10 mt-20 mb-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl lg:text-5xl font-headers font-bold text-white leading-tight mb-6">
              Begin Your <span className="text-accent">Quranic Journey</span>.
            </h1>
            <p className="text-white/80 text-lg max-w-md">
              Join Ilmvers Institute and unlock personalized learning tailored to your pace and goals.
            </p>
          </motion.div>
        </div>
        
        <div className="relative z-10 text-white/50 text-sm font-medium">
          &copy; {new Date().getFullYear()} Ilmvers Institute
        </div>
      </div>

      {/* Right Column: Solid Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-white relative max-h-screen overflow-y-auto">
        {/* Mobile Back Button */}
        <Link href="/" className="md:hidden absolute top-6 left-6 inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors font-medium z-20">
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </Link>
        
        <div className="w-full max-w-[600px] py-10">
          <AnimatePresence mode="wait">
            {!enrollmentType && (
              <motion.div 
                key="selection"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
              >
                <div className="text-center mb-10">
                  <h2 className="text-3xl md:text-4xl font-headers font-bold text-foreground mb-4">Create Account</h2>
                  <p className="text-muted-foreground">Select how you want to enroll</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mt-10">
                  {/* Adult Student Card */}
                  <button 
                    onClick={() => setEnrollmentType('self')}
                    className="bg-background border-2 border-border hover:border-primary rounded-2xl p-8 cursor-pointer shadow-sm hover:shadow-md transition-all duration-300 flex flex-col items-center text-center group"
                  >
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-primary/20 transition-all text-primary">
                      <User className="w-8 h-8" strokeWidth={2} />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">Adult Student</h3>
                    <p className="text-muted-foreground text-sm">I am registering to study for myself.</p>
                  </button>

                  {/* Parent/Guardian Card */}
                  <button 
                    onClick={() => setEnrollmentType('child')}
                    className="bg-background border-2 border-border hover:border-primary rounded-2xl p-8 cursor-pointer shadow-sm hover:shadow-md transition-all duration-300 flex flex-col items-center text-center group"
                  >
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-primary/20 transition-all text-primary">
                      <Users className="w-8 h-8" strokeWidth={2} />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">Parent / Guardian</h3>
                    <p className="text-muted-foreground text-sm">I am enrolling my children to study.</p>
                  </button>
                </div>

                <div className="text-center mt-10 text-muted-foreground font-medium">
                  Already have an account? <Link href="/login" className="text-primary font-bold hover:underline ml-1">Log in</Link>
                </div>
              </motion.div>
            )}

            {enrollmentType === 'self' && (
              <motion.div 
                key="adult"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4 }}
              >
                <button 
                  onClick={() => setEnrollmentType(null)} 
                  className="mb-8 text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 font-medium"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to options
                </button>
                
                <div className="mb-10">
                  <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 text-primary shadow-sm border border-primary/10">
                    <User className="w-7 h-7" />
                  </div>
                  <h2 className="text-3xl font-headers font-bold text-foreground mb-2">Adult Account</h2>
                  <p className="text-muted-foreground">Register for yourself</p>
                </div>

                <form onSubmit={handleAdultSubmit}>
                  <div className="mb-5">
                    <label className={LabelClass}>Full Name</label>
                    <input type="text" className={InputClass} name="name" value={adultForm.name} onChange={handleAdultChange} required placeholder="e.g. Ahmad Abdullah" />
                  </div>
                  
                  <div className="mb-5">
                    <label className={LabelClass}>Email Address</label>
                    <input type="email" className={InputClass} name="email" value={adultForm.email} onChange={handleAdultChange} required placeholder="name@example.com" />
                  </div>

                  <div className="grid md:grid-cols-2 gap-5 mb-5">
                    <div>
                      <label className={LabelClass}>Create Password</label>
                      <input type="password" className={InputClass} name="password" value={adultForm.password} onChange={handleAdultChange} required placeholder="••••••••" minLength={8} />
                    </div>
                    <div>
                      <label className={LabelClass}>Confirm Password</label>
                      <input type="password" className={InputClass} name="confirmPassword" value={adultForm.confirmPassword} onChange={handleAdultChange} required placeholder="••••••••" minLength={8} />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-5 mb-5">
                    <div>
                      <label className={LabelClass}>WhatsApp Number</label>
                      <input type="tel" className={InputClass} name="phone" value={adultForm.phone} onChange={handleAdultChange} required placeholder="+1 234 567 8900" />
                    </div>
                    <div>
                      <label className={LabelClass}>Gender</label>
                      <select className={InputClass} name="gender" value={adultForm.gender} onChange={handleAdultChange} required>
                        <option value="">-- Select Gender --</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-5 mb-5">
                    <div>
                      <label className={LabelClass}>Nationality</label>
                      <input type="text" className={InputClass} name="nationality" value={adultForm.nationality} onChange={handleAdultChange} required placeholder="e.g. Nigerian" />
                    </div>
                    <div>
                      <label className={LabelClass}>Residence Country</label>
                      <input type="text" className={InputClass} name="country" value={adultForm.country} onChange={handleAdultChange} required placeholder="e.g. UK" />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-5 mb-8">
                    <div>
                      <label className={LabelClass}>Province / State / City</label>
                      <input type="text" className={InputClass} name="city" value={adultForm.city} onChange={handleAdultChange} required placeholder="e.g. London" />
                    </div>
                    <div>
                      <label className={LabelClass}>Hear about us?</label>
                      <select className={InputClass} name="referral" value={adultForm.referral} onChange={handleAdultChange}>
                        <option value="">-- Choose --</option>
                        <option value="youtube">YouTube</option>
                        <option value="facebook">Facebook / Instagram</option>
                        <option value="google">Google Search</option>
                        <option value="friend">Friend / Family</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="my-6">
                    <TurnstileWidget
                      key={`adult-${turnstileKey}`}
                      onVerify={setTurnstileToken}
                      onExpire={() => setTurnstileToken('')}
                      onError={() => setTurnstileToken('')}
                    />
                  </div>
                  
                  <button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className={cn(
                      buttonVariants({ size: "lg" }),
                      "w-full rounded-xl font-bold text-lg shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300",
                      isSubmitting ? "opacity-70 cursor-not-allowed" : "bg-primary hover:bg-primary-hover text-white"
                    )}
                  >
                    {isSubmitting ? "Creating Account..." : "Sign Up & Access Portal"}
                  </button>
                </form>
              </motion.div>
            )}

            {enrollmentType === 'child' && (
              <motion.div 
                key="parent"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4 }}
              >
                <button 
                  onClick={() => setEnrollmentType(null)} 
                  className="mb-8 text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 font-medium"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to options
                </button>

                <div className="mb-10">
                  <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 text-primary shadow-sm border border-primary/10">
                    <Users className="w-7 h-7" />
                  </div>
                  <h2 className="text-3xl font-headers font-bold text-foreground mb-2">Parent Account</h2>
                  <p className="text-muted-foreground">Enroll your children to study</p>
                </div>

                <form onSubmit={handleParentSubmit}>
                  <div className="border-b-2 border-border pb-3 mb-6">
                    <h3 className="text-xl font-bold text-foreground">Parent Details</h3>
                  </div>
                  
                  <div className="mb-5">
                    <label className={LabelClass}>Full Name</label>
                    <input type="text" className={InputClass} name="name" value={parentForm.name} onChange={handleParentChange} required placeholder="Parent's Name" />
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-5 mb-5">
                    <div>
                      <label className={LabelClass}>Email Address</label>
                      <input type="email" className={InputClass} name="email" value={parentForm.email} onChange={handleParentChange} required placeholder="name@example.com" />
                    </div>
                    <div>
                      <label className={LabelClass}>WhatsApp Number</label>
                      <input type="tel" className={InputClass} name="phone" value={parentForm.phone} onChange={handleParentChange} required placeholder="+1 234 567 8900" />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-5 mb-8">
                    <div>
                      <label className={LabelClass}>Create Password</label>
                      <input type="password" className={InputClass} name="password" value={parentForm.password} onChange={handleParentChange} required placeholder="••••••••" minLength={8} />
                    </div>
                    <div>
                      <label className={LabelClass}>Confirm Password</label>
                      <input type="password" className={InputClass} name="confirmPassword" value={parentForm.confirmPassword} onChange={handleParentChange} required placeholder="••••••••" minLength={8} />
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-b-2 border-border pb-3 mb-6 mt-10">
                    <h3 className="text-xl font-bold text-foreground">Children Details</h3>
                    <span className="bg-primary/10 text-primary px-3 py-1 rounded-lg font-bold text-xs border border-primary/20">
                      {childrenForm.length} Enrolled
                    </span>
                  </div>

                  <div className="space-y-6">
                    <AnimatePresence>
                      {childrenForm.map((child, index) => (
                        <motion.div 
                          key={index} 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="bg-background border-2 border-border rounded-xl p-6 relative"
                        >
                          {childrenForm.length > 1 && (
                            <button 
                              type="button" 
                              onClick={() => removeChild(index)} 
                              className="absolute top-4 right-4 text-red-500 hover:text-red-600 font-bold text-xs bg-red-50 hover:bg-red-100 px-3 py-1 rounded-md transition-colors"
                            >
                              Remove
                            </button>
                          )}
                          <h4 className="font-bold text-foreground mb-4 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-md bg-foreground text-white flex items-center justify-center text-xs">{index + 1}</span>
                            Child Information
                          </h4>
                          
                          <div className="grid md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <label className={LabelClass}>Child's Name</label>
                              <input type="text" className={InputClass} name="name" value={child.name} onChange={(e) => handleChildChange(index, e)} required placeholder="e.g. Fatima" />
                            </div>
                            <div>
                              <label className={LabelClass}>Age</label>
                              <input type="number" className={InputClass} name="age" value={child.age} onChange={(e) => handleChildChange(index, e)} required placeholder="e.g. 8" />
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <label className={LabelClass}>Gender</label>
                              <select className={InputClass} name="gender" value={child.gender} onChange={(e) => handleChildChange(index, e)} required>
                                <option value="">-- Select Gender --</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <label className={LabelClass}>Knowledge Level</label>
                              <select className={InputClass} name="level" value={child.level} onChange={(e) => handleChildChange(index, e)}>
                                <option value="beginner">Beginner</option>
                                <option value="intermediate">Intermediate</option>
                                <option value="advanced">Advanced</option>
                              </select>
                            </div>
                            <div>
                              <label className={LabelClass}>Student Email (Optional)</label>
                              <input type="email" className={InputClass} name="email" value={child.email} onChange={(e) => handleChildChange(index, e)} placeholder="child@example.com" />
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  <button 
                    type="button" 
                    onClick={addChild} 
                    className="mt-6 w-full py-4 rounded-xl font-bold border-2 border-dashed border-primary/50 text-primary hover:bg-primary/5 hover:border-primary transition-colors flex items-center justify-center gap-2 mb-8"
                  >
                    <span className="text-xl">+</span> Add Another Student
                  </button>

                  <div className="mb-6">
                    <TurnstileWidget
                      key={`parent-${turnstileKey}`}
                      onVerify={setTurnstileToken}
                      onExpire={() => setTurnstileToken('')}
                      onError={() => setTurnstileToken('')}
                    />
                  </div>

                  <button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className={cn(
                      buttonVariants({ size: "lg" }),
                      "w-full rounded-xl font-bold text-lg shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300",
                      isSubmitting ? "opacity-70 cursor-not-allowed" : "bg-primary hover:bg-primary-hover text-white"
                    )}
                  >
                    {isSubmitting ? "Creating Accounts..." : "Complete Registration"}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
