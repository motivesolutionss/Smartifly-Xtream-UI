package com.smartifly.tv.features.watchlist

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartifly.tv.data.repository.WatchlistRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

class WatchlistViewModel(
    private val repository: WatchlistRepository,
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
            repository.getWatchlist(profileId).collectLatest { items ->
                if (items.isEmpty()) {
                    _uiState.value = WatchlistUiState.Empty
                } else {
                    _uiState.value = WatchlistUiState.Success(items)
                }
            }
        }
    }
}
