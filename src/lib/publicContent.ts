import { createClient } from '@supabase/supabase-js';
import type { CommunityPost, Testimonial } from '@/types/content';

function contentClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    '';
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function asPosts(data: unknown): CommunityPost[] {
  if (!Array.isArray(data)) return [];
  return data.filter((row): row is CommunityPost => {
    return Boolean(row && typeof row === 'object' && 'id' in row);
  });
}

export async function getLatestPosts(count = 3): Promise<CommunityPost[]> {
  try {
    const { data } = await contentClient()
      .from('community_posts')
      .select('*')
      .eq('status', 'published')
      .order('date', { ascending: false })
      .limit(count);
    return asPosts(data);
  } catch (error) {
    console.error('Error fetching posts:', error);
    return [];
  }
}

export async function getCommunityPosts(): Promise<CommunityPost[]> {
  try {
    const { data } = await contentClient()
      .from('community_posts')
      .select('*')
      .eq('status', 'published')
      .order('date', { ascending: false });
    return asPosts(data);
  } catch (error) {
    console.error('Error fetching community posts:', error);
    return [];
  }
}

export async function getPostById(id: string): Promise<CommunityPost | null> {
  try {
    const { data } = await contentClient()
      .from('community_posts')
      .select('*')
      .eq('id', id)
      .eq('status', 'published')
      .maybeSingle();
    if (!data || typeof data !== 'object' || !('id' in data)) return null;
    return data as CommunityPost;
  } catch (error) {
    console.error('Error fetching post by id:', error);
    return null;
  }
}

export async function getTestimonials(): Promise<Testimonial[]> {
  try {
    const { data } = await contentClient()
      .from('testimonials')
      .select('*')
      .eq('status', 'approved');
    return ((data || []) as Testimonial[]).filter(
      (t) => t.type === 'platform_testimonial' || !t.type
    );
  } catch (error) {
    console.error('Error fetching testimonials:', error);
    return [];
  }
}

export async function getSiteMetrics() {
  return {
    hoursTaught: 8900,
    countriesReached: 20,
    numStudents: 200,
    numInstructors: 20,
    qiraaatStudents: 20,
    yearsOperation: 5,
  };
}
