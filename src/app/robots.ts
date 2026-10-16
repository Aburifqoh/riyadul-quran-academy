import { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/portal/', '/api/', '/payment/', '/verify/', '/admin/', '/teacher/', '/seed-teachers/', '/parent/'],
      },
    ],
    sitemap: 'https://ilmversinstitute.com/sitemap.xml',
  };
}
