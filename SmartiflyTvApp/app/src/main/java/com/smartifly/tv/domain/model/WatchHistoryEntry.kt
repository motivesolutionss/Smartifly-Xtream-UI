package com.smartifly.tv.domain.model

import kotlinx.serialization.Serializable

@Serializable
data class WatchHistoryEntry(
    val id: String,
    val sourceId: Int,
    val title: String,
    val imageUrl: String,
    val type: String,
    val episodeId: Int? = null,
    val positionMs: Long = 0L,
    val durationMs: Long = 0L,
    val lastUpdated: Long = System.currentTimeMillis(),
) {
    val progressPercent: Int
        get() = if (durationMs <= 0L) 0 else ((positionMs * 100) / durationMs).toInt().coerceIn(0, 100)

    val isCompleted: Boolean
        get() = progressPercent >= 92
}
