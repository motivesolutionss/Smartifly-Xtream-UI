"use client";

import { motion, useInView } from "framer-motion";
import { Tv, Smartphone, Download } from "lucide-react";
import { useRef } from "react";
import { usePerformanceMode } from "@/hooks/usePerformanceMode";

const apps = [
    {
        title: "Smart TV App",
        description: "Transform your living room into a cinema. Enjoy 4K HDR content, live channels, and a seamless interface tailored for large screens.",
        icon: Tv,
        badge: "Android TV & Fire TV",
        badgeColor: "bg-violet-500/20 text-violet-400 border-violet-500/30",
        iconColor: "from-violet-500 to-purple-600",
        borderColor: "border-violet-500/50",
        downloadUrl: "https://github.com/motivesolutionss/Smartifly-Xtream-UI/releases/download/v1.0.0/smartiflyapp.apk", // Placeholder: replace with actual URL or path when ready
        downloadLabel: "Download TV APK",
    },
    {
        title: "Mobile App",
        description: "Stream on the go. Never miss a moment of your favorite shows or live sports with our optimized Android mobile experience.",
        icon: Smartphone,
        badge: "Android Phones & Tablets",
        badgeColor: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
        iconColor: "from-cyan-500 to-blue-600",
        borderColor: "border-cyan-500/50",
        downloadUrl: "https://github.com/motivesolutionss/Smartifly-Xtream-UI/releases/download/v1.0.0/smartiflyapp.apk", // Placeholder: replace with actual URL or path when ready
        downloadLabel: "Download Mobile APK",
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

export function DownloadApps() {
    const { reduceMotion } = usePerformanceMode();
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });

    return (
        <section id="download" className="section relative overflow-hidden scroll-mt-20 md:scroll-mt-24">
            {/* Animated Background Effects */}
            <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl h-96 bg-gradient-glow-primary rounded-full blur-3xl opacity-5"
                animate={reduceMotion ? { opacity: 0.05 } : { scale: [1, 1.1, 1], opacity: [0.05, 0.1, 0.05]}}
                transition={reduceMotion ? { duration: 0.2 } : { duration: 8, repeat: Infinity, ease: "easeInOut" }}
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
                        <Download className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-foreground">Get Our Apps</span>
                    </div>

                    <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold font-heading mb-6 text-foreground">
                        Stream Anywhere, Anytime
                    </h2>

                    <p className="text-lg md:text-xl text-foreground-secondary max-w-3xl mx-auto">
                        Download our dedicated apps for your Smart TV and Android mobile devices for the ultimate viewing experience.
                    </p>
                </motion.div>

                {/* Apps Grid */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate={isInView ? "visible" : "hidden"}
                    className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto"
                >
                    {apps.map((app, index) => {
                        const Icon = app.icon;
                        return (
                            <motion.div
                                key={index}
                                variants={itemVariants}
                                whileHover={reduceMotion ? undefined : { y: -8 }}
                                className="group relative"
                            >
                                {/* Card Container */}
                                <div className="glass-card glass-card-interactive h-full relative overflow-hidden flex flex-col">
                                    {/* Badge */}
                                    <div className="flex items-center justify-between mb-8">
                                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${app.badgeColor}`}>
                                            <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                                            {app.badge}
                                        </div>
                                    </div>

                                    {/* Icon & Content Container */}
                                    <div className="flex flex-col items-center text-center flex-grow">
                                        <div className="relative mb-8">
                                            <div className="relative w-24 h-24 mx-auto">
                                                {/* Static full border */}
                                                <div className={`absolute inset-0 rounded-2xl border ${app.borderColor} opacity-30`} />

                                                {/* Icon background */}
                                                <div className="absolute inset-2 rounded-2xl bg-background-tertiary flex items-center justify-center rotate-3 group-hover:rotate-6 transition-transform duration-300">
                                                    <Icon className="w-10 h-10 text-foreground" />
                                                </div>
                                            </div>
                                        </div>

                                        <h3 className="text-2xl font-bold font-heading text-foreground mb-4">
                                            {app.title}
                                        </h3>
                                        <p className="text-base text-foreground-secondary leading-relaxed mb-8 max-w-sm mx-auto">
                                            {app.description}
                                        </p>
                                    </div>

                                    {/* Download Button */}
                                    <div className="mt-auto">
                                        <a
                                            href={app.downloadUrl}
                                            className="btn-primary w-full group/btn"
                                            onClick={(e) => {
                                                if (app.downloadUrl === '#') {
                                                    e.preventDefault();
                                                    alert('Download URL not configured yet.');
                                                }
                                            }}
                                        >
                                            <Download className="w-5 h-5 mr-2 transition-transform group-hover/btn:-translate-y-1" />
                                            {app.downloadLabel}
                                        </a>
                                    </div>

                                    {/* Hover Glow Effect */}
                                    <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${app.iconColor} opacity-0 group-hover:opacity-5 transition-opacity duration-500 pointer-events-none`} />
                                </div>
                            </motion.div>
                        );
                    })}
                </motion.div>
            </div>
        </section>
    );
}
