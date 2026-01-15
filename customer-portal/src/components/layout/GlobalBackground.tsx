"use client";

import { motion, useSpring, useMotionValue } from "framer-motion";
import { useEffect } from "react";

export function GlobalBackground() {
    // Parallax values
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    // Smooth spring physics for the background movement
    const springX = useSpring(mouseX, { stiffness: 20, damping: 30 });
    const springY = useSpring(mouseY, { stiffness: 20, damping: 30 });

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            const { clientX, clientY } = e;
            const { innerWidth, innerHeight } = window;
            // Subtle shift: 20px range
            mouseX.set((clientX / innerWidth - 0.5) * 20);
            mouseY.set((clientY / innerHeight - 0.5) * 20);
        };
        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, [mouseX, mouseY]);

    return (
        <div
            className="fixed inset-0 z-[-1] overflow-hidden bg-background"
            style={{
                // MASKING: Fades in after navbar (80px) and fades out at bottom
                // This prevents the video from bleeding into nav/footer if they are transparent
                maskImage: 'linear-gradient(to bottom, transparent 0px, black 80px, black calc(100% - 150px), transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, transparent 0px, black 80px, black calc(100% - 150px), transparent 100%)',
            }}
        >
            {/* 1. The Video with Parallax */}
            <motion.div
                style={{ x: springX, y: springY, scale: 1.05 }}
                className="absolute inset-0 w-full h-full"
            >
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                    className="h-full w-full object-cover opacity-25 saturate-[0.7] contrast-[1.1]"
                >
                    <source src="/vid.webm" type="video/webm" />
                    <source src="/vid.mp4" type="video/mp4" />
                </video>
            </motion.div>

            {/* 2. Cinematic Overlays */}
            <div className="absolute inset-0 pointer-events-none">
                {/* Film Grain / Noise Overlay */}
                <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

                {/* Global Deep Tint */}
                <div className="absolute inset-0 bg-background/20" />

                {/* Vignette: Deep focus */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,hsl(var(--background))_100%)]" />

                {/* 3. The "Pretty" Grid: Dot Matrix Pattern */}
                <div
                    className="absolute inset-0 opacity-[0.15]"
                    style={{
                        backgroundImage: `radial-gradient(hsl(var(--primary)) 0.5px, transparent 0.5px)`,
                        backgroundSize: '32px 32px',
                        maskImage: 'radial-gradient(circle at center, black, transparent 80%)',
                    }}
                />

                {/* Horizontal Scanline Beams */}
                <motion.div
                    animate={{ y: ["-100%", "200%"] }}
                    transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-x-0 h-[30%] bg-gradient-to-b from-transparent via-primary/5 to-transparent mix-blend-overlay"
                />
            </div>

            {/* 4. Brand Glows (On Top of video, behind content) */}
            <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-primary/10 blur-[140px] rounded-full mix-blend-screen animate-pulse" />
            <div className="absolute bottom-[10%] right-[-5%] w-[40%] h-[40%] bg-accent/5 blur-[100px] rounded-full mix-blend-overlay" />

            {/* Bottom Blending Gradient (Extra safety for footer) */}
            <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent z-10" />
        </div>
    );
}