"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Send, Loader2, User, Mail, FileText, MessageSquare, Shield, Paperclip, X, Image, File, AlertCircle } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { createTicket, createTicketWithAttachments } from "@/lib/api";
import { sanitizeFormData } from "@/lib/sanitize";
import { useForm } from "@/hooks/useForm";
import { FormField } from "@/components/forms/FormField";

const ticketSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Please enter a valid email").max(255),
  subject: z.string().trim().min(5, "Subject must be at least 5 characters").max(200),
  message: z.string().trim().min(20, "Message must be at least 20 characters").max(2000),
});

type TicketFormData = z.infer<typeof ticketSchema>;

const formFields = [
  { name: "name", label: "Full Name", type: "text" as const, placeholder: "John Doe", icon: User },
  { name: "email", label: "Email Address", type: "email" as const, placeholder: "your@email.com", icon: Mail },
  { name: "subject", label: "Subject", type: "text" as const, placeholder: "Brief description of your issue", icon: FileText },
];

const MAX_FILES = 3;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function TicketForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const {
    formData,
    errors,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit: handleFormSubmit,
  } = useForm({
    schema: ticketSchema,
    onSubmit: async (data) => {
      // Sanitize form data before sending
      const sanitizedData = sanitizeFormData(data, {
        name: 'string',
        email: 'email',
        subject: 'string',
        message: 'text',
      });

      let ticket;
      if (files.length > 0) {
        ticket = await createTicketWithAttachments(sanitizedData, files);
      } else {
        ticket = await createTicket(sanitizedData);
      }

      toast({
        title: "Ticket Created",
        description: `Your ticket ID is ${ticket.ticketNo}. Save this for reference.`,
      });
      router.push(`/tickets/view?id=${ticket.ticketNo}`);
    },
    validateOnChange: true,
    validateOnBlur: true,
  });

  const validateFile = useCallback((file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `${file.name}: Only images (JPG, PNG, GIF, WebP) and PDFs are allowed`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `${file.name}: File size must be less than 10MB`;
    }
    return null;
  }, []);

  const handleFileSelect = useCallback((selectedFiles: FileList | File[]) => {
    setFileError(null);
    const fileArray = Array.from(selectedFiles);

    // Check total count
    if (files.length + fileArray.length > MAX_FILES) {
      setFileError(`You can only attach up to ${MAX_FILES} files`);
      return;
    }

    // Validate each file
    for (const file of fileArray) {
      const error = validateFile(file);
      if (error) {
        setFileError(error);
        return;
      }
    }

    // Check for duplicates
    const newFiles = fileArray.filter(
      newFile => !files.some(existing => existing.name === newFile.name && existing.size === newFile.size)
    );

    setFiles(prev => [...prev, ...newFiles]);
  }, [files, validateFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setFileError(null);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await handleFormSubmit(e);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create ticket. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="glass-card glass-card-xl relative overflow-hidden">
        {/* Subtle corner glows */}
        <div className="absolute top-0 left-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-40 h-40 bg-accent/10 rounded-full blur-3xl" />

        <div className="relative z-10">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold font-heading text-foreground mb-2">
              Create Support Ticket
            </h2>
            <p className="text-foreground-secondary">
              Describe your issue and we&apos;ll get back to you as soon as possible.
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
                value={formData[field.name as keyof TicketFormData] || ""}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors[field.name]}
                disabled={isSubmitting}
                required
                animationDelay={index * 0.1}
              />
            ))}

            <FormField
              name="message"
              label="Message"
              type="textarea"
              placeholder="Describe your issue in detail..."
              icon={MessageSquare}
              value={formData.message || ""}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.message}
              disabled={isSubmitting}
              required
              rows={6}
              animationDelay={0.3}
            />

            {/* File Attachment Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.35 }}
              className="space-y-3"
            >
              <label className="block text-sm font-medium text-foreground">
                <div className="flex items-center gap-2">
                  <Paperclip className="w-4 h-4" />
                  Attachments <span className="text-foreground-muted font-normal">(optional, max 3 files)</span>
                </div>
              </label>

              {/* Drop Zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`
                  relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer
                  ${isDragging
                    ? 'border-primary bg-primary/5'
                    : 'border-border-soft hover:border-primary/50 hover:bg-background-soft/50'
                  }
                  ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}
                `}
              >
                <input
                  type="file"
                  multiple
                  accept={ALLOWED_TYPES.join(',')}
                  onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
                  disabled={isSubmitting || files.length >= MAX_FILES}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Paperclip className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-sm text-foreground-secondary">
                    <span className="text-primary font-medium">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-foreground-muted">
                    Images (JPG, PNG, GIF, WebP) or PDF • Max 10MB each
                  </p>
                </div>
              </div>

              {/* File Error */}
              {fileError && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="w-4 h-4" />
                  {fileError}
                </div>
              )}

              {/* Selected Files */}
              {files.length > 0 && (
                <div className="space-y-2">
                  {files.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="flex items-center gap-3 p-3 bg-background-soft rounded-lg border border-border-soft"
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        {file.type.startsWith('image/') ? (
                          <Image className="w-4 h-4 text-primary" />
                        ) : (
                          <File className="w-4 h-4 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                        <p className="text-xs text-foreground-muted">{formatFileSize(file.size)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        disabled={isSubmitting}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-foreground-muted hover:text-destructive transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4 }}
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
                    Creating Ticket...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit Ticket
                  </>
                )}
              </Button>
            </motion.div>
          </form>

          {/* Trust indicator */}
          <div className="mt-6 pt-6 border-t border-border-soft text-center">
            <div className="inline-flex items-center gap-2 text-sm text-foreground-muted">
              <Shield className="w-4 h-4 text-success" />
              <span>Your information is secure and will only be used to assist you</span>
            </div>
          </div>
        </div>

        {/* Bottom gradient line */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      </div>
    </div>
  );
}
