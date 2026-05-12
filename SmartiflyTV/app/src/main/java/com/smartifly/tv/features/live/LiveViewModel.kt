package com.smartifly.tv.features.live

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartifly.tv.BuildConfig
import com.smartifly.tv.data.models.LiveStream
import com.smartifly.tv.data.models.MediaCategory
import com.smartifly.tv.data.remote.NetworkResult
import com.smartifly.tv.data.remote.models.XtreamLiveStream
import com.smartifly.tv.data.repository.XtreamRepository
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

private const val ALL_CATEGORY_ID = "all"
private const val PAGE_SIZE = 120
private const val CATEGORY_TTL_MS = 3 * 60 * 1000L
private const val EPG_TTL_MS = 60 * 1000L
private const val STUCK_LOADING_TIMEOUT_MS = 15_000L
private const val LIVE_DEBUG_TRACE = true

class LiveViewModel(
    private val repository: XtreamRepository
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
    private var loadJob: Job? = null
    private var epgJob: Job? = null

    private var selectedCategoryId: String = ALL_CATEGORY_ID
    private var categories: List<MediaCategory> = listOf(MediaCategory(id = ALL_CATEGORY_ID, name = "All"))
    private val pagesByCategory = mutableMapOf<String, CategoryPageState>()
    private val epgCache = mutableMapOf<String, Pair<Long, List<com.smartifly.tv.features.live.epg.EpgProgram>>>()
    private var portalKey: String = "unknown"
    private var focusedChannelId: String? = null
    private var requestSequence: Long = 0L
    private val activeRequestByCategory = mutableMapOf<String, Long>()

    init {
        cleanupExpiredPortalCapability()
        logLive("init", "LiveViewModel initialized")
        observeCategories()
    }

    private fun observeCategories() {
        categoriesJob?.cancel()
        categoriesJob = viewModelScope.launch {
            repository.getLiveCategories().collect { result ->
                when (result) {
                    is NetworkResult.Success -> {
                        val backend = result.data.distinctBy { it.id }.sortedBy { it.name.lowercase() }
                        categories = listOf(MediaCategory(id = ALL_CATEGORY_ID, name = "All")) + backend
                        logLive("categories", "loaded=${backend.size} selected=$selectedCategoryId")

                        if (categories.none { it.id == selectedCategoryId }) {
                            selectedCategoryId = ALL_CATEGORY_ID
                        }

                        // First successful category snapshot selects once.
                        val allState = pagesByCategory[ALL_CATEGORY_ID]
                        val now = System.currentTimeMillis()
                        val loadingStuck = allState?.loading == true &&
                            allState.loadingStartedAtMs > 0L &&
                            (now - allState.loadingStartedAtMs) > STUCK_LOADING_TIMEOUT_MS
                        if (
                            selectedCategoryId == ALL_CATEGORY_ID &&
                            (
                                allState?.initialized != true &&
                                    (allState?.loading != true || loadingStuck)
                                )
                        ) {
                            if (loadingStuck) {
                                logLive("startup_recover", "stale loading detected for ALL; forcing reload")
                            }
                            loadCategoryPage(categoryId = ALL_CATEGORY_ID, page = 1, replace = true, forceRefresh = true)
                        } else {
                            emitSuccess()
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
        if (selectedCategoryId != categoryId) {
            focusedChannelId = null
        }
        logLive("category_select", "from=$selectedCategoryId to=$categoryId")
        selectedCategoryId = categoryId
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
            repository.getLiveStreams(
                categoryId = if (categoryId == ALL_CATEGORY_ID) null else categoryId,
                page = page,
                pageSize = PAGE_SIZE
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
                        }

                        val hasMore = if (result.data.isEmpty()) {
                            false
                        } else {
                            // If server doesn't paginate correctly, avoid endless load-more loops.
                            val serverLooksPaginated = result.data.size <= PAGE_SIZE
                            if (!serverLooksPaginated && page > 1) false else result.data.size >= PAGE_SIZE
                        }

                        val likelySnapshotMode = when {
                            page == 1 && result.data.size > PAGE_SIZE -> true
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

                        if (selectedCategoryId == categoryId && merged.isNotEmpty() && (replace || forceRefresh)) {
                            onChannelFocused(merged.first())
                        }

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
        val previousSuccess = _uiState.value as? LiveUiState.Success
        val retainedEpg = if (
            focusedChannelId != null && selected.items.any { it.id == focusedChannelId }
        ) {
            previousSuccess?.focusedChannelEpg ?: emptyList()
        } else {
            emptyList()
        }
        _uiState.value = LiveUiState.Success(
            categories = categories,
            selectedCategoryId = selectedCategoryId,
            channels = selected.items,
            isLoadingChannels = selected.loading,
            isLoadingMore = selected.loadingMore,
            hasMore = selected.hasMore,
            categoryError = selected.error,
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
                    epgCache[channel.id] = System.currentTimeMillis() to result.data
                    val latest = _uiState.value
                    if (latest is LiveUiState.Success) {
                        _uiState.value = latest.copy(focusedChannelEpg = result.data)
                    }
                }
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
        loadJob?.cancel()
        epgJob?.cancel()
        activeRequestByCategory.clear()
        pagesByCategory.clear()
        epgCache.clear()
        focusedChannelId = null
        selectedCategoryId = ALL_CATEGORY_ID
        _uiState.value = LiveUiState.Loading
        logLive("lifecycle", "LiveViewModel disposed for screen exit")
    }
}

private fun XtreamLiveStream.toDomainLive(): LiveStream {
    return LiveStream(
        id = streamId.toString(),
        name = name,
        logoUrl = streamIcon ?: "",
        categoryId = categoryId,
        streamType = streamType ?: "live",
        archiveAvailable = tvArchive == 1,
        archiveDuration = tvArchiveDuration
    )
}
