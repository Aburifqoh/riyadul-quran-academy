'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getLatestPosts, getTestimonials } from '@/lib/db';
import { HeroSection } from '@/components/homepage/HeroSection';
import { TrustStrip } from '@/components/homepage/TrustStrip';
import { Pathways } from '@/components/homepage/Pathways';
import { WhoWeServe } from '@/components/homepage/WhoWeServe';
import { HowItWorks } from '@/components/homepage/HowItWorks';
import { PortalPreview } from '@/components/homepage/PortalPreview';
import { WhyChooseUs } from '@/components/homepage/WhyChooseUs';
import { PremiumFeatures } from '@/components/homepage/PremiumFeatures';
import { Methodology } from '@/components/homepage/Methodology';
import { motion } from 'framer-motion';
import { Button, buttonVariants } from '@/components/ui/button';

export default function HomePage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingTestimonials, setLoadingTestimonials] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [postsData, testimonialsData] = await Promise.all([
          getLatestPosts(3),
          getTestimonials()
        ]);
        setPosts(postsData);
        setTestimonials(testimonialsData);
      } catch (error) {
        console.error("Error fetching homepage data:", error);
      } finally {
        setLoadingPosts(false);
        setLoadingTestimonials(false);
      }
    };
    fetchData();
  }, []);

  return (
    <main className="bg-background">
      <HeroSection />
      <TrustStrip />
      <Pathways />
      <WhoWeServe />
      <HowItWorks />
      <PortalPreview />
      <WhyChooseUs />
      <div className="w-full max-w-6xl mx-auto px-8 border-t border-border"></div>
      <PremiumFeatures />
      <Methodology />

      {/* LATEST INSTITUTIONAL UPDATES */}
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
            <Link href="/community" className={buttonVariants({ variant: "outline", className: "rounded-full border-2 border-secondary text-secondary hover:bg-secondary hover:text-white" })}>
              View All Writeups
            </Link>
          </div>
          
          <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {loadingPosts ? (
              <p className="text-center text-muted-foreground col-span-3">Loading latest insights...</p>
            ) : (
              posts.map((post, idx) => {
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
                        <img src={post.coverImageUrl || post.coverImage || '/assets/images/logo.jpeg'} alt={post.title} className="w-full h-full object-cover" />
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
              })
            )}
          </div>
        </div>
      </section>

      {/* VERIFIED TESTIMONIALS */}
      <section className="py-20 bg-background">
        <div className="w-full max-w-6xl mx-auto px-8">
          <motion.div
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
          >
            <h2 className="text-center mb-2 text-4xl font-bold font-headers text-foreground">Trusted By Families Worldwide</h2>
            <p className="text-center text-primary text-sm mb-10">Swipe to view more &rarr;</p>
          </motion.div>
          
          <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {loadingTestimonials ? (
              <p className="text-center text-muted-foreground col-span-3">"Awaiting our newest family reviews..."</p>
            ) : (
              testimonials.map((t, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-card rounded-2xl p-6 shadow-sm border border-border text-center transition-all duration-300 hover:scale-[1.02] hover:shadow-md"
                >
                  <p className="text-muted-foreground italic mb-6 text-sm">"{t.content}"</p>
                  <h5 className="text-primary font-bold text-lg mb-1">{t.author}</h5>
                  <span className="text-xs text-muted-foreground">{t.program} Student</span>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </section>

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
            Join a premier global academy dedicated to authentic knowledge, structured learning, and spiritual excellence.
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
