"use client";

import { motion, useInView } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Sparkles, MessageCircle, Play, Star, Zap, Shield, Check, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef } from "react";
import { usePerformanceMode } from "@/hooks/usePerformanceMode";

const features = [
    "No Setup Fees",
    "Cancel Anytime",
    "24/7 Support",
    "Money-Back Guarantee",
];

const trustIndicators = [
    { icon: Shield, label: "Secure Payment", color: "text-green-400", bgColor: "bg-green-500/10" },
    { icon: Zap, label: "Instant Access", color: "text-cyan-400", bgColor: "bg-cyan-500/10" },
    { icon: Star, label: "Top Rated", color: "text-warning", bgColor: "bg-warning/10" },
];

export function CTA() {
    const { reduceMotion } = usePerformanceMode();
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });

    return (
        <section className="section relative overflow-hidden">
            {/* Matching Animated Background Effects from Features/FAQ */}
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

            {/* Grid pattern overlay */}
            <div
                className="absolute inset-0 opacity-[0.02]"
                style={{
                    backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)`,
                    backgroundSize: '50px 50px',
                }}
            />

            <div className="container relative z-10" ref={ref}>
                {/* Section Header - Same style as Features */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-12"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card-sm border border-primary/30 backdrop-blur-md mb-6">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-foreground">Limited Time Offer</span>
                    </div>

                    <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold font-heading mb-6 text-foreground">
                        Start Streaming{" "}
                        <span className="text-gradient-animated">Today</span>
                    </h2>

                    <p className="text-lg md:text-xl text-foreground-secondary max-w-2xl mx-auto">
                        Join thousands of satisfied customers enjoying premium entertainment.
                        Get instant access with our flexible subscription plans.
                    </p>
                </motion.div>

                {/* Main CTA Card */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="max-w-4xl mx-auto"
                >
                    <div className="glass-card glass-card-xl relative overflow-hidden">
                        {/* Subtle corner glows */}
                        <div className="absolute top-0 left-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
                        <div className="absolute bottom-0 right-0 w-40 h-40 bg-accent/10 rounded-full blur-3xl" />

                        <div className="relative z-10">
                            {/* Features Grid */}
                            <div className="flex flex-wrap justify-center gap-3 mb-10">
                                {features.map((feature, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={isInView ? { opacity: 1, scale: 1 } : {}}
                                        transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
                                        className="flex items-center gap-2 glass-card-sm px-4 py-2.5 hover:bg-background-hover transition-colors"
                                    >
                                        <div className="w-5 h-5 rounded-full bg-success/20 flex-center">
                                            <Check className="w-3 h-3 text-success" />
                                        </div>
                                        <span className="text-sm font-medium text-foreground">
                                            {feature}
                                        </span>
                                    </motion.div>
                                ))}
                            </div>

                            {/* CTA Buttons */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={isInView ? { opacity: 1, y: 0 } : {}}
                                transition={{ duration: 0.6, delay: 0.5 }}
                                className="flex flex-wrap justify-center gap-4 mb-10"
                            >
                                <Link href="/packages">
                                    <Button
                                        size="lg"
                                        className="btn-primary btn-xl group hover-lift text-base md:text-lg px-8 py-6"
                                    >
                                        <Play className="w-5 h-5" />
                                        Choose Your Plan
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </Link>
                                <a
                                    href="https://wa.me/1234567890"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <Button
                                        variant="outline"
                                        size="lg"
                                        className="btn-outline btn-xl hover-lift-sm text-base md:text-lg px-8 py-6"
                                    >
                                        <MessageCircle className="w-5 h-5" />
                                        WhatsApp Us
                                    </Button>
                                </a>
                            </motion.div>

                            {/* Trust Indicators */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={isInView ? { opacity: 1 } : {}}
                                transition={{ duration: 0.6, delay: 0.6 }}
                                className="flex flex-wrap items-center justify-center gap-6 md:gap-10 pt-8 border-t border-border-soft"
                            >
                                {trustIndicators.map((indicator, i) => {
                                    const Icon = indicator.icon;
                                    return (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={isInView ? { opacity: 1, y: 0 } : {}}
                                            transition={{ duration: 0.4, delay: 0.7 + i * 0.1 }}
                                            className="flex items-center gap-3 group"
                                        >
                                            <div className={`w-10 h-10 rounded-lg ${indicator.bgColor} flex-center group-hover:scale-110 transition-transform`}>
                                                <Icon className={`w-5 h-5 ${indicator.color}`} />
                                            </div>
                                            <span className="text-sm font-medium text-foreground-secondary group-hover:text-foreground transition-colors">
                                                {indicator.label}
                                            </span>
                                        </motion.div>
                                    );
                                })}
                            </motion.div>
                        </div>

                        {/* Bottom gradient line */}
                        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                    </div>
                </motion.div>

                {/* Social Proof - Matching Hero Style */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: 0.8 }}
                    className="flex flex-wrap items-center justify-center gap-8 md:gap-12 mt-12"
                >
                    {/* Customers */}
                    <div className="flex items-center gap-3 group">
                        <div className="flex -space-x-2">
                            {[1, 2, 3, 4].map((i) => (
                                <div
                                    key={i}
                                    className="w-10 h-10 rounded-full bg-gradient-button-primary border-2 border-background flex-center shadow-lg"
                                >
                                    {i === 1 && <Users className="w-5 h-5 text-white" />}
                                </div>
                            ))}
                        </div>
                        <div className="text-left">
                            <div className="text-lg font-bold text-foreground">10,000+</div>
                            <div className="text-sm text-foreground-muted">Happy Customers</div>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="hidden md:block w-px h-12 bg-border-soft" />

                    {/* Rating */}
                    <div className="flex items-center gap-3 group">
                        <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <Star
                                    key={i}
                                    className="w-5 h-5 fill-warning text-warning"
                                />
                            ))}
                        </div>
                        <div className="text-left">
                            <div className="text-lg font-bold text-foreground">4.9/5</div>
                            <div className="text-sm text-foreground-muted">User Rating</div>
                        </div>
                    </div>
                </motion.div>

                {/* Security Badge */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={isInView ? { opacity: 1 } : {}}
                    transition={{ duration: 0.6, delay: 0.9 }}
                    className="mt-8 text-center"
                >
                    <div className="inline-flex items-center gap-2 text-sm text-foreground-muted">
                        <Shield className="w-4 h-4 text-success" />
                        <span>Secure checkout powered by industry-leading encryption</span>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
