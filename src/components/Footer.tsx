'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { IlmversLogo } from '@/components/ui/IlmversLogo';
import { Mail, Phone, MapPin, Send } from 'lucide-react';

function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');

  return (
    <form
      className="mt-4 max-w-md"
      onSubmit={async (event) => {
        event.preventDefault();
        setNote('');
        const res = await fetch('/api/newsletter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setNote(typeof data.error === 'string' ? data.error : 'Could not subscribe.');
          return;
        }
        setEmail('');
        setNote('You are on the list.');
      }}
    >
      <label htmlFor="footer-newsletter" className="text-xs uppercase tracking-widest text-[#A7B7B5] font-semibold block mb-2">
        Institute updates
      </label>
      <div className="flex gap-2">
        <input
          id="footer-newsletter"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email address"
          className="min-w-0 flex-1 rounded-full bg-white/10 border border-white/15 px-4 py-2 text-sm text-white placeholder:text-white/40 outline-none"
        />
        <button type="submit" className="rounded-full bg-[#D4AF37] text-[#0F3D38] px-4 py-2 text-sm font-semibold">
          Join
        </button>
      </div>
      {note ? <p className="text-xs text-[#D4AF37] mt-2">{note}</p> : null}
    </form>
  );
}

export function Footer() {
  return (
    <footer className="bg-[#0F3D38] text-[#FAF9F6] pt-20 pb-10 border-t border-[#D4AF37]/30 relative overflow-hidden">
      {/* Subtle Islamic Geometric Flourish in Background */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#004D4A] rounded-full filter blur-[100px] pointer-events-none opacity-40" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#D4AF37] rounded-full filter blur-[120px] pointer-events-none opacity-10" />

      <div className="container mx-auto px-6 md:px-12 max-w-7xl relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
          
          {/* Brand & Slogan */}
          <div className="lg:col-span-2 flex flex-col gap-5">
            <IlmversLogo variant="dark" size="lg" />
            
            <p className="text-[#A7B7B5] mt-2 leading-relaxed text-sm max-w-md">
              Live Islamic classes, with modern learning tools, for students anywhere in the world.
            </p>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm max-w-md">
              <span className="text-[#D4AF37] font-semibold text-xs tracking-widest uppercase block mb-1">
                Institutional Mission
              </span>
              <p className="text-white text-sm font-medium italic">
                "Better Individuals. A Brighter Ummah."
              </p>
            </div>
            <NewsletterSignup />

            {/* Social Channels matching all.jpeg */}
            <div className="mt-2">
              <span className="text-xs uppercase tracking-widest text-[#A7B7B5] font-semibold block mb-3">
                Follow Us @ilmversinstitute
              </span>
              <div className="flex gap-3">
                {/* Instagram */}
                <Link 
                  href="https://instagram.com/ilmversinstitute" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#D4AF37] hover:text-[#0F3D38] text-white transition-all shadow-sm"
                  aria-label="Instagram"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </Link>

                {/* YouTube */}
                <Link 
                  href="https://youtube.com/@ilmversinstitute" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#D4AF37] hover:text-[#0F3D38] text-white transition-all shadow-sm"
                  aria-label="YouTube"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                </Link>

                {/* Facebook */}
                <Link 
                  href="https://facebook.com/ilmversinstitute" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#D4AF37] hover:text-[#0F3D38] text-white transition-all shadow-sm"
                  aria-label="Facebook"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </Link>

                {/* X / Twitter */}
                <Link 
                  href="https://x.com/ilmversinstitute" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#D4AF37] hover:text-[#0F3D38] text-white transition-all shadow-sm"
                  aria-label="X (Twitter)"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </Link>

                {/* Telegram */}
                <Link 
                  href="https://t.me/ilmversinstitute" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#D4AF37] hover:text-[#0F3D38] text-white transition-all shadow-sm"
                  aria-label="Telegram"
                >
                  <Send className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* Academic Programs */}
          <div>
            <h4 className="text-white font-bold text-base font-headers mb-5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></span>
              Programs
            </h4>
            <ul className="flex flex-col gap-3 text-sm">
              <li>
                <Link href="/programs/quran-tajweed" className="text-[#FAF9F6]/80 hover:text-[#D4AF37] transition-colors">
                  Qur'an & Tajweed
                </Link>
              </li>
              <li>
                <Link href="/programs/islamic-studies" className="text-[#FAF9F6]/80 hover:text-[#D4AF37] transition-colors">
                  Islamic Studies
                </Link>
              </li>
              <li>
                <Link href="/programs/hifz" className="text-[#FAF9F6]/80 hover:text-[#D4AF37] transition-colors">
                  Hifz & Memorization
                </Link>
              </li>
              <li>
                <Link href="/programs/arabic" className="text-[#FAF9F6]/80 hover:text-[#D4AF37] transition-colors">
                  Arabic Language
                </Link>
              </li>
              <li>
                <Link href="/programs/children" className="text-[#FAF9F6]/80 hover:text-[#D4AF37] transition-colors">
                  Children's Education
                </Link>
              </li>
              <li>
                <Link href="/programs/advanced" className="text-[#FAF9F6]/80 hover:text-[#D4AF37] transition-colors">
                  Advanced Islamic Studies
                </Link>
              </li>
            </ul>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-white font-bold text-base font-headers mb-5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></span>
              Academy
            </h4>
            <ul className="flex flex-col gap-3 text-sm">
              <li>
                <Link href="/teachers" className="text-[#FAF9F6]/80 hover:text-[#D4AF37] transition-colors">
                  Our Scholars & Instructors
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-[#FAF9F6]/80 hover:text-[#D4AF37] transition-colors">
                  About Ilmvers
                </Link>
              </li>
              <li>
                <Link href="/admissions" className="text-[#FAF9F6]/80 hover:text-[#D4AF37] transition-colors">
                  Enrollment & Admissions
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-[#FAF9F6]/80 hover:text-[#D4AF37] transition-colors">
                  Tuition & Plans
                </Link>
              </li>
              <li>
                <Link href="/portal" className="text-[#FAF9F6]/80 hover:text-[#D4AF37] transition-colors">
                  Student Portal
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-[#FAF9F6]/80 hover:text-[#D4AF37] transition-colors">
                  Academy Journal
                </Link>
              </li>
              <li>
                <Link href="/community" className="text-[#FAF9F6]/80 hover:text-[#D4AF37] transition-colors">
                  Community
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Details */}
          <div>
            <h4 className="text-white font-bold text-base font-headers mb-5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></span>
              Contact
            </h4>
            <ul className="flex flex-col gap-4 text-sm text-[#FAF9F6]/80">
              <li className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-[#D4AF37] mt-0.5 shrink-0" />
                <a href="mailto:info@ilmversinstitute.com" className="hover:text-white transition-colors">
                  info@ilmversinstitute.com
                </a>
              </li>
              <li className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-[#D4AF37] mt-0.5 shrink-0" />
                <span>+234 810 969 0304</span>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-[#D4AF37] mt-0.5 shrink-0" />
                <span>Global Online Campus (Available Worldwide)</span>
              </li>
            </ul>
            <div className="mt-6 pt-5 border-t border-white/10">
              <Link 
                href="/admissions" 
                className="inline-block w-full text-center bg-[#D4AF37] hover:bg-[#F6D77A] text-[#0F3D38] font-bold text-xs uppercase tracking-wider py-2.5 rounded-full shadow-md transition-all"
              >
                Book Free Assessment
              </Link>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-[#A7B7B5]">
          <p>© {new Date().getFullYear()} ILMVERS INSTITUTE. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-[#D4AF37] transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-[#D4AF37] transition-colors">
              Terms of Service
            </Link>
            <Link href="/faq" className="hover:text-[#D4AF37] transition-colors">
              FAQ
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
