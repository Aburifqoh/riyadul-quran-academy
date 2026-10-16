'use client';

import { getErrorMessage } from '@/lib/errors';
import { authFetch } from '@/lib/authFetch';

import { useState } from 'react';

interface CreateStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateStaffModal({ isOpen, onClose, onCreated }: CreateStaffModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'teacher' | 'admin'>('teacher');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const reset = () => {
    setName('');
    setEmail('');
    setPassword('');
    setRole('teacher');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await authFetch('/api/admin/create-user', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Could not create account.');
        setSubmitting(false);
        return;
      }

      reset();
      onCreated();
      onClose();
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full">
        <h3 className="text-base font-semibold text-stone-800 mb-1">Create staff account</h3>
        <p className="text-xs text-stone-500 mb-5">
          This creates a login immediately. Share the password with them through a secure channel.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-stone-600">Full name</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-stone-600">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-stone-600">Temporary password</label>
            <input
              type="text"
              required
              minLength={8}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-stone-600">Role</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value as 'teacher' | 'admin')}
              className="px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <option value="teacher">Teacher</option>
              <option value="admin">Admin</option>
            </select>
            {role === 'admin' && (
              <p className="text-xs text-stone-400 mt-1">
                New admins start with full access. You can restrict specific permissions afterward from the User Directory.
              </p>
            )}
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2 mt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {submitting ? 'Creating\u2026' : 'Create account'}
            </button>
            <button
              type="button"
              onClick={() => { reset(); onClose(); }}
              className="flex-1 py-2.5 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-700 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
