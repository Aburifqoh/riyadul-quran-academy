'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { loginUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { LogIn, AlertCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center h-screen bg-background">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const intent = searchParams.get('intent');
  const nextPath = searchParams.get('next');
  const safeNext =
    nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : null;
  const { user, userData } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // Clear any stale Supabase session before creating a new one
      await supabase.auth.signOut();

      const cred = await loginUser(email.trim(), password.trim());
      // Fetch fresh user data to route properly
      const { getUserData } = await import('@/lib/auth');
      const data = await getUserData(cred.user.id);
      
      if (intent === 'assessment') router.push('/assessment');
      else if (safeNext) router.push(safeNext);
      else if (data?.role === 'admin' || data?.role === 'super_admin') router.push('/admin');
      else if (data?.role === 'teacher') router.push('/portal/teacher');
      else if (data?.accountType === 'parent') router.push('/parent');
      else router.push('/portal');
    } catch (err: any) {
      const errMsg = err?.message || String(err) || '';
      const errCode = err?.code || err?.status || '';
      console.error('[Login] Auth error:', { code: errCode, message: errMsg });

      if (errMsg.includes('fetch') || errMsg.includes('Network') || errMsg.includes('Failed to fetch')) {
        setError('Network error: Unable to connect. Please check your internet connection.');
      } else if (errCode === 'invalid_credentials' || errMsg === 'Invalid login credentials') {
        // Only match the EXACT Supabase error — not broad 'password' keyword
        setError('Invalid email or password. Please try again.');
      } else if (errMsg.includes('Email not confirmed')) {
        setError('Please verify your email address before logging in.');
      } else if (errMsg.includes('Too many requests') || errMsg.includes('rate limit')) {
        setError('Too many login attempts. Please wait a few minutes and try again.');
      } else {
        // Show the actual error so it can be diagnosed (not a generic mask)
        setError(errMsg || 'An unexpected error occurred. Please try again.');
      }
      
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
            <span className="text-4xl font-headers font-bold text-accent mb-6 block tracking-wide">Ilmvers</span>
            <h1 className="text-4xl lg:text-5xl font-headers font-bold text-white leading-tight mb-6">
              Welcome Back to Your <span className="text-accent">Learning Journey</span>.
            </h1>
            <p className="text-white/80 text-lg max-w-md">
              Access your personalized dashboard, continue your courses, and connect with your instructors.
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
        <Link href="/" className="md:hidden absolute top-6 left-6 inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors font-medium">
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
              <LogIn strokeWidth={2.5} className="w-7 h-7" />
            </div>
            <h2 className="text-3xl font-headers font-bold text-foreground mb-2">Log In</h2>
            <p className="text-muted-foreground">Enter your credentials to access your portal</p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-red-50 text-red-700 p-4 rounded-xl text-sm font-medium mb-8 flex items-start gap-3 border border-red-100"
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-5">
              <label className="block font-bold mb-2 text-foreground text-xs uppercase tracking-wider">Email Address</label>
              <input 
                type="email" 
                className="w-full px-5 py-3.5 border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all bg-background hover:bg-white text-base" 
                name="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                placeholder="name@example.com" 
              />
            </div>
            
            <div className="mb-8">
              <div className="flex justify-between items-center mb-2">
                <label className="block font-bold text-foreground text-xs uppercase tracking-wider">Password</label>
                <Link href="/forgot-password" className="text-sm font-bold text-primary hover:text-primary-hover transition-colors">Forgot Password?</Link>
              </div>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  className="w-full px-5 py-3.5 pr-12 border-2 border-border rounded-xl text-foreground focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all bg-background hover:bg-white text-base" 
                  name="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                  placeholder="••••••••" 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
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
              {isSubmitting ? "Authenticating..." : "Sign In"}
            </button>
          </form>

          <div className="text-center mt-10 text-muted-foreground font-medium">
            Don't have an account? <Link href="/register" className="text-primary font-bold hover:underline ml-1">Create an account</Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
