// src/utils/macNormalizer.ts
// ✅ NEW: MAC address normalization for schema.prisma normalizedMac field

/**
 * Normalize MAC address to consistent format without separators
 * Handles various input formats:
 * - "00:11:22:33:44:55" → "001122334455"
 * - "00-11-22-33-44-55" → "001122334455"
 * - "0011.2233.4455"    → "001122334455"
 * - "001122334455"      → "001122334455"
 */
export function normalizeMac(mac: string | null | undefined): string | null {
  if (!mac) return null;

  // Remove all non-hex characters and convert to uppercase
  const cleaned = mac.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();

  // Validate length (should be 12 characters for a valid MAC)
  if (cleaned.length !== 12) {
    throw new Error(`Invalid MAC address format: ${mac} (cleaned: ${cleaned})`);
  }

  return cleaned;
}

/**
 * Format normalized MAC to display format with colons
 * "001122334455" → "00:11:22:33:44:55"
 */
export function formatMac(normalizedMac: string): string {
  if (!normalizedMac) return '';
  
  // Remove any existing separators
  const cleaned = normalizedMac.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
  
  if (cleaned.length !== 12) {
    return normalizedMac; // Return as-is if invalid
  }

  // Split into pairs and join with colons
  const pairs = cleaned.match(/.{1,2}/g);
  return pairs ? pairs.join(':') : normalizedMac;
}

/**
 * Validate MAC address format
 */
export function isValidMac(mac: string): boolean {
  try {
    const normalized = normalizeMac(mac);
    return normalized !== null && normalized.length === 12;
  } catch {
    return false;
  }
}

/**
 * Compare two MAC addresses (handles different formats)
 */
export function isSameMac(mac1: string | null, mac2: string | null): boolean {
  if (!mac1 || !mac2) return false;
  
  try {
    const normalized1 = normalizeMac(mac1);
    const normalized2 = normalizeMac(mac2);
    return normalized1 === normalized2;
  } catch {
    return false;
  }
}

/**
 * Batch normalize MACs (useful for migrations)
 */
export function normalizeMacBatch(macs: (string | null)[]): (string | null)[] {
  return macs.map(mac => {
    try {
      return normalizeMac(mac);
    } catch {
      return null; // Return null for invalid MACs
    }
  });
}
