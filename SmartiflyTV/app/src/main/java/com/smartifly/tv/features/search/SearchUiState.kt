package com.smartifly.tv.features.search

import com.smartifly.tv.data.models.MovieMetadata

sealed class SearchUiState {
    object Idle : SearchUiState()
    object Loading : SearchUiState()
    data class Success(
        val results: List<MovieMetadata>,
        val epgPrograms: List<com.smartifly.tv.features.live.epg.EpgProgram> = emptyList()
    ) : SearchUiState()
    data class Error(val message: String) : SearchUiState()
    object Empty : SearchUiState()
}
