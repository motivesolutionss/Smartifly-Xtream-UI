import type { Application } from "express";

import adminRoutes from "./admin";
import adminAuthRoutes from "./admin/auth.routes";
import healthRoutes from "./health";
import publicRoutes from "./public";
import userAuthRoutes from "./public/auth.routes";

export function registerRoutes(app: Application): void {
  // Health
  app.use("/v1/health", healthRoutes);

  // AUTH
  app.use("/v1/admin/auth", adminAuthRoutes);
  app.use("/v1/public/auth", userAuthRoutes);

  // Areas
  app.use("/v1/admin", adminRoutes);
  app.use("/v1/public", publicRoutes);
}
