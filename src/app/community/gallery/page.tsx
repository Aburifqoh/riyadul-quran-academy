'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface ApprovedPhoto {
  id: string;
  storage_path: string;
  caption: string | null;
  event_tag: string;
  created_at: string;
}

function isYoutubeUrl(path: string) {
  return path && path.startsWith('http') && (path.includes('youtube.com') || path.includes('youtu.be'));
}

function getYoutubeThumbnailUrl(url: string) {
  if (!url) return '';
  if (url.includes('list=')) {
    return 'https://images.unsplash.com/photo-1516280440614-37939bbacd6a?auto=format&fit=crop&w=600&q=80';
  }
  const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
  if (match) {
    return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
  }
  return '';
}

function getYoutubeEmbedUrl(url: string) {
  if (!url) return '';
  let match = url.match(/[&?]list=([^&]+)/);
  if (match) {
    return `https://www.youtube.com/embed/videoseries?list=${match[1]}&autoplay=1`;
  }
  match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
  if (match) {
    return `https://www.youtube.com/embed/${match[1]}?autoplay=1`;
  }
  return '';
}

export default function GalleryPage() {
  const [photos, setPhotos] = useState<ApprovedPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxItem, setLightboxItem] = useState<ApprovedPhoto | null>(null);

  useEffect(() => {
    async function loadPhotos() {
      const { data } = await supabase
        .from('gallery_photos')
        .select('id, storage_path, caption, event_tag, created_at')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (data) {
        setPhotos(data);
      }
      setLoading(false);
    }
    loadPhotos();
  }, []);

  const groupByEvent = (items: ApprovedPhoto[]) => {
    const groups: Record<string, ApprovedPhoto[]> = {};
    for (const item of items) {
      if (!groups[item.event_tag]) groups[item.event_tag] = [];
      groups[item.event_tag].push(item);
    }
    return groups;
  };

  const grouped = groupByEvent(photos);
  const eventNames = Object.keys(grouped);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-stone-200 border-t-emerald-600 rounded-full animate-spin"></div>
        <p className="text-stone-500 text-sm mt-4 font-medium">Loading Gallery...</p>
      </div>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      <div className="mb-10">
        <h1 className="text-2xl sm:text-3xl font-semibold text-stone-800">Gallery</h1>
        <p className="text-stone-500 mt-2">
          Moments from our classes, ceremonies, and community.
        </p>
      </div>

      {eventNames.length === 0 ? (
        <div className="text-center py-20 rounded-2xl border border-stone-200 bg-stone-50">
          <p className="text-stone-500 text-sm">No items have been approved yet. Check back soon.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-12">
          {eventNames.map(eventName => (
            <section key={eventName}>
              <h2 className="text-sm font-medium text-emerald-700 uppercase tracking-wide mb-4">
                {eventName}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {grouped[eventName].map(photo => {
                  const isYt = isYoutubeUrl(photo.storage_path);
                  const url = isYt 
                    ? getYoutubeThumbnailUrl(photo.storage_path)
                    : supabase.storage.from('gallery').getPublicUrl(photo.storage_path).data.publicUrl;
                  
                  return (
                    <figure
                      key={photo.id}
                      onClick={() => setLightboxItem(photo)}
                      className="group relative rounded-2xl overflow-hidden bg-stone-100 aspect-square cursor-pointer shadow-sm hover:shadow-md transition-all border border-stone-200/50"
                    >
                      <img
                        src={url}
                        alt={photo.caption || eventName}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      
                      {isYt && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                          <div className="w-12 h-12 bg-white/95 text-stone-900 rounded-full flex items-center justify-center shadow-lg transition-transform group-hover:scale-110">
                            <svg className="w-5 h-5 ml-0.5 fill-current text-emerald-600" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z"/>
                            </svg>
                          </div>
                        </div>
                      )}

                      {photo.caption && (
                        <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white text-xs px-4 py-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          {photo.caption}
                        </figcaption>
                      )}
                    </figure>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxItem && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center p-4">
          <button 
            onClick={() => setLightboxItem(null)} 
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors p-2 bg-stone-900/60 rounded-full"
          >
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div className="max-w-4xl w-full max-h-[80vh] flex items-center justify-center">
            {isYoutubeUrl(lightboxItem.storage_path) ? (
              <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-stone-800">
                <iframe
                  src={getYoutubeEmbedUrl(lightboxItem.storage_path)}
                  title={lightboxItem.caption || 'YouTube Video'}
                  className="w-full h-full border-none"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              </div>
            ) : (
              <img
                src={supabase.storage.from('gallery').getPublicUrl(lightboxItem.storage_path).data.publicUrl}
                alt={lightboxItem.caption || 'Gallery Image'}
                className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-stone-800/40"
              />
            )}
          </div>

          {(lightboxItem.caption || lightboxItem.event_tag) && (
            <div className="mt-6 text-center max-w-2xl px-4">
              <span className="inline-block text-[10px] font-black tracking-widest uppercase text-emerald-400 bg-emerald-950/60 px-3.5 py-1.5 rounded-full border border-emerald-800/40">
                {lightboxItem.event_tag}
              </span>
              {lightboxItem.caption && (
                <p className="text-stone-300 text-sm mt-3.5 leading-relaxed font-medium">
                  {lightboxItem.caption}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
