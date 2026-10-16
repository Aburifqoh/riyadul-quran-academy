'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { motion, useInView, Variants } from 'framer-motion';
import { getSiteMetrics, getCommunityPosts } from '@/lib/db';
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
  const [metrics, setMetrics] = useState({
    hoursTaught: 0,
    countriesReached: 0,
    numStudents: 0,
    numInstructors: 0,
    qiraaatStudents: 0,
    yearsOperation: 0
  });
  const [posts, setPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  useEffect(() => {
    // Fetch metrics
    async function loadMetrics() {
      const data = await getSiteMetrics();
      if (data) {
        setMetrics({
          hoursTaught: data.hoursTaught || 8900,
          countriesReached: data.countriesReached || 20,
          numStudents: data.numStudents || 200,
          numInstructors: data.numInstructors || 20,
          qiraaatStudents: data.qiraaatStudents || 20,
          yearsOperation: data.yearsOperation || 5
        });
      }
    }
    
    // Fetch posts
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

    loadMetrics();
    loadPosts();
  }, []);

  return (
    <main className="bg-bg-neutral min-h-screen">
      {/* HERO SECTION */}
      <section className="relative pt-24 pb-32 bg-secondary text-white text-center overflow-hidden">
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
            Explore deep insights on Tajweed methodology, Islamic pedagogy, and institutional metrics driving our student success.
          </motion.p>
          
          <motion.div 
            variants={STAGGER}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8"
          >
            <MetricCard label="Hours Taught Cumulative" value={metrics.hoursTaught} />
            <MetricCard label="Registered Students" value={metrics.numStudents} />
            <MetricCard label="Nations Reached" value={metrics.countriesReached} />
            <MetricCard label="Specialized Instructors" value={metrics.numInstructors} />
            <MetricCard label="Qira'aat Specialized" value={metrics.qiraaatStudents} />
            <MetricCard label="Institutional Longevity" value={metrics.yearsOperation} suffix="+" />
          </motion.div>
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
                Explore moments from our classes, graduations, and community events in our official visual gallery.
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
            <h2 className="text-4xl font-headers font-bold text-secondary mb-4">More Than Just Classes</h2>
            <p className="text-text-body text-lg">
              Registering for Ilmvers grants access to interactive joint activities scaling across our vibrant global student body.
            </p>
          </div>

          <motion.div 
            variants={STAGGER}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-8"
          >
            {/* Feature 1 */}
            <motion.div variants={FADE_UP} className="bg-bg-neutral rounded-3xl p-10 border border-border-subtle hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                <Video className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-secondary mb-4">Monthly Guest Lectures</h3>
              <p className="text-text-body mb-6 leading-relaxed">
                Exclusive access to Zoom webinars discussing profound topics from the Qur'an and Seerah, open to all registered families.
              </p>
              <span className="inline-block px-4 py-2 rounded-lg text-xs font-bold bg-white text-secondary border border-border-subtle shadow-sm">
                Next: The Ethics of Seeking Knowledge (June 20)
              </span>
            </motion.div>

            {/* Feature 2 */}
            <motion.div variants={FADE_UP} className="bg-bg-neutral rounded-3xl p-10 border border-border-subtle hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                <Calendar className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-secondary mb-4">Quiz Competitions</h3>
              <p className="text-text-body mb-6 leading-relaxed">
                Interactive, age-appropriate Kahoot-style quizzes that test Islamic knowledge, featuring live leaderboards for fun and motivation.
              </p>
              <span className="inline-block px-4 py-2 rounded-lg text-xs font-bold bg-white text-secondary border border-border-subtle shadow-sm">
                Next: Prophets in the Qur'an (July 5)
              </span>
            </motion.div>

            {/* Feature 3 */}
            <motion.div variants={FADE_UP} className="bg-white rounded-3xl p-10 border-2 border-primary shadow-lg relative overflow-hidden">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 relative z-10">
                <Award className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-secondary mb-4 relative z-10">Student Recognition</h3>
              <p className="text-text-body mb-8 leading-relaxed relative z-10">
                Our digital Wall of Excellence honors students who complete a Juz, achieve perfect attendance, or demonstrate incredible dedication.
              </p>
              <Link 
                href="/register" 
                className={cn(buttonVariants(), "w-full rounded-xl py-6 relative z-10 shadow-md")}
              >
                Enroll to Access
              </Link>
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-primary/5 rounded-full pointer-events-none" />
            </motion.div>
          </motion.div>
        </div>
      </section>

      <div className="h-24"></div> {/* WhatsApp bubble overlap prevention */}
    </main>
  );
}

function MetricCard({ label, value, suffix = "" }: { label: string, value: number, suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const formatter = new Intl.NumberFormat('en-US');

  useEffect(() => {
    if (!isInView || value === 0) return;
    
    const duration = 1500;
    const start = performance.now();
    let frameId: number;

    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.floor(eased * value));
      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      } else {
        setDisplayValue(value);
      }
    };
    
    frameId = requestAnimationFrame(step);
    
    return () => cancelAnimationFrame(frameId);
  }, [value, isInView]);

  return (
    <motion.div 
      ref={ref}
      variants={FADE_UP}
      className="bg-white/10 backdrop-blur-md rounded-2xl p-6 md:p-8 border border-white/20 hover:bg-white/20 transition-colors shadow-lg relative group overflow-hidden"
    >
      <div className="absolute inset-0 bg-primary/40 blur-[50px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
      <h2 className="text-4xl md:text-5xl font-headers font-bold text-primary mb-2 drop-shadow-md relative z-10 group-hover:scale-110 transition-transform duration-500 origin-center">
        {value > 0 ? formatter.format(displayValue) + suffix : "0"}
      </h2>
      <p className="text-white/90 font-bold text-xs md:text-sm tracking-widest uppercase relative z-10">{label}</p>
    </motion.div>
  );
}
