// e:\Smartifly Xtream UI\smartifly-xtreamui-backend\scratch\check-sessions.ts
import { PrismaClient } from '../prisma/generated/client';

const prisma = new PrismaClient();

async function main() {
  const sessions = await prisma.deviceToken.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  console.log('--- ACTIVE ACTIVATION SESSIONS ---');
  if (sessions.length === 0) {
    console.log('No sessions found.');
  } else {
    sessions.forEach(s => {
      console.log(`[${s.createdAt.toISOString()}] CODE: ${s.settingsCode} | Device: ${s.deviceId} | Used: ${s.isUsed}`);
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
