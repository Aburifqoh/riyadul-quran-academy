'use client';
import { motion } from 'framer-motion';

export function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Book Assessment",
      description: "Schedule a free evaluation with one of our certified instructors to determine your current level and goals."
    },
    {
      number: "02",
      title: "Get Custom Plan",
      description: "Receive a personalized learning roadmap and get matched with the perfect teacher for your learning style."
    },
    {
      number: "03",
      title: "Start Learning",
      description: "Access our interactive portal, join your 1-on-1 sessions, and embark on your journey with the Qur'an."
    },
    {
      number: "04",
      title: "Track Progress",
      description: "Review detailed feedback, earn certificates upon completing levels, and ultimately achieve Ijazah."
    }
  ];

  return (
    <section className="py-24 md:py-32 bg-background relative">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-24">
          <motion.span 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-primary font-bold uppercase tracking-widest text-sm mb-4 block"
          >
            The Journey
          </motion.span>
          <motion.h2 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold font-headers text-foreground"
          >
            Your Path to Mastery
          </motion.h2>
        </div>

        <div className="max-w-4xl mx-auto relative">
          {/* Vertical Winding Line */}
          <div className="absolute left-[23px] md:left-1/2 top-4 bottom-4 w-px bg-primary/20 md:-translate-x-1/2 rounded-full" />
          
          <div className="space-y-16 md:space-y-32">
            {steps.map((step, index) => {
              const isEven = index % 2 === 0;
              
              return (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  className={`relative flex flex-col md:flex-row items-start md:items-center ${isEven ? 'md:flex-row-reverse' : ''}`}
                >
                  {/* Center Node */}
                  <div className="absolute left-[24px] md:left-1/2 w-3 h-3 rounded-full bg-accent transform -translate-x-1/2 mt-2.5 md:mt-0 z-10 shadow-[0_0_0_8px_rgba(255,255,255,1),0_0_0_12px_rgba(var(--primary-rgb),0.1)] dark:shadow-[0_0_0_8px_rgba(var(--background-rgb),1),0_0_0_12px_rgba(var(--primary-rgb),0.1)]" />
                  
                  {/* Number Background */}
                  <div className={`hidden md:block absolute top-1/2 -translate-y-1/2 ${isEven ? 'left-8 text-left' : 'right-8 text-right'} w-1/3 opacity-5 pointer-events-none`}>
                    <span className="text-[12rem] font-bold font-headers leading-none">{step.number}</span>
                  </div>

                  {/* Content */}
                  <div className={`w-full md:w-1/2 pl-16 md:pl-0 ${isEven ? 'md:pr-20 text-left md:text-right' : 'md:pl-20 text-left'}`}>
                    <span className="text-sm font-bold text-accent tracking-widest block mb-2">STEP {step.number}</span>
                    <h3 className="text-3xl font-bold font-headers text-foreground mb-4">{step.title}</h3>
                    <p className="text-muted-foreground text-lg leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
export default HowItWorks;
