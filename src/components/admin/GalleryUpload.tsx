'use client';


import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { getErrorMessage } from '@/lib/errors';

interface PendingFile {
  file: File;
  previewUrl: string;
  caption: string;
  eventTag: string;
  consentConfirmed: boolean;
  id: string;
}

interface UploadStatus {
  id: string;
  state: 'idle' | 'uploading' | 'done' | 'error';
  message?: string;
}

const EVENT_TAGS = [
  'Live Class',
  'Hifz Graduation',
  'Jumu\u02BCah Khutbah',
  'Weekend Class \u2014 Hanan Centre',
  'Community Event',
  'Other',
];

export function GalleryUpload({ adminId }: { adminId: string }) {
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [statuses, setStatuses] = useState<Record<string, UploadStatus>>({});
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // YouTube Upload State
  const [uploadMode, setUploadMode] = useState<'photo' | 'youtube'>('photo');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeCaption, setYoutubeCaption] = useState('');
  const [youtubeTag, setYoutubeTag] = useState(EVENT_TAGS[0]);
  const [youtubeConsent, setYoutubeConsent] = useState(false);
  const [youtubeStatus, setYoutubeStatus] = useState<UploadStatus | null>(null);

  const submitYoutube = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeConsent) {
      setYoutubeStatus({ id: 'yt', state: 'error', message: 'Confirm sharing consent before submitting.' });
      return;
    }

    const isYt = youtubeUrl.includes('youtube.com') || youtubeUrl.includes('youtu.be');
    if (!isYt) {
      setYoutubeStatus({ id: 'yt', state: 'error', message: 'Please enter a valid YouTube Video or Playlist URL.' });
      return;
    }

    setYoutubeStatus({ id: 'yt', state: 'uploading' });

    try {
      const { error } = await supabase.from('gallery_photos').insert({
        storage_path: youtubeUrl.trim(),
        caption: youtubeCaption.trim() || null,
        event_tag: youtubeTag,
        uploaded_by: adminId,
        status: 'pending',
      });

      if (error) throw error;

      setYoutubeStatus({ id: 'yt', state: 'done' });
      setYoutubeUrl('');
      setYoutubeCaption('');
      setYoutubeConsent(false);
    } catch (err: unknown) {
      setYoutubeStatus({ id: 'yt', state: 'error', message: getErrorMessage(err) || 'Failed to submit video. Try again.' });
    }
  };

  const addFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));

    const newPending: PendingFile[] = imageFiles.map(file => ({
      file,
      previewUrl: URL.createObjectURL(file),
      caption: '',
      eventTag: EVENT_TAGS[0],
      consentConfirmed: false,
      id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`,
    }));

    setPendingFiles(prev => [...prev, ...newPending]);
  }, []);

  const updateField = (id: string, field: 'caption' | 'eventTag' | 'consentConfirmed', value: string | boolean) => {
    setPendingFiles(prev =>
      prev.map(p => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const removeFile = (id: string) => {
    setPendingFiles(prev => {
      const target = prev.find(p => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter(p => p.id !== id);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const submitFile = async (pending: PendingFile) => {
    if (!pending.consentConfirmed) {
      setStatuses(s => ({
        ...s,
        [pending.id]: { id: pending.id, state: 'error', message: 'Confirm sharing consent before submitting.' },
      }));
      return;
    }

    setStatuses(s => ({ ...s, [pending.id]: { id: pending.id, state: 'uploading' } }));

    try {
      const ext = pending.file.name.split('.').pop();
      const path = `gallery/pending/${pending.id}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('gallery')
        .upload(path, pending.file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from('gallery_photos').insert({
        storage_path: path,
        caption: pending.caption.trim() || null,
        event_tag: pending.eventTag,
        uploaded_by: adminId,
        status: 'pending',
      });

      if (insertError) throw insertError;

      setStatuses(s => ({ ...s, [pending.id]: { id: pending.id, state: 'done' } }));
    } catch (err: unknown) {
      setStatuses(s => ({
        ...s,
        [pending.id]: {
          id: pending.id,
          state: 'error',
          message: getErrorMessage(err) || 'Upload failed. Try again.',
        },
      }));
    }
  };

  const submitAll = async () => {
    const ready = pendingFiles.filter(p => statuses[p.id]?.state !== 'done');
    await Promise.all(ready.map(submitFile));
  };

  const allSubmitted = pendingFiles.length > 0 && pendingFiles.every(p => statuses[p.id]?.state === 'done');

  return (
    <div className="max-w-3xl mx-auto">
      {/* Tab Selector */}
      <div className="flex gap-4 mb-6 border-b border-stone-200 pb-2">
        <button
          onClick={() => setUploadMode('photo')}
          className={`pb-2 px-1 font-bold text-sm border-b-2 transition-all ${
            uploadMode === 'photo' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-stone-500 hover:text-stone-700'
          }`}
        >
          Upload Photos
        </button>
        <button
          onClick={() => setUploadMode('youtube')}
          className={`pb-2 px-1 font-bold text-sm border-b-2 transition-all ${
            uploadMode === 'youtube' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-stone-500 hover:text-stone-700'
          }`}
        >
          Add YouTube Video/Playlist
        </button>
      </div>

      {uploadMode === 'photo' ? (
        <>
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-stone-800">Add photos to the gallery</h2>
            <p className="text-sm text-stone-500 mt-1">
              Photos are sent for review and won&rsquo;t appear on the public site until approved.
            </p>
          </div>

          {/* Dropzone */}
          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              flex flex-col items-center justify-center gap-2 px-6 py-12 rounded-2xl border-2 border-dashed
              cursor-pointer transition-colors
              ${isDragging ? 'border-emerald-500 bg-emerald-50' : 'border-stone-300 bg-stone-50 hover:bg-stone-100'}
            `}
          >
            <svg className="w-8 h-8 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 7.5h-.75A2.25 2.25 0 0 0 4.5 9.75v7.5a2.25 2.25 0 0 0 2.25 2.25h7.5a2.25 2.25 0 0 0 2.25-2.25v-7.5a2.25 2.25 0 0 0-2.25-2.25h-.75m-6-3 3-3 3 3m-3-3v11.25" />
            </svg>
            <p className="text-sm text-stone-600">
              <span className="font-medium text-emerald-700">Click to upload</span> or drag photos here
            </p>
            <p className="text-xs text-stone-400">PNG, JPG up to 10MB each</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={e => addFiles(e.target.files)}
            />
          </div>

          {/* File list */}
          {pendingFiles.length > 0 && (
            <div className="mt-6 flex flex-col gap-4">
              {pendingFiles.map(pending => {
                const status = statuses[pending.id];
                return (
                  <div
                    key={pending.id}
                    className="flex gap-4 p-4 rounded-xl border border-stone-200 bg-white"
                  >
                    <Image
                      src={pending.previewUrl}
                      alt={pending.file.name}
                      width={80}
                      height={80}
                      unoptimized
                      className="w-20 h-20 rounded-lg object-cover shrink-0"
                    />

                    <div className="flex-1 flex flex-col gap-2 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-stone-700 truncate">{pending.file.name}</p>
                        {status?.state !== 'done' && (
                          <button
                            onClick={() => removeFile(pending.id)}
                            className="text-stone-400 hover:text-red-500 text-xs shrink-0"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <select
                        value={pending.eventTag}
                        onChange={e => updateField(pending.id, 'eventTag', e.target.value)}
                        disabled={status?.state === 'uploading' || status?.state === 'done'}
                        className="text-sm px-2 py-1.5 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-50"
                      >
                        {EVENT_TAGS.map(tag => (
                          <option key={tag} value={tag}>{tag}</option>
                        ))}
                      </select>

                      <input
                        type="text"
                        value={pending.caption}
                        onChange={e => updateField(pending.id, 'caption', e.target.value)}
                        placeholder="Caption (optional)"
                        disabled={status?.state === 'uploading' || status?.state === 'done'}
                        className="text-sm px-2 py-1.5 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-50"
                      />

                      <label className="flex items-center gap-2 text-xs text-stone-500 mt-1">
                        <input
                          type="checkbox"
                          checked={pending.consentConfirmed}
                          onChange={e => updateField(pending.id, 'consentConfirmed', e.target.checked)}
                          disabled={status?.state === 'uploading' || status?.state === 'done'}
                          className="rounded border-stone-300"
                        />
                        I confirm this photo is approved for public sharing
                      </label>

                      {status?.state === 'error' && (
                        <p className="text-xs text-red-600">{status.message}</p>
                      )}
                      {status?.state === 'uploading' && (
                        <p className="text-xs text-amber-600">Uploading\u2026</p>
                      )}
                      {status?.state === 'done' && (
                        <p className="text-xs text-emerald-600">Sent for review</p>
                      )}
                    </div>
                  </div>
                );
              })}

              {!allSubmitted && (
                <button
                  onClick={submitAll}
                  className="self-start px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white text-sm font-medium transition-all"
                >
                  Submit for review
                </button>
              )}
              {allSubmitted && (
                <p className="text-sm text-emerald-700 bg-emerald-50 rounded-xl px-4 py-3">
                  All photos sent. A Super Admin will review them before they go live.
                </p>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-stone-800">Add YouTube Video or Playlist</h2>
            <p className="text-sm text-stone-500 mt-1">
              Add embedded YouTube content that will be featured in the community gallery once approved.
            </p>
          </div>

          <form onSubmit={submitYoutube} className="bg-white border border-stone-200 rounded-2xl p-6 flex flex-col gap-4 shadow-sm">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">YouTube URL</label>
              <input
                type="text"
                required
                placeholder="e.g., https://www.youtube.com/watch?v=... or https://youtube.com/playlist?list=..."
                value={youtubeUrl}
                onChange={e => setYoutubeUrl(e.target.value)}
                className="text-sm px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Event Tag</label>
              <select
                value={youtubeTag}
                onChange={e => setYoutubeTag(e.target.value)}
                className="text-sm px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
              >
                {EVENT_TAGS.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Caption (Optional)</label>
              <input
                type="text"
                placeholder="Enter a description..."
                value={youtubeCaption}
                onChange={e => setYoutubeCaption(e.target.value)}
                className="text-sm px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
              />
            </div>

            <label className="flex items-center gap-2.5 text-xs text-stone-600 mt-2 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={youtubeConsent}
                onChange={e => setYoutubeConsent(e.target.checked)}
                className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-400"
              />
              I confirm this video is approved for public sharing
            </label>

            {youtubeStatus?.state === 'error' && (
              <p className="text-xs text-red-600 font-bold m-0">{youtubeStatus.message}</p>
            )}
            {youtubeStatus?.state === 'done' && (
              <p className="text-xs text-emerald-600 font-bold m-0">Video added successfully and sent for review!</p>
            )}

            <button
              type="submit"
              disabled={youtubeStatus?.state === 'uploading'}
              className="self-start px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white text-sm font-bold transition-all disabled:opacity-50 mt-2 shadow-md shadow-emerald-600/10"
            >
              {youtubeStatus?.state === 'uploading' ? 'Submitting...' : 'Submit Video'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
