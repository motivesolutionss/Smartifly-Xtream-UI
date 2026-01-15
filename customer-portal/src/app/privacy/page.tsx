"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Lock, Eye, FileText, Mail, Globe } from "lucide-react";

const sections = [
  { id: "collection", title: "1. Information Collection", icon: Eye },
  { id: "usage", title: "2. Data Utilization", icon: Globe },
  { id: "security", title: "3. Infrastructure Security", icon: Lock },
  { id: "rights", title: "4. User Rights", icon: ShieldCheck },
  { id: "contact", title: "5. Contact & Compliance", icon: Mail },
];

export default function PrivacyPage() {
  return (
    <div className="relative min-h-screen bg-transparent pt-24 pb-32">
      <div className="container max-w-5xl">
        {/* HEADER */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16 border-b border-white/10 pb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest mb-6">
            Compliance & Legal
          </div>
          <h1 className="text-4xl md:text-6xl font-bold font-heading tracking-tighter mb-6">
            Privacy <span className="text-gradient-animated">Policy</span>
          </h1>
          <p className="text-foreground-muted max-w-2xl font-light">
            At Smartifly, we prioritize the integrity of your data. This policy outlines our rigorous 
            standards for data sovereignty, encryption, and user privacy in the OTT ecosystem.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* SIDEBAR NAVIGATION (Desktop) */}
          <aside className="hidden lg:block lg:col-span-4 sticky top-32 h-fit">
            <div className="space-y-1">
              {sections.map((s) => (
                <a 
                  key={s.id}
                  href={`#${s.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all text-sm text-foreground-muted hover:text-primary group"
                >
                  <s.icon className="w-4 h-4" />
                  <span>{s.title}</span>
                </a>
              ))}
            </div>
            <div className="mt-8 p-6 rounded-2xl bg-primary/5 border border-primary/10">
              <p className="text-xs text-foreground-muted leading-relaxed">
                Need a PDF version? Contact our compliance department at legal@smartifly.com.
              </p>
            </div>
          </aside>

          {/* MAIN CONTENT */}
          <main className="lg:col-span-8 space-y-16">
            <section id="collection" className="scroll-mt-32">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                  <Eye className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-bold font-heading">1. Information Collection</h2>
              </div>
              <div className="prose prose-invert max-w-none text-foreground-secondary font-light leading-relaxed space-y-4">
                <p>
                  Smartifly collects telemetric and personal data necessary to provide a broadcast-grade 
                  streaming experience. This includes:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-sm">
                  <li>Authentication credentials (Email, encrypted passwords).</li>
                  <li>Billing identifiers and transaction history via PCI-compliant gateways.</li>
                  <li>Network telemetry (IP address, device type) to optimize CDN routing.</li>
                </ul>
              </div>
            </section>

            <section id="usage" className="scroll-mt-32">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                  <Globe className="w-5 h-5 text-blue-400" />
                </div>
                <h2 className="text-2xl font-bold font-heading">2. Data Utilization</h2>
              </div>
              <p className="text-foreground-secondary font-light leading-relaxed">
                We utilize non-personally identifiable information to perform real-time bitrate 
                adjustments and load-balancing across our global edge nodes. Smartifly does not 
                participate in data brokering or sell user viewing habits to third-party advertisers.
              </p>
            </section>

            <section id="security" className="scroll-mt-32">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                  <Lock className="w-5 h-5 text-emerald-400" />
                </div>
                <h2 className="text-2xl font-bold font-heading">3. Infrastructure Security</h2>
              </div>
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-sm">
                <p className="text-foreground-secondary font-light leading-relaxed">
                  Data in transit is protected via TLS 1.3 encryption. At-rest data is siloed 
                  using AES-256 standard protocols within Tier-4 data centers. We implement 
                  automated intrusion detection systems (IDS) to monitor for unauthorized access 24/7.
                </p>
              </div>
            </section>

            <section id="contact" className="scroll-mt-32">
              <h2 className="text-2xl font-bold font-heading mb-6">4. Contact Us</h2>
              <div className="p-8 rounded-3xl bg-primary/5 border border-primary/10 flex flex-col md:flex-row justify-between items-center gap-6">
                <p className="text-sm text-foreground-secondary font-light">
                  For GDPR/CCPA inquiries or data deletion requests, please contact our 
                  Data Protection Officer.
                </p>
                <a href="mailto:support@smartifly.com">
                  <button className="px-6 py-2 bg-primary text-white rounded-full font-bold text-sm hover:shadow-premium-glow transition-all">
                    Email Support
                  </button>
                </a>
              </div>
            </section>

            <div className="pt-12 border-t border-white/10 text-[10px] text-foreground-muted uppercase tracking-[0.2em]">
              Last Version Update: January 06, 2026
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}