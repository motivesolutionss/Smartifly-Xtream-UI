package com.smartifly.tv.features.watchlist

import com.smartifly.tv.data.models.MovieMetadata

sealed class WatchlistUiState {
    object Loading : WatchlistUiState()
    data class Success(val items: List<MovieMetadata>) : WatchlistUiState()
    object Empty : WatchlistUiState()
    data class Error(val message: String) : WatchlistUiState()
}
