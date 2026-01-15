"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Loader2, Mail, MessageSquare, Phone, User, Shield, Headphones, Clock, ArrowRight } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { createTicket } from "@/lib/api";
import { sanitizeFormData } from "@/lib/sanitize";
import Image from "next/image";

const contactSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().email("Please enter a valid email").max(255),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(2000),
});

type ContactFormData = z.infer<typeof contactSchema>;

const formFields = [
  { name: "name", label: "Name", type: "text", placeholder: "Your name", icon: User, half: true },
  { name: "email", label: "Email", type: "email", placeholder: "your@email.com", icon: Mail, half: true },
];

export default function ContactPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<ContactFormData>({
    name: "",
    email: "",
    message: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[name];
      return newErrors;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = contactSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);

    try {
      // Sanitize and prepare data for API
      const sanitizedData = sanitizeFormData(formData, {
        name: 'string',
        email: 'email',
        message: 'text',
      });

      // Create a support ticket with the contact form data
      await createTicket({
        name: sanitizedData.name,
        email: sanitizedData.email,
        subject: 'Contact Form Inquiry',
        message: sanitizedData.message,
        priority: 'MEDIUM',
      });

      toast({
        title: "Message Sent",
        description: "Thank you for contacting us. We'll get back to you soon.",
      });
      setFormData({ name: "", email: "", message: "" });
    } catch (error: any) {
      toast({
        title: "Failed to Send Message",
        description: error.userMessage || error.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const contactMethods = [
    {
      icon: Mail,
      title: "Email",
      value: "support@smartifly.com",
      description: "Get a response within 24 hours",
      color: "text-violet-400",
      bgColor: "bg-violet-500/10",
    },
    {
      icon: Phone,
      title: "WhatsApp",
      value: "+1 (234) 567-890",
      description: "Chat with us directly",
      color: "text-green-400",
      bgColor: "bg-green-500/10",
    },
    {
      icon: MessageSquare,
      title: "Live Support",
      value: "24/7 Available",
      description: "Get instant help via tickets",
      color: "text-cyan-400",
      bgColor: "bg-cyan-500/10",
    },
  ];

  const supportFeatures = [
    { icon: Headphones, label: "24/7 Support" },
    { icon: Clock, label: "Fast Response" },
    { icon: Shield, label: "Secure & Private" },
  ];

  return (
    <section className="section relative overflow-hidden">
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
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card-sm border border-primary/30 backdrop-blur-md mb-6">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-medium text-foreground">Get in Touch</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold font-heading mb-6 text-foreground">
            Contact <span className="text-gradient-animated">Us</span>
          </h1>

          <p className="text-lg text-foreground-secondary max-w-2xl mx-auto mb-8">
            Have questions? We&apos;d love to hear from you. Send us a message and we&apos;ll respond as soon as possible.
          </p>

          {/* Support Features */}
          <div className="flex flex-wrap justify-center gap-4">
            {supportFeatures.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}
                  className="flex items-center gap-2 glass-card-sm px-4 py-2"
                >
                  <Icon className="w-4 h-4 text-primary" />
                  <span className="text-sm text-foreground">{feature.label}</span>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Contact Methods */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="lg:col-span-1 space-y-4"
          >
            {contactMethods.map((method, index) => {
              const Icon = method.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}
                  className="glass-card glass-card-interactive group cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl ${method.bgColor} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                      <Icon className={`w-6 h-6 ${method.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-base">
                        {method.title}
                      </p>
                      <p className="text-sm text-foreground font-medium">{method.value}</p>
                      <p className="text-xs text-foreground-muted mt-0.5">
                        {method.description}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-foreground-muted opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="lg:col-span-2"
          >
            <div className="glass-card glass-card-xl relative overflow-hidden">
              {/* Corner glows */}
              <div className="absolute top-0 left-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 right-0 w-40 h-40 bg-accent/10 rounded-full blur-3xl" />

              <div className="relative z-10">
                {/* Header */}
                <div className="mb-8">
                  <h2 className="text-xl font-bold font-heading text-foreground mb-2">
                    Send us a Message
                  </h2>
                  <p className="text-foreground-secondary">
                    Fill out the form below and we&apos;ll get back to you.
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {formFields.map((field, index) => {
                      const Icon = field.icon;
                      return (
                        <motion.div
                          key={field.name}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
                          className="space-y-2"
                        >
                          <label htmlFor={field.name} className="text-sm font-medium text-foreground flex items-center gap-2">
                            <Icon className="w-4 h-4 text-foreground-muted" />
                            {field.label}
                          </label>
                          <Input
                            id={field.name}
                            name={field.name}
                            type={field.type}
                            placeholder={field.placeholder}
                            value={formData[field.name as keyof ContactFormData]}
                            onChange={handleChange}
                            disabled={isLoading}
                            className={errors[field.name] ? "border-destructive" : ""}
                          />
                          {errors[field.name] && (
                            <p className="text-sm text-destructive">{errors[field.name]}</p>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.7 }}
                    className="space-y-2"
                  >
                    <label htmlFor="message" className="text-sm font-medium text-foreground flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-foreground-muted" />
                      Message
                    </label>
                    <Textarea
                      id="message"
                      name="message"
                      placeholder="How can we help you?"
                      value={formData.message}
                      onChange={handleChange}
                      disabled={isLoading}
                      rows={5}
                      className={errors.message ? "border-destructive" : ""}
                    />
                    {errors.message && (
                      <p className="text-sm text-destructive">{errors.message}</p>
                    )}
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.8 }}
                  >
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full sm:w-auto btn-primary btn-lg hover-lift"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Send Message
                        </>
                      )}
                    </Button>
                  </motion.div>
                </form>

                {/* Trust indicator */}
                <div className="mt-6 pt-6 border-t border-border-soft">
                  <div className="inline-flex items-center gap-2 text-sm text-foreground-muted">
                    <Shield className="w-4 h-4 text-success" />
                    <span>Your information is secure and will only be used to contact you</span>
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

