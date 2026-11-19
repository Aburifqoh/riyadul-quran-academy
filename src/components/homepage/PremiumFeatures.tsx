'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';

import { FolderOpen, Bot, Video, CalendarCheck, Inbox, LineChart, Award, Calculator, ScrollText } from 'lucide-react';

const features = [
  { icon: FolderOpen, title: "The Academic Vault", desc: "A secure library where instructors share syllabus PDFs, audio recordings, and Hifz trackers directly to your portal.", highlight: false },
  { icon: Bot, title: "Ilmvers AI Tutor", desc: "An on-demand AI learning companion grounded in the authentic Sunnah. Safely explore Tajweed, Grammar, and Vocabulary 24/7.", highlight: true },
  { icon: Video, title: "One-Click Classroom", desc: "No external links or Zoom IDs needed. Students join lesson rooms with a single click directly inside their portal.", highlight: false },
  { icon: CalendarCheck, title: "Live Attendance Engine", desc: "No more manual check-ins. Attendance is automatically logged the moment a student joins a live class.", highlight: false },
  { icon: Inbox, title: "Homework Inbox", desc: "A dedicated submission channel for assignments. Teachers provide direct feedback and grade work within the dashboard.", highlight: false },
  { icon: LineChart, title: "Progress Visualization", desc: "Parents see real-time, visual progress bars for Hifz and Arabic milestones. No more wondering where your child stands.", highlight: false },
  { icon: Award, title: "Digital Badge System", desc: "Students earn authentic merit badges for consistency, character growth, and successful Hifz milestones.", highlight: false },
  { icon: Calculator, title: "Smart Tuition Calculator", desc: "Total transparency. Calculate your monthly tuition based on your days per week, family size, and whether you prefer Group or Private tracks.", highlight: false },
  { icon: ScrollText, title: "Verified Certifications", desc: "Track Ijazah progress and receive digital certificates with unique QR-verification for authentic merit recognition.", highlight: false }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

export function PremiumFeatures() {
  return (
    <section className="py-20 bg-bg-neutral">
      <div className="w-full max-w-6xl mx-auto px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6 }}
        >
          <span className="text-primary mb-2 block font-bold uppercase tracking-widest text-sm">Full Ecosystem</span>
          <h2 className="mb-8 text-4xl font-bold font-headers text-foreground">Premium Institutional Features</h2>
          <p className="mb-12 max-w-2xl mx-auto text-secondary text-lg">
            We go beyond standard video calls by offering a full suite of enterprise-grade tools designed specifically for Islamic education.
          </p>
        </motion.div>

        <motion.div 
          className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 text-left"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
        >
          {features.map((feat, index) => (
            <motion.div key={index} variants={itemVariants} className="h-full">
              <Card className={`h-full border-border bg-card shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 ${feat.highlight ? 'border-2 border-primary' : ''}`}>
                <CardContent className="p-6">
                  <div className={`mb-4 flex items-center justify-start ${feat.highlight ? 'drop-shadow-md text-primary' : 'text-secondary'}`}>
                    <feat.icon className="w-10 h-10" />
                  </div>
                  <h4 className={`text-lg font-semibold mb-2 ${feat.highlight ? 'text-primary' : 'text-secondary'}`}>{feat.title}</h4>
                  <p className="text-sm text-text-body">{feat.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-16"
        >
          <Link href="/pricing" className={buttonVariants({ size: "lg", className: "rounded-full shadow-md px-8 py-6 text-md" })}>
            Check All Tuition Plans &amp; Discounts
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
