// src/utils/licenseKey.ts
import { randomBytes } from 'crypto';

/**
 * Generate a professional license key
 * Format: XXXX-XXXX-XXXX-XXXX
 */
export function generateLicenseKey(): string {
  const bytes = randomBytes(8);
  const hex = bytes.toString('hex').toUpperCase();
  
  // Format as XXXX-XXXX-XXXX-XXXX
  return hex.match(/.{1,4}/g)?.join('-') || hex;
}
