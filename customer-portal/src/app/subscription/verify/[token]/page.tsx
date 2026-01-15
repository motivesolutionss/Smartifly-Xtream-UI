"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, CheckCircle, XCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { verifySubscriptionToken, getSubscriptionRequest } from "@/lib/api";
import { logger } from "@/lib/logger";
import { SuccessPage } from "@/components/subscription/SuccessPage";

export default function VerifySubscriptionPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  
  // Type-safe token extraction
  const token = typeof params?.token === 'string' ? params.token : null;

  const [status, setStatus] = useState<"loading" | "success" | "error" | "already-verified">("loading");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    async function verify() {
      if (!token) {
        setStatus("error");
        setErrorMessage("Invalid verification link. Please check your email and try again.");
        return;
      }

      try {
        const response = await verifySubscriptionToken(token);
        setRequestId(response.requestId);

        if (response.alreadyVerified) {
          setStatus("already-verified");
        } else {
          setStatus("success");
        }
      } catch (error: any) {
        logger.error("Error verifying subscription:", error);
        setStatus("error");
        setErrorMessage(error.userMessage || error.message || "Verification failed");
      }
    }

    verify();
  }, [token]);

  // Loading State
  if (status === "loading") {
    return (
      <section className="section relative overflow-hidden">
        {/* Background Effects */}
        <motion.div
          className="absolute top-20 left-1/4 w-96 h-96 bg-gradient-glow-violet rounded-full blur-3xl opacity-10"
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.15, 0.1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="container">
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-foreground-muted">Verifying your email...</p>
          </div>
        </div>
      </section>
    );
  }

  // Error State
  if (status === "error") {
    return (
      <section className="section relative overflow-hidden">
        {/* Background Effects */}
        <motion.div
          className="absolute top-20 left-1/4 w-96 h-96 bg-gradient-glow-violet rounded-full blur-3xl opacity-10"
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.15, 0.1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
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
              {/* Corner glow */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-destructive/10 rounded-full blur-3xl" />

              <div className="relative z-10 py-4">
                <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-6">
                  <XCircle className="w-10 h-10 text-destructive" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold font-heading text-foreground mb-4">
                  Verification Failed
                </h2>
                <p className="text-foreground-secondary mb-8 max-w-md mx-auto">
                  {errorMessage || "Verification link expired. Please request a new one."}
                </p>
                <Link href="/packages">
                  <Button className="btn-primary hover-lift">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Packages
                  </Button>
                </Link>
              </div>

              {/* Bottom gradient line */}
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-destructive/30 to-transparent" />
            </div>
          </motion.div>
        </div>
      </section>
    );
  }

  // Success State
  if (status === "success" || status === "already-verified") {
    return <SuccessPage requestId={requestId!} />;
  }

  return null;
}
