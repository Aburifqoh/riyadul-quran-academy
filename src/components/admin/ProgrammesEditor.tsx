'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_PROGRAMMES,
  emptyProgrammeDraft,
  loadPublicProgrammes,
  savePublicProgrammes,
  type Programme,
} from '@/lib/programmes';
import { getErrorMessage } from '@/lib/errors';

export function ProgrammesEditor() {
  const [items, setItems] = useState<Programme[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    const list = await loadPublicProgrammes({ includeUnpublished: true });
    setItems(list.length ? list : DEFAULT_PROGRAMMES);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const updateAt = (index: number, patch: Partial<Programme>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const updateListField = (index: number, field: 'points' | 'badges', value: string) => {
    const lines = value.split('\n').map((l) => l.trim()).filter(Boolean);
    updateAt(index, { [field]: lines });
  };

  const addProgramme = () => {
    const draft = emptyProgrammeDraft();
    draft.sortOrder = items.length + 1;
    setItems((prev) => [...prev, draft]);
    setExpanded(`new-${items.length}`);
  };

  const removeAt = (index: number) => {
    if (!confirm('Remove this programme from the public site?')) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const resetDefaults = () => {
    if (!confirm('Replace with the default Ilmvers programmes?')) return;
    setItems(DEFAULT_PROGRAMMES.map((p) => ({ ...p, points: [...p.points], badges: [...(p.badges || [])] })));
  };

  const save = async () => {
    setSaving(true);
    setMessage('');
    try {
      const result = await savePublicProgrammes(items);
      if (!result.ok) throw new Error(result.error || 'Save failed');
      setMessage('Programmes saved. Homepage and /programs will show the update.');
      await reload();
    } catch (err) {
      setMessage(getErrorMessage(err) || 'Could not save programmes.');
    }
    setSaving(false);
  };

  if (loading) {
    return <p className="text-sm text-gray-500 py-8">Loading programmes…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-xl font-headers font-bold text-gray-900 m-0">Programmes & subjects</h3>
          <p className="text-sm text-gray-500 m-0 mt-1">
            Add or edit the courses shown on the homepage and public programme pages. Subjects are the bullet points on
            each programme.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={resetDefaults}
            className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700"
          >
            Reset defaults
          </button>
          <button
            type="button"
            onClick={addProgramme}
            className="rounded-full border border-[#004D4A] px-4 py-2 text-sm font-semibold text-[#004D4A]"
          >
            Add programme
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-full bg-[#004D4A] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>

      {message ? <p className="text-sm font-medium text-[#004D4A] bg-[#F0F4F2] rounded-xl px-4 py-3">{message}</p> : null}

      <div className="space-y-4">
        {items.map((item, index) => {
          const key = item.slug || `row-${index}`;
          const open = expanded === key;
          return (
            <div key={key} className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
              <button
                type="button"
                className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-stone-50"
                onClick={() => setExpanded(open ? null : key)}
              >
                <div>
                  <p className="font-bold text-secondary m-0">{item.title || 'Untitled programme'}</p>
                  <p className="text-xs text-stone-500 m-0 mt-0.5">
                    /programs/{item.slug || '…'} · {item.published === false ? 'Hidden' : 'Published'} ·{' '}
                    {item.points?.length || 0} subjects
                  </p>
                </div>
                <span className="text-stone-400 text-sm">{open ? '▲' : '▼'}</span>
              </button>

              {open && (
                <div className="px-5 pb-5 space-y-4 border-t border-stone-100 pt-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-500">
                      Title
                      <input
                        className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
                        value={item.title}
                        onChange={(e) => updateAt(index, { title: e.target.value })}
                      />
                    </label>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-500">
                      URL slug
                      <input
                        className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
                        value={item.slug}
                        onChange={(e) => updateAt(index, { slug: e.target.value })}
                        placeholder="quran-tajweed"
                      />
                    </label>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-500">
                      SEO title
                      <input
                        className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
                        value={item.seoTitle}
                        onChange={(e) => updateAt(index, { seoTitle: e.target.value })}
                      />
                    </label>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-500">
                      Tagline
                      <input
                        className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
                        value={item.tagline}
                        onChange={(e) => updateAt(index, { tagline: e.target.value })}
                      />
                    </label>
                  </div>

                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-500">
                    Homepage short description
                    <textarea
                      className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm min-h-[72px]"
                      value={item.shortDescription || ''}
                      onChange={(e) => updateAt(index, { shortDescription: e.target.value })}
                    />
                  </label>

                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-500">
                    Full description
                    <textarea
                      className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm min-h-[96px]"
                      value={item.description}
                      onChange={(e) => updateAt(index, { description: e.target.value })}
                    />
                  </label>

                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-500">
                    Who it is for
                    <textarea
                      className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm min-h-[72px]"
                      value={item.audience}
                      onChange={(e) => updateAt(index, { audience: e.target.value })}
                    />
                  </label>

                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-500">
                    Subjects / topics (one per line)
                    <textarea
                      className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm min-h-[120px]"
                      value={(item.points || []).join('\n')}
                      onChange={(e) => updateListField(index, 'points', e.target.value)}
                    />
                  </label>

                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-500">
                    Homepage badges (one per line)
                    <textarea
                      className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm min-h-[72px]"
                      value={(item.badges || []).join('\n')}
                      onChange={(e) => updateListField(index, 'badges', e.target.value)}
                    />
                  </label>

                  <div className="flex flex-wrap items-center gap-4">
                    <label className="inline-flex items-center gap-2 text-sm font-semibold text-stone-700">
                      <input
                        type="checkbox"
                        checked={item.published !== false}
                        onChange={(e) => updateAt(index, { published: e.target.checked })}
                      />
                      Published on public pages
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm text-stone-600">
                      Sort
                      <input
                        type="number"
                        className="w-20 rounded-lg border border-stone-200 px-2 py-1"
                        value={item.sortOrder ?? index + 1}
                        onChange={(e) => updateAt(index, { sortOrder: Number(e.target.value) || index + 1 })}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => removeAt(index)}
                      className="ml-auto text-sm font-semibold text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
