package com.smartifly.tv.core.download

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.smartifly.tv.data.local.AppPreferencesDataSource
import kotlinx.coroutines.flow.first

class DownloadStatusSyncWorker(
    appContext: Context,
    params: WorkerParameters,
) : CoroutineWorker(appContext, params) {
    override suspend fun doWork(): Result {
        return runCatching {
            val preferences = AppPreferencesDataSource(applicationContext)
            val downloadEngine = AndroidDownloadEngine(applicationContext)
            val current = preferences.downloadsFlow.first()
            if (current.isEmpty()) {
                return Result.success()
            }

            val updated = DownloadStatusSynchronizer.synchronize(current) { enqueueId ->
                downloadEngine.query(enqueueId)
            }
            if (updated != current) {
                preferences.saveDownloads(updated)
            }

            if (DownloadStatusSynchronizer.hasActiveWork(updated)) {
                DownloadSyncScheduler.enqueueLoopTick(applicationContext, delaySeconds = 4L)
            }
            Result.success()
        }.getOrElse {
            Result.retry()
        }
    }
}
