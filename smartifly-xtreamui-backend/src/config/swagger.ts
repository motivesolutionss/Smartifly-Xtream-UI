// src/config/swagger.ts
import type { Application } from "express";
import swaggerJSDoc, { type Options } from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const swaggerOptions: Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Godfather IPTV Backend API",
      version: "1.0.0",
      description: "Admin, Reseller, Public & Support API Documentation",
    },

    servers: [
      { url: "http://localhost:4000", description: "Local Development" },
      { url: "https://api.godfatheriptv.com", description: "Production Server" },
    ],

    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },

      // ────────────────────────────────────────────────
      // 📌 NEW SCHEMAS FOR PUBLIC ENDPOINTS
      // ────────────────────────────────────────────────
      schemas: {
        // --------------------------
        // License Activate Request
        // --------------------------
        LicenseActivateRequest: {
          type: "object",
          required: ["licenseKey", "deviceId"],
          properties: {
            licenseKey: { type: "string", example: "GF-XXXX-XXXX" },
            mac: { type: "string", example: "00:11:22:33:44:55" },
            deviceId: { type: "string", example: "ANDROID-123" },
            deviceId2: { type: "string", example: "ANDROID-HW-456" },
            serialNumber: { type: "string", example: "SN-XYZ" },
            platform: { type: "string", example: "ANDROID_TV" },
            publicIp: { type: "string", example: "1.2.3.4" },
            appVersion: { type: "string", example: "1.0.0" },
          },
        },

        // --------------------------
        // Portal Alias Schema
        // --------------------------
        PortalAlias: {
          type: "object",
          properties: {
            id: { type: "number" },
            alias: { type: "string", example: "default" },
            url: { type: "string", example: "http://portal-url/stalker_portal/server/load.php" },
            isDefault: { type: "boolean" },
            isActive: { type: "boolean" },
          },
        },

        // --------------------------
        // Encrypted Config Response
        // --------------------------
        ConfigEncryptedResponse: {
          type: "object",
          properties: {
            iv: { type: "string", example: "Rk4nKd01Tum15b" },
            ciphertext: { type: "string", example: "base64-encrypted-content..." },
            tag: { type: "string", example: "base64-auth-tag..." },
          },
        },

        // --------------------------
        // Device Check State
        // --------------------------
        DeviceCheckState: {
          type: "object",
          properties: {
            valid: { type: "boolean" },
            exists: { type: "boolean" },
            canRegister: { type: "boolean" },
            state: {
              type: "string",
              enum: [
                "NO_DEVICE",
                "NO_LICENSE",
                "EXPIRED",
                "DISABLED",
                "BLOCKED",
                "ACTIVE",
              ],
            },
            reason: { type: "string" },
            deviceUser: { type: "object" },
            license: { type: "object" },
          },
        },
      },
    },

    security: [{ BearerAuth: [] }],
  },

  // 👇 Swagger-jsdoc will scan these files for @swagger blocks
  apis: ["src/routes/**/*.ts"],
};

export const setupSwagger = (app: Application): void => {
  const swaggerSpec = swaggerJSDoc(swaggerOptions);
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};
