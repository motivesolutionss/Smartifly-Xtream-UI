// src/routes/public/public.routes.ts
import { Router } from "express";

import { prisma } from "../../config/prisma";
import { PublicDeviceCheckController } from "../../controllers/public/deviceCheck.controller";
import { listHeroBanners } from "../../storage/adminContent.store";
import { encryptConfig } from "../../utils/cryptoConfig";

const router = Router();

/**
 * Check device + license status (Core Onboarding)
 */
router.get("/device-check", PublicDeviceCheckController.check);

/**
 * Get encrypted app configuration (Server URL, Credentials)
 */
router.get("/config", async (req, res) => {
  try {
    const { licenseKey } = req.query as { licenseKey?: string };

    const fallbackHeroBanners = (await listHeroBanners())
      .filter((b) => b.isActive !== false)
      .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0));

    if (!licenseKey) {
      return res.json({
        success: true,
        config: {
          licenseKey: null,
          serverUrl: null,
          username: null,
          password: null,
          app: {
            minBufferSeconds: 5,
            maxBufferSeconds: 20,
            fastZapping: true,
            epgEnabled: true,
          },
          fallbackHeroBanners,
        },
      });
    }

    const license = await prisma.license.findUnique({
      where: { key: licenseKey },
      include: { server: true }
    });

    if (!license) return res.status(404).json({ success: false, reason: "INVALID_KEY" });

    if (license.status !== "ACTIVE") {
      return res.status(403).json({ success: false, reason: "LICENSE_INACTIVE" });
    }

    if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
      return res.status(403).json({ success: false, reason: "EXPIRED" });
    }

    const config = {
      licenseKey: license.key,
      serverUrl: license.server?.url ?? null,
      username: license.xtreamUser,
      password: license.xtreamPass,
      app: {
        minBufferSeconds: 5,
        maxBufferSeconds: 20,
        fastZapping: true,
        epgEnabled: true,
      },
      fallbackHeroBanners,
    };

    const encrypted = encryptConfig(config);
    return res.json({ success: true, ...encrypted });
  } catch {
    return res.status(500).json({ success: false, reason: "SERVER_ERROR" });
  }
});

/**
 * Optional app notices feed used by TV client.
 */
router.get("/announcements", async (_req, res) => {
  return res.json([]);
});

/**
 * Hero banner fallback feed used when provider hero/banner images are missing.
 */
router.get("/hero-banners", async (_req, res) => {
  const fallbackHeroBanners = (await listHeroBanners())
    .filter((b) => b.isActive !== false)
    .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0));
  return res.json({ success: true, data: fallbackHeroBanners });
});

export default router;
