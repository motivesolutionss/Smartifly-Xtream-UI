// src/config/prisma.ts
import { PrismaClient } from "../../prisma/generated/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  return new PrismaClient({
    // Optional: enable in development
    // log: ["query", "error", "warn"],
    errorFormat: "pretty",
  });
}

// Reuse existing client in dev to avoid exhausting DB connections
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Graceful shutdown handling (recommended for production)
if (process.env.NODE_ENV === "production") {
  process.on("beforeExit", async () => {
    await prisma.$disconnect();
  });
}

// Store client globally in development
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
