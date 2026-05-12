// e:/Smartifly Xtream UI/smartifly-xtreamui-backend/scratch/verify_servers.ts
import { PrismaClient } from "../prisma/generated/client";

const prisma = new PrismaClient();

async function verify() {
  console.log('🔍 Verifying seeded servers...\n');
  const servers = await prisma.xtreamServer.findMany();
  
  if (servers.length === 0) {
    console.log('❌ No servers found in database!');
  } else {
    servers.forEach(s => {
      console.log(`✅ Portal: ${s.name}`);
      console.log(`   - Identity: ${s.serverIdentity}`);
      console.log(`   - URL:      ${s.url}`);
      console.log(`   - Active:   ${s.isActive}\n`);
    });
  }
}

verify()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
