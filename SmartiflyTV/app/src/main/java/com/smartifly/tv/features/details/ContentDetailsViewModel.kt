package com.smartifly.tv.features.details

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartifly.tv.data.mapper.toDomain
import com.smartifly.tv.data.remote.NetworkResult
import com.smartifly.tv.data.repository.XtreamRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.launch

/**
 * Enterprise-grade ViewModel for Content Details.
 * 
 * Orchestrates rich metadata discovery for Movies and Series.
 * Features type-safe loading and professional state management.
 */
class ContentDetailsViewModel(
    private val repository: XtreamRepository,
    private val contentId: String,
    private val contentType: String, // "movie" or "series"
    private val categoryId: String? = null
) : ViewModel() {
    private fun Any?.asStringAnyMapOrNull(): Map<String, Any>? {
        val raw = this as? Map<*, *> ?: return null
        return raw.entries.mapNotNull { (k, v) ->
            val key = k as? String ?: return@mapNotNull null
            val value = v ?: return@mapNotNull null
            key to value
        }.toMap()
    }

    private val _uiState = MutableStateFlow<ContentDetailsUiState>(ContentDetailsUiState.Loading)
    val uiState: StateFlow<ContentDetailsUiState> = _uiState.asStateFlow()

    init {
        loadDetails()
    }

    /**
     * Fetches detailed information based on content type.
     */
    fun loadDetails() {
        viewModelScope.launch {
            _uiState.value = ContentDetailsUiState.Loading
            
            val id = contentId.toIntOrNull() ?: return@launch
            
            val result = if (contentType == "series") {
                repository.getSeriesInfo(id)
            } else {
                repository.getMovieInfo(id)
            }

            when (result) {
                is NetworkResult.Success -> {
                    val domainDetails = if (contentType == "series") {
                        (result.data as com.smartifly.tv.data.remote.models.XtreamSeriesInfo).toDomain()
                    } else {
                        (result.data as com.smartifly.tv.data.remote.models.XtreamMovieInfo).toDomain()
                    }
                    
                    // Trigger similar content fetch
                    val similar = fetchSimilarContent(categoryId)
                    
                    // Fetch TMDB Enrichment
                    val enriched = try {
                        val response = com.smartifly.tv.data.remote.ApiClient.api.fetchEnrichedMetadata(
                            id = contentId,
                            title = domainDetails.title,
                            type = contentType
                        )
                        if (response["success"] == true) response["data"].asStringAnyMapOrNull() else null
                    } catch (e: Exception) { null }
                    
                    _uiState.value = ContentDetailsUiState.Success(domainDetails, similar, enriched)
                }
                is NetworkResult.Error -> {
                    _uiState.value = ContentDetailsUiState.Error(result.message)
                }
                is NetworkResult.Loading -> {
                    _uiState.value = ContentDetailsUiState.Loading
                }
            }
        }
    }

    private suspend fun fetchSimilarContent(catId: String?): List<com.smartifly.tv.data.models.MovieMetadata> {
        if (catId.isNullOrEmpty()) return emptyList()
        
        val result = if (contentType == "series") {
            repository.getSeries(catId).firstOrNull()
        } else {
            repository.getMovies(catId).firstOrNull()
        }

        return if (result is NetworkResult.Success<*>) {
            val items = if (contentType == "series") {
                @Suppress("UNCHECKED_CAST")
                (result.data as List<com.smartifly.tv.data.remote.models.XtreamSeries>).map { it.toDomain() }
            } else {
                @Suppress("UNCHECKED_CAST")
                (result.data as List<com.smartifly.tv.data.remote.models.XtreamMovie>).map { it.toDomain() }
            }
            // Filter out current content and take 10
            items.filter { it.id != contentId }.take(10)
        } else {
            emptyList()
        }
    }
}
