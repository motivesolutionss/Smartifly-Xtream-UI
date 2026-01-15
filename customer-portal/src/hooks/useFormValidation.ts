import { useState, useCallback } from "react";
import { z } from "zod";

/**
 * Custom hook for real-time form validation with Zod schemas.
 * Provides field-level and form-level validation with error management.
 * 
 * @template T - Zod schema type
 * @param schema - Zod schema for validation
 * @param options - Configuration options
 * @param options.validateOnChange - Whether to validate fields on change (default: true)
 * @param options.validateOnBlur - Whether to validate fields on blur (default: true)
 * 
 * @returns Object containing validation state and handlers
 * 
 * @example
 * ```tsx
 * const schema = z.object({ email: z.string().email() });
 * const { errors, validateAll, handleFieldBlur } = useFormValidation(schema);
 * ```
 */
export function useFormValidation<T extends z.ZodTypeAny>(
  schema: T,
  options?: {
    validateOnChange?: boolean;
    validateOnBlur?: boolean;
  }
) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  /**
   * Validates a single field by name and value.
   * Updates errors state based on validation result.
   * 
   * @param fieldName - Name of the field to validate
   * @param value - Value to validate
   */
  const validateField = useCallback(
    (fieldName: string, value: any) => {
      try {
        // Check if schema has shape property (object schemas)
        if ('shape' in schema && schema.shape && typeof schema.shape === 'object') {
          const shape = schema.shape as Record<string, z.ZodTypeAny>;
          const fieldSchema = shape[fieldName];
          if (fieldSchema) {
            fieldSchema.parse(value);
            // Clear error if validation passes
            setErrors((prev) => {
              const newErrors = { ...prev };
              delete newErrors[fieldName];
              return newErrors;
            });
            return;
          }
        }
        // If no shape or field not found, validate the whole object with this field
        // This is a fallback for non-object schemas
        const testData = { [fieldName]: value };
        schema.parse(testData);
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[fieldName];
          return newErrors;
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          const fieldError = error.errors.find((e) => {
            const path = e.path[0];
            return path === fieldName || String(path) === fieldName;
          });
          if (fieldError) {
            setErrors((prev) => ({
              ...prev,
              [fieldName]: fieldError.message,
            }));
          }
        }
      }
    },
    [schema]
  );

  /**
   * Validates all fields in the form data.
   * 
   * @param data - Complete form data to validate
   * @returns true if validation passes, false otherwise
   */
  const validateAll = useCallback(
    (data: z.infer<T>) => {
      const result = schema.safeParse(data);
      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        result.error.errors.forEach((err) => {
          const path = err.path[0];
          if (path !== undefined) {
            const fieldName = String(path);
            fieldErrors[fieldName] = err.message;
          }
        });
        setErrors(fieldErrors);
        return false;
      }
      setErrors({});
      return true;
    },
    [schema]
  );

  const handleFieldChange = useCallback(
    (fieldName: string, value: any) => {
      if (options?.validateOnChange && touched[fieldName]) {
        validateField(fieldName, value);
      }
    },
    [options?.validateOnChange, touched, validateField]
  );

  const handleFieldBlur = useCallback(
    (fieldName: string, value: any) => {
      setTouched((prev) => ({ ...prev, [fieldName]: true }));
      if (options?.validateOnBlur !== false) {
        validateField(fieldName, value);
      }
    },
    [options?.validateOnBlur, validateField]
  );

  const reset = useCallback(() => {
    setErrors({});
    setTouched({});
  }, []);

  return {
    errors,
    touched,
    validateField,
    validateAll,
    handleFieldChange,
    handleFieldBlur,
    reset,
    setTouched,
  };
}

