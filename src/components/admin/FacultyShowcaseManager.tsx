'use client';

import React, { useEffect, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { authFetch } from '@/lib/authFetch';
import { getErrorMessage } from '@/lib/errors';
import type { FacultyCard } from '@/lib/facultyCards';
import { FacultyShowcaseCard } from '@/components/faculty/FacultyShowcaseCard';

export function FacultyShowcaseManager() {
  const [cards, setCards] = useState<FacultyCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<FacultyCard | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<FacultyCard | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/faculty-cards');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not load profiles.');
        if (!cancelled) setCards(Array.isArray(data.cards) ? data.cards : []);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveDraft = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    setSaving(true);
    setError('');
    try {
      const res = await authFetch('/api/admin/faculty-cards', {
        method: 'PUT',
        body: JSON.stringify({ card: draft }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save this profile.');
      setCards(Array.isArray(data.cards) ? data.cards : []);
      setDraft(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setSaving(true);
    setError('');
    try {
      const res = await authFetch('/api/admin/faculty-cards', {
        method: 'DELETE',
        body: JSON.stringify({ id: pendingDelete.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not delete this profile.');
      setCards(Array.isArray(data.cards) ? data.cards : []);
      setPendingDelete(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-[#FAF9F6] rounded-[32px] border border-[#E2E9E7] p-6 md:p-8">
      <div className="mb-6">
        <h3 className="text-2xl font-headers font-bold text-[#004D4A] m-0">Public instructor cards</h3>
        <p className="text-sm text-[#5A6E6C] mt-2 mb-0 max-w-3xl">
          These are the sample profiles on the Scholars & Instructors page. Edit or delete a card here and the public page updates with it.
        </p>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">{error}</p>
      )}

      {loading ? (
        <p className="text-sm text-[#5A6E6C]">Loading instructor cards...</p>
      ) : cards.length === 0 ? (
        <p className="text-sm text-[#5A6E6C]">No public instructor cards are published.</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card, index) => (
            <FacultyShowcaseCard
              key={card.id}
              card={card}
              index={index}
              action={
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDraft({ ...card, specialization: card.specialization || '' })}
                    className="flex-1 py-3 px-4 rounded-full bg-[#004D4A] hover:bg-[#0F3D38] text-white text-xs font-semibold tracking-wider uppercase inline-flex items-center justify-center gap-2"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(card)}
                    className="py-3 px-4 rounded-full border border-red-200 bg-red-50 text-red-700 text-xs font-semibold tracking-wider uppercase inline-flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              }
            />
          ))}
        </div>
      )}

      {draft && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <form onSubmit={saveDraft} className="bg-white rounded-[32px] p-8 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-headers font-bold text-[#004D4A] m-0 mb-1">Edit instructor card</h3>
            <p className="text-sm text-[#5A6E6C] mb-6">{draft.name}</p>
            <div className="space-y-4">
              <Field label="Name" value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
              <Field label="Role" value={draft.role} onChange={(role) => setDraft({ ...draft, role })} />
              <Field label="Category" value={draft.category} onChange={(category) => setDraft({ ...draft, category })} />
              <Field label="Qualifications" value={draft.credentials} onChange={(credentials) => setDraft({ ...draft, credentials })} />
              <Field label="Focus" value={draft.specialization || ''} onChange={(specialization) => setDraft({ ...draft, specialization })} />
              <label className="block">
                <span className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Bio</span>
                <textarea
                  required
                  rows={4}
                  value={draft.bio}
                  onChange={(event) => setDraft({ ...draft, bio: event.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#004D4A] focus:outline-none"
                />
              </label>
            </div>
            <div className="flex gap-3 pt-6">
              <button type="button" onClick={() => setDraft(null)} className="flex-1 py-3 rounded-full font-bold border border-gray-200 text-gray-600">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="flex-1 py-3 rounded-full font-bold text-white bg-[#004D4A] disabled:opacity-60">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {pendingDelete && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-headers font-bold text-[#004D4A] m-0 mb-2">Delete this card?</h3>
            <p className="text-sm text-[#5A6E6C] mb-6">
              {pendingDelete.name} will be removed from the public Scholars & Instructors page. This does not delete a teacher login.
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setPendingDelete(null)} className="flex-1 py-3 rounded-full font-bold border border-gray-200 text-gray-600">
                Cancel
              </button>
              <button type="button" disabled={saving} onClick={() => void confirmDelete()} className="flex-1 py-3 rounded-full font-bold text-white bg-red-600 disabled:opacity-60">
                {saving ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">{label}</span>
      <input
        required={label !== 'Focus'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#004D4A] focus:outline-none"
      />
    </label>
  );
}
