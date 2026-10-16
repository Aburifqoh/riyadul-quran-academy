'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform, Variants } from 'framer-motion';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { CheckCircle2, ChevronRight, GraduationCap } from 'lucide-react';

const FADE_UP: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

const STAGGER: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
};

// Reusable Magnetic Button Component
function MagneticButton({ children, className, href, variant = "default" }: { children: React.ReactNode, className?: string, href: string, variant?: "default" | "outline" | "white" }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouse = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const { clientX, clientY } = e;
    const { height, width, left, top } = ref.current!.getBoundingClientRect();
    const middleX = clientX - (left + width / 2);
    const middleY = clientY - (top + height / 2);
    setPosition({ x: middleX * 0.1, y: middleY * 0.1 });
  };

  const reset = () => {
    setPosition({ x: 0, y: 0 });
  };

  const isOutline = variant === "outline";
  const isWhite = variant === "white";
  const baseClasses = cn(
    buttonVariants({ variant: isOutline ? "outline" : "default", size: "lg" }),
    "rounded-full px-10 py-7 text-lg font-bold transition-all duration-300 relative overflow-hidden group shadow-xl",
    isWhite && "bg-white text-secondary hover:bg-bg-neutral",
    !isWhite && !isOutline && "hover:shadow-2xl hover:-translate-y-1",
    className
  );

  return (
    <motion.div animate={{ x: position.x, y: position.y }} transition={{ type: "spring" as const, stiffness: 150, damping: 15, mass: 0.1 }}>
      <Link 
        href={href}
        ref={ref}
        onMouseMove={handleMouse}
        onMouseLeave={reset}
        className={baseClasses}
      >
        <div className="absolute inset-0 bg-black/5 translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-300 pointer-events-none" />
        <span className="relative z-10 flex items-center justify-center">{children}</span>
      </Link>
    </motion.div>
  );
}

export default function MethodologyPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"]
  });

  return (
    <main className="bg-bg-neutral min-h-screen">
      {/* PAGE HEADER */}
      <section className="relative pt-24 pb-20 bg-secondary overflow-hidden text-center">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[150%] bg-primary/10 blur-[120px] rounded-full mix-blend-screen" />
          <div className="absolute top-[20%] -right-[10%] w-[40%] h-[100%] bg-primary/20 blur-[100px] rounded-full mix-blend-screen" />
        </div>
        
        <div className="w-full max-w-5xl mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white text-sm font-semibold mb-6 tracking-wide shadow-md"
          >
            <GraduationCap className="w-4 h-4 text-primary" />
            OUR PEDAGOGY
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-6xl font-headers font-bold text-white mb-6 leading-tight"
          >
            How We Teach at Ilmvers
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-3xl mx-auto text-lg md:text-xl text-white/80 leading-relaxed mb-8"
          >
            We believe in transformation, not just transaction. Our pedagogy ensures long-term retention and true comprehension.
          </motion.p>
        </div>
      </section>

      {/* METHODOLOGY CONTENT */}
      <section className="py-24 relative z-20 overflow-hidden" ref={containerRef}>
        {/* Animated SVG Path connecting sections */}
        <div className="absolute left-1/2 top-0 bottom-0 w-[600px] -translate-x-1/2 h-full pointer-events-none hidden lg:block -z-10">
          <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 600 1000">
            <motion.path
              d="M 300 50 C 450 150, 450 350, 300 500 C 150 650, 150 850, 300 950"
              fill="none"
              stroke="var(--color-primary, #D9A887)"
              strokeWidth="4"
              strokeDasharray="12 12"
              className="opacity-30"
              style={{ pathLength: scrollYProgress }}
            />
          </svg>
        </div>

        <div className="w-full max-w-6xl mx-auto px-6">
          
          {/* Section 1 */}
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={FADE_UP}
            className="grid lg:grid-cols-[1fr_1.2fr] gap-12 items-center mb-32 group"
          >
            <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] p-8 md:p-12 shadow-xl border border-white/60 relative overflow-hidden transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 group-hover:border-primary/40 group-hover:bg-white/90 z-10">
              <div className="absolute -top-10 -left-10 w-32 h-32 bg-primary/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
              <span className="text-primary mb-3 block font-bold uppercase tracking-widest text-sm relative z-10">Pedagogy 01</span>
              <h2 className="text-3xl md:text-4xl font-headers font-bold text-secondary mb-4 relative z-10">Qur'an: Recitation Before Speed</h2>
              <p className="mb-8 text-text-body text-lg leading-relaxed relative z-10">
                We believe the tongue must be trained before the memory is tested. <i>Makharij</i> (articulation) and <i>Tajweed</i> are not "extra" subjects — they are the non-negotiable foundations of every lesson.
              </p>
              <ul className="space-y-5 relative z-10">
                <li className="flex items-center gap-4 text-secondary font-medium">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  </div>
                  Individualized correction (1-on-1 focus)
                </li>
                <li className="flex items-center gap-4 text-secondary font-medium">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  </div>
                  Practical Tajweed (Learning by doing)
                </li>
                <li className="flex items-center gap-4 text-secondary font-medium">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  </div>
                  Retention-first memorization discipline
                </li>
              </ul>
            </div>
            <div className="text-center order-first lg:order-last">
              <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }} className="text-[8rem] md:text-[10rem] filter drop-shadow-2xl mb-8 relative">
                <div className="absolute inset-0 bg-primary/20 blur-[50px] rounded-full -z-10 scale-50" />
                📖
              </motion.div>
              <span className="inline-block px-6 py-3 rounded-full text-sm font-bold bg-white text-primary border border-primary/30 shadow-md">
                Prophetic Standard
              </span>
            </div>
          </motion.div>

          {/* Section 2 */}
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={FADE_UP}
            className="grid lg:grid-cols-[1.2fr_1fr] gap-12 items-center mb-32 group"
          >
            <div className="text-center relative z-10">
              <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 5, delay: 1, ease: "easeInOut" }} className="text-[8rem] md:text-[10rem] filter drop-shadow-2xl mb-8 relative">
                <div className="absolute inset-0 bg-secondary/20 blur-[50px] rounded-full -z-10 scale-50" />
                🔤
              </motion.div>
              <span className="inline-block px-6 py-3 rounded-full text-sm font-bold bg-secondary text-white shadow-xl border border-secondary">
                Foundational Logic
              </span>
            </div>
            <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] p-8 md:p-12 shadow-xl border border-white/60 relative overflow-hidden transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 group-hover:border-secondary/40 group-hover:bg-white/90 z-10">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-secondary/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
              <span className="text-secondary mb-3 block font-bold uppercase tracking-widest text-sm relative z-10">Pedagogy 02</span>
              <h2 className="text-3xl md:text-4xl font-headers font-bold text-secondary mb-4 relative z-10">Arabic: The Key to Revelation</h2>
              <p className="mb-8 text-text-body text-lg leading-relaxed relative z-10">
                Arabic is taught as a tool for comprehension, not just a language of conversation. We focus on high-frequency Qur'anic vocabulary so students immediately understand what they recite.
              </p>
              <ul className="space-y-5 relative z-10">
                <li className="flex items-center gap-4 text-secondary font-medium">
                  <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-secondary" />
                  </div>
                  Systematic grammar & morphology progression
                </li>
                <li className="flex items-center gap-4 text-secondary font-medium">
                  <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-secondary" />
                  </div>
                  Focus on the 800+ most frequent words
                </li>
                <li className="flex items-center gap-4 text-secondary font-medium">
                  <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-secondary" />
                  </div>
                  Visual learning aids for complex concepts
                </li>
              </ul>
            </div>
          </motion.div>

          {/* Section 3 */}
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={FADE_UP}
            className="grid lg:grid-cols-[1fr_1.2fr] gap-12 items-center group"
          >
            <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] p-8 md:p-12 shadow-xl border border-white/60 relative overflow-hidden transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 group-hover:border-zinc-800/40 group-hover:bg-white/90 z-10">
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-zinc-800/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
              <span className="text-zinc-800 mb-3 block font-bold uppercase tracking-widest text-sm relative z-10">Pedagogy 03</span>
              <h2 className="text-3xl md:text-4xl font-headers font-bold text-zinc-800 mb-4 relative z-10">Islamic Studies: Daily Grounding</h2>
              <p className="mb-8 text-text-body text-lg leading-relaxed relative z-10">
                We instill sound creed (<i>Aqeedah</i>) and prophetic manners (<i>Adab</i>) alongside the curriculum. Academic achievement is hollow without spiritual maturity.
              </p>
              <ul className="space-y-5 relative z-10">
                <li className="flex items-center gap-4 text-zinc-800 font-medium">
                  <div className="w-8 h-8 rounded-full bg-zinc-800/10 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-zinc-800" />
                  </div>
                  Age-appropriate, traditional curriculum
                </li>
                <li className="flex items-center gap-4 text-zinc-800 font-medium">
                  <div className="w-8 h-8 rounded-full bg-zinc-800/10 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-zinc-800" />
                  </div>
                  Practice-based learning (Wudu, Salat, Adab)
                </li>
                <li className="flex items-center gap-4 text-zinc-800 font-medium">
                  <div className="w-8 h-8 rounded-full bg-zinc-800/10 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-zinc-800" />
                  </div>
                  Building confident, practicing identities
                </li>
              </ul>
            </div>
            <div className="text-center order-first lg:order-last relative z-10">
              <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 5, delay: 2, ease: "easeInOut" }} className="text-[8rem] md:text-[10rem] filter drop-shadow-2xl mb-8 relative">
                <div className="absolute inset-0 bg-zinc-800/10 blur-[50px] rounded-full -z-10 scale-50" />
                🕌
              </motion.div>
              <span className="inline-block px-6 py-3 rounded-full text-sm font-bold bg-zinc-800 text-white shadow-xl border border-zinc-800">
                Identity Formation
              </span>
            </div>
          </motion.div>

        </div>
      </section>

      {/* CTA SECTION */}
      <section className="py-32 bg-secondary text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/assets/grid.svg')] opacity-[0.05] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[100px] pointer-events-none mix-blend-overlay" />
        
        <motion.div 
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={FADE_UP}
          className="w-full max-w-4xl mx-auto px-6 relative z-10 flex flex-col items-center justify-center"
        >
          <h2 className="text-4xl md:text-5xl font-headers font-bold text-white mb-6">Experience Structured Learning</h2>
          <p className="text-white/80 text-xl md:text-2xl mb-12 max-w-2xl mx-auto leading-relaxed">
            Begin your journey with teachers who are trained to execute this methodology daily.
          </p>
          <MagneticButton href="/admissions" variant="white">
            Start Admissions Process <ChevronRight className="ml-2 w-6 h-6" />
          </MagneticButton>
        </motion.div>
      </section>
    </main>
  );
}
