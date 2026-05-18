package com.smartifly.tv.features.series

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartifly.tv.data.mapper.toDomain
import com.smartifly.tv.data.models.MovieMetadata
import com.smartifly.tv.data.models.MediaCategory
import com.smartifly.tv.data.remote.NetworkResult
import com.smartifly.tv.data.repository.XtreamRepository
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import com.smartifly.tv.BuildConfig

/**
 * Enterprise-grade ViewModel for the Series Screen.
 * 
 * Handles category-based discovery and series listing with reactive states.
 */
class SeriesViewModel(
    private val repository: XtreamRepository
) : ViewModel() {
    private companion object {
        const val ALL_CACHE_KEY = "__ALL__"
    }

    private val _uiState = MutableStateFlow<SeriesUiState>(SeriesUiState.Loading)
    val uiState: StateFlow<SeriesUiState> = _uiState.asStateFlow()

    private var cachedCategories = emptyList<MediaCategory>()
    private var categoryNameToId = emptyMap<String, String>()
    private var selectedCategoryId: String? = null
    private var selectedCategoryName: String = "All"
    private var categoriesJob: Job? = null
    private var streamsJob: Job? = null
    private var prefetchJob: Job? = null
    private var requestSequence: Long = 0L
    private val cacheByCategoryKey = mutableMapOf<String, List<MovieMetadata>>()
    private var cachePortalKey: String? = null

    init {
        loadInitialData()
    }

    private fun loadInitialData() {
        categoriesJob?.cancel()
        categoriesJob = viewModelScope.launch {
            ensurePortalScopedCache()
            _uiState.value = SeriesUiState.Loading
            when (val result = repository.getSeriesCategoriesCached().first { it !is NetworkResult.Loading }) {
                is NetworkResult.Success -> {
                    cachedCategories = result.data
                    categoryNameToId = cachedCategories.associate { it.name to it.id }
                    if (cachedCategories.isNotEmpty()) {
                        loadSeriesByCategory(null)
                    } else {
                        _uiState.value = SeriesUiState.Empty
                    }
                }
                is NetworkResult.Error -> _uiState.value = SeriesUiState.Error(result.message)
                is NetworkResult.Loading -> Unit
            }
        }
    }

    /**
     * Loads series for a specific category ID.
     */
    fun loadSeriesByCategory(categoryOrId: String?) {
        streamsJob?.cancel()
        streamsJob = viewModelScope.launch {
            ensurePortalScopedCache()
            if (categoryOrId == null) {
                loadAllSeries()
                return@launch
            }

            val currentIndex = when {
                else -> cachedCategories.indexOfFirst { it.name == categoryOrId || it.id == categoryOrId }
            }

            val resolvedCategoryId = when {
                categoryNameToId.containsKey(categoryOrId) -> categoryNameToId[categoryOrId]
                else -> categoryOrId
            } ?: return@launch

            val categoryCacheKey = resolvedCategoryId
            val cached = cacheByCategoryKey[categoryCacheKey]
            if (!cached.isNullOrEmpty()) {
                selectedCategoryId = resolvedCategoryId
                selectedCategoryName = categoryOrId
                _uiState.value = SeriesUiState.Success(
                    categories = listOf("All") + cachedCategories.map { it.name },
                    selectedCategory = selectedCategoryName,
                    series = cached
                )
                return@launch
            }

            if (selectedCategoryId == resolvedCategoryId && _uiState.value is SeriesUiState.Success) return@launch
            selectedCategoryId = resolvedCategoryId
            selectedCategoryName = categoryOrId
            val requestId = ++requestSequence
 
            when (val result = repository.getSeriesCached(resolvedCategoryId).first { it !is NetworkResult.Loading }) {
                is NetworkResult.Success -> {
                    if (requestId != requestSequence) return@launch
                    if (result.data.isEmpty()) {
                        _uiState.value = SeriesUiState.Empty
                    } else {
                        val audited = auditAndDedupeSeries(
                            scope = "category",
                            key = categoryCacheKey,
                            raw = result.data
                        )
                        cacheByCategoryKey[categoryCacheKey] = audited
                        _uiState.value = SeriesUiState.Success(
                            categories = listOf("All") + cachedCategories.map { it.name },
                            selectedCategory = selectedCategoryName,
                            series = audited
                        )
                        prefetchNextCategories(currentIndex)
                    }
                }
                is NetworkResult.Error -> {
                    if (requestId != requestSequence) return@launch
                    _uiState.value = SeriesUiState.Error(result.message)
                }
                is NetworkResult.Loading -> Unit
            }
        }
    }

    private suspend fun loadAllSeries() {
        val cachedAll = cacheByCategoryKey[ALL_CACHE_KEY]
        if (!cachedAll.isNullOrEmpty()) {
            selectedCategoryId = null
            selectedCategoryName = "All"
            _uiState.value = SeriesUiState.Success(
                categories = listOf("All") + cachedCategories.map { it.name },
                selectedCategory = selectedCategoryName,
                series = cachedAll
            )
            return
        }
        if (selectedCategoryId == null && _uiState.value is SeriesUiState.Success) return
        selectedCategoryId = null
        selectedCategoryName = "All"
        val requestId = ++requestSequence

        when (val result = repository.getSeries(categoryId = null).first { it !is NetworkResult.Loading }) {
            is NetworkResult.Success -> {
                if (requestId != requestSequence) return
                val mapped = result.data.map { it.toDomain() }
                val allSeries = auditAndDedupeSeries(
                    scope = "all",
                    key = ALL_CACHE_KEY,
                    raw = mapped
                )
                if (allSeries.isEmpty()) {
                    _uiState.value = SeriesUiState.Empty
                } else {
                    cacheByCategoryKey[ALL_CACHE_KEY] = allSeries
                    _uiState.value = SeriesUiState.Success(
                        categories = listOf("All") + cachedCategories.map { it.name },
                        selectedCategory = selectedCategoryName,
                        series = allSeries
                    )
                }
            }
            is NetworkResult.Error -> {
                if (requestId != requestSequence) return
                _uiState.value = SeriesUiState.Error(result.message)
            }
            is NetworkResult.Loading -> Unit
        }
    }

    private fun prefetchNextCategories(currentIndex: Int) {
        prefetchJob?.cancel()
        prefetchJob = viewModelScope.launch(kotlinx.coroutines.Dispatchers.IO) {
            for (i in 1..2) {
                val nextIndex = currentIndex + i
                if (nextIndex < cachedCategories.size) {
                    val nextCategory = cachedCategories[nextIndex]
                    android.util.Log.d("SmartiflySpeed", "Pre-fetching series category: ${nextCategory.name}")
                    repository.getSeriesCached(nextCategory.id).first { it !is NetworkResult.Loading }
                }
            }
        }
    }

    fun disposeForScreenExit() {
        categoriesJob?.cancel()
        streamsJob?.cancel()
        prefetchJob?.cancel()
    }

    private suspend fun ensurePortalScopedCache() {
        val currentPortalKey = runCatching { repository.getPortalCapabilityKey() }.getOrNull() ?: return
        if (cachePortalKey != currentPortalKey) {
            cacheByCategoryKey.clear()
            selectedCategoryId = null
            selectedCategoryName = "All"
            cachePortalKey = currentPortalKey
        }
    }

    private fun auditAndDedupeSeries(
        scope: String,
        key: String,
        raw: List<MovieMetadata>
    ): List<MovieMetadata> {
        if (raw.isEmpty()) return raw
        val groupedById = raw.groupBy { "${it.type}|${it.id}" }
        val duplicatesById = groupedById.filterValues { it.size > 1 }

        if (BuildConfig.LIVE_DEBUG_TRACE && duplicatesById.isNotEmpty()) {
            val sample = duplicatesById.entries.take(12).joinToString(" || ") { (k, items) ->
                val urls = items.joinToString(" ; ") { m ->
                    "title=${m.title.take(32)} poster=${m.posterUrl.take(90)} backdrop=${m.backdropUrl.take(90)}"
                }
                "$k x${items.size} => $urls"
            }
            android.util.Log.w(
                "SmartiflyAudit",
                "duplicate_series_by_id scope=$scope key=$key duplicate_groups=${duplicatesById.size} total_raw=${raw.size} sample=$sample"
            )
        }

        val canonicalGroups = raw.groupBy { canonicalSeriesKey(it) }
        val canonicalDuplicates = canonicalGroups.filterValues { it.size > 1 }
        if (BuildConfig.LIVE_DEBUG_TRACE && canonicalDuplicates.isNotEmpty()) {
            val sample = canonicalDuplicates.entries.take(16).joinToString(" || ") { (k, items) ->
                val ids = items.joinToString(",") { it.id }
                "$k -> ids=[$ids]"
            }
            android.util.Log.w(
                "SmartiflyAudit",
                "duplicate_series_canonical scope=$scope key=$key groups=${canonicalDuplicates.size} sample=$sample"
            )
        }

        val deduped = canonicalGroups.values.map { variants ->
            variants.maxByOrNull { scoreSeriesCandidate(it) } ?: variants.first()
        }

        if (BuildConfig.LIVE_DEBUG_TRACE && deduped.size != raw.size) {
            android.util.Log.d(
                "SmartiflyAudit",
                "dedupe_series scope=$scope key=$key raw=${raw.size} deduped=${deduped.size} removed=${raw.size - deduped.size}"
            )
        }
        return deduped
    }

    private fun scoreSeriesCandidate(item: MovieMetadata): Int {
        var score = 0
        val poster = item.posterUrl.lowercase()
        val backdrop = item.backdropUrl.lowercase()
        if (item.posterUrl.isNotBlank()) score += 3
        if (item.backdropUrl.isNotBlank()) score += 2
        if (poster.startsWith("https://")) score += 3
        if (backdrop.startsWith("https://")) score += 2
        if (poster.contains("image.tmdb.org")) score += 4
        if (backdrop.contains("image.tmdb.org")) score += 3
        if (poster.contains("/images/")) score -= 1
        if (item.title.isNotBlank()) score += 1
        if (item.year.isNotBlank()) score += 1
        return score
    }

    private fun canonicalSeriesKey(item: MovieMetadata): String {
        val lowered = item.title.lowercase().trim()
        val language = detectLanguageTag(lowered)
        val titleNoBrackets = lowered
            .replace(Regex("\\(\\d{4}\\)"), "")
            .replace(Regex("\\((telugu|hindi|tamil|malayalam|kannada|dubbed|multi language|multilanguage)\\)"), "")
            .replace(Regex("[^a-z0-9 ]"), " ")
            .replace(Regex("\\s+"), " ")
            .trim()
        return "${item.type}|$titleNoBrackets|$language"
    }

    private fun detectLanguageTag(title: String): String {
        return when {
            "telugu" in title -> "telugu"
            "hindi" in title -> "hindi"
            "tamil" in title -> "tamil"
            "malayalam" in title -> "malayalam"
            "kannada" in title -> "kannada"
            "dubbed" in title -> "dubbed"
            else -> "default"
        }
    }
}
