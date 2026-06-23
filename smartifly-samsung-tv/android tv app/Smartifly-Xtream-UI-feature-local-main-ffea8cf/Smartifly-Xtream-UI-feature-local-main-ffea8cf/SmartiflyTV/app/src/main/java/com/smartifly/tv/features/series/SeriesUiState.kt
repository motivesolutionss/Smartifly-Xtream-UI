package com.smartifly.tv.features.series

import com.smartifly.tv.data.models.MovieMetadata
import com.smartifly.tv.ui.components.base.SideRailCategoryItem

sealed class SeriesUiState {
    object Loading : SeriesUiState()
    data class Success(
        val categories: List<SideRailCategoryItem>,
        val selectedCategoryId: String,
        val series: List<MovieMetadata>
    ) : SeriesUiState()
    data class EmptyCategory(
        val categories: List<SideRailCategoryItem>,
        val selectedCategoryId: String,
        val message: String = "No series found in this category."
    ) : SeriesUiState()
    object EmptyProvider : SeriesUiState()
    data class Error(val message: String) : SeriesUiState()
}
