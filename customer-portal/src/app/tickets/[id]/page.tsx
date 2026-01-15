"use client";

import { useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, useInView } from "framer-motion";
import { Loader2, ArrowLeft, Search, TicketIcon, AlertCircle, RefreshCw } from "lucide-react";
import { TicketStatus } from "@/components/tickets/TicketStatus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTicket } from "@/hooks/useTicket";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

export default function ViewTicketPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  // Type-safe ID extraction
  const id = typeof params?.id === 'string' ? params.id : null;
  const [ticketId, setTicketId] = useState(id || "");
  const [searchId, setSearchId] = useState("");
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const { 
    data: ticket, 
    isLoading, 
    error, 
    isError, 
    refetch 
  } = useTicket(ticketId || null);

  const isNotFound = (error as any)?.status === 404;
  const errorMessage = isNotFound
    ? "Ticket not found. Please check the ticket ID and try again."
    : error instanceof Error
    ? error.message
    : "Failed to load ticket. Please try again later.";

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchId.trim()) {
      setTicketId(searchId.trim());
      router.push(`/tickets/${searchId.trim()}`);
    }
  };

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

      <div className="container relative z-10" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <Link href="/tickets/create">
            <Button variant="ghost" size="sm" className="mb-6 hover:bg-background-hover">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Support
            </Button>
          </Link>

          {!id && (
            <div className="max-w-xl mx-auto mb-8">
              <div className="glass-card glass-card-xl relative overflow-hidden">
                {/* Corner glows */}
                <div className="absolute top-0 left-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-3xl" />

                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <TicketIcon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold font-heading text-foreground">Track Your Ticket</h2>
                      <p className="text-sm text-foreground-secondary">
                        Enter your ticket ID to view its status and replies.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleSearch} className="flex gap-3">
                    <Input
                      placeholder="Enter ticket ID (e.g., TKT-123456)"
                      value={searchId}
                      onChange={(e) => setSearchId(e.target.value)}
                      className="flex-1"
                    />
                    <Button type="submit" className="btn-primary hover-lift">
                      <Search className="w-4 h-4" />
                      Search
                    </Button>
                  </form>
                </div>

                {/* Bottom gradient line */}
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
              </div>
            </div>
          )}
        </motion.div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-foreground-muted">Loading ticket details...</p>
          </div>
        ) : ticket ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <TicketStatus ticket={ticket} />
          </motion.div>
        ) : ticketId && isError ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="max-w-xl mx-auto"
          >
            <div className="glass-card glass-card-xl text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-32 h-32 bg-destructive/5 rounded-full blur-3xl" />

              <div className="relative z-10 py-8">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                  {isNotFound ? (
                  <TicketIcon className="w-8 h-8 text-destructive" />
                  ) : (
                    <AlertCircle className="w-8 h-8 text-destructive" />
                  )}
                </div>
                <h3 className="text-xl font-bold font-heading text-foreground mb-2">
                  {isNotFound ? "Ticket Not Found" : "Error Loading Ticket"}
                </h3>
                <p className="text-foreground-secondary mb-6">
                  {errorMessage}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  {!isNotFound && (
                    <Button
                      onClick={() => refetch()}
                      className="btn-primary hover-lift-sm"
                      disabled={isLoading}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Try Again
                    </Button>
                  )}
                <Link href="/tickets/create">
                    <Button className="btn-outline hover-lift-sm">
                      Create New Ticket
                    </Button>
                </Link>
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </div>
    </section>
  );
}
