// src/utils/resellerFilter.ts

import type { Request } from 'express';

export function resellerFilter(req: Request) {
  if (!req.resellerId) {
    throw new Error('resellerFilter used without restrictToReseller middleware');
  }

  return { resellerId: req.resellerId };
}
