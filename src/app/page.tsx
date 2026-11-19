'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getLatestPosts } from '@/lib/db';
import { HeroSection } from '@/components/homepage/HeroSection';
import { Pathways } from '@/components/homepage/Pathways';
import { HowItWorks } from '@/components/homepage/HowItWorks';
import { PortalPreview } from '@/components/homepage/PortalPreview';
import { WhyChooseUs } from '@/components/homepage/WhyChooseUs';
import { motion } from 'framer-motion';
import { buttonVariants } from '@/components/ui/button';

export default function HomePage() {
  const [posts, setPosts] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const postsData = await getLatestPosts(3);
        setPosts(postsData);
      } catch (error) {
        console.error("Error fetching homepage data:", error);
      }
    };
    fetchData();
  }, []);

  return (
    <main className="bg-background">
      <HeroSection />
      <section className="bg-[#FAF9F6] pb-6">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p className="text-[#2E2E2E] text-lg leading-relaxed">
            Ilmvers Institute teaches Qur&apos;an, Tajweed, Hifz, Arabic, and Islamic studies in live classes. You enrol, meet a teacher, and follow a clear plan.
          </p>
        </div>
      </section>
      <Pathways />
      <WhyChooseUs />
      <section className="py-16 bg-[#FAF9F6] border-y border-[#E2E9E7]">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-[#D4AF37] mb-3">Our Scholars</p>
          <h2 className="text-3xl font-headers font-bold text-[#004D4A] mb-4">Taught by qualified instructors</h2>
          <p className="text-[#5A6E6C] mb-6">Faculty profiles are published when the institute confirms them. Sample cards stay editable in the admin portal and are not the live faculty list.</p>
          <Link href="/teachers" className="inline-flex rounded-full bg-[#004D4A] text-white px-6 py-3 text-sm font-semibold">Meet the scholars</Link>
        </div>
      </section>
      <HowItWorks />
      <PortalPreview />

      {posts.length > 0 && (
      <section className="py-20 bg-muted/30">
        <div className="w-full max-w-6xl mx-auto px-8">
          <div className="flex justify-between items-end mb-10 flex-wrap gap-5">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <span className="text-primary block font-bold uppercase tracking-widest text-sm mb-2">Academy Journal</span>
              <h2 className="text-3xl font-bold font-headers text-foreground m-0">Latest Institutional Updates</h2>
            </motion.div>
            <Link href="/blog" className={buttonVariants({ variant: "outline", className: "rounded-full border-2 border-secondary text-secondary hover:bg-secondary hover:text-white" })}>
              View All Writeups
            </Link>
          </div>
          
          <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post, idx) => {
                const dateStr = post.date ? new Date(post.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';
                return (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <Link href={`/blog?post=${post.id}`} className="block bg-card rounded-2xl shadow-sm border border-border overflow-hidden transition-all duration-300 hover:shadow-md hover:-translate-y-1 h-full flex flex-col">
                      <div className="h-48 overflow-hidden bg-muted relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={post.coverImageUrl || post.coverImage || '/assets/images/opt/logo-160.webp'} alt={post.title} width={160} height={160} className="w-full h-full object-cover" />
                      </div>
                      <div className="p-6 flex-1 flex flex-col">
                        <div className="text-xs text-primary font-bold uppercase mb-2">{post.category || 'Institutional'}</div>
                        <h4 className="text-secondary text-lg font-semibold mb-4">{post.title}</h4>
                        <div className="mt-auto text-sm text-muted-foreground flex justify-between items-center">
                          <span>{dateStr}</span>
                          <span className="font-bold text-primary">Read More &rarr;</span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
          </div>
        </div>
      </section>
      )}

      {/* FINAL CTA SECTION */}
      <section className="py-24 bg-secondary text-white text-center relative overflow-hidden">
        {/* Abstract shapes for premium feel */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary rounded-full filter blur-[100px]" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent rounded-full filter blur-[100px]" />
        </div>

        <motion.div 
          className="w-full max-w-6xl mx-auto px-8 relative z-10"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
        >
          <h2 className="mb-4 text-4xl sm:text-5xl font-bold font-headers">Begin Your Journey With Ilmvers Institute</h2>
          <p className="mb-10 text-lg opacity-90 max-w-2xl mx-auto font-sans">
            Start with a free assessment. Your level, teacher, and fee are confirmed with you before any payment.
          </p>
          <div className="flex gap-4 justify-center max-sm:flex-col">
            <Link href="/admissions" className={buttonVariants({ size: "lg", className: "rounded-full shadow-lg px-8 py-6 text-md bg-accent text-secondary hover:bg-accent/90 border-0 font-semibold" })}>
              Begin Your Journey
            </Link>
            <Link href="/register" className={buttonVariants({ variant: "outline", size: "lg", className: "rounded-full border-2 border-white text-white hover:bg-white hover:text-secondary px-8 py-6 text-md bg-transparent font-semibold" })}>
              Book Free Assessment
            </Link>
          </div>
        </motion.div>
      </section>

    </main>
  );
}
