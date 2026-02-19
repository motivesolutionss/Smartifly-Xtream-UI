"use client";

import { useMemo, memo } from "react";
import { motion } from "framer-motion";
import { Check, Star, ArrowRight, Shield } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/contexts/CurrencyContext";
import { convertPrice, formatPrice } from "@/lib/currency";
import type { Package } from "@/types";

interface PackageCardProps {
  pkg: Package;
  index: number;
}

/**
 * PackageCard component with memoized currency conversion.
 * Prevents unnecessary re-renders and recalculations.
 */
export const PackageCard = memo(function PackageCard({ pkg, index }: PackageCardProps) {
  const { selectedCurrency, exchangeRates } = useCurrency();

  // Memoize currency conversion to avoid recalculating on every render
  const convertedPrice = useMemo(
    () => convertPrice(
      pkg.price,
      pkg.currency || 'USD',
      selectedCurrency,
      exchangeRates
    ),
    [pkg.price, pkg.currency, selectedCurrency, exchangeRates]
  );

  // Memoize formatted price string
  const formattedPrice = useMemo(
    () => formatPrice(convertedPrice, selectedCurrency),
    [convertedPrice, selectedCurrency]
  );

  return (
    <div className="h-full group">
      <div
        className={`h-full relative overflow-hidden glass-card glass-card-interactive transition-all duration-500 ${pkg.isPopular
          ? "border-primary/50 shadow-glow-violet ring-1 ring-primary/20"
          : "hover:border-primary/30"
          }`}
      >
        {/* Popular Badge */}
        {pkg.isPopular && (
          <>
            {/* Top gradient line */}
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-accent to-primary" />

            {/* Badge */}
            <div className="absolute top-4 right-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/20 text-primary border border-primary/30 text-xs font-semibold">
                <Star className="w-3 h-3 fill-current" />
                Most Popular
              </div>
            </div>
          </>
        )}

        {/* Corner glow for popular */}
        {pkg.isPopular && (
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
        )}

        {/* Header */}
        <div className="pb-4 pt-8 relative z-10">
          <h3 className="text-2xl font-bold font-heading text-foreground mb-3">{pkg.name}</h3>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span
              className={`font-bold font-heading text-gradient ${formattedPrice.length > 8
                ? 'text-3xl sm:text-4xl'
                : 'text-4xl sm:text-5xl'
                }`}
            >
              {formattedPrice}
            </span>
            <span className="text-foreground-muted text-base sm:text-lg whitespace-nowrap">/{pkg.duration}</span>
          </div>
        </div>

        {/* Features List */}
        <div className="space-y-3 py-6 border-t border-border-soft relative z-10">
          {pkg.features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 + i * 0.05 }}
              className="flex items-center gap-3 group/item hover:translate-x-1 transition-transform"
            >
              <div className="w-6 h-6 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0 group-hover/item:bg-success/30 transition-colors">
                <Check className="w-3.5 h-3.5 text-success" />
              </div>
              <span className="text-foreground text-sm">{feature}</span>
            </motion.div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="space-y-4 pt-4 border-t border-border-soft relative z-10">
          <Link
            href={`/subscription/request?packageId=${pkg.id}`}
            className="block"
            aria-label={`Subscribe to ${pkg.name}`}
          >
            <Button
              size="lg"
              className={`w-full group/btn ${pkg.isPopular
                ? "btn-primary hover-lift"
                : "btn-outline hover-lift-sm"
                }`}
            >
              Subscribe Now
              <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
            </Button>
          </Link>

          {/* Trust Indicator */}
          <div className="flex items-center justify-center gap-2 pt-2">
            <Shield className="w-3.5 h-3.5 text-success/70" />
            <span className="text-xs text-foreground-muted">
              Secure • Instant Access • No Hidden Fees
            </span>
          </div>
        </div>

        {/* Hover glow effect */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

        {/* Bottom gradient line */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for memo
  // Only re-render if package data or index changes
  return (
    prevProps.pkg.id === nextProps.pkg.id &&
    prevProps.pkg.price === nextProps.pkg.price &&
    prevProps.pkg.currency === nextProps.pkg.currency &&
    prevProps.index === nextProps.index
  );
});
