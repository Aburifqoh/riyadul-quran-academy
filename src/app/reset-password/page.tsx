'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { passwordPolicyError } from '@/lib/passwordPolicy';
import { getErrorMessage } from '@/lib/errors';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirm) {
      setMessage('Passwords do not match.');
      return;
    }
    const policy = passwordPolicyError(password);
    if (policy) {
      setMessage(policy);
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setMessage(getErrorMessage(error));
      return;
    }
    setDone(true);
    setMessage('Your password has been updated. You can sign in now.');
  };

  return (
    <main className="min-h-[70vh] flex items-center justify-center px-6 py-16">
      <form onSubmit={submit} className="w-full max-w-md bg-white border border-border rounded-2xl p-8 shadow-sm">
        <h1 className="text-2xl font-bold mb-2">Choose a new password</h1>
        <p className="text-sm text-muted-foreground mb-6">Open this page from the recovery email so the sign-in link is already applied.</p>
        <label className="block text-sm font-semibold mb-2" htmlFor="new-password">New password</label>
        <input id="new-password" type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} className="w-full mb-4 px-4 py-3 border rounded-xl" />
        <label className="block text-sm font-semibold mb-2" htmlFor="confirm-password">Confirm password</label>
        <input id="confirm-password" type="password" minLength={8} required value={confirm} onChange={(event) => setConfirm(event.target.value)} className="w-full mb-4 px-4 py-3 border rounded-xl" />
        {message ? <p className="text-sm mb-4">{message}</p> : null}
        <button type="submit" disabled={busy || done} className="w-full rounded-full bg-primary text-white font-semibold py-3 disabled:opacity-60">
          {busy ? 'Saving...' : 'Update password'}
        </button>
        <p className="text-center mt-4 text-sm"><Link href="/login" className="text-primary font-semibold">Back to login</Link></p>
      </form>
    </main>
  );
}
