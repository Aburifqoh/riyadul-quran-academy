'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronDown } from 'lucide-react';
import { IlmversLogo } from '@/components/ui/IlmversLogo';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const pathname = usePathname();
  const hideMarketingNav =
    pathname.startsWith('/portal') ||
    pathname.startsWith('/parent') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/teacher-login') ||
    pathname.startsWith('/admin-login') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/reset-password');

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    const onInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onInstall);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('beforeinstallprompt', onInstall);
    };
  }, []);

  const installApp = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    setInstallEvent(null);
  };

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'Programs', href: '/programs', hasDropdown: true },
    { name: 'Our Scholars', href: '/teachers' },
    { name: 'About Us', href: '/about' },
    { name: 'Blog', href: '/blog' },
    { name: 'Community', href: '/community' },
    { name: 'Contact', href: '/contact' },
  ];

  if (hideMarketingNav) return null;

  return (
    <header 
      className={`sticky top-0 w-full z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-[#FAF9F6]/95 backdrop-blur-md shadow-sm border-b border-[#E2E9E7] py-3' 
          : 'bg-[#FAF9F6]/80 backdrop-blur-sm py-4 md:py-5 border-b border-transparent'
      }`}
    >
      <div className="container mx-auto px-4 md:px-8 flex items-center justify-between max-w-7xl">
        {/* Brand Logo from brand design images */}
        <IlmversLogo variant="light" size="md" />

        {/* Desktop Nav matching homepage.jpeg */}
        <nav className="hidden lg:flex items-center gap-7">
          <div className="flex items-center gap-6">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <div key={link.name} className="relative group">
                  <Link 
                    href={link.href} 
                    className={`flex items-center gap-1 font-medium text-sm transition-colors tracking-wide py-1 ${
                      isActive 
                        ? 'text-[#004D4A] font-bold border-b-2 border-[#D4AF37]' 
                        : 'text-[#2E2E2E] hover:text-[#004D4A]'
                    }`}
                  >
                    <span>{link.name}</span>
                    {link.hasDropdown && <ChevronDown className="w-3.5 h-3.5 opacity-60 group-hover:rotate-180 transition-transform" />}
                  </Link>

                  {link.hasDropdown && (
                    <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-[#E2E9E7] p-3 hidden group-hover:block transition-all z-50">
                      <div className="space-y-1">
                        <Link href="/programs/quran-tajweed" className="block px-3 py-2 rounded-xl text-xs font-semibold text-[#2E2E2E] hover:bg-[#FAF9F6] hover:text-[#004D4A]">
                          Qur'an & Tajweed
                        </Link>
                        <Link href="/programs/islamic-studies" className="block px-3 py-2 rounded-xl text-xs font-semibold text-[#2E2E2E] hover:bg-[#FAF9F6] hover:text-[#004D4A]">
                          Islamic Studies
                        </Link>
                        <Link href="/programs/hifz" className="block px-3 py-2 rounded-xl text-xs font-semibold text-[#2E2E2E] hover:bg-[#FAF9F6] hover:text-[#004D4A]">
                          Hifz & Qur'an Memorization
                        </Link>
                        <Link href="/programs/arabic" className="block px-3 py-2 rounded-xl text-xs font-semibold text-[#2E2E2E] hover:bg-[#FAF9F6] hover:text-[#004D4A]">
                          Arabic Language
                        </Link>
                        <Link href="/programs/children" className="block px-3 py-2 rounded-xl text-xs font-semibold text-[#2E2E2E] hover:bg-[#FAF9F6] hover:text-[#004D4A]">
                          Children's Education
                        </Link>
                        <Link href="/programs/advanced" className="block px-3 py-2 rounded-xl text-xs font-semibold text-[#2E2E2E] hover:bg-[#FAF9F6] hover:text-[#004D4A]">
                          Advanced Islamic Studies
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-5 pl-2">
            {/* Search icon trigger */}
            <button 
              onClick={() => setSearchOpen(!searchOpen)} 
              className="p-2 text-[#2E2E2E] hover:text-[#004D4A] hover:bg-[#004D4A]/5 rounded-full transition-colors"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Login Link */}
            {installEvent && (
              <button
                type="button"
                onClick={installApp}
                className="text-[#004D4A] hover:text-[#0F3D38] font-semibold text-sm"
              >
                Install app
              </button>
            )}
            <Link 
              href="/login" 
              className="text-[#2E2E2E] hover:text-[#004D4A] font-medium text-sm transition-colors tracking-wide"
            >
              Login
            </Link>

            {/* Enroll Now Pill Button */}
            <Link 
              href="/admissions" 
              className="bg-[#004D4A] hover:bg-[#0F3D38] text-white px-7 py-2.5 rounded-full font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 border border-[#004D4A]"
            >
              Enroll Now
            </Link>
          </div>
        </nav>

        {/* Mobile menu and search toggles */}
        <div className="flex items-center gap-3 lg:hidden">
          <Link 
            href="/login" 
            className="text-xs font-semibold text-[#004D4A] px-3 py-1.5 rounded-full bg-[#004D4A]/10"
          >
            Login
          </Link>

          <button 
            className="p-2 text-[#004D4A] rounded-lg focus:outline-none"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Menu"
          >
            <div className="w-6 h-5 flex flex-col justify-between">
              <span className={`block w-full h-0.5 bg-current transform transition-transform duration-300 ${mobileMenuOpen ? 'rotate-45 translate-y-2.5' : ''}`} />
              <span className={`block w-full h-0.5 bg-current transition-opacity duration-300 ${mobileMenuOpen ? 'opacity-0' : ''}`} />
              <span className={`block w-full h-0.5 bg-current transform transition-transform duration-300 ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
            </div>
          </button>
        </div>

        {/* Mobile Nav Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="absolute top-full left-0 w-full bg-[#FAF9F6] shadow-2xl py-6 px-6 flex flex-col gap-4 lg:hidden border-b border-[#E2E9E7]"
            >
              {navLinks.map((link) => (
                <Link 
                  key={link.name} 
                  href={link.href} 
                  className="text-[#2E2E2E] hover:text-[#004D4A] font-semibold text-base py-2 border-b border-[#E2E9E7]/60 flex items-center justify-between"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span>{link.name}</span>
                  {link.hasDropdown && <ChevronDown className="w-4 h-4 text-[#D4AF37]" />}
                </Link>
              ))}

              <div className="flex flex-col gap-3 pt-3">
                {installEvent && (
                  <button
                    type="button"
                    onClick={() => { setMobileMenuOpen(false); void installApp(); }}
                    className="w-full text-center border-2 border-[#D4AF37] text-[#0F3D38] py-2.5 rounded-full font-semibold"
                  >
                    Install app
                  </button>
                )}
                {installEvent && (
                  <button
                    type="button"
                    onClick={() => { setMobileMenuOpen(false); void installApp(); }}
                    className="w-full text-center border-2 border-[#D4AF37] text-[#004D4A] py-2.5 rounded-full font-semibold"
                  >
                    Install app
                  </button>
                )}
                <Link 
                  href="/admissions" 
                  className="w-full text-center bg-[#004D4A] hover:bg-[#0F3D38] text-white py-3 rounded-full font-semibold shadow-md"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Enroll Now
                </Link>
                <Link 
                  href="/login" 
                  className="w-full text-center border-2 border-[#004D4A] text-[#004D4A] py-2.5 rounded-full font-semibold"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Student Login
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}

export default Navbar;
