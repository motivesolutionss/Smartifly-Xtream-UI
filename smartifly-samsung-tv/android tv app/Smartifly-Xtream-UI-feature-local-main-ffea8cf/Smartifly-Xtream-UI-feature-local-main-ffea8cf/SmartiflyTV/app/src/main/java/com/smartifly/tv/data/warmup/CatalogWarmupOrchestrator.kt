package com.smartifly.tv.data.warmup

import com.smartifly.tv.data.models.MediaCategory
import com.smartifly.tv.data.remote.NetworkResult
import com.smartifly.tv.data.repository.XtreamRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.delay
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withTimeoutOrNull

enum class WarmupDomain { LIVE, MOVIES, SERIES }
enum class WarmupStatus { PENDING, RUNNING, SUCCESS, FAILED, PARTIAL }

data class DomainWarmupProgress(
    val domain: WarmupDomain,
    val status: WarmupStatus = WarmupStatus.PENDING,
    val itemsLoaded: Int = 0,
    val progressPct: Int = 0,
    val durationMs: Long = 0L,
    val error: String? = null
)

data class CatalogWarmupState(
    val live: DomainWarmupProgress = DomainWarmupProgress(domain = WarmupDomain.LIVE),
    val movies: DomainWarmupProgress = DomainWarmupProgress(domain = WarmupDomain.MOVIES),
    val series: DomainWarmupProgress = DomainWarmupProgress(domain = WarmupDomain.SERIES),
    val startedAtMs: Long = 0L,
    val completed: Boolean = false
)

class CatalogWarmupOrchestrator(
    private val repository: XtreamRepository
) {
    private val mutex = Mutex()
    private val _state = MutableStateFlow(CatalogWarmupState())
    val state: StateFlow<CatalogWarmupState> = _state.asStateFlow()
    private var lastBackgroundRunAtMs: Long = 0L
    private val backgroundCooldownMs: Long = 10 * 60 * 1000L

    suspend fun runStartupWarmup(timeoutMs: Long = 25_000L): CatalogWarmupState {
        return mutex.withLock {
            _state.value = CatalogWarmupState(startedAtMs = System.currentTimeMillis(), completed = false)
            CatalogWarmupRuntime.update(_state.value)
            warmDomain(
                domain = WarmupDomain.LIVE,
                block = { warmLive(timeoutMs = timeoutMs) }
            )
            warmDomain(
                domain = WarmupDomain.MOVIES,
                block = { warmMovies(timeoutMs = timeoutMs) }
            )
            warmDomain(
                domain = WarmupDomain.SERIES,
                block = { warmSeries(timeoutMs = timeoutMs) }
            )
            _state.value = _state.value.copy(completed = true)
            CatalogWarmupRuntime.update(_state.value)
            _state.value
        }
    }

    suspend fun runBackgroundWarmup(
        timeoutMsPerRequest: Long = 7_000L,
        maxCategoriesPerDomain: Int = 4
    ): CatalogWarmupState {
        val now = System.currentTimeMillis()
        if (now - lastBackgroundRunAtMs < backgroundCooldownMs) {
            return _state.value
        }

        return mutex.withLock {
            lastBackgroundRunAtMs = System.currentTimeMillis()
            warmDomainBackground(
                domain = WarmupDomain.LIVE,
                block = { warmLiveBackground(timeoutMsPerRequest, maxCategoriesPerDomain) }
            )
            warmDomainBackground(
                domain = WarmupDomain.MOVIES,
                block = { warmMoviesBackground(timeoutMsPerRequest, maxCategoriesPerDomain) }
            )
            warmDomainBackground(
                domain = WarmupDomain.SERIES,
                block = { warmSeriesBackground(timeoutMsPerRequest, maxCategoriesPerDomain) }
            )
            CatalogWarmupRuntime.update(_state.value)
            _state.value
        }
    }

    private suspend fun warmLive(timeoutMs: Long): Pair<Int, String?> {
        val categories = awaitCategories(timeoutMs) { repository.getLiveCategories().first { it !is NetworkResult.Loading } }
        if (categories.isEmpty()) return 0 to "No live categories"
        val targetCategoryId = categories.firstOrNull()?.id ?: return 0 to "No category selected"
        val streams = awaitList(timeoutMs) { repository.getLiveStreamsCached(targetCategoryId).first { it !is NetworkResult.Loading } }
        return streams.size to null
    }

    private suspend fun warmMovies(timeoutMs: Long): Pair<Int, String?> {
        val categories = awaitCategories(timeoutMs) { repository.getVodCategories().first { it !is NetworkResult.Loading } }
        if (categories.isEmpty()) return 0 to "No movie categories"
        val targetCategoryId = categories.firstOrNull()?.id ?: return 0 to "No category selected"
        val movies = awaitList(timeoutMs) { repository.getMoviesCached(targetCategoryId).first { it !is NetworkResult.Loading } }
        return movies.size to null
    }

    private suspend fun warmSeries(timeoutMs: Long): Pair<Int, String?> {
        val categories = awaitCategories(timeoutMs) { repository.getSeriesCategoriesCached().first { it !is NetworkResult.Loading } }
        if (categories.isEmpty()) return 0 to "No series categories"
        val targetCategoryId = categories.firstOrNull()?.id ?: return 0 to "No category selected"
        val series = awaitList(timeoutMs) { repository.getSeriesCached(targetCategoryId).first { it !is NetworkResult.Loading } }
        return series.size to null
    }

    private suspend fun warmLiveBackground(timeoutMsPerRequest: Long, maxCategories: Int): Pair<Int, String?> {
        val categories = awaitCategories(timeoutMsPerRequest) { repository.getLiveCategories().first { it !is NetworkResult.Loading } }
        if (categories.isEmpty()) return 0 to "No live categories"
        return warmCategories(
            domain = WarmupDomain.LIVE,
            categories = categories,
            maxCategories = maxCategories,
            timeoutMsPerRequest = timeoutMsPerRequest
        ) { category ->
            awaitList(timeoutMsPerRequest) { repository.getLiveStreamsCached(category.id).first { it !is NetworkResult.Loading } }.size
        }
    }

    private suspend fun warmMoviesBackground(timeoutMsPerRequest: Long, maxCategories: Int): Pair<Int, String?> {
        val categories = awaitCategories(timeoutMsPerRequest) { repository.getVodCategories().first { it !is NetworkResult.Loading } }
        if (categories.isEmpty()) return 0 to "No movie categories"
        return warmCategories(
            domain = WarmupDomain.MOVIES,
            categories = categories,
            maxCategories = maxCategories,
            timeoutMsPerRequest = timeoutMsPerRequest
        ) { category ->
            awaitList(timeoutMsPerRequest) { repository.getMoviesCached(category.id).first { it !is NetworkResult.Loading } }.size
        }
    }

    private suspend fun warmSeriesBackground(timeoutMsPerRequest: Long, maxCategories: Int): Pair<Int, String?> {
        val categories = awaitCategories(timeoutMsPerRequest) { repository.getSeriesCategoriesCached().first { it !is NetworkResult.Loading } }
        if (categories.isEmpty()) return 0 to "No series categories"
        return warmCategories(
            domain = WarmupDomain.SERIES,
            categories = categories,
            maxCategories = maxCategories,
            timeoutMsPerRequest = timeoutMsPerRequest
        ) { category ->
            awaitList(timeoutMsPerRequest) { repository.getSeriesCached(category.id).first { it !is NetworkResult.Loading } }.size
        }
    }

    private suspend fun warmCategories(
        domain: WarmupDomain,
        categories: List<MediaCategory>,
        maxCategories: Int,
        timeoutMsPerRequest: Long,
        fetchCategoryCount: suspend (MediaCategory) -> Int
    ): Pair<Int, String?> {
        val selected = categories.take(maxCategories.coerceAtLeast(1))
        var totalItems = 0
        var successCount = 0
        var lastError: String? = null
        val total = selected.size.coerceAtLeast(1)

        selected.forEachIndexed { index, category ->
            val count = runCatching { fetchCategoryCount(category) }
                .onFailure { lastError = it.message ?: "Unknown warmup failure" }
                .getOrDefault(0)
            totalItems += count
            if (count > 0) successCount++
            val pct = (((index + 1).toFloat() / total.toFloat()) * 100f).toInt().coerceIn(35, 100)
            updateDomain(
                domain = domain,
                status = WarmupStatus.RUNNING,
                itemsLoaded = totalItems,
                progressPct = pct
            )
            // Tiny yield between category fetches to keep warmup polite under load.
            delay(60L)
        }

        return when {
            successCount == selected.size -> totalItems to null
            successCount > 0 -> totalItems to (lastError ?: "Partial warmup")
            else -> totalItems to (lastError ?: "Warmup failed")
        }
    }

    private suspend fun awaitCategories(
        timeoutMs: Long,
        call: suspend () -> NetworkResult<List<MediaCategory>>
    ): List<MediaCategory> {
        val result = withTimeoutOrNull(timeoutMs) { call() } ?: return emptyList()
        return if (result is NetworkResult.Success) result.data else emptyList()
    }

    private suspend fun awaitList(
        timeoutMs: Long,
        call: suspend () -> NetworkResult<List<*>>
    ): List<*> {
        val result = withTimeoutOrNull(timeoutMs) { call() } ?: return emptyList<Any>()
        return if (result is NetworkResult.Success) result.data else emptyList<Any>()
    }

    private suspend fun warmDomain(
        domain: WarmupDomain,
        block: suspend () -> Pair<Int, String?>
    ) {
        val startedAtMs = System.currentTimeMillis()
        updateDomain(
            domain = domain,
            status = WarmupStatus.RUNNING,
            progressPct = 35
        )
        val (items, error) = runCatching { block() }.getOrElse { 0 to (it.message ?: "Warmup failed") }
        val success = error == null
        updateDomain(
            domain = domain,
            status = if (success) WarmupStatus.SUCCESS else WarmupStatus.FAILED,
            itemsLoaded = items,
            progressPct = if (success) 100 else 0,
            durationMs = System.currentTimeMillis() - startedAtMs,
            error = error
        )
    }

    private suspend fun warmDomainBackground(
        domain: WarmupDomain,
        block: suspend () -> Pair<Int, String?>
    ) {
        val startedAtMs = System.currentTimeMillis()
        val (items, error) = runCatching { block() }.getOrElse { 0 to (it.message ?: "Background warmup failed") }
        val status = when {
            error == null -> WarmupStatus.SUCCESS
            items > 0 -> WarmupStatus.PARTIAL
            else -> WarmupStatus.FAILED
        }
        updateDomain(
            domain = domain,
            status = status,
            itemsLoaded = items,
            progressPct = if (status == WarmupStatus.FAILED) 0 else 100,
            durationMs = System.currentTimeMillis() - startedAtMs,
            error = if (status == WarmupStatus.SUCCESS) null else error
        )
    }

    private fun updateDomain(
        domain: WarmupDomain,
        status: WarmupStatus,
        itemsLoaded: Int? = null,
        progressPct: Int? = null,
        durationMs: Long? = null,
        error: String? = null
    ) {
        val current = _state.value
        val next = when (domain) {
            WarmupDomain.LIVE -> current.live.copy(
                status = status,
                itemsLoaded = itemsLoaded ?: current.live.itemsLoaded,
                progressPct = progressPct ?: current.live.progressPct,
                durationMs = durationMs ?: current.live.durationMs,
                error = error
            )
            WarmupDomain.MOVIES -> current.movies.copy(
                status = status,
                itemsLoaded = itemsLoaded ?: current.movies.itemsLoaded,
                progressPct = progressPct ?: current.movies.progressPct,
                durationMs = durationMs ?: current.movies.durationMs,
                error = error
            )
            WarmupDomain.SERIES -> current.series.copy(
                status = status,
                itemsLoaded = itemsLoaded ?: current.series.itemsLoaded,
                progressPct = progressPct ?: current.series.progressPct,
                durationMs = durationMs ?: current.series.durationMs,
                error = error
            )
        }
        _state.value = current.copy(
            live = if (domain == WarmupDomain.LIVE) next else current.live,
            movies = if (domain == WarmupDomain.MOVIES) next else current.movies,
            series = if (domain == WarmupDomain.SERIES) next else current.series
        )
        CatalogWarmupRuntime.update(_state.value)
    }
}
