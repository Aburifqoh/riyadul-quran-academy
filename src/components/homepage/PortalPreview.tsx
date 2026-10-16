'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button, buttonVariants } from '@/components/ui/button';
import { Calendar, FileText, TrendingUp } from 'lucide-react';
import { useState } from 'react';

export function PortalPreview() {
  const [activeTab, setActiveTab] = useState("schedule");

  return (
    <section className="py-16 bg-secondary text-white">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-6xl mx-auto px-8 grid grid-cols-2 max-lg:grid-cols-1 items-center gap-16">
        
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6 }}
        >
          <span className="text-primary mb-2 block font-bold uppercase tracking-widest text-sm">
            Platform Feature
          </span>
          <h2 className="mb-4 text-4xl font-bold font-headers">Your Ilmvers Student Portal</h2>
          <p className="mb-8 text-white/90 text-lg">
            No more guessing what your child is learning or hunting through WhatsApp for Zoom links. Experience complete educational oversight.
          </p>

          <TabsList className="flex flex-col !h-auto min-h-min bg-transparent items-start gap-4 mb-8 space-x-0 p-0">
              
              <TabsTrigger 
                value="schedule" 
                className="relative flex items-start w-full justify-start p-4 rounded-xl hover:bg-white/5 transition-all text-left whitespace-normal border border-transparent data-active:!bg-transparent data-active:!border-transparent"
              >
                {activeTab === "schedule" && (
                  <motion.div layoutId="portalTab" className="absolute inset-0 bg-white/10 border border-white/20 rounded-xl" transition={{ type: "spring" as const, stiffness: 300, damping: 25 }} />
                )}
                <div className="relative z-10 flex items-start gap-3 w-full">
                  <Calendar className="w-6 h-6 text-primary shrink-0 mt-1" />
                  <div className="flex flex-col gap-1">
                    <strong className="text-white text-lg">Class Schedule & Links</strong>
                    <span className="text-sm text-white/70 font-normal">
                      Never miss a lesson. All your live sessions are accessible via one click.
                    </span>
                  </div>
                </div>
              </TabsTrigger>

              <TabsTrigger 
                value="homework" 
                className="relative flex items-start w-full justify-start p-4 rounded-xl hover:bg-white/5 transition-all text-left whitespace-normal border border-transparent data-active:!bg-transparent data-active:!border-transparent"
              >
                {activeTab === "homework" && (
                  <motion.div layoutId="portalTab" className="absolute inset-0 bg-white/10 border border-white/20 rounded-xl" transition={{ type: "spring" as const, stiffness: 300, damping: 25 }} />
                )}
                <div className="relative z-10 flex items-start gap-3 w-full">
                  <FileText className="w-6 h-6 text-primary shrink-0 mt-1" />
                  <div className="flex flex-col gap-1">
                    <strong className="text-white text-lg">Lesson Notes & Homework</strong>
                    <span className="text-sm text-white/70 font-normal">
                      Review exact Tajweed corrections and memorization checklists.
                    </span>
                  </div>
                </div>
              </TabsTrigger>

              <TabsTrigger 
                value="progress" 
                className="relative flex items-start w-full justify-start p-4 rounded-xl hover:bg-white/5 transition-all text-left whitespace-normal border border-transparent data-active:!bg-transparent data-active:!border-transparent"
              >
                {activeTab === "progress" && (
                  <motion.div layoutId="portalTab" className="absolute inset-0 bg-white/10 border border-white/20 rounded-xl" transition={{ type: "spring" as const, stiffness: 300, damping: 25 }} />
                )}
                <div className="relative z-10 flex items-start gap-3 w-full">
                  <TrendingUp className="w-6 h-6 text-primary shrink-0 mt-1" />
                  <div className="flex flex-col gap-1">
                    <strong className="text-white text-lg">Parent View & Reports</strong>
                    <span className="text-sm text-white/70 font-normal">
                      Monitor multiple children and track monthly growth effortlessly.
                    </span>
                  </div>
                </div>
              </TabsTrigger>

            </TabsList>

            <Link href="/login" className={buttonVariants({ size: "lg", className: "rounded-full shadow-md px-8 py-6 text-md w-max" })}>
              Access Parent Portal
            </Link>

            {/* Dash Images Column (Hidden visually within TabsTrigger but logically separated in UI) */}
            {/* The interactive visual column is placed here to satisfy the DOM order, but positioned globally via CSS grid */}
            
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="w-full"
        >
          <div className="bg-white/20 backdrop-blur-xl border border-white/30 shadow-[0_30px_60px_rgba(0,0,0,0.4)] w-full h-[450px] bg-[linear-gradient(rgba(0,0,0,0.3),rgba(0,0,0,0.7)),url('/assets/tablet_study.png')] bg-cover bg-center rounded-2xl flex items-center justify-center p-5 relative overflow-hidden">
            
            {/* View 1: Schedule */}
            <TabsContent value="schedule" className="w-full h-full m-0 data-[state=inactive]:hidden">
              <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
                className="bg-background w-full h-full rounded-xl overflow-hidden flex flex-col shadow-xl"
              >
                <div className="h-12 bg-muted border-b border-border flex items-center px-4">
                  <strong className="text-muted-foreground text-sm">Schedule Preview</strong>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="text-foreground text-lg font-bold mb-4">Welcome Back, Aishah</h3>
                  <div className="border-2 border-dashed border-primary p-4 rounded-lg text-center mb-4 bg-primary/5 flex flex-col items-center">
                    <h4 className="text-secondary font-bold mb-2">Live Class Starts in 15 mins</h4>
                    <Button className="rounded-full w-max">Join Live Class Now</Button>
                  </div>
                  <p className="text-muted-foreground text-sm"><strong>Upcoming:</strong> Qur'an Level 2 (Tomorrow 10:00AM)</p>
                </div>
              </motion.div>
            </TabsContent>

            {/* View 2: Homework/Notes */}
            <TabsContent value="homework" className="w-full h-full m-0 data-[state=inactive]:hidden">
              <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
                className="bg-background w-full h-full rounded-xl overflow-hidden flex flex-col shadow-xl"
              >
                <div className="h-12 bg-muted border-b border-border flex items-center px-4">
                  <strong className="text-muted-foreground text-sm">Teacher View Preview</strong>
                </div>
                <div className="p-5 flex-1 flex flex-col overflow-y-auto">
                  <h3 className="text-foreground text-lg font-bold mb-4">Recent Feedback</h3>
                  <div className="border border-border rounded-lg p-3 mb-3 bg-muted/50">
                    <strong className="text-primary block text-sm mb-1">Ustadh Tariq wrote (Today):</strong>
                    <p className="text-foreground text-sm">"MashaAllah, excellent improvement on the Ikhfa. For homework, please trace Surah Al-Mulk ayat 1-5 and send voice note."</p>
                  </div>
                  <div className="border border-border rounded-lg p-3 bg-muted/50">
                    <strong className="text-primary block text-sm mb-1">Ustadh Tariq wrote (Monday):</strong>
                    <p className="text-foreground text-sm">"Focus heavily on the letter 'Kha'. Keep reading page 14."</p>
                  </div>
                </div>
              </motion.div>
            </TabsContent>

            {/* View 3: Progress Tracker */}
            <TabsContent value="progress" className="w-full h-full m-0 data-[state=inactive]:hidden">
              <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
                className="bg-background w-full h-full rounded-xl overflow-hidden flex flex-col shadow-xl"
              >
                <div className="h-12 bg-muted border-b border-border flex items-center px-4">
                  <strong className="text-muted-foreground text-sm">Parent Overview</strong>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="text-foreground text-lg font-bold mb-4">Student Tracker</h3>
                  <div className="flex gap-4 mb-5">
                    <div className="flex-1 bg-blue-50 p-3 rounded-lg border border-blue-100">
                      <span className="text-blue-600 text-xs font-bold block mb-1">ATTENDANCE</span>
                      <strong className="text-blue-800">98% This Month</strong>
                    </div>
                    <div className="flex-1 bg-amber-50 p-3 rounded-lg border border-amber-100">
                      <span className="text-amber-600 text-xs font-bold block mb-1">HIFZ GOAL</span>
                      <strong className="text-amber-800">2 Juz Completed</strong>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full mb-2 overflow-hidden">
                    <div className="w-[75%] h-full bg-primary rounded-full"></div>
                  </div>
                  <p className="text-muted-foreground text-xs text-right">Level 2 Fluency (75% Complete)</p>
                </div>
              </motion.div>
            </TabsContent>

          </div>
        </motion.div>
      </Tabs>
    </section>
  );
}
