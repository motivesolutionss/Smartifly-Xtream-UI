package com.smartifly.tv.features.search

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartifly.tv.data.epg.EpgSearchDataSource
import com.smartifly.tv.data.repository.AndroidSearchLogger
import com.smartifly.tv.data.remote.NetworkErrorMapper
import com.smartifly.tv.data.repository.SearchDataSource
import com.smartifly.tv.data.repository.SearchLogger
import com.smartifly.tv.data.repository.SearchSuggestionsDataSource
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.delay
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.withTimeoutOrNull
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
    private val activeProfile: com.smartifly.tv.data.models.UserProfile,
    private val logger: SearchLogger = AndroidSearchLogger
) : ViewModel() {
    private companion object {
        private const val SEARCH_DATA_TAG = "SmartiflySearchData"
        private const val SEARCH_PERF_TAG = "SmartiflySearchPerf"
    }

    private val _uiState = MutableStateFlow<SearchUiState>(SearchUiState.Idle())
    val uiState: StateFlow<SearchUiState> = _uiState.asStateFlow()
    private var currentQuery: String = ""
    private var warmupJob: Job? = null

    init {
        loadSuggestions()
        warmSearchCatalogInBackground()
    }

    private fun loadSuggestions() {
        viewModelScope.launch {
            val suggestions = analyticsRepository.getSearchSuggestions()
            val discoveryRows = repository.getIdleDiscoveryRows()
            logger.i(
                SEARCH_DATA_TAG,
                "search_idle_loaded profile=${activeProfile.id} suggestions=${suggestions.size} discovery_rows=${discoveryRows.size}"
            )
            if (_uiState.value is SearchUiState.Idle) {
                _uiState.value = SearchUiState.Idle(
                    suggestions = suggestions,
                    discoveryRows = discoveryRows
                )
            }
        }
    }

    private fun warmSearchCatalogInBackground() {
        if (warmupJob?.isActive == true) return
        warmupJob = viewModelScope.launch {
            logger.i(SEARCH_PERF_TAG, "search_warmup_enqueued profile=${activeProfile.id}")
            runCatching { repository.warmSearchCatalog() }
                .onSuccess {
                    logger.i(SEARCH_PERF_TAG, "search_warmup_ready profile=${activeProfile.id}")
                    if (currentQuery.length >= 2) {
                        runSearch(currentQuery, showLoading = false)
                    }
                }
                .onFailure {
                    logger.i(
                        SEARCH_PERF_TAG,
                        "search_warmup_failed profile=${activeProfile.id} reason=${it.message ?: "unknown"}"
                    )
                }
        }
    }

    private var searchJob: Job? = null

    /**
     * Triggered when the user updates the search query.
     * Implements professional debouncing to reduce API/CPU load.
     */
    fun onQueryChanged(query: String) {
        currentQuery = query
        logger.i(
            SEARCH_DATA_TAG,
            "search_query_changed profile=${activeProfile.id} query=${query.trim()} length=${query.length}"
        )
        if (query.length < 2) {
            logger.i(SEARCH_DATA_TAG, "search_query_short_circuit profile=${activeProfile.id} length=${query.length}")
            loadSuggestions()
            return
        }

        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            delay(300)
            logger.i(SEARCH_PERF_TAG, "search_debounce_fire profile=${activeProfile.id} query=${query.trim()}")
            runSearch(query, showLoading = true)
        }
    }

    private suspend fun runSearch(query: String, showLoading: Boolean) {
        val startedAtMs = System.currentTimeMillis()
        try {
            if (showLoading) {
                _uiState.value = SearchUiState.Loading
            }
            logger.i(
                SEARCH_PERF_TAG,
                "search_request_started profile=${activeProfile.id} query=${query.trim()} show_loading=$showLoading"
            )

            var allResults: List<com.smartifly.tv.data.models.MovieMetadata>
            var programs: List<com.smartifly.tv.features.live.epg.EpgProgram>

            coroutineScope {
                val resultsDeferred = async(Dispatchers.IO) { repository.search(query) }
                val epgDeferred = async(Dispatchers.IO) { epgSearchRepository.searchPrograms(query) }
                allResults = resultsDeferred.await()
                programs = epgDeferred.await()
            }
            logger.i(
                SEARCH_DATA_TAG,
                "search_initial_results profile=${activeProfile.id} query=${query.trim()} content_results=${allResults.size} epg_results=${programs.size}"
            )

            if (allResults.isEmpty() && programs.isEmpty()) {
                warmSearchCatalogInBackground()
                logger.i(SEARCH_PERF_TAG, "search_waiting_for_warmup profile=${activeProfile.id} query=${query.trim()}")
                withTimeoutOrNull(1_500L) { warmupJob?.join() }
                if (query == currentQuery) {
                    coroutineScope {
                        val resultsDeferred = async(Dispatchers.IO) { repository.search(query) }
                        val epgDeferred = async(Dispatchers.IO) { epgSearchRepository.searchPrograms(query) }
                        allResults = resultsDeferred.await()
                        programs = epgDeferred.await()
                    }
                    logger.i(
                        SEARCH_DATA_TAG,
                        "search_retry_results profile=${activeProfile.id} query=${query.trim()} content_results=${allResults.size} epg_results=${programs.size}"
                    )
                }
            }

            if (query != currentQuery) return

            if (allResults.isEmpty() && programs.isEmpty()) {
                _uiState.value = SearchUiState.Empty
                logger.i(
                    SEARCH_PERF_TAG,
                    "search_request_empty profile=${activeProfile.id} query=${query.trim()} duration_ms=${System.currentTimeMillis() - startedAtMs}"
                )
            } else {
                _uiState.value = SearchUiState.Success(
                    results = allResults,
                    epgPrograms = programs
                )
                logger.i(
                    SEARCH_PERF_TAG,
                    "search_request_success profile=${activeProfile.id} query=${query.trim()} content_results=${allResults.size} epg_results=${programs.size} duration_ms=${System.currentTimeMillis() - startedAtMs}"
                )
            }
        } catch (e: CancellationException) {
            logger.i(SEARCH_PERF_TAG, "search_request_cancelled profile=${activeProfile.id} query=${query.trim()}")
            throw e
        } catch (e: IOException) {
            logger.i(
                SEARCH_PERF_TAG,
                "search_request_error profile=${activeProfile.id} query=${query.trim()} type=io message=${e.message ?: "unknown"}"
            )
            _uiState.value = SearchUiState.Error(NetworkErrorMapper.toUserMessage(e))
        } catch (e: HttpException) {
            logger.i(
                SEARCH_PERF_TAG,
                "search_request_error profile=${activeProfile.id} query=${query.trim()} type=http code=${e.code()}"
            )
            _uiState.value = SearchUiState.Error(NetworkErrorMapper.toUserMessage(e))
        } catch (e: RuntimeException) {
            logger.i(
                SEARCH_PERF_TAG,
                "search_request_error profile=${activeProfile.id} query=${query.trim()} type=runtime message=${e.message ?: "unknown"}"
            )
            _uiState.value = SearchUiState.Error(NetworkErrorMapper.toUserMessage(e))
        }
    }

    override fun onCleared() {
        super.onCleared()
        repository.clearCache()
    }
}
