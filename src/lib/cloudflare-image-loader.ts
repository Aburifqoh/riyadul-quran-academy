export default function cloudflareImageLoader({
  src,
  width,
  quality,
}: {
  src: string
  width: number
  quality?: number
}) {
  const isLocal = src.startsWith('/')
  // For local files, we'll append the full domain
  const baseUrl = isLocal ? `https://ilmversinstitute.com${src}` : src

  // If running in development, return the original (avoid wsrv.nl loopbacks),
  // but still vary the URL by width -- Next.js's dev-mode Image component
  // checks that a custom loader's output actually changes with `width` to
  // detect loaders that silently ignore it; a bare, unvarying `src` here
  // trips that check on every render.
  if (process.env.NODE_ENV === 'development') {
    return `${src}${src.includes('?') ? '&' : '?'}w=${width}`;
  }

  // Use wsrv.nl (images.weserv.nl) for edge-based optimization
  // It automatically converts to WebP/AVIF and caches aggressively at the edge
  return `https://wsrv.nl/?url=${encodeURIComponent(baseUrl)}&w=${width}&q=${quality || 85}&output=webp&we`;
}
