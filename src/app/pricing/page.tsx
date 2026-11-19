'use client';

import React from 'react';
import Link from 'next/link';

export default function PricingPage() {
  return (
    <main className="bg-[#FAF9F6] min-h-screen text-[#2E2E2E] font-sans pt-10 pb-20">
      <section className="px-6 md:px-12 max-w-3xl mx-auto text-center py-16">
        <p className="text-xs font-bold tracking-[0.25em] uppercase text-[#D4AF37] mb-4">Tuition</p>
        <h1 className="text-4xl md:text-6xl font-headers font-bold text-[#004D4A] leading-tight mb-6">
          Fees are confirmed at enrolment
        </h1>
        <p className="text-lg text-[#5A6E6C] leading-relaxed mb-8">
          Group, private, and family options are agreed with you after the free assessment. This page will show prices only when Ilmvers publishes the official schedule. Nothing here is a quote.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/admissions" className="rounded-full bg-[#004D4A] text-white px-8 py-3 font-semibold">
            Start enrolment
          </Link>
          <Link href="/contact" className="rounded-full border-2 border-[#004D4A] text-[#004D4A] px-8 py-3 font-semibold">
            Ask about a scholarship
          </Link>
        </div>
      </section>
    </main>
  );
}
