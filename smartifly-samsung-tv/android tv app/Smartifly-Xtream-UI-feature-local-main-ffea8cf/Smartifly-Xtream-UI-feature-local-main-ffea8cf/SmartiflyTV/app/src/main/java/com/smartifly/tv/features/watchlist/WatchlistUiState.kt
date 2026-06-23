package com.smartifly.tv.features.watchlist

import com.smartifly.tv.data.WatchProgress
import com.smartifly.tv.data.models.LiveStream
import com.smartifly.tv.data.models.MovieMetadata

sealed class WatchlistUiState {
    object Loading : WatchlistUiState()
    data class Success(
        val continueWatching: List<WatchProgress>,
        val watchlistItems: List<MovieMetadata>,
        val favoriteChannels: List<LiveStream>
    ) : WatchlistUiState()
    object Empty : WatchlistUiState()
    data class Error(val message: String) : WatchlistUiState()
}
