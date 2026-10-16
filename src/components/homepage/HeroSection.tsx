'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { 
  GraduationCap, 
  Play, 
  BookOpen, 
  Landmark, 
  Languages, 
  Users, 
  Sparkles,
  ArrowRight,
  Globe,
  Award
} from 'lucide-react';

export function HeroSection() {
  const quickCategories = [
    { name: "Qur'an & Tajweed", href: "/programs#quran-tajweed", icon: BookOpen },
    { name: "Islamic Studies", href: "/programs#islamic-studies", icon: Landmark },
    { name: "Arabic Language", href: "/programs#arabic", icon: Languages },
    { name: "Children's Education", href: "/programs#children", icon: Users },
    { name: "Advanced Studies", href: "/programs#advanced", icon: GraduationCap },
  ];

  return (
    <section className="relative min-h-[92vh] flex flex-col justify-between bg-[#FAF9F6] overflow-hidden pt-28 md:pt-36 pb-12">
      {/* Subtle Islamic Geometric Accents in Background */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#004D4A]/5 rounded-full filter blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 left-[-10%] w-[500px] h-[500px] bg-[#D4AF37]/5 rounded-full filter blur-[100px] pointer-events-none" />

      {/* Decorative Gold Starburst in top corner */}
      <div className="absolute top-20 right-8 md:right-24 opacity-30 pointer-events-none">
        <svg width="80" height="80" viewBox="0 0 100 100" fill="none">
          <path d="M50 0L53 35L85 15L65 47L100 50L65 53L85 85L53 65L50 100L47 65L15 85L35 53L0 50L35 47L15 15L47 35L50 0Z" fill="#D4AF37" />
        </svg>
      </div>

      <div className="container mx-auto px-6 md:px-12 max-w-7xl relative z-10 flex-1 flex flex-col justify-center">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Brand Typography & CTAs (7 cols on lg) */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="lg:col-span-7 flex flex-col"
          >
            {/* Small Gold Tag matching homepage.jpeg */}
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-[2px] bg-[#D4AF37]"></span>
              <span className="text-[#D4AF37] text-xs font-bold tracking-[0.25em] uppercase">
                GLOBAL ONLINE ISLAMIC EDUCATION
              </span>
            </div>

            {/* Main Headline: Playfair Display Bold */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-headers leading-[1.12] mb-6 tracking-tight">
              <span className="text-[#004D4A] block">Learn Islamic Knowledge</span>
              <span className="text-[#D4AF37] block">for a Brighter Future</span>
            </h1>

            {/* Subheading: Montserrat Regular */}
            <p className="text-[#5A6E6C] text-base md:text-lg leading-relaxed mb-8 max-w-xl font-sans">
              Authentic Islamic education, delivered by qualified scholars, with modern learning tools — anytime, anywhere in the world.
            </p>

            {/* Action Buttons matching homepage.jpeg */}
            <div className="flex flex-wrap items-center gap-4 mb-12">
              <Link 
                href="/programs" 
                className="bg-[#004D4A] hover:bg-[#0F3D38] text-white px-8 py-4 rounded-full font-semibold text-sm shadow-lg shadow-[#004D4A]/20 transition-all duration-300 hover:-translate-y-0.5 flex items-center gap-2 group"
              >
                <GraduationCap className="w-4 h-4 text-[#D4AF37]" />
                <span>Explore Our Programs</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link 
                href="/about" 
                className="bg-white hover:bg-[#FAF9F6] text-[#004D4A] border-2 border-[#004D4A]/30 hover:border-[#004D4A] px-7 py-3.5 rounded-full font-semibold text-sm shadow-sm transition-all flex items-center gap-2.5"
              >
                <div className="w-6 h-6 rounded-full bg-[#004D4A]/10 flex items-center justify-center text-[#004D4A]">
                  <Play className="w-3 h-3 fill-current ml-0.5" />
                </div>
                <span>Watch Our Video</span>
              </Link>
            </div>

            {/* Quick Category Badges Row matching homepage.jpeg */}
            <div className="pt-6 border-t border-[#E2E9E7]">
              <span className="text-xs font-bold uppercase tracking-wider text-[#A7B7B5] block mb-4">
                Core Academic Disciplines:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {quickCategories.map((cat, idx) => {
                  const Icon = cat.icon;
                  return (
                    <Link
                      key={idx}
                      href={cat.href}
                      className="group flex flex-col items-center p-3 rounded-2xl bg-white border border-[#E2E9E7] hover:border-[#D4AF37] hover:shadow-md transition-all duration-300 text-center"
                    >
                      <div className="w-10 h-10 rounded-full bg-[#004D4A]/5 group-hover:bg-[#004D4A] group-hover:text-white text-[#004D4A] flex items-center justify-center transition-colors mb-2">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-semibold text-[#2E2E2E] group-hover:text-[#004D4A] transition-colors line-clamp-2">
                        {cat.name}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* Right Column: Islamic Arch Window Hero with Hadith Quote (5 cols on lg) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.2, ease: "easeOut" }}
            className="lg:col-span-5 relative flex justify-center lg:justify-end"
          >
            {/* Hadith Quote Bubble Top-Right matching homepage.jpeg */}
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="absolute -top-6 right-0 z-20 max-w-[260px] bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-[#D4AF37]/30 text-left"
            >
              <span className="text-2xl text-[#D4AF37] font-serif leading-none block">“</span>
              <p className="text-xs text-[#2E2E2E] font-medium italic -mt-2 leading-relaxed">
                Seek knowledge from the cradle to the grave.
              </p>
              <div className="text-[10px] text-[#004D4A] font-bold mt-1 text-right">
                — Prophet Muhammad ﷺ
              </div>
            </motion.div>

            {/* Islamic Pointed Arch Visual Frame */}
            <div className="relative w-full max-w-[420px] aspect-[4/5] rounded-t-[180px] rounded-b-3xl overflow-hidden shadow-2xl border-4 border-white bg-[#004D4A]">
              {/* Image from public/assets/images/ilmverse.jpeg or homepage.jpeg */}
              <Image 
                src="/assets/images/ilmverse.jpeg" 
                alt="ILMVERS Institute – Student of Sacred Knowledge" 
                fill 
                className="object-cover" 
                priority
              />

              {/* Gradient Scrim at Bottom for Clarity */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#004D4A]/90 via-transparent to-black/10 pointer-events-none" />

              {/* Stack of Subjects overlay badge */}
              <div className="absolute bottom-6 left-6 right-6 z-10 bg-white/90 backdrop-blur-md rounded-2xl p-4 border border-[#D4AF37]/30 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-ping" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[#004D4A]">
                      New Cohort Enrolling
                    </span>
                  </div>
                  <span className="text-[10px] bg-[#004D4A] text-white px-2.5 py-0.5 rounded-full font-semibold">
                    100% Online
                  </span>
                </div>
                <p className="text-xs text-[#2E2E2E] font-medium mt-1">
                  Daily live interactive sessions with certified tutors.
                </p>
              </div>
            </div>

            {/* Floating Gold Ornamental Geometry */}
            <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#F6D77A] p-0.5 shadow-xl hidden sm:block">
              <div className="w-full h-full bg-[#004D4A] rounded-2xl flex items-center justify-center text-white">
                <Sparkles className="w-8 h-8 text-[#D4AF37]" />
              </div>
            </div>
          </motion.div>

        </div>
      </div>

      {/* Social Proof & Global Trust Strip (at bottom of hero, exactly as in homepage.jpeg) */}
      <div className="container mx-auto px-6 md:px-12 max-w-7xl mt-14 pt-8 border-t border-[#E2E9E7]">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
          
          {/* Trust Title */}
          <div className="flex items-center gap-3">
            <Globe className="w-6 h-6 text-[#004D4A]" />
            <div>
              <h4 className="text-sm font-bold text-[#2E2E2E] tracking-tight">
                Trusted by Students Around the World
              </h4>
              <p className="text-xs text-[#5A6E6C]">A verified international learning sanctuary</p>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-14">
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-extrabold text-[#004D4A] font-headers">
                10,000+
              </div>
              <div className="text-xs font-semibold text-[#5A6E6C]">Global Students</div>
            </div>

            <div className="w-[1px] h-10 bg-[#E2E9E7] hidden sm:block" />

            <div className="text-center">
              <div className="text-2xl md:text-3xl font-extrabold text-[#004D4A] font-headers">
                120+
              </div>
              <div className="text-xs font-semibold text-[#5A6E6C]">Countries</div>
            </div>

            <div className="w-[1px] h-10 bg-[#E2E9E7] hidden sm:block" />

            <div className="text-center">
              <div className="text-2xl md:text-3xl font-extrabold text-[#004D4A] font-headers">
                50+
              </div>
              <div className="text-xs font-semibold text-[#5A6E6C]">Qualified Scholars</div>
            </div>
          </div>

          {/* Call to join */}
          <Link 
            href="/admissions" 
            className="flex items-center gap-3 text-sm font-bold text-[#004D4A] hover:text-[#0F3D38] group"
          >
            <span className="font-serif italic text-base">Join a global community of learners</span>
            <div className="w-8 h-8 rounded-full bg-[#004D4A] text-white flex items-center justify-center group-hover:bg-[#D4AF37] transition-colors">
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

        </div>
      </div>
    </section>
  );
}

export default HeroSection;
