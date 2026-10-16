'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Eye, EyeOff, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export function ChangePassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');

    if (newPassword.length < 6) {
      setStatus('error');
      setMessage('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatus('error');
      setMessage('Passwords do not match.');
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setStatus('success');
      setMessage('Password successfully updated!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Failed to update password. Please try again.');
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-border-subtle p-6 md:p-8 max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <Lock size={20} />
        </div>
        <div>
          <h3 className="text-xl font-bold font-headers text-secondary">Security</h3>
          <p className="text-sm text-text-body">Update your account password</p>
        </div>
      </div>

      {status === 'success' && (
        <div className="mb-6 bg-green-50 text-green-700 p-4 rounded-xl text-sm font-semibold flex items-start gap-3 border border-green-100">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{message}</span>
        </div>
      )}

      {status === 'error' && (
        <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-xl text-sm font-semibold flex items-start gap-3 border border-red-100">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-bold text-secondary uppercase tracking-wider mb-2">
            New Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              placeholder="Enter new password"
              className="w-full px-4 py-3 pr-12 border-2 border-border-subtle rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-base"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-secondary uppercase tracking-wider mb-2">
            Confirm Password
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Confirm new password"
              className="w-full px-4 py-3 pr-12 border-2 border-border-subtle rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-base"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors"
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={status === 'loading'}
          className={cn(
            buttonVariants({ variant: "default" }),
            "w-full rounded-xl py-3 font-bold mt-2",
            status === 'loading' && "opacity-70 cursor-not-allowed"
          )}
        >
          {status === 'loading' ? "Updating..." : "Update Password"}
        </button>
      </form>
    </div>
  );
}
