package com.smartifly.tv.features.movies

import com.smartifly.tv.data.models.MovieMetadata

sealed class MoviesUiState {
    object Loading : MoviesUiState()
    data class Success(
        val categories: List<String>,
        val selectedCategory: String,
        val movies: List<MovieMetadata>
    ) : MoviesUiState()
    data class Error(val message: String) : MoviesUiState()
    object Empty : MoviesUiState()
}
