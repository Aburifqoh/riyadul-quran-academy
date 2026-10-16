'use client';
import { motion } from 'framer-motion';

export function WhoWeServe() {
  const groups = [
    {
      title: "Beginners & Converts",
      description: "Start your journey with foundational classes designed for complete beginners.",
      icon: "🌱"
    },
    {
      title: "Children & Youth",
      description: "Engaging, interactive classes that instill a lifelong love for the Qur'an.",
      icon: "🧒"
    },
    {
      title: "Busy Professionals",
      description: "Flexible scheduling that fits perfectly into your demanding lifestyle.",
      icon: "💼"
    },
    {
      title: "Advanced Learners",
      description: "Ijaza programs and advanced Tajweed for those seeking mastery.",
      icon: "🎓"
    }
  ];

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col lg:flex-row gap-12 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:w-1/3"
          >
            <span className="text-primary font-bold uppercase tracking-widest text-sm mb-2 block">For Everyone</span>
            <h2 className="text-4xl md:text-5xl font-bold font-headers text-foreground mb-6">Who We Serve</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Whether you are taking your first steps or seeking an Ijazah, our personalized approach ensures you get the exact support you need to succeed.
            </p>
          </motion.div>
          
          <div className="lg:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            {groups.map((group, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className="bg-muted p-8 rounded-2xl border border-border hover:border-primary/50 transition-colors group"
              >
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform origin-left">{group.icon}</div>
                <h3 className="text-xl font-bold text-foreground mb-2 font-headers">{group.title}</h3>
                <p className="text-muted-foreground">{group.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
export default WhoWeServe;
