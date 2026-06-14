"use client";

import dynamic from "next/dynamic";
import { Hero } from "@/components/home/Hero";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { usePerformanceMode } from "@/hooks/usePerformanceMode";

// Lazy load heavy components that are below the fold
// These components use framer-motion and are not critical for initial render
// Using next/dynamic instead of React.lazy for better Next.js App Router compatibility
const Features = dynamic(() => import("@/components/home/Features").then(mod => mod.Features), {
  loading: () => (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  ),
  ssr: true, // Enable SSR for better initial load
});

const FAQ = dynamic(() => import("@/components/home/FAQ").then(mod => mod.FAQ), {
  loading: () => (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  ),
  ssr: true,
});

const DownloadApps = dynamic(() => import("@/components/home/DownloadApps").then(mod => mod.DownloadApps), {
  loading: () => (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  ),
  ssr: true,
});

const CTA = dynamic(() => import("@/components/home/CTA").then(mod => mod.CTA), {
  loading: () => (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  ),
  ssr: true,
});

export default function HomePage() {
  const { useLiteEffects } = usePerformanceMode();
  const [showDeferredSections, setShowDeferredSections] = useState(!useLiteEffects);

  useEffect(() => {
    if (!useLiteEffects) {
      setShowDeferredSections(true);
      return;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof globalThis.setTimeout> | null = null;

    const revealSections = () => {
      if (!cancelled) {
        setShowDeferredSections(true);
      }
    };

    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(revealSections, { timeout: 1500 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(idleId);
      };
    }

    timeoutId = globalThis.setTimeout(revealSections, 600);
    return () => {
      cancelled = true;
      if (timeoutId !== null) {
        globalThis.clearTimeout(timeoutId);
      }
    };
  }, [useLiteEffects]);

  // Handle hash scrolling when navigating from other pages
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      // Wait for components to render, then scroll
      setTimeout(() => {
        const element = document.querySelector(hash);
        if (element) {
          const offset = 80; // Account for fixed navbar
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - offset;

          window.scrollTo({
            top: offsetPosition,
            behavior: useLiteEffects ? "auto" : "smooth"
          });
        }
      }, 100);
    }
  }, [useLiteEffects]);

  return (
    <>
      <Hero />
      {showDeferredSections && (
        <>
          <Features />
          <DownloadApps />
          <FAQ />
          <CTA />
        </>
      )}
    </>
  );
}
