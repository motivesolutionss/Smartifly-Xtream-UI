/**
 * Seed file for testing the admin panel
 * Run with: npm run db:seed
 * Or: npx prisma db seed
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { config } from '../src/config/index.js';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting seed...\n');


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

        // ========================
        // 2. PORTALS
        // ========================
        console.log('🌐 Creating portals...');

        // Delete existing portals first to avoid conflicts
        await prisma.portal.deleteMany({
            where: {
                url: {
                    in: [
                        'http://portal1.example.com:8080',
                        'http://portal2.example.com:8080',
                        'http://portal3.example.com:8080'
                    ]
                }
            }
        });

        const portals = await Promise.all([
            prisma.portal.create({
                data: {
                    name: 'Main IPTV Server',
                    url: 'http://portal1.example.com:8080',
                    username: 'admin',
                    password: 'encrypted_password_1',
                    isActive: true,
                    category: 'Primary',
                    healthStatus: 'ONLINE',
                    lastCheckAt: new Date(),
                    uptime: 99.5,
                    latency: 45,
                    activeConnections: 450,
                    order: 1,
                },
            }),
            prisma.portal.create({
                data: {
                    name: 'Backup Server EU',
                    url: 'http://portal2.example.com:8080',
                    username: 'admin',
                    password: 'encrypted_password_2',
                    isActive: true,
                    category: 'Backup',
                    healthStatus: 'ONLINE',
                    lastCheckAt: new Date(),
                    uptime: 98.2,
                    latency: 78,
                    activeConnections: 120,
                    order: 2,
                },
            }),
            prisma.portal.create({
                data: {
                    name: 'US East Server',
                    url: 'http://portal3.example.com:8080',
                    username: 'admin',
                    password: 'encrypted_password_3',
                    isActive: false,
                    category: 'Regional',
                    healthStatus: 'OFFLINE',
                    lastCheckAt: new Date(),
                    uptime: 85.0,
                    latency: 120,
                    activeConnections: 0,
                    order: 3,
                },
            }),
        ]);

        console.log(`   ✓ Created ${portals.length} portals`);

        // ========================
        // 3. PACKAGES
        // ========================
        console.log('📦 Creating packages...');

        const packages = await Promise.all([
            prisma.package.upsert({
                where: { id: 'pkg-basic' },
                update: {},
                create: {
                    id: 'pkg-basic',
                    name: 'Basic Plan',
                    description: 'Perfect for beginners. Access to 500+ channels.',
                    duration: '1 Month',
                    price: 9.99,
                    currency: 'USD',
                    features: ['500+ Channels', 'SD Quality', '1 Device', 'Email Support'],
                    isPopular: false,
                    isActive: true,
                    order: 1,
                },
            }),
            prisma.package.upsert({
                where: { id: 'pkg-standard' },
                update: {},
                create: {
                    id: 'pkg-standard',
                    name: 'Standard Plan',
                    description: 'Best value for families. HD quality streaming.',
                    duration: '3 Months',
                    price: 24.99,
                    currency: 'USD',
                    features: ['1000+ Channels', 'HD Quality', '2 Devices', 'Priority Support', 'VOD Access'],
                    isPopular: true,
                    isActive: true,
                    order: 2,
                },
            }),
            prisma.package.upsert({
                where: { id: 'pkg-premium' },
                update: {},
                create: {
                    id: 'pkg-premium',
                    name: 'Premium Plan',
                    description: 'Ultimate entertainment experience with 4K.',
                    duration: '12 Months',
                    price: 79.99,
                    currency: 'USD',
                    features: ['2000+ Channels', '4K Quality', '4 Devices', '24/7 Support', 'VOD + PPV', 'Adult Channels'],
                    isPopular: false,
                    isActive: true,
                    order: 3,
                },
            }),
        ]);

        console.log(`   ✓ Created ${packages.length} packages`);

        // ========================
        // 4. PACKAGE ANALYTICS
        // ========================
        console.log('📊 Creating package analytics...');

        await Promise.all([
            prisma.packageAnalytics.upsert({
                where: { packageId: 'pkg-basic' },
                update: { views: 1250, purchases: 85, revenue: 849.15, conversionRate: 6.8 },
                create: {
                    packageId: 'pkg-basic',
                    views: 1250,
                    purchases: 85,
                    revenue: 849.15,
                    conversionRate: 6.8,
                    lastViewedAt: new Date(),
                    lastPurchasedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
                },
            }),
            prisma.packageAnalytics.upsert({
                where: { packageId: 'pkg-standard' },
                update: { views: 2340, purchases: 312, revenue: 7796.88, conversionRate: 13.3 },
                create: {
                    packageId: 'pkg-standard',
                    views: 2340,
                    purchases: 312,
                    revenue: 7796.88,
                    conversionRate: 13.3,
                    lastViewedAt: new Date(),
                    lastPurchasedAt: new Date(),
                },
            }),
            prisma.packageAnalytics.upsert({
                where: { packageId: 'pkg-premium' },
                update: { views: 890, purchases: 67, revenue: 5359.33, conversionRate: 7.5 },
                create: {
                    packageId: 'pkg-premium',
                    views: 890,
                    purchases: 67,
                    revenue: 5359.33,
                    conversionRate: 7.5,
                    lastViewedAt: new Date(),
                    lastPurchasedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                },
            }),
        ]);

        console.log('   ✓ Created package analytics');

        // ========================
        // 5. TICKETS
        // ========================
        console.log('🎫 Creating tickets...');

        const ticketData = [
            { subject: 'Channels not loading', status: 'OPEN', priority: 'HIGH', message: 'All EPL channels show black screen.' },
            { subject: 'Buffering issues on VOD', status: 'OPEN', priority: 'MEDIUM', message: 'VOD content buffers every 30 seconds.' },
            { subject: 'Account login problem', status: 'IN_PROGRESS', priority: 'HIGH', message: 'Cannot login to my account since yesterday.' },
            { subject: 'Request for adult package', status: 'IN_PROGRESS', priority: 'LOW', message: 'How do I add adult channels to my subscription?' },
            { subject: 'Payment not reflected', status: 'RESOLVED', priority: 'HIGH', message: 'Paid via PayPal but subscription not updated.', resolvedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
            { subject: 'EPG not showing', status: 'RESOLVED', priority: 'MEDIUM', message: 'Electronic Program Guide is empty.', resolvedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
            { subject: 'Change email request', status: 'CLOSED', priority: 'LOW', message: 'Please update my email address.', resolvedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
            { subject: 'Multi-room setup help', status: 'CLOSED', priority: 'MEDIUM', message: 'Need help setting up on multiple TVs.', resolvedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        ];

        let ticketCounter = 1000;
        const tickets = [];
        for (const t of ticketData) {
            ticketCounter++;
            const ticketNo = `TKT-${ticketCounter}`;
            const ticket = await prisma.ticket.upsert({
                where: { ticketNo },
                update: {},
                create: {
                    ticketNo,
                    name: 'Test Customer',
                    email: 'customer@example.com',
                    subject: t.subject,
                    message: t.message,
                    status: t.status as 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED',
                    priority: t.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
                    ...(t.resolvedAt && { resolvedAt: t.resolvedAt }),
                    createdAt: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000),
                },
            });
            tickets.push(ticket);
        }

        console.log(`   ✓ Created ${tickets.length} tickets`);

        // ========================
        // 6. ANNOUNCEMENTS
        // ========================
        console.log('📢 Creating announcements...');

        await Promise.all([
            prisma.announcement.create({
                data: {
                    title: 'System Maintenance Scheduled',
                    content: 'We will be performing scheduled maintenance on January 5th from 2 AM to 4 AM UTC. Service may be intermittent during this time.',
                    type: 'WARNING',
                    priority: 'URGENT',
                    status: 'PUBLISHED',
                    isActive: true,
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                },
            }),
            prisma.announcement.create({
                data: {
                    title: 'New 4K Channels Added!',
                    content: 'We have added 50 new 4K channels including sports, movies, and documentaries. Enjoy crystal clear quality!',
                    type: 'INFO',
                    priority: 'NORMAL',
                    status: 'PUBLISHED',
                    isActive: true,
                },
            }),
            prisma.announcement.create({
                data: {
                    title: 'Holiday Special Offer',
                    content: 'Get 30% off on all yearly subscriptions! Use code HOLIDAY30 at checkout. Valid until January 15th.',
                    type: 'UPDATE',
                    priority: 'NORMAL',
                    status: 'PUBLISHED',
                    isActive: true,
                },
            }),
        ]);

        console.log('   ✓ Created 3 announcements');

        // ========================
        // 7. NOTIFICATIONS (Push Campaigns)
        // ========================
        console.log('🔔 Creating notification history...');

        const notificationStatuses: Array<'SENT' | 'FAILED' | 'PENDING' | 'SCHEDULED'> = ['SENT', 'SENT', 'SENT', 'FAILED', 'PENDING', 'SCHEDULED'];
        for (let i = 0; i < 50; i++) {
            await prisma.notification.create({
                data: {
                    title: `Notification ${i + 1}`,
                    body: `This is test notification message ${i + 1}`,
                    status: notificationStatuses[Math.floor(Math.random() * notificationStatuses.length)],
                    sentAt: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000),
                    createdAt: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000),
                },
            });
        }

        console.log('   ✓ Created 50 notifications');

        // ========================
        // 8. ANALYTICS SNAPSHOTS (Last 14 Days)
        // ========================
        console.log('📈 Creating analytics snapshots...');

    const snapshotRows = Array.from({ length: 14 }).map((_, i) => {
        const now = new Date();
        const date = new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate() - i
        ));

        return {
            date,
            ticketsCreated: Math.floor(Math.random() * 10) + 2,
            ticketsResolved: Math.floor(Math.random() * 8) + 1,
            avgResolutionTime: Math.random() * 48 + 4,
            ticketsOpen: Math.floor(Math.random() * 5) + 1,
            ticketsInProgress: Math.floor(Math.random() * 3),
            ticketsClosed: Math.floor(Math.random() * 4),
            portalConnections: Math.floor(Math.random() * 200) + 400,
            portalUptimeAvg: 95 + Math.random() * 5,
            notificationsSent: Math.floor(Math.random() * 20) + 5,
            notificationsDelivered: Math.floor(Math.random() * 18) + 5,
            notificationsFailed: Math.floor(Math.random() * 3),
        };
    });

    await prisma.analyticsSnapshot.createMany({
        data: snapshotRows,
        skipDuplicates: true,
    });

        console.log('   ✓ Created 14 days of analytics snapshots');

        // ========================
        // 9. SYSTEM AUDIT LOGS (For Heatmap)
        // ========================
        console.log('📝 Creating audit logs...');

        // Try to find an admin for realistic logs, otherwise use null (system action)
        const adminForAudit = await prisma.admin.findFirst();
        const adminId = adminForAudit?.id || null;

        const actions = ['LOGIN', 'UPDATE', 'CREATE', 'DELETE', 'TOGGLE'];
        const resources = ['Settings', 'Portal', 'Package', 'Ticket', 'Announcement'];

        for (let i = 0; i < 100; i++) {
            const createdAt = new Date();
            createdAt.setDate(createdAt.getDate() - Math.floor(Math.random() * 7));
            createdAt.setHours(Math.floor(Math.random() * 24));
            createdAt.setMinutes(Math.floor(Math.random() * 60));

            await prisma.systemAuditLog.create({
                data: {
                    adminId: adminId,
                    action: actions[Math.floor(Math.random() * actions.length)],
                    resource: resources[Math.floor(Math.random() * resources.length)],
                    details: { mock: true, iteration: i },
                    ipAddress: '192.168.1.' + Math.floor(Math.random() * 255),
                    createdAt,
                },
            });
        }

        console.log('   ✓ Created 100 audit log entries');

        // ========================
        // SUMMARY
        // ========================
        console.log('\n✅ Seed completed successfully!\n');
        console.log('📋 Summary:');
        console.log('   • 3 Portals');
        console.log('   • 3 Packages with analytics');
        console.log('   • 8 Tickets (various statuses)');
        console.log('   • 3 Announcements');
        console.log('   • 50 Notifications');
        console.log('   • 14 Analytics snapshots');
        console.log('   • 100 Audit log entries');

}
main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        throw e;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
