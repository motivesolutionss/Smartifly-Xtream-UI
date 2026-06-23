package com.smartifly.tv.tvlauncher

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.smartifly.tv.data.SessionManager
import com.smartifly.tv.data.repository.XtreamRepository
import com.smartifly.tv.data.remote.NetworkResult
import com.smartifly.tv.data.local.SmartiflyDatabase
import com.smartifly.tv.data.remote.XtreamApiFactory
import kotlinx.coroutines.flow.firstOrNull
import java.util.concurrent.TimeUnit

class TvLauncherSyncWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        return try {
            val channelManager = ChannelManager(applicationContext)
            val database = SmartiflyDatabase.getInstance(applicationContext)
            val sessionManager = SessionManager(applicationContext)

            // Do not retry-burst before onboarding is complete.
            if (!sessionManager.waitUntilActivated(timeoutMs = 750L)) {
                return Result.success()
            }

            val repository = XtreamRepository(
                apiFactory = XtreamApiFactory,
                sessionManager = sessionManager,
                database = database
            )
            
            // 1. Ensure channel exists
            channelManager.createOrUpdateChannel()
            
            // 2. Fetch scoped catalog slices for launcher ranking.
            val categoriesResult = repository.getVodCategories().firstOrNull { it !is NetworkResult.Loading }
            val launcherPool = linkedMapOf<String, com.smartifly.tv.data.models.MovieMetadata>()
            if (categoriesResult is NetworkResult.Success) {
                for (category in categoriesResult.data.take(LAUNCHER_CATEGORY_SCAN_LIMIT)) {
                    val scopedResult = repository.getMoviesCached(category.id).firstOrNull { it !is NetworkResult.Loading }
                    if (scopedResult is NetworkResult.Success) {
                        for (item in scopedResult.data) {
                            launcherPool.putIfAbsent("${item.type}|${item.id}", item)
                            if (launcherPool.size >= LAUNCHER_PROGRAM_LIMIT) break
                        }
                    }
                    if (launcherPool.size >= LAUNCHER_PROGRAM_LIMIT) break
                }
            }

            if (launcherPool.isNotEmpty()) {
                // 3. Update launcher
                channelManager.updatePrograms(launcherPool.values.toList())
                Result.success()
            } else {
                Result.retry()
            }
        } catch (e: Exception) {
            Result.retry()
        }
    }

    companion object {
        private const val LAUNCHER_CATEGORY_SCAN_LIMIT = 5
        private const val LAUNCHER_PROGRAM_LIMIT = 120
        private const val SYNC_WORK_NAME = "tv_launcher_sync"
        private const val SYNC_ONCE_WORK_NAME = "tv_launcher_sync_once"

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
            val request = OneTimeWorkRequestBuilder<TvLauncherSyncWorker>().build()
            WorkManager.getInstance(context).enqueueUniqueWork(
                SYNC_ONCE_WORK_NAME,
                ExistingWorkPolicy.KEEP,
                request
            )
        }

        fun runOnceDeferred(context: Context, delayMinutes: Long = 3L) {
            val request = OneTimeWorkRequestBuilder<TvLauncherSyncWorker>()
                .setInitialDelay(delayMinutes.coerceAtLeast(1L), TimeUnit.MINUTES)
                .build()
            WorkManager.getInstance(context).enqueueUniqueWork(
                SYNC_ONCE_WORK_NAME,
                ExistingWorkPolicy.KEEP,
                request
            )
        }
    }
}
