// ============================================================
// src/services/qr-code.service.ts
// SMARTIFLY XTREAM UI — ENTERPRISE QR SERVICE
// ============================================================

import crypto from 'crypto';
import QRCode from 'qrcode';

import { prisma } from '../config/prisma';

function generateSettingsCode(): string {
  // Generate a simple 6-digit code for easy TV input
  return Math.floor(100000 + Math.random() * 900000).toString();
}

interface DeviceQRPayload {
  mac: string;
  deviceId: string;
  platform?: string;
  brand?: string;
  model?: string;
}

interface ActivationSessionResult {
  qrCode: string;
  webLink: string;
  token: string;
  settingsCode: string;
}

export class QRCodeService {
  /**
   * Generate an activation session (QR + Short Code)
   */
  static async generateActivationSession(
    payload: DeviceQRPayload,
  ): Promise<ActivationSessionResult> {
    const token = crypto.randomBytes(16).toString('hex');
    let settingsCode = generateSettingsCode();

    // Ensure unique settings code
    for (let i = 0; i < 5; i += 1) {
      const existing = await prisma.deviceToken.findUnique({ where: { settingsCode } });
      if (!existing) break;
      settingsCode = generateSettingsCode();
    }

    // Save token
    await prisma.deviceToken.create({
      data: {
        token,
        settingsCode,
        mac: payload.mac,
        deviceId: payload.deviceId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
      },
    });

    const webPortalUrl = process.env.FRONTEND_URL || 'https://xtreamui.duckdns.org';
    const webLink = `${webPortalUrl.replace(/\/+$/, '')}/activate?code=${settingsCode}`;

    const qrCode = await QRCode.toDataURL(webLink, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 400,
      margin: 2,
    });

    return {
      qrCode,
      webLink,
      token,
      settingsCode,
    };
  }

  /**
   * Alias for generateActivationSession to satisfy route expectations
   */
  static async generateSession(payload: DeviceQRPayload): Promise<ActivationSessionResult> {
    return this.generateActivationSession(payload);
  }

  /**
   * Resolve token to device info
   */
  static async resolveDeviceToken(token: string) {
    const deviceToken = await prisma.deviceToken.findUnique({
      where: { token },
    });

    if (!deviceToken || deviceToken.isUsed || deviceToken.expiresAt < new Date()) {
      return null;
    }

    return deviceToken;
  }

  /**
   * Resolve by settings code (Short code)
   */
  static async resolveBySettingsCode(settingsCode: string) {
    const deviceToken = await prisma.deviceToken.findUnique({
      where: { settingsCode },
    });

    if (!deviceToken || deviceToken.isUsed || deviceToken.expiresAt < new Date()) {
      return null;
    }

    return deviceToken;
  }
}
