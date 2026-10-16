'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { trackMetaEvent } from '@/lib/metaPixel';
import { WHATSAPP_NUMBER } from '@/lib/utils';

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  useEffect(() => {
    // Make elements visible on scroll simulation
    const elements = document.querySelectorAll('.animate-on-scroll');
    elements.forEach(el => el.classList.add('visible'));
  }, []);

  return (
    <>
      {/*  HEADER  */}
  <header className="py-16 bg-[#5D2E17] text-white text-center py-24">
    <div className="w-full max-w-[1200px] mx-auto px-8">
      <h1 className="mb-6 text-5xl text-white">Get In Touch</h1>
      <p className="mb-8 text-xl text-white/90 max-w-2xl mx-auto">Our admin team is here to assist you with registration or any technical support.</p>
    </div>
  </header>


  {/*  CONTACT FORM & INFO  */}
  <section className="py-16 bg-bg-neutral py-20">
    <div className="w-full max-w-[1200px] mx-auto px-8 grid grid-cols-1 lg:grid-cols-2 gap-16">
      
      {/*  Form  */}
      <div className="bg-white rounded-2xl p-8 shadow-md border border-white/80 relative overflow-hidden transition-all duration-300 bg-white p-10 rounded-2xl shadow-xl border border-border-subtle">
        <h3 className="mb-8 text-2xl font-bold text-[#5D2E17]">Send us a message</h3>
        <form onSubmit={async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          setIsSubmitting(true);
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
              alert('Your message has been sent. We will get back to you soon!');
              form.reset();
            } else {
              alert(typeof data.error === 'string' ? data.error : 'We could not send your message. Please try again.');
            }
          } catch {
            alert('We could not send your message. Please try again.');
          } finally {
            setIsSubmitting(false);
          }
        }} className="space-y-6">
          <div className="mb-4">
            <label className="block font-medium mb-2 text-[#5D2E17] font-bold text-[#5D2E17] mb-2 block">Name</label>
            <input type="text" name="name" className="w-full px-4 py-3 border border-[#ebdcd3] rounded-lg text-[#5C5148] focus:outline-none focus:border-[#F59A23] focus:ring-2 focus:ring-[#F59A23]/20 transition-all bg-white font-inherit text-base w-full border border-gray-300 rounded-lg p-3 focus:border-primary focus:ring-1 focus:ring-primary outline-none" required />
          </div>
          <div className="mb-4">
            <label className="block font-medium mb-2 text-[#5D2E17] font-bold text-[#5D2E17] mb-2 block">Email</label>
            <input type="email" name="email" className="w-full px-4 py-3 border border-[#ebdcd3] rounded-lg text-[#5C5148] focus:outline-none focus:border-[#F59A23] focus:ring-2 focus:ring-[#F59A23]/20 transition-all bg-white font-inherit text-base w-full border border-gray-300 rounded-lg p-3 focus:border-primary focus:ring-1 focus:ring-primary outline-none" required />
          </div>
          <div className="mb-4">
            <label className="block font-medium mb-2 text-[#5D2E17] font-bold text-[#5D2E17] mb-2 block">Message</label>
            <textarea name="message" className="w-full px-4 py-3 border border-[#ebdcd3] rounded-lg text-[#5C5148] focus:outline-none focus:border-[#F59A23] focus:ring-2 focus:ring-[#F59A23]/20 transition-all bg-white font-inherit text-base border-gray-300 p-3 focus:border-primary focus:ring-1 focus:ring-primary outline-none [resize:vertical]"rows={5} required ></textarea>
          </div>
          <button disabled={isSubmitting} type="submit" className="inline-flex items-center justify-center px-8 py-3.5 rounded-full font-semibold text-white bg-gradient-to-br from-[#F59A23] to-[#ffb44d] shadow-[0_4px_15px_rgba(245,154,35,0.3)] hover:-translate-y-1 hover:scale-[1.02] hover:shadow-[0_15px_30px_rgba(245,154,35,0.4)] transition-all duration-300 cursor-pointer border-0 w-full py-4 text-lg font-bold disabled:opacity-70">{isSubmitting ? 'Sending...' : 'Send Message'}</button>
        </form>
      </div>

      <div className="py-10">
        <h3 className="text-[#F59A23] text-3xl font-bold mb-8">Direct Contact</h3>
        <p className="mb-10 text-lg text-text-[#5C5148] leading-relaxed">Prefer to speak with someone instantly? Reach out to our WhatsApp support team.</p>
        
        <div className="mb-10">
          <strong className="text-[#5D2E17] text-xl block mb-3 font-bold">WhatsApp Support:</strong>
          <Link href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" className="text-2xl flex items-center gap-3 text-[#25D366] font-bold hover:scale-105 transition-transform origin-left">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
            +234 701 772 1666
          </Link>
        </div>
        
        <div className="mb-12">
          <strong className="text-[#5D2E17] text-xl block mb-3 font-bold">Email Enquiry:</strong>
          <Link href="mailto:info@ilmversinstitute.com" className="text-2xl text-[#F59A23] font-bold hover:underline">info@ilmversinstitute.com</Link>
        </div>

        <div className="bg-amber-50 border border-amber-200 p-8 rounded-2xl mt-auto">
          <p className="text-amber-900 leading-relaxed font-medium">
            <strong className="text-amber-600 block mb-2 text-lg">Quick Tip:</strong> 
            Did you check our <Link href="/faq" className="underline hover:text-amber-700">FAQ page</Link>? 90% of enrollment questions are answered there.
          </p>
        </div>
      </div>
    </div>
  </section>

          {/*  FOOTER  */}
    </>
  );
}

