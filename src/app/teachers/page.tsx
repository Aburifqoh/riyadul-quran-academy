'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  GraduationCap, 
  Award, 
  Globe2, 
  ShieldCheck, 
  CheckCircle2, 
  BookOpen, 
  Sparkles,
  ArrowRight
} from 'lucide-react';

const scholars = [
  {
    id: "ahmad-yusuf",
    name: "Ustadh Ahmad Yusuf",
    role: "Qur'an & Tajweed Specialist",
    category: "QUR'AN & TAJWEED",
    credentials: "B.A. Islamic Studies (Al-Madinah University) · Ijazah in Qur'an & Tajweed",
    bio: "With over 12 years of experience, Ustadh Ahmad helps students master proper recitation and the beauty of the Qur'an.",
    image: "/assets/images/instructoors.jpeg",
    // In instructoors.jpeg, top-left card
    cropIndex: 0
  },
  {
    id: "omar-khalid",
    name: "Shaykh Omar Khalid",
    role: "Islamic Studies Scholar",
    category: "ISLAMIC STUDIES",
    credentials: "Ph.D. in Islamic Studies (International Islamic University)",
    specialization: "Aqeedah, Fiqh, Seerah",
    bio: "Shaykh Omar provides deep, structured and practical knowledge of Islamic sciences for all levels.",
    image: "/assets/images/instructoors.jpeg",
    cropIndex: 1
  },
  {
    id: "bilal-hassan",
    name: "Ustadh Bilal Hassan",
    role: "Arabic Language Instructor",
    category: "ARABIC LANGUAGE",
    credentials: "B.A. Arabic Language (Al-Azhar University) · Certified Arabic Teacher",
    bio: "Ustadh Bilal makes Arabic simple, practical and enjoyable, helping students build strong language skills for real-life use.",
    image: "/assets/images/instructoors.jpeg",
    cropIndex: 2
  },
  {
    id: "aisha-bello",
    name: "Ustazah Aisha Bello",
    role: "Children's Islamic Education Specialist",
    category: "CHILDREN'S EDUCATION",
    credentials: "B.Ed. (Early Childhood Education) · Islamic Studies Certification",
    bio: "Ustazah Aisha creates a fun, engaging and nurturing learning environment for young minds.",
    image: "/assets/images/instructoors.jpeg",
    cropIndex: 3
  },
  {
    id: "ibrahim-musa",
    name: "Shaykh Ibrahim Musa",
    role: "Hifz & Qur'an Memorization Coach",
    category: "HIFZ & QUR'AN MEMORIZATION",
    credentials: "Hifz (Memorized the Qur'an) · Ijazah in Qur'an Recitation",
    bio: "Shaykh Ibrahim specializes in helping students memorize the Qur'an with correct tajweed and strong retention methods.",
    image: "/assets/images/instructoors.jpeg",
    cropIndex: 4
  },
  {
    id: "fatimah-al-zahra",
    name: "Dr. Fatimah Al-Zahra",
    role: "Advanced Islamic Studies Scholar",
    category: "ADVANCED ISLAMIC STUDIES",
    credentials: "Ph.D. in Islamic Thought & Civilization",
    specialization: "Tafsir, Hadith, Fiqh",
    bio: "Dr. Fatimah offers advanced courses for serious learners seeking deeper understanding and application.",
    image: "/assets/images/instructoors.jpeg",
    cropIndex: 5
  }
];

const trustBadges = [
  { label: "Qualified Scholars", icon: GraduationCap },
  { label: "Years of Experience", icon: Award },
  { label: "Global Perspective", icon: Globe2 },
  { label: "Safe & Supportive Learning Environment", icon: ShieldCheck },
];

export default function TeachersPage() {
  return (
    <main className="bg-[#FAF9F6] min-h-screen text-[#2E2E2E] font-sans pt-28 pb-20">
      
      {/* Editorial Header matching instructoors.jpeg */}
      <section className="px-6 md:px-12 max-w-7xl mx-auto mb-20">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8 pb-12 border-b border-[#E2E9E7]">
          <div className="max-w-2xl">
            <span className="text-xs font-bold tracking-[0.25em] uppercase text-[#D4AF37] block mb-2">
              MEET OUR
            </span>
            <h1 className="text-4xl md:text-6xl font-headers font-bold text-[#004D4A] mb-4">
              Scholars & Instructors
            </h1>
            <p className="text-base md:text-lg font-semibold text-[#0F3D38] mb-3">
              Qualified. Experienced. Passionate.
            </p>
            <p className="text-sm md:text-base text-[#5A6E6C] leading-relaxed">
              Our instructors are qualified Islamic scholars, experienced educators and dedicated mentors, committed to guiding you on your journey of knowledge and faith.
            </p>
          </div>

          {/* Inspirational Quote Callout */}
          <div className="p-6 rounded-2xl bg-white border border-[#D4AF37]/30 shadow-sm max-w-sm shrink-0">
            <span className="text-2xl text-[#D4AF37] font-serif block leading-none">“</span>
            <p className="text-sm text-[#004D4A] font-serif italic -mt-2 mb-2">
              Learn from those who live what they teach.
            </p>
            <div className="text-[10px] text-[#A7B7B5] font-bold uppercase tracking-wider">
              Ilmvers Academic Standard
            </div>
          </div>
        </div>
      </section>

      {/* Scholars Grid matching instructoors.jpeg */}
      <section className="px-6 md:px-12 max-w-7xl mx-auto mb-24">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {scholars.map((s, idx) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.6 }}
              className="bg-white rounded-3xl p-7 border border-[#E2E9E7] shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between group"
            >
              <div>
                {/* Category & Badge */}
                <div className="flex items-center justify-between gap-2 mb-5">
                  <span className="text-[11px] font-bold tracking-wider text-[#D4AF37] uppercase bg-[#D4AF37]/10 px-3 py-1 rounded-full">
                    {s.category}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-[#004D4A]" />
                </div>

                {/* Islamic Pointed Arch Portrait Frame */}
                <div className="relative w-full aspect-[4/3] rounded-t-[100px] rounded-b-2xl overflow-hidden border-2 border-[#D4AF37]/30 mb-6 bg-[#004D4A]/5">
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-[#FAF9F6] to-white">
                    <div className="w-16 h-16 rounded-full bg-[#004D4A] text-white flex items-center justify-center mb-3 shadow-md">
                      <GraduationCap className="w-8 h-8 text-[#D4AF37]" />
                    </div>
                    <span className="text-sm font-bold text-[#004D4A] font-headers">
                      {s.name}
                    </span>
                    <span className="text-[11px] text-[#5A6E6C]">
                      Verified Senior Faculty
                    </span>
                  </div>
                </div>

                {/* Scholar Details */}
                <h3 className="text-2xl font-headers font-bold text-[#004D4A] mb-1 group-hover:text-[#0F3D38] transition-colors">
                  {s.name}
                </h3>
                <p className="text-xs font-semibold text-[#D4AF37] uppercase tracking-wider mb-3">
                  {s.role}
                </p>

                <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E2E9E7] mb-4 text-xs text-[#2E2E2E]">
                  <span className="font-bold text-[#004D4A] block mb-0.5">Qualifications:</span>
                  <span className="text-[#5A6E6C]">{s.credentials}</span>
                  {s.specialization && (
                    <span className="block text-[#004D4A] font-medium mt-1">
                      Focus: {s.specialization}
                    </span>
                  )}
                </div>

                <p className="text-xs md:text-sm text-[#5A6E6C] leading-relaxed mb-6 font-sans">
                  {s.bio}
                </p>
              </div>

              {/* View Profile / Book Assessment Button */}
              <Link 
                href="/admissions"
                className="w-full py-3 px-6 rounded-full bg-[#004D4A] hover:bg-[#0F3D38] text-white text-xs font-semibold tracking-wider uppercase flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <span>View Profile & Schedule</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Trust & Quality Bar matching instructoors.jpeg */}
      <section className="px-6 md:px-12 max-w-7xl mx-auto">
        <div className="p-8 rounded-3xl bg-white border border-[#E2E9E7] shadow-sm flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full lg:w-auto">
            {trustBadges.map((badge, idx) => {
              const BIcon = badge.icon;
              return (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#004D4A]/5 text-[#004D4A] flex items-center justify-center shrink-0">
                    <BIcon className="w-5 h-5 text-[#004D4A]" />
                  </div>
                  <span className="text-xs font-semibold text-[#2E2E2E]">
                    {badge.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="shrink-0 text-center lg:text-right border-t lg:border-t-0 lg:border-l border-[#E2E9E7] pt-4 lg:pt-0 lg:pl-8">
            <span className="font-serif italic text-2xl text-[#004D4A] font-bold block">
              Learn Today, Lead Tomorrow
            </span>
            <span className="text-[11px] text-[#A7B7B5] uppercase tracking-widest font-bold">
              Ilmvers Institute Credo
            </span>
          </div>
        </div>
      </section>

    </main>
  );
}
