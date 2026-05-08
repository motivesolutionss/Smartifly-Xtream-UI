package com.smartifly.tv.features.live

import com.smartifly.tv.data.remote.dto.LiveCategoryDto
import com.smartifly.tv.data.remote.dto.LiveChannelDto

sealed class LiveUiState {
    object Loading : LiveUiState()
    data class Success(
        val categories: List<LiveCategoryDto>,
        val channels: List<LiveChannelDto>
    ) : LiveUiState()
    data class Error(val message: String) : LiveUiState()
    object Empty : LiveUiState()
}
