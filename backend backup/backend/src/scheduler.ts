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
        return;
    }



    // Daily analytics snapshot - runs at midnight every day
    // Cron expression: minute hour day-of-month month day-of-week
    cron.schedule('0 0 * * *', async () => {

        try {
            const snapshot = await generateDailySnapshot(new Date());

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


            const snapshot = await generateDailySnapshot(yesterday);


            // Also generate for today

            const todaySnapshot = await generateDailySnapshot(new Date());

        } catch (error) {
            console.error('⚠️ Initial snapshot generation failed:', error);
        }
    }, 5000); // Wait 5 seconds after startup

    isSchedulerRunning = true;

}

/**
 * Manually trigger snapshot generation for a specific date
 */
export async function triggerSnapshot(date?: Date): Promise<void> {
    const targetDate = date || new Date();


    try {
        const snapshot = await generateDailySnapshot(targetDate);

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



    while (current <= endDate) {
        try {
            await generateDailySnapshot(new Date(current));
            count++;
        } catch (error) {
            console.error(`⚠️ Failed to generate snapshot for ${current.toISOString().split('T')[0]}:`, error);
        }
        current.setDate(current.getDate() + 1);
    }


    return count;
}
