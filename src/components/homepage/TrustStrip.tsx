'use client';
import { motion } from 'framer-motion';

export function TrustStrip() {
  const stats = [
    { label: 'Active Students', value: '1,500+' },
    { label: 'Countries Reached', value: '45+' },
    { label: 'Certified Instructors', value: '120+' },
    { label: 'Student Retention', value: '98%' }
  ];

  return (
    <section className="py-16 md:py-20 border-y border-border bg-background">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-12 md:gap-0 md:divide-x divide-border">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.6 }}
              className="flex-1 w-full text-center px-4"
            >
              <h3 className="text-5xl md:text-6xl font-light text-primary mb-3 font-headers">
                {stat.value}
              </h3>
              <p className="text-sm md:text-xs lg:text-sm font-semibold tracking-[0.2em] uppercase text-muted-foreground">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
export default TrustStrip;
