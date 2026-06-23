package com.smartifly.tv.features.details

import com.smartifly.tv.data.models.ContentDetails

sealed class ContentDetailsUiState {
    object Loading : ContentDetailsUiState()
    data class Success(
        val details: ContentDetails,
        val similarContent: List<com.smartifly.tv.data.models.MovieMetadata> = emptyList(),
        val enrichedMetadata: Map<String, Any>? = null
    ) : ContentDetailsUiState()
    data class Error(val message: String) : ContentDetailsUiState()
}
