/**
 * Input sanitization utilities
 * Prevents XSS and ensures data integrity
 */

/**
 * Sanitizes a string by removing potentially dangerous characters
 * and trimming whitespace
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .trim()
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove control characters except newlines and tabs
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Normalize whitespace (multiple spaces to single space)
    .replace(/\s+/g, ' ');
}

/**
 * Sanitizes an email address
 */
export function sanitizeEmail(email: string): string {
  if (typeof email !== 'string') {
    return '';
  }

  return sanitizeString(email).toLowerCase();
}

/**
 * Sanitizes a phone number
 */
export function sanitizePhone(phone: string): string {
  if (typeof phone !== 'string') {
    return '';
  }

  // Remove all non-digit characters except + at the start
  const cleaned = phone.trim().replace(/[^\d+]/g, '');
  
  // Ensure + is only at the start
  if (cleaned.startsWith('+')) {
    return '+' + cleaned.slice(1).replace(/\+/g, '');
  }
  
  return cleaned;
}

/**
 * Sanitizes text content (for messages, descriptions, etc.)
 * Allows more characters but still removes dangerous ones
 */
export function sanitizeText(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .trim()
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove control characters except newlines, tabs, and carriage returns
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Limit consecutive newlines to 2
    .replace(/\n{3,}/g, '\n\n');
}

/**
 * Sanitizes an object by sanitizing all string values
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = { ...obj };
  
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeString(sanitized[key]) as any;
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeObject(sanitized[key]) as any;
    }
  }
  
  return sanitized;
}

/**
 * Validates and sanitizes form data
 */
export function sanitizeFormData<T extends Record<string, any>>(
  data: T,
  fieldTypes?: Partial<Record<keyof T, 'email' | 'phone' | 'text' | 'string'>>
): T {
  const sanitized = { ...data };
  
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      const fieldType = fieldTypes?.[key];
      
      switch (fieldType) {
        case 'email':
          sanitized[key] = sanitizeEmail(sanitized[key]) as any;
          break;
        case 'phone':
          sanitized[key] = sanitizePhone(sanitized[key]) as any;
          break;
        case 'text':
          sanitized[key] = sanitizeText(sanitized[key]) as any;
          break;
        default:
          sanitized[key] = sanitizeString(sanitized[key]) as any;
      }
    }
  }
  
  return sanitized;
}

