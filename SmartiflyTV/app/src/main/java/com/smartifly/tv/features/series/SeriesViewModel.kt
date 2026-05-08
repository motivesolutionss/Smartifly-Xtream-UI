package com.smartifly.tv.features.series

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartifly.tv.data.remote.NetworkErrorMapper
import com.smartifly.tv.data.repository.ContentRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class SeriesViewModel(
    private val repository: com.smartifly.tv.data.repository.ContentRepository,
    private val activeProfile: com.smartifly.tv.data.models.UserProfile
) : ViewModel() {

    private val _uiState = MutableStateFlow<SeriesUiState>(SeriesUiState.Loading)
    val uiState: StateFlow<SeriesUiState> = _uiState

    private var allCategories = listOf("All", "Drama", "Crime", "Comedy", "Animation", "Documentary")

    init {
        loadSeries()
    }

    fun loadSeries(category: String? = null) {
        viewModelScope.launch {
            _uiState.value = SeriesUiState.Loading
            try {
                val allSeries = repository.getSeries(if (category == "All") null else category)
                val series = com.smartifly.tv.features.profiles.ContentRestrictionManager.filterMovies(activeProfile, allSeries)
                
                if (series.isEmpty()) {
                    _uiState.value = SeriesUiState.Empty
                } else {
                    _uiState.value = SeriesUiState.Success(
                        categories = allCategories,
                        series = series
                    )
                }
            } catch (e: Exception) {
                _uiState.value = SeriesUiState.Error(NetworkErrorMapper.toUserMessage(e))
            }
        }
    }
}
