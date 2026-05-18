package com.smartifly.tv.features.search

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartifly.tv.data.epg.EpgSearchDataSource
import com.smartifly.tv.data.remote.NetworkErrorMapper
import com.smartifly.tv.data.repository.SearchDataSource
import com.smartifly.tv.data.repository.SearchSuggestionsDataSource
import com.smartifly.tv.features.profiles.ContentRestrictionManager
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.CancellationException
import java.io.IOException
import retrofit2.HttpException

/**
 * Enterprise-grade ViewModel for Global Search.
 * 
 * Orchestrates cross-content discovery across VOD and Live TV.
 * Features debounced searching, professional error handling, 
 * and profile-based content filtering.
 */
class SearchViewModel(
    private val repository: SearchDataSource,
    private val analyticsRepository: SearchSuggestionsDataSource,
    private val epgSearchRepository: EpgSearchDataSource,
    private val activeProfile: com.smartifly.tv.data.models.UserProfile
) : ViewModel() {

    private val _uiState = MutableStateFlow<SearchUiState>(SearchUiState.Idle())
    val uiState: StateFlow<SearchUiState> = _uiState.asStateFlow()

    init {
        loadSuggestions()
    }

    private fun loadSuggestions() {
        viewModelScope.launch {
            val suggestions = analyticsRepository.getSearchSuggestions()
            if (_uiState.value is SearchUiState.Idle) {
                _uiState.value = SearchUiState.Idle(suggestions)
            }
        }
    }

    private var searchJob: Job? = null

    /**
     * Triggered when the user updates the search query.
     * Implements professional debouncing to reduce API/CPU load.
     */
    fun onQueryChanged(query: String) {
        if (query.length < 2) {
            loadSuggestions()
            return
        }

        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            _uiState.value = SearchUiState.Loading
            delay(500) // Professional debounce
            
            try {
                // 1. Fetch Global VOD Results
                val allResults = repository.search(query)
                
                // 2. Apply Profile Restrictions
                val filteredResults = ContentRestrictionManager.filterMovies(activeProfile, allResults)
                
                // 3. Fetch EPG Results
                val programs = epgSearchRepository.searchPrograms(query)
                
                if (filteredResults.isEmpty() && programs.isEmpty()) {
                    _uiState.value = SearchUiState.Empty
                } else {
                    _uiState.value = SearchUiState.Success(
                        results = filteredResults,
                        epgPrograms = programs
                    )
                }
            } catch (e: CancellationException) {
                throw e
            } catch (e: IOException) {
                _uiState.value = SearchUiState.Error(NetworkErrorMapper.toUserMessage(e))
            } catch (e: HttpException) {
                _uiState.value = SearchUiState.Error(NetworkErrorMapper.toUserMessage(e))
            } catch (e: RuntimeException) {
                _uiState.value = SearchUiState.Error(NetworkErrorMapper.toUserMessage(e))
            }
        }
    }

    override fun onCleared() {
        super.onCleared()
        repository.clearCache()
    }
}
