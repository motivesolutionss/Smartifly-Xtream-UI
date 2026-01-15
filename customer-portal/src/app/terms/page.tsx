"use client";

import { motion } from "framer-motion";
import { Gavel, CheckCircle2, AlertTriangle, CreditCard, Scale } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="relative min-h-screen bg-transparent pt-24 pb-32">
      <div className="container max-w-4xl">
        {/* HEADER */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-20"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-foreground-muted text-[10px] font-bold uppercase tracking-widest mb-6">
            Master Service Agreement
          </div>
          <h1 className="text-4xl md:text-7xl font-bold font-heading tracking-tighter mb-6">
            Terms of <span className="text-gradient-animated">Service</span>
          </h1>
          <p className="text-foreground-muted max-w-xl mx-auto font-light">
            Please review these terms carefully. By utilizing the Smartifly platform, you enter 
            into a legally binding agreement regarding the use of our global OTT infrastructure.
          </p>
        </motion.div>

        {/* CARDS LAYOUT FOR TERMS */}
        <div className="space-y-6">
          <motion.div 
             initial={{ opacity: 0, scale: 0.95 }}
             whileInView={{ opacity: 1, scale: 1 }}
             viewport={{ once: true }}
             className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 backdrop-blur-3xl"
          >
            <div className="flex items-center gap-4 mb-4">
              <Scale className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-bold">1. Acceptance & Eligibility</h2>
            </div>
            <p className="text-foreground-secondary font-light leading-relaxed text-sm">
              Usage of Smartifly is restricted to individuals at least 18 years of age. By accessing 
              the portal, you confirm that you have the legal capacity to enter into this agreement 
              and that your use of IPTV services complies with your local jurisdiction.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/5"
            >
              <div className="flex items-center gap-4 mb-4">
                <CreditCard className="w-6 h-6 text-blue-400" />
                <h2 className="text-lg font-bold">2. Billing & SLAs</h2>
              </div>
              <p className="text-foreground-secondary font-light leading-relaxed text-sm">
                Subscription fees are processed via encrypted gateways. We provide a 99.9% 
                uptime Service Level Agreement (SLA). Downtime resulting from client-side 
                ISP failure is not eligible for credit.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/5"
            >
              <div className="flex items-center gap-4 mb-4">
                <AlertTriangle className="w-6 h-6 text-amber-400" />
                <h2 className="text-lg font-bold">3. Prohibited Use</h2>
              </div>
              <p className="text-foreground-secondary font-light leading-relaxed text-sm">
                Re-streaming, reverse engineering the API, or account sharing across multiple 
                geographic locations simultaneously will result in immediate termination 
                without a refund.
              </p>
            </motion.div>
          </div>

          <motion.div 
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/5"
          >
            <div className="flex items-center gap-4 mb-4">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              <h2 className="text-xl font-bold">4. Content Availability</h2>
            </div>
            <p className="text-foreground-secondary font-light leading-relaxed text-sm">
              While we strive for a consistent library, channel lineups and VOD assets are subject 
              to change without notice based on licensing and regional availability. 4K quality 
              requires a minimum stable bandwidth of 25Mbps.
            </p>
          </motion.div>

          <div className="text-center pt-12">
            <p className="text-xs text-foreground-muted mb-4 uppercase tracking-widest">
              Have questions regarding our terms?
            </p>
            <div className="flex justify-center gap-4">
               <button className="text-sm font-bold text-primary hover:underline">Download PDF</button>
               <span className="text-white/10">|</span>
               <button className="text-sm font-bold text-primary hover:underline">Contact Legal</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}