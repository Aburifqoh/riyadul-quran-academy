import { MetadataRoute } from 'next';
import { getCommunityPosts } from '@/lib/db';

export const dynamic = 'force-static';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://ilmvers.com';
  const lastModified = new Date();

  let posts: Awaited<ReturnType<typeof getCommunityPosts>> = [];
  try {
    posts = await getCommunityPosts();
  } catch {
    posts = [];
  }

  const postEntries: MetadataRoute.Sitemap = posts
    .filter((post) => post && post.id)
    .map((post) => ({
      url: `${baseUrl}/community/${post.id}`,
      lastModified: post.date ? new Date(post.date) : lastModified,
      changeFrequency: 'yearly',
      priority: 0.6,
    }));

  return [
    // Core — Highest priority
    { url: baseUrl, lastModified, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${baseUrl}/programs`, lastModified, changeFrequency: 'monthly', priority: 0.95 },
    { url: `${baseUrl}/programs/quran-tajweed`, lastModified, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${baseUrl}/programs/islamic-studies`, lastModified, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${baseUrl}/programs/hifz`, lastModified, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${baseUrl}/programs/arabic`, lastModified, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${baseUrl}/programs/children`, lastModified, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${baseUrl}/programs/advanced`, lastModified, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${baseUrl}/pricing`, lastModified, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${baseUrl}/admissions`, lastModified, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${baseUrl}/teachers`, lastModified, changeFrequency: 'monthly', priority: 0.85 },
    // Informational
    { url: `${baseUrl}/about`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/methodology`, lastModified, changeFrequency: 'monthly', priority: 0.75 },
    { url: `${baseUrl}/community`, lastModified, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/blog`, lastModified, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/faq`, lastModified, changeFrequency: 'monthly', priority: 0.65 },
    { url: `${baseUrl}/contact`, lastModified, changeFrequency: 'yearly', priority: 0.6 },
    { url: `${baseUrl}/privacy`, lastModified, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${baseUrl}/terms`, lastModified, changeFrequency: 'yearly', priority: 0.4 },
    // CTA pages
    { url: `${baseUrl}/register`, lastModified, changeFrequency: 'yearly', priority: 0.75 },
    { url: `${baseUrl}/login`, lastModified, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${baseUrl}/assessment`, lastModified, changeFrequency: 'yearly', priority: 0.6 },
    ...postEntries,
  ];
}
