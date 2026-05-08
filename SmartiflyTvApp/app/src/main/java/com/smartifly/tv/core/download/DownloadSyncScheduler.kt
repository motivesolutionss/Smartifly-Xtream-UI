package com.smartifly.tv.core.download

import android.content.Context
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit

object DownloadSyncScheduler {
    private const val PERIODIC_SYNC_WORK_NAME = "smartifly.download.sync.periodic"
    private const val LOOP_SYNC_WORK_NAME = "smartifly.download.sync.loop"

    fun ensurePeriodic(context: Context) {
        val request = PeriodicWorkRequestBuilder<DownloadStatusSyncWorker>(
            15,
            TimeUnit.MINUTES
        ).build()

        WorkManager.getInstance(context.applicationContext)
            .enqueueUniquePeriodicWork(
                PERIODIC_SYNC_WORK_NAME,
                ExistingPeriodicWorkPolicy.UPDATE,
                request
            )
    }

    fun triggerImmediate(context: Context) {
        enqueueLoopTick(context, delaySeconds = 0L)
    }

    fun enqueueLoopTick(
        context: Context,
        delaySeconds: Long,
    ) {
        val builder = OneTimeWorkRequestBuilder<DownloadStatusSyncWorker>()
        if (delaySeconds > 0L) {
            builder.setInitialDelay(delaySeconds, TimeUnit.SECONDS)
        }
        val request = builder.build()

        WorkManager.getInstance(context.applicationContext)
            .enqueueUniqueWork(
                LOOP_SYNC_WORK_NAME,
                ExistingWorkPolicy.REPLACE,
                request
            )
    }
}
