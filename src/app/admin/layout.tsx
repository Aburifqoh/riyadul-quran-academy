'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || (userData?.role !== 'admin' && userData?.role !== 'super_admin'))) {
      router.push('/admin-login');
    }
  }, [user, userData, loading, router]);

  if (loading) {
    return <div className="flex items-center justify-center h-screen animate-pulse">Loading Secure Portal...</div>;
  }

  if (!user || (userData?.role !== 'admin' && userData?.role !== 'super_admin')) return null;

  return (
    <div className="flex min-h-screen">
      {/* SIDEBAR */}
      <aside className="w-[280px] bg-white [border-right:1px_solid_var(--border-subtle)] flex">
        <div className="p-[32px]">
           <h1 className="m-0 text-[1.5rem] text-[#5D2E17] flex items-center">
              <span className="w-[24px] h-[24px] [background:#F59A23]"></span>
              Ilmvers Admin
           </h1>
        </div>
        
        <nav className="p-[24px] flex-1 flex flex-col gap-[8px]">
          <Link href="/admin" className="btn btn-outline border-0 [background:#FDE7C5] text-[#5D2E17] text-left flex items-center">
             📊 Dashboard
          </Link>
          <button className="btn btn-outline border-0 text-left flex items-center gap-[12px] opacity-[0.5]"disabled >
             👥 Student Roster
          </button>
          <button className="btn btn-outline border-0 text-left flex items-center gap-[12px] opacity-[0.5]"disabled >
             👨‍🏫 Faculty
          </button>
          <button className="btn btn-outline border-0 text-left flex items-center gap-[12px] opacity-[0.5]"disabled >
             ⚙️ Settings
          </button>
        </nav>
        
        <div className="p-[24px]">
           <div className="flex items-center gap-[12px]">
              <div className="w-[40px] h-[40px] rounded-full [background:#F59A23] text-white flex items-center justify-center">
                 A
              </div>
              <div>
                 <strong className="block">Admin User</strong>
                 <span className="text-[0.8rem]">{userData?.email}</span>
              </div>
           </div>
        </div>
      </aside>
      
      {/* MAIN CONTENT */}
      <main className="flex-1 p-[48px] overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
