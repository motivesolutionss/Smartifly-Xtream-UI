/// <reference types="node" />
// prisma/seed.ts
import { PrismaClient, UserRole, LicenseStatus, LicensePlan } from './generated/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // Clear existing data
  console.log('🗑️  Clearing existing data...');
  await prisma.deviceToken.deleteMany();
  await prisma.license.deleteMany();
  await prisma.xtreamServer.deleteMany();
  await prisma.user.deleteMany();

  // Create Admin User
  console.log('👤 Creating admin user...');
  const admin = await prisma.user.create({
    data: {
      name: 'Local Admin',
      email: process.env.SEED_ADMIN_EMAIL ?? 'admin@local.godfather.test',
      password: await bcrypt.hash(process.env.SEED_SHARED_PASSWORD ?? 'ChangeMe123!', 10),
      role: UserRole.ADMIN,
      isActive: true,
    },
  });
  console.log(`✅ Admin: ${admin.email}`);

  // Create Regular Users
  console.log('\n👥 Creating users...');
  const users = await Promise.all([
    prisma.user.create({
      data: {
        name: 'Local User',
        email: process.env.SEED_USER_EMAIL ?? 'user@local.godfather.test',
        password: await bcrypt.hash(process.env.SEED_SHARED_PASSWORD ?? 'ChangeMe123!', 10),
        role: UserRole.USER,
        isActive: true,
      },
    }),
  ]);
  users.forEach(u => console.log(`✅ User: ${u.email}`));

  // Create Licenses
  console.log('\n📜 Creating licenses...');
  const now = new Date();
  const oneMonthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const license = await prisma.license.create({
    data: {
      key: 'SMARTIFLY-PREMIUM-2024',
      plan: LicensePlan.MONTHLY,
      status: LicenseStatus.ACTIVE,
      userId: users[0].id,
      activatedAt: now,
      expiresAt: oneMonthFromNow,
    },
  });
  console.log(`✅ License: ${license.key}`);

  // Create Xtream Servers (Portals)
  console.log('\n🌐 Creating Xtream servers (portals)...');
  const servers = await Promise.all([
    prisma.xtreamServer.create({
      data: {
        name: 'Smartifly Global Hub',
        url: 'http://103.120.71.123:25461',
        serverIdentity: 'SMARTIFLY-01',
        isActive: true,
        isDefault: true
      }
    }),
    prisma.xtreamServer.create({
      data: {
        name: 'Smartifly QA Portal',
        url: 'http://test-server.tv:8080',
        serverIdentity: 'SF-TEST',
        isActive: true,
        isDefault: false
      }
    })
  ]);
  servers.forEach(s => console.log(`✅ Portal: ${s.name} [ID: ${s.serverIdentity}] -> ${s.url}`));

  console.log('\n🚀 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
