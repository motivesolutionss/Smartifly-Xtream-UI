package com.smartifly.tv.features.search

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartifly.tv.data.remote.NetworkErrorMapper
import com.smartifly.tv.data.repository.SearchRepository
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class SearchViewModel(
    private val repository: com.smartifly.tv.data.repository.SearchRepository,
    private val epgSearchRepository: com.smartifly.tv.data.epg.EpgSearchRepository,
    private val activeProfile: com.smartifly.tv.data.models.UserProfile,
    private val searchProgramsProvider: (suspend (String) -> List<com.smartifly.tv.features.live.epg.EpgProgram>)? = null
) : ViewModel() {

    private val _uiState = MutableStateFlow<SearchUiState>(SearchUiState.Idle)
    val uiState: StateFlow<SearchUiState> = _uiState

    private var searchJob: Job? = null

    fun onQueryChanged(query: String) {
        if (query.length < 2) {
            _uiState.value = SearchUiState.Idle
            return
        }

        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            _uiState.value = SearchUiState.Loading
            delay(500) // Debounce
            try {
                val allResults = repository.search(query)
                val results = com.smartifly.tv.features.profiles.ContentRestrictionManager.filterMovies(activeProfile, allResults)
                
                // Fetch EPG results
                val programs = if (searchProgramsProvider != null) {
                    searchProgramsProvider.invoke(query)
                } else {
                    epgSearchRepository.searchPrograms(query)
                }
                
                if (results.isEmpty() && programs.isEmpty()) {
                    _uiState.value = SearchUiState.Empty
                } else {
                    _uiState.value = SearchUiState.Success(
                        results = results,
                        epgPrograms = programs // We'll add this to UiState
                    )
                }
            } catch (e: Exception) {
                _uiState.value = SearchUiState.Error(NetworkErrorMapper.toUserMessage(e))
            }
        }
    }
}
