'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Search, 
  Bell, 
  ChevronDown, 
  ChevronRight, 
  ArrowRight,
  BookOpen, 
  CheckCircle2, 
  Clock, 
  Award, 
  Radio, 
  Book, 
  Headphones, 
  FileText, 
  Sparkles,
  Play,
  Calendar,
  User,
  GraduationCap
} from 'lucide-react';

export default function DashboardPage() {
  const { user, userData } = useAuth();
  const router = useRouter();

  // If user is admin or teacher, redirect accordingly
  useEffect(() => {
    if (userData) {
      const role = userData.role;
      if (role === 'admin' || role === 'super_admin') {
        router.push('/portal/admin');
      } else if (role === 'teacher') {
        router.push('/portal/teacher');
      }
    }
  }, [userData, router]);

  const studentName = userData?.name || 'Zakariyahu Abdullateef';
  const firstName = studentName.split(' ')[0] || 'Zakariyahu';

  const courses = [
    {
      id: 'quran-tajweed',
      title: 'Qur\'an Recitation & Tajweed',
      status: 'In Progress',
      completedLessons: 12,
      totalLessons: 20,
      percentage: 60,
      image: '/assets/images/courses and program.jpeg',
    },
    {
      id: 'islamic-studies',
      title: 'Islamic Studies (Foundations)',
      status: 'In Progress',
      completedLessons: 8,
      totalLessons: 16,
      percentage: 50,
      image: '/assets/images/courses and program.jpeg',
    },
    {
      id: 'arabic-beginner',
      title: 'Arabic Language (Beginner)',
      status: 'Not Started',
      completedLessons: 0,
      totalLessons: 18,
      percentage: 0,
      image: '/assets/images/courses and program.jpeg',
    },
    {
      id: 'hadith-seerah',
      title: 'Hadith & Seerah',
      status: 'Not Started',
      completedLessons: 0,
      totalLessons: 14,
      percentage: 0,
      image: '/assets/images/courses and program.jpeg',
    },
  ];

  const liveClasses = [
    {
      month: 'AUG',
      day: '10',
      title: 'Tafsir Session (Surah Al-Baqarah)',
      time: '4:00 PM - 5:30 PM',
      teacher: 'Ustadh Bilal Hassan',
    },
    {
      month: 'AUG',
      day: '12',
      title: 'Arabic Grammar (Nahw)',
      time: '4:00 PM - 5:30 PM',
      teacher: 'Dr. Fatimah Al-Zahra',
    },
    {
      month: 'AUG',
      day: '14',
      title: 'Qur\'an Memorization Review',
      time: '9:00 AM - 10:00 AM',
      teacher: 'Ustadh Ahmad Yusuf',
    },
  ];

  const featuredResources = [
    {
      title: 'Qur\'an Library',
      subtitle: 'Digital Mushaf & Tafsir',
      icon: BookOpen,
      href: '/portal/library',
    },
    {
      title: 'Islamic Books',
      subtitle: 'E-books & PDFs',
      icon: Book,
      href: '/portal/library',
    },
    {
      title: 'Audio Lectures',
      subtitle: 'Listen Anytime',
      icon: Headphones,
      href: '/portal/library',
    },
    {
      title: 'Study Guides',
      subtitle: 'Notes & Worksheets',
      icon: FileText,
      href: '/portal/library',
    },
  ];

  const recentActivity = [
    {
      title: 'You completed "The Life of Prophet Muhammad ﷺ"',
      time: '2 hours ago',
      icon: BookOpen,
    },
    {
      title: 'You started "Arabic Language (Beginner)"',
      time: 'Yesterday',
      icon: Play,
    },
    {
      title: 'You earned a new certificate: Qur\'an Recitation & Tajweed',
      time: '3 days ago',
      icon: Award,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      
      {/* Top Search & Profile Bar matching student dashboard.jpeg */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-[#E2E9E7] shadow-xs">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-[#A7B7B5] absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search courses, lessons, or topics..."
            className="w-full pl-11 pr-4 py-2.5 rounded-full bg-[#FAF9F6] border border-[#E2E9E7] text-xs md:text-sm text-[#2E2E2E] focus:outline-none focus:border-[#004D4A] transition-colors"
          />
        </div>

        <div className="flex items-center gap-4 self-end sm:self-auto">
          {/* Notifications */}
          <button 
            className="relative p-2.5 rounded-full bg-[#FAF9F6] text-[#2E2E2E] hover:text-[#004D4A] border border-[#E2E9E7] transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
          </button>

          {/* User Profile */}
          <div className="flex items-center gap-3 pl-3 border-l border-[#E2E9E7]">
            <div className="w-9 h-9 rounded-full bg-[#004D4A] text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
              {firstName[0]}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-bold text-[#2E2E2E] leading-tight">
                {studentName}
              </div>
              <div className="text-[10px] text-[#A7B7B5] font-semibold uppercase tracking-wider">
                Student
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#A7B7B5]" />
          </div>
        </div>
      </div>

      {/* Row 1: Welcome Greeting Banner + Overall Progress Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Welcome Banner (Spans 8 columns on lg) */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-8 border border-[#E2E9E7] shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="relative z-10 max-w-md">
            <h1 className="text-2xl sm:text-3xl font-bold font-headers text-[#004D4A] mb-2">
              Assalamu Alaikum, {firstName} 👋
            </h1>
            <p className="text-xs sm:text-sm text-[#5A6E6C] mb-6">
              Continue your journey of knowledge, faith and excellence.
            </p>

            <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#D4AF37]/30 mb-6">
              <p className="text-xs font-serif italic text-[#2E2E2E] leading-relaxed">
                “The best among you are those who learn the Qur'an and teach it.”
              </p>
              <div className="text-[10px] text-[#004D4A] font-bold mt-1">
                — Bukhari
              </div>
            </div>

            <Link
              href="/portal/academics"
              className="inline-flex items-center gap-2 bg-[#004D4A] hover:bg-[#0F3D38] text-white px-7 py-3 rounded-full text-xs font-semibold tracking-wider uppercase shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5"
            >
              <span>Continue Learning</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Arch Window Graphic on Right matching student dashboard.jpeg */}
          <div className="absolute right-4 bottom-0 top-0 w-64 lg:w-80 pointer-events-none opacity-90 hidden sm:block">
            <div className="relative w-full h-full">
              <div className="absolute bottom-0 right-0 w-full h-[90%] rounded-t-[140px] rounded-b-2xl overflow-hidden border-4 border-white shadow-lg bg-[#004D4A]/10">
                <Image
                  src="/assets/images/ilmverse.jpeg"
                  alt="Islamic Sanctuary"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white/40 via-transparent to-transparent" />
              </div>
            </div>
          </div>
        </div>

        {/* Course Mastery Progress Widget (Spans 4 columns on lg) */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-7 border border-[#E2E9E7] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#A7B7B5]">
                Overall Progress
              </h3>
              <span className="text-[11px] font-bold text-[#D4AF37] bg-[#D4AF37]/10 px-2.5 py-0.5 rounded-full">
                Level 3: Seekers Path
              </span>
            </div>

            {/* Circular Progress Ring */}
            <div className="flex items-center justify-center py-4">
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#F0F4F2"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#004D4A"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 - (251.2 * 68) / 100}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-3xl font-black font-headers text-[#004D4A]">68%</span>
                  <span className="text-[9px] uppercase font-bold tracking-widest text-[#A7B7B5]">Mastery</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics from student dashboard.jpeg */}
          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-[#E2E9E7] text-center">
            <div className="p-2 rounded-xl bg-[#FAF9F6]">
              <span className="text-lg font-bold text-[#004D4A] block">5</span>
              <span className="text-[9px] text-[#5A6E6C] font-semibold block uppercase">Completed</span>
            </div>
            <div className="p-2 rounded-xl bg-[#FAF9F6]">
              <span className="text-lg font-bold text-[#D4AF37] block">8</span>
              <span className="text-[9px] text-[#5A6E6C] font-semibold block uppercase">In Progress</span>
            </div>
            <div className="p-2 rounded-xl bg-[#FAF9F6]">
              <span className="text-lg font-bold text-[#0F3D38] block">2</span>
              <span className="text-[9px] text-[#5A6E6C] font-semibold block uppercase">Certificates</span>
            </div>
          </div>
        </div>

      </div>

      {/* Row 2: My Courses + Upcoming Live Classes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: My Courses (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#004D4A]" />
              <h2 className="text-xl font-bold font-headers text-[#004D4A]">
                My Courses
              </h2>
            </div>
            <Link href="/portal/academics" className="text-xs font-bold text-[#004D4A] hover:underline">
              View All →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {courses.map((course) => (
              <div
                key={course.id}
                className="bg-white rounded-2xl p-5 border border-[#E2E9E7] shadow-xs hover:shadow-md transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span 
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        course.status === 'In Progress' 
                          ? 'bg-[#004D4A]/10 text-[#004D4A]' 
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {course.status}
                    </span>
                    <ChevronRight className="w-4 h-4 text-[#A7B7B5] group-hover:translate-x-1 transition-transform" />
                  </div>

                  <h3 className="text-base font-bold text-[#2E2E2E] group-hover:text-[#004D4A] transition-colors mb-2">
                    {course.title}
                  </h3>

                  <div className="text-xs text-[#5A6E6C] mb-4">
                    {course.completedLessons} of {course.totalLessons} lessons
                  </div>
                </div>

                <div>
                  {/* Progress Bar */}
                  <div className="w-full h-2 rounded-full bg-[#FAF9F6] border border-[#E2E9E7] overflow-hidden mb-1.5">
                    <div 
                      className="h-full bg-[#004D4A] rounded-full transition-all duration-500" 
                      style={{ width: `${course.percentage}%` }}
                    />
                  </div>
                  <div className="text-right text-[10px] font-bold text-[#004D4A]">
                    {course.percentage}%
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Featured Resources Section matching student dashboard.jpeg */}
          <div className="pt-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#D4AF37]" />
                <h2 className="text-xl font-bold font-headers text-[#004D4A]">
                  Featured Resources
                </h2>
              </div>
              <Link href="/portal/library" className="text-xs font-bold text-[#004D4A] hover:underline">
                View All →
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {featuredResources.map((res, i) => {
                const RIcon = res.icon;
                return (
                  <Link
                    key={i}
                    href={res.href}
                    className="p-4 rounded-2xl bg-white border border-[#E2E9E7] hover:border-[#D4AF37] hover:shadow-sm transition-all group text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#004D4A]/5 text-[#004D4A] group-hover:bg-[#004D4A] group-hover:text-white flex items-center justify-center transition-colors mb-3">
                      <RIcon className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-bold text-[#2E2E2E] group-hover:text-[#004D4A] transition-colors">
                      {res.title}
                    </div>
                    <div className="text-[10px] text-[#A7B7B5] mt-0.5">
                      {res.subtitle}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Upcoming Live Classes & Recent Activity (4 cols) */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Upcoming Live Classes Widget */}
          <div className="bg-white rounded-3xl p-6 border border-[#E2E9E7] shadow-xs">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-red-500 animate-pulse" />
                <h3 className="text-sm font-bold text-[#004D4A]">
                  Upcoming Live Classes
                </h3>
              </div>
              <Link href="/portal/schedule-picker" className="text-[11px] font-bold text-[#004D4A] hover:underline">
                View All
              </Link>
            </div>

            <div className="space-y-4">
              {liveClasses.map((item, idx) => (
                <div 
                  key={idx}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-[#FAF9F6] border border-[#E2E9E7] hover:border-[#004D4A]/30 transition-all cursor-pointer group"
                >
                  {/* Date Badge */}
                  <div className="w-12 h-12 rounded-xl bg-white border border-[#E2E9E7] flex flex-col items-center justify-center shrink-0">
                    <span className="text-[9px] font-bold text-[#A7B7B5] uppercase">
                      {item.month}
                    </span>
                    <span className="text-sm font-black text-[#004D4A] leading-none">
                      {item.day}
                    </span>
                  </div>

                  {/* Class Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-[#2E2E2E] group-hover:text-[#004D4A] transition-colors truncate">
                      {item.title}
                    </h4>
                    <div className="text-[10px] text-[#5A6E6C] flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3 text-[#A7B7B5]" />
                      <span>{item.time}</span>
                    </div>
                    <div className="text-[10px] text-[#D4AF37] font-semibold mt-0.5">
                      {item.teacher}
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-[#A7B7B5] group-hover:translate-x-0.5 transition-transform shrink-0" />
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity Timeline */}
          <div className="bg-white rounded-3xl p-6 border border-[#E2E9E7] shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#004D4A]" />
                <h3 className="text-sm font-bold text-[#004D4A]">
                  Recent Activity
                </h3>
              </div>
              <span className="text-[11px] font-bold text-[#A7B7B5]">History</span>
            </div>

            <div className="space-y-3">
              {recentActivity.map((act, idx) => {
                const AIcon = act.icon;
                return (
                  <div key={idx} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-[#FAF9F6] transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-[#004D4A]/10 text-[#004D4A] flex items-center justify-center shrink-0 mt-0.5">
                      <AIcon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[#2E2E2E] font-medium leading-snug">
                        {act.title}
                      </p>
                      <span className="text-[10px] text-[#A7B7B5] block mt-0.5">
                        {act.time}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

      {/* Upgrade to Premium Banner matching student dashboard.jpeg */}
      <div className="rounded-3xl p-8 bg-gradient-to-r from-[#004D4A] to-[#0F3D38] text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-white/5 rounded-l-full pointer-events-none" />
        
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] flex items-center justify-center shrink-0">
            <GraduationCap className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-bold font-headers">
              Upgrade to Premium
            </h3>
            <p className="text-xs sm:text-sm text-white/80 max-w-xl">
              Get access to all courses, live classes, and exclusive resources.
            </p>
          </div>
        </div>

        <Link
          href="/pricing"
          className="bg-[#D4AF37] hover:bg-[#F6D77A] text-[#0F3D38] font-bold text-xs uppercase tracking-wider px-8 py-3.5 rounded-full shadow-lg transition-all shrink-0 relative z-10 hover:scale-105"
        >
          Go Premium →
        </Link>
      </div>

    </div>
  );
}
