'use client';

import React, { useState } from 'react';
import { ImagePlus, Send, Loader2, X } from 'lucide-react';
import RichPostEditor, { htmlToPlainText, sanitizePostHtml } from '@/components/editor/RichPostEditor';
import { submitCommunityPost } from '@/lib/db';
import { authFetch } from '@/lib/authFetch';
import { uploadMedia } from '@/lib/uploadMedia';
import { getErrorMessage } from '@/lib/errors';

const CATEGORIES = ['Insights', 'Hifz', 'Tajweed', 'Arabic', 'Community', 'Announcements'];

type Props = {
  authorName: string;
  authorId?: string;
  publishImmediately?: boolean;
  onSuccess?: () => void;
};

export default function CommunityPostComposer({
  authorName,
  authorId,
  publishImmediately = false,
  onSuccess,
}: Props) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Insights');
  const [content, setContent] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [coverUploading, setCoverUploading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [mailNote, setMailNote] = useState('');

  const handleCover = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please choose an image for the cover.');
      return;
    }
    setCoverUploading(true);
    try {
      setCoverUrl(await uploadMedia(file, 'community-covers'));
    } catch (err) {
      alert(getErrorMessage(err) || 'Cover upload failed');
    }
    setCoverUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !htmlToPlainText(content)) {
      setStatus('error');
      setErrorMsg('Please add a title and some article content.');
      return;
    }

    setStatus('submitting');
    setErrorMsg('');

    const result = await submitCommunityPost({
      title: title.trim(),
      content: sanitizePostHtml(content),
      author: authorName || 'Ilmvers',
      author_id: authorId,
      status: publishImmediately ? 'published' : 'pending_approval',
      category,
      coverImageUrl: coverUrl || undefined,
    });

    if (!result.success) {
      setStatus('error');
      setErrorMsg(result.error || 'Failed to submit post');
      return;
    }

    if (publishImmediately) {
      try {
        const mailed = await authFetch('/api/newsletter/broadcast', {
          method: 'POST',
          body: JSON.stringify({
            kind: 'post',
            id: result.id,
            title: title.trim(),
            excerpt: htmlToPlainText(content).slice(0, 280),
          }),
        });
        const data = await mailed.json().catch(() => ({}));
        setMailNote(mailed.ok
          ? (data.mailed > 0 ? `Emailed ${data.mailed} newsletter subscriber${data.mailed === 1 ? '' : 's'}.` : 'No newsletter subscribers to email yet.')
          : 'The post is live. The subscriber email did not send.');
      } catch {
        setMailNote('The post is live. The subscriber email did not send.');
      }
    } else {
      setMailNote('');
      void fetch('/api/notify-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), authorName }),
      });
    }

    setStatus('success');
    setTitle('');
    setContent('');
    setCoverUrl('');
    setCategory('Insights');
    onSuccess?.();
  };

  if (status === 'success') {
    return (
      <div className="bg-emerald-50 border border-emerald-100 rounded-[32px] p-10 text-center space-y-4">
        <p className="text-2xl font-headers font-bold text-emerald-900 m-0">
          {publishImmediately ? 'Post published' : 'Post submitted for review'}
        </p>
        <p className="text-emerald-800 m-0">
          {publishImmediately
            ? `It is now live on the Community page and Journal. ${mailNote}`
            : 'Administration will review it before it appears publicly.'}
        </p>
        <button
          type="button"
          onClick={() => setStatus('idle')}
          className="mt-2 px-6 py-3 bg-emerald-700 text-white rounded-full font-bold hover:bg-emerald-800"
        >
          Write another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 md:p-10 rounded-[40px] border border-gray-100 shadow-sm space-y-6">
      {status === 'error' && (
        <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold border border-red-100">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. The Virtues of Consistency in Hifz"
            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/20 text-gray-900 font-bold text-lg"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold text-gray-800"
          >
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Cover image</label>
        {coverUrl ? (
          <div className="relative rounded-2xl overflow-hidden border border-gray-100 h-48">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverUrl} alt="Cover preview" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => setCoverUrl('')}
              className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 text-gray-700 flex items-center justify-center shadow"
              aria-label="Remove cover"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center gap-2 h-36 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/40 transition-colors">
            {coverUploading ? <Loader2 className="w-6 h-6 animate-spin text-emerald-600" /> : <ImagePlus className="w-7 h-7 text-gray-400" />}
            <span className="text-sm font-bold text-gray-500">
              {coverUploading ? 'Uploading…' : 'Upload a cover photo'}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) void handleCover(file);
              }}
            />
          </label>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Article</label>
        <RichPostEditor
          value={content}
          onChange={setContent}
          disabled={status === 'submitting'}
        />
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-bold text-sm shadow-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {status === 'submitting'
            ? 'Saving…'
            : publishImmediately
              ? <><Send className="w-4 h-4" /> Publish now</>
              : <><Send className="w-4 h-4" /> Submit for review</>}
        </button>
      </div>
    </form>
  );
}
