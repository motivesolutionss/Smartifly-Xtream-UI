package com.smartifly.tv.features.movies

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartifly.tv.data.mapper.toDomain
import com.smartifly.tv.data.models.MovieMetadata
import com.smartifly.tv.data.models.MediaCategory
import com.smartifly.tv.data.remote.NetworkResult
import com.smartifly.tv.data.repository.XtreamRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * Enterprise-grade ViewModel for the Movies Screen.
 * 
 * Handles category-based discovery and movie listing with reactive states.
 */
class MoviesViewModel(
    private val repository: XtreamRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<MoviesUiState>(MoviesUiState.Loading)
    val uiState: StateFlow<MoviesUiState> = _uiState.asStateFlow()

    private var cachedCategories = emptyList<MediaCategory>()
    private var categoryNameToId = emptyMap<String, String>()

    init {
        loadInitialData()
    }

    private fun loadInitialData() {
        viewModelScope.launch {
            _uiState.value = MoviesUiState.Loading
            
            // 1. Load Categories from Cache/Network
            repository.getVodCategories().collect { result ->
                when (result) {
                    is NetworkResult.Success -> {
                        cachedCategories = result.data
                        categoryNameToId = cachedCategories.associate { it.name to it.id }
                        
                        // 2. Load "All" Movies initially
                        if (cachedCategories.isNotEmpty()) {
                            loadMoviesByCategory(null)
                            // 3. Kick off pre-fetching for next categories
                            prefetchNextCategories(0)
                        } else {
                            _uiState.value = MoviesUiState.Empty
                        }
                    }
                    is NetworkResult.Error -> {
                        _uiState.value = MoviesUiState.Error(result.message)
                    }
                    is NetworkResult.Loading -> { }
                }
            }
        }
    }

    /**
     * Loads movies for a specific category ID.
     */
    fun loadMoviesByCategory(categoryOrId: String?) {
        viewModelScope.launch {
            val currentIndex = when {
                categoryOrId == null -> 0
                else -> cachedCategories.indexOfFirst { it.name == categoryOrId || it.id == categoryOrId }
            }

            val targetId = when {
                categoryOrId == null -> cachedCategories.firstOrNull()?.id
                categoryNameToId.containsKey(categoryOrId) -> categoryNameToId[categoryOrId]
                else -> categoryOrId
            } ?: return@launch
            
            repository.getMoviesCached(targetId).collect { result ->
                when (result) {
                    is NetworkResult.Success -> {
                        if (result.data.isEmpty()) {
                            _uiState.value = MoviesUiState.Empty
                        } else {
                            _uiState.value = MoviesUiState.Success(
                                categories = listOf("All") + cachedCategories.map { it.name },
                                movies = result.data
                            )
                            // Enterprise optimization: pre-fetch next few categories
                            prefetchNextCategories(currentIndex)
                        }
                    }
                    is NetworkResult.Error -> {
                        _uiState.value = MoviesUiState.Error(result.message)
                    }
                    is NetworkResult.Loading -> { }
                }
            }
        }
    }

    private fun prefetchNextCategories(currentIndex: Int) {
        viewModelScope.launch(kotlinx.coroutines.Dispatchers.IO) {
            // Pre-fetch the next 2 categories to ensure instant scrolling
            for (i in 1..2) {
                val nextIndex = currentIndex + i
                if (nextIndex < cachedCategories.size) {
                    val nextCategory = cachedCategories[nextIndex]
                    android.util.Log.d("SmartiflySpeed", "Pre-fetching category: ${nextCategory.name}")
                    // repository.getMoviesCached triggers a sync if needed
                    repository.getMoviesCached(nextCategory.id).collect { /* just trigger fetch */ }
                }
            }
        }
    }
}
