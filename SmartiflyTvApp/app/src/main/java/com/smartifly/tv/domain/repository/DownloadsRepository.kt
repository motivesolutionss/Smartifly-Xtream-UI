package com.smartifly.tv.domain.repository

import com.smartifly.tv.domain.model.TvDownloadItem
import kotlinx.coroutines.flow.Flow

interface DownloadsRepository {
    val downloadsFlow: Flow<List<TvDownloadItem>>

    suspend fun queueDownload(item: TvDownloadItem)
    suspend fun removeDownload(id: String)
    suspend fun pauseDownload(id: String)
    suspend fun resumeDownload(id: String)
    suspend fun retryDownload(id: String)
    suspend fun refreshStatuses()
    suspend fun clearFailed()
    suspend fun clearCompleted()
    suspend fun clearAll()
}
