"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Mail, Phone, MapPin,
  Facebook, Twitter, Instagram, Youtube,
  ArrowUpRight, Heart, Send,
  Clock, Shield, Star, Zap
} from "lucide-react";
import { useState } from "react";
import { usePerformanceMode } from "@/hooks/usePerformanceMode";

const footerLinks = {
  product: [
    { label: "Packages", href: "/packages", disabled: false },
    { label: "Check Subscription", href: "/subscription", disabled: false },
    { label: "Features", href: "/#features", disabled: false },
  ],
  support: [
    { label: "Help Center", href: "/tickets/create", disabled: false },
    { label: "Contact Us", href: "/contact", disabled: false },
    { label: "FAQ", href: "/#faq", disabled: false },
    { label: "Setup Guide", href: "/guide", disabled: false },
  ],
  legal: [
    { label: "Privacy Policy", href: "/privacy", disabled: false },
    { label: "Terms of Service", href: "/terms", disabled: false },
    { label: "Refund Policy", href: "/refund", disabled: true },
    { label: "DMCA", href: "/dmca", disabled: true },
  ],
  company: [
    { label: "About Us", href: "/about", disabled: false },
    { label: "Blog", href: "/blog", disabled: true },
    { label: "Careers", href: "/careers", disabled: true },
    { label: "Partners", href: "/partners", disabled: true },
  ],
};

const socialLinks = [
  { icon: Facebook, href: "#", label: "Facebook", color: "hover:bg-[#1877f2]/10 hover:border-[#1877f2]/30 hover:text-[#1877f2]" },
  { icon: Twitter, href: "#", label: "Twitter", color: "hover:bg-[#1da1f2]/10 hover:border-[#1da1f2]/30 hover:text-[#1da1f2]" },
  { icon: Instagram, href: "#", label: "Instagram", color: "hover:bg-[#e4405f]/10 hover:border-[#e4405f]/30 hover:text-[#e4405f]" },
  { icon: Youtube, href: "#", label: "YouTube", color: "hover:bg-[#ff0000]/10 hover:border-[#ff0000]/30 hover:text-[#ff0000]" },
];

const quickStats = [
  { icon: Clock, label: "24/7 Support", value: "Always Available" },
  { icon: Shield, label: "99.9% Uptime", value: "Guaranteed" },
  { icon: Star, label: "10K+ Users", value: "Trusted" },
  { icon: Zap, label: "Ultra Fast", value: "Streaming" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    }
  },
};

export function Footer() {
  const { reduceMotion } = usePerformanceMode();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setEmail("");
    setIsSubmitting(false);
  };

  return (
    <footer className="relative border-t border-border/30 overflow-hidden">
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background-secondary/50 to-background-secondary" />

      {/* Animated gradient orbs */}
      <motion.div
        className="absolute top-20 left-1/4 w-96 h-96 bg-gradient-glow-violet rounded-full blur-3xl opacity-10"
        animate={reduceMotion ? { opacity: 0.1 } : { scale: [1, 1.2, 1], opacity: [0.1, 0.15, 0.1] }}
        transition={reduceMotion ? { duration: 0.2 } : { duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-20 right-1/4 w-96 h-96 bg-gradient-glow-cyan rounded-full blur-3xl opacity-10"
        animate={reduceMotion ? { opacity: 0.1 } : { scale: [1.2, 1, 1.2], opacity: [0.1, 0.15, 0.1] }}
        transition={reduceMotion ? { duration: 0.2 } : { duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)`,
          backgroundSize: '50px 50px',
        }}
      />

      <div className="container relative z-10">


        {/* Main Footer */}
        <div className="py-16 md:py-20">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-12"
          >
            {/* Brand Column */}
            <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
              <Link href="/" className="flex items-center gap-3 group">
                <div className="relative w-20 h-20">
                  <Image
                    src="/smartifly-logo.webp"
                    alt="Smartifly Logo"
                    width={80}
                    height={80}
                    className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
                <div>
                  <span className="font-heading font-bold text-2xl text-foreground block">
                    Smartifly
                  </span>
                  <span className="block text-xs text-foreground-muted font-medium tracking-wider uppercase">
                    Premium OTT Platform
                  </span>
                </div>
              </Link>

              <p className="text-foreground-secondary leading-relaxed">
                Experience premium IPTV streaming with thousands of live channels, movies, and series.
                Crystal-clear quality, reliable service, and 24/7 support.
              </p>

              {/* Contact Info */}
              <div className="space-y-3">
                <a
                  href="mailto:support@smartifly.com"
                  className="flex items-center gap-3 glass-card-sm hover-lift-sm group"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex-center group-hover:bg-primary/30 transition-colors">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-foreground-muted">Email</div>
                    <div className="text-sm text-foreground">support@smartifly.com</div>
                  </div>
                </a>

                <a
                  href="tel:+1234567890"
                  className="flex items-center gap-3 glass-card-sm hover-lift-sm group"
                >
                  <div className="w-10 h-10 rounded-lg bg-accent/20 flex-center group-hover:bg-accent/30 transition-colors">
                    <Phone className="w-5 h-5 text-accent" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-foreground-muted">Phone</div>
                    <div className="text-sm text-foreground">+1 (234) 567-890</div>
                  </div>
                </a>

                <div className="flex items-center gap-3 glass-card-sm">
                  <div className="w-10 h-10 rounded-lg bg-success/20 flex-center">
                    <MapPin className="w-5 h-5 text-success" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-foreground-muted">Location</div>
                    <div className="text-sm text-foreground">Global Service</div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Product Links */}
            <motion.div variants={itemVariants}>
              <h4 className="font-heading font-semibold text-foreground mb-6 text-sm uppercase tracking-wider flex items-center gap-2">
                <div className="w-1 h-4 bg-gradient-button-primary rounded-full" />
                Product
              </h4>
              <ul className="space-y-3">
                {footerLinks.product.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.disabled ? "#" : link.href}
                      onClick={(e) => link.disabled && e.preventDefault()}
                      className="text-foreground-secondary hover:text-foreground transition-colors inline-flex items-center gap-2 group text-sm"
                    >
                      <ArrowUpRight className="w-3 h-3 opacity-0 -translate-y-1 translate-x-1 group-hover:opacity-100 group-hover:translate-y-0 group-hover:translate-x-0 transition-all text-primary" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Support Links */}
            <motion.div variants={itemVariants}>
              <h4 className="font-heading font-semibold text-foreground mb-6 text-sm uppercase tracking-wider flex items-center gap-2">
                <div className="w-1 h-4 bg-gradient-button-primary rounded-full" />
                Support
              </h4>
              <ul className="space-y-3">
                {footerLinks.support.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.disabled ? "#" : link.href}
                      onClick={(e) => link.disabled && e.preventDefault()}
                      className="text-foreground-secondary hover:text-foreground transition-colors inline-flex items-center gap-2 group text-sm"
                    >
                      <ArrowUpRight className="w-3 h-3 opacity-0 -translate-y-1 translate-x-1 group-hover:opacity-100 group-hover:translate-y-0 group-hover:translate-x-0 transition-all text-primary" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Legal Links */}
            <motion.div variants={itemVariants}>
              <h4 className="font-heading font-semibold text-foreground mb-6 text-sm uppercase tracking-wider flex items-center gap-2">
                <div className="w-1 h-4 bg-gradient-button-primary rounded-full" />
                Legal
              </h4>
              <ul className="space-y-3">
                {footerLinks.legal.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.disabled ? "#" : link.href}
                      onClick={(e) => link.disabled && e.preventDefault()}
                      className="text-foreground-secondary hover:text-foreground transition-colors inline-flex items-center gap-2 group text-sm"
                    >
                      <ArrowUpRight className="w-3 h-3 opacity-0 -translate-y-1 translate-x-1 group-hover:opacity-100 group-hover:translate-y-0 group-hover:translate-x-0 transition-all text-primary" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Company Links */}
            <motion.div variants={itemVariants}>
              <h4 className="font-heading font-semibold text-foreground mb-6 text-sm uppercase tracking-wider flex items-center gap-2">
                <div className="w-1 h-4 bg-gradient-button-primary rounded-full" />
                Company
              </h4>
              <ul className="space-y-3">
                {footerLinks.company.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.disabled ? "#" : link.href}
                      onClick={(e) => link.disabled && e.preventDefault()}
                      className="text-foreground-secondary hover:text-foreground transition-colors inline-flex items-center gap-2 group text-sm"
                    >
                      <ArrowUpRight className="w-3 h-3 opacity-0 -translate-y-1 translate-x-1 group-hover:opacity-100 group-hover:translate-y-0 group-hover:translate-x-0 transition-all text-primary" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>
        </div>

        {/* Bottom Bar */}
        <div className="py-8 border-t border-border/30">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            {/* Copyright */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-sm text-foreground-muted flex items-center gap-2"
            >
              © {new Date().getFullYear()} Smartifly. All rights reserved. Made with
              <Heart className="w-4 h-4 text-destructive fill-destructive animate-pulse" />
              for streaming lovers
            </motion.p>

            {/* Social Links */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-3"
            >
              <span className="text-sm text-foreground-muted mr-2">Follow us:</span>
              {socialLinks.map((social, i) => (
                <motion.a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, scale: 0 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className={`w-10 h-10 rounded-xl glass-card flex-center text-foreground-muted border transition-all ${social.color}`}
                  aria-label={social.label}
                >
                  <social.icon className="w-4 h-4" />
                </motion.a>
              ))}
            </motion.div>

            {/* Trust Badges */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-4"
            >
              <div className="flex items-center gap-2 text-xs text-foreground-muted">
                <Shield className="w-4 h-4 text-success" />
                <span>Secure</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-foreground-muted">
                <Star className="w-4 h-4 text-warning fill-warning" />
                <span>4.9/5</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-foreground-muted">
                <Zap className="w-4 h-4 text-primary" />
                <span>Fast</span>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Bottom Gradient Line */}
        <div className="h-1 bg-gradient-button-primary opacity-50" />
      </div>
    </footer>
  );
}

export default Footer;
