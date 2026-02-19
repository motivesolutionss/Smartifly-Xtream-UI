"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Mail, CheckCircle, ArrowLeft, User, Phone, Package, Shield, Send } from "lucide-react";
import { z } from "zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { createSubscriptionRequest, fetchPackages } from "@/lib/api";
import { logger } from "@/lib/logger";
import { sanitizeFormData } from "@/lib/sanitize";
import { useForm } from "@/hooks/useForm";
import { FormField } from "@/components/forms/FormField";
import type { Package as PackageType } from "@/types";

const subscriptionSchema = z.object({
    fullName: z.string().trim().min(1, "Full name is required").max(100, "Full name is too long"),
    email: z.string().trim().email("Please enter a valid email address").max(255),
    phoneNumber: z.string().trim().min(5, "Phone number is required").max(20, "Phone number is too long"),
});

type SubscriptionFormData = z.infer<typeof subscriptionSchema>;

const formFields = [
    { name: "fullName", label: "Full Name", type: "text" as const, placeholder: "John Doe", icon: User },
    { name: "email", label: "Email Address", type: "email" as const, placeholder: "john@example.com", icon: Mail },
    { name: "phoneNumber", label: "Phone Number", type: "tel" as const, placeholder: "+1234567890", icon: Phone, hint: "Include country code (e.g., +1 for USA, +44 for UK)" },
];

function SubscriptionRequestContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();

    // Extract packageId from search params
    const packageId = searchParams.get("packageId");

    const [pkg, setPkg] = useState<PackageType | null>(null);
    const [isLoadingPackage, setIsLoadingPackage] = useState(true);
    const [isSuccess, setIsSuccess] = useState(false);
    const [requestId, setRequestId] = useState<string | null>(null);

    const {
        formData,
        errors,
        isSubmitting,
        handleChange,
        handleBlur,
        handleSubmit: handleFormSubmit,
    } = useForm({
        schema: subscriptionSchema,
        onSubmit: async (data) => {
            if (!packageId) {
                throw new Error("Package ID is required");
            }
            // Sanitize form data before sending
            const sanitizedData = sanitizeFormData(data, {
                fullName: 'string',
                email: 'email',
                phoneNumber: 'phone',
            });
            const response = await createSubscriptionRequest({
                packageId,
                ...sanitizedData,
            });
            setRequestId(response.requestId);
            setIsSuccess(true);
            toast({
                title: "Verification Email Sent",
                description: "Please check your email to verify your subscription request.",
            });
        },
        validateOnChange: true,
        validateOnBlur: true,
    });

    useEffect(() => {
        async function loadPackage() {
            if (!packageId) {
                router.push("/packages");
                return;
            }

            try {
                const packages = await fetchPackages();
                const foundPackage = packages.find((p) => p.id === packageId);
                if (foundPackage) {
                    setPkg(foundPackage);
                } else {
                    toast({
                        title: "Package Not Found",
                        description: "The selected package could not be found.",
                        variant: "destructive",
                    });
                    router.push("/packages");
                }
            } catch (error) {
                logger.error("Error loading package:", error);
                toast({
                    title: "Error",
                    description: "Failed to load package details. Please try again.",
                    variant: "destructive",
                });
                router.push("/packages");
            } finally {
                setIsLoadingPackage(false);
            }
        }

        loadPackage();
    }, [packageId, router, toast]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await handleFormSubmit(e);
        } catch (error: any) {
            logger.error("Error creating subscription request:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to create subscription request. Please try again.",
                variant: "destructive",
            });
        }
    };

    // Loading State
    if (isLoadingPackage) {
        return (
            <section className="section relative overflow-hidden">
                <div className="container">
                    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                        <Loader2 className="w-10 h-10 animate-spin text-primary" />
                        <p className="text-foreground-muted">Loading package details...</p>
                    </div>
                </div>
            </section>
        );
    }

    if (!pkg) {
        return null;
    }

    // Success State
    if (isSuccess) {
        return (
            <section className="section relative overflow-hidden">
                {/* Background Effects */}
                <motion.div
                    className="absolute top-20 left-1/4 w-96 h-96 bg-gradient-glow-violet rounded-full blur-3xl opacity-10"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.15, 0.1] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                />

                <div className="container">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="max-w-2xl mx-auto"
                    >
                        <div className="glass-card glass-card-xl text-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-success/10 rounded-full blur-3xl" />

                            <div className="relative z-10 py-4">
                                <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-6">
                                    <CheckCircle className="w-10 h-10 text-success" />
                                </div>
                                <h2 className="text-2xl md:text-3xl font-bold font-heading text-foreground mb-4">
                                    Verification Email Sent!
                                </h2>
                                <p className="text-foreground-secondary mb-6 max-w-md mx-auto">
                                    Please verify your email to receive your subscription document.
                                </p>

                                <div className="glass-card-sm inline-flex items-center gap-3 px-6 py-3 mb-6">
                                    <Mail className="w-5 h-5 text-primary" />
                                    <span className="text-foreground">{formData.email}</span>
                                </div>

                                <p className="text-sm text-foreground-muted mb-8">
                                    Click the verification link in the email to receive your payment instructions.
                                    <br />The link will expire in 1 hour.
                                </p>

                                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                    <Link href="/packages">
                                        <Button className="btn-outline hover-lift-sm">
                                            <ArrowLeft className="w-4 h-4" />
                                            Back to Packages
                                        </Button>
                                    </Link>
                                    <Link href="/subscription">
                                        <Button className="btn-primary hover-lift">
                                            Check Request Status
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>
        );
    }

    // Main Form
    return (
        <section className="section relative overflow-hidden">
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
                {/* Back Button */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4 }}
                >
                    <Link href="/packages">
                        <Button variant="ghost" size="sm" className="mb-6 hover:bg-background-hover">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Packages
                        </Button>
                    </Link>
                </motion.div>

                <div className="max-w-2xl mx-auto">
                    {/* Section Header */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="text-center mb-8"
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card-sm border border-primary/30 backdrop-blur-md mb-6">
                            <Package className="w-4 h-4 text-primary" />
                            <span className="text-sm font-medium text-foreground">{pkg.name}</span>
                        </div>

                        <h1 className="text-3xl sm:text-4xl font-bold font-heading mb-4 text-foreground">
                            Subscribe to{" "}
                            <span className="text-gradient-animated">{pkg.name}</span>
                        </h1>

                        <div className="flex items-center justify-center gap-2">
                            <span className="text-3xl font-bold text-gradient">${pkg.price}</span>
                            <span className="text-foreground-muted">/ {pkg.duration}</span>
                        </div>
                    </motion.div>

                    {/* Form Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                    >
                        <div className="glass-card glass-card-xl relative overflow-hidden">
                            {/* Corner glows */}
                            <div className="absolute top-0 left-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
                            <div className="absolute bottom-0 right-0 w-40 h-40 bg-accent/10 rounded-full blur-3xl" />

                            <div className="relative z-10">
                                {/* Header */}
                                <div className="mb-8">
                                    <h2 className="text-xl font-bold font-heading text-foreground mb-2">
                                        Subscription Request
                                    </h2>
                                    <p className="text-foreground-secondary">
                                        Fill in your details to receive payment instructions via email.
                                    </p>
                                </div>

                                {/* Form */}
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {formFields.map((field, index) => (
                                        <FormField
                                            key={field.name}
                                            name={field.name}
                                            label={field.label}
                                            type={field.type}
                                            placeholder={field.placeholder}
                                            icon={field.icon}
                                            value={formData[field.name as keyof SubscriptionFormData] || ""}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            error={errors[field.name]}
                                            disabled={isSubmitting}
                                            required
                                            hint={field.hint}
                                            animationDelay={0.3 + index * 0.1}
                                        />
                                    ))}

                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.4, delay: 0.6 }}
                                    >
                                        <Button
                                            type="submit"
                                            size="lg"
                                            className="w-full btn-primary btn-lg hover-lift"
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Submitting...
                                                </>
                                            ) : (
                                                <>
                                                    <Send className="w-4 h-4" />
                                                    Submit Request
                                                </>
                                            )}
                                        </Button>
                                    </motion.div>
                                </form>

                                {/* Trust indicator */}
                                <div className="mt-6 pt-6 border-t border-border-soft text-center">
                                    <div className="inline-flex items-center gap-2 text-sm text-foreground-muted">
                                        <Shield className="w-4 h-4 text-success" />
                                        <span>Your information is secure and encrypted</span>
                                    </div>
                                </div>
                            </div>

                            {/* Bottom gradient line */}
                            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}

export default function SubscriptionRequestPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>}>
            <SubscriptionRequestContent />
        </Suspense>
    );
}
