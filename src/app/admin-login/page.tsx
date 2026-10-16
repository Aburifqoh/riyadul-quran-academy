'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { ShieldAlert, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export default function AdminLoginPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center h-screen bg-slate-900">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <AdminLoginContent />
    </Suspense>
  );
}

function AdminLoginContent() {
  const router = useRouter();
  const { user, userData } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      await supabase.auth.signOut();

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });
      
      if (authError) throw authError;

      // Fetch fresh user data to route properly
      const { getUserData } = await import('@/lib/auth');
      const data = await getUserData(authData.user.id);
      
      if (data?.role === 'admin' || data?.role === 'super_admin') {
         router.push('/admin');
      } else {
         setError(`Access Denied: Your account role is '${data?.role}'. This portal requires 'admin' privileges.`);
         setIsSubmitting(false);
      }
    } catch (err: any) {
      const errMsg = err?.message || String(err) || '';
      const errCode = err?.code || err?.status || '';

      if (errMsg.includes('fetch') || errMsg.includes('Network') || errMsg.includes('Failed to fetch')) {
        setError('Network error: Unable to connect. Please check your internet connection.');
      } else if (errCode === 'invalid_credentials' || errMsg === 'Invalid login credentials') {
        setError('Invalid administrative credentials. Please try again.');
      } else if (errMsg.includes('Too many requests') || errMsg.includes('rate limit')) {
        setError('Too many login attempts. Please wait a few minutes and try again.');
      } else {
        setError(errMsg || 'Invalid administrative credentials.');
      }
      
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900 text-white min-h-screen flex flex-col relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-red-900/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/20 rounded-full blur-[100px] pointer-events-none" />

      <main className="flex-1 flex items-center justify-center py-16 px-6 relative z-10">
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="bg-slate-800 rounded-3xl p-8 md:p-12 shadow-2xl border border-slate-700 max-w-[480px] w-full relative overflow-hidden"
        >
          {/* Subtle grid pattern inside card */}
          <div className="absolute inset-0 bg-[url('/assets/grid.svg')] opacity-[0.05] pointer-events-none" />

          <div className="text-center mb-10 relative z-10">
            <motion.div 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-5 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
            >
              <ShieldAlert strokeWidth={2} className="w-8 h-8" />
            </motion.div>
            <h2 className="text-3xl font-headers font-bold text-white mb-2">Master Control</h2>
            <p className="text-slate-400">Restricted access for authorized personnel</p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-red-500/10 text-red-400 p-4 rounded-xl text-sm font-semibold mb-8 flex items-start gap-3 border border-red-500/20 relative z-10"
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="relative z-10">
            <div className="mb-5">
              <label className="block font-bold mb-2 text-slate-300 text-sm uppercase tracking-wider">System Email</label>
              <input 
                type="email" 
                className="w-full px-5 py-3.5 border-2 border-slate-700 rounded-xl text-white focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/20 transition-all bg-slate-900/50 hover:bg-slate-900 text-base placeholder:text-slate-500" 
                required 
                placeholder="admin@ilmversinstitute.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div className="mb-8">
              <label className="block font-bold mb-2 text-slate-300 text-sm uppercase tracking-wider">Security Key (Password)</label>
              <input 
                type="password" 
                className="w-full px-5 py-3.5 border-2 border-slate-700 rounded-xl text-white focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/20 transition-all bg-slate-900/50 hover:bg-slate-900 text-base placeholder:text-slate-500" 
                required 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting} 
              className={cn(
                buttonVariants({ size: "lg" }),
                "w-full rounded-full font-bold text-lg shadow-[0_0_15px_rgba(239,68,68,0.2)] hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(239,68,68,0.4)] transition-all duration-300 relative overflow-hidden group border-none",
                isSubmitting ? "opacity-70 cursor-not-allowed" : "bg-red-600 hover:bg-red-500 text-white"
              )}
            >
              <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent z-10 pointer-events-none" />
              {isSubmitting ? "Authenticating..." : "Authenticate"}
            </button>
          </form>

          <div className="text-center mt-8 pt-8 border-t border-slate-700/50 text-slate-400 font-medium text-sm relative z-10 px-4">
            <Link href="/login" className="hover:text-white transition-colors">Return to Student Portal</Link>
          </div>

        </motion.div>

      </main>
    </div>
  );
}
