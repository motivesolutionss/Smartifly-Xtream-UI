import type { NextFunction, Request, Response } from 'express';
import crypto from 'crypto';

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 120;

type Bucket = {
  count: number;
  windowStart: number;
};

const buckets = new Map<string, Bucket>();

function getClientIp(req: Request): string {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.trim()) {
    return xff.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function timingSafeEqualHex(a: string, b: string): boolean {
  try {
    const left = Buffer.from(a, 'hex');
    const right = Buffer.from(b, 'hex');
    if (left.length !== right.length) return false;
    return crypto.timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

function validateSignatureIfConfigured(req: Request): boolean {
  const key = process.env.PROVIDER_HEALTH_SIGNING_KEY?.trim();
  if (!key) return true; // Optional enforcement; enabled only when configured.

  const signature = req.header('x-smartifly-signature')?.trim() ?? '';
  const timestamp = req.header('x-smartifly-timestamp')?.trim() ?? '';
  if (!signature || !timestamp) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(Date.now() - ts) > 5 * 60_000) return false; // 5 min skew window.

  const payload = JSON.stringify(req.body ?? {});
  const signed = `${timestamp}.${payload}`;
  const expectedHex = crypto.createHmac('sha256', key).update(signed).digest('hex');
  return timingSafeEqualHex(signature.toLowerCase(), expectedHex.toLowerCase());
}

export function providerHealthGuard(req: Request, res: Response, next: NextFunction) {
  const now = Date.now();
  const ip = getClientIp(req);
  const bucket = buckets.get(ip);

  if (!bucket || now - bucket.windowStart >= WINDOW_MS) {
    buckets.set(ip, { count: 1, windowStart: now });
  } else {
    bucket.count += 1;
    if (bucket.count > MAX_REQUESTS_PER_WINDOW) {
      return res.status(429).json({
        success: false,
        message: 'Too many telemetry requests. Slow down.',
      });
    }
  }

  if (!validateSignatureIfConfigured(req)) {
    return res.status(401).json({
      success: false,
      message: 'Invalid telemetry signature',
    });
  }

  return next();
}

