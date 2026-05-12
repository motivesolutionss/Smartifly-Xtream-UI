package com.smartifly.tv.features.live

import com.smartifly.tv.data.models.LiveStream
import com.smartifly.tv.data.models.MediaCategory

/**
 * Enterprise-grade UI State for the Live TV Screen.
 */
sealed class LiveUiState {
    object Loading : LiveUiState()
    data class Success(
        val categories: List<MediaCategory>,
        val selectedCategoryId: String,
        val channels: List<LiveStream>,
        val isLoadingChannels: Boolean = false,
        val isLoadingMore: Boolean = false,
        val hasMore: Boolean = false,
        val categoryError: String? = null,
        val focusedChannelEpg: List<com.smartifly.tv.features.live.epg.EpgProgram> = emptyList()
    ) : LiveUiState()
    data class Error(val message: String) : LiveUiState()
    object Empty : LiveUiState()
}
