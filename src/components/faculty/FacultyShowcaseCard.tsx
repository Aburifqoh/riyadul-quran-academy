'use client';

import type { ReactNode } from 'react';
import { GraduationCap } from 'lucide-react';
import { motion } from 'framer-motion';
import type { FacultyCard } from '@/lib/facultyCards';

export function FacultyShowcaseCard({
  card,
  index = 0,
  action,
}: {
  card: FacultyCard;
  index?: number;
  action: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08, duration: 0.5 }}
      className="bg-white rounded-3xl p-7 border border-[#E2E9E7] shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between group"
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-5">
          <span className="text-[11px] font-bold tracking-wider text-[#D4AF37] uppercase bg-[#D4AF37]/10 px-3 py-1 rounded-full">
            {card.category}
          </span>
          <span className="w-2 h-2 rounded-full bg-[#004D4A]" />
        </div>

        <div className="relative w-full aspect-[4/3] rounded-t-[100px] rounded-b-2xl overflow-hidden border-2 border-[#D4AF37]/30 mb-6 bg-[#004D4A]/5">
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-[#FAF9F6] to-white">
            <div className="w-16 h-16 rounded-full bg-[#004D4A] text-white flex items-center justify-center mb-3 shadow-md">
              <GraduationCap className="w-8 h-8 text-[#D4AF37]" />
            </div>
            <span className="text-sm font-bold text-[#004D4A] font-headers">
              {card.name}
            </span>
            <span className="text-[11px] text-[#5A6E6C]">
              Verified Senior Faculty
            </span>
          </div>
        </div>

        <h3 className="text-2xl font-headers font-bold text-[#004D4A] mb-1 group-hover:text-[#0F3D38] transition-colors">
          {card.name}
        </h3>
        <p className="text-xs font-semibold text-[#D4AF37] uppercase tracking-wider mb-3">
          {card.role}
        </p>

        <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E2E9E7] mb-4 text-xs text-[#2E2E2E]">
          <span className="font-bold text-[#004D4A] block mb-0.5">Qualifications:</span>
          <span className="text-[#5A6E6C]">{card.credentials}</span>
          {card.specialization && (
            <span className="block text-[#004D4A] font-medium mt-1">
              Focus: {card.specialization}
            </span>
          )}
        </div>

        <p className="text-xs md:text-sm text-[#5A6E6C] leading-relaxed mb-6 font-sans">
          {card.bio}
        </p>
      </div>
      {action}
    </motion.div>
  );
}
