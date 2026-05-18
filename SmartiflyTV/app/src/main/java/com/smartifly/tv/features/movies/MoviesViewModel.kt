package com.smartifly.tv.features.movies

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartifly.tv.data.mapper.toDomain
import com.smartifly.tv.data.models.MovieMetadata
import com.smartifly.tv.data.models.MediaCategory
import com.smartifly.tv.data.remote.NetworkResult
import com.smartifly.tv.data.repository.LiveDataSource
import com.smartifly.tv.data.repository.MoviesDataSource
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import com.smartifly.tv.BuildConfig

/**
 * Enterprise-grade ViewModel for the Movies Screen.
 * 
 * Handles category-based discovery and movie listing with reactive states.
 */
class MoviesViewModel(
    private val repository: MoviesDataSource
) : ViewModel() {
    private companion object {
        const val ALL_CACHE_KEY = "__ALL__"
        const val DEBUG_MOVIE_ID = "1604"
        const val DEBUG_MOVIE_TITLE = "thrissur pooram"
    }

    private val _uiState = MutableStateFlow<MoviesUiState>(MoviesUiState.Loading)
    val uiState: StateFlow<MoviesUiState> = _uiState.asStateFlow()

    private var cachedCategories = emptyList<MediaCategory>()
    private var categoryNameToId = emptyMap<String, String>()
    private var selectedCategoryId: String? = null
    private var selectedCategoryName: String = "All"
    private var categoriesJob: Job? = null
    private var moviesJob: Job? = null
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
            _uiState.value = MoviesUiState.Loading
            when (val result = repository.getVodCategories().first { it !is NetworkResult.Loading }) {
                is NetworkResult.Success -> {
                    cachedCategories = result.data
                    categoryNameToId = cachedCategories.associate { it.name to it.id }
                    if (cachedCategories.isNotEmpty()) {
                        loadMoviesByCategory(null)
                    } else {
                        _uiState.value = MoviesUiState.Empty
                    }
                }
                is NetworkResult.Error -> _uiState.value = MoviesUiState.Error(result.message)
                is NetworkResult.Loading -> Unit
            }
        }
    }

    /**
     * Loads movies for a specific category ID.
     */
    fun loadMoviesByCategory(categoryOrId: String?) {
        moviesJob?.cancel()
        moviesJob = viewModelScope.launch {
            ensurePortalScopedCache()
            if (categoryOrId == null) {
                loadAllMovies()
                return@launch
            }

            val currentIndex = when {
                else -> cachedCategories.indexOfFirst { it.name == categoryOrId || it.id == categoryOrId }
            }

            val targetId = when {
                categoryNameToId.containsKey(categoryOrId) -> categoryNameToId[categoryOrId]
                else -> categoryOrId
            } ?: return@launch

            val categoryCacheKey = targetId
            val cached = cacheByCategoryKey[categoryCacheKey]
            if (!cached.isNullOrEmpty()) {
                selectedCategoryId = targetId
                selectedCategoryName = categoryOrId
                _uiState.value = MoviesUiState.Success(
                    categories = listOf("All") + cachedCategories.map { it.name },
                    selectedCategory = selectedCategoryName,
                    movies = cached
                )
                return@launch
            }

            if (selectedCategoryId == targetId && _uiState.value is MoviesUiState.Success) return@launch
            selectedCategoryId = targetId
            selectedCategoryName = categoryOrId
            val requestId = ++requestSequence
            
            when (val result = repository.getMoviesCached(targetId).first { it !is NetworkResult.Loading }) {
                is NetworkResult.Success -> {
                    if (requestId != requestSequence) return@launch
                    if (result.data.isEmpty()) {
                        _uiState.value = MoviesUiState.Empty
                    } else {
                        val audited = auditAndDedupeMovies(
                            scope = "category",
                            key = categoryCacheKey,
                            raw = result.data
                        )
                        cacheByCategoryKey[categoryCacheKey] = audited
                        _uiState.value = MoviesUiState.Success(
                            categories = listOf("All") + cachedCategories.map { it.name },
                            selectedCategory = selectedCategoryName,
                            movies = audited
                        )
                        prefetchNextCategories(currentIndex)
                    }
                }
                is NetworkResult.Error -> {
                    if (requestId != requestSequence) return@launch
                    _uiState.value = MoviesUiState.Error(result.message)
                }
                is NetworkResult.Loading -> Unit
            }
        }
    }

    private suspend fun loadAllMovies() {
        val cachedAll = cacheByCategoryKey[ALL_CACHE_KEY]
        if (!cachedAll.isNullOrEmpty()) {
            selectedCategoryId = null
            selectedCategoryName = "All"
            _uiState.value = MoviesUiState.Success(
                categories = listOf("All") + cachedCategories.map { it.name },
                selectedCategory = selectedCategoryName,
                movies = cachedAll
            )
            return
        }
        if (selectedCategoryId == null && _uiState.value is MoviesUiState.Success) return
        selectedCategoryId = null
        selectedCategoryName = "All"
        val requestId = ++requestSequence

        when (val result = repository.getMovies(categoryId = null, page = null).first { it !is NetworkResult.Loading }) {
            is NetworkResult.Success -> {
                if (requestId != requestSequence) return
                val mapped = result.data.map { it.toDomain() }
                val allMovies = auditAndDedupeMovies(
                    scope = "all",
                    key = ALL_CACHE_KEY,
                    raw = mapped
                )
                if (allMovies.isEmpty()) {
                    _uiState.value = MoviesUiState.Empty
                } else {
                    cacheByCategoryKey[ALL_CACHE_KEY] = allMovies
                    _uiState.value = MoviesUiState.Success(
                        categories = listOf("All") + cachedCategories.map { it.name },
                        selectedCategory = selectedCategoryName,
                        movies = allMovies
                    )
                }
            }
            is NetworkResult.Error -> {
                if (requestId != requestSequence) return
                _uiState.value = MoviesUiState.Error(result.message)
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
                    android.util.Log.d("SmartiflySpeed", "Pre-fetching category: ${nextCategory.name}")
                    repository.getMoviesCached(nextCategory.id).first { it !is NetworkResult.Loading }
                }
            }
        }
    }

    fun disposeForScreenExit() {
        categoriesJob?.cancel()
        moviesJob?.cancel()
        prefetchJob?.cancel()
    }

    private suspend fun ensurePortalScopedCache() {
        val liveDataSource = repository as? LiveDataSource ?: return
        val currentPortalKey = runCatching { liveDataSource.getPortalCapabilityKey() }.getOrNull() ?: return
        if (cachePortalKey != currentPortalKey) {
            cacheByCategoryKey.clear()
            selectedCategoryId = null
            selectedCategoryName = "All"
            cachePortalKey = currentPortalKey
        }
    }

    private fun auditAndDedupeMovies(
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
                "duplicate_movies_by_id scope=$scope key=$key duplicate_groups=${duplicatesById.size} total_raw=${raw.size} sample=$sample"
            )
        }

        val canonicalGroups = raw.groupBy { canonicalMovieKey(it) }
        val canonicalDuplicates = canonicalGroups.filterValues { it.size > 1 }
        if (BuildConfig.LIVE_DEBUG_TRACE && canonicalDuplicates.isNotEmpty()) {
            val sample = canonicalDuplicates.entries.take(16).joinToString(" || ") { (k, items) ->
                val ids = items.joinToString(",") { it.id }
                "$k -> ids=[$ids]"
            }
            android.util.Log.w(
                "SmartiflyAudit",
                "duplicate_movies_canonical scope=$scope key=$key groups=${canonicalDuplicates.size} sample=$sample"
            )
        }

        val deduped = canonicalGroups.values.map { variants ->
            variants.maxByOrNull { scoreMovieCandidate(it) } ?: variants.first()
        }

        if (BuildConfig.LIVE_DEBUG_TRACE) {
            val targetRaw = raw.filter { matchesDebugMovie(it) }
            if (targetRaw.isNotEmpty()) {
                val rawDump = targetRaw.joinToString(" || ") { m ->
                    "id=${m.id} title=${m.title} poster=${m.posterUrl} backdrop=${m.backdropUrl} year=${m.year} cat=${m.categoryId}"
                }
                android.util.Log.w(
                    "SmartiflyAudit",
                    "probe_movie_raw scope=$scope key=$key count=${targetRaw.size} data=$rawDump"
                )
            }

            val targetDeduped = deduped.filter { matchesDebugMovie(it) }
            if (targetDeduped.isNotEmpty()) {
                val dedupDump = targetDeduped.joinToString(" || ") { m ->
                    "id=${m.id} title=${m.title} poster=${m.posterUrl} backdrop=${m.backdropUrl} year=${m.year} cat=${m.categoryId}"
                }
                android.util.Log.w(
                    "SmartiflyAudit",
                    "probe_movie_deduped scope=$scope key=$key count=${targetDeduped.size} data=$dedupDump"
                )
            }
        }

        if (BuildConfig.LIVE_DEBUG_TRACE && deduped.size != raw.size) {
            android.util.Log.d(
                "SmartiflyAudit",
                "dedupe_movies scope=$scope key=$key raw=${raw.size} deduped=${deduped.size} removed=${raw.size - deduped.size}"
            )
        }
        return deduped
    }

    private fun scoreMovieCandidate(item: MovieMetadata): Int {
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

    private fun matchesDebugMovie(item: MovieMetadata): Boolean {
        return item.id == DEBUG_MOVIE_ID || item.title.lowercase().contains(DEBUG_MOVIE_TITLE)
    }

    private fun canonicalMovieKey(item: MovieMetadata): String {
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
