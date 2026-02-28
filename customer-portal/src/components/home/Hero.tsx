"use client";

import { motion, useScroll, useTransform, useSpring, useMotionValue } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Play, Monitor, Smartphone, Tv, Laptop } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef, useEffect } from "react";
import { usePerformanceMode } from "@/hooks/usePerformanceMode";

export function Hero() {
    const containerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const { reduceMotion } = usePerformanceMode();

    // Mouse Parallax effect
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const springX = useSpring(mouseX, { stiffness: 40, damping: 30 });
    const springY = useSpring(mouseY, { stiffness: 40, damping: 30 });

    const { scrollY } = useScroll();
    const yTransform = useTransform(scrollY, [0, 500], [0, 200]);
    const opacityTransform = useTransform(scrollY, [0, 400], [1, 0]);

    useEffect(() => {
        if (reduceMotion) return;

        let rafId: number | null = null;

        const handleMouseMove = (e: MouseEvent) => {
            if (rafId !== null) return;
            rafId = window.requestAnimationFrame(() => {
                const { clientX, clientY } = e;
                const { innerWidth, innerHeight } = window;
                // Shifting by 30px max for a subtle look
                mouseX.set((clientX / innerWidth - 0.5) * 30);
                mouseY.set((clientY / innerHeight - 0.5) * 30);
                rafId = null;
            });
        };
        window.addEventListener("mousemove", handleMouseMove, { passive: true });
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            if (rafId !== null) {
                window.cancelAnimationFrame(rafId);
            }
        };
    }, [mouseX, mouseY, reduceMotion]);

    return (
        <section
            ref={containerRef}
            className="relative h-screen min-h-[850px] flex items-center justify-center overflow-hidden bg-background"
        >
            {/* LAYER 1: Cinematic Video Background */}
            <motion.div
                className="absolute inset-0 z-0 pointer-events-none"
                style={{
                    ...(reduceMotion
                        ? { scale: 1 }
                        : {
                              x: springX,
                              y: springY,
                              scale: 1.05, // Slightly larger to prevent edges showing during parallax
                          }),
                }}
            >
                <div className="absolute inset-0 bg-background/40 z-[1]" /> {/* Subtle tint */}
                <video
                    ref={videoRef}
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                    className="w-full h-full object-cover opacity-60"
                >
                    <source src="/vid.webm" type="video/webm" />
                    <source src="/vid.mp4" type="video/mp4" />
                </video>
            </motion.div>

            {/* LAYER 2: HIGH-END OVERLAYS (Grids & Gradients) */}
            <div className="absolute inset-0 z-10 pointer-events-none">

                {/* 2.1: The Grid - Sharp brand-colored grid */}
                <div
                    className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--primary)/0.1)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--primary)/0.1)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_30%,transparent_100%)] opacity-50"
                />

                {/* 2.2: Ambient Lighting - Mix blend modes to "light up" the video pixels */}
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-primary/20 blur-[140px] rounded-full mix-blend-screen opacity-40 animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[120px] rounded-full mix-blend-overlay opacity-50" />

                {/* 2.3: Modern Bottom Fade - Fades the video perfectly into the rest of the site */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background z-[12]" />

                {/* 2.4: Left/Right Vignette - Cinematic Focus */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,hsl(var(--background)/0.8)_110%)] z-[11]" />
            </div>

            {/* LAYER 3: Main Content Layer */}
            <motion.div
                className="container relative z-20 px-4 text-center"
                style={{ y: yTransform, opacity: opacityTransform }}
            >
                {/* Glassmorphism Badge */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-2xl mb-10 shadow-xl"
                >
                    <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary))]" />
                    <span className="text-[10px] font-black tracking-[0.4em] uppercase text-foreground/90 font-heading">
                        Next-Generation IPTV
                    </span>
                </motion.div>

                {/* Ultra-Bold Heading with Gradient */}
                <motion.h1
                    initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ duration: 1, ease: [0.19, 1, 0.22, 1] }}
                    className="text-6xl md:text-8xl lg:text-9xl font-bold tracking-tighter text-foreground mb-8 font-heading leading-[0.85]"
                >
                    Stream Without <br />
                    <span className="text-gradient-animated drop-shadow-[0_0_35px_rgba(var(--primary),0.4)]">
                        Boundaries
                    </span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="max-w-2xl mx-auto text-lg md:text-2xl text-foreground-secondary mb-12 font-body font-light balance"
                >
                    Access <span className="text-foreground font-semibold">20,000+ Premium Channels</span> and a massive
                    VOD library in stunning 4K. Experience the future of television.
                </motion.p>

                {/* High-Performance Buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-6"
                >
                    <Link href="/packages">
                        <Button
                            size="lg"
                            className="h-16 px-12 bg-primary hover:bg-primary-dark text-primary-foreground rounded-full group hover-lift shadow-premium-glow text-lg font-bold transition-all"
                        >
                            <Play className="mr-3 h-6 w-6 fill-current" />
                            START STREAMING
                            <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-1 transition-transform" />
                        </Button>
                    </Link>

                    <Link href="/tickets/create">
                        <Button
                            variant="outline"
                            size="lg"
                            className="h-16 px-12 rounded-full border-white/10 bg-white/5 backdrop-blur-xl hover:bg-white/10 transition-all hover-lift text-lg font-bold"
                        >
                            SUPPORT
                        </Button>
                    </Link>
                </motion.div>

                {/* Device Trust Badges */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.1 }}
                    className="mt-24 flex items-center justify-center gap-10 text-foreground/30"
                >
                    {[
                        { icon: Monitor, label: "Smart TV" },
                        { icon: Smartphone, label: "Mobile" },
                        { icon: Laptop, label: "Laptop" },
                        { icon: Tv, label: "Set-top Box" }
                    ].map((item, i) => (
                        <div key={i} className="flex flex-col items-center gap-4 group cursor-default">
                            <item.icon className="w-7 h-7 group-hover:text-primary transition-colors duration-300" />
                            <span className="text-[9px] font-black tracking-widest hidden md:block opacity-0 group-hover:opacity-100 transition-opacity">
                                {item.label}
                            </span>
                        </div>
                    ))}
                </motion.div>
            </motion.div>

            {/* Subtle Scroll Indicator */}
            {!reduceMotion && (
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 opacity-40">
                    <motion.div
                        animate={{ y: [0, 8, 0] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="w-px h-12 bg-gradient-to-b from-primary to-transparent"
                    />
                </div>
            )}
        </section>
    );
}
