import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ADMIN_EMAIL = "adnankhawar005@gmail.com";
const ADMIN_PASSWORD = "Aadi@123$";
const ADMIN_NAME = "Adnan Khawar";

async function main() {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    create: {
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      password: passwordHash,
      role: "ADMIN",
      isActive: true,
    },
    update: {
      name: ADMIN_NAME,
      password: passwordHash,
      role: "ADMIN",
      isActive: true,
      deletedAt: null,
    },
  });

  console.log("Admin ready:", admin.email);
}

main()
  .catch((error) => {
    console.error("Failed to seed admin:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
