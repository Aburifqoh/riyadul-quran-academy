import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BookOpen, Heart, Sparkles, Award } from 'lucide-react';

export default function AboutPage() {
  const values = [
    {
      title: "Knowledge (Ilm)",
      desc: "Rooted in authentic chains of transmission (Sanad) and delivered with academic rigor across Qur'anic sciences, Arabic, and Islamic studies.",
      icon: BookOpen
    },
    {
      title: "Faith (Iman)",
      desc: "Knowledge that transforms the soul. We instill steadfast love for Allah, the Prophet ﷺ, and devotion to righteous action.",
      icon: Heart
    },
    {
      title: "Excellence (Ihsan)",
      desc: "Delivering the highest standard of pedagogical care, cutting-edge learning platforms, and individualized student mentorship.",
      icon: Sparkles
    }
  ];

  return (
    <main className="bg-[#FAF9F6] min-h-screen text-[#2E2E2E] overflow-hidden pt-28 pb-20 font-sans">
      
      {/* Hero Section */}
      <section className="relative pt-12 pb-20 md:pb-28 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#004D4A]/5 border border-[#004D4A]/10 text-xs font-bold uppercase tracking-[0.2em] text-[#004D4A]">
              <span>About Ilmvers Institute</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-headers font-bold text-[#004D4A] leading-[1.15]">
              A Sanctuary of <br />
              <span className="text-[#D4AF37] italic font-serif">Sacred Knowledge.</span>
            </h1>

            <p className="text-lg md:text-xl text-[#5A6E6C] leading-relaxed max-w-xl border-l-4 border-[#D4AF37] pl-6 font-sans">
              Ilmvers Institute was founded with a profound mission: to unite authentic classical Islamic scholarship with modern educational excellence for learners across the globe.
            </p>

            <div className="p-5 rounded-2xl bg-white border border-[#E2E9E7] shadow-sm max-w-lg">
              <span className="text-xs font-bold uppercase tracking-widest text-[#D4AF37] block mb-1">
                Our Institutional Motto
              </span>
              <p className="text-lg font-headers font-bold text-[#004D4A] italic">
                “Better Individuals. A Brighter Ummah.”
              </p>
            </div>
          </div>

          <div className="lg:col-span-5 relative">
            {/* Islamic Arch Window Hero Frame */}
            <div className="aspect-[4/5] relative w-full rounded-t-[180px] rounded-b-3xl overflow-hidden shadow-2xl border-4 border-white bg-[#004D4A]">
              <Image 
                src="/assets/images/ilmverse.jpeg" 
                alt="Ilmvers Institute Knowledge Sanctuary" 
                fill 
                className="object-cover" 
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#004D4A]/80 via-transparent to-transparent" />
              
              <div className="absolute bottom-6 left-6 right-6 text-white text-center">
                <span className="text-xs uppercase tracking-widest font-semibold text-[#D4AF37] block">
                  Knowledge · Faith · Excellence
                </span>
                <span className="text-sm font-headers font-bold">
                  Serving Learners in 120+ Countries
                </span>
              </div>
            </div>
            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-[#D4AF37]/20 rounded-full blur-2xl pointer-events-none" />
          </div>

        </div>
      </section>

      {/* The 3 Core Pillars */}
      <section className="py-20 px-6 bg-[#004D4A] text-white relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-[#D4AF37] block mb-2">
              Our Foundations
            </span>
            <h2 className="text-3xl md:text-5xl font-headers font-bold text-white mb-4">
              Knowledge. Faith. Excellence.
            </h2>
            <p className="text-white/80 text-sm md:text-base leading-relaxed">
              Every course, teacher, and lesson at Ilmvers Institute is anchored in these three guiding pillars.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {values.map((v, i) => {
              const VIcon = v.icon;
              return (
                <div 
                  key={i} 
                  className="p-8 rounded-3xl bg-white/10 border border-white/15 backdrop-blur-sm hover:bg-white/15 transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-2xl bg-[#D4AF37] text-[#004D4A] flex items-center justify-center mb-6 shadow-md">
                    <VIcon className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-headers font-bold text-white mb-3">
                    {v.title}
                  </h3>
                  <p className="text-white/80 text-sm leading-relaxed font-sans">
                    {v.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Narrative Section */}
      <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          <div className="space-y-6">
            <span className="text-xs font-bold tracking-widest uppercase text-[#D4AF37]">
              Classical Pedagogy
            </span>
            <h2 className="text-3xl md:text-4xl font-headers font-bold text-[#004D4A]">
              Bridging Tradition and Modernity
            </h2>
            <p className="text-base text-[#5A6E6C] leading-relaxed">
              We reject the impersonal, fragmented approach to online Islamic study. At Ilmvers Institute, students build direct, verified mentor relationships with scholars who live what they teach.
            </p>
            <p className="text-base text-[#5A6E6C] leading-relaxed">
              Whether you are an adult seeking Tajweed accuracy, a parent seeking an engaging moral foundation for your child, or a committed student pursuing Qur'anic memorization (Hifz), our pathways provide structured, measurable milestones.
            </p>
            <div className="pt-4">
              <Link
                href="/programs"
                className="inline-flex items-center gap-2 bg-[#004D4A] hover:bg-[#0F3D38] text-white px-8 py-3.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-md transition-all"
              >
                <span>Explore Academic Programs</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="p-8 rounded-3xl bg-white border border-[#E2E9E7] shadow-sm space-y-6">
            <h3 className="text-2xl font-headers font-bold text-[#004D4A]">
              Why Students Choose Ilmvers:
            </h3>
            
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#004D4A]/10 text-[#004D4A] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
                <div>
                  <h4 className="text-sm font-bold text-[#2E2E2E]">Verified Scholars & Instructors</h4>
                  <p className="text-xs text-[#5A6E6C]">Faculty holding degrees from Al-Madinah, Al-Azhar, and traditional Ijazat chains.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#D4AF37]/20 text-[#0F3D38] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
                <div>
                  <h4 className="text-sm font-bold text-[#2E2E2E]">Comprehensive Multi-Discipline Syllabus</h4>
                  <p className="text-xs text-[#5A6E6C]">Recitation, Tajweed, Arabic grammar, Seerah, Fiqh, and Children's education in harmony.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#004D4A]/10 text-[#004D4A] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
                <div>
                  <h4 className="text-sm font-bold text-[#2E2E2E]">Dedicated Student Portal</h4>
                  <p className="text-xs text-[#5A6E6C]">Automated attendance, homework vault, live class reminders, and transparent progress reports.</p>
                </div>
              </li>
            </ul>
          </div>

        </div>
      </section>

    </main>
  );
}
