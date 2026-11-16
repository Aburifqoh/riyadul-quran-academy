
'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';

export default function FaqPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    const elements = document.querySelectorAll('.animate-on-scroll');
    elements.forEach(el => el.classList.add('visible'));
  }, []);

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const faqData = [
    {
      category: "Admissions & Enrollment",
      items: [
        {
          q: "How do I start learning at Ilmvers?",
          a: "Create an account, then book the free assessment. After that, Ilmvers confirms your level and the fee with you. Prices are not listed until the academy publishes them."
        },
        {
          q: "What happens during the Free Assessment?",
          a: "An academic evaluator will review your current Arabic reading ability, Tajweed application, or memorization level. This ensures you are assigned to the correct academic track and a teacher that matches your specific learning needs. It is completely pressure-free!"
        }
      ]
    },
    {
      category: "Portal & Platform",
      items: [
        {
          q: "How do I join a live class?",
          a: "Classes are opened from the student portal. Log in before class and use Join Live Class on your schedule. You do not need a separate link in WhatsApp."
        },
        {
          q: "Can I track my child's progress?",
          a: "Parents can follow attendance, homework, and teacher notes for their children from the parent area."
        }
      ]
    },
    {
      category: "Academics & Teachers",
      items: [
        {
          q: "What programs do you actually offer?",
          a: "Six tracks: Qur'an & Tajweed, Islamic Studies, Hifz, Arabic, Children's Education, and Advanced Studies. Extra circles, such as weekend halaqah, are optional and are not separate priced courses."
        },
        {
          q: "Do you have female instructors for sisters?",
          a: "Sisters and young girls can request a female instructor. Say so on the assessment form and the team will match you."
        },
        {
          q: "Do I need to speak Arabic beforehand?",
          a: "Not at all! Our instructors are fluent in English and expertly trained to take non-Arab children and adults from zero alphabet recognition to confident recitation."
        }
      ]
    }
  ];

  let itemCounter = 0;

  return (
    <>
      {/* HERO SECTION */}
      <header className="py-20 bg-[#004D4A] text-center">
        <div className="w-full max-w-[1200px] mx-auto px-8">
          <h1 className="mb-4 text-white text-5xl">Frequently Asked Questions</h1>
          <p className="text-xl text-white/90">Everything you need to know about learning with Ilmvers.</p>
        </div>
      </header>

      {/* EXTENSIVE FAQ ACCORDION */}
      <section className="py-16 bg-bg-neutral py-20">
        <div className="w-full max-w-[1200px] mx-auto px-8 max-w-3xl">
          {faqData.map((section, sIdx) => (
            <React.Fragment key={sIdx}>
              <h3 className={`text-2xl font-bold text-[#004D4A] mb-6 border-b border-gray-200 pb-4 ${sIdx === 0 ? 'mt-8' : 'mt-16'}`}>
                {section.category}
              </h3>
              
              <div className="space-y-4">
                {section.items.map((item, iIdx) => {
                  const currentIndex = itemCounter++;
                  const isOpen = openIndex === currentIndex;
                  return (
                    <div 
                      key={iIdx} 
                      className={`bg-white rounded-2xl p-8 shadow-md border border-white/80 relative overflow-hidden transition-all duration-300 bg-white rounded-xl shadow-sm overflow-hidden transition-all duration-300 border ${isOpen ? 'border-primary shadow-md' : 'border-gray-100'}`}
                    >
                      <button 
                        className="w-full text-left p-6 flex justify-between items-center gap-4 hover:bg-gray-50 transition-colors"
                        onClick={() => toggleAccordion(currentIndex)}
                      >
                        <span className="font-bold text-lg text-[#0F3D38]">{item.q}</span>
                        <span 
                          className={`text-2xl text-[#004D4A] transform transition-transform duration-300 ${isOpen ? 'rotate-45' : 'rotate-0'}`}
                        >
                          +
                        </span>
                      </button>
                      <div 
                        className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
                      >
                        <div className="p-6 pt-0 border-t border-gray-50 text-[#5A6E6C] leading-relaxed whitespace-pre-line">
                          {item.a}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 text-center py-24 bg-white">
        <div className="w-full max-w-[1200px] mx-auto px-8">
          <h2 className="mb-6 text-4xl font-bold">Still have questions?</h2>
          <p className="mb-10 text-lg text-[#5A6E6C]">Our team is ready to assist you on your journey.</p>
          <Link href="/contact" className="inline-flex items-center justify-center px-8 py-3.5 rounded-full font-semibold text-[#004D4A] border-2 border-[#004D4A] hover:bg-[#004D4A] hover:text-white hover:-translate-y-1 transition-all duration-300 cursor-pointer bg-transparent py-4 px-10 rounded-full font-bold text-lg transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1 inline-block">
            Contact Support
          </Link>
        </div>
      </section>
    </>
  );
}
