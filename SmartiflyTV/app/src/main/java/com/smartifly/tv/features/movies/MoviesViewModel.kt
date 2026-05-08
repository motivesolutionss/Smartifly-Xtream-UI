package com.smartifly.tv.features.movies

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartifly.tv.data.remote.NetworkErrorMapper
import com.smartifly.tv.data.repository.ContentRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class MoviesViewModel(
    private val repository: com.smartifly.tv.data.repository.ContentRepository,
    private val activeProfile: com.smartifly.tv.data.models.UserProfile
) : ViewModel() {

    private val _uiState = MutableStateFlow<MoviesUiState>(MoviesUiState.Loading)
    val uiState: StateFlow<MoviesUiState> = _uiState

    private var allCategories = listOf("All", "Action", "Comedy", "Drama", "Thriller", "Sci-Fi")

    init {
        loadMovies()
    }

    fun loadMovies(category: String? = null) {
        viewModelScope.launch {
            _uiState.value = MoviesUiState.Loading
            try {
                val allMovies = repository.getMovies(if (category == "All") null else category)
                val movies = com.smartifly.tv.features.profiles.ContentRestrictionManager.filterMovies(activeProfile, allMovies)
                
                if (movies.isEmpty()) {
                    _uiState.value = MoviesUiState.Empty
                } else {
                    _uiState.value = MoviesUiState.Success(
                        categories = allCategories,
                        movies = movies
                    )
                }
            } catch (e: Exception) {
                _uiState.value = MoviesUiState.Error(NetworkErrorMapper.toUserMessage(e))
            }
        }
    }
}
