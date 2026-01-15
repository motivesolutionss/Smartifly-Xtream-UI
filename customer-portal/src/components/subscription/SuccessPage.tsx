"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle, MessageCircle, Loader2, Package, Clock, CreditCard, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import { getSubscriptionRequest } from "@/lib/api";
import { CONTACT_CONFIG } from "@/lib/contact-utils";
import type { SubscriptionRequest } from "@/types";

interface SuccessPageProps {
  requestId: string;
}

export function SuccessPage({ requestId }: SuccessPageProps) {
  const [subscription, setSubscription] = useState<SubscriptionRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSubscription() {
      try {
        const data = await getSubscriptionRequest(requestId);
        setSubscription(data);
      } catch (error) {
        logger.error("Error loading subscription:", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (requestId) {
      loadSubscription();
    }
  }, [requestId]);

  const generateWhatsAppMessage = () => {
    if (!subscription) return "";

    const message = `Hello 👋
I've verified my email and received the subscription PDF.

Plan: ${subscription.package.name}
Duration: ${subscription.package.duration}
Price: ${subscription.package.currency} ${subscription.package.price}

I'd like to proceed further with payment and activation.`;

    return encodeURIComponent(message);
  };

  const whatsappLink = subscription
    ? `https://wa.me/${CONTACT_CONFIG.whatsappNumber}?text=${generateWhatsAppMessage()}`
    : `https://wa.me/${CONTACT_CONFIG.whatsappNumber}`;

  // Loading State
  if (isLoading) {
    return (
      <section className="section bg-background relative overflow-hidden">
        <motion.div
          className="absolute top-20 left-1/4 w-96 h-96 bg-gradient-glow-violet rounded-full blur-3xl opacity-10"
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.15, 0.1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="container">
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-foreground-muted">Loading subscription details...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section bg-background relative overflow-hidden">
      {/* Background Effects */}
      <motion.div
        className="absolute top-20 left-1/4 w-96 h-96 bg-gradient-glow-violet rounded-full blur-3xl opacity-10"
        animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.15, 0.1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-20 right-1/4 w-96 h-96 bg-gradient-glow-cyan rounded-full blur-3xl opacity-10"
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.1, 0.15, 0.1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)`,
          backgroundSize: '50px 50px',
        }}
      />

      <div className="container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mx-auto"
        >
          <div className="glass-card glass-card-xl text-center relative overflow-hidden">
            {/* Success corner glow */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-success/10 rounded-full blur-3xl" />

            <div className="relative z-10">
              {/* Success Icon */}
              <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-success" />
              </div>

              <h2 className="text-2xl md:text-3xl font-bold font-heading text-foreground mb-4">
                Email Verified Successfully!
              </h2>

              <p className="text-foreground-secondary mb-8 max-w-md mx-auto">
                Your subscription payment instructions have been sent to your email.
                Please check your inbox for the PDF document with bank details.
              </p>

              {/* Subscription Details */}
              {subscription && (
                <div className="glass-card-sm p-6 mb-8 text-left">
                  <h3 className="font-bold font-heading text-foreground mb-4 text-center">
                    Subscription Details
                  </h3>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-background-tertiary/30">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Package className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-foreground-muted">Package</p>
                        <p className="font-medium text-foreground">{subscription.package.name}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-xl bg-background-tertiary/30">
                      <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-foreground-muted">Duration</p>
                        <p className="font-medium text-foreground">{subscription.package.duration}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-xl bg-background-tertiary/30">
                      <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-success" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-foreground-muted">Price</p>
                        <p className="font-bold text-gradient text-lg">
                          {subscription.package.currency} {subscription.package.price}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <p className="text-sm text-foreground-muted mb-6">
                After completing the payment, contact our admin team on WhatsApp to proceed with activation.
              </p>

              {/* WhatsApp Button */}
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button size="lg" className="w-full btn-primary btn-lg hover-lift group">
                  <MessageCircle className="w-5 h-5" />
                  Chat with Admin on WhatsApp
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </a>

              <p className="text-xs text-foreground-muted mt-4">
                Clicking the button will open WhatsApp with a pre-filled message
              </p>

              {/* Check Status Link */}
              <div className="mt-6 pt-6 border-t border-border-soft">
                <Link href="/subscription" className="text-sm text-primary hover:underline">
                  Check your request status anytime →
                </Link>
              </div>
            </div>

            {/* Bottom gradient line */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-success/30 to-transparent" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
