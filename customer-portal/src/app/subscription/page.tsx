"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Loader2, User, Calendar, Package, CheckCircle, Clock, AlertCircle, XCircle, Mail, CreditCard, Shield } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { useSubscriptionLookup } from "@/hooks/useSubscriptionLookup";
import { sanitizeEmail } from "@/lib/sanitize";
import type { SubscriptionLookupResult } from "@/lib/api";

const searchSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export default function SubscriptionPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [searchEmail, setSearchEmail] = useState<string | null>(null);

  const { 
    data: result, 
    isLoading, 
    error, 
    isError, 
    isFetching,
    refetch 
  } = useSubscriptionLookup(searchEmail);

  const isNotFound = (error as any)?.status === 404;
  const isRateLimited = (error as any)?.status === 429;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = searchSchema.safeParse({ email });
    if (!validation.success) {
      toast({
        title: "Validation Error",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    // Sanitize email before lookup
    const sanitizedEmail = sanitizeEmail(email);
    setSearchEmail(sanitizedEmail);

    // Show toast for rate limiting
    if (isRateLimited) {
        toast({
          title: "Too Many Requests",
          description: "Please wait a few minutes before trying again.",
          variant: "destructive",
        });
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "approved":
        return {
          variant: "success" as const,
          icon: CheckCircle,
          label: "Approved",
          description: "Your subscription request has been approved!",
          color: "text-success",
          bgColor: "bg-success/10",
        };
      case "rejected":
        return {
          variant: "destructive" as const,
          icon: XCircle,
          label: "Rejected",
          description: "Your request was not approved. Please contact support.",
          color: "text-destructive",
          bgColor: "bg-destructive/10",
        };
      default:
        return {
          variant: "warning" as const,
          icon: Clock,
          label: "Pending",
          description: "Your request is being reviewed by our team.",
          color: "text-warning",
          bgColor: "bg-warning/10",
        };
    }
  };

  const statusConfig = result ? getStatusConfig(result.status || 'pending') : null;

  return (
    <section className="section relative overflow-hidden">
      {/* Matching Animated Background Effects */}
      <motion.div
        className="absolute top-20 left-1/4 w-96 h-96 bg-gradient-glow-violet rounded-full blur-3xl opacity-10"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.15, 0.1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute bottom-20 right-1/4 w-96 h-96 bg-gradient-glow-cyan rounded-full blur-3xl opacity-10"
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.1, 0.15, 0.1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
      />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)`,
          backgroundSize: '50px 50px',
        }}
      />

      <div className="container relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card-sm border border-primary/30 backdrop-blur-md mb-6">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-medium text-foreground">My Subscription</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold font-heading mb-6 text-foreground">
            Check Your{" "}
            <span className="text-gradient-animated">Request Status</span>
          </h1>

          <p className="text-lg text-foreground-secondary max-w-2xl mx-auto">
            Enter your email to view the status of your subscription request.
          </p>
        </motion.div>

        {/* Search Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-xl mx-auto mb-8"
        >
          <div className="glass-card glass-card-xl relative overflow-hidden">
            {/* Corner glows */}
            <div className="absolute top-0 left-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-3xl" />

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Search className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold font-heading text-foreground">Lookup Request</h2>
                  <p className="text-sm text-foreground-secondary">Enter your registered email</p>
                </div>
              </div>

              <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                <Input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    // Reset search when user types
                    if (searchEmail) {
                      setSearchEmail(null);
                    }
                  }}
                  className="flex-1"
                  disabled={isLoading}
                />
                <Button type="submit" className="btn-primary hover-lift" disabled={isLoading || isFetching}>
                  {(isLoading || isFetching) ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  Check Status
                </Button>
              </form>
              {isError && !isNotFound && !isRateLimited && (
                <p className="text-sm text-destructive mt-3">
                  {error instanceof Error ? error.message : "Failed to lookup subscription"}
                </p>
              )}
              {isRateLimited && (
                <p className="text-sm text-destructive mt-3">
                  Too many lookup attempts. Please try again in 10 minutes.
                </p>
              )}
            </div>

            {/* Bottom gradient line */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          </div>
        </motion.div>

        {/* Not Found State */}
        {isNotFound && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-xl mx-auto"
          >
            <div className="glass-card glass-card-xl text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-32 h-32 bg-warning/5 rounded-full blur-3xl" />

              <div className="relative z-10 py-4">
                <div className="w-16 h-16 rounded-full bg-foreground-muted/10 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-foreground-muted" />
                </div>
                <h3 className="text-xl font-bold font-heading text-foreground mb-2">
                  No Request Found
                </h3>
                <p className="text-foreground-secondary mb-6">
                  We couldn&apos;t find a verified subscription request for this email.
                  If you recently submitted a request, please verify your email first.
                </p>
                <Link href="/packages">
                  <Button className="btn-primary hover-lift">
                    View Our Packages
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        {/* Result Display */}
        {result && statusConfig && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-xl mx-auto"
          >
            <div className="glass-card glass-card-xl relative overflow-hidden">
              {/* Status-based corner glow */}
              <div className={`absolute top-0 right-0 w-40 h-40 ${statusConfig.bgColor} rounded-full blur-3xl`} />

              <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-border-soft">
                  <h2 className="text-xl font-bold font-heading text-foreground">Request Details</h2>
                  <Badge variant={statusConfig.variant} className="capitalize flex items-center gap-1.5">
                    <statusConfig.icon className="w-3.5 h-3.5" />
                    {statusConfig.label}
                  </Badge>
                </div>

                {/* Status Description */}
                <div className={`flex items-center gap-3 p-4 rounded-xl ${statusConfig.bgColor} mb-6`}>
                  <statusConfig.icon className={`w-6 h-6 ${statusConfig.color}`} />
                  <p className={`text-sm font-medium ${statusConfig.color}`}>{statusConfig.description}</p>
                </div>

                {/* Details Grid */}
                <div className="space-y-3">
                  {/* Name */}
                  <div className="flex items-center gap-3 p-4 rounded-xl glass-card-sm">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-foreground-muted">Full Name</p>
                      <p className="font-medium text-foreground">{result.fullName}</p>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex items-center gap-3 p-4 rounded-xl glass-card-sm">
                    <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <p className="text-xs text-foreground-muted">Email</p>
                      <p className="font-medium text-foreground">{result.email}</p>
                    </div>
                  </div>

                  {/* Package */}
                  <div className="flex items-center gap-3 p-4 rounded-xl glass-card-sm">
                    <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                      <Package className="w-5 h-5 text-violet-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-foreground-muted">Requested Package</p>
                      <p className="font-medium text-foreground">{result.package.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gradient">
                        {result.package.currency} {result.package.price}
                      </p>
                      <p className="text-xs text-foreground-muted">{result.package.duration} days</p>
                    </div>
                  </div>

                  {/* Submitted Date */}
                  <div className="flex items-center gap-3 p-4 rounded-xl glass-card-sm">
                    <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-orange-400" />
                    </div>
                    <div>
                      <p className="text-xs text-foreground-muted">Submitted On</p>
                      <p className="font-medium text-foreground">
                        {new Date(result.submittedAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Verified Status */}
                  <div className="flex items-center gap-3 p-4 rounded-xl glass-card-sm">
                    <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <p className="text-xs text-foreground-muted">Email Verification</p>
                      <p className="font-medium text-success">Verified</p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-6 pt-6 border-t border-border-soft text-center">
                  <div className="inline-flex items-center gap-2 text-sm text-foreground-muted">
                    <Shield className="w-4 h-4 text-success" />
                    <span>
                      Need help?{" "}
                      <Link href="/tickets/create" className="text-primary hover:underline">
                        Contact our support team
                      </Link>
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom gradient line */}
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}
