/**
 * Scheduler Service - Runs periodic tasks
 * Uses node-cron for scheduling
 */
import cron from 'node-cron';
import { generateDailySnapshot } from './modules/analytics/service.js';
import { processScheduledAnnouncements } from './modules/announcements/controller.js';

// Track if scheduler is running
let isSchedulerRunning = false;

/**
 * Initialize all scheduled tasks
 */
export function initializeScheduler() {
    if (isSchedulerRunning) {
        console.log('⏰ Scheduler already running');
        return;
    }

    console.log('⏰ Initializing scheduler...');

    // Daily analytics snapshot - runs at midnight every day
    // Cron expression: minute hour day-of-month month day-of-week
    cron.schedule('0 0 * * *', async () => {
        console.log('📊 Running daily analytics snapshot...');
        try {
            const snapshot = await generateDailySnapshot(new Date());
            console.log('✅ Daily snapshot generated:', snapshot.id);
        } catch (error) {
            console.error('❌ Daily snapshot failed:', error);
        }
    }, {
        timezone: 'UTC'
    });

    // Process scheduled announcements - runs every minute
    cron.schedule('* * * * *', async () => {
        try {
            await processScheduledAnnouncements();
        } catch (error) {
            console.error('❌ Announcement processing failed:', error);
        }
    });

    // Generate snapshot for yesterday if we're starting fresh (initial run)
    // This helps populate data when the server first starts
    setTimeout(async () => {
        try {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            console.log('📊 Generating initial snapshot for yesterday...');
            const snapshot = await generateDailySnapshot(yesterday);
            console.log('✅ Initial snapshot generated:', snapshot.id);

            // Also generate for today
            console.log('📊 Generating snapshot for today...');
            const todaySnapshot = await generateDailySnapshot(new Date());
            console.log('✅ Today snapshot generated:', todaySnapshot.id);
        } catch (error) {
            console.error('⚠️ Initial snapshot generation failed:', error);
        }
    }, 5000); // Wait 5 seconds after startup

    isSchedulerRunning = true;
    console.log('✅ Scheduler initialized - Daily snapshots at 00:00 UTC');
}

/**
 * Manually trigger snapshot generation for a specific date
 */
export async function triggerSnapshot(date?: Date): Promise<void> {
    const targetDate = date || new Date();
    console.log(`📊 Manually triggering snapshot for ${targetDate.toISOString().split('T')[0]}...`);

    try {
        const snapshot = await generateDailySnapshot(targetDate);
        console.log('✅ Manual snapshot generated:', snapshot.id);
    } catch (error) {
        console.error('❌ Manual snapshot failed:', error);
        throw error;
    }
}

/**
 * Generate snapshots for a date range (backfill)
 */
export async function backfillSnapshots(startDate: Date, endDate: Date): Promise<number> {
    let count = 0;
    const current = new Date(startDate);

    console.log(`📊 Backfilling snapshots from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}...`);

    while (current <= endDate) {
        try {
            await generateDailySnapshot(new Date(current));
            count++;
        } catch (error) {
            console.error(`⚠️ Failed to generate snapshot for ${current.toISOString().split('T')[0]}:`, error);
        }
        current.setDate(current.getDate() + 1);
    }

    console.log(`✅ Backfill complete: ${count} snapshots generated`);
    return count;
}
