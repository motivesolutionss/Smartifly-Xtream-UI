"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { TicketForm } from "@/components/tickets/TicketForm";
import { Headphones, Clock, Shield, MessageSquare } from "lucide-react";

const supportFeatures = [
  { icon: Headphones, label: "24/7 Support", color: "text-violet-400", bgColor: "bg-violet-500/10" },
  { icon: Clock, label: "Fast Response", color: "text-cyan-400", bgColor: "bg-cyan-500/10" },
  { icon: Shield, label: "Secure & Private", color: "text-green-400", bgColor: "bg-green-500/10" },
  { icon: MessageSquare, label: "Expert Team", color: "text-warning", bgColor: "bg-warning/10" },
];

export default function CreateTicketPage() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="section relative overflow-hidden">
      {/* Matching Animated Background Effects */}
      <motion.div
        className="absolute top-20 left-1/4 w-96 h-96 bg-gradient-glow-violet rounded-full blur-3xl opacity-10"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.15, 0.1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute bottom-20 right-1/4 w-96 h-96 bg-gradient-glow-cyan rounded-full blur-3xl opacity-10"
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.1, 0.15, 0.1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
      />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)`,
          backgroundSize: '50px 50px',
        }}
      />

      <div className="container relative z-10" ref={ref}>
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card-sm border border-primary/30 backdrop-blur-md mb-6">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-medium text-foreground">Support</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold font-heading mb-6 text-foreground">
            Support{" "}
            <span className="text-gradient-animated">Center</span>
          </h1>

          <p className="text-lg text-foreground-secondary max-w-2xl mx-auto mb-8">
            Need help? Create a support ticket and our team will assist you promptly.
          </p>

          {/* Support Features */}
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            {supportFeatures.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={isInView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}
                  className="flex items-center gap-2 glass-card-sm px-4 py-2.5"
                >
                  <div className={`w-8 h-8 rounded-lg ${feature.bgColor} flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${feature.color}`} />
                  </div>
                  <span className="text-sm font-medium text-foreground">{feature.label}</span>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Ticket Form */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <TicketForm />
        </motion.div>
      </div>
    </section>
  );
}
