'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { isSubscriptionActive } from '@/lib/billing';
import { hasPermission } from '@/lib/permissions';
import { getUserRole } from '@/lib/userDataHelpers';

import PortalSkeleton from '@/components/ui/PortalSkeleton';
import { RoleBadge } from '@/components/admin/RoleBadge';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, userData, loading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [lockedModalOpen, setLockedModalOpen] = useState(false);
  const [lockedFeatureName, setLockedFeatureName] = useState('');
  const [announcementText, setAnnouncementText] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!user?.id) return;
    const myId = user.id;
    const role = userData?.role || 'student';
    const isAdmin = role === 'admin' || role === 'super_admin';

    async function getUnread() {
      try {
        let query = supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('read', false);
          
        if (isAdmin) {
          query = query.or(`receiver_id.eq.admin,receiver_id.eq.${myId}`);
        } else {
          query = query.eq('receiver_id', myId);
        }
        
        const { count, error } = await query;
        if (!error && count !== null) {
          setUnreadCount(count);
        }
      } catch (err) {
        console.error('Error fetching unread message count:', err);
      }
    }

    getUnread();

    const channel = supabase.channel('layout:unread-messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        getUnread();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, userData]);

  useEffect(() => {
    async function loadAnnouncement() {
      try {
        const { data } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'global_announcement')
          .single();
        if (data?.value) {
          setAnnouncementText(typeof data.value === 'string' ? data.value : JSON.stringify(data.value).replace(/^"|"$/g, ''));
        }
      } catch (err) {
        console.error('Failed to load global announcement:', err);
      }
    }
    loadAnnouncement();
  }, []);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else {
        const role = getUserRole(userData?.role) || 'student';
        const isAdmin = role === 'admin' || role === 'super_admin';
        const isTeacher = role === 'teacher';
        // Parents manage children from /parent. Only a student seat picks class times.
        const needsSchedule =
          role === 'student'
          && !userData?.scheduleSelected
          && pathname !== '/portal/schedule-picker';

        if (!isAdmin && !isTeacher && needsSchedule && userData && isSubscriptionActive(userData)) {
          router.push('/portal/schedule-picker');
        }
      }
    }
  }, [user, loading, router, userData, pathname]);

  if (loading) {
    return <PortalSkeleton />;
  }

  if (!user) return null;

  const handleLogout = async (e: any) => {
    e.preventDefault();
    if (confirm("Are you sure you want to sign out?")) {
      await supabase.auth.signOut();
      router.push('/login');
    }
  };

  const getNavLinks = () => {
    const role = userData?.role || 'student';
    if (role === 'teacher') {
      return [
        { name: 'Overview & Schedule', href: '/portal/teacher', icon: <GridIcon />, locked: false },
        { name: 'My Students', href: '/portal/teacher/students', icon: <UsersIcon />, locked: false },
        { name: 'Secure Inbox', href: '/portal/inbox', icon: <MailIcon />, locked: false },
        { name: 'Assignments', href: '/portal/teacher/assignments', icon: <FileEditIcon />, locked: false },
        { name: 'Faculty Resources', href: '/portal/teacher/resources', icon: <LibraryIcon />, locked: false },
        { name: 'Submit Posts', href: '/portal/teacher/posts', icon: <FileEditIcon />, locked: false },
      ];
    }
    if (role === 'admin' || role === 'super_admin') {
       const adminLinks = [
        { name: 'Admin Hub', href: '/portal/admin', icon: <ShieldIcon />, locked: false },
       ];

       if (hasPermission(userData as any, 'can_access_communications')) {
         adminLinks.push({ name: 'Comms & Monitoring', href: '/portal/admin/communications', icon: <MessageCircleIcon />, locked: false });
       }
       if (hasPermission(userData as any, 'can_manage_students')) {
         adminLinks.push({ name: 'Student Roster', href: '/portal/admin/students', icon: <UsersIcon />, locked: false });
         adminLinks.push({ name: 'Faculty Management', href: '/portal/admin/teachers', icon: <UsersIcon />, locked: false });
       }

       if (role === 'super_admin') {
         adminLinks.push({ name: 'Mass Email', href: '/portal/admin/email', icon: <MailIcon />, locked: false });
       }
       
       if (hasPermission(userData as any, 'can_manage_cms_gallery')) {
         adminLinks.push({ name: 'CMS & Gallery', href: '/portal/admin/cms', icon: <FileEditIcon />, locked: false });
       }

       return adminLinks;
    }
    // Default: Student/Parent matching student dashboard.jpeg
    return [
      { name: 'Dashboard', href: '/portal', icon: <GridIcon />, locked: false },
      { name: 'My Courses', href: '/portal/academics', icon: <BookIcon />, locked: false },
      { name: 'Live Classes', href: '/portal/schedule-picker', icon: <VideoIcon />, locked: false },
      { name: 'Assignments', href: '/portal/homework', icon: <FileEditIcon />, locked: false },
      { name: 'Resources', href: '/portal/library', icon: <LibraryIcon />, locked: false },
      { name: 'Community', href: '/community', icon: <UsersIcon />, locked: false },
      { name: 'Certificates', href: '/portal/academics#certificates', icon: <SparkleIcon />, locked: false },
      { name: 'Messages', href: '/portal/inbox', icon: <MailIcon />, locked: false },
    ];
  };

  const navLinks = getNavLinks();
  const role = userData?.role || 'student';
  const name = userData?.name || 'User';
  const isUnpaid = userData?.paymentStatus !== 'active' && userData?.paymentVerified !== true;

  const closeSidebar = () => setIsSidebarOpen(false);

  const handleNavClick = (e: React.MouseEvent, link: any) => {
    closeSidebar();
  };

  if (pathname === '/portal/schedule-picker') {
    return <div className="min-h-screen bg-[#FAF9F6]">{children}</div>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#FAF9F6]">
      {announcementText && (
        <div className="w-full bg-[#0F3D38] text-white py-2.5 px-4 text-center text-sm font-bold tracking-wide relative overflow-hidden shrink-0 flex items-center justify-center gap-3 border-b border-[#D4AF37]/30">
          <div className="absolute inset-0 bg-[#004D4A]/20 animate-pulse pointer-events-none"></div>
          <span className="font-headers">📢 {announcementText}</span>
        </div>
      )}
      <div className="flex-1 flex flex-col lg:flex-row pb-[80px] lg:pb-0">
      
      {/* MOBILE TOP BAR */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-[#004D4A] text-white sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
           <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-white hover:bg-white/10 rounded-full transition-colors">
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
           </button>
           <h3 className="m-0 text-white font-headers font-bold text-base">ILMVERS PORTAL</h3>
        </div>
        <div className="flex gap-3">
          <Link href="/portal/inbox" className="p-2 text-white bg-white/10 rounded-full relative">
            <MailIcon />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#D4AF37] text-[#0F3D38] text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-white">
                {unreadCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#004D4A]/95 backdrop-blur-md border-t border-white/10 z-40 flex justify-around items-center px-2 pb-safe pt-2 shadow-[0_-4px_20px_rgba(0,0,0,0.2)] pb-5 text-white">
        {navLinks.slice(0, 5).map((link) => {
          const active = pathname === link.href;
          return (
            <a 
              key={link.href}
              href={link.href}
              onClick={(e) => handleNavClick(e, link)}
              className={`flex-1 flex flex-col items-center justify-center py-1 gap-1 transition-all ${
                active ? 'text-[#D4AF37] -translate-y-1' : 'text-white/70 hover:text-white'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-colors relative ${active ? 'bg-white/15' : 'bg-transparent'}`}>
                <span className="[&>svg]:w-5 [&>svg]:h-5">{link.icon}</span>
                {(link.href.includes('inbox') || link.href.includes('communications')) && unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-[#D4AF37] text-[#0F3D38] text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white">
                    {unreadCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-bold text-center leading-tight whitespace-nowrap overflow-hidden text-ellipsis w-full px-1">{link.name.split(' ')[0]}</span>
            </a>
          );
        })}
      </nav>

      {/* MOBILE SIDEBAR OVERLAY */}
      {isSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs" onClick={closeSidebar} />
      )}

      {/* SIDEBAR (Desktop + Mobile Slide-out matching student dashboard.jpeg) */}
      <aside className={`fixed inset-y-0 left-0 z-[110] transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static flex flex-col w-[270px] bg-[#004D4A] text-white border-r border-[#004D4A]/20 transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:py-6 overflow-y-auto shadow-2xl lg:shadow-none`}>
        
        {/* Brand Logo Header */}
        <div className="flex flex-col px-6 pb-6 pt-4 mb-2 border-b border-white/10">
           <div className="flex items-center justify-between">
             <Link href="/" className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-xl overflow-hidden relative border border-[#D4AF37]/40 shadow-sm shrink-0">
                 <img src="/assets/images/logo dark.jpeg" alt="Ilmvers Logo" className="w-full h-full object-cover" />
               </div>
               <div>
                 <div className="text-white font-black tracking-widest text-lg font-headers leading-none">
                   ILM<span className="text-[#D4AF37]">V</span>ERS
                 </div>
                 <div className="text-[9px] tracking-[0.25em] text-[#D4AF37] uppercase font-bold mt-0.5">
                   INSTITUTE
                 </div>
               </div>
             </Link>
             <button onClick={closeSidebar} className="lg:hidden p-2 text-white/70 hover:bg-white/10 rounded-full">
                <CloseIcon />
             </button>
           </div>
        </div>

        {/* Navigation Menu matching student dashboard.jpeg */}
        <ul className="flex flex-col gap-1.5 px-4 m-0 w-full lg:flex-1 list-none py-3">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            const lockedState = isUnpaid && link.locked;
            return (
              <li key={link.href} className="m-0">
                <a 
                  href={link.href} 
                  onClick={(e) => handleNavClick(e, link)}
                  className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold whitespace-nowrap rounded-2xl transition-all relative ${
                    active 
                      ? 'bg-[#166B67] text-white shadow-sm font-bold border-l-4 border-[#D4AF37]' 
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="flex-shrink-0 [&>svg]:w-5 [&>svg]:h-5">{link.icon}</span> 
                  <span>{link.name}</span>
                  
                  {link.name === 'Messages' && (
                    <span className="ml-auto bg-[#D4AF37] text-[#0F3D38] text-[10px] font-black px-2 py-0.5 rounded-full shrink-0">
                      {unreadCount > 0 ? unreadCount : 3}
                    </span>
                  )}
                  {lockedState && <span className="ml-auto opacity-50"><LockIcon /></span>}
                </a>
              </li>
            );
          })}

          <li key="settings-nav" className="m-0 mt-1">
            <a 
              href="/portal/settings" 
              onClick={closeSidebar}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold whitespace-nowrap rounded-2xl transition-all relative ${
                pathname.includes('/settings') 
                  ? 'bg-[#166B67] text-white font-bold border-l-4 border-[#D4AF37]' 
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="flex-shrink-0 [&>svg]:w-5 [&>svg]:h-5"><SettingsIcon /></span> 
              <span>Settings</span>
            </a>
          </li>
        </ul>

        {/* Islamic Arch Banner at Bottom of Sidebar (from student dashboard.jpeg) */}
        <div className="px-5 mt-auto pt-4">
          <div className="rounded-t-[80px] rounded-b-2xl p-5 bg-gradient-to-b from-white/10 to-white/5 border border-white/15 text-center relative overflow-hidden backdrop-blur-sm">
            <div className="w-8 h-8 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] flex items-center justify-center mx-auto mb-2">
              <span className="font-serif text-lg leading-none">“</span>
            </div>
            <p className="text-white text-xs font-serif italic leading-relaxed mb-2">
              Seek knowledge from the cradle to the grave.
            </p>
            <span className="text-[10px] text-[#D4AF37] font-bold block uppercase tracking-wider">
              Prophet Muhammad ﷺ
            </span>
          </div>

          <div className="pt-4 text-center">
            <a 
              href="#" 
              onClick={(e) => { closeSidebar(); handleLogout(e); }} 
              className="text-xs text-white/60 hover:text-white transition-colors"
            >
              Sign Out
            </a>
          </div>
        </div>
      </aside>
      
      {/* MAIN CONTENT */}
      <div className="flex-1 p-4 pb-24 lg:pb-8 lg:p-8 w-full max-w-[100vw] overflow-x-hidden">

        {/* UNPAID BANNER */}
        {isUnpaid && role === 'student' && (
          <div className="flex justify-between flex-wrap gap-4 mb-6 p-4 bg-primary/5 text-secondary border-l-4 border-primary rounded-xl">
            <div>
              <strong>📌 Action Required:</strong> Your account is pending activation. Complete your payment to unlock your full dashboard and confirm your schedule.
            </div>
            <div className="flex items-center gap-3">
               <Link href="/payment" className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold bg-primary/10 text-primary border border-primary/20 no-underline">Pay Now →</Link>
               <Link href="/contact" className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold bg-muted text-muted-foreground no-underline">I need help</Link>
            </div>
          </div>
        )}

        {isUnpaid && navLinks.find(l => l.href === pathname)?.locked ? (
           <div className="relative min-h-[500px]">
              <div className="filter blur-[4px] opacity-90 pointer-events-none select-none transition-all duration-1000">
                 {children}
              </div>
              <div className="absolute inset-0 z-50 flex items-start justify-center pt-20">
                 <div className="bg-card/90 backdrop-blur-xl rounded-[32px] p-8 shadow-2xl border border-border max-w-md text-center transform hover:scale-105 transition-transform duration-500">
                    <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                       <LockIcon />
                    </div>
                    <h3 className="text-3xl font-bold font-headers text-secondary mb-3">Premium Feature</h3>
                    <p className="text-gray-600 mb-8 font-medium leading-relaxed">
                      You are previewing a locked feature. Complete your enrollment to unlock the full Ilmvers experience!
                    </p>
                    <Link href="/payment" className="inline-block w-full bg-gradient-to-r from-primary to-secondary text-white font-bold py-4 px-8 rounded-full shadow-[0_8px_30px_rgb(5,150,105,0.3)] hover:shadow-[0_8px_30px_rgb(5,150,105,0.5)] transition-all hover:-translate-y-1 text-lg">
                      Unlock Full Access
                    </Link>
                 </div>
              </div>
           </div>
        ) : (
           children
        )}
      </div>
     </div>
    </div>
  );
}

// ----------------------------------------------------
// ICONS
// ----------------------------------------------------
const GridIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="14" width="7" height="7" rx="1.5"></rect><rect x="3" y="14" width="7" height="7" rx="1.5"></rect></svg>;
const BookIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path></svg>;
const SparkleIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>;
const VideoIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z"></path><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>;
const LibraryIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>;
const SettingsIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>;
const LogoutIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>;
const LockIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>;
const UsersIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>;
const FileEditIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
const ShieldIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>;
const MailIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect><path d="M2 4l10 10L22 4"></path></svg>;
const MessageCircleIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>;
const MenuIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>;
const CloseIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
