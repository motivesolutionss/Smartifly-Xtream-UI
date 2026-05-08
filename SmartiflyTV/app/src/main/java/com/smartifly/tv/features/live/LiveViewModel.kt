package com.smartifly.tv.features.live

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartifly.tv.data.remote.NetworkErrorMapper
import com.smartifly.tv.data.repository.LiveTvRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class LiveViewModel(private val repository: LiveTvRepository) : ViewModel() {

    private val _uiState = MutableStateFlow<LiveUiState>(LiveUiState.Loading)
    val uiState: StateFlow<LiveUiState> = _uiState

    init {
        loadInitialData()
    }

    private fun loadInitialData() {
        viewModelScope.launch {
            _uiState.value = LiveUiState.Loading
            try {
                val categories = repository.getCategories()
                val channels = if (categories.isNotEmpty()) {
                    repository.getChannels(categories.first().id)
                } else emptyList()
                
                if (categories.isEmpty() && channels.isEmpty()) {
                    _uiState.value = LiveUiState.Empty
                } else {
                    _uiState.value = LiveUiState.Success(categories, channels)
                }
            } catch (e: Exception) {
                _uiState.value = LiveUiState.Error(NetworkErrorMapper.toUserMessage(e))
            }
        }
    }

    fun loadChannelsByCategory(categoryId: String) {
        viewModelScope.launch {
            val currentState = _uiState.value
            if (currentState is LiveUiState.Success) {
                try {
                    val channels = repository.getChannels(categoryId)
                    _uiState.value = currentState.copy(channels = channels)
                } catch (e: Exception) {
                    // Log error but keep existing categories
                }
            }
        }
    }
}
