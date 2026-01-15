"use client";

import { motion } from "framer-motion";
import { 
  Cpu, Server, ShieldCheck, Globe2, 
  BarChart3, Layers, Zap, Users2, 
  CheckCircle2, ArrowRight, PlayCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const corporatePillars = [
  {
    icon: Cpu,
    title: "Proprietary Architecture",
    description: "Our custom-built stack utilizes HEVC (H.265) compression to deliver 4K streams with 50% less overhead than industry standards.",
    color: "text-primary",
  },
  {
    icon: Globe2,
    title: "Edge Delivery Network",
    description: "With over 200 localized peering points, we ensure sub-500ms latency for a truly instant-play experience worldwide.",
    color: "text-blue-500",
  },
  {
    icon: ShieldCheck,
    title: "Data Sovereignty",
    description: "Enterprise-grade AES-256 encryption and localized server clusters ensure full compliance with global privacy standards.",
    color: "text-emerald-500",
  },
  {
    icon: Layers,
    title: "Adaptive Bitrate Control",
    description: "Dynamic AI algorithms monitor network health in real-time, automatically scaling quality to prevent buffering on any connection.",
    color: "text-purple-500",
  },
];

const kpis = [
  { label: "Global Reach", value: "150+", suffix: "Regions" },
  { label: "Uptime SLA", value: "99.99%", suffix: "Reliability" },
  { label: "Peak Capacity", value: "2.4", suffix: "Tbps" },
  { label: "Client Base", value: "10K+", suffix: "Active Subscriptions" },
];

export default function AboutPage() {
  return (
    <div className="relative min-h-screen bg-transparent pt-24 pb-32">
      
      {/* 1. EXECUTIVE SUMMARY (HERO) */}
      <section className="container relative z-10 text-center mb-32">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-3 px-4 py-1 rounded-full border border-primary/20 bg-primary/5 backdrop-blur-md mb-8"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-[10px] font-bold tracking-[0.25em] uppercase text-primary">
            Corporate Profile 2026
          </span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "circOut" }}
          className="text-5xl md:text-7xl lg:text-8xl font-bold font-heading mb-10 tracking-tighter leading-[0.9]"
        >
          Standardizing the <br />
          <span className="text-gradient-animated">Future of Media.</span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-lg md:text-xl text-foreground-secondary max-w-3xl mx-auto font-light leading-relaxed"
        >
          Smartifly is a premier OTT infrastructure provider dedicated to bridging 
          the gap between broadcast-grade quality and internet-scale delivery. 
          We engineer solutions for the most demanding viewers globally.
        </motion.p>
      </section>

      {/* 2. THE ENGINEERING STACK (BENTO GRID) */}
      <section className="container mb-40">
        <div className="text-center mb-16">
          <h2 className="text-sm font-black uppercase tracking-[0.4em] text-foreground-muted mb-4">The Smartifly Stack</h2>
          <div className="h-px w-20 bg-primary mx-auto" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {corporatePillars.map((pillar, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-primary/30 transition-all duration-500"
            >
              <div className="w-12 h-12 rounded-xl bg-background flex items-center justify-center mb-8 border border-white/5 group-hover:border-primary/50 transition-colors">
                <pillar.icon className={`w-6 h-6 ${pillar.color}`} />
              </div>
              <h3 className="text-xl font-bold mb-4 tracking-tight text-foreground">{pillar.title}</h3>
              <p className="text-sm text-foreground-muted leading-relaxed font-normal">{pillar.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 3. PERFORMANCE METRICS (KPIs) */}
      <section className="container mb-40">
        <div className="relative p-1 rounded-[3rem] bg-gradient-to-r from-primary/20 via-white/5 to-primary/20">
          <div className="bg-background/80 backdrop-blur-3xl rounded-[2.9rem] py-16 px-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 text-center lg:text-left">
              {kpis.map((kpi, i) => (
                <div key={i} className="space-y-2 lg:pl-12 lg:border-l border-white/5 first:border-0">
                  <div className="text-4xl md:text-5xl font-black font-heading tracking-tighter">{kpi.value}</div>
                  <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary">{kpi.label}</div>
                  <div className="text-xs text-foreground-muted">{kpi.suffix}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 4. THE STRATEGIC VISION */}
      <section className="container mb-40">
        <div className="flex flex-col lg:flex-row items-center gap-20">
          <motion.div 
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex-1"
          >
            <h2 className="text-4xl md:text-5xl font-bold tracking-tighter mb-8 font-heading">
              Media Engineering is in <br /> 
              <span className="text-foreground-muted font-light underline decoration-primary/30 underline-offset-8">Our DNA.</span>
            </h2>
            <div className="space-y-6 text-foreground-secondary text-lg font-light leading-relaxed">
              <p>
                Smartifly was founded in 2020 by a collective of broadcast specialists and 
                network architects who recognized a critical instability in existing 
                OTT delivery models.
              </p>
              <p>
                Our objective was clear: create a non-congested path for high-bitrate 
                media. By bypassing public internet bottlenecks through private peering 
                agreements, we ensure our subscribers receive the signal exactly 
                as intended by the broadcaster.
              </p>
            </div>
            
            <div className="mt-12 grid grid-cols-2 gap-6">
              {[
                { label: "Infrastructure", val: "Owned & Operated" },
                { label: "Network Type", val: "Tier-1 Hybrid CDN" },
              ].map((item, i) => (
                <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/5">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">{item.label}</div>
                  <div className="text-sm font-semibold">{item.val}</div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="flex-1 relative aspect-square max-w-[500px]"
          >
            <div className="absolute inset-0 bg-primary/10 rounded-full blur-[100px] animate-pulse" />
            <div className="relative h-full w-full rounded-[4rem] border border-white/10 bg-white/[0.02] backdrop-blur-2xl flex flex-col items-center justify-center p-12 overflow-hidden group">
               <div className="absolute inset-0 bg-grid-white/[0.02] [mask-image:radial-gradient(white,transparent)]" />
               <PlayCircle className="w-20 h-20 text-primary mb-8 transition-transform group-hover:scale-110 duration-500" />
               <div className="text-center">
                  <h4 className="text-2xl font-black uppercase tracking-widest mb-2">The Engine</h4>
                  <p className="text-xs text-foreground-muted tracking-[0.2em] uppercase">Smartifly Core V4.0</p>
               </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 5. GLOBAL PARTNERSHIP CTA */}
      <section className="container">
        <div className="relative bg-white/[0.02] border border-white/10 rounded-[4rem] p-12 md:p-24 text-center overflow-hidden">
          {/* Subtle moving light effect */}
          <motion.div 
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-primary/5 to-transparent skew-x-12"
          />

          <h2 className="text-4xl md:text-6xl font-bold tracking-tighter mb-8 relative z-10">
            Secure Your Access to the <br /> 
            <span className="text-gradient-animated">Premium Tier.</span>
          </h2>
          <p className="text-lg text-foreground-secondary max-w-2xl mx-auto mb-12 relative z-10 font-light">
            Whether you are a household seeking 4K clarity or a business requiring 
            reliable media delivery, Smartifly provides the infrastructure to excel.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center relative z-10">
            <Link href="/packages">
              <Button variant="shiny" size="xl" className="h-16 px-12 text-lg rounded-full">
                View Enterprise Plans
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="outline" size="xl" className="h-16 px-12 text-lg rounded-full">
                Technical Inquiry
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}