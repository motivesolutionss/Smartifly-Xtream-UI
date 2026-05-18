import type { Request, Response } from 'express';

import { prisma } from '../../config/prisma';
import { assertProviderHealthSchemaReady } from '../../startup/providerHealthSchemaCheck';

type ReadinessCheck = {
  name: string;
  ok: boolean;
  message: string;
};

async function checkDatabase(): Promise<ReadinessCheck> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { name: 'database', ok: true, message: 'Database reachable' };
  } catch (error) {
    return {
      name: 'database',
      ok: false,
      message: error instanceof Error ? error.message : 'Database check failed',
    };
  }
}

async function checkProviderHealthSchema(): Promise<ReadinessCheck> {
  try {
    await assertProviderHealthSchemaReady();
    return {
      name: 'provider_health_schema',
      ok: true,
      message: 'Telemetry schema ready',
    };
  } catch (error) {
    return {
      name: 'provider_health_schema',
      ok: false,
      message: error instanceof Error ? error.message : 'Telemetry schema check failed',
    };
  }
}

export const SystemAdminController = {
  async readiness(_req: Request, res: Response) {
    const checks = await Promise.all([checkDatabase(), checkProviderHealthSchema()]);
    const ready = checks.every((check) => check.ok);

    return res.status(ready ? 200 : 503).json({
      success: ready,
      ready,
      timestamp: new Date().toISOString(),
      checks,
    });
  },
};
