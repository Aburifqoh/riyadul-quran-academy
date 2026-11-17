type SizedImage = { width: number; url: string }

// Pre-built files. The loader used to append ?w= and still send the original.
const SIZED: Record<string, SizedImage[]> = {
  '/assets/images/logo.jpeg': [
    { width: 96, url: '/assets/images/opt/logo-96.webp' },
    { width: 160, url: '/assets/images/opt/logo-160.webp' },
  ],
  '/assets/images/logo dark.jpeg': [
    { width: 96, url: '/assets/images/opt/logo-dark-96.webp' },
    { width: 160, url: '/assets/images/opt/logo-dark-160.webp' },
  ],
  '/assets/images/hero-student.jpg': [
    { width: 410, url: '/assets/images/opt/hero-student.webp' },
  ],
}

function localPath(src: string) {
  const path = decodeURIComponent(src.split('?')[0] || src)
  return path.startsWith('/') ? path : `/${path}`
}

function sizedUrl(src: string, width: number) {
  const variants = SIZED[localPath(src)]
  if (!variants?.length) return null
  return (variants.find((item) => item.width >= width) || variants[variants.length - 1]).url
}

export default function cloudflareImageLoader({
  src,
  width,
  quality,
}: {
  src: string
  width: number
  quality?: number
}) {
  if (src.startsWith('/') || src.startsWith('data:')) {
    return sizedUrl(src, width) || encodeURI(localPath(src))
  }

  return `https://wsrv.nl/?url=${encodeURIComponent(src)}&w=${width}&q=${quality || 85}&output=webp`
}
