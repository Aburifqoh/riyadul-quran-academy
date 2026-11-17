'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { 
  Volume2, 
  BookOpen, 
  UserCheck, 
  Scroll, 
  Compass, 
  Calendar, 
  LineChart, 
  HeartHandshake, 
  MessageSquare, 
  PenTool, 
  Globe2, 
  Sparkles, 
  ShieldCheck, 
  GraduationCap, 
  Scale, 
  CheckCircle2,
  ArrowRight,
  Award
} from 'lucide-react';

export function Pathways() {
  const programs = [
    {
      id: "quran-tajweed",
      title: "Qur'an & Tajweed",
      tagline: "Read · Understand · Live",
      description: "Learn to read the Qur'an correctly with proper Tajweed and deepen your connection with Allah's words.",
      dark: false,
      badges: [
        { label: "Proper Pronunciation", icon: Volume2 },
        { label: "Tajweed Rules", icon: BookOpen },
        { label: "Live instruction", icon: UserCheck }
      ],
      image: "/assets/images/courses and program.jpeg",
      // Crop or fallback visual
      imageAlt: "Holy Quran with Tajweed rules",
      btnClass: "bg-[#004D4A] hover:bg-[#0F3D38] text-white"
    },
    {
      id: "islamic-studies",
      title: "Islamic Studies",
      tagline: "Understand · Apply · Grow",
      description: "Explore the life of the Prophet ﷺ, Qur'anic sciences, Fiqh, and the core principles of Islam.",
      dark: true,
      badges: [
        { label: "Seerah & History", icon: Scroll },
        { label: "Fiqh & Aqidah", icon: Compass },
        { label: "Contemporary Issues", icon: Sparkles }
      ],
      image: "/assets/images/courses and program.jpeg",
      imageAlt: "Prophet's Mosque Dome and minarets",
      btnClass: "bg-[#D4AF37] hover:bg-[#F6D77A] text-[#0F3D38] font-bold"
    },
    {
      id: "hifz",
      title: "Hifz & Qur'an Memorization",
      tagline: "Memorize · Understand · Be Closer",
      description: "Build a lifelong relationship with the Qur'an through structured and personalized memorization programs.",
      dark: false,
      badges: [
        { label: "Structured Plans", icon: Calendar },
        { label: "Progress Tracking", icon: LineChart },
        { label: "Personalized Support", icon: HeartHandshake }
      ],
      image: "/assets/images/courses and program.jpeg",
      imageAlt: "Student memorizing the Quran",
      btnClass: "bg-[#004D4A] hover:bg-[#0F3D38] text-white"
    },
    {
      id: "arabic",
      title: "Arabic Language",
      tagline: "Speak · Read · Understand",
      description: "Learn Arabic from the basics to advanced levels with practical and interactive lessons.",
      dark: true,
      badges: [
        { label: "Speaking Skills", icon: MessageSquare },
        { label: "Reading & Writing", icon: PenTool },
        { label: "Native Instructors", icon: Globe2 }
      ],
      image: "/assets/images/courses and program.jpeg",
      imageAlt: "Arabic Calligraphy calligraphy art",
      btnClass: "bg-[#D4AF37] hover:bg-[#F6D77A] text-[#0F3D38] font-bold"
    },
    {
      id: "children",
      title: "Children's Education",
      tagline: "Play · Learn · Build Character",
      description: "Fun, engaging and age-appropriate Islamic education for a strong foundation in faith and values.",
      dark: false,
      badges: [
        { label: "Interactive Lessons", icon: Sparkles },
        { label: "Character Building", icon: HeartHandshake },
        { label: "Safe & Supportive Environment", icon: ShieldCheck }
      ],
      image: "/assets/images/courses and program.jpeg",
      imageAlt: "Children learning together in cheerful Islamic class",
      btnClass: "bg-[#004D4A] hover:bg-[#0F3D38] text-white"
    },
    {
      id: "advanced",
      title: "Advanced Islamic Studies",
      tagline: "Deeper Knowledge · Greater Impact",
      description: "For serious learners seeking advanced knowledge in Islamic scholarship and leadership.",
      dark: true,
      badges: [
        { label: "Tafsir & Hadith", icon: BookOpen },
        { label: "Islamic Law (Fiqh)", icon: Scale },
        { label: "Leadership & Da'wah", icon: GraduationCap }
      ],
      image: "/assets/images/courses and program.jpeg",
      imageAlt: "Classical Islamic reference books and manuscripts",
      btnClass: "bg-[#D4AF37] hover:bg-[#F6D77A] text-[#0F3D38] font-bold"
    }
  ];

  const trustPoints = [
    { title: "100% Online & Flexible", icon: Globe2 },
    { title: "Qualified Scholars", icon: GraduationCap },
    { title: "Secure Learning Environment", icon: ShieldCheck },
    { title: "Certificates of Completion", icon: Award },
  ];

  return (
    <section className="py-24 bg-[#FAF9F6] relative overflow-hidden" id="courses">
      {/* Background Islamic star geometry */}
      <div className="absolute top-1/2 left-0 w-72 h-72 bg-[#D4AF37]/5 rounded-full filter blur-[90px] pointer-events-none" />
      <div className="absolute bottom-10 right-0 w-80 h-80 bg-[#004D4A]/5 rounded-full filter blur-[100px] pointer-events-none" />

      <div className="container mx-auto px-6 md:px-12 max-w-7xl relative z-10">
        
        {/* Header Section matching courses and program.jpeg */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#004D4A]/5 border border-[#004D4A]/10 text-xs font-bold uppercase tracking-[0.2em] text-[#004D4A] mb-4">
            <span>Our Curriculum</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold font-headers text-[#004D4A] mb-4">
            Our Courses & Programs
          </h2>
          
          <p className="text-xs md:text-sm font-semibold tracking-[0.25em] uppercase text-[#D4AF37]">
            BUILDING KNOWLEDGE · STRENGTHENING FAITH · SHAPING TOMORROW
          </p>
        </div>

        {/* 6 Cards Grid (Alternating Ivory and Deep Teal Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          {programs.map((prog, idx) => (
            <motion.div
              key={prog.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.6 }}
              className={`rounded-3xl p-7 flex flex-col justify-between border transition-all duration-300 hover:shadow-2xl hover:-translate-y-1.5 relative overflow-hidden group ${
                prog.dark 
                  ? 'bg-[#004D4A] text-white border-[#004D4A] shadow-lg shadow-[#004D4A]/15' 
                  : 'bg-white text-[#2E2E2E] border-[#E2E9E7] shadow-sm'
              }`}
            >
              {/* Card Header & Content */}
              <div>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h3 className={`text-2xl font-bold font-headers ${prog.dark ? 'text-white' : 'text-[#004D4A]'}`}>
                      {prog.title}
                    </h3>
                    <p className={`text-xs font-medium italic mt-1 ${prog.dark ? 'text-[#D4AF37]' : 'text-[#D4AF37]'}`}>
                      {prog.tagline}
                    </p>
                  </div>

                  {/* Program Number Indicator */}
                  <span className={`text-2xl font-black font-headers opacity-20 ${prog.dark ? 'text-white' : 'text-[#004D4A]'}`}>
                    0{idx + 1}
                  </span>
                </div>

                <p className={`text-xs md:text-sm leading-relaxed mb-6 font-sans ${prog.dark ? 'text-white/80' : 'text-[#5A6E6C]'}`}>
                  {prog.description}
                </p>

                {/* Arch-framed preview image */}
                <div className="relative w-full h-40 rounded-2xl overflow-hidden mb-6 border border-[#E2E9E7]">
                  <Image 
                    src="/assets/images/hero-student.jpg" 
                    alt={prog.title} 
                    fill 
                    className="object-cover group-hover:scale-105 transition-transform duration-500" 
                    sizes="(min-width: 1024px) 360px, 100vw"
                  />
                </div>

                {/* 3 Key Feature Badges */}
                <div className="space-y-2 mb-8">
                  {prog.badges.map((badge, bIdx) => {
                    const BIcon = badge.icon;
                    return (
                      <div 
                        key={bIdx}
                        className={`flex items-center gap-2.5 text-xs font-medium py-1 px-2.5 rounded-lg ${
                          prog.dark 
                            ? 'bg-white/10 text-white/90' 
                            : 'bg-[#FAF9F6] text-[#2E2E2E] border border-[#E2E9E7]'
                        }`}
                      >
                        <BIcon className={`w-3.5 h-3.5 shrink-0 ${prog.dark ? 'text-[#D4AF37]' : 'text-[#004D4A]'}`} />
                        <span>{badge.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Action Button */}
              <Link 
                href={`/programs/${prog.id}`}
                className={`w-full py-3 px-6 rounded-full text-xs font-semibold tracking-wider uppercase flex items-center justify-center gap-2 transition-all duration-300 shadow-sm ${prog.btnClass}`}
              >
                <span>Learn More</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </motion.div>
          ))}
        </div>

        <div id="enrichment" className="mt-16">
          <div className="max-w-3xl mb-8">
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-[#D4AF37] mb-2">Extra-curricular</p>
            <h3 className="text-3xl font-headers font-bold text-[#004D4A] mb-3">Circles beside the core programmes</h3>
            <p className="text-sm text-[#5A6E6C] leading-relaxed">These are optional study circles, not separate priced courses. Your teacher confirms the outline when you enrol. Fees are not listed until the institute publishes them.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              ['Weekend Halaqah', 'Revision, questions, and supervised practice on the weekend.'],
              ["Qur'an Review Circle", 'Extra recitation time beside Tajweed or Hifz.'],
              ['Adab & Character', 'Manners and how knowledge is lived at home.'],
              ['Family Learning Circle', 'Parents and children learning in one sitting.'],
              ["Children's Weekend Club", 'Stories, Arabic sounds, and short activities for younger learners.'],
            ].map(([title, text]) => (
              <div key={title} className="rounded-2xl border border-[#E2E9E7] bg-white p-5">
                <h4 className="font-headers font-bold text-[#004D4A] mb-2">{title}</h4>
                <p className="text-sm text-[#5A6E6C]">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Feature Strip matching courses and program.jpeg */}
        <div className="p-8 rounded-3xl bg-white border border-[#E2E9E7] shadow-sm flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full lg:w-auto">
            {trustPoints.map((pt, i) => {
              const PIcon = pt.icon;
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#004D4A]/5 text-[#004D4A] flex items-center justify-center shrink-0">
                    <PIcon className="w-5 h-5 text-[#004D4A]" />
                  </div>
                  <span className="text-xs md:text-sm font-semibold text-[#2E2E2E]">
                    {pt.title}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Slogan handwritten style */}
          <div className="shrink-0 text-center lg:text-right border-t lg:border-t-0 lg:border-l border-[#E2E9E7] pt-4 lg:pt-0 lg:pl-8">
            <span className="font-serif italic text-xl md:text-2xl text-[#004D4A] font-semibold block">
              Learn Today, Lead Tomorrow
            </span>
            <span className="text-[11px] text-[#A7B7B5] uppercase tracking-widest font-bold">
              Ilmvers Institute Credo
            </span>
          </div>
        </div>

      </div>
    </section>
  );
}

export default Pathways;
