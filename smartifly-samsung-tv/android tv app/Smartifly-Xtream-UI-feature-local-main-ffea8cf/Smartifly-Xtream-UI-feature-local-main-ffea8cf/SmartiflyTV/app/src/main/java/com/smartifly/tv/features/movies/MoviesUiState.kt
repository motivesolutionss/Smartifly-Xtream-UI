package com.smartifly.tv.features.movies

import com.smartifly.tv.data.models.MovieMetadata
import com.smartifly.tv.ui.components.base.SideRailCategoryItem

sealed class MoviesUiState {
    object Loading : MoviesUiState()
    data class Success(
        val categories: List<SideRailCategoryItem>,
        val selectedCategoryId: String,
        val movies: List<MovieMetadata>
    ) : MoviesUiState()
    data class EmptyCategory(
        val categories: List<SideRailCategoryItem>,
        val selectedCategoryId: String,
        val message: String = "No movies found in this category."
    ) : MoviesUiState()
    object EmptyProvider : MoviesUiState()
    data class Error(val message: String) : MoviesUiState()
}
