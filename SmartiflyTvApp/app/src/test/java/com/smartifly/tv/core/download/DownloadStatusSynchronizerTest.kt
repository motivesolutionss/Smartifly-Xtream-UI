package com.smartifly.tv.core.download

import com.smartifly.tv.domain.model.TvDownloadItem
import com.smartifly.tv.domain.model.TvDownloadStatus
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class DownloadStatusSynchronizerTest {
    @Test
    fun runningStatus_updatesProgressAndDownloadState() {
        val source = baseItem(enqueueId = 101L, status = TvDownloadStatus.QUEUED, progress = 0)

        val updated = DownloadStatusSynchronizer.synchronize(listOf(source)) {
            DownloadStatusSnapshot(
                status = DownloadManagerStatus.RUNNING,
                downloadedBytes = 50L,
                totalBytes = 100L,
                localUri = "file:///downloads/item.mp4",
                reason = null,
            )
        }

        assertEquals(1, updated.size)
        assertEquals(TvDownloadStatus.DOWNLOADING, updated[0].status)
        assertEquals(50, updated[0].progress)
        assertEquals("file:///downloads/item.mp4", updated[0].localPath)
    }

    @Test
    fun successfulStatus_marksCompletedAndCapturesSize() {
        val source = baseItem(enqueueId = 102L, status = TvDownloadStatus.DOWNLOADING, progress = 70)

        val updated = DownloadStatusSynchronizer.synchronize(listOf(source)) {
            DownloadStatusSnapshot(
                status = DownloadManagerStatus.SUCCESSFUL,
                downloadedBytes = 1000L,
                totalBytes = 1000L,
                localUri = "/storage/emulated/0/Android/data/com.smartifly.tv/files/Downloads/item.mp4",
                reason = null,
            )
        }

        assertEquals(TvDownloadStatus.COMPLETED, updated[0].status)
        assertEquals(100, updated[0].progress)
        assertEquals(1000L, updated[0].sizeBytes)
        assertEquals(
            "/storage/emulated/0/Android/data/com.smartifly.tv/files/Downloads/item.mp4",
            updated[0].localPath
        )
    }

    @Test
    fun hasActiveWork_returnsTrueOnlyForActiveStatuses() {
        val completed = baseItem(enqueueId = 1L, status = TvDownloadStatus.COMPLETED)
        val failed = baseItem(enqueueId = 2L, status = TvDownloadStatus.FAILED)
        assertFalse(DownloadStatusSynchronizer.hasActiveWork(listOf(completed, failed)))

        val queued = baseItem(enqueueId = 3L, status = TvDownloadStatus.QUEUED)
        assertTrue(DownloadStatusSynchronizer.hasActiveWork(listOf(completed, queued)))
    }

    private fun baseItem(
        enqueueId: Long,
        status: TvDownloadStatus,
        progress: Int = 0,
    ): TvDownloadItem {
        return TvDownloadItem(
            id = "movie_1",
            title = "Sample",
            type = "movie",
            sourceId = 1,
            streamUrl = "https://example.com/movie.mp4",
            status = status,
            progress = progress,
            enqueueId = enqueueId,
            downloadedBytes = 0L,
            totalBytes = 0L,
            localPath = null,
            sizeBytes = 0L,
            errorMessage = null,
        )
    }
}
