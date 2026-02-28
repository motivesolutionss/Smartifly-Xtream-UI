"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { PackageCard } from "@/components/packages/PackageCard";
import { CurrencyInfo } from "@/components/packages/CurrencyInfo";
import { PackageCardSkeleton } from "@/components/ui/skeleton";
import { usePackages } from "@/hooks/usePackages";
import { Tv2, Film, Shield, Zap, Globe, Star, Check, AlertCircle, RefreshCw, Package as PackageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePerformanceMode } from "@/hooks/usePerformanceMode";

const includedFeatures = [
  { icon: Tv2, label: "Live TV Channels", color: "text-violet-400", bgColor: "bg-violet-500/10" },
  { icon: Film, label: "Movies & Series", color: "text-cyan-400", bgColor: "bg-cyan-500/10" },
  { icon: Shield, label: "Secure Streaming", color: "text-green-400", bgColor: "bg-green-500/10" },
  { icon: Zap, label: "Fast Servers", color: "text-warning", bgColor: "bg-warning/10" },
  { icon: Globe, label: "Global Content", color: "text-primary", bgColor: "bg-primary/10" },
  { icon: Star, label: "Premium Quality", color: "text-orange-400", bgColor: "bg-orange-500/10" },
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

export default function PackagesPage() {
  const { reduceMotion } = usePerformanceMode();
  const { data: packages = [], isLoading, error, refetch, isError } = usePackages();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const errorMessage = error instanceof Error 
    ? error.message 
    : "Failed to load packages. Please try again later.";

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
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card-sm border border-primary/30 backdrop-blur-md mb-6">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-medium text-foreground">Pricing</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold font-heading mb-6 text-foreground">
            Choose Your{" "}
            <span className="text-gradient-animated">Perfect Plan</span>
          </h1>

          <p className="text-lg md:text-xl text-foreground-secondary max-w-2xl mx-auto">
            Select the package that suits your entertainment needs. All plans include our premium channel lineup and 24/7 support.
          </p>
        </motion.div>

        {/* Currency Info */}
        <CurrencyInfo />

        {/* Error State */}
        {isError && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-xl mx-auto mb-8"
          >
            <div className="glass-card glass-card-xl text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-destructive/5 rounded-full blur-3xl" />
              <div className="relative z-10 py-8">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-destructive" />
                </div>
                <h3 className="text-xl font-bold font-heading text-foreground mb-2">
                  Failed to Load Packages
                </h3>
                <p className="text-foreground-secondary mb-6">
                  {errorMessage}
                </p>
                <Button
                  onClick={() => refetch()}
                  className="btn-primary hover-lift"
                  disabled={isLoading}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Package Cards Grid */}
        {!isError && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto"
        >
          {isLoading ? (
            <>
              {[1, 2, 3].map((i) => (
                <motion.div key={i} variants={itemVariants}>
                  <PackageCardSkeleton />
                </motion.div>
              ))}
            </>
            ) : packages.length > 0 ? (
            <>
              {packages.map((pkg, index) => (
                <motion.div key={pkg.id} variants={itemVariants}>
                  <PackageCard pkg={pkg} index={index} />
                </motion.div>
              ))}
            </>
            ) : (
              <motion.div
                variants={itemVariants}
                className="col-span-full"
              >
                <EmptyPackagesState />
              </motion.div>
          )}
        </motion.div>
        )}

        {/* What's Included Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-20"
        >
          <div className="glass-card glass-card-xl max-w-4xl mx-auto relative overflow-hidden">
            {/* Subtle corner glows */}
            <div className="absolute top-0 left-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-accent/10 rounded-full blur-3xl" />

            <div className="relative z-10">
              <h3 className="font-heading text-xl md:text-2xl font-bold text-foreground mb-8 text-center">
                Included in Every Plan
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {includedFeatures.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={isInView ? { opacity: 1, y: 0 } : {}}
                      transition={{ duration: 0.4, delay: 0.5 + i * 0.1 }}
                      className="flex items-center gap-3 p-4 rounded-xl glass-card-sm hover:bg-background-hover transition-colors group"
                    >
                      <div className={`w-11 h-11 rounded-lg ${item.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <Icon className={`w-5 h-5 ${item.color}`} />
                      </div>
                      <span className="text-sm text-foreground font-medium">{item.label}</span>
                    </motion.div>
                  );
                })}
              </div>

              {/* Bottom info */}
              <div className="mt-8 pt-6 border-t border-border-soft text-center">
                <div className="inline-flex items-center gap-2 text-sm text-foreground-muted">
                  <Check className="w-4 h-4 text-success" />
                  <span>No hidden fees • Cancel anytime • Money-back guarantee</span>
                </div>
              </div>
            </div>

            {/* Bottom gradient line */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// Empty State Component
function EmptyPackagesState() {
  return (
    <div className="glass-card glass-card-xl text-center relative overflow-hidden py-16">
      <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />
      <div className="relative z-10">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <PackageIcon className="w-10 h-10 text-primary" />
        </div>
        <h3 className="text-xl font-bold font-heading text-foreground mb-2">
          No Packages Available
        </h3>
        <p className="text-foreground-secondary max-w-md mx-auto mb-6">
          We&apos;re currently updating our packages. Please check back soon for our latest offerings.
        </p>
        <Button
          onClick={() => window.location.reload()}
          variant="outline"
          className="hover-lift-sm"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Page
        </Button>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
    </div>
  );
}
