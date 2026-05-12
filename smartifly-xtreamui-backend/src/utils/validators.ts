// src/utils/validators.ts

/**
 * Validate MAC address like:
 * AA:BB:CC:DD:EE:FF  OR  AA:BB:CC:DD:EE
 */
export function isValidMac(mac: string): boolean {
  const pattern = /^([A-Fa-f0-9]{2}:){4,5}[A-Fa-f0-9]{2}$/;
  return pattern.test(mac);
}
