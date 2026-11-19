'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { addResource, getResources } from '@/lib/db';
import { uploadMedia } from '@/lib/uploadMedia';
import { getErrorMessage } from '@/lib/errors';
import type { LibraryResource } from '@/types/content';
import { BookOpen, ExternalLink, Upload, FileText, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORIES = ['Quran', 'Tajweed', 'Arabic', 'Islamic Studies', 'Other'];
const TYPES = ['PDF', 'Audio', 'Video', 'Link'];

export default function FacultyResources() {
  const { user, userData } = useAuth();
  const [approved, setApproved] = useState<LibraryResource[]>([]);
  const [mine, setMine] = useState<LibraryResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: '', type: 'PDF', category: 'Other', description: '', url: '' });
  const [file, setFile] = useState<File | null>(null);

  const ownerId = user?.id || userData?.id;

  const applyResources = (rows: LibraryResource[]) => {
    setApproved(rows.filter(r => !r.status || r.status === 'approved'));
    setMine(rows.filter(r => r.submitted_by === ownerId));
    setLoading(false);
  };

  const load = async () => {
    const all = await getResources({ includeUnapproved: true });
    applyResources((all || []) as LibraryResource[]);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const all = await getResources({ includeUnapproved: true });
      if (cancelled) return;
      applyResources((all || []) as LibraryResource[]);
    })();
    return () => {
      cancelled = true;
    };
    // applyResources is local and only depends on ownerId
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSubmitting(true);
    try {
      let url = form.url.trim();
      if (file) {
        url = await uploadMedia(file, 'teacher-materials');
      }
      if (!url) {
        alert('Add a file or a URL.');
        setSubmitting(false);
        return;
      }
      const result = await addResource({
        title: form.title.trim(),
        type: form.type,
        category: form.category,
        description: form.description.trim(),
        url,
        uploaded_by: userData?.name || 'Teacher',
        submitted_by: user?.id || userData?.id,
        submitted_by_name: userData?.name || 'Teacher',
        source: 'teacher',
        status: 'pending',
      });
      if (!result) throw new Error('Could not save the material. If this persists, ask admin to run teacher_materials.sql.');
      setForm({ title: '', type: 'PDF', category: 'Other', description: '', url: '' });
      setFile(null);
      alert('Material submitted. It will reach students after admin approval.');
      await load();
    } catch (err) {
      alert(getErrorMessage(err));
    }
    setSubmitting(false);
  };

  const statusChip = (status?: string) => {
    if (status === 'approved' || !status) return { label: 'Approved', cls: 'bg-emerald-50 text-emerald-700', icon: <CheckCircle2 className="w-3.5 h-3.5" /> };
    if (status === 'rejected') return { label: 'Rejected', cls: 'bg-red-50 text-red-600', icon: <XCircle className="w-3.5 h-3.5" /> };
    return { label: 'Pending review', cls: 'bg-amber-50 text-amber-700', icon: <Clock className="w-3.5 h-3.5" /> };
  };

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-10">
      <div>
        <h2 className="text-3xl font-headers font-bold text-gray-900 m-0">Faculty Materials</h2>
        <p className="text-gray-500 m-0">Use approved institutional files, or submit your own worksheets for admin review before they reach students.</p>
      </div>

      <section className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
        <h3 className="text-xl font-headers font-bold text-secondary mb-6 flex items-center gap-2">
          <Upload className="w-5 h-5 text-emerald-600" /> Submit a material
        </h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Title *</label>
            <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-emerald-400" placeholder="e.g. Noon Sakinah worksheet" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Type</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl">
                {TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Category</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl">
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Description</label>
            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl" placeholder="What should students use this for?" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-gray-500 mb-2">URL (optional if you upload a file)</label>
            <input type="url" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl" placeholder="https://..." />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Upload file</label>
            <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm" />
            {file && <p className="text-xs text-emerald-600 font-bold mt-1">✓ {file.name}</p>}
          </div>
          <div className="md:col-span-2">
            <button type="submit" disabled={submitting} className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full disabled:opacity-50">
              {submitting ? 'Submitting…' : 'Submit for admin approval'}
            </button>
          </div>
        </form>
      </section>

      {mine.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-xl font-headers font-bold text-secondary m-0">Your submissions</h3>
          {mine.map(r => {
            const chip = statusChip(r.status);
            return (
              <div key={r.id} className="bg-white border border-gray-100 rounded-2xl p-5 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-secondary">{r.title}</span>
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1', chip.cls)}>{chip.icon}{chip.label}</span>
                  </div>
                  {r.description && <p className="text-sm text-gray-500 m-0 mt-1">{r.description}</p>}
                </div>
                {r.url && (
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-emerald-700 shrink-0">Open</a>
                )}
              </div>
            );
          })}
        </section>
      )}

      <section>
        <h3 className="text-xl font-headers font-bold text-secondary mb-4">Approved library</h3>
        {loading ? (
          <p className="text-gray-400">Loading materials…</p>
        ) : approved.length === 0 ? (
          <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-[40px] p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-white text-gray-300 flex items-center justify-center mx-auto mb-4 border border-gray-100">
              <BookOpen className="w-8 h-8" />
            </div>
            <p className="text-gray-400 m-0">No approved materials yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {approved.map(doc => (
              <div key={doc.id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-gray-400 uppercase">{doc.type}</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-secondary m-0">{doc.title}</h4>
                  {doc.description && <p className="text-xs text-gray-400 mt-1 mb-0">{doc.description}</p>}
                </div>
                {doc.url && (
                  <a href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 py-3 rounded-full font-bold text-sm bg-gray-50 border border-gray-200 hover:bg-amber-50">
                    <ExternalLink className="w-4 h-4" /> Open
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
