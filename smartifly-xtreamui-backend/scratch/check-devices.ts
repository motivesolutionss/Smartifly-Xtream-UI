// e:\Smartifly Xtream UI\smartifly-xtreamui-backend\scratch\check-devices.ts
import { PrismaClient } from '../prisma/generated/client';

const prisma = new PrismaClient();

async function main() {
  const devices = await prisma.deviceUser.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  console.log('--- RECENTLY REGISTERED DEVICES ---');
  if (devices.length === 0) {
    console.log('No devices found in database yet.');
  } else {
    devices.forEach(d => {
      console.log(`[${d.createdAt.toISOString()}] ID: ${d.deviceId} | MAC: ${d.mac} | Model: ${d.model}`);
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
