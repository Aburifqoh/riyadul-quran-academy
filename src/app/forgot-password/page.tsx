'use client';
import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { KeyRound, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center h-screen bg-background">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <ForgotPasswordContent />
    </Suspense>
  );
}

function ForgotPasswordContent() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: null, message: '' });

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password',
      });
      if (error) throw error;
      setStatus({
        type: 'success',
        message: 'Recovery email sent successfully! Please check your inbox.'
      });
    } catch (error: any) {
      console.error(error);
      setStatus({
        type: 'error',
        message: 'Failed to send recovery email. Is the email correct?'
      });
      setIsSubmitting(false);
    }
  };

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
          <Link href="/login" className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors font-medium">
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Login</span>
          </Link>
        </div>

        <div className="relative z-10 mt-20 mb-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="font-ar text-5xl text-accent mb-6 block opacity-90">رياض القرآن</span>
            <h1 className="text-4xl lg:text-5xl font-headers font-bold text-white leading-tight mb-6">
              Account <span className="text-accent">Recovery</span>.
            </h1>
            <p className="text-white/80 text-lg max-w-md">
              Don't worry, it happens to the best of us. Let's get you back on track to your learning journey.
            </p>
          </motion.div>
        </div>
        
        <div className="relative z-10 text-white/50 text-sm font-medium">
          &copy; {new Date().getFullYear()} Ilmvers Academy
        </div>
      </div>

      {/* Right Column: Solid Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-white relative">
        {/* Mobile Back Button */}
        <Link href="/login" className="md:hidden absolute top-6 left-6 inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors font-medium">
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </Link>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[440px]"
        >
          <div className="mb-10">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 text-primary shadow-sm border border-primary/10">
              <KeyRound strokeWidth={2.5} className="w-7 h-7" />
            </div>
            <h2 className="text-3xl font-headers font-bold text-foreground mb-2">Reset Password</h2>
            <p className="text-muted-foreground">Enter the email associated with your account to receive a secure password reset link.</p>
          </div>

          {status.type && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className={`p-4 rounded-xl text-sm font-medium mb-8 flex items-start gap-3 border ${status.type === 'success' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}
            >
              <span>{status.message}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-8">
              <label className="block font-bold mb-2 text-foreground text-xs uppercase tracking-wider">Account Email</label>
              <input 
                type="email" 
                className="w-full px-5 py-3.5 border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all bg-background hover:bg-white text-base" 
                required 
                placeholder="you@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting || status.type === 'success'} 
              className={cn(
                buttonVariants({ size: "lg" }),
                "w-full rounded-xl font-bold text-lg shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300",
                (isSubmitting || status.type === 'success') ? "opacity-70 cursor-not-allowed" : "bg-primary hover:bg-primary-hover text-white"
              )}
            >
              {isSubmitting ? 'Processing...' : status.type === 'success' ? 'Link Sent ✔️' : 'Send Reset Link'}
            </button>
          </form>

          <div className="text-center mt-10 text-muted-foreground font-medium text-sm">
            Check your spam/junk folder if you do not receive the email within 5 minutes.
          </div>
        </motion.div>
      </div>
    </div>
  );
}
