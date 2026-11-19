'use client';


import { useState, useEffect } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

interface GalleryPhoto {
  id: string;
  storage_path: string;
  caption: string | null;
  event_tag: string;
  uploaded_by: string;
  uploader_name?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  publicUrl?: string;
}

function isYoutubeUrl(path: string) {
  return path && path.startsWith('http') && (path.includes('youtube.com') || path.includes('youtu.be'));
}

function getYoutubeEmbedUrl(url: string) {
  if (!url) return '';
  let match = url.match(/[&?]list=([^&]+)/);
  if (match) {
    return `https://www.youtube.com/embed/videoseries?list=${match[1]}`;
  }
  match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
  if (match) {
    return `https://www.youtube.com/embed/${match[1]}`;
  }
  return '';
}

export function GalleryReviewQueue({ superAdminId }: { superAdminId: string }) {
  const [photos, setPhotos] = useState<GalleryPhoto[] | null>(null);
  const loading = photos === null;
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('gallery_photos')
        .select('id, storage_path, caption, event_tag, uploaded_by, status, created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (cancelled) return;

      if (!error && data) {
        const withUrls = data.map(photo => {
          const isYt = isYoutubeUrl(photo.storage_path);
          return {
            ...photo,
            publicUrl: isYt ? photo.storage_path : supabase.storage.from('gallery').getPublicUrl(photo.storage_path).data.publicUrl,
          };
        });
        setPhotos(withUrls);
      } else {
        setPhotos([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const approve = async (id: string) => {
    setActioningId(id);
    const { error } = await supabase
      .from('gallery_photos')
      .update({
        status: 'approved',
        reviewed_by: superAdminId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (!error) {
      setPhotos(prev => (prev ?? []).filter(p => p.id !== id));
    }
    setActioningId(null);
  };

  const openReject = (id: string) => {
    setRejectingId(id);
    setRejectionReason('');
  };

  const confirmReject = async () => {
    if (!rejectingId) return;
    setActioningId(rejectingId);

    const { error } = await supabase
      .from('gallery_photos')
      .update({
        status: 'rejected',
        reviewed_by: superAdminId,
        reviewed_at: new Date().toISOString(),
        rejection_reason: rejectionReason.trim() || null,
      })
      .eq('id', rejectingId);

    if (!error) {
      setPhotos(prev => (prev ?? []).filter(p => p.id !== rejectingId));
    }
    setActioningId(null);
    setRejectingId(null);
    setRejectionReason('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-stone-400 text-sm">
        Loading pending photos\u2026
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 flex items-baseline justify-between">
        <div>
          <h2 className="text-lg font-semibold text-stone-800">Gallery review queue</h2>
          <p className="text-sm text-stone-500 mt-1">
            Photos here are not visible on the public site until you approve them.
          </p>
        </div>
        <span className="text-sm font-medium text-amber-700 bg-amber-50 px-3 py-1 rounded-full">
          {photos.length} pending
        </span>
      </div>

      {photos.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-stone-200 bg-stone-50">
          <p className="text-sm text-stone-500">Nothing waiting for review right now.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {photos.map(photo => (
            <div key={photo.id} className="rounded-2xl border border-stone-200 bg-white overflow-hidden flex flex-col">
              {isYoutubeUrl(photo.storage_path) ? (
                <div className="relative w-full h-48 bg-black">
                  <iframe
                    src={getYoutubeEmbedUrl(photo.storage_path)}
                    title={photo.caption || 'YouTube preview'}
                    className="w-full h-full border-none"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                </div>
              ) : (
                <Image
                  src={photo.publicUrl || ''}
                  alt={photo.caption || photo.event_tag}
                  width={400}
                  height={192}
                  className="w-full h-48 object-cover bg-stone-100"
                />
              )}
              <div className="p-4 flex flex-col gap-2 flex-1">
                <span className="text-xs font-medium text-emerald-700 bg-emerald-50 self-start px-2 py-0.5 rounded-full">
                  {photo.event_tag}
                </span>
                {photo.caption && (
                  <p className="text-sm text-stone-700">{photo.caption}</p>
                )}
                <p className="text-xs text-stone-400 mt-auto">
                  Submitted {new Date(photo.created_at).toLocaleDateString()}
                </p>

                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => approve(photo.id)}
                    disabled={actioningId === photo.id}
                    className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {actioningId === photo.id ? '\u2026' : 'Approve'}
                  </button>
                  <button
                    onClick={() => openReject(photo.id)}
                    disabled={actioningId === photo.id}
                    className="flex-1 py-2 rounded-lg border border-stone-300 hover:bg-stone-50 text-stone-700 text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rejection reason modal */}
      {rejectingId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-sm font-semibold text-stone-800 mb-1">Reject this photo</h3>
            <p className="text-xs text-stone-500 mb-3">
              Optional \u2014 let the uploader know why, so they can avoid it next time.
            </p>
            <textarea
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              rows={3}
              placeholder="e.g. Faces of minors not blurred, low resolution\u2026"
              className="w-full text-sm px-3 py-2 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={confirmReject}
                className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
              >
                Confirm reject
              </button>
              <button
                onClick={() => setRejectingId(null)}
                className="flex-1 py-2 rounded-lg border border-stone-300 hover:bg-stone-50 text-stone-700 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
