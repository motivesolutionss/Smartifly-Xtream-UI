package com.smartifly.tv.features.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartifly.tv.BuildConfig
import com.smartifly.tv.data.hero.HomeHeroEnricher
import com.smartifly.tv.data.ResumeWatchingDataSource
import com.smartifly.tv.data.hero.HomeHeroSelector
import com.smartifly.tv.data.models.LiveStream
import com.smartifly.tv.data.models.MediaCategory
import com.smartifly.tv.data.models.MovieMetadata
import com.smartifly.tv.data.image.ContentIdentity
import com.smartifly.tv.data.remote.NetworkResult
import com.smartifly.tv.data.repository.HomeAnalyticsDataSource
import com.smartifly.tv.data.repository.HomeDataSource
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeout
import kotlinx.coroutines.CancellationException
import java.io.IOException
import com.smartifly.tv.performance.lowend.PerformanceConfig

/**
 * Enterprise-grade ViewModel for the TV Home Screen.
 */
class HomeViewModel(
    private val repository: HomeDataSource,
    private val resumeRepository: ResumeWatchingDataSource,
    private val analyticsRepository: HomeAnalyticsDataSource,
    private val heroRepository: HomeHeroSelector,
    private val heroEnrichmentService: HomeHeroEnricher,
    private val performanceConfig: PerformanceConfig,
    private val profileId: String,
    private val logger: HomeLogger = AndroidHomeLogger
) : ViewModel() {

    private val _uiState = MutableStateFlow<HomeUiState>(HomeUiState.Loading)
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()
    private var loadGeneration: Int = 0
    private var loadJob: Job? = null

    init {
        loadHomeContent()
    }

    private fun loadHomeContent() {
        loadJob?.cancel()
        loadJob = viewModelScope.launch {
            val currentGeneration = ++loadGeneration
            val nowMs = System.currentTimeMillis()
            val snapshot = HomeFeedSnapshotCache.getFresh(profileId = profileId, nowMs = nowMs)
            if (snapshot != null) {
                if (currentGeneration != loadGeneration) return@launch
                _uiState.value = HomeUiState.Success(
                    heroMovie = snapshot.heroMovie,
                    sections = snapshot.sections,
                    isDegraded = false
                )
            } else {
                if (currentGeneration != loadGeneration) return@launch
                _uiState.value = HomeUiState.Loading
            }

            try {
                val sections = mutableListOf<HomeSection>()
                
                // 1. Continue Watching (Priority 0)
                val watchProgress = resumeRepository.getAllWatchProgress(profileId).first()
                if (watchProgress.isNotEmpty()) {
                    sections += HomeSection(
                        title = "Continue Watching",
                        items = watchProgress.map { it.metadata },
                        progressList = watchProgress.map { progress ->
                            if (progress.durationMs <= 0) 0f
                            else progress.positionMs.toFloat() / progress.durationMs.toFloat()
                        }
                    )
                }

                // 2. Resolve adaptive policy using available catalog signals.
                val vodCategories = awaitListResult(repository.getVodCategories())
                val seriesCategories = awaitListResult(repository.getSeriesCategoriesCached())
                val liveCategories = awaitListResult(repository.getLiveCategories())
                val estimatedCatalogSize = estimateCatalogSize(
                    vodCategories = vodCategories,
                    seriesCategories = seriesCategories,
                    liveCategories = liveCategories,
                    sampleMoviesPerCategory = sampleCategoryDensity(vodCategories) { category ->
                        awaitListResult(repository.getMoviesCached(category.id), timeoutMs = 2500L)
                    },
                    sampleSeriesPerCategory = sampleCategoryDensity(seriesCategories) { category ->
                        awaitListResult(repository.getSeriesCached(category.id), timeoutMs = 2500L)
                    },
                    sampleLivePerCategory = sampleCategoryDensity(liveCategories) { category ->
                        awaitListResult(repository.getLiveStreamsCached(category.id), timeoutMs = 2500L)
                    }
                )
                val policy = HomeRailPolicyResolver.resolve(performanceConfig.tier, estimatedCatalogSize)

                logger.i(
                    "SmartiflyRails",
                    "rails_policy profile=$profileId tier=${performanceConfig.tier} estimated_catalog=$estimatedCatalogSize cap=${policy.totalRailsCap}"
                )

                // 3. Load adaptive pools with strict fetch caps.
                val moviePoolByCategory = loadMoviePools(vodCategories, policy)
                val seriesPoolByCategory = loadSeriesPools(seriesCategories, policy)
                val livePoolByCategory = loadLivePools(liveCategories, policy)
                val isDegraded = listOf(
                    vodCategories.isNotEmpty() && moviePoolByCategory.isEmpty(),
                    seriesCategories.isNotEmpty() && seriesPoolByCategory.isEmpty(),
                    liveCategories.isNotEmpty() && livePoolByCategory.isEmpty()
                ).any { it }
                val movieItems = moviePoolByCategory.values.flatten()
                val seriesItems = seriesPoolByCategory.values.flatten()
                
                // 4. Hero selection.
                val hero = heroRepository.selectHomeHero(
                    profileId = profileId,
                    continueWatching = watchProgress.map { it.metadata },
                    movies = movieItems,
                    series = seriesItems
                )

                val usedKeys = mutableSetOf<String>()

                // 5. Mandatory rails (must always be attempted first).
                appendSection(
                    sections = sections,
                    usedKeys = usedKeys,
                    title = "Live Channels",
                    sourceItems = livePoolByCategory.values.flatten(),
                    maxItems = policy.itemsPerRail
                )
                appendSection(
                    sections = sections,
                    usedKeys = usedKeys,
                    title = "Movies",
                    sourceItems = movieItems,
                    maxItems = policy.itemsPerRail
                )
                appendSection(
                    sections = sections,
                    usedKeys = usedKeys,
                    title = "Series",
                    sourceItems = seriesItems,
                    maxItems = policy.itemsPerRail
                )
                // Keep mandatory rails unique, but allow supplemental rails to reuse items
                // so Home doesn't collapse to only 3 rails on smaller/mid catalogs.
                usedKeys.clear()

                // 6. Trending rail.
                val trendingIds = analyticsRepository.getTrendingIds()
                val trendingPool = if (trendingIds.isNotEmpty()) {
                    (movieItems + seriesItems).filter { trendingIds.contains(it.id) }
                } else {
                    (movieItems + seriesItems)
                        .sortedByDescending { it.rating.toDoubleOrNull() ?: 0.0 }
                        .take(policy.trendingItems)
                        .shuffled()
                }
                appendSection(
                    sections = sections,
                    usedKeys = usedKeys,
                    title = "Trending for You",
                    sourceItems = trendingPool,
                    maxItems = policy.trendingItems
                )

                // 7. Smart rows from backend (capped by policy).
                val smartRows = analyticsRepository.getSmartRows(profileId)
                smartRows.take(policy.smartRowsCap).forEach { (title, items) ->
                    appendSection(
                        sections = sections,
                        usedKeys = usedKeys,
                        title = title,
                        sourceItems = items,
                        maxItems = policy.itemsPerRail
                    )
                }

                // 8. New releases.
                val newReleases = movieItems
                    .sortedByDescending { it.year.toIntOrNull() ?: 0 }
                appendSection(
                    sections = sections,
                    usedKeys = usedKeys,
                    title = "New Movies",
                    sourceItems = newReleases,
                    maxItems = policy.newReleaseItems
                )

                // 9. Live highlights.
                val liveItems = livePoolByCategory.values.flatten()
                appendSection(
                    sections = sections,
                    usedKeys = usedKeys,
                    title = "Live TV Highlights",
                    sourceItems = liveItems,
                    maxItems = policy.liveItems
                )

                // 10. Category rails for movies.
                moviePoolByCategory.entries
                    .sortedByDescending { (_, items) -> items.size }
                    .take(policy.movieCategoryRails)
                    .forEach { (categoryName, items) ->
                        appendSection(
                            sections = sections,
                            usedKeys = usedKeys,
                            title = categoryName,
                            sourceItems = items,
                            maxItems = policy.itemsPerRail
                        )
                    }

                // 11. Category rails for series.
                seriesPoolByCategory.entries
                    .sortedByDescending { (_, items) -> items.size }
                    .take(policy.seriesCategoryRails)
                    .forEach { (categoryName, items) ->
                        appendSection(
                            sections = sections,
                            usedKeys = usedKeys,
                            title = categoryName,
                            sourceItems = items,
                            maxItems = policy.itemsPerRail
                        )
                    }

                // 12. Add series spotlight fallback if not already enough.
                appendSection(
                    sections = sections,
                    usedKeys = usedKeys,
                    title = "Series Spotlight",
                    sourceItems = seriesItems,
                    maxItems = policy.itemsPerRail
                )

                // Final rail ranking/order for premium dynamic feel.
                val rankResult = HomeRailRanker.rankWithDiagnostics(
                    sections = sections,
                    profileId = profileId,
                    policy = policy
                )
                val rankedSections = rankResult.sections
                logger.i(
                    "SmartiflyRails",
                    "rail_rank_debug profile=$profileId top=${
                        rankResult.debugTopRails.joinToString(" || ") {
                            "${it.title}:total=${"%.1f".format(it.totalScore)}(a=${"%.1f".format(it.anchorScore)},s=${"%.1f".format(it.sizeScore)},i=${"%.1f".format(it.imageScore)},f=${"%.1f".format(it.freshnessScore)})"
                        }
                    }"
                )

                if (rankedSections.isEmpty()) {
                    if (currentGeneration != loadGeneration) return@launch
                    _uiState.value = HomeUiState.Empty
                    return@launch
                }

                if (currentGeneration != loadGeneration) return@launch
                _uiState.value = HomeUiState.Success(
                    heroMovie = hero,
                    sections = rankedSections,
                    isDegraded = isDegraded
                )
                HomeFeedSnapshotCache.put(
                    profileId = profileId,
                    snapshot = HomeFeedSnapshot(
                        heroMovie = hero,
                        sections = rankedSections,
                        storedAtMs = System.currentTimeMillis()
                    )
                )

                if (hero != null) {
                    enrichHeroInBackground(baseHero = hero, generation = currentGeneration)
                }
            } catch (e: CancellationException) {
                throw e
            } catch (io: IOException) {
                if (currentGeneration != loadGeneration) return@launch
                _uiState.value = HomeUiState.Error(io.message ?: "Failed to load home content")
            } catch (se: SecurityException) {
                if (currentGeneration != loadGeneration) return@launch
                _uiState.value = HomeUiState.Error(se.message ?: "Failed to load home content")
            } catch (re: RuntimeException) {
                if (currentGeneration != loadGeneration) return@launch
                _uiState.value = HomeUiState.Error(re.message ?: "Failed to load home content")
            }
        }
    }

    private fun enrichHeroInBackground(baseHero: MovieMetadata, generation: Int) {
        viewModelScope.launch {
            val enriched = heroEnrichmentService.enrich(baseHero) ?: return@launch
            if (generation != loadGeneration) return@launch

            val current = _uiState.value
            if (current is HomeUiState.Success && current.heroMovie?.id == baseHero.id) {
                if (isMeaningfulUpgrade(baseHero, enriched)) {
                    _uiState.value = current.copy(heroMovie = enriched)
                }
            }
        }
    }

    private fun isMeaningfulUpgrade(before: MovieMetadata, after: MovieMetadata): Boolean {
        if (after.backdropUrl.isNotBlank() && after.backdropUrl != before.backdropUrl) return true
        if (after.posterUrl.isNotBlank() && after.posterUrl != before.posterUrl) return true
        if (after.description.isNotBlank() && after.description != before.description) return true
        return false
    }

    private fun estimateCatalogSize(
        vodCategories: List<MediaCategory>,
        seriesCategories: List<MediaCategory>,
        liveCategories: List<MediaCategory>,
        sampleMoviesPerCategory: Int,
        sampleSeriesPerCategory: Int,
        sampleLivePerCategory: Int
    ): Int {
        val vodEstimate = vodCategories.size * sampleMoviesPerCategory
        val seriesEstimate = seriesCategories.size * sampleSeriesPerCategory
        val liveEstimate = liveCategories.size * sampleLivePerCategory
        val combined = vodEstimate + seriesEstimate + liveEstimate
        // Keep stable lower-bound so policy doesn't collapse on sparse/slow probes.
        return combined.coerceIn(1_000, 300_000)
    }

    private suspend fun sampleCategoryDensity(
        categories: List<MediaCategory>,
        fetch: suspend (MediaCategory) -> List<*>
    ): Int {
        if (categories.isEmpty()) return 0
        val sample = categories
            .take(2)
            .mapNotNull { category ->
                runCatching { fetch(category).size }
                    .onFailure { error ->
                        logger.i("SmartiflyRails", "category_sample_error profile=$profileId category=${category.id} message=${error.message}")
                    }
                    .getOrNull()
            }
        if (sample.isEmpty()) return 24
        return sample.average().toInt().coerceAtLeast(12)
    }

    private suspend fun loadMoviePools(
        categories: List<MediaCategory>,
        policy: HomeRailPolicy
    ): Map<String, List<MovieMetadata>> {
        return collectPools(
            categories = categories,
            desiredPools = policy.fetchMovieCategories,
            scanLimit = (policy.fetchMovieCategories * 3).coerceAtLeast(policy.fetchMovieCategories),
            fetch = { category ->
                awaitListResult(repository.getMoviesCached(category.id), timeoutMs = 7000L)
                    .take(policy.fetchItemsPerCategory)
            }
        )
    }

    private suspend fun loadSeriesPools(
        categories: List<MediaCategory>,
        policy: HomeRailPolicy
    ): Map<String, List<MovieMetadata>> {
        return collectPools(
            categories = categories,
            desiredPools = policy.fetchSeriesCategories,
            scanLimit = (policy.fetchSeriesCategories * 3).coerceAtLeast(policy.fetchSeriesCategories),
            fetch = { category ->
                awaitListResult(repository.getSeriesCached(category.id), timeoutMs = 7000L)
                    .take(policy.fetchItemsPerCategory)
            }
        )
    }

    private suspend fun loadLivePools(
        categories: List<MediaCategory>,
        policy: HomeRailPolicy
    ): Map<String, List<MovieMetadata>> {
        return collectPools(
            categories = categories,
            desiredPools = policy.fetchLiveCategories,
            scanLimit = (policy.fetchLiveCategories * 4).coerceAtLeast(policy.fetchLiveCategories),
            fetch = { category ->
                awaitListResult(repository.getLiveStreamsCached(category.id), timeoutMs = 7000L)
                    .take(policy.fetchItemsPerCategory)
                    .map { it.toMovieCard() }
            }
        )
    }

    private suspend fun <T> awaitListResult(
        flow: kotlinx.coroutines.flow.Flow<NetworkResult<List<T>>>,
        timeoutMs: Long = 12_000L
    ): List<T> {
        return try {
            withTimeout(timeoutMs) {
                when (val result = flow.first { it !is NetworkResult.Loading }) {
                    is NetworkResult.Success -> result.data
                    is NetworkResult.Error -> {
                        logger.i(
                            "SmartiflyRails",
                            "await_list_result_network_error profile=$profileId message=${result.message}"
                        )
                        emptyList()
                    }
                    is NetworkResult.Loading -> emptyList()
                }
            }
        } catch (_: TimeoutCancellationException) {
            emptyList()
        } catch (e: CancellationException) {
            throw e
        } catch (io: IOException) {
            logger.i("SmartiflyRails", "await_list_result_io_error profile=$profileId message=${io.message}")
            emptyList()
        } catch (se: SecurityException) {
            logger.i("SmartiflyRails", "await_list_result_security_error profile=$profileId message=${se.message}")
            emptyList()
        } catch (re: RuntimeException) {
            logger.i("SmartiflyRails", "await_list_result_runtime_error profile=$profileId message=${re.message}")
            emptyList()
        }
    }

    private fun LiveStream.toMovieCard(): MovieMetadata {
        return MovieMetadata(
            id = id,
            title = name,
            description = currentProgram ?: "Live broadcast",
            year = "",
            rating = "",
            duration = "LIVE",
            posterUrl = logoUrl,
            backdropUrl = logoUrl,
            type = "live",
            categoryId = categoryId
        )
    }

    private fun appendSection(
        sections: MutableList<HomeSection>,
        usedKeys: MutableSet<String>,
        title: String,
        sourceItems: List<MovieMetadata>,
        maxItems: Int
    ) {
        if (sourceItems.isEmpty()) return
        val deduped = sourceItems
            .filter { item ->
                val key = ContentIdentity.key(
                    providerKey = profileId,
                    type = item.type,
                    id = item.id,
                    title = item.title
                )
                if (usedKeys.contains(key)) {
                    false
                } else {
                    usedKeys.add(key)
                    true
                }
            }
            .take(maxItems)
        if (deduped.isNotEmpty()) {
            sections += HomeSection(title = title, items = deduped)
        }
    }

    private suspend fun collectPools(
        categories: List<MediaCategory>,
        desiredPools: Int,
        scanLimit: Int,
        fetch: suspend (MediaCategory) -> List<MovieMetadata>
    ): Map<String, List<MovieMetadata>> {
        val result = linkedMapOf<String, List<MovieMetadata>>()
        if (categories.isEmpty() || desiredPools <= 0) return result

        val cappedScan = minOf(categories.size, scanLimit)
        for (category in categories.take(cappedScan)) {
            if (result.size >= desiredPools) break
            val items = fetch(category)
            if (items.isNotEmpty()) {
                result[category.name] = items
            }
        }
        return result
    }

    fun refreshAll() {
        loadHomeContent()
    }

    override fun onCleared() {
        loadJob?.cancel()
        super.onCleared()
    }
}

interface HomeLogger {
    fun i(tag: String, message: String)
}

object AndroidHomeLogger : HomeLogger {
    override fun i(tag: String, message: String) {
        if (BuildConfig.LIVE_DEBUG_TRACE) {
            android.util.Log.i(tag, message)
        }
    }
}
