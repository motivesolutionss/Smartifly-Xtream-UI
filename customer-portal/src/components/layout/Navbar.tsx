"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu, X, Ticket, Package, Phone, Search,
  Sparkles, ChevronDown, Home
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CurrencySelector } from "./CurrencySelector";
import { usePerformanceMode } from "@/hooks/usePerformanceMode";

const navItems = [
  { path: "/", label: "Home", icon: Home },
  { path: "/packages", label: "Packages", icon: Package },
  { path: "/tickets", label: "Support", icon: Ticket },
  { path: "/subscription", label: "My Subscription", icon: Search },
  { path: "/about", label: "About", icon: Phone },
];

export function Navbar() {
  const { reduceMotion } = usePerformanceMode();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;

      window.requestAnimationFrame(() => {
        const scrolled = window.scrollY > 20;
        setIsScrolled((prev) => (prev === scrolled ? prev : scrolled));

        // Calculate scroll progress for progress bar
        const windowHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = windowHeight > 0 ? (window.scrollY / windowHeight) * 100 : 0;
        setScrollProgress((prev) => (prev === progress ? prev : progress));
        ticking = false;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Scroll Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-button-primary z-[60] origin-left"
        style={{ scaleX: scrollProgress / 100 }}
        initial={{ scaleX: 0 }}
      />

      <nav
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
          isScrolled
            ? "bg-background/90 backdrop-blur-xl border-b border-border/50 shadow-xl"
            : "bg-transparent border-b border-transparent"
        )}
      >
        <div className="container">
          <div className="flex h-16 md:h-20 items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group relative z-10">
              <div className="relative w-14 h-14 md:w-16 md:h-16">
                <Image
                  src="/smartifly-logo.webp"
                  alt="Smartifly Logo"
                  width={64}
                  height={64}
                  className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
                  priority
                />
              </div>

              <div className="hidden sm:block">
                <span className="font-heading font-bold text-xl md:text-2xl text-gradient-animated">
                  Smartifly
                </span>
                <span className="block text-[10px] text-foreground-muted -mt-1 font-medium tracking-wider uppercase">
                  OTT Platform
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center">
              <div className={cn(
                "flex items-center gap-1 px-2 py-2 mr-4 rounded-full transition-all duration-500",
                isScrolled
                  ? "glass-card"
                  : "bg-white/5 backdrop-blur-sm border border-white/10"
              )}>
                {navItems.map((item) => {
                  const isActive = pathname === item.path ||
                    (item.path !== "/" && pathname.startsWith(item.path));
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      className={cn(
                        "relative px-4 py-2.5 text-sm font-medium font-heading rounded-lg transition-all duration-300 group",
                        isActive
                          ? "text-foreground"
                          : "text-foreground-secondary hover:text-foreground"
                      )}
                    >
                      {/* Active indicator with animation */}
                      {isActive && (
                        <motion.div
                          layoutId="activeNav"
                          className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-lg border border-primary/30"
                          transition={{
                            type: "spring",
                            bounce: 0.2,
                            duration: 0.6
                          }}
                        />
                      )}

                      {/* Hover indicator */}
                      <motion.div
                        className="absolute inset-0 bg-background-hover rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        initial={false}
                      />

                      <span className="relative z-10 flex items-center gap-2">
                        <item.icon className={cn(
                          "w-4 h-4 transition-colors",
                          isActive ? "text-primary" : "text-foreground-muted group-hover:text-primary"
                        )} />
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>

              {/* Currency Selector */}
              <CurrencySelector className="mr-3" />

              {/* CTA Button */}
              <Link href="/packages">
                <Button className="btn-primary hover-lift group">
                  <Sparkles className="w-4 h-4" />
                  Get Started
                  {reduceMotion ? (
                    <span className="ml-1">{"->"}</span>
                  ) : (
                    <motion.div
                      className="ml-1"
                      animate={{ x: [0, 3, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      {"->"}
                    </motion.div>
                  )}
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "lg:hidden relative transition-all duration-500",
                isMobileMenuOpen && "bg-primary/10",
                isScrolled
                  ? "glass-card"
                  : "bg-white/5 backdrop-blur-sm border border-white/10"
              )}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <AnimatePresence mode="wait">
                {isMobileMenuOpen ? (
                  <motion.div
                    key="close"
                    initial={{ opacity: 0, rotate: -90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: 90 }}
                    transition={{ duration: 0.2 }}
                  >
                    <X className="w-5 h-5 text-primary" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ opacity: 0, rotate: 90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: -90 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Menu className="w-5 h-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                onClick={() => setIsMobileMenuOpen(false)}
              />

              {/* Menu Panel */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="absolute top-full left-0 right-0 lg:hidden z-50"
              >
                <div className="container pt-2 pb-6">
                  <div className="glass-card-strong rounded-2xl overflow-hidden shadow-2xl">
                    <div className="p-6 space-y-2">
                      {navItems.map((item, index) => {
                        const isActive = pathname === item.path ||
                          (item.path !== "/" && pathname.startsWith(item.path));
                        const Icon = item.icon;

                        return (
                          <motion.div
                            key={item.path}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                          >
                            <Link
                              href={item.path}
                              onClick={() => setIsMobileMenuOpen(false)}
                              className={cn(
                                "flex items-center gap-4 px-4 py-4 rounded-xl transition-all duration-300 group relative overflow-hidden",
                                isActive
                                  ? "bg-gradient-to-r from-primary/20 to-accent/20 text-foreground border border-primary/30"
                                  : "text-foreground-secondary hover:text-foreground hover:bg-background-hover"
                              )}
                            >
                              {/* Active indicator bar */}
                              {isActive && (
                                <motion.div
                                  className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-button-primary"
                                  layoutId="mobileActiveNav"
                                />
                              )}

                              {/* Icon container */}
                              <div className={cn(
                                "w-11 h-11 rounded-xl flex-center transition-all duration-300",
                                isActive
                                  ? "bg-primary/20 group-hover:bg-primary/30"
                                  : "bg-background-tertiary group-hover:bg-background-elevated"
                              )}>
                                <Icon className={cn(
                                  "w-5 h-5 transition-colors",
                                  isActive ? "text-primary" : "text-foreground-muted group-hover:text-primary"
                                )} />
                              </div>

                              {/* Label */}
                              <span className="font-medium text-base flex-1">
                                {item.label}
                              </span>

                              {/* Arrow indicator */}
                              {isActive && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="w-2 h-2 rounded-full bg-primary"
                                />
                              )}
                            </Link>
                          </motion.div>
                        );
                      })}

                      {/* Divider */}
                      <div className="divider-gradient my-4" />

                      {/* CTA Button - Mobile */}
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.35 }}
                      >
                        <Link
                          href="/packages"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <Button className="w-full btn-primary btn-lg hover-lift">
                            <Sparkles className="w-5 h-5" />
                            Get Started Now
                            {reduceMotion ? (
                              <span>{"->"}</span>
                            ) : (
                              <motion.span
                                animate={{ x: [0, 5, 0] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                              >
                                {"->"}
                              </motion.span>
                            )}
                          </Button>
                        </Link>
                      </motion.div>

                      {/* Quick Contact */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3, delay: 0.4 }}
                        className="pt-4 mt-4 border-t border-border-soft"
                      >
                        <div className="flex items-center justify-center gap-4 text-xs text-foreground-muted">
                          <a
                            href="tel:+1234567890"
                            className="flex items-center gap-1 hover:text-primary transition-colors"
                          >
                            <Phone className="w-3 h-3" />
                            Call Us
                          </a>
                          <span>•</span>
                          <a
                            href="https://wa.me/1234567890"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 hover:text-success transition-colors"
                          >
                            💬 WhatsApp
                          </a>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </nav>
    </>
  );
}

export default Navbar;


