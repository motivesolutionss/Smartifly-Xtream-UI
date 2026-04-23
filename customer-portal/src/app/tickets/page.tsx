"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, Ticket, Plus, ArrowRight, LifeBuoy, FileText, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";

export default function SupportLandingPage() {
    const router = useRouter();
    const [ticketId, setTicketId] = useState("");
    const [ticketEmail, setTicketEmail] = useState("");

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (ticketId.trim() && ticketEmail.trim()) {
            router.push(`/tickets/view?id=${ticketId.trim()}&email=${encodeURIComponent(ticketEmail.trim().toLowerCase())}`);
        }
    };

    return (
        <section className="section min-h-screen relative overflow-hidden flex flex-col justify-center">
            {/* Background Image Overlay */}
            <div className="absolute inset-0 z-0 opacity-10">
                <Image
                    src="/overlay-1.webp"
                    alt="Background Overlay"
                    fill
                    sizes="100vw"
                    className="object-cover"
                    priority
                />
            </div>

            {/* Animated Background Effects */}
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

            <div className="container relative z-10">
                <div className="max-w-4xl mx-auto text-center mb-16">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card-sm border border-primary/30 backdrop-blur-md mb-6">
                            <LifeBuoy className="w-4 h-4 text-primary animate-pulse" />
                            <span className="text-sm font-medium text-foreground">Support Center</span>
                        </div>

                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-heading mb-6 text-foreground">
                            How can we <span className="text-gradient-animated">help you?</span>
                        </h1>

                        <p className="text-xl text-foreground-secondary max-w-2xl mx-auto">
                            Track your existing tickets or submit a new request. We&apos;re here to assist you 24/7.
                        </p>
                    </motion.div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {/* Track Ticket Card */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="h-full"
                    >
                        <div className="glass-card glass-card-xl h-full p-8 relative overflow-hidden group hover:border-primary/30 transition-all duration-300">
                            <div className="absolute top-0 left-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-500" />

                            <div className="relative z-10 flex flex-col h-full">
                                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                                    <Search className="w-7 h-7 text-primary" />
                                </div>

                                <h2 className="text-2xl font-bold font-heading text-foreground mb-3">Track Ticket</h2>
                                <p className="text-foreground-secondary mb-8">
                                    Check the status of your existing support request. Enter your Ticket ID and email below.
                                </p>

                                <form onSubmit={handleSearch} className="mt-auto space-y-4">
                                    <div className="relative">
                                        <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
                                        <Input
                                            placeholder="Ticket ID (e.g. TKT-ABC123)"
                                            value={ticketId}
                                            onChange={(e) => setTicketId(e.target.value)}
                                            className="pl-10 h-12 bg-background-tertiary border-border-soft focus:bg-background-elevated"
                                        />
                                    </div>
                                    <div className="relative">
                                        <Input
                                            type="email"
                                            placeholder="Email used for the ticket"
                                            value={ticketEmail}
                                            onChange={(e) => setTicketEmail(e.target.value)}
                                            className="h-12 bg-background-tertiary border-border-soft focus:bg-background-elevated"
                                        />
                                    </div>
                                    <Button
                                        type="submit"
                                        className="w-full btn-primary btn-lg hover-lift"
                                        disabled={!ticketId.trim() || !ticketEmail.trim()}
                                    >
                                        Check Status <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </form>
                            </div>
                        </div>
                    </motion.div>

                    {/* Create Ticket Card */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="h-full"
                    >
                        <div className="glass-card glass-card-xl h-full p-8 relative overflow-hidden group hover:border-accent/30 transition-all duration-300">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-3xl group-hover:bg-accent/20 transition-all duration-500" />

                            <div className="relative z-10 flex flex-col h-full">
                                <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-6">
                                    <Plus className="w-7 h-7 text-accent" />
                                </div>

                                <h2 className="text-2xl font-bold font-heading text-foreground mb-3">New Request</h2>
                                <p className="text-foreground-secondary mb-8">
                                    Having trouble with your subscription or need technical assistance? Submit a new ticket.
                                </p>

                                <div className="mt-auto">
                                    <Link href="/tickets/create" className="block">
                                        <Button className="w-full btn-outline btn-lg hover-lift group-hover:bg-accent/10 group-hover:border-accent/30 group-hover:text-accent">
                                            Create Ticket <FileText className="w-4 h-4 ml-2" />
                                        </Button>
                                    </Link>

                                    <div className="mt-4 flex items-center justify-center gap-2 text-xs text-foreground-muted">
                                        <MessageSquare className="w-3 h-3" />
                                        <span>Average response time: 2 hours</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
