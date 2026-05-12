// Import from the custom generated client path
import { PrismaClient } from '../prisma/generated/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n--- DATABASE TABLES ---');
  try {
    const tables = await prisma.$queryRawUnsafe('SHOW TABLES');
    console.log(tables);
  } catch (e) {
    console.error('Show tables failed:', e);
  }

  const devices = await prisma.deviceUser.findMany({
    orderBy: { lastSeenAt: 'desc' },
    take: 5,
    include: {
      licenses: true
    }
  });

  console.log('\n--- RAW SQL CHECK (device_users) ---');
  try {
    const rawDevices = await prisma.$queryRawUnsafe('SELECT * FROM device_users');
    console.log(`Raw count: ${(rawDevices as any[]).length}`);
    (rawDevices as any[]).forEach(d => {
      console.log(`ID: ${d.id} | DeviceID: ${d.deviceId} | MAC: ${d.mac}`);
    });
  } catch (e) {
    console.error('Raw SQL failed:', e);
  }

  const tokens = await prisma.deviceToken.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  console.log('\n--- RECENT ACTIVATION TOKENS (device_tokens) ---');
  if (tokens.length === 0) console.log('No tokens found.');
  tokens.forEach(t => {
    console.log(`ID: ${t.id} | Code: ${t.settingsCode} | DeviceID: ${t.deviceId} | Used: ${t.isUsed} | Created: ${t.createdAt}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
