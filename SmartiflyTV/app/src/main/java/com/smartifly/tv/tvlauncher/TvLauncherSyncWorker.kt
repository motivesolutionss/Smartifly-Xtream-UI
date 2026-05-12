package com.smartifly.tv.tvlauncher

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.smartifly.tv.data.remote.ApiClient
import com.smartifly.tv.data.repository.XtreamRepository
import com.smartifly.tv.data.remote.NetworkResult
import com.smartifly.tv.data.mapper.toDomain
import com.smartifly.tv.data.models.MovieMetadata
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
            val repository = XtreamRepository(
                apiFactory = XtreamApiFactory,
                sessionManager = ApiClient.sessionManager,
                database = database
            )
            
            // 1. Ensure channel exists
            channelManager.createOrUpdateChannel()
            
            // 2. Fetch trending content (using '0' for all movies as a proxy for trending)
            val moviesResult = repository.getMovies("0").firstOrNull()
            
            if (moviesResult is NetworkResult.Success) {
                val domainMovies = moviesResult.data.map { it.toDomain() }
                // 3. Update launcher
                channelManager.updatePrograms(domainMovies)
                Result.success()
            } else {
                Result.retry()
            }
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
