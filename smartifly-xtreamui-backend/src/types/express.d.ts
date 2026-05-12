// ============================================================
// src/types/express.d.ts
// Tommy's 100/100 Express Type Augmentation
// ============================================================
// Extends Express Request type with custom properties
// ============================================================

import type { AuthUser } from './auth';

declare global {
  namespace Express {
    interface Request {
      /**
       * Authenticated user from JWT token
       * Set by authMiddleware
       */
      user?: AuthUser;

      /**
       * Reseller ID (convenience property)
       * Set by authMiddleware when user.role === 'RESELLER'
       */
      resellerId?: number;

      /**
       * Reseller entity information
       * Set by validateResellerContext middleware
       */
      resellerInfo?: {
        id: number;
        quota: number;
        usedQuota: number;
        remainingQuota: number;
      };

      /**
       * Request ID for tracing
       * May be set by x-request-id header
       */
      requestId?: string;

      /**
       * Device fingerprint
       * May be set by x-device-fingerprint header
       */
      deviceFingerprint?: string;
    }
  }
}

export {};
