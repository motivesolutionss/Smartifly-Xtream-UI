// ============================================================
// src/controllers/public/deviceCheck.controller.ts
// SMARTIFLY XTREAM UI — ENTERPRISE DEVICE CONTROLLER
// ============================================================

import type { Request, Response } from 'express';

import { DeviceUserService } from '../../services/deviceUser.service';
import { QRCodeService } from '../../services/qr-code.service';

// ============================================================
// HELPERS
// ============================================================

function error(res: Response, code: number, message: string, state?: string) {
  return res.status(code).json({
    success: false,
    valid: false,
    exists: false,
    state: state ?? 'ERROR',
    reason: message,
  });
}

function success(res: Response, data: Record<string, unknown>) {
  return res.json({
    success: true,
    ...data,
  });
}

function getClientIp(req: Request): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
    return ips?.trim() ?? null;
  }
  return req.ip ?? req.socket?.remoteAddress ?? null;
}

// ============================================================
// PUBLIC DEVICE CHECK CONTROLLER
// ============================================================

export const PublicDeviceCheckController = {
  /**
   * Check device status (Main App Tracking & Status)
   */
  check: async (req: Request, res: Response) => {
    try {
      const identifiers = {
        deviceId: req.query.deviceId as string | undefined,
        mac: req.query.mac as string | undefined,
      };

      const result = await DeviceUserService.check(identifiers);

      return res.json({
        success: true,
        valid: result.valid,
        exists: result.exists,
        state: result.state,
        statusCode: result.state,
        reason: result.reason,
        device: result.device ?? null,
        license: result.license ?? null,
      });
    } catch (err) {
      console.error('[DeviceCheck.check] Error:', err);
      return error(res, 500, 'Internal server error', 'SERVER_ERROR');
    }
  },

  /**
   * Register or Update device (Silent Onboarding)
   */
  register: async (req: Request, res: Response) => {
    try {
      const {
        deviceId,
        mac,
        brand,
        model,
        serial,
        platform,
        appVersion,
        osVersion,
      } = req.body;

      if (!deviceId) {
        return error(res, 400, 'deviceId is required', 'BAD_REQUEST');
      }

      const device = await DeviceUserService.register({
        deviceId,
        mac,
        brand,
        model,
        serial,
        platform,
        appVersion,
        osVersion,
        publicIp: getClientIp(req),
      });

      return success(res, {
        message: 'Device registered successfully',
        device: {
          id: device.id,
          deviceId: device.deviceId,
          mac: device.mac,
        },
      });
    } catch (err) {
      console.error('[DeviceCheck.register] Error:', err);
      return error(res, 500, 'Registration failed', 'SERVER_ERROR');
    }
  },

  /**
   * Generate QR code for activation
   */
  generateQR: async (req: Request, res: Response) => {
    try {
      const { deviceId, mac, platform } = req.body;

      if (!deviceId) {
        return error(res, 400, 'deviceId is required', 'BAD_REQUEST');
      }

      // First ensure device is registered/tracked
      await DeviceUserService.register({
        deviceId,
        mac,
        platform,
        publicIp: getClientIp(req),
      });

      const result = await QRCodeService.generateActivationSession({
        mac: mac ?? '',
        deviceId,
        platform: platform ?? 'ANDROID_TV',
      });

      return success(res, {
        qrCode: result.qrCode,
        webLink: result.webLink,
        token: result.token,
        settingsCode: result.settingsCode,
        expiresIn: '24 hours',
      });
    } catch (err) {
      console.error('[DeviceCheck.generateQR] Error:', err);
      return error(res, 500, 'QR generation failed', 'SERVER_ERROR');
    }
  },

  /**
   * Heartbeat (Periodic tracking)
   */
  heartbeat: async (req: Request, res: Response) => {
    try {
      const { deviceId, mac, _appVersion } = req.body;

      if (!deviceId && !mac) {
        return error(res, 400, 'deviceId or mac is required', 'BAD_REQUEST');
      }

      const result = await DeviceUserService.check({ deviceId, mac });

      return success(res, {
        state: result.state,
        lastSeenAt: new Date(),
      });
    } catch (err) {
      console.error('[DeviceCheck.heartbeat] Error:', err);
      return error(res, 500, 'Heartbeat failed', 'SERVER_ERROR');
    }
  },
};

export default PublicDeviceCheckController;
