'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { 
  GraduationCap, 
  BookOpen, 
  Landmark, 
  Languages, 
  Users, 
  ArrowRight,
} from 'lucide-react';

export function HeroSection() {
  const quickCategories = [
    { name: "Qur'an & Tajweed", href: "/programs/quran-tajweed", icon: BookOpen },
    { name: "Islamic Studies", href: "/programs/islamic-studies", icon: Landmark },
    { name: "Arabic Language", href: "/programs/arabic", icon: Languages },
    { name: "Children's Education", href: "/programs/children", icon: Users },
    { name: "Advanced Studies", href: "/programs/advanced", icon: GraduationCap },
  ];

  return (
    <section className="relative bg-[#FAF9F6] overflow-hidden pt-8 md:pt-12 pb-8">
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
                <span>About the institute</span>
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

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="lg:col-span-5"
          >
            <div className="relative w-full max-w-[460px] mx-auto aspect-[4/5] rounded-3xl overflow-hidden shadow-xl border border-[#E2E9E7] bg-[#004D4A]">
              <Image
                src="/assets/images/hero-student.jpg"
                alt="Students learning with Ilmvers Institute"
                fill
                className="object-cover"
                priority
                sizes="(min-width: 1024px) 460px, 90vw"
              />
            </div>
            <p className="mt-4 text-sm text-[#5A6E6C] text-center max-w-[460px] mx-auto">
              Live classes with qualified scholars, from the first lesson to steady revision.
            </p>
          </motion.div>

        </div>
      </div>
    </section>
  );
}

export default HeroSection;
