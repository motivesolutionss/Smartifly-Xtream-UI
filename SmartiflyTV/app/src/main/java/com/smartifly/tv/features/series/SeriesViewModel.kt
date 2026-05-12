package com.smartifly.tv.features.series

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartifly.tv.data.models.MovieMetadata
import com.smartifly.tv.data.models.MediaCategory
import com.smartifly.tv.data.remote.NetworkResult
import com.smartifly.tv.data.repository.XtreamRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * Enterprise-grade ViewModel for the Series Screen.
 * 
 * Handles category-based discovery and series listing with reactive states.
 */
class SeriesViewModel(
    private val repository: XtreamRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<SeriesUiState>(SeriesUiState.Loading)
    val uiState: StateFlow<SeriesUiState> = _uiState.asStateFlow()

    private var cachedCategories = emptyList<MediaCategory>()
    private var categoryNameToId = emptyMap<String, String>()

    init {
        loadInitialData()
    }

    private fun loadInitialData() {
        viewModelScope.launch {
            _uiState.value = SeriesUiState.Loading
            
            // 1. Load Categories
            repository.getSeriesCategoriesCached().collect { result ->
                when (result) {
                    is NetworkResult.Success -> {
                        cachedCategories = result.data
                        categoryNameToId = cachedCategories.associate { it.name to it.id }
                        
                        // 2. Load "All" Series initially
                        if (cachedCategories.isNotEmpty()) {
                            loadSeriesByCategory(null)
                            // 3. Pre-fetch next categories
                            prefetchNextCategories(0)
                        } else {
                            _uiState.value = SeriesUiState.Empty
                        }
                    }
                    is NetworkResult.Error -> {
                        _uiState.value = SeriesUiState.Error(result.message)
                    }
                    is NetworkResult.Loading -> { }
                }
            }
        }
    }

    /**
     * Loads series for a specific category ID.
     */
    fun loadSeriesByCategory(categoryOrId: String?) {
        viewModelScope.launch {
            val currentIndex = when {
                categoryOrId == null -> 0
                else -> cachedCategories.indexOfFirst { it.name == categoryOrId || it.id == categoryOrId }
            }

            val resolvedCategoryId = when {
                categoryOrId == null -> cachedCategories.firstOrNull()?.id
                categoryNameToId.containsKey(categoryOrId) -> categoryNameToId[categoryOrId]
                else -> categoryOrId
            } ?: return@launch
 
            repository.getSeriesCached(resolvedCategoryId).collect { result ->
                when (result) {
                    is NetworkResult.Success -> {
                        if (result.data.isEmpty()) {
                            _uiState.value = SeriesUiState.Empty
                        } else {
                            _uiState.value = SeriesUiState.Success(
                                categories = listOf("All") + cachedCategories.map { it.name },
                                series = result.data
                            )
                            // Enterprise optimization: pre-fetch next categories
                            prefetchNextCategories(currentIndex)
                        }
                    }
                    is NetworkResult.Error -> {
                        _uiState.value = SeriesUiState.Error(result.message)
                    }
                    is NetworkResult.Loading -> { }
                }
            }
        }
    }

    private fun prefetchNextCategories(currentIndex: Int) {
        viewModelScope.launch(kotlinx.coroutines.Dispatchers.IO) {
            for (i in 1..2) {
                val nextIndex = currentIndex + i
                if (nextIndex < cachedCategories.size) {
                    val nextCategory = cachedCategories[nextIndex]
                    android.util.Log.d("SmartiflySpeed", "Pre-fetching series category: ${nextCategory.name}")
                    repository.getSeriesCached(nextCategory.id).collect { /* background fetch */ }
                }
            }
        }
    }
}
