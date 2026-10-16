'use client';
import { motion } from 'framer-motion';

export function WhyChooseUs() {
  const reasons = [
    {
      title: "Certified Instructors with Ijazah",
      description: "Learn directly from native Arabic speakers and scholars holding authentic chains of transmission (Ijazah)."
    },
    {
      title: "1-on-1 Personalized Learning",
      description: "Get undivided attention with customized lesson plans tailored to your specific pace and goals."
    },
    {
      title: "Structured Curriculum",
      description: "Follow a proven, step-by-step syllabus designed to take you from beginner to advanced mastery."
    },
    {
      title: "Flexible Scheduling",
      description: "Book classes at times that suit you, 24/7. Reschedule easily through our interactive student portal."
    }
  ];

  return (
    <section className="py-24 md:py-32 bg-background relative overflow-hidden">
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          
          {/* Left: Editorial Graphic */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="relative h-[600px] rounded-[2.5rem] overflow-hidden bg-primary/5 border border-primary/10 flex items-center justify-center group"
          >
            {/* Background elements */}
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-accent/20 rounded-full blur-[80px] group-hover:bg-accent/30 transition-colors duration-700" />
            <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-primary/20 rounded-full blur-[80px] group-hover:bg-primary/30 transition-colors duration-700" />
            
            {/* Elegant center piece */}
            <div className="relative z-10 w-3/4 h-3/4 border border-primary/20 rounded-[2rem] flex flex-col items-center justify-center p-8 backdrop-blur-sm bg-background/40 shadow-2xl">
              <div className="w-20 h-20 rounded-full border border-accent/40 flex items-center justify-center mb-8">
                <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center text-3xl">
                  ✨
                </div>
              </div>
              <h3 className="text-3xl font-headers font-bold text-center mb-4">Excellence in<br />Traditional Learning</h3>
              <p className="text-center text-muted-foreground max-w-sm">
                Bridging classical scholarship with modern pedagogical approaches.
              </p>
            </div>
          </motion.div>

          {/* Right: Typography list */}
          <div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-16"
            >
              <span className="text-accent font-bold uppercase tracking-widest text-sm mb-4 block">Our Advantage</span>
              <h2 className="text-4xl md:text-5xl font-bold font-headers text-foreground mb-6 leading-tight">
                Why Choose <br /><span className="text-primary">Ilmvers Institute</span>
              </h2>
            </motion.div>

            <div className="space-y-12">
              {reasons.map((reason, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.15, duration: 0.6 }}
                  className="relative pl-8 md:pl-12 border-l border-primary/20 hover:border-accent transition-colors duration-500 group"
                >
                  {/* Decorative dot */}
                  <div className="absolute left-[-5px] top-2 w-2.5 h-2.5 rounded-full bg-primary/20 group-hover:bg-accent transition-colors duration-500" />
                  
                  <h3 className="text-2xl font-bold text-foreground mb-3 font-headers group-hover:text-primary transition-colors duration-300">
                    {reason.title}
                  </h3>
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    {reason.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
export default WhyChooseUs;
