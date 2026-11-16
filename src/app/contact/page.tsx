'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { trackMetaEvent } from '@/lib/metaPixel';
import { WHATSAPP_NUMBER } from '@/lib/utils';

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [note, setNote] = useState('');

  return (
    <main className="bg-[#FAF9F6] text-[#2E2E2E]">
      <header className="bg-[#004D4A] text-white">
        <div className="max-w-5xl mx-auto px-6 py-16 text-center">
          <p className="text-xs font-bold tracking-[0.25em] uppercase text-[#D4AF37] mb-3">Contact</p>
          <h1 className="text-4xl md:text-5xl font-headers font-bold mb-4">Get in touch</h1>
          <p className="text-lg text-white/90 max-w-2xl mx-auto">The admin team can help with enrolment, class times, and technical support.</p>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-6 py-14 grid grid-cols-1 lg:grid-cols-2 gap-10">
        <form
          className="bg-white rounded-3xl border border-[#E2E9E7] shadow-sm p-6 md:p-8 space-y-5"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = event.currentTarget;
            setIsSubmitting(true);
            setNote('');
            const formData = new FormData(form);
            const name = String(formData.get('name') ?? '');
            const email = String(formData.get('email') ?? '');
            const message = String(formData.get('message') ?? '');
            try {
              const res = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, message }),
              });
              const data = await res.json().catch(() => ({}));
              if (res.ok) {
                await trackMetaEvent('Lead', { email, name });
                setNote('Your message has been sent. We will reply soon.');
                form.reset();
              } else {
                setNote(typeof data.error === 'string' ? data.error : 'We could not send your message. Please try again.');
              }
            } catch {
              setNote('We could not send your message. Please try again.');
            } finally {
              setIsSubmitting(false);
            }
          }}
        >
          <h2 className="text-2xl font-headers font-bold text-[#004D4A]">Send a message</h2>
          <label className="block text-sm font-semibold text-[#004D4A]" htmlFor="contact-name">Name</label>
          <input id="contact-name" name="name" required className="w-full -mt-3 px-4 py-3 border border-[#E2E9E7] rounded-xl outline-none focus:border-[#004D4A]" />
          <label className="block text-sm font-semibold text-[#004D4A]" htmlFor="contact-email">Email</label>
          <input id="contact-email" name="email" type="email" required className="w-full -mt-3 px-4 py-3 border border-[#E2E9E7] rounded-xl outline-none focus:border-[#004D4A]" />
          <label className="block text-sm font-semibold text-[#004D4A]" htmlFor="contact-message">Message</label>
          <textarea id="contact-message" name="message" required rows={5} className="w-full -mt-3 px-4 py-3 border border-[#E2E9E7] rounded-xl outline-none focus:border-[#004D4A]" />
          <button disabled={isSubmitting} type="submit" className="w-full rounded-full bg-[#004D4A] text-white font-semibold py-3 disabled:opacity-60">
            {isSubmitting ? 'Sending...' : 'Send message'}
          </button>
          {note ? <p className="text-sm text-[#0F3D38]">{note}</p> : null}
        </form>

        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-headers font-bold text-[#004D4A] mb-3">Direct contact</h2>
            <p className="text-[#5A6E6C] mb-6">If you would rather speak to someone now, use WhatsApp or email.</p>
            <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer" className="block text-xl font-bold text-[#004D4A] hover:text-[#0F3D38]">
              WhatsApp +234 810 969 0304
            </a>
            <a href="mailto:info@ilmversinstitute.com" className="block mt-3 text-lg font-semibold text-[#004D4A] hover:underline">
              info@ilmversinstitute.com
            </a>
          </div>
          <div className="rounded-2xl bg-white border border-[#E2E9E7] p-6">
            <p className="font-semibold text-[#004D4A] mb-2">Before you write</p>
            <p className="text-sm text-[#5A6E6C]">Many enrolment questions are already answered on the <Link href="/faq" className="underline text-[#004D4A]">FAQ page</Link>.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
