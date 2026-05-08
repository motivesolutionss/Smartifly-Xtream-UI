package com.smartifly.tv.core.download

import android.app.DownloadManager
import com.smartifly.tv.domain.model.TvDownloadItem
import com.smartifly.tv.domain.model.TvDownloadStatus

object DownloadStatusSynchronizer {
    fun synchronize(
        items: List<TvDownloadItem>,
        queryStatus: (Long) -> DownloadStatusSnapshot?,
    ): List<TvDownloadItem> {
        return items.map { item ->
            val enqueueId = item.enqueueId ?: return@map item
            val status = queryStatus(enqueueId) ?: return@map item

            val total = status.totalBytes.coerceAtLeast(0L)
            val downloaded = status.downloadedBytes.coerceAtLeast(0L)
            val progress = if (total > 0L) {
                ((downloaded * 100L) / total).toInt().coerceIn(0, 100)
            } else {
                item.progress
            }
            val localPath = status.localUri ?: item.localPath

            when (status.status) {
                DownloadManagerStatus.RUNNING -> item.copy(
                    status = TvDownloadStatus.DOWNLOADING,
                    progress = progress,
                    downloadedBytes = downloaded,
                    totalBytes = total,
                    localPath = localPath,
                    errorMessage = null,
                )

                DownloadManagerStatus.PENDING -> item.copy(
                    status = TvDownloadStatus.QUEUED,
                    progress = progress,
                    downloadedBytes = downloaded,
                    totalBytes = total,
                    localPath = localPath,
                    errorMessage = null,
                )

                DownloadManagerStatus.PAUSED -> item.copy(
                    status = TvDownloadStatus.PAUSED,
                    progress = progress,
                    downloadedBytes = downloaded,
                    totalBytes = total,
                    localPath = localPath,
                    errorMessage = mapPausedReason(status.reason),
                )

                DownloadManagerStatus.SUCCESSFUL -> item.copy(
                    status = TvDownloadStatus.COMPLETED,
                    progress = 100,
                    downloadedBytes = downloaded,
                    totalBytes = total,
                    localPath = localPath,
                    sizeBytes = if (total > 0L) total else downloaded,
                    errorMessage = null,
                )

                DownloadManagerStatus.FAILED -> item.copy(
                    status = TvDownloadStatus.FAILED,
                    progress = progress,
                    downloadedBytes = downloaded,
                    totalBytes = total,
                    errorMessage = mapFailureReason(status.reason),
                )

                DownloadManagerStatus.UNKNOWN -> item
            }
        }
    }

    fun hasActiveWork(items: List<TvDownloadItem>): Boolean {
        return items.any { item ->
            item.status == TvDownloadStatus.QUEUED ||
                item.status == TvDownloadStatus.DOWNLOADING
        }
    }

    private fun mapFailureReason(reason: Int?): String {
        val message = when (reason) {
            DownloadManager.ERROR_CANNOT_RESUME -> "Cannot resume download"
            DownloadManager.ERROR_DEVICE_NOT_FOUND -> "Storage device not found"
            DownloadManager.ERROR_FILE_ALREADY_EXISTS -> "File already exists"
            DownloadManager.ERROR_FILE_ERROR -> "File I/O error"
            DownloadManager.ERROR_HTTP_DATA_ERROR -> "Network data error"
            DownloadManager.ERROR_INSUFFICIENT_SPACE -> "Insufficient storage space"
            DownloadManager.ERROR_TOO_MANY_REDIRECTS -> "Too many redirects"
            DownloadManager.ERROR_UNHANDLED_HTTP_CODE -> "Unhandled server response"
            DownloadManager.ERROR_UNKNOWN -> "Unknown download error"
            DownloadManager.PAUSED_WAITING_FOR_NETWORK -> "Waiting for network"
            DownloadManager.PAUSED_QUEUED_FOR_WIFI -> "Queued for Wi-Fi"
            DownloadManager.PAUSED_WAITING_TO_RETRY -> "Waiting to retry"
            else -> "Download failed"
        }
        return message
    }

    private fun mapPausedReason(reason: Int?): String? {
        return when (reason) {
            DownloadManager.PAUSED_WAITING_FOR_NETWORK -> "Waiting for network"
            DownloadManager.PAUSED_QUEUED_FOR_WIFI -> "Queued for Wi-Fi"
            DownloadManager.PAUSED_WAITING_TO_RETRY -> "Waiting to retry"
            else -> null
        }
    }
}
