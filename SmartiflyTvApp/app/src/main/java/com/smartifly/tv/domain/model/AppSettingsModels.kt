package com.smartifly.tv.domain.model

import kotlinx.serialization.Serializable

@Serializable
data class TvAppSettings(
    val defaultQuality: String = "Auto",
    val defaultPlaybackSpeed: Float = 1.0f,
    val defaultMuted: Boolean = false,
    val preferredAudioLanguage: String = "System",
    val preferredSubtitleLanguage: String = "Off",
    val aspectMode: String = "Fit",
    val showPlayerStats: Boolean = false,
    val autoPlayNextEpisode: Boolean = true,
)

@Serializable
enum class TvDownloadStatus {
    QUEUED,
    DOWNLOADING,
    PAUSED,
    COMPLETED,
    FAILED,
}

@Serializable
data class TvDownloadItem(
    val id: String,
    val title: String,
    val type: String,
    val sourceId: Int,
    val streamUrl: String,
    val status: TvDownloadStatus = TvDownloadStatus.QUEUED,
    val progress: Int = 0,
    val enqueueId: Long? = null,
    val downloadedBytes: Long = 0L,
    val totalBytes: Long = 0L,
    val localPath: String? = null,
    val sizeBytes: Long = 0L,
    val addedAt: Long = System.currentTimeMillis(),
    val errorMessage: String? = null,
)
