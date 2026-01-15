"use client";

import dynamic from "next/dynamic";
import { Hero } from "@/components/home/Hero";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

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

const CTA = dynamic(() => import("@/components/home/CTA").then(mod => mod.CTA), {
  loading: () => (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  ),
  ssr: true,
});

export default function HomePage() {
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
            behavior: 'smooth'
          });
        }
      }, 100);
    }
  }, []);

  return (
    <>
      <Hero />
      <Features />
      <FAQ />
      <CTA />
    </>
  );
}
