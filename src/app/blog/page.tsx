'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getCommunityPosts, getPostById } from '@/lib/db';

function BlogContent() {
  const searchParams = useSearchParams();
  const postId = searchParams?.get('post');

  const [posts, setPosts] = useState<any[]>([]);
  const [activePost, setActivePost] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (postId) {
        // Load single post
        const fetchedPost = await getPostById(postId);
        if (fetchedPost) {
          setActivePost(fetchedPost);
        }
      } else {
        // Load all posts
        const fetchedPosts = await getCommunityPosts();
        setPosts(fetchedPosts);
      }
      setLoading(false);
    }
    loadData();
  }, [postId]);

  if (loading) {
    return (
      <main className="py-16 w-full max-w-[1200px] mx-auto px-8 min-h-[70vh] pt-0 flex flex-col justify-center items-center">
        <div className="inline-block w-12 h-12 border-4 border-[var(--color-primary)]/20 border-l-[var(--color-primary)] rounded-full animate-spin"></div>
        <p className="mt-6 text-gray-500">Loading publication...</p>
      </main>
    );
  }

  // --- SINGLE POST VIEW ---
  if (postId && activePost) {
    const coverImageUrl = activePost.coverImageUrl || activePost.coverImage;
    return (
      <>
        <main className="py-16 w-full max-w-[1200px] mx-auto px-8 min-h-[70vh] pt-0">
          <div className="max-w-[900px] mx-auto">
            <div className="py-16 text-center">
              <Link href="/blog" className="text-[var(--color-primary)] font-bold inline-flex items-center gap-2 mb-6 text-sm hover:underline">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                Back to Journal
              </Link>
              <div className="mb-4">
                <span className="bg-amber-50 text-[var(--color-primary)] text-sm font-bold px-4 py-1.5 rounded-full border border-[var(--color-primary)]/10">
                  {activePost.category || 'General'}
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-headers font-bold text-gray-900 mb-6 leading-tight">
                {activePost.title}
              </h1>
              <div className="text-gray-500 flex items-center justify-center gap-4 text-sm">
                <span className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  <strong className="text-gray-900">{activePost.author || "Ilmvers Admin"}</strong>
                </span>
                <span className="text-gray-300">|</span>
                <span className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  {activePost.date ? new Date(activePost.date).toLocaleDateString(undefined, {month:'long', day:'numeric', year:'numeric'}) : ''}
                </span>
              </div>
            </div>

            {coverImageUrl && (
              <img 
                src={coverImageUrl} 
                alt={activePost.title} 
                className="w-full h-[400px] object-cover rounded-2xl shadow-lg mb-10"
              />
            )}

            <div 
              className="max-w-[800px] mx-auto bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-gray-100 text-lg text-gray-700 leading-relaxed prose prose-amber prose-headings:font-headers prose-headings:font-bold prose-headings:text-gray-900 prose-img:rounded-xl prose-a:text-[var(--color-primary)] max-w-none"
              dangerouslySetInnerHTML={{ __html: activePost.body || activePost.content || '' }}
            />
          </div>
        </main>

        <section className="py-16 bg-gray-900 text-center py-20 text-white mt-10">
          <div className="w-full max-w-[1200px] mx-auto px-8">
            <h2 className="mb-4 text-3xl font-bold">Want to learn more?</h2>
            <p className="mb-8 text-gray-400">Enroll now to join our live webinars, group quizzes, and vibrant Islamic community.</p>
            <Link href="/register" className="bg-white text-gray-900 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-colors inline-block">
              Join the Institution
            </Link>
          </div>
        </section>
      </>
    );
  }

  // --- BLOG INDEX VIEW ---
  return (
    <>
      <header className="py-16 bg-[#FDF8F3] opacity-0 translate-y-5 transition-all duration-700">
        <div className="w-full max-w-[1200px] mx-auto px-8 text-center">
          <h1 className="mb-4 text-4xl md:text-5xl font-headers font-bold text-gray-900">The Ilmvers Journal</h1>
          <p className="mb-8 text-[#5C5148] text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
            Educational insights, structural methodology, and spiritual reflections on the student journey.
          </p>
        </div>
      </header>

      <section className="py-16 opacity-0 translate-y-5 transition-all duration-700 py-16">
        <div className="w-full max-w-[1200px] mx-auto px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" id="postsContainer">
            {posts.length === 0 ? (
              <p className="text-center text-[#5C5148] col-span-full">No journal articles available yet. Check back soon!</p>
            ) : (
              posts.map((p) => {
                const bodyContent = p.body || p.content || '';
                const author = p.author || "Ilmvers Journal";
                const coverImageUrl = p.coverImageUrl || p.coverImage || '/assets/images/logo.jpeg';
                
                // Extract plain text snippet
                const plainText = bodyContent.replace(/<[^>]*>?/gm, '');
                const snippet = plainText.length > 120 ? plainText.substring(0, 120) + '...' : plainText;

                return (
                  <article key={p.id} className="bg-white rounded-2xl p-8 shadow-md border border-white/80 relative overflow-hidden transition-all duration-300 transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1 relative transition-all duration-300 hover:shadow-[0_15px_35px_rgba(93,46,23,0.15)] hover:-translate-y-1 flex flex-col bg-white overflow-hidden p-0 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="h-48 flex items-center justify-center overflow-hidden bg-gray-50">
                      <img 
                        src={coverImageUrl} 
                        alt="Cover image" 
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                      />
                    </div>
                    <div className="p-6 flex-1 flex flex-col">
                      <div className="text-xs text-[var(--color-primary)] font-bold mb-2 uppercase tracking-wider">
                        {p.category || 'Article'}
                      </div>
                      <h3 className="text-xl font-bold mb-3 text-gray-900 leading-tight">{p.title}</h3>
                      <p className="text-sm text-gray-600 mb-6 flex-1 line-clamp-3">
                        {snippet}
                      </p>
                      <div className="flex justify-between items-center border-t border-gray-100 pt-4 mt-auto">
                        <span className="text-xs text-gray-500 text-gray-900">By <strong >{author}</strong></span>
                        <Link href={`/blog?post=${p.id}`} className="inline-flex items-center justify-center px-8 py-3.5 rounded-full font-semibold text-[#5D2E17] border-2 border-[#5D2E17] hover:bg-[#5D2E17] hover:text-white hover:-translate-y-1 transition-all duration-300 cursor-pointer bg-transparent px-4 py-2 text-xs font-bold bg-gray-50 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                          Read
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>
      </section>

      <section className="py-16 bg-[#5D2E17] text-white opacity-0 translate-y-5 transition-all duration-700 text-center py-20 bg-gray-900 text-white">
        <div className="w-full max-w-[1200px] mx-auto px-8 max-w-2xl mx-auto">
          <h2 className="mb-4 text-3xl font-bold">Never Miss an Insight</h2>
          <p className="mb-8 text-gray-400">Subscribe to the Ilmvers Journal digest. Sent once a month.</p>
          <form 
            onSubmit={(e) => { e.preventDefault(); alert('Subscribed to Journal!'); }} 
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <input 
              type="email" 
              name="email" 
              className="px-6 py-4 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] flex-1 min-w-[250px]" 
              placeholder="Your Email Address" 
              required 
            />
            <button 
              type="submit" 
              className="bg-[var(--color-primary)] text-white px-8 py-4 rounded-xl font-bold hover:bg-[var(--color-primary-dark)] transition-colors whitespace-nowrap"
            >
              SUBSCRIBE NOW
            </button>
          </form>
        </div>
      </section>
    </>
  );
}

export default function BlogList() {
  return (
    <Suspense fallback={
      <main className="py-16 w-full max-w-[1200px] mx-auto px-8 min-h-[70vh] pt-0 flex flex-col justify-center items-center">
        <div className="inline-block w-12 h-12 border-4 border-[var(--color-primary)]/20 border-l-[var(--color-primary)] rounded-full animate-spin"></div>
        <p className="mt-6 text-gray-500">Loading journal...</p>
      </main>
    }>
      <BlogContent />
    </Suspense>
  );
}
