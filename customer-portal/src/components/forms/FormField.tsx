/**
 * Reusable form field component with consistent styling and error handling
 */
"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

export interface FormFieldProps {
  name: string;
  label: string;
  type?: "text" | "email" | "tel" | "password" | "textarea";
  placeholder?: string;
  icon?: LucideIcon;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  rows?: number;
  hint?: string;
  className?: string;
  animationDelay?: number;
}

export function FormField({
  name,
  label,
  type = "text",
  placeholder,
  icon: Icon,
  value,
  onChange,
  onBlur,
  error,
  disabled,
  required,
  rows = 5,
  hint,
  className = "",
  animationDelay = 0,
}: FormFieldProps) {
  const isTextarea = type === "textarea";
  const fieldId = name;
  const errorId = `${name}-error`;
  const hintId = `${name}-hint`;

  const fieldContent = (
    <div className={`space-y-2 ${className}`}>
      <label
        htmlFor={fieldId}
        className="text-sm font-medium text-foreground flex items-center gap-2"
      >
        {Icon && <Icon className="w-4 h-4 text-foreground-muted" />}
        {label}
        {required && <span className="text-destructive">*</span>}
      </label>

      {isTextarea ? (
        <Textarea
          id={fieldId}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          rows={rows}
          className={error ? "border-destructive focus:border-destructive" : ""}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          aria-required={required}
        />
      ) : (
        <Input
          id={fieldId}
          name={name}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          className={error ? "border-destructive focus:border-destructive" : ""}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          aria-required={required}
        />
      )}

      {hint && !error && (
        <p id={hintId} className="text-xs text-foreground-muted">
          {hint}
        </p>
      )}

      {error && (
        <p id={errorId} className="text-sm text-destructive mt-1 flex items-center gap-1">
          <span className="text-destructive">•</span>
          {error}
        </p>
      )}
    </div>
  );

  if (animationDelay > 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: animationDelay }}
      >
        {fieldContent}
      </motion.div>
    );
  }

  return fieldContent;
}

