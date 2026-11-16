export default function cloudflareImageLoader({
  src,
  width,
  quality,
}: {
  src: string
  width: number
  quality?: number
}) {
  // Files in /public are already on this site. Serving them directly avoids
  // the image proxy, which cannot resolve ilmversinstitute.com.
  if (src.startsWith('/') || src.startsWith('data:')) {
    const [path, query = ''] = src.split('?')
    const encoded = encodeURI(path)
    const params = new URLSearchParams(query)
    params.set('w', String(width))
    if (quality) params.set('q', String(quality))
    return `${encoded}?${params.toString()}`
  }

  return `https://wsrv.nl/?url=${encodeURIComponent(src)}&w=${width}&q=${quality || 85}&output=webp`
}
