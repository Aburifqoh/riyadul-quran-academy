'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { IlmversLogo } from '@/components/ui/IlmversLogo';
import { supabase } from '@/lib/supabase';
import { getUserRole } from '@/lib/userDataHelpers';

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  const { user, userData, loading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const role = getUserRole(userData?.role);
    const isParent = role === 'parent' || userData?.accountType === 'parent';
    if (!loading && !user) {
      router.push('/login');
    } else if (!loading && user && !isParent) {
      router.push('/portal');
    }
  }, [user, userData, loading, router]);

  const role = getUserRole(userData?.role);
  const isParent = role === 'parent' || userData?.accountType === 'parent';

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#004D4A]"></div>
      </div>
    );
  }

  if (!user || !isParent) return null;

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (confirm("Are you sure you want to sign out?")) {
      await supabase.auth.signOut();
      router.push('/login');
    }
  };

  const navLinks = [
    { name: 'Family Overview', href: '/portal', icon: <GridIcon /> },
    { name: 'My Children', href: '/parent/children', icon: <UsersIcon /> },
    { name: 'Billing & Payments', href: '/parent/billing', icon: <CreditCardIcon /> },
    { name: 'Support', href: '/parent/support', icon: <SupportIcon /> },
  ];

  const name = userData?.name || 'Parent';

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      
      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={closeSidebar}
        />
      )}

      {/* FIXED APP SIDEBAR */}
      <aside 
        className={`fixed inset-y-0 left-0 w-64 border-r border-slate-200 bg-white/80 backdrop-blur-2xl z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-6 flex items-center justify-center">
          <IlmversLogo size="sm" showTagline={false} />
        </div>

        <div className="px-6 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Parent Portal</div>
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link 
                key={link.href}
                href={link.href}
                onClick={closeSidebar}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group font-medium text-sm
                  ${active 
                    ? 'bg-emerald-50 text-emerald-600 shadow-sm shadow-emerald-100/50' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
              >
                <span className={`shrink-0 transition-colors ${active ? 'text-emerald-500' : 'text-slate-400 group-hover:text-slate-600'}`}>
                  {link.icon}
                </span>
                {link.name}
              </Link>
            );
          })}
        </nav>

        <div className="px-6 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mt-4">Account</div>
        <nav className="px-3 space-y-1 mb-4">
           <Link 
              href={'/parent/settings'}
              onClick={closeSidebar}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group font-medium text-sm
                  ${pathname.includes('/settings') 
                    ? 'bg-emerald-50 text-emerald-600 shadow-sm shadow-emerald-100/50' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
           >
              <span className={`shrink-0 transition-colors ${pathname.includes('/settings') ? 'text-emerald-500' : 'text-slate-400 group-hover:text-slate-600'}`}>
                <SettingsIcon />
              </span>
              Settings
           </Link>
           
           <button 
             onClick={handleLogout} 
             className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group font-medium text-sm text-red-600 hover:bg-red-50 hover:text-red-700"
           >
              <span className="shrink-0 text-red-400 group-hover:text-red-500">
                <LogoutIcon />
              </span>
              Sign Out
           </button>
        </nav>

        <div className="p-4 border-t border-slate-100 bg-white/50">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg border border-emerald-200 shadow-inner">
                {name.charAt(0)}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-bold truncate text-slate-900 m-0 leading-tight">{name}</p>
                <p className="text-[10px] text-slate-500 truncate uppercase tracking-widest font-bold m-0 mt-0.5">Parent</p>
              </div>
           </div>
        </div>
      </aside>

      {/* MAIN APP SHELL */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen pb-20 lg:pb-0 transition-all duration-300">
        
        {/* TOPBAR */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200 px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors" 
              onClick={toggleSidebar}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 m-0 capitalize tracking-tight">
                {pathname.startsWith('/parent/settings')
                  ? 'Settings'
                  : navLinks.find(l => l.href === pathname)?.name || 'Parent Dashboard'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 m-0 hidden sm:block">Assalamu Alaikum, {name.split(' ')[0]}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/contact" className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-full transition-all" title="Support">
              <SupportIcon />
            </Link>
            <button onClick={handleLogout} className="lg:hidden p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all" title="Sign Out">
              <LogoutIcon />
            </button>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 relative p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto w-full h-full">
            {children}
          </div>
        </main>

      </div>
    </div>
  );
}

// ----------------------------------------------------
// ICONS
// ----------------------------------------------------
const GridIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>;
const SettingsIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>;
const LogoutIcon = ({className}:{className?:string}) => <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>;
const SupportIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-14 8.38 8.38 0 0 1 3.8.9L21 3z"></path></svg>;
const UsersIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>;
const CreditCardIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>;
