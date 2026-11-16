'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, Variants } from 'framer-motion';
import { getCommunityPosts } from '@/lib/db';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { Calendar, Video, Award, ArrowRight, UserCircle, MessageCircle, PlayCircle, BookOpen } from 'lucide-react';

const FADE_UP: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
};

const STAGGER: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
};

export default function CommunityPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  useEffect(() => {
    async function loadPosts() {
      try {
        const fetchedPosts = await getCommunityPosts();
        setPosts(fetchedPosts || []);
      } catch (e) {
        console.error("Posts load failed:", e);
      } finally {
        setLoadingPosts(false);
      }
    }

    loadPosts();
  }, []);

  return (
    <main className="bg-bg-neutral min-h-screen">
      {/* HERO SECTION */}
      <section className="relative pt-16 pb-32 bg-secondary text-white text-center overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="w-full max-w-6xl mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white text-sm font-semibold mb-6 tracking-widest uppercase"
          >
            Knowledge Base
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-6xl font-headers font-bold mb-6"
          >
            The Ilmvers Community
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-white/80 max-w-3xl mx-auto leading-relaxed mb-16"
          >
            Explore writing from the academy, class moments, and the community gallery.
          </motion.p>
        </div>
      </section>

      {/* GALLERY CALL TO ACTION */}
      <section className="py-12 bg-white">
        <div className="w-full max-w-5xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl p-8 md:p-12 border border-emerald-100 flex flex-col md:flex-row items-center justify-between gap-8 shadow-sm"
          >
            <div>
              <h2 className="text-3xl md:text-4xl font-headers font-bold text-emerald-900 mb-3">
                Experience the Journey
              </h2>
              <p className="text-emerald-700 text-lg max-w-lg">
                Photos from classes are added here when the academy has them.
              </p>
            </div>
            <Link 
              href="/community/gallery"
              className={cn(buttonVariants({ variant: 'default', size: 'lg' }), "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg transition-all rounded-full px-8 shrink-0")}
            >
              View Photo Gallery
            </Link>
          </motion.div>
        </div>
      </section>

      {/* DYNAMIC CMS POSTS */}
      <section className="py-24 bg-bg-neutral">
        <div className="w-full max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-headers font-bold text-secondary mb-4">Latest Writeups</h2>
            <p className="text-text-body text-lg">Insights from our scholars and academic team.</p>
          </div>

          {loadingPosts ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center bg-white p-12 rounded-3xl border border-border-subtle shadow-sm">
              <p className="text-text-body text-lg">No publications yet. Check back soon!</p>
            </div>
          ) : (
            <motion.div 
              variants={STAGGER}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {posts.map(post => {
                const author = post.author || "Ilmvers Admin";
                const coverImageUrl = post.coverImageUrl || post.coverImage || '/assets/images/logo.jpeg';
                const rawHtml = post.body || post.content || '';
                const plainText = rawHtml.replace(/<[^>]*>?/gm, '');
                const snippet = plainText.length > 120 ? plainText.substring(0, 120) + '...' : plainText;

                return (
                  <motion.div variants={FADE_UP} key={post.id} className="h-full">
                    <Link 
                      href={`/blog?post=${post.id}`} 
                      className="bg-white rounded-3xl shadow-md border border-border-subtle overflow-hidden flex flex-col h-full hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group"
                    >
                      <div className="h-56 w-full relative overflow-hidden bg-bg-neutral">
                        <img 
                          src={coverImageUrl} 
                          alt={post.title} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                        />
                        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-secondary uppercase tracking-wider">
                          {post.category || 'Insights'}
                        </div>
                      </div>
                      
                      <div className="p-8 flex-1 flex flex-col">
                        <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-3">
                          Published {new Date(post.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <h3 className="text-xl font-bold text-secondary mb-4 leading-tight group-hover:text-primary transition-colors">
                          {post.title}
                        </h3>
                        <p className="text-sm text-text-body mb-6 flex-1">
                          {snippet}
                        </p>
                        
                        <div className="flex justify-between items-center border-t border-border-subtle pt-5 mt-auto">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-secondary text-xs">
                              {author.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm text-secondary font-semibold">{author}</span>
                          </div>
                          <span className="text-primary group-hover:translate-x-1 transition-transform">
                            <ArrowRight className="w-5 h-5" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-24 bg-white border-t border-border-subtle">
        <div className="w-full max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-4xl font-headers font-bold text-secondary mb-4">Alongside your classes</h2>
            <p className="text-[#5A6E6C] text-lg">
              Extra circles are arranged with enrolled families. They are not separate priced courses, and dates are confirmed when a circle is actually scheduled.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-[#FAF9F6] rounded-3xl p-10 border border-[#E2E9E7]">
              <div className="w-14 h-14 rounded-2xl bg-[#004D4A]/10 flex items-center justify-center mb-6">
                <Video className="w-7 h-7 text-[#004D4A]" />
              </div>
              <h3 className="text-2xl font-bold text-[#0F3D38] mb-4">Weekend circles</h3>
              <p className="text-[#5A6E6C] mb-6 leading-relaxed">
                Halaqah, Qur&apos;an review, adab, and a children&apos;s club. Your teacher confirms which circle you join.
              </p>
              <Link href="/programs#enrichment" className="text-sm font-semibold text-[#004D4A] underline">See the circles</Link>
            </div>

            <div className="bg-[#FAF9F6] rounded-3xl p-10 border border-[#E2E9E7]">
              <div className="w-14 h-14 rounded-2xl bg-[#004D4A]/10 flex items-center justify-center mb-6">
                <Calendar className="w-7 h-7 text-[#004D4A]" />
              </div>
              <h3 className="text-2xl font-bold text-[#0F3D38] mb-4">Class moments</h3>
              <p className="text-[#5A6E6C] mb-6 leading-relaxed">
                Photos are added when the academy has them. The gallery stays empty until there is something real to show.
              </p>
              <Link href="/community/gallery" className="text-sm font-semibold text-[#004D4A] underline">Open the gallery</Link>
            </div>

            <div className="bg-white rounded-3xl p-10 border-2 border-[#004D4A] shadow-lg">
              <div className="w-14 h-14 rounded-2xl bg-[#004D4A]/10 flex items-center justify-center mb-6">
                <Award className="w-7 h-7 text-[#004D4A]" />
              </div>
              <h3 className="text-2xl font-bold text-[#0F3D38] mb-4">Start with enrolment</h3>
              <p className="text-[#5A6E6C] mb-8 leading-relaxed">
                The free assessment places you. Community activities follow from there.
              </p>
              <Link href="/admissions" className={cn(buttonVariants(), "w-full rounded-xl py-6")}>
                Book the assessment
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="h-24"></div> {/* WhatsApp bubble overlap prevention */}
    </main>
  );
}
