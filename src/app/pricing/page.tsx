'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { CheckCircle2, ShieldCheck } from 'lucide-react';

export default function PricingPage() {
  const { user } = useAuth();
  const [days, setDays] = useState(2);
  const [students, setStudents] = useState(1);
  const [prices, setPrices] = useState({ group: 64, oneToOne: 80, ijazah: 96 });

  useEffect(() => {
    let familyMultiplier = 0;
    for (let i = 1; i <= students; i++) {
      if (i === 1) familyMultiplier += 1.0;
      else if (i === 2) familyMultiplier += 0.95;
      else familyMultiplier += 0.90;
    }
    const hoursPerMonth = days * 4; 
    setPrices({
      group: Math.round(8 * hoursPerMonth * familyMultiplier),
      oneToOne: Math.round(10 * hoursPerMonth * familyMultiplier),
      ijazah: Math.round(12 * hoursPerMonth * familyMultiplier)
    });
  }, [days, students]);

  return (
    <main className="bg-background min-h-screen text-foreground font-sans pt-24 pb-20">
      
      {/* Editorial Header */}
      <section className="px-6 md:px-12 max-w-5xl mx-auto text-center mb-24">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border text-muted-foreground text-xs font-semibold tracking-widest uppercase mb-8">
          <ShieldCheck className="w-4 h-4 text-primary" />
          Transparent Investment
        </div>
        <h1 className="text-5xl md:text-7xl font-headers font-bold text-secondary leading-tight mb-8">
          Invest in <span className="text-accent italic font-serif">Sacred Knowledge</span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto font-light">
          We believe in accessible, high-quality Islamic education. Use our calculator below to configure a plan that fits your family's needs.
        </p>
      </section>

      {/* Calculator (Elegant Style) */}
      <section className="px-6 md:px-12 max-w-4xl mx-auto mb-24 relative z-20">
        <div className="bg-card border border-border p-8 md:p-12 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
          <h2 className="text-2xl font-headers font-bold text-secondary mb-8">Tuition Configurator</h2>
          
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <div className="flex justify-between items-end mb-4">
                <label className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">Days Per Week</label>
                <span className="text-2xl font-headers font-bold text-primary">{days}</span>
              </div>
              <input 
                type="range" min="2" max="5" value={days} 
                onChange={(e) => setDays(parseInt(e.target.value))} 
                className="w-full h-1 bg-border appearance-none cursor-pointer accent-primary" 
              />
              <p className="text-xs text-muted-foreground mt-4 font-light">Calculations assume 1 hour per day, 4 weeks per month.</p>
            </div>

            <div>
              <div className="flex justify-between items-end mb-4">
                <label className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">Students</label>
                <span className="text-2xl font-headers font-bold text-secondary">{students}</span>
              </div>
              <input 
                type="range" min="1" max="5" value={students} 
                onChange={(e) => setStudents(parseInt(e.target.value))} 
                className="w-full h-1 bg-border appearance-none cursor-pointer accent-secondary" 
              />
              <p className="text-xs text-muted-foreground mt-4 font-light">Automatic 5% off 2nd student, 10% off 3rd+.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Elegant Pricing Cards */}
      <section className="px-6 md:px-12 max-w-7xl mx-auto mb-32">
        <div className="grid lg:grid-cols-3 gap-8 items-stretch">
          
          {/* Group */}
          <div className="bg-card border border-border p-10 flex flex-col relative transition-all duration-300 hover:border-primary/50 hover:shadow-lg">
            <h3 className="text-2xl font-headers font-bold text-secondary mb-2">Group Classes</h3>
            <p className="text-sm text-muted-foreground mb-8 font-light h-10">Focused group learning (max 5 students) for shared progression.</p>
            
            <div className="mb-8 flex items-start gap-1">
              <span className="text-2xl font-medium text-muted-foreground mt-2">$</span>
              <span className="text-6xl font-headers font-bold text-secondary">{prices.group}</span>
              <span className="text-sm text-muted-foreground self-end mb-2">/mo</span>
            </div>
            
            <ul className="space-y-4 mb-12 flex-1 text-sm font-medium">
              <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-primary" /> Shared Group Rooms</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-primary" /> Dedicated Instructor</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-primary" /> Core Curriculum Access</li>
            </ul>
            
            <Link href={`${user ? '/payment' : '/register'}?plan=group`} className="w-full py-4 text-center border border-secondary text-secondary font-bold uppercase tracking-widest text-xs hover:bg-secondary hover:text-white transition-colors">
              Select Plan
            </Link>
          </div>

          {/* One-to-One (Premium/Recommended) */}
          <div className="bg-secondary text-background border border-accent/50 p-10 flex flex-col relative shadow-2xl lg:-mt-4 lg:mb-4 transform transition-all duration-300 hover:-translate-y-2">
            <div className="absolute top-0 right-0 p-4">
              <span className="text-[10px] font-bold tracking-widest uppercase text-accent border border-accent px-3 py-1">Recommended</span>
            </div>
            <h3 className="text-2xl font-headers font-bold text-accent mb-2">One-to-One</h3>
            <p className="text-sm text-background/70 mb-8 font-light h-10">Personalized, intensive private classes for accelerated mastery.</p>
            
            <div className="mb-8 flex items-start gap-1">
              <span className="text-2xl font-medium text-accent mt-2">$</span>
              <span className="text-6xl font-headers font-bold text-white">{prices.oneToOne}</span>
              <span className="text-sm text-background/70 self-end mb-2">/mo</span>
            </div>
            
            <ul className="space-y-4 mb-12 flex-1 text-sm font-medium text-background/90">
              <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-accent" /> Tailored Curriculum</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-accent" /> 100% Full Attention</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-accent" /> Detailed Progress Reports</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-accent" /> Priority Scheduling</li>
            </ul>
            
            <Link href={`${user ? '/payment' : '/register'}?plan=onetoone`} className="w-full py-4 text-center bg-accent text-secondary font-bold uppercase tracking-widest text-xs hover:bg-white hover:text-secondary transition-colors">
              Select Plan
            </Link>
          </div>

          {/* Ijazah */}
          <div className="bg-card border border-border p-10 flex flex-col relative transition-all duration-300 hover:border-primary/50 hover:shadow-lg">
            <h3 className="text-2xl font-headers font-bold text-secondary mb-2">Ijazah Track</h3>
            <p className="text-sm text-muted-foreground mb-8 font-light h-10">Premium program for serious students pursuing formal certification.</p>
            
            <div className="mb-8 flex items-start gap-1">
              <span className="text-2xl font-medium text-muted-foreground mt-2">$</span>
              <span className="text-6xl font-headers font-bold text-secondary">{prices.ijazah}</span>
              <span className="text-sm text-muted-foreground self-end mb-2">/mo</span>
            </div>
            
            <ul className="space-y-4 mb-12 flex-1 text-sm font-medium">
              <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-primary" /> Qualified Muqri Assignment</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-primary" /> Advanced Qira'at Available</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-primary" /> Sanad Certification Track</li>
            </ul>
            
            <Link href={`${user ? '/payment' : '/register'}?plan=ijazah`} className="w-full py-4 text-center border border-secondary text-secondary font-bold uppercase tracking-widest text-xs hover:bg-secondary hover:text-white transition-colors">
              Select Plan
            </Link>
          </div>

        </div>
      </section>
      
      {/* Editorial Note on Sincerity */}
      <section className="px-6 py-24 bg-primary text-white text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-headers font-bold mb-8 italic font-serif">"No Sincere Learner Should Be Turned Away"</h2>
          <p className="text-lg text-white/80 leading-relaxed mb-10 font-light">
            If you are in need of financial support, please reach out to us. We believe the knowledge of Allāh's Book belongs to every sincere heart, regardless of means. We offer confidential scholarship options.
          </p>
          <Link href="/contact?type=scholarship" className="inline-block border-b-2 border-accent pb-1 text-accent font-bold tracking-widest uppercase hover:text-white hover:border-white transition-colors">
            Apply for Scholarship
          </Link>
        </div>
      </section>

    </main>
  );
}
