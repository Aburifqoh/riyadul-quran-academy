'use client';

import React from 'react';
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
import Link from 'next/link';

const programs = [
  {
    id: "quran-tajweed",
    num: "01",
    title: "Qur'an & Tajweed",
    tagline: "Read · Understand · Live",
    desc: "Learn to read the Qur'an correctly with proper Tajweed and deepen your connection with Allah's words. Our instructors provide personalized one-on-one pronunciation training.",
    points: [
      "Mastery of theoretical and practical Tajweed rules",
      "Articulation points (Makharij) and phonetics perfection",
      "Melodic fluency and independent reading confidence",
      "Direct guidance from qualified, certified scholars"
    ],
    badges: ["Proper Pronunciation", "Tajweed Rules", "Qualified Instructors"],
    theme: "ivory"
  },
  {
    id: "islamic-studies",
    num: "02",
    title: "Islamic Studies",
    tagline: "Understand · Apply · Grow",
    desc: "Explore the life of the Prophet ﷺ, Qur'anic sciences, Fiqh, and the core principles of Islam designed to nurture an upright, practicing character.",
    points: [
      "Sound understanding of foundational creed (Aqeedah)",
      "Daily jurisprudence (Fiqh) for purification and prayer",
      "Inspiring insights from prophetic biography (Seerah)",
      "Navigating contemporary ethical and modern challenges"
    ],
    badges: ["Seerah & History", "Fiqh & Aqidah", "Contemporary Issues"],
    theme: "teal"
  },
  {
    id: "hifz",
    num: "03",
    title: "Hifz & Qur'an Memorization",
    tagline: "Memorize · Understand · Be Closer",
    desc: "Build a lifelong relationship with the Qur'an through structured and personalized memorization programs with steadfast retention (Muraja'ah).",
    points: [
      "Customized daily memorization targets and schedules",
      "Systematic long-term revision and retention plans",
      "Real-time feedback and recitation evaluation",
      "A path toward Ijazah once a qualified teacher is assigned"
    ],
    badges: ["Structured Plans", "Progress Tracking", "Personalized Support"],
    theme: "ivory"
  },
  {
    id: "arabic",
    num: "04",
    title: "Arabic Language",
    tagline: "Speak · Read · Understand",
    desc: "Learn Arabic from the basics to advanced levels with practical and interactive lessons to unlock the direct meaning of the Qur'an and classical texts.",
    points: [
      "Conversational fluency in modern standard Arabic",
      "Classical grammar (Nahw) and morphology (Sarf)",
      "Vocabulary drawn from the Qur'an and taught in class",
      "Speaking practice with the instructor assigned to you"
    ],
    badges: ["Speaking Skills", "Reading & Writing", "Guided Practice"],
    theme: "teal"
  },
  {
    id: "children",
    num: "05",
    title: "Children's Education",
    tagline: "Play · Learn · Build Character",
    desc: "Fun, engaging and age-appropriate Islamic education for a strong foundation in faith, Quranic literacy, and noble Islamic manners.",
    points: [
      "Engaging gamified lessons keeping young minds attentive",
      "Nurturing Islamic etiquette (Adab) and character building",
      "Safe, encouraging and vetted learning environment",
      "Regular transparent reports for parent oversight"
    ],
    badges: ["Interactive Lessons", "Character Building", "Safe & Supportive Environment"],
    theme: "ivory"
  },
  {
    id: "advanced",
    num: "06",
    title: "Advanced Islamic Studies",
    tagline: "Deeper Knowledge · Greater Impact",
    desc: "For serious learners seeking advanced knowledge in Islamic scholarship, higher legal reasoning (Usul al-Fiqh), and community leadership.",
    points: [
      "Exegesis (Tafsir) and classical Hadith sciences",
      "Principles of Islamic Jurisprudence & comparative law",
      "Islamic thought, civilizational history, and apologetics",
      "Mentorship with eminent senior scholars"
    ],
    badges: ["Tafsir & Hadith", "Islamic Law (Fiqh)", "Leadership & Da'wah"],
    theme: "teal"
  }
];

export default function ProgramsPage() {
  return (
    <main className="bg-[#FAF9F6] min-h-screen text-[#2E2E2E] font-sans pt-10 pb-20">
      
      {/* Header matching courses and program.jpeg */}
      <section className="px-6 md:px-12 max-w-7xl mx-auto mb-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#004D4A]/5 border border-[#004D4A]/10 text-xs font-bold uppercase tracking-[0.2em] text-[#004D4A] mb-4">
          <span>Academic Pathways</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-headers font-bold text-[#004D4A] mb-4">
          Our Courses & Programs
        </h1>
        <p className="text-sm md:text-base font-semibold tracking-[0.25em] uppercase text-[#D4AF37] max-w-2xl mx-auto">
          BUILDING KNOWLEDGE · STRENGTHENING FAITH · SHAPING TOMORROW
        </p>
      </section>

      {/* Program Details List */}
      <section className="px-6 md:px-12 max-w-7xl mx-auto space-y-16">
        {programs.map((program, idx) => {
          const isTeal = program.theme === 'teal';
          return (
            <motion.div 
              key={program.id}
              id={program.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className={`rounded-3xl p-8 md:p-12 border transition-all duration-300 shadow-md ${
                isTeal 
                  ? 'bg-[#004D4A] text-white border-[#004D4A]' 
                  : 'bg-white text-[#2E2E2E] border-[#E2E9E7]'
              }`}
            >
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8 border-b pb-6 border-current/10">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-bold tracking-widest text-[#D4AF37] uppercase">
                      Course {program.num}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
                    <span className={`text-xs font-medium italic ${isTeal ? 'text-white/80' : 'text-[#5A6E6C]'}`}>
                      {program.tagline}
                    </span>
                  </div>
                  <h2 className={`text-3xl md:text-4xl font-headers font-bold ${isTeal ? 'text-white' : 'text-[#004D4A]'}`}>
                    <Link href={`/programs/${program.id}`} className="hover:underline">{program.title}</Link>
                  </h2>
                </div>

                <Link
                  href="/admissions"
                  className={`px-8 py-3.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 shadow-sm shrink-0 ${
                    isTeal 
                      ? 'bg-[#D4AF37] hover:bg-[#F6D77A] text-[#0F3D38]' 
                      : 'bg-[#004D4A] hover:bg-[#0F3D38] text-white'
                  }`}
                >
                  Enroll In This Course →
                </Link>
              </div>

              <div className="grid lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-7">
                  <p className={`text-base md:text-lg leading-relaxed mb-8 ${isTeal ? 'text-white/85' : 'text-[#5A6E6C]'}`}>
                    {program.desc}
                  </p>

                  <h4 className={`text-xs font-bold uppercase tracking-wider mb-4 ${isTeal ? 'text-[#D4AF37]' : 'text-[#004D4A]'}`}>
                    Key Learning Outcomes:
                  </h4>
                  <ul className="grid sm:grid-cols-2 gap-3 mb-8">
                    {program.points.map((pt, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-xs md:text-sm font-medium">
                        <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${isTeal ? 'text-[#D4AF37]' : 'text-[#004D4A]'}`} />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Badges from courses and program.jpeg */}
                  <div className="flex flex-wrap gap-2">
                    {program.badges.map((b, i) => (
                      <span 
                        key={i}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-xl border ${
                          isTeal 
                            ? 'bg-white/10 text-white border-white/20' 
                            : 'bg-[#FAF9F6] text-[#004D4A] border-[#E2E9E7]'
                        }`}
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Arch preview frame on the right */}
                <div className="lg:col-span-5 flex justify-center">
                  <div className="relative w-full max-w-[360px] aspect-[4/5] rounded-3xl overflow-hidden border border-[#E2E9E7] shadow-md">
                    <img 
                      src="/assets/images/hero-student.jpg" 
                      alt={program.title}
                      className="w-full h-full object-cover" 
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </section>

      <section id="enrichment" className="px-6 md:px-12 max-w-7xl mx-auto mt-20">
        <p className="text-xs font-bold tracking-[0.2em] uppercase text-[#D4AF37] mb-2">Extra-curricular</p>
        <h2 className="text-3xl md:text-4xl font-headers font-bold text-[#004D4A] mb-3">Circles beside the core programmes</h2>
        <p className="text-[#5A6E6C] max-w-3xl mb-8">These are optional study circles, not separate priced courses. Your teacher confirms the outline when you enrol. Fees stay unpublished until the institute sets them.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            ['Weekend Halaqah', 'Revision, questions, and supervised practice on the weekend.'],
            ["Qur'an Review Circle", 'Extra recitation time beside Tajweed or Hifz.'],
            ['Adab & Character', 'Manners and how knowledge is lived at home.'],
            ['Family Learning Circle', 'Parents and children learning in one sitting.'],
            ["Children's Weekend Club", 'Stories, Arabic sounds, and short activities for younger learners.'],
          ].map(([title, text]) => (
            <div key={title} className="rounded-2xl border border-[#E2E9E7] bg-white p-5">
              <h3 className="font-headers font-bold text-[#004D4A] mb-2">{title}</h3>
              <p className="text-sm text-[#5A6E6C]">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust points strip */}
      <section className="px-6 md:px-12 max-w-7xl mx-auto mt-24">
        <div className="p-8 rounded-3xl bg-white border border-[#E2E9E7] shadow-sm flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
          <div className="space-y-1">
            <h3 className="text-xl font-bold font-headers text-[#004D4A]">
              Learn Today, Lead Tomorrow
            </h3>
            <p className="text-xs text-[#5A6E6C]">
              Live classes and study notes. Fees, and any certificate, are confirmed at enrolment.
            </p>
          </div>
          <Link 
            href="/admissions" 
            className="bg-[#004D4A] hover:bg-[#0F3D38] text-white px-8 py-3.5 rounded-full font-semibold text-xs tracking-wider uppercase shadow-md transition-all shrink-0"
          >
            Start Free Assessment
          </Link>
        </div>
      </section>

    </main>
  );
}
