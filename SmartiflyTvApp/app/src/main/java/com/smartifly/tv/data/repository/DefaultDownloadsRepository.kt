package com.smartifly.tv.data.repository

import android.content.Context
import com.smartifly.tv.core.download.AndroidDownloadEngine
import com.smartifly.tv.core.download.DownloadStatusSynchronizer
import com.smartifly.tv.core.download.DownloadSyncScheduler
import com.smartifly.tv.data.local.AppPreferencesDataSource
import com.smartifly.tv.domain.model.TvDownloadItem
import com.smartifly.tv.domain.model.TvDownloadStatus
import com.smartifly.tv.domain.repository.DownloadsRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first

class DefaultDownloadsRepository(
    context: Context,
    private val preferences: AppPreferencesDataSource,
    private val downloadEngine: AndroidDownloadEngine,
) : DownloadsRepository {
    private val appContext = context.applicationContext
    override val downloadsFlow: Flow<List<TvDownloadItem>> = preferences.downloadsFlow

    init {
        DownloadSyncScheduler.ensurePeriodic(appContext)
        DownloadSyncScheduler.triggerImmediate(appContext)
    }

    override suspend fun queueDownload(item: TvDownloadItem) {
        val current = downloadsFlow.first().toMutableList()
        if (current.any { it.id == item.id }) return
        current.add(0, enqueueFreshDownload(item))
        preferences.saveDownloads(current)
        DownloadSyncScheduler.triggerImmediate(appContext)
    }

    override suspend fun removeDownload(id: String) {
        val current = downloadsFlow.first()
        val target = current.firstOrNull { it.id == id }
        target?.enqueueId?.let { enqueueId ->
            runCatching { downloadEngine.remove(enqueueId) }
        }
        downloadEngine.deleteLocalFile(target?.localPath)
        preferences.saveDownloads(current.filterNot { it.id == id })
        DownloadSyncScheduler.triggerImmediate(appContext)
    }

    override suspend fun pauseDownload(id: String) {
        val current = downloadsFlow.first().toMutableList()
        val index = current.indexOfFirst { it.id == id }
        if (index < 0) return

        val existing = current[index]
        if (existing.status != TvDownloadStatus.DOWNLOADING && existing.status != TvDownloadStatus.QUEUED) {
            return
        }

        existing.enqueueId?.let { enqueueId ->
            runCatching { downloadEngine.remove(enqueueId) }
        }

        current[index] = existing.copy(
            status = TvDownloadStatus.PAUSED,
            enqueueId = null,
            errorMessage = "Paused",
        )
        preferences.saveDownloads(current)
    }

    override suspend fun resumeDownload(id: String) {
        val current = downloadsFlow.first().toMutableList()
        val index = current.indexOfFirst { it.id == id }
        if (index < 0) return

        val existing = current[index]
        if (existing.status != TvDownloadStatus.PAUSED) {
            return
        }

        downloadEngine.deleteLocalFile(existing.localPath)
        current[index] = enqueueFreshDownload(existing)
        preferences.saveDownloads(current)
        DownloadSyncScheduler.triggerImmediate(appContext)
    }

    override suspend fun retryDownload(id: String) {
        val current = downloadsFlow.first().toMutableList()
        val index = current.indexOfFirst { it.id == id }
        if (index < 0) return

        val existing = current[index]
        if (existing.status == TvDownloadStatus.DOWNLOADING || existing.status == TvDownloadStatus.QUEUED) {
            existing.enqueueId?.let { enqueueId ->
                runCatching { downloadEngine.remove(enqueueId) }
            }
        }
        downloadEngine.deleteLocalFile(existing.localPath)

        current[index] = enqueueFreshDownload(existing)
        preferences.saveDownloads(current)
        DownloadSyncScheduler.triggerImmediate(appContext)
    }

    override suspend fun refreshStatuses() {
        val current = downloadsFlow.first()
        if (current.isEmpty()) return

        val updated = DownloadStatusSynchronizer.synchronize(current) { enqueueId ->
            downloadEngine.query(enqueueId)
        }
            .map { item ->
                if (item.status == TvDownloadStatus.PAUSED && item.enqueueId == null) {
                    item.copy(errorMessage = item.errorMessage ?: "Paused")
                } else {
                    item
                }
            }

        if (updated != current) {
            preferences.saveDownloads(updated)
        }
        if (DownloadStatusSynchronizer.hasActiveWork(updated)) {
            DownloadSyncScheduler.enqueueLoopTick(appContext, delaySeconds = 4L)
        }
    }

    override suspend fun clearFailed() {
        val current = downloadsFlow.first()
        val failed = current.filter { it.status == TvDownloadStatus.FAILED }
        failed.forEach { item ->
            item.enqueueId?.let { enqueueId ->
                runCatching { downloadEngine.remove(enqueueId) }
            }
            downloadEngine.deleteLocalFile(item.localPath)
        }
        preferences.saveDownloads(current.filterNot { it.status == TvDownloadStatus.FAILED })
        DownloadSyncScheduler.triggerImmediate(appContext)
    }

    override suspend fun clearCompleted() {
        val current = downloadsFlow.first()
        val completed = current.filter { it.status == TvDownloadStatus.COMPLETED }
        completed.forEach { item ->
            item.enqueueId?.let { enqueueId ->
                runCatching { downloadEngine.remove(enqueueId) }
            }
            downloadEngine.deleteLocalFile(item.localPath)
        }
        preferences.saveDownloads(current.filterNot { it.status == TvDownloadStatus.COMPLETED })
        DownloadSyncScheduler.triggerImmediate(appContext)
    }

    override suspend fun clearAll() {
        val current = downloadsFlow.first()
        current.forEach { item ->
            item.enqueueId?.let { enqueueId ->
                runCatching { downloadEngine.remove(enqueueId) }
            }
            downloadEngine.deleteLocalFile(item.localPath)
        }
        preferences.saveDownloads(emptyList())
        DownloadSyncScheduler.triggerImmediate(appContext)
    }

    private fun enqueueFreshDownload(item: TvDownloadItem): TvDownloadItem {
        val enqueue = runCatching {
            downloadEngine.enqueue(
                id = item.id,
                title = item.title,
                url = item.streamUrl,
            )
        }.getOrElse { error ->
            return item.copy(
                status = TvDownloadStatus.FAILED,
                enqueueId = null,
                progress = 0,
                downloadedBytes = 0L,
                totalBytes = 0L,
                errorMessage = error.message ?: "Failed to enqueue download",
            )
        }

        return item.copy(
            status = TvDownloadStatus.DOWNLOADING,
            enqueueId = enqueue.enqueueId,
            localPath = enqueue.destinationPath,
            progress = 0,
            downloadedBytes = 0L,
            totalBytes = 0L,
            errorMessage = null,
        )
    }
}
