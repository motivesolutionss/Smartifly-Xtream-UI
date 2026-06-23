package com.smartifly.tv.features.series

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartifly.tv.data.models.MovieMetadata
import com.smartifly.tv.data.models.MediaCategory
import com.smartifly.tv.data.cache.CacheBudgetPolicy
import com.smartifly.tv.data.remote.NetworkResult
import com.smartifly.tv.data.repository.XtreamRepository
import com.smartifly.tv.ui.components.base.SideRailCategoryItem
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
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
        const val INITIAL_EMPTY_RETRY_COUNT = 2
        const val INITIAL_EMPTY_RETRY_DELAY_MS = 900L
    }

    private val _uiState = MutableStateFlow<SeriesUiState>(SeriesUiState.Loading)
    val uiState: StateFlow<SeriesUiState> = _uiState.asStateFlow()

    private var cachedCategories = emptyList<MediaCategory>()
    private var selectedCategoryId: String? = null
    private var categoriesJob: Job? = null
    private var streamsJob: Job? = null
    private var prefetchJob: Job? = null
    private var requestSequence: Long = 0L
    private var initialLoadStarted = false
    private val cacheByCategoryKey = object : LinkedHashMap<String, List<MovieMetadata>>(16, 0.75f, true) {
        override fun removeEldestEntry(eldest: MutableMap.MutableEntry<String, List<MovieMetadata>>): Boolean {
            return size > CacheBudgetPolicy.SERIES_MEMORY_MAX_BUCKETS
        }
    }
    private var cachePortalKey: String? = null

    fun ensureLoaded(force: Boolean = false) {
        if (initialLoadStarted && !force) return
        initialLoadStarted = true
        categoriesJob?.cancel()
        categoriesJob = viewModelScope.launch {
            ensurePortalScopedCache()
            _uiState.value = SeriesUiState.Loading
            when (val result = repository.getSeriesCategoriesCached().first { it !is NetworkResult.Loading }) {
                is NetworkResult.Success -> {
                    cachedCategories = result.data
                    if (cachedCategories.isNotEmpty()) {
                        loadInitialCategoryContent()
                    } else {
                        _uiState.value = SeriesUiState.EmptyProvider
                    }
                }
                is NetworkResult.Error -> _uiState.value = SeriesUiState.Error(result.message)
                is NetworkResult.Loading -> Unit
            }
        }
    }

    private suspend fun loadInitialCategoryContent() {
        val categories = cachedCategories
        if (categories.isEmpty()) {
            _uiState.value = SeriesUiState.EmptyProvider
            return
        }

        val categoryItems = categories.map { SideRailCategoryItem(id = it.id, title = it.name) }
        for ((index, category) in categories.withIndex()) {
            val result = awaitSeriesResult(category.id, retryCount = INITIAL_EMPTY_RETRY_COUNT)
            when (result) {
                is NetworkResult.Success -> {
                    if (result.data.isEmpty()) continue
                    val bounded = cacheSeriesForCategory(
                        categoryId = category.id,
                        currentIndex = index,
                        raw = result.data
                    )
                    selectedCategoryId = category.id
                    _uiState.value = SeriesUiState.Success(
                        categories = categoryItems,
                        selectedCategoryId = category.id,
                        series = bounded
                    )
                    return
                }
                is NetworkResult.Error -> continue
                is NetworkResult.Loading -> Unit
            }
        }

        selectedCategoryId = categories.first().id
        _uiState.value = SeriesUiState.EmptyProvider
    }

    /**
     * Loads series for a specific category ID.
     */
    fun loadSeriesByCategory(categoryId: String?) {
        streamsJob?.cancel()
        streamsJob = viewModelScope.launch {
            ensurePortalScopedCache()
            val requestedCategoryId = categoryId ?: cachedCategories.firstOrNull()?.id
            if (requestedCategoryId == null) {
                _uiState.value = SeriesUiState.EmptyProvider
                return@launch
            }

            val matchedCategory = cachedCategories.firstOrNull {
                it.id == requestedCategoryId
            }
            val resolvedCategoryId = matchedCategory?.id
                ?: requestedCategoryId

            val currentIndex = cachedCategories.indexOfFirst { it.id == resolvedCategoryId }

            val categoryCacheKey = resolvedCategoryId
            val cached = cacheByCategoryKey[categoryCacheKey]
            if (!cached.isNullOrEmpty()) {
                selectedCategoryId = resolvedCategoryId
                _uiState.value = SeriesUiState.Success(
                    categories = cachedCategories.map { SideRailCategoryItem(id = it.id, title = it.name) },
                    selectedCategoryId = selectedCategoryId ?: resolvedCategoryId,
                    series = cached
                )
                return@launch
            }

            if (selectedCategoryId == resolvedCategoryId && _uiState.value is SeriesUiState.Success) return@launch
            selectedCategoryId = resolvedCategoryId
            val requestId = ++requestSequence
            _uiState.value = SeriesUiState.Loading
 
            when (val result = awaitSeriesResult(resolvedCategoryId)) {
                is NetworkResult.Success -> {
                    if (requestId != requestSequence) return@launch
                    if (result.data.isEmpty()) {
                        _uiState.value = SeriesUiState.EmptyCategory(
                            categories = cachedCategories.map { SideRailCategoryItem(id = it.id, title = it.name) },
                            selectedCategoryId = resolvedCategoryId
                        )
                    } else {
                        val bounded = cacheSeriesForCategory(
                            categoryId = categoryCacheKey,
                            currentIndex = currentIndex,
                            raw = result.data
                        )
                        _uiState.value = SeriesUiState.Success(
                            categories = cachedCategories.map { SideRailCategoryItem(id = it.id, title = it.name) },
                            selectedCategoryId = selectedCategoryId ?: resolvedCategoryId,
                            series = bounded
                        )
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

    private fun prefetchNextCategories(currentIndex: Int) {
        prefetchJob?.cancel()
        prefetchJob = viewModelScope.launch(kotlinx.coroutines.Dispatchers.IO) {
            for (i in 1..CacheBudgetPolicy.SERIES_PREFETCH_COUNT) {
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
        initialLoadStarted = false
    }

    private suspend fun awaitSeriesResult(
        categoryId: String,
        retryCount: Int = 0
    ): NetworkResult<List<MovieMetadata>> {
        repeat(retryCount + 1) { attempt ->
            when (val result = repository.getSeriesCached(categoryId).first { it !is NetworkResult.Loading }) {
                is NetworkResult.Success -> {
                    if (result.data.isNotEmpty() || attempt >= retryCount) {
                        return result
                    }
                    delay(INITIAL_EMPTY_RETRY_DELAY_MS)
                }
                is NetworkResult.Error -> return result
                is NetworkResult.Loading -> Unit
            }
        }
        return NetworkResult.Success(emptyList())
    }

    private fun cacheSeriesForCategory(
        categoryId: String,
        currentIndex: Int,
        raw: List<MovieMetadata>
    ): List<MovieMetadata> {
        val audited = auditAndDedupeSeries(
            scope = "category",
            key = categoryId,
            raw = raw
        )
        val bounded = audited.take(CacheBudgetPolicy.SERIES_CATEGORY_MAX_ITEMS)
        cacheByCategoryKey[categoryId] = bounded
        prefetchNextCategories(currentIndex)
        return bounded
    }

    private suspend fun ensurePortalScopedCache() {
        val currentPortalKey = runCatching { repository.getPortalCapabilityKey() }.getOrNull()
        if (currentPortalKey == null) {
            cacheByCategoryKey.clear()
            selectedCategoryId = null
            cachePortalKey = null
            return
        }
        if (cachePortalKey != currentPortalKey) {
            cacheByCategoryKey.clear()
            selectedCategoryId = null
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
