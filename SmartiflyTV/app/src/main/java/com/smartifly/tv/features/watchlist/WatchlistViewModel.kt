package com.smartifly.tv.features.watchlist

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartifly.tv.data.ResumeWatchingDataSource
import com.smartifly.tv.data.remote.NetworkResult
import com.smartifly.tv.data.repository.LiveDataSource
import com.smartifly.tv.data.repository.WatchlistRepository
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

class WatchlistViewModel(
    private val repository: WatchlistRepository,
    private val resumeRepository: ResumeWatchingDataSource,
    private val liveRepository: LiveDataSource,
    private val profileId: String
) : ViewModel() {

    private val _uiState = MutableStateFlow<WatchlistUiState>(WatchlistUiState.Loading)
    val uiState: StateFlow<WatchlistUiState> = _uiState

    init {
        observeWatchlist()
    }

    private fun observeWatchlist() {
        viewModelScope.launch {
            _uiState.value = WatchlistUiState.Loading
            combine(
                repository.getWatchlist(profileId),
                resumeRepository.getAllWatchProgress(profileId),
                liveRepository.getLiveFavorites()
            ) { watchlistItems, continueWatching, favoriteResult ->
                val favoriteChannels = when (favoriteResult) {
                    is NetworkResult.Success -> favoriteResult.data
                    else -> emptyList()
                }
                Triple(watchlistItems, continueWatching, favoriteChannels)
            }.collectLatest { (watchlistItems, continueWatching, favoriteChannels) ->
                if (watchlistItems.isEmpty() && continueWatching.isEmpty() && favoriteChannels.isEmpty()) {
                    _uiState.value = WatchlistUiState.Empty
                } else {
                    _uiState.value = WatchlistUiState.Success(
                        continueWatching = continueWatching,
                        watchlistItems = watchlistItems,
                        favoriteChannels = favoriteChannels
                    )
                }
            }
        }
    }
}
