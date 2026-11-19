'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';

const methodologies = [
  {
    title: "Recitation Before Speed",
    desc: "We train the tongue to recite precisely. Makharij (articulation) and Tajweed are non-negotiable foundations before advancing in speed.",
    color: "text-primary"
  },
  {
    title: "Meaning Behind The Words",
    desc: "Arabic is taught as the key to understanding Revelation, not just conversational utility. We focus on Qur'anic morphology.",
    color: "text-secondary"
  },
  {
    title: "Constant Revision (Muraja'ah)",
    desc: "A Hafiz who does not revise will forget. Our system bakes structured revision into every single class.",
    color: "text-primary"
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } }
};

export function Methodology() {
  return (
    <section className="py-20 bg-background">
      <div className="w-full max-w-6xl mx-auto px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="mb-4 text-4xl font-bold font-headers text-foreground">How We Teach at Ilmvers Institute</h2>
          <p className="mb-12 max-w-2xl mx-auto text-muted-foreground text-lg">
            We believe in transformation, not just transaction. Our pedagogy ensures long-term retention and true comprehension.
          </p>
        </motion.div>

        <motion.div 
          className="grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 text-left"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {methodologies.map((method, index) => (
            <motion.div key={index} variants={itemVariants} className="h-full">
              <Card className="h-full border-border bg-card shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-8">
                  <h4 className={`text-xl font-semibold mb-3 ${method.color}`}>{method.title}</h4>
                  <p className="text-sm text-text-body leading-relaxed">{method.desc}</p>
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
          <Link href="/methodology" className="inline-flex items-center justify-center font-bold outline-none transition-all rounded-full border-2 border-secondary text-secondary hover:bg-secondary hover:text-white px-8 py-6 text-md w-max">
            Read Full Academic Methodology
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
