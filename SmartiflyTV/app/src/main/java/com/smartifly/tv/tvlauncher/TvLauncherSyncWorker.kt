package com.smartifly.tv.tvlauncher

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.smartifly.tv.data.remote.ApiClient
import com.smartifly.tv.data.repository.ContentRepository
import java.util.concurrent.TimeUnit

class TvLauncherSyncWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        return try {
            val channelManager = ChannelManager(applicationContext)
            val repository = ContentRepository(ApiClient.api)
            
            // 1. Ensure channel exists
            channelManager.createOrUpdateChannel()
            
            // 2. Fetch trending content
            val trending = repository.getMovies()
            
            // 3. Update launcher
            channelManager.updatePrograms(trending)
            
            Result.success()
        } catch (e: Exception) {
            Result.retry()
        }
    }

    companion object {
        private const val SYNC_WORK_NAME = "tv_launcher_sync"

        fun schedule(context: Context) {
            val request = PeriodicWorkRequestBuilder<TvLauncherSyncWorker>(
                12, TimeUnit.HOURS
            ).build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                SYNC_WORK_NAME,
                androidx.work.ExistingPeriodicWorkPolicy.KEEP,
                request
            )
        }
        
        fun runOnce(context: Context) {
            val request = androidx.work.OneTimeWorkRequestBuilder<TvLauncherSyncWorker>().build()
            WorkManager.getInstance(context).enqueue(request)
        }
    }
}
