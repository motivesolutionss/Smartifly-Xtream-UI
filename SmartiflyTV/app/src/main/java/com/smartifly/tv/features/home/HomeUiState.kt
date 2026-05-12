package com.smartifly.tv.features.home

import com.smartifly.tv.data.models.MovieMetadata

sealed class HomeUiState {
    object Loading : HomeUiState()
    data class Success(
        val heroMovie: MovieMetadata? = null,
        val sections: List<HomeSection>
    ) : HomeUiState()
    data class Error(val message: String) : HomeUiState()
    object Empty : HomeUiState()
}

data class HomeSection(
    val title: String,
    val items: List<MovieMetadata>,
    val progressList: List<Float>? = null // Added
)
