'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Award, 
  Globe2, 
  ShieldCheck, 
  GraduationCap,
  ArrowRight
} from 'lucide-react';
import type { FacultyCard } from '@/lib/facultyCards';
import { FacultyShowcaseCard } from '@/components/faculty/FacultyShowcaseCard';

const trustBadges = [
  { label: "Profiles when confirmed", icon: GraduationCap },
  { label: "Live classes", icon: Award },
  { label: "Global Perspective", icon: Globe2 },
  { label: "Safe & Supportive Learning Environment", icon: ShieldCheck },
];

export default function TeachersPage() {
  const [scholars, setScholars] = useState<FacultyCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/faculty-cards');
        const data = await res.json();
        if (!cancelled && res.ok && Array.isArray(data.cards)) {
          setScholars(data.cards);
        }
      } catch (error) {
        console.error('Could not load instructor cards:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="bg-[#FAF9F6] min-h-screen text-[#2E2E2E] font-sans pt-10 pb-20">
      
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
              Published when the institute confirms them.
            </p>
            <p className="text-sm md:text-base text-[#5A6E6C] leading-relaxed">
              The cards below are sample profiles the academy can edit. They are not the confirmed faculty until Ilmvers publishes those names.
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
        {loading ? (
          <p className="text-sm text-[#5A6E6C]">Loading scholars...</p>
        ) : scholars.length === 0 ? (
          <p className="text-sm text-[#5A6E6C]">Faculty profiles will be published here soon.</p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {scholars.map((scholar, idx) => (
              <FacultyShowcaseCard
                key={scholar.id}
                card={scholar}
                index={idx}
                action={
                  <Link
                    href="/admissions"
                    className="w-full py-3 px-6 rounded-full bg-[#004D4A] hover:bg-[#0F3D38] text-white text-xs font-semibold tracking-wider uppercase flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    <span>View Profile & Schedule</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                }
              />
            ))}
          </div>
        )}
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
