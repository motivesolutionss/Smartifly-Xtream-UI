/**
 * Enhanced form hook that combines validation, state management, and submission
 * Built on top of useFormValidation for a complete form solution
 */
import { useState, useCallback } from "react";
import { z } from "zod";
import { useFormValidation } from "./useFormValidation";

export interface UseFormOptions<T extends z.ZodTypeAny> {
  schema: T;
  onSubmit: (data: z.infer<T>) => Promise<void> | void;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  initialValues?: Partial<z.infer<T>>;
}

export function useForm<T extends z.ZodTypeAny>({
  schema,
  onSubmit,
  validateOnChange = true,
  validateOnBlur = true,
  initialValues,
}: UseFormOptions<T>) {
  const [formData, setFormData] = useState<z.infer<T>>(() => {
    // Initialize with default values from schema if available
    const defaults = initialValues || {};
    return defaults as z.infer<T>;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    errors,
    touched,
    validateAll,
    validateField,
    handleFieldBlur,
    setTouched,
    reset: resetValidation,
  } = useFormValidation(schema, {
    validateOnChange,
    validateOnBlur,
  });

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      const newFormData = { ...formData, [name]: value } as z.infer<T>;
      setFormData(newFormData);
      
      // Real-time validation: validate field if it has an error or is already touched
      if (validateOnChange && (errors[name] || touched[name])) {
        // Mark field as touched if not already
        if (!touched[name]) {
          setTouched((prev) => ({ ...prev, [name]: true }));
        }
        // Validate the field with the new value
        validateField(name, value);
      }
    },
    [formData, errors, touched, validateOnChange, validateField, setTouched]
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      handleFieldBlur(name, value);
    },
    [handleFieldBlur]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      
      // Validate all fields
      if (!validateAll(formData)) {
        return;
      }

      setIsSubmitting(true);
      try {
        await onSubmit(formData);
      } catch (error) {
        // Error handling is up to the caller
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, onSubmit, validateAll]
  );

  const reset = useCallback(() => {
    setFormData(initialValues as z.infer<T> || ({} as z.infer<T>));
    resetValidation();
    setIsSubmitting(false);
  }, [initialValues, resetValidation]);

  return {
    formData,
    setFormData,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
  };
}

