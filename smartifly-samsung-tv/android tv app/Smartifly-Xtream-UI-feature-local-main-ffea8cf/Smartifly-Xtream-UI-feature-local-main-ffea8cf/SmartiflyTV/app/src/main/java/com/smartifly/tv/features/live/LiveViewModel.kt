package com.smartifly.tv.features.live

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartifly.tv.BuildConfig
import com.smartifly.tv.data.cache.CacheBudgetPolicy
import com.smartifly.tv.data.models.LiveStream
import com.smartifly.tv.data.models.MediaCategory
import com.smartifly.tv.data.remote.NetworkResult
import com.smartifly.tv.data.remote.models.XtreamLiveStream
import com.smartifly.tv.data.repository.LiveDataSource
import com.smartifly.tv.data.hero.HeroImageResolver
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

private const val PAGE_SIZE = CacheBudgetPolicy.LIVE_PAGE_SIZE
private const val INITIAL_PAGE_SIZE = CacheBudgetPolicy.LIVE_INITIAL_PAGE_SIZE
private const val CATEGORY_TTL_MS = 3 * 60 * 1000L
private const val EPG_TTL_MS = 60 * 1000L
private const val STUCK_LOADING_TIMEOUT_MS = 15_000L
private const val FAVORITES_CATEGORY_ID = "__favorites__"
private val LIVE_DEBUG_TRACE = BuildConfig.LIVE_DEBUG_TRACE

class LiveViewModel(
    private val repository: LiveDataSource
) : ViewModel() {
    companion object {
        private data class PortalCapability(
            val paginationMode: PaginationMode,
            val updatedAtMs: Long
        )
        private const val PORTAL_CAPABILITY_TTL_MS = 15 * 60 * 1000L
        private val portalCapabilities = mutableMapOf<String, PortalCapability>()
    }

    private val _uiState = MutableStateFlow<LiveUiState>(LiveUiState.Loading)
    val uiState: StateFlow<LiveUiState> = _uiState.asStateFlow()

    private data class CategoryPageState(
        val items: List<LiveStream> = emptyList(),
        val page: Int = 0,
        val hasMore: Boolean = false,
        val initialized: Boolean = false,
        val loading: Boolean = false,
        val loadingMore: Boolean = false,
        val loadingStartedAtMs: Long = 0L,
        val error: String? = null,
        val fetchedAtMs: Long = 0L,
        val paginationMode: PaginationMode = PaginationMode.PAGED
    )

    private enum class PaginationMode { PAGED, SNAPSHOT }

    private var categoriesJob: Job? = null
    private var favoritesJob: Job? = null
    private var loadJob: Job? = null
    private var epgJob: Job? = null

    private var selectedCategoryId: String = ""
    private var categories: List<MediaCategory> = emptyList()
    private var backendCategories: List<MediaCategory> = emptyList()
    private val pagesByCategory = mutableMapOf<String, CategoryPageState>()
    private val epgCache = mutableMapOf<String, Pair<Long, List<com.smartifly.tv.features.live.epg.EpgProgram>>>()
    private var favoriteChannels: List<LiveStream> = emptyList()
    private var portalKey: String = "unknown"
    private var focusedChannelId: String? = null
    private var requestSequence: Long = 0L
    private val activeRequestByCategory = mutableMapOf<String, Long>()
    private var startupCategorySelected = false

    init {
        cleanupExpiredPortalCapability()
        logLive("init", "LiveViewModel initialized")
        observeFavorites()
        observeCategories()
    }

    private fun observeFavorites() {
        favoritesJob?.cancel()
        favoritesJob = viewModelScope.launch {
            repository.getLiveFavorites().collect { result ->
                when (result) {
                    is NetworkResult.Success -> {
                        favoriteChannels = result.data
                            .distinctBy { it.id }
                            .sortedBy { it.name.lowercase() }
                        if (_uiState.value is LiveUiState.Success || selectedCategoryId == FAVORITES_CATEGORY_ID) {
                            emitSuccess()
                        }
                    }
                    is NetworkResult.Error -> {
                        logLive("favorites_error", "message=${result.message}")
                    }
                    is NetworkResult.Loading -> Unit
                }
            }
        }
    }

    private fun buildVisibleCategories(backend: List<MediaCategory>): List<MediaCategory> {
        val favoriteCategory = MediaCategory(id = FAVORITES_CATEGORY_ID, name = "Favorites")
        return listOf(favoriteCategory) + backend.filterNot { it.id == FAVORITES_CATEGORY_ID }
    }

    private fun observeCategories() {
        categoriesJob?.cancel()
        categoriesJob = viewModelScope.launch {
            repository.getLiveCategories().collect { result ->
                when (result) {
                    is NetworkResult.Success -> {
                        val backend = result.data.distinctBy { it.id }.sortedBy { it.name.lowercase() }
                        backendCategories = backend
                        categories = buildVisibleCategories(backend)
                        logLive("categories", "loaded=${backend.size} selected=$selectedCategoryId")

                        if (backendCategories.isEmpty() && favoriteChannels.isEmpty()) {
                            pagesByCategory.clear()
                            selectedCategoryId = ""
                            _uiState.value = LiveUiState.Empty
                            return@collect
                        }

                        if (categories.none { it.id == selectedCategoryId }) {
                            selectedCategoryId = backendCategories.firstOrNull()?.id ?: FAVORITES_CATEGORY_ID
                        }

                        // First successful category snapshot selects once.
                        if (!startupCategorySelected) {
                            startupCategorySelected = true
                            selectedCategoryId = backendCategories.firstOrNull()?.id ?: FAVORITES_CATEGORY_ID
                            logLive("startup_category", "selected=$selectedCategoryId")
                            if (selectedCategoryId == FAVORITES_CATEGORY_ID) {
                                emitSuccess()
                            } else {
                                loadCategoryPage(
                                    categoryId = selectedCategoryId,
                                    page = 1,
                                    replace = true,
                                    forceRefresh = true
                                )
                            }
                        } else {
                            if (selectedCategoryId == FAVORITES_CATEGORY_ID) {
                                emitSuccess()
                                return@collect
                            }
                            val currentState = pagesByCategory[selectedCategoryId]
                            val now = System.currentTimeMillis()
                            val loadingStuck = currentState?.loading == true &&
                                currentState.loadingStartedAtMs > 0L &&
                                (now - currentState.loadingStartedAtMs) > STUCK_LOADING_TIMEOUT_MS
                            if (
                                currentState?.initialized != true &&
                                (currentState?.loading != true || loadingStuck)
                            ) {
                                if (loadingStuck) {
                                    logLive("startup_recover", "stale loading detected; forcing reload for $selectedCategoryId")
                                }
                                loadCategoryPage(
                                    categoryId = selectedCategoryId,
                                    page = 1,
                                    replace = true,
                                    forceRefresh = true
                                )
                            } else {
                                emitSuccess()
                            }
                        }
                    }
                    is NetworkResult.Error -> {
                        if (_uiState.value is LiveUiState.Loading) {
                            _uiState.value = LiveUiState.Error(result.message)
                        } else {
                            val current = pagesByCategory[selectedCategoryId] ?: CategoryPageState()
                            pagesByCategory[selectedCategoryId] = current.copy(error = result.message)
                            emitSuccess()
                        }
                    }
                    is NetworkResult.Loading -> {
                        if (_uiState.value is LiveUiState.Loading) {
                            _uiState.value = LiveUiState.Loading
                        }
                    }
                }
            }
        }
    }

    fun loadChannelsByCategory(categoryId: String) {
        if (categoryId.isBlank()) return
        if (selectedCategoryId != categoryId) {
            focusedChannelId = null
        }
        logLive("category_select", "from=$selectedCategoryId to=$categoryId")
        selectedCategoryId = categoryId
        if (categoryId == FAVORITES_CATEGORY_ID) {
            emitSuccess()
            return
        }
        val current = pagesByCategory[categoryId]
        if (current?.initialized == true) {
            emitSuccess()
            val now = System.currentTimeMillis()
            if (now - current.fetchedAtMs > CATEGORY_TTL_MS) {
                logLive("category_refresh", "category=$categoryId staleMs=${now - current.fetchedAtMs}")
                loadCategoryPage(categoryId = categoryId, page = 1, replace = true, forceRefresh = false)
            }
            return
        }
        loadCategoryPage(categoryId = categoryId, page = 1, replace = true, forceRefresh = true)
    }

    fun loadMoreCurrentCategory() {
        if (selectedCategoryId == FAVORITES_CATEGORY_ID) return
        val current = pagesByCategory[selectedCategoryId] ?: return
        if (!current.initialized || current.loading || current.loadingMore || !current.hasMore) return
        loadCategoryPage(
            categoryId = selectedCategoryId,
            page = current.page + 1,
            replace = false,
            forceRefresh = false
        )
    }

    private fun loadCategoryPage(
        categoryId: String,
        page: Int,
        replace: Boolean,
        forceRefresh: Boolean
    ) {
        if (categoryId == FAVORITES_CATEGORY_ID) {
            emitSuccess()
            return
        }
        loadJob?.cancel()
        val existing = pagesByCategory[categoryId] ?: CategoryPageState()
        val portalMode = getPortalPaginationMode()
        val effectiveExisting = if (existing.initialized) existing else existing.copy(paginationMode = portalMode)
        logLive(
            "page_load_start",
            "category=$categoryId page=$page replace=$replace hasMore=${effectiveExisting.hasMore} mode=${effectiveExisting.paginationMode}"
        )
        if (effectiveExisting.paginationMode == PaginationMode.SNAPSHOT && page > 1) {
            logLive("page_skip", "category=$categoryId page=$page reason=snapshot_mode")
            return
        }
        pagesByCategory[categoryId] = effectiveExisting.copy(
            loading = page == 1,
            loadingMore = page > 1,
            loadingStartedAtMs = System.currentTimeMillis(),
            error = null
        )
        emitSuccess()

        val requestId = ++requestSequence
        activeRequestByCategory[categoryId] = requestId
        logLive("request_open", "category=$categoryId page=$page requestId=$requestId")
        loadJob = viewModelScope.launch {
            portalKey = runCatching { repository.getPortalCapabilityKey() }.getOrDefault(portalKey)
            val portalModeForRequest = getPortalPaginationMode()
            val requestedPageSize = if (page == 1 && !effectiveExisting.initialized) {
                INITIAL_PAGE_SIZE
            } else {
                PAGE_SIZE
            }
            repository.getLiveStreams(
                categoryId = categoryId,
                page = page,
                pageSize = requestedPageSize
            ).collect { result ->
                if (activeRequestByCategory[categoryId] != requestId) {
                    logLive("request_drop", "category=$categoryId page=$page requestId=$requestId reason=stale")
                    return@collect
                }
                when (result) {
                    is NetworkResult.Success -> {
                        val mapped = result.data.map { it.toDomainLive() }
                        val merged = if (replace) {
                            dedupeById(mapped)
                        } else {
                            dedupeById(effectiveExisting.items + mapped)
                        }.take(CacheBudgetPolicy.LIVE_MAX_CHANNELS_PER_CATEGORY)

                        val hasMore = if (result.data.isEmpty()) {
                            false
                        } else {
                            // If server doesn't paginate correctly, avoid endless load-more loops.
                            val serverLooksPaginated = result.data.size <= requestedPageSize
                            if (!serverLooksPaginated && page > 1) false else result.data.size >= requestedPageSize
                        }

                        val likelySnapshotMode = when {
                            page == 1 && result.data.size > requestedPageSize -> true
                            page > 1 && mapped.isNotEmpty() && effectiveExisting.items.isNotEmpty() &&
                                mapped.all { next -> effectiveExisting.items.any { it.id == next.id } } -> true
                            else -> false
                        }
                        val mode = if (likelySnapshotMode) PaginationMode.SNAPSHOT else portalModeForRequest
                        setPortalPaginationMode(mode)
                        logLive(
                            "request_success",
                            "category=$categoryId page=$page items=${mapped.size} merged=${merged.size} hasMore=$hasMore mode=$mode"
                        )

                        pagesByCategory[categoryId] = CategoryPageState(
                            items = merged,
                            page = page,
                            hasMore = hasMore && mode == PaginationMode.PAGED,
                            initialized = true,
                            loading = false,
                            loadingMore = false,
                            loadingStartedAtMs = 0L,
                            error = null,
                            fetchedAtMs = System.currentTimeMillis(),
                            paginationMode = mode
                        )

                        emitSuccess()
                    }
                    is NetworkResult.Error -> {
                        logLive("request_error", "category=$categoryId page=$page message=${result.message}")
                        pagesByCategory[categoryId] = effectiveExisting.copy(
                            initialized = effectiveExisting.initialized,
                            loading = false,
                            loadingMore = false,
                            loadingStartedAtMs = 0L,
                            error = result.message
                        )
                        emitSuccess()
                    }
                    is NetworkResult.Loading -> Unit
                }
            }
        }
    }

    private fun emitSuccess() {
        val selected = pagesByCategory[selectedCategoryId] ?: CategoryPageState()
        val favoriteIds = favoriteChannels.asSequence().map { it.id }.toSet()
        val isFavoritesCategory = selectedCategoryId == FAVORITES_CATEGORY_ID
        val previousSuccess = _uiState.value as? LiveUiState.Success
        val retainedEpg = if (
            focusedChannelId != null && (if (isFavoritesCategory) favoriteChannels else selected.items).any { it.id == focusedChannelId }
        ) {
            previousSuccess?.focusedChannelEpg ?: emptyList()
        } else {
            emptyList()
        }
        _uiState.value = LiveUiState.Success(
            categories = categories,
            selectedCategoryId = selectedCategoryId,
            channels = if (isFavoritesCategory) favoriteChannels else selected.items,
            isLoadingChannels = if (isFavoritesCategory) false else selected.loading,
            isLoadingMore = if (isFavoritesCategory) false else selected.loadingMore,
            hasMore = if (isFavoritesCategory) false else selected.hasMore,
            categoryError = if (isFavoritesCategory) null else selected.error,
            favoriteChannelIds = favoriteIds,
            focusedChannelEpg = retainedEpg
        )
    }

    fun onChannelFocused(channel: LiveStream) {
        focusedChannelId = channel.id
        logLive("focus", "category=$selectedCategoryId channel=${channel.id}")
        val currentState = _uiState.value
        if (currentState !is LiveUiState.Success) return

        val now = System.currentTimeMillis()
        val cached = epgCache[channel.id]
        if (cached != null && now - cached.first <= EPG_TTL_MS) {
            _uiState.value = currentState.copy(focusedChannelEpg = cached.second)
            return
        }

        epgJob?.cancel()
        epgJob = viewModelScope.launch {
            kotlinx.coroutines.delay(300)
            repository.getShortEpg(channel.id.toIntOrNull() ?: return@launch).collect { result ->
                if (result is NetworkResult.Success) {
                    if (epgCache.size >= CacheBudgetPolicy.LIVE_EPG_MAX_CHANNELS) {
                        val oldestKey = epgCache.minByOrNull { it.value.first }?.key
                        if (oldestKey != null) epgCache.remove(oldestKey)
                    }
                    epgCache[channel.id] = System.currentTimeMillis() to result.data
                    val latest = _uiState.value
                    if (latest is LiveUiState.Success) {
                        _uiState.value = latest.copy(focusedChannelEpg = result.data)
                    }
                }
            }
        }
    }

    fun toggleFavorite(channel: LiveStream, onToggled: (Boolean) -> Unit = {}) {
        viewModelScope.launch {
            val isFavorite = favoriteChannels.any { it.id == channel.id }
            val target = !isFavorite
            runCatching { repository.setLiveFavorite(channel.id, target) }
                .onSuccess {
                    onToggled(target)
                }
                .onFailure { error ->
                    logLive("favorite_error", "channel=${channel.id} message=${error.message}")
                }
        }
    }

    private fun dedupeById(items: List<LiveStream>): List<LiveStream> {
        val seen = LinkedHashSet<String>()
        return items.filter { seen.add(it.id) }
    }

    private fun getPortalPaginationMode(): PaginationMode {
        val capability = portalCapabilities[portalKey] ?: return PaginationMode.PAGED
        val fresh = System.currentTimeMillis() - capability.updatedAtMs <= PORTAL_CAPABILITY_TTL_MS
        return if (fresh) capability.paginationMode else PaginationMode.PAGED
    }

    private fun setPortalPaginationMode(mode: PaginationMode) {
        portalCapabilities[portalKey] = PortalCapability(
            paginationMode = mode,
            updatedAtMs = System.currentTimeMillis()
        )
    }

    private fun cleanupExpiredPortalCapability() {
        val now = System.currentTimeMillis()
        portalCapabilities.entries.removeIf { (_, value) ->
            now - value.updatedAtMs > PORTAL_CAPABILITY_TTL_MS
        }
    }

    private fun logLive(event: String, message: String) {
        if (!BuildConfig.DEBUG || !LIVE_DEBUG_TRACE) return
        android.util.Log.d("SmartiflyLive", "[$event] $message")
    }

    override fun onCleared() {
        disposeForScreenExit()
        logLive("lifecycle", "LiveViewModel cleared")
        super.onCleared()
    }

    fun disposeForScreenExit() {
        categoriesJob?.cancel()
        favoritesJob?.cancel()
        loadJob?.cancel()
        epgJob?.cancel()
        activeRequestByCategory.clear()
        pagesByCategory.clear()
        epgCache.clear()
        categories = emptyList()
        backendCategories = emptyList()
        favoriteChannels = emptyList()
        focusedChannelId = null
        selectedCategoryId = ""
        startupCategorySelected = false
        _uiState.value = LiveUiState.Loading
        logLive("lifecycle", "LiveViewModel disposed for screen exit")
    }
}

private fun XtreamLiveStream.toDomainLive(): LiveStream {
    val normalizedLogo = HeroImageResolver.normalizeImageUrl(streamIcon) ?: ""
    return LiveStream(
        id = streamId.toString(),
        name = name,
        logoUrl = normalizedLogo,
        categoryId = categoryId,
        streamType = streamType ?: "live",
        archiveAvailable = tvArchive == 1,
        archiveDuration = tvArchiveDuration
    )
}
