package com.smartifly.tv.features.details

import com.smartifly.tv.data.remote.dto.ContentDetailsDto

sealed class ContentDetailsUiState {
    object Loading : ContentDetailsUiState()
    data class Success(val details: ContentDetailsDto) : ContentDetailsUiState()
    data class Error(val message: String) : ContentDetailsUiState()
}
