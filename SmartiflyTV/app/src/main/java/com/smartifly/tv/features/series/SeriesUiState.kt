package com.smartifly.tv.features.series

import com.smartifly.tv.data.models.MovieMetadata

sealed class SeriesUiState {
    object Loading : SeriesUiState()
    data class Success(
        val categories: List<String>,
        val selectedCategory: String,
        val series: List<MovieMetadata>
    ) : SeriesUiState()
    data class Error(val message: String) : SeriesUiState()
    object Empty : SeriesUiState()
}
