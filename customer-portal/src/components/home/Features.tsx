"use client";

import { motion, useInView } from "framer-motion";
import { Play, Shield, Zap, Globe } from "lucide-react";
import { useRef } from "react";
import { usePerformanceMode } from "@/hooks/usePerformanceMode";

const features = [
    {
        icon: Globe,
        title: "2000+ Channels",
        description: "Access live TV from around the world with premium quality streaming.",
        badge: "Most Popular",
        badgeColor: "bg-primary/20 text-primary border-primary/30",
        stats: "150+ Countries",
        iconColor: "from-violet-500 to-purple-600",
        borderColor: "border-violet-500/50",
    },
    {
        icon: Zap,
        title: "Ultra-Fast Streaming",
        description: "Experience buffer-free viewing with our optimized CDN infrastructure.",
        badge: "Zero Buffer",
        badgeColor: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
        stats: "1ms Latency",
        iconColor: "from-cyan-500 to-blue-600",
        borderColor: "border-cyan-500/50",
    },
    {
        icon: Shield,
        title: "Secure & Reliable",
        description: "99.9% uptime guarantee with enterprise-grade security protocols.",
        badge: "Enterprise Grade",
        badgeColor: "bg-green-500/20 text-green-400 border-green-500/30",
        stats: "99.9% Uptime",
        iconColor: "from-green-500 to-emerald-600",
        borderColor: "border-green-500/50",
    },
    {
        icon: Play,
        title: "VOD Library",
        description: "Thousands of movies and series available on-demand anytime.",
        badge: "10K+ Content",
        badgeColor: "bg-orange-500/20 text-orange-400 border-orange-500/30",
        stats: "Updated Daily",
        iconColor: "from-orange-500 to-red-600",
        borderColor: "border-orange-500/50",
    },
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
    hidden: { opacity: 0, y: 30 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.5,
        },
    },
};

export function Features() {
    const { reduceMotion } = usePerformanceMode();
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });

    return (
        <section id="features" className="section relative overflow-hidden scroll-mt-20 md:scroll-mt-24">
            {/* Animated Background Effects */}
            <motion.div
                className="absolute top-20 left-1/4 w-96 h-96 bg-gradient-glow-violet rounded-full blur-3xl opacity-10"
                animate={reduceMotion ? { opacity: 0.1 } : { scale: [1, 1.2, 1], opacity: [0.1, 0.15, 0.1]}}
                transition={reduceMotion ? { duration: 0.2 } : { duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
                className="absolute bottom-20 right-1/4 w-96 h-96 bg-gradient-glow-cyan rounded-full blur-3xl opacity-10"
                animate={reduceMotion ? { opacity: 0.1 } : { scale: [1.2, 1, 1.2], opacity: [0.1, 0.15, 0.1]}}
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
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card-sm border border-primary/30 backdrop-blur-md mb-6">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        <span className="text-sm font-medium text-foreground">Why Smartifly?</span>
                    </div>

                    <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold font-heading mb-6 text-foreground">
                        Everything You Need for Premium Streaming
                    </h2>

                    <p className="text-lg md:text-xl text-foreground-secondary max-w-3xl mx-auto">
                        We deliver the best streaming experience with cutting-edge technology and premium content.
                    </p>
                </motion.div>

                {/* Features Grid */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate={isInView ? "visible" : "hidden"}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
                >
                    {features.map((feature, index) => {
                        const Icon = feature.icon;
                        return (
                            <motion.div
                                key={index}
                                variants={itemVariants}
                                whileHover={reduceMotion ? undefined : { y: -8 }}
                                className="group relative"
                            >
                                {/* Card Container */}
                                <div className="glass-card glass-card-interactive h-full relative overflow-hidden">
                                    {/* Badge */}
                                    <div className="flex items-center justify-between mb-6">
                                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${feature.badgeColor}`}>
                                            <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                                            {feature.badge}
                                        </div>
                                    </div>

                                    {/* Icon Container with Border Effect */}
                                    <div className="relative mb-6">
                                        <div className="relative w-20 h-20 mx-auto">
                                            {/* Animated border ring */}
                                            {!reduceMotion && (
                                                <motion.div
                                                    className={`absolute inset-0 rounded-full border-2 ${feature.borderColor}`}
                                                    animate={{
                                                        rotate: [0, 360],
                                                        scale: [1, 1.05, 1],
                                                    }}
                                                    transition={{
                                                        rotate: {
                                                            duration: 20,
                                                            repeat: Infinity,
                                                            ease: "linear",
                                                        },
                                                        scale: {
                                                            duration: 2,
                                                            repeat: Infinity,
                                                            ease: "easeInOut",
                                                        },
                                                    }}
                                                    style={{
                                                        clipPath: "polygon(0% 0%, 100% 0%, 100% 50%, 0% 50%)",
                                                    }}
                                                />
                                            )}

                                            {/* Static full border */}
                                            <div className={`absolute inset-0 rounded-full border ${feature.borderColor} opacity-30`} />

                                            {/* Icon background */}
                                            <div className="absolute inset-2 rounded-full bg-background-tertiary flex items-center justify-center">
                                                <Icon className="w-8 h-8 text-foreground" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="text-center space-y-3">
                                        <h3 className="text-xl font-bold font-heading text-foreground">
                                            {feature.title}
                                        </h3>
                                        <p className="text-sm text-foreground-secondary leading-relaxed">
                                            {feature.description}
                                        </p>
                                    </div>

                                    {/* Stats Footer */}
                                    <div className="mt-6 pt-6 border-t border-border-soft">
                                        <div className="flex items-center justify-center gap-2 text-sm">
                                            <span className={`font-semibold bg-gradient-to-r ${feature.iconColor} bg-clip-text text-transparent`}>
                                                {feature.stats}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Hover Glow Effect */}
                                    <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.iconColor} opacity-0 group-hover:opacity-5 transition-opacity duration-500 pointer-events-none`} />
                                </div>
                            </motion.div>
                        );
                    })}
                </motion.div>
            </div>
        </section>
    );
}
