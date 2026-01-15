"use client";

import { motion } from "framer-motion";
import { 
  Globe, 
  Package, 
  UserPlus, 
  MailCheck, 
  FileText, 
  CreditCard, 
  MessageSquare, 
  Tv,
  Smartphone,
  CheckCircle2,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CONTACT_CONFIG } from "@/lib/contact-utils";

const steps = [
  {
    phase: "Step 01",
    title: "Browse Our Plans",
    description: "Look through our different packages and find the one that fits your needs best.",
    icon: Package,
    cta: "View Packages",
    link: "/packages"
  },
  {
    phase: "Step 02",
    title: "Fill Out Your Info",
    description: "Click 'Subscribe Now' and enter your details in our simple sign-up form.",
    icon: UserPlus,
  },
  {
    phase: "Step 03",
    title: "Confirm Your Email",
    description: "We’ll send you a link to your email. Just click it to verify your account is ready.",
    icon: MailCheck,
  },
  {
    phase: "Step 04",
    title: "Receive Payment PDF",
    description: "Once verified, we will send you a PDF file with our bank and payment details.",
    icon: FileText,
  },
  {
    phase: "Step 05",
    title: "Make Your Payment",
    description: "Follow the instructions in the PDF to send the payment using your preferred method.",
    icon: CreditCard,
  },
  {
    phase: "Step 06",
    title: "Send Us Proof",
    description: "Take a screenshot of your payment and send it to us via WhatsApp or our Ticket system.",
    icon: MessageSquare,
  },
  {
    phase: "Step 07",
    title: "Start Watching",
    description: "Our team will quickly check your payment and turn on your service. Enjoy your TV!",
    icon: Tv,
  },
];

export default function SetupGuide() {
  return (
    <div className="relative min-h-screen bg-transparent pt-24 pb-32">
      <div className="container max-w-6xl">
        
        {/* HEADER */}
        <div className="text-center mb-20">
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 backdrop-blur-xl mb-8"
          >
            <Smartphone className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] font-black tracking-[0.2em] uppercase text-primary font-heading">
              Quick Setup Guide
            </span>
          </motion.div>
          
          <h1 className="text-5xl md:text-7xl font-bold font-heading tracking-tighter mb-6 leading-tight">
            How to Join <br />
            <span className="text-gradient-animated">Smartifly TV</span>
          </h1>
          
          <p className="text-lg md:text-xl text-foreground-secondary max-w-2xl mx-auto font-light">
            Follow these easy steps to get your premium TV account set up. 
            The whole process usually takes less than <span className="text-foreground font-medium">15 minutes</span>.
          </p>
        </div>

        {/* STEP CARDS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`relative p-8 rounded-[2rem] border transition-all duration-300 group overflow-hidden
                ${i === 0 ? 'bg-primary/10 border-primary/30' : 'bg-white/[0.02] border-white/5 hover:border-white/20'}
                ${i === steps.length - 1 ? 'md:col-span-2 lg:col-span-2 bg-gradient-to-br from-primary/10 to-transparent' : ''}
              `}
            >
              {/* Step Number & Icon */}
              <div className="flex justify-between items-start mb-6">
                <div className="text-xs font-black uppercase tracking-widest text-primary">
                  {step.phase}
                </div>
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 group-hover:scale-110 transition-transform">
                  <step.icon className="w-6 h-6 text-primary" />
                </div>
              </div>

              <h3 className="text-xl font-bold mb-3 tracking-tight">
                {step.title}
              </h3>

              <p className="text-sm text-foreground-secondary leading-relaxed mb-6 font-light">
                {step.description}
              </p>

              {step.cta && (
                <Link href={step.link || "#"}>
                  <Button variant="outline" size="sm" className="w-full rounded-full border-primary/20 hover:bg-primary/10">
                    {step.cta}
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              )}

              {/* Decorative Background Blur */}
              <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-primary/5 rounded-full blur-[50px]" />
            </motion.div>
          ))}
        </div>

        {/* SUPPORT SECTION */}
        <section className="mt-24">
          <div className="relative p-1 rounded-[3rem] bg-gradient-to-b from-primary/30 to-transparent">
            <div className="bg-background/80 backdrop-blur-3xl rounded-[2.9rem] py-16 px-8 text-center border border-white/5 relative">
              
              <div className="relative z-10">
                <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-6 animate-pulse" />
                <h2 className="text-3xl md:text-5xl font-bold tracking-tighter mb-6">
                  Ready to Start?
                </h2>
                <p className="text-lg text-foreground-secondary max-w-xl mx-auto mb-10 font-light">
                  Once you have paid, send your screenshot to our team. 
                  We are available 24/7 to help you get connected immediately.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <Link href="/tickets/create">
                    <Button variant="shiny" size="xl" className="h-16 px-10 rounded-full">
                      <FileText className="w-5 h-5 mr-3" />
                      Upload My Screenshot
                    </Button>
                  </Link>
                  <a href={`https://wa.me/${CONTACT_CONFIG.whatsappNumber}`} target="_blank" rel="noopener noreferrer">
                    <Button variant="heroSecondary" size="xl" className="h-16 px-10 rounded-full">
                      <MessageSquare className="w-5 h-5 mr-3 text-primary" />
                      Chat on WhatsApp
                    </Button>
                  </a>
                </div>

                <div className="mt-12 pt-8 border-t border-white/5 flex justify-center gap-8 md:gap-16">
                    {[
                      { label: "Setup Time", val: "Very Fast" },
                      { label: "Support", val: "Live 24/7" },
                      { label: "Payment", val: "Safe & Secure" },
                    ].map((item, i) => (
                      <div key={i}>
                        <div className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">{item.label}</div>
                        <div className="text-sm font-bold">{item.val}</div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}