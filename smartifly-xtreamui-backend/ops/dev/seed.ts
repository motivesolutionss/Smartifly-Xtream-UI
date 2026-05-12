// ops/dev/seed.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Smartifly Xtream UI...");

  // 1. Clean
  await prisma.auditLog.deleteMany({});
  await prisma.license.deleteMany({});
  await prisma.deviceUser.deleteMany({});
  await prisma.xtreamServer.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.user.deleteMany({});

  const password = await bcrypt.hash("admin123", 10);

  // 2. Admin
  const admin = await prisma.user.create({
    data: {
      name: "Super Admin",
      email: "admin@smartifly.test",
      password,
      role: "ADMIN",
    }
  });
  console.log("✅ Admin created:", admin.email);

  // 3. User
  const user = await prisma.user.create({
    data: {
      name: "Test User",
      email: "user@smartifly.test",
      password,
      role: "USER",
    }
  });
  console.log("✅ User created:", user.email);

  // 4. Server
  const server = await prisma.xtreamServer.create({
    data: {
      name: "Main Xtream Server",
      url: "http://example.com:8080",
      serverIdentity: "SMARTIFLY-01",
      isActive: true,
      isDefault: true
    }
  });
  console.log("✅ Server created:", server.name);

  // 5. License
  const license = await prisma.license.create({
    data: {
      key: "SMART-TEST-123",
      userId: user.id,
      serverId: server.id,
      status: "ACTIVE",
      plan: "YEARLY",
      xtreamUser: "test_user",
      xtreamPass: "test_pass",
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    }
  });
  console.log("✅ License created:", license.key);

  console.log("🚀 Seeding finished successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
