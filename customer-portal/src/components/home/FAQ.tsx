"use client";

import { useState } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { ChevronDown, MessageCircle, Clock, Headphones, CheckCircle, MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRef } from "react";

const faqs = [
    {
        question: "How do I subscribe to a package?",
        answer: "You can subscribe by visiting our Packages page, selecting your preferred plan, and completing the checkout process. We accept all major payment methods including credit cards, PayPal, and cryptocurrency."
    },
    {
        question: "Can I use the service on multiple devices?",
        answer: "Yes! All our packages support multiple simultaneous connections. The number of devices depends on your chosen plan. Our Premium package allows up to 5 simultaneous streams."
    },
    {
        question: "What streaming quality do you offer?",
        answer: "We offer multiple streaming qualities including SD, HD, Full HD, and 4K (where available). The quality automatically adjusts based on your internet speed to ensure smooth playback."
    },
    {
        question: "Is there a free trial available?",
        answer: "Yes, we offer a 24-hour free trial for new customers. No credit card required! You can test all features and channels before committing to a subscription."
    },
    {
        question: "How do I cancel my subscription?",
        answer: "You can cancel your subscription anytime from your account dashboard. Go to Settings > Subscription > Cancel. No questions asked, and no cancellation fees."
    },
    {
        question: "Do you offer refunds?",
        answer: "Yes, we offer a 7-day money-back guarantee. If you're not satisfied with our service within the first 7 days, contact support for a full refund."
    }
];

const supportFeatures = [
    {
        icon: MessageCircle,
        title: "24/7 Support",
        description: "Get help anytime",
        color: "violet",
        borderColor: "border-l-violet-500",
        iconBg: "bg-violet-500/10",
        iconColor: "text-violet-400",
    },
    {
        icon: Clock,
        title: "Quick Response",
        description: "Reply within hours",
        color: "cyan",
        borderColor: "border-l-cyan-500",
        iconBg: "bg-cyan-500/10",
        iconColor: "text-cyan-400",
    },
    {
        icon: Headphones,
        title: "Live Chat",
        description: "Instant assistance",
        color: "green",
        borderColor: "border-l-green-500",
        iconBg: "bg-green-500/10",
        iconColor: "text-green-400",
    },
    {
        icon: CheckCircle,
        title: "Setup Help",
        description: "Free installation",
        color: "orange",
        borderColor: "border-l-orange-500",
        iconBg: "bg-orange-500/10",
        iconColor: "text-orange-400",
    },
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
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.5,
        },
    },
};

function FAQItem({ faq, index }: { faq: typeof faqs[0]; index: number }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <motion.div
            variants={itemVariants}
            className="glass-card glass-card-interactive overflow-hidden"
        >
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-background-hover transition-colors"
            >
                <span className="font-medium text-foreground pr-8">
                    {faq.question}
                </span>
                <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex-shrink-0"
                >
                    <ChevronDown className="w-5 h-5 text-foreground-muted" />
                </motion.div>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                    >
                        <div className="px-6 pb-5 text-foreground-secondary leading-relaxed border-t border-border-soft pt-4">
                            {faq.answer}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export function FAQ() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });

    return (
        <section id="faq" className="section relative overflow-hidden scroll-mt-20 md:scroll-mt-24">
            {/* Matching Animated Background Effects from Features */}
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
                <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
                    {/* Support Sidebar */}
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        animate={isInView ? { opacity: 1, x: 0 } : {}}
                        transition={{ duration: 0.6 }}
                        className="lg:col-span-1"
                    >
                        <div className="glass-card-strong glass-card-xl sticky top-24">
                            {/* Header */}
                            <div className="mb-8">
                                <h3 className="text-2xl md:text-3xl font-bold font-heading text-gradient mb-3">
                                    Need More Help?
                                </h3>
                                <p className="text-foreground-secondary">
                                    Our support team is ready to assist you with any questions.
                                </p>
                            </div>

                            {/* Support Feature Cards */}
                            <div className="space-y-3 mb-8">
                                {supportFeatures.map((feature, index) => {
                                    const Icon = feature.icon;
                                    return (
                                        <motion.div
                                            key={index}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={isInView ? { opacity: 1, x: 0 } : {}}
                                            transition={{ duration: 0.4, delay: 0.1 + index * 0.1 }}
                                            whileHover={{ x: 4 }}
                                            className={`relative glass-card-sm hover:bg-background-hover transition-all duration-300 border-l-4 ${feature.borderColor} overflow-hidden group cursor-default`}
                                        >
                                            <div className="flex items-center gap-4 relative z-10">
                                                {/* Icon */}
                                                <div className={`w-12 h-12 rounded-lg ${feature.iconBg} flex-center flex-shrink-0`}>
                                                    <Icon className={`w-6 h-6 ${feature.iconColor}`} />
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1">
                                                    <div className="font-semibold text-foreground">
                                                        {feature.title}
                                                    </div>
                                                    <div className="text-sm text-foreground-muted">
                                                        {feature.description}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Hover glow effect */}
                                            <div className={`absolute inset-0 bg-${feature.color}-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                                        </motion.div>
                                    );
                                })}
                            </div>

                            {/* Contact Button */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={isInView ? { opacity: 1, y: 0 } : {}}
                                transition={{ duration: 0.6, delay: 0.5 }}
                            >
                                <Link href="/tickets/create">
                                    <Button className="w-full btn-primary btn-lg hover-lift group">
                                        <MessageSquare className="w-5 h-5" />
                                        Contact Support
                                        <Send className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </Link>
                            </motion.div>

                            {/* Trust Badge */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={isInView ? { opacity: 1 } : {}}
                                transition={{ duration: 0.6, delay: 0.6 }}
                                className="mt-6 pt-6 border-t border-border-soft text-center"
                            >
                                <div className="flex items-center justify-center gap-2 mb-2">
                                    <div className="w-8 h-8 rounded-full bg-warning/20 flex-center">
                                        <span className="text-lg">🏆</span>
                                    </div>
                                    <span className="font-semibold text-foreground">99.9% Satisfaction</span>
                                </div>
                                <div className="flex items-center justify-center gap-1 mb-1">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <svg key={i} className="w-4 h-4 fill-warning text-warning" viewBox="0 0 20 20">
                                            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                                        </svg>
                                    ))}
                                </div>
                                <p className="text-xs text-foreground-muted">
                                    Based on 10,000+ reviews
                                </p>
                            </motion.div>
                        </div>
                    </motion.div>

                    {/* FAQ Section */}
                    <div className="lg:col-span-2">
                        {/* Section Header */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={isInView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.6 }}
                            className="mb-12"
                        >
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card-sm border border-primary/30 backdrop-blur-md mb-6">
                                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                <span className="text-sm font-medium text-foreground">FAQ</span>
                            </div>

                            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold font-heading mb-4 text-foreground">
                                Frequently Asked Questions
                            </h2>

                            <p className="text-lg text-foreground-secondary max-w-2xl">
                                Find answers to common questions about our IPTV service, subscriptions, and features.
                            </p>
                        </motion.div>

                        {/* FAQ Items */}
                        <motion.div
                            variants={containerVariants}
                            initial="hidden"
                            animate={isInView ? "visible" : "hidden"}
                            className="space-y-4"
                        >
                            {faqs.map((faq, index) => (
                                <FAQItem key={index} faq={faq} index={index} />
                            ))}
                        </motion.div>

                        {/* Bottom CTA */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={isInView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.6, delay: 0.4 }}
                            className="mt-12 text-center glass-card glass-card-lg"
                        >
                            <h3 className="text-xl font-bold font-heading mb-2 text-foreground">
                                Still have questions?
                            </h3>
                            <p className="text-foreground-secondary mb-6">
                                Can&apos;t find the answer you&apos;re looking for? Our support team is here to help.
                            </p>
                            <div className="flex flex-wrap gap-4 justify-center">
                                <Link href="/tickets/create">
                                    <Button variant="outline" className="btn-outline hover-lift-sm">
                                        <MessageSquare className="w-4 h-4" />
                                        Contact Us
                                    </Button>
                                </Link>
                                <a href="https://wa.me/1234567890" target="_blank" rel="noopener noreferrer">
                                    <Button variant="outline" className="btn-outline hover-lift-sm">
                                        <MessageCircle className="w-4 h-4" />
                                        WhatsApp
                                    </Button>
                                </a>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    );
}