import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { config } from './config/index.js';

const prisma = new PrismaClient();

async function seed() {
    console.log('🌱 Seeding database...\n');

    // Create default admin
    const existingAdmin = await prisma.admin.findUnique({
        where: { email: config.adminEmail },
    });

    if (!existingAdmin) {
        const hashedPassword = await bcrypt.hash(config.adminPassword, 12);
        await prisma.admin.create({
            data: {
                email: config.adminEmail,
                password: hashedPassword,
                name: 'Admin',
            },
        });
        console.log(`✅ Created admin: ${config.adminEmail}`);
    } else {
        console.log(`⏭️  Admin already exists: ${config.adminEmail}`);
    }

    // Create default app settings
    const settings = await prisma.appSettings.findFirst({ where: { id: 'main' } });
    if (!settings) {
        await prisma.appSettings.create({
            data: {
                id: 'main',
                maintenanceMode: false,
                latestVersion: '1.0.0',
                minVersion: '1.0.0',
            },
        });
        console.log('✅ Created default app settings');
    }

    // Create sample packages
    const packageCount = await prisma.package.count();
    if (packageCount === 0) {
        await prisma.package.createMany({
            data: [
                {
                    name: 'Basic',
                    description: 'Perfect for getting started',
                    duration: '1 Month',
                    price: 9.99,
                    features: ['Live TV', 'Movies', 'Series', '1 Device'],
                    order: 1,
                },
                {
                    name: 'Standard',
                    description: 'Most popular choice',
                    duration: '3 Months',
                    price: 24.99,
                    features: ['Live TV', 'Movies', 'Series', '2 Devices', 'HD Quality'],
                    isPopular: true,
                    order: 2,
                },
                {
                    name: 'Premium',
                    description: 'Best value for families',
                    duration: '1 Year',
                    price: 79.99,
                    features: ['Live TV', 'Movies', 'Series', '4 Devices', '4K Quality', 'Priority Support'],
                    order: 3,
                },
            ],
        });
        console.log('✅ Created sample packages');
    }

    // Create sample announcement
    const announcementCount = await prisma.announcement.count();
    if (announcementCount === 0) {
        await prisma.announcement.create({
            data: {
                title: 'Welcome to Smartifly!',
                content: 'Thank you for choosing Smartifly for your streaming needs. Enjoy unlimited entertainment!',
                type: 'INFO',
            },
        });
        console.log('✅ Created welcome announcement');
    }

    console.log('\n🎉 Seeding complete!\n');
}

seed()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
