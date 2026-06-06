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
import com.smartifly.tv.data.repository.HeroBannerFallbackDataSource
import com.smartifly.tv.data.repository.HomeAnalyticsDataSource
import com.smartifly.tv.data.repository.HomeDataSource
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.launch
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.withTimeout
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.yield
import kotlinx.coroutines.sync.Semaphore
import kotlinx.coroutines.sync.withPermit
import java.io.IOException
import com.smartifly.tv.performance.lowend.PerformanceConfig
import com.smartifly.tv.performance.RuntimeDownshiftManager

/**
 * Enterprise-grade ViewModel for the TV Home Screen.
 */
class HomeViewModel(
    private val repository: HomeDataSource,
    private val resumeRepository: ResumeWatchingDataSource,
    private val analyticsRepository: HomeAnalyticsDataSource,
    private val heroFallbackRepository: HeroBannerFallbackDataSource,
    private val heroRepository: HomeHeroSelector,
    private val heroEnrichmentService: HomeHeroEnricher,
    private val performanceConfig: PerformanceConfig,
    private val profileId: String,
    private val loadDispatcher: CoroutineDispatcher = Dispatchers.Default,
    private val logger: HomeLogger = AndroidHomeLogger
) : ViewModel() {
    private data class DomainPoolResult(
        val pools: Map<String, List<MovieMetadata>>,
        val coreItems: List<MovieMetadata>
    )

    companion object {
        private const val HOME_BOOTSTRAP_STREAM_TIMEOUT_MS = 7_000L
        private const val HOME_BOOTSTRAP_MOVIE_SCAN_CAP = 6
        private const val HOME_BOOTSTRAP_SERIES_SCAN_CAP = 6
        private const val HOME_BOOTSTRAP_LIVE_SCAN_CAP = 4
        private const val HOME_ENRICH_STREAM_TIMEOUT_MS = 6_000L
        private const val HOME_ENRICH_MOVIE_SCAN_CAP = 14
        private const val HOME_ENRICH_SERIES_SCAN_CAP = 14
        private const val HOME_COLD_START_RETRY_DELAY_MS = 1_500L
        private const val HERO_CAROUSEL_CANDIDATE_POOL_SIZE = 10
        private const val HERO_CAROUSEL_TARGET_SIZE = 5
        private const val HERO_ENRICH_CONCURRENCY = 3
    }

    private val _uiState = MutableStateFlow<HomeUiState>(HomeUiState.Loading())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()
    private var loadGeneration: Int = 0
    private var loadJob: Job? = null

    init {
        loadHomeContent()
    }

    private fun loadHomeContent() {
        loadJob?.cancel()
        loadJob = viewModelScope.launch(loadDispatcher) {
            val currentGeneration = ++loadGeneration
            val bootstrapStartedAtMs = System.currentTimeMillis()
            val nowMs = System.currentTimeMillis()
            val snapshot = HomeFeedSnapshotCache.getFresh(profileId = profileId, nowMs = nowMs)
            if (snapshot != null) {
                if (currentGeneration != loadGeneration) return@launch
                _uiState.value = HomeUiState.Success(
                    heroMovie = snapshot.heroMovie,
                    heroCarousel = snapshot.heroCarousel,
                    sections = snapshot.sections,
                    isDegraded = false
                )
                logger.i(
                    "SmartiflyHomePerf",
                    "home_snapshot_hit profile=$profileId age_ms=${nowMs - snapshot.storedAtMs} " +
                        "sections=${snapshot.sections.size} hero_present=${snapshot.heroMovie != null} " +
                        "hero_carousel_count=${snapshot.heroCarousel.size} " +
                        "hero_carousel_ids=${snapshot.heroCarousel.joinToString(separator = ",") { it.id.toString() }}"
                )
            } else {
                if (currentGeneration != loadGeneration) return@launch
                _uiState.value = HomeUiState.Loading()
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
                val catalogProbeStartedAtMs = System.currentTimeMillis()
                val vodCategories = awaitListResult(repository.getVodCategories())
                val seriesCategories = awaitListResult(repository.getSeriesCategoriesCached())
                val liveCategories = awaitListResult(repository.getLiveCategories())
                val catalogProbeDurationMs = System.currentTimeMillis() - catalogProbeStartedAtMs
                val estimatedCatalogSize = estimateCatalogSize(
                    vodCategories = vodCategories,
                    seriesCategories = seriesCategories,
                    liveCategories = liveCategories,
                    sampleMoviesPerCategory = estimatePerCategoryDensity(vodCategories.size, domain = "vod"),
                    sampleSeriesPerCategory = estimatePerCategoryDensity(seriesCategories.size, domain = "series"),
                    sampleLivePerCategory = estimatePerCategoryDensity(liveCategories.size, domain = "live")
                )
                val policy = HomeRailPolicyResolver.resolve(performanceConfig.tier, estimatedCatalogSize)

                logger.i(
                    "SmartiflyRails",
                    "rails_policy profile=$profileId tier=${performanceConfig.tier} estimated_catalog=$estimatedCatalogSize cap=${policy.totalRailsCap} fetch_items=${policy.fetchItemsPerCategory} downshift_level=${RuntimeDownshiftManager.currentLevel()} downshift_scale=${RuntimeDownshiftManager.currentScale()}"
                )
                logger.i(
                    "SmartiflyHomePerf",
                    "home_catalog_ready profile=$profileId duration_ms=$catalogProbeDurationMs vod_categories=${vodCategories.size} series_categories=${seriesCategories.size} live_categories=${liveCategories.size}"
                )

                // 3. Load adaptive pools with strict fetch caps (for category rails)
                val poolLoadStartedAtMs = System.currentTimeMillis()
                val (movieDomain, seriesDomain, liveDomain) = coroutineScope {
                    val moviesDeferred = async { loadMovieDomain(vodCategories, policy) }
                    val seriesDeferred = async { loadSeriesDomain(seriesCategories, policy) }
                    val liveDeferred = async { loadLiveDomain(liveCategories, policy) }
                    Triple(moviesDeferred.await(), seriesDeferred.await(), liveDeferred.await())
                }
                val moviePoolByCategory = movieDomain.pools
                val seriesPoolByCategory = seriesDomain.pools
                val livePoolByCategory = liveDomain.pools
                val coreMovieItems = movieDomain.coreItems
                val coreSeriesItems = seriesDomain.coreItems
                val coreLiveItems = liveDomain.coreItems
                val poolLoadDurationMs = System.currentTimeMillis() - poolLoadStartedAtMs
                val isDegraded = listOf(
                    vodCategories.isNotEmpty() && coreMovieItems.isEmpty(),
                    seriesCategories.isNotEmpty() && coreSeriesItems.isEmpty(),
                    liveCategories.isNotEmpty() && coreLiveItems.isEmpty()
                ).any { it }
                val movieItems = if (coreMovieItems.isNotEmpty()) coreMovieItems else moviePoolByCategory.values.flatten()
                val seriesItems = if (coreSeriesItems.isNotEmpty()) coreSeriesItems else seriesPoolByCategory.values.flatten()
                logger.i(
                    "SmartiflyHomePerf",
                    "home_pools_ready profile=$profileId duration_ms=$poolLoadDurationMs movie_pools=${moviePoolByCategory.size} series_pools=${seriesPoolByCategory.size} live_pools=${livePoolByCategory.size} core_movies=${coreMovieItems.size} core_series=${coreSeriesItems.size} core_live=${coreLiveItems.size}"
                )
                
                // 4. Hero selection.
                val heroSelectionStartedAtMs = System.currentTimeMillis()
                val providerHero = heroRepository.selectHomeHero(
                    profileId = profileId,
                    continueWatching = watchProgress.map { it.metadata },
                    movies = movieItems,
                    series = seriesItems
                )
                val fallbackHeroItems = if (providerHero == null) {
                    heroFallbackRepository.getFallbackHeroBanners()
                } else {
                    emptyList()
                }
                val hero = providerHero ?: fallbackHeroItems.firstOrNull()
                val heroCarousel = buildHeroCarouselCandidates(
                    primaryHero = hero,
                    movies = movieItems,
                    series = seriesItems
                )
                logger.i(
                    "SmartiflyHomePerf",
                    "home_hero_selected profile=$profileId duration_ms=${System.currentTimeMillis() - heroSelectionStartedAtMs} hero_type=${hero?.type ?: "none"} hero_id=${hero?.id ?: "none"} fallback=${providerHero == null}"
                )
                logger.i(
                    "SmartiflyHero",
                    "hero_carousel_base profile=$profileId count=${heroCarousel.size} items=${heroCarousel.joinToString(" | ") { "id=${it.id},desc=${it.description.isNotBlank()},backdrop=${it.backdropUrl.isNotBlank()},poster=${it.posterUrl.isNotBlank()}" }}"
                )
                if (currentGeneration == loadGeneration && _uiState.value is HomeUiState.Loading) {
                    _uiState.value = HomeUiState.Loading(heroMovie = hero, heroCarousel = heroCarousel)
                }

                val usedKeys = mutableSetOf<String>()
                val liveItems = if (coreLiveItems.isNotEmpty()) coreLiveItems else livePoolByCategory.values.flatten()
                val recentLive = liveItems.sortedByDescending { it.id.toLongOrNull() ?: 0L }
                val recentMovies = movieItems
                    .sortedWith(
                        compareByDescending<MovieMetadata> { it.year.toIntOrNull() ?: 0 }
                            .thenByDescending { it.id.toLongOrNull() ?: 0L }
                    )
                val recentSeries = seriesItems
                    .sortedWith(
                        compareByDescending<MovieMetadata> { it.year.toIntOrNull() ?: 0 }
                            .thenByDescending { it.id.toLongOrNull() ?: 0L }
                    )
                val topRatedMovies = movieItems
                    .sortedByDescending { it.rating.toDoubleOrNull() ?: 0.0 }

                // 5. Hybrid rail contract (RN parity + stable deterministic order).
                appendSection(
                    sections = sections,
                    usedKeys = usedKeys,
                    title = "Live Channels",
                    sourceItems = recentLive,
                    maxItems = policy.itemsPerRail
                )
                appendSection(
                    sections = sections,
                    usedKeys = usedKeys,
                    title = "New Movies",
                    sourceItems = recentMovies,
                    maxItems = policy.itemsPerRail
                )
                appendSection(
                    sections = sections,
                    usedKeys = usedKeys,
                    title = "New Series",
                    sourceItems = recentSeries,
                    maxItems = policy.itemsPerRail
                )
                appendSection(
                    sections = sections,
                    usedKeys = usedKeys,
                    title = "Top Rated Movies",
                    sourceItems = topRatedMovies,
                    maxItems = policy.itemsPerRail
                )
                if (sections.isNotEmpty()) {
                    if (currentGeneration != loadGeneration) return@launch
                    _uiState.value = HomeUiState.Success(
                        heroMovie = hero,
                        heroCarousel = heroCarousel,
                        sections = sections.toList(),
                        isDegraded = isDegraded
                    )
                    logger.i(
                        "SmartiflyHomePerf",
                        "home_first_success profile=$profileId total_duration_ms=${System.currentTimeMillis() - bootstrapStartedAtMs} hero_present=${hero != null} sections=${sections.size} first_section=${sections.firstOrNull()?.title ?: "none"} first_items=${sections.firstOrNull()?.items?.size ?: 0}"
                    )
                    yield()
                    if (currentGeneration != loadGeneration) return@launch
                }
                // 6. Deterministic category rails (movies then series), shuffled for variety.
                val randomSeed = System.currentTimeMillis() / (1000L * 60L * 60L)
                val movieCategoryEntries = moviePoolByCategory.entries
                    .shuffled(java.util.Random(randomSeed))
                    .sortedByDescending { (_, items) -> items.size }
                    .take(6)
                val seriesCategoryEntries = seriesPoolByCategory.entries
                    .shuffled(java.util.Random(randomSeed + 1))
                    .sortedByDescending { (_, items) -> items.size }
                    .take(6)

                val targetRailCount = policy.totalRailsCap.coerceAtMost(12)
                val remainingRailSlots = (targetRailCount - sections.size).coerceAtLeast(0)
                val preferredMovieSlots = (remainingRailSlots * 2) / 3
                val preferredSeriesSlots = remainingRailSlots - preferredMovieSlots

                movieCategoryEntries
                    .take(preferredMovieSlots)
                    .forEach { (categoryName, items) ->
                        appendSectionWithFallback(
                            sections = sections,
                            usedKeys = usedKeys,
                            title = categoryName,
                            sourceItems = items,
                            maxItems = policy.itemsPerRail,
                            minUniqueItems = 4
                        )
                    }

                // 7. Series category rails.
                seriesCategoryEntries
                    .take(preferredSeriesSlots)
                    .forEach { (categoryName, items) ->
                        appendSectionWithFallback(
                            sections = sections,
                            usedKeys = usedKeys,
                            title = categoryName,
                            sourceItems = items,
                            maxItems = policy.itemsPerRail,
                            minUniqueItems = 4
                        )
                    }

                // Backfill to hit target rails if any chosen categories were too thin.
                if (sections.size < targetRailCount) {
                    val alreadyUsedTitles = sections.map { it.title }.toMutableSet()
                    val fallbackEntries = (movieCategoryEntries + seriesCategoryEntries)
                        .filterNot { alreadyUsedTitles.contains(it.key) }
                    for ((categoryName, items) in fallbackEntries) {
                        if (sections.size >= targetRailCount) break
                        appendSectionWithFallback(
                            sections = sections,
                            usedKeys = usedKeys,
                            title = categoryName,
                            sourceItems = items,
                            maxItems = policy.itemsPerRail,
                            minUniqueItems = 2
                        )
                        alreadyUsedTitles += categoryName
                    }
                }

                val onlyFallbackContent = sections.isEmpty() && fallbackHeroItems.isNotEmpty()

                if (onlyFallbackContent) {
                    sections += HomeSection(
                        title = "Featured",
                        items = fallbackHeroItems.take(policy.itemsPerRail.coerceAtLeast(1))
                    )
                }

                if (sections.isEmpty()) {
                    if (currentGeneration != loadGeneration) return@launch
                    _uiState.value = HomeUiState.Empty
                    return@launch
                }

                val rankResult = HomeRailRanker.rankWithDiagnostics(
                    sections = sections.toList(),
                    profileId = profileId,
                    policy = policy
                )
                val rankedSections = rankResult.sections

                logger.i(
                    "SmartiflyRails",
                    "rails_ranked profile=$profileId top=${rankResult.debugTopRails.joinToString(" | ") { "${it.title}:${"%.1f".format(it.totalScore)}" }}"
                )

                if (currentGeneration != loadGeneration) return@launch
                _uiState.value = HomeUiState.Success(
                    heroMovie = hero,
                    heroCarousel = heroCarousel,
                    sections = rankedSections,
                    isDegraded = isDegraded
                )
                logger.i(
                    "SmartiflyHomePerf",
                    "home_ranked_success profile=$profileId total_duration_ms=${System.currentTimeMillis() - bootstrapStartedAtMs} sections=${rankedSections.size} top_section=${rankedSections.firstOrNull()?.title ?: "none"} top_items=${rankedSections.firstOrNull()?.items?.size ?: 0} degraded=$isDegraded"
                )
                HomeFeedSnapshotCache.put(
                    profileId = profileId,
                    snapshot = HomeFeedSnapshot(
                        heroMovie = hero,
                        heroCarousel = heroCarousel,
                        sections = rankedSections,
                        storedAtMs = System.currentTimeMillis()
                    )
                )

                if (heroCarousel.isNotEmpty()) {
                    enrichHeroCarouselInBackground(
                        baseCarousel = heroCarousel,
                        generation = currentGeneration
                    )
                }
                enrichRailsInBackground(
                    generation = currentGeneration,
                    baseSections = rankedSections,
                    vodCategories = vodCategories,
                    seriesCategories = seriesCategories,
                    policy = policy,
                    hero = hero,
                    isDegraded = isDegraded
                )

                if (onlyFallbackContent) {
                    scheduleColdStartRetry(generation = currentGeneration)
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

    private fun scheduleColdStartRetry(generation: Int) {
        viewModelScope.launch(loadDispatcher) {
            kotlinx.coroutines.delay(HOME_COLD_START_RETRY_DELAY_MS)
            if (generation != loadGeneration) return@launch
            val current = _uiState.value as? HomeUiState.Success ?: return@launch
            if (current.sections.any { it.title != "Featured" }) return@launch
            loadHomeContent()
        }
    }

    private fun enrichHeroCarouselInBackground(baseCarousel: List<MovieMetadata>, generation: Int) {
        viewModelScope.launch(Dispatchers.IO) {
            val semaphore = Semaphore(HERO_ENRICH_CONCURRENCY)
            val enrichedCarousel = coroutineScope {
                baseCarousel.map { candidate ->
                    async {
                        semaphore.withPermit {
                            heroEnrichmentService.enrich(candidate) ?: candidate
                        }
                    }
                }.awaitAll()
            }
            if (generation != loadGeneration) return@launch

            val current = _uiState.value
            if (current is HomeUiState.Success) {
                val currentHeroId = current.heroMovie?.id
                val rankedCarousel = enrichedCarousel
                    .sortedWith(
                        compareByDescending<MovieMetadata> { it.id == currentHeroId }
                            .thenByDescending { it.description.isNotBlank() }
                            .thenByDescending { it.backdropUrl.isNotBlank() }
                            .thenByDescending { it.genre.isNotBlank() }
                            .thenByDescending { it.duration.isNotBlank() }
                            .thenByDescending { it.year.toIntOrNull() ?: 0 }
                            .thenByDescending { it.rating.toDoubleOrNull() ?: 0.0 }
                    )
                val strongCarousel = rankedCarousel.filter { it.description.isNotBlank() }
                val weakCarousel = rankedCarousel.filterNot { it.description.isNotBlank() }
                val promotedCarousel = (strongCarousel + weakCarousel)
                    .distinctBy { it.id }
                    .take(HERO_CAROUSEL_TARGET_SIZE)
                logger.i(
                    "SmartiflyHero",
                    "hero_carousel_enriched profile=$profileId count=${promotedCarousel.size} items=${promotedCarousel.joinToString(" | ") { "id=${it.id},desc=${it.description.isNotBlank()},backdrop=${it.backdropUrl.isNotBlank()},poster=${it.posterUrl.isNotBlank()}" }}"
                )
                _uiState.value = current.copy(
                    heroCarousel = promotedCarousel,
                    heroMovie = promotedCarousel.firstOrNull { it.id == currentHeroId } ?: current.heroMovie
                )
                HomeFeedSnapshotCache.put(
                    profileId = profileId,
                    snapshot = HomeFeedSnapshot(
                        heroMovie = promotedCarousel.firstOrNull { it.id == currentHeroId } ?: current.heroMovie,
                        heroCarousel = promotedCarousel,
                        sections = current.sections,
                        storedAtMs = System.currentTimeMillis()
                    )
                )
            }
        }
    }

    private fun buildHeroCarouselCandidates(
        primaryHero: MovieMetadata?,
        movies: List<MovieMetadata>,
        series: List<MovieMetadata>
    ): List<MovieMetadata> {
        val candidates = mutableListOf<MovieMetadata>()
        primaryHero?.let { candidates += it }
        (movies + series)
            .asSequence()
            .filter { it.type != "live" && it.backdropUrl.isNotBlank() }
            .distinctBy { it.id }
            .forEach { item ->
                if (candidates.none { it.id == item.id }) {
                    candidates += item
                }
            }
        return candidates.take(HERO_CAROUSEL_CANDIDATE_POOL_SIZE)
    }

    private fun isMeaningfulUpgrade(before: MovieMetadata, after: MovieMetadata): Boolean {
        if (after.backdropUrl.isNotBlank() && after.backdropUrl != before.backdropUrl) return true
        if (after.posterUrl.isNotBlank() && after.posterUrl != before.posterUrl) return true
        if (after.description.isNotBlank() && after.description != before.description) return true
        if (after.rating.isNotBlank() && after.rating != before.rating) return true
        if (after.year.isNotBlank() && after.year != before.year) return true
        if (after.genre.isNotBlank() && after.genre != before.genre) return true
        if (after.duration.isNotBlank() && after.duration != before.duration) return true
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

    private fun estimatePerCategoryDensity(categoryCount: Int, domain: String): Int {
        if (categoryCount <= 0) return 0
        return when (domain) {
            "vod" -> when {
                categoryCount >= 200 -> 70
                categoryCount >= 100 -> 55
                else -> 40
            }
            "series" -> when {
                categoryCount >= 200 -> 60
                categoryCount >= 100 -> 45
                else -> 30
            }
            "live" -> when {
                categoryCount >= 120 -> 35
                categoryCount >= 60 -> 25
                else -> 18
            }
            else -> 24
        }
    }

    private suspend fun loadMovieDomain(
        categories: List<MediaCategory>,
        policy: HomeRailPolicy
    ): DomainPoolResult {
        val targetPools = minOf(
            categories.size,
            maxOf(policy.movieCategoryRails * 3, policy.fetchMovieCategories * 2, 6)
        )
        return collectPoolsAndCore(
            categories = categories,
            desiredPools = targetPools,
            scanLimit = minOf((targetPools * 2).coerceAtLeast(targetPools), HOME_BOOTSTRAP_MOVIE_SCAN_CAP),
            coreTargetItems = policy.itemsPerRail * 2,
            fetch = { category ->
                awaitListResult(repository.getMoviesCached(category.id), timeoutMs = HOME_BOOTSTRAP_STREAM_TIMEOUT_MS)
                    .take(policy.fetchItemsPerCategory)
            }
        )
    }

    private suspend fun loadSeriesDomain(
        categories: List<MediaCategory>,
        policy: HomeRailPolicy
    ): DomainPoolResult {
        val targetPools = minOf(
            categories.size,
            maxOf(policy.seriesCategoryRails * 3, policy.fetchSeriesCategories * 2, 6)
        )
        return collectPoolsAndCore(
            categories = categories,
            desiredPools = targetPools,
            scanLimit = minOf((targetPools * 2).coerceAtLeast(targetPools), HOME_BOOTSTRAP_SERIES_SCAN_CAP),
            coreTargetItems = policy.itemsPerRail * 2,
            fetch = { category ->
                awaitListResult(repository.getSeriesCached(category.id), timeoutMs = HOME_BOOTSTRAP_STREAM_TIMEOUT_MS)
                    .take(policy.fetchItemsPerCategory)
            }
        )
    }

    private suspend fun loadLiveDomain(
        categories: List<MediaCategory>,
        policy: HomeRailPolicy
    ): DomainPoolResult {
        return collectPoolsAndCore(
            categories = categories,
            desiredPools = policy.fetchLiveCategories,
            scanLimit = minOf(
                (policy.fetchLiveCategories * 2).coerceAtLeast(policy.fetchLiveCategories),
                HOME_BOOTSTRAP_LIVE_SCAN_CAP
            ),
            coreTargetItems = policy.itemsPerRail * 2,
            fetch = { category ->
                awaitListResult(repository.getLiveStreamsCached(category.id), timeoutMs = HOME_BOOTSTRAP_STREAM_TIMEOUT_MS)
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

    private fun appendSectionWithFallback(
        sections: MutableList<HomeSection>,
        usedKeys: MutableSet<String>,
        title: String,
        sourceItems: List<MovieMetadata>,
        maxItems: Int,
        minUniqueItems: Int
    ) {
        if (sourceItems.isEmpty()) return
        val unique = sourceItems
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

        val picked = if (unique.size >= minUniqueItems) {
            unique
        } else {
            sourceItems.take(maxItems)
        }

        if (picked.isNotEmpty()) {
            sections += HomeSection(title = title, items = picked)
        }
    }

    private suspend fun collectPoolsAndCore(
        categories: List<MediaCategory>,
        desiredPools: Int,
        scanLimit: Int,
        coreTargetItems: Int,
        fetch: suspend (MediaCategory) -> List<MovieMetadata>
    ): DomainPoolResult {
        val pools = linkedMapOf<String, List<MovieMetadata>>()
        val coreItems = mutableListOf<MovieMetadata>()
        if (categories.isEmpty() || (desiredPools <= 0 && coreTargetItems <= 0)) {
            return DomainPoolResult(pools = emptyMap(), coreItems = emptyList())
        }

        val cappedScan = minOf(categories.size, scanLimit)
        for (category in categories.take(cappedScan)) {
            if (pools.size >= desiredPools && coreItems.size >= coreTargetItems) break
            val items = fetch(category)
            if (items.isNotEmpty()) {
                if (pools.size < desiredPools) {
                    pools[category.name] = items
                }
                if (coreItems.size < coreTargetItems) {
                    val remaining = (coreTargetItems - coreItems.size).coerceAtLeast(0)
                    if (remaining > 0) {
                        coreItems += items.take(remaining)
                    }
                }
            }
        }
        return DomainPoolResult(
            pools = pools,
            coreItems = coreItems
        )
    }

    private fun enrichRailsInBackground(
        generation: Int,
        baseSections: List<HomeSection>,
        vodCategories: List<MediaCategory>,
        seriesCategories: List<MediaCategory>,
        policy: HomeRailPolicy,
        hero: MovieMetadata?,
        isDegraded: Boolean
    ) {
        viewModelScope.launch(loadDispatcher) {
            if (generation != loadGeneration) return@launch
            val moviePools = collectPoolsAndCore(
                categories = vodCategories,
                desiredPools = minOf(vodCategories.size, maxOf(policy.movieCategoryRails * 4, 10)),
                scanLimit = minOf(vodCategories.size, HOME_ENRICH_MOVIE_SCAN_CAP),
                coreTargetItems = 0,
                fetch = { category ->
                    awaitListResult(
                        repository.getMoviesCached(category.id),
                        timeoutMs = HOME_ENRICH_STREAM_TIMEOUT_MS
                    ).take(policy.itemsPerRail)
                }
            ).pools
            val seriesPools = collectPoolsAndCore(
                categories = seriesCategories,
                desiredPools = minOf(seriesCategories.size, maxOf(policy.seriesCategoryRails * 4, 10)),
                scanLimit = minOf(seriesCategories.size, HOME_ENRICH_SERIES_SCAN_CAP),
                coreTargetItems = 0,
                fetch = { category ->
                    awaitListResult(
                        repository.getSeriesCached(category.id),
                        timeoutMs = HOME_ENRICH_STREAM_TIMEOUT_MS
                    ).take(policy.itemsPerRail)
                }
            ).pools

            if (generation != loadGeneration) return@launch
            val merged = baseSections.toMutableList()
            val usedKeys = mutableSetOf<String>()
            merged.forEach { section ->
                section.items.forEach { item ->
                    usedKeys += ContentIdentity.key(
                        providerKey = profileId,
                        type = item.type,
                        id = item.id,
                        title = item.title
                    )
                }
            }
            val targetRailCount = policy.totalRailsCap.coerceAtMost(12)
            val candidateEntries = (moviePools.entries + seriesPools.entries)
                .filterNot { entry -> merged.any { it.title == entry.key } }
                .sortedByDescending { (_, items) -> items.size }

            for ((categoryName, items) in candidateEntries) {
                if (merged.size >= targetRailCount) break
                appendSectionWithFallback(
                    sections = merged,
                    usedKeys = usedKeys,
                    title = categoryName,
                    sourceItems = items,
                    maxItems = policy.itemsPerRail,
                    minUniqueItems = 3
                )
            }
            val ranked = HomeRailRanker.rankWithDiagnostics(
                sections = merged.toList(),
                profileId = profileId,
                policy = policy
            ).sections
            val current = _uiState.value
            if (generation != loadGeneration || current !is HomeUiState.Success) return@launch
            if (ranked.size <= current.sections.size) return@launch
            _uiState.value = current.copy(
                heroMovie = hero ?: current.heroMovie,
                sections = ranked,
                isDegraded = isDegraded
            )
            HomeFeedSnapshotCache.put(
                profileId = profileId,
                snapshot = HomeFeedSnapshot(
                    heroMovie = hero ?: current.heroMovie,
                    heroCarousel = current.heroCarousel,
                    sections = ranked,
                    storedAtMs = System.currentTimeMillis()
                )
            )
        }
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
