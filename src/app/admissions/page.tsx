'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { motion, Variants } from 'framer-motion';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { ChevronRight, ClipboardCheck, Video, UserPlus, PlayCircle, ShieldCheck, Clock, RefreshCcw, CreditCard, MailQuestion } from 'lucide-react';

const FADE_UP: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100, damping: 20 } }
};

const STAGGER: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
};

// Reusable Magnetic Button Component
function MagneticButton({ children, className, href, variant = "default" }: { children: React.ReactNode, className?: string, href: string, variant?: "default" | "outline" }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouse = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const { clientX, clientY } = e;
    const { height, width, left, top } = ref.current!.getBoundingClientRect();
    const middleX = clientX - (left + width / 2);
    const middleY = clientY - (top + height / 2);
    setPosition({ x: middleX * 0.1, y: middleY * 0.1 });
  };

  const reset = () => {
    setPosition({ x: 0, y: 0 });
  };

  const isOutline = variant === "outline";
  const baseClasses = cn(
    buttonVariants({ variant: isOutline ? "outline" : "default", size: "lg" }),
    "rounded-full px-5 sm:px-8 py-4 sm:py-6 text-md whitespace-normal! h-auto max-w-full text-center transition-all duration-300 relative overflow-hidden group",
    !isOutline && "shadow-lg hover:shadow-xl",
    isOutline && "border-2 border-secondary text-secondary hover:bg-secondary hover:text-white",
    className
  );

  return (
    <motion.div animate={{ x: position.x, y: position.y }} transition={{ type: "spring" as const, stiffness: 150, damping: 15, mass: 0.1 }} className="max-w-full">
      <Link 
        href={href}
        ref={ref}
        onMouseMove={handleMouse}
        onMouseLeave={reset}
        className={baseClasses}
      >
        <div className="absolute inset-0 bg-white/20 translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-300 pointer-events-none" />
        <span className="relative z-10 flex items-center justify-center">{children}</span>
      </Link>
    </motion.div>
  );
}

export default function AdmissionsPage() {
  return (
    <main className="bg-white min-h-screen">
      {/* PAGE HEADER */}
      <section className="relative pt-16 pb-20 bg-bg-neutral overflow-hidden text-center border-b border-border-subtle">
        <div className="absolute inset-0 bg-[url('/assets/grid.svg')] opacity-[0.03] pointer-events-none" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/4" />
        
        <div className="w-full max-w-5xl mx-auto px-6 relative z-10">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold mb-6 tracking-wide"
          >
            <ClipboardCheck className="w-4 h-4" />
            ADMISSIONS CENTER
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-5xl font-headers font-bold text-secondary mb-6 leading-tight"
          >
            Begin Your Journey
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-3xl mx-auto text-lg text-text-body leading-relaxed mb-10"
          >
            Review our enrollment process, policies, and frequently asked questions before submitting your application. We pride ourselves on structured placement.
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <MagneticButton href="/assessment" className="w-full sm:w-auto bg-primary text-white hover:bg-primary-hover">
              Book Live Video Assessment <Video className="ml-2 w-5 h-5" />
            </MagneticButton>
            <MagneticButton href="#policies" variant="outline" className="w-full sm:w-auto">
              Review Academy Policies
            </MagneticButton>
          </motion.div>
        </div>
      </section>

      {/* APPLICATION PROCESS EXPLANATION */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="absolute left-1/2 -translate-x-1/2 top-40 w-full max-w-lg h-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none -z-10" />
        
        <div className="w-full max-w-4xl mx-auto px-6">
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={FADE_UP}
            className="text-center mb-16"
          >
            <span className="text-primary mb-3 block font-bold tracking-widest text-sm">
              THE JOURNEY BEGINS
            </span>
            <h2 className="text-3xl md:text-4xl font-headers font-bold text-secondary mb-4">Our Professional Enrollment Process</h2>
            <p className="text-text-body max-w-2xl mx-auto text-lg">
              We don't just "match" students with teachers. We follow a strict 4-step institutional protocol to ensure long-term academic success.
            </p>
          </motion.div>

          <motion.div 
            variants={STAGGER}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="flex flex-col gap-8"
          >
            {/* Step 1 */}
            <motion.div variants={FADE_UP} className="bg-bg-neutral/80 backdrop-blur-sm rounded-3xl p-8 border border-border-subtle shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col sm:flex-row gap-6 items-start group">
              <div className="bg-primary text-white w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl shrink-0 shadow-md group-hover:scale-110 group-hover:rotate-3 transition-transform">1</div>
              <div>
                <h3 className="text-xl font-bold text-secondary mb-3 flex items-center gap-3">
                  <UserPlus className="w-6 h-6 text-primary group-hover:animate-bounce" /> Create Your Secure Account
                </h3>
                <p className="text-text-body leading-relaxed text-lg">Sign up instantly to gain access to the Ilmvers Student & Parent Portal. This is your central hub for lessons, feedback, and tracking.</p>
              </div>
            </motion.div>

            {/* Step 2 */}
            <motion.div variants={FADE_UP} className="bg-bg-neutral/80 backdrop-blur-sm rounded-3xl p-8 border border-border-subtle shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col sm:flex-row gap-6 items-start group">
              <div className="bg-primary text-white w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl shrink-0 shadow-md group-hover:scale-110 group-hover:-rotate-3 transition-transform">2</div>
              <div>
                <h3 className="text-xl font-bold text-secondary mb-3 flex items-center gap-3">
                  <ClipboardCheck className="w-6 h-6 text-primary group-hover:animate-pulse" /> Select Your Path & Assessment
                </h3>
                <p className="text-[#5A6E6C] leading-relaxed text-lg">Book the free placement assessment. Your level and fee are confirmed with you after that conversation.</p>
              </div>
            </motion.div>

            {/* Step 3 */}
            <motion.div variants={FADE_UP} className="bg-bg-neutral/80 backdrop-blur-sm rounded-3xl p-8 border border-border-subtle shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col sm:flex-row gap-6 items-start group">
              <div className="bg-primary text-white w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl shrink-0 shadow-md group-hover:scale-110 group-hover:rotate-3 transition-transform">3</div>
              <div>
                <h3 className="text-xl font-bold text-secondary mb-3 flex items-center gap-3">
                  <ShieldCheck className="w-6 h-6 text-primary group-hover:animate-pulse" /> Instructor Matchmaking
                </h3>
                <p className="text-text-body leading-relaxed text-lg">After the assessment, you are matched with a teacher for your level. The timetable is agreed with you.</p>
              </div>
            </motion.div>

            {/* Step 4 */}
            <motion.div variants={FADE_UP} className="bg-bg-neutral/80 backdrop-blur-sm rounded-3xl p-8 border border-border-subtle shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col sm:flex-row gap-6 items-start group">
              <div className="bg-primary text-white w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl shrink-0 shadow-md group-hover:scale-110 group-hover:-rotate-3 transition-transform">4</div>
              <div>
                <h3 className="text-xl font-bold text-secondary mb-3 flex items-center gap-3">
                  <PlayCircle className="w-6 h-6 text-primary group-hover:animate-pulse" /> Start Your Live Lessons
                </h3>
                <p className="text-text-body leading-relaxed text-lg">Unlock your full portal features and join your interactive classrooms directly through the portal. Your journey to excellence begins here.</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* IMPORTANT POLICIES */}
      <section className="py-24 bg-secondary text-white relative overflow-hidden" id="policies">
        {/* Decorative Grid */}
        <div className="absolute inset-0 bg-[url('/assets/grid.svg')] opacity-10 pointer-events-none" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/2" />
        
        <div className="w-full max-w-6xl mx-auto px-6 relative z-10">
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={FADE_UP}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-headers font-bold mb-4">Institutional Policies</h2>
            <p className="text-white/80 max-w-2xl mx-auto text-lg">Transparency builds trust. Here is how we govern classes.</p>
          </motion.div>
          
          <motion.div 
            variants={STAGGER}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 gap-6"
          >
            <motion.div variants={FADE_UP} className="bg-white/10 backdrop-blur-md rounded-3xl p-5 sm:p-8 border border-white/20 hover:bg-white/15 hover:shadow-2xl hover:-translate-y-1 transition-all group">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-primary/20 transition-all">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
                <h4 className="text-2xl font-bold text-white">Attendance Policy</h4>
              </div>
              <p className="text-white/80 leading-relaxed text-lg">Students are expected to attend all scheduled classes on time. Unexcused absence without 24-hours prior notice via the portal will result in a forfeited lesson to respect the teacher's time.</p>
            </motion.div>
            
            <motion.div variants={FADE_UP} className="bg-white/10 backdrop-blur-md rounded-3xl p-5 sm:p-8 border border-white/20 hover:bg-white/15 hover:shadow-2xl hover:-translate-y-1 transition-all group">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-primary/20 transition-all">
                  <RefreshCcw className="w-6 h-6 text-primary" />
                </div>
                <h4 className="text-2xl font-bold text-white">Rescheduling Policy</h4>
              </div>
              <p className="text-white/80 leading-relaxed text-lg">If an emergency arises, lessons may be rescheduled directly through your Student Portal provided you give a minimum of 4 hours notice. Make-up classes depend on teacher availability.</p>
            </motion.div>
            
            <motion.div variants={FADE_UP} className="bg-white/10 backdrop-blur-md rounded-3xl p-5 sm:p-8 border border-white/20 hover:bg-white/15 hover:shadow-2xl hover:-translate-y-1 transition-all group">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-primary/20 transition-all">
                  <UserPlus className="w-6 h-6 text-primary" />
                </div>
                <h4 className="text-2xl font-bold text-white">Teacher Assignment</h4>
              </div>
              <p className="text-white/80 leading-relaxed text-lg">Consistency matters. You are permanently assigned to your tutor. However, if there is a scheduling conflict or learning mismatch, Admissions will facilitate a re-assignment transparently.</p>
            </motion.div>
            
            <motion.div variants={FADE_UP} className="bg-white/10 backdrop-blur-md rounded-3xl p-5 sm:p-8 border border-white/20 hover:bg-white/15 hover:shadow-2xl hover:-translate-y-1 transition-all group">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-primary/20 transition-all">
                  <CreditCard className="w-6 h-6 text-primary" />
                </div>
                <h4 className="text-2xl font-bold text-white">Billing & Pause Policy</h4>
              </div>
              <p className="text-white/80 leading-relaxed text-lg">Tuition is billed on a cyclic monthly subscription. You may pause your subscription for vacations up to two times a year via the billing portal without losing your enrollment slot.</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* PRACTICAL FAQS */}
      <section className="py-24 bg-bg-neutral relative overflow-hidden">
        <div className="absolute -left-32 -bottom-32 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="w-full max-w-4xl mx-auto px-6 relative z-10">
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={FADE_UP}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-headers font-bold text-secondary mb-4">Practical Student FAQs</h2>
            <p className="text-text-body text-lg">Common questions before starting your journey.</p>
          </motion.div>
          
          <motion.div 
            variants={STAGGER}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 gap-8 gap-y-12 mb-20"
          >
            <motion.div variants={FADE_UP} className="border-b border-border-subtle pb-6 hover:border-primary transition-colors duration-300">
              <h4 className="text-lg font-bold text-secondary mb-3 flex items-start gap-2">
                <span className="text-primary mt-1">•</span> Are lessons live or pre-recorded?
              </h4>
              <p className="text-[#5A6E6C] pl-4">Core classes are live and opened from the student portal, with the teacher correcting you in the session.</p>
            </motion.div>
            
            <motion.div variants={FADE_UP} className="border-b border-border-subtle pb-6 hover:border-primary transition-colors duration-300">
              <h4 className="text-lg font-bold text-secondary mb-3 flex items-start gap-2">
                <span className="text-primary mt-1">•</span> Can I request a female tutor?
              </h4>
              <p className="text-[#5A6E6C] pl-4">Yes. Say so on the assessment form and the team will match a sister or a young girl with a female instructor when one is available.</p>
            </motion.div>
            
            <motion.div variants={FADE_UP} className="border-b border-border-subtle pb-6 hover:border-primary transition-colors duration-300">
              <h4 className="text-lg font-bold text-secondary mb-3 flex items-start gap-2">
                <span className="text-primary mt-1">•</span> How do parents monitor children?
              </h4>
              <p className="text-[#5A6E6C] pl-4">Parents can follow attendance, homework, and teacher notes for their children from the parent area.</p>
            </motion.div>

            <motion.div variants={FADE_UP} className="border-b border-border-subtle pb-6 hover:border-primary transition-colors duration-300">
              <h4 className="text-lg font-bold text-secondary mb-3 flex items-start gap-2">
                <span className="text-primary mt-1">•</span> What if my teacher is absent?
              </h4>
              <p className="text-[#5A6E6C] pl-4">If a teacher cannot attend, the academy contacts you to arrange another time.</p>
            </motion.div>
          </motion.div>
          
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={FADE_UP}
            className="text-center bg-white rounded-3xl p-6 sm:p-12 border border-border-subtle shadow-xl hover:shadow-2xl transition-shadow"
          >
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <MailQuestion className="w-10 h-10 text-primary" />
            </div>
            <h4 className="text-3xl font-headers font-bold text-secondary mb-3">Have a specific placement question?</h4>
            <p className="text-text-body text-lg mb-8">Our support team is available to assist you with any custom requirements.</p>
            <MagneticButton href="/contact" variant="outline">
              Contact the Support Desk
            </MagneticButton>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
