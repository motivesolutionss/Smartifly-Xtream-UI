package com.smartifly.tv.feature.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.smartifly.tv.core.update.AndroidUpdateInstaller
import com.smartifly.tv.domain.model.AuthSession
import com.smartifly.tv.domain.model.CatalogItem
import com.smartifly.tv.domain.model.HomeRail
import com.smartifly.tv.domain.model.PlaybackSession
import com.smartifly.tv.domain.model.TvDownloadItem
import com.smartifly.tv.domain.model.TvDownloadStatus
import com.smartifly.tv.domain.model.WatchHistoryEntry
import com.smartifly.tv.domain.provider.DeviceProvider
import com.smartifly.tv.domain.repository.CatalogRepository
import com.smartifly.tv.domain.repository.DownloadsRepository
import com.smartifly.tv.domain.repository.FavoritesRepository
import com.smartifly.tv.domain.repository.MasterControlRepository
import com.smartifly.tv.domain.repository.ProfileRepository
import com.smartifly.tv.domain.repository.SettingsRepository
import com.smartifly.tv.domain.repository.WatchHistoryRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class HomeViewModel(
    private val session: AuthSession,
    private val catalogRepository: CatalogRepository,
    private val profileRepository: ProfileRepository,
    private val favoritesRepository: FavoritesRepository,
    private val settingsRepository: SettingsRepository,
    private val downloadsRepository: DownloadsRepository,
    private val watchHistoryRepository: WatchHistoryRepository,
    private val updateInstaller: AndroidUpdateInstaller,
    private val deviceProvider: DeviceProvider,
    private val masterControlRepository: MasterControlRepository,
    private val preferences: com.smartifly.tv.data.local.AppPreferencesDataSource,
) : ViewModel() {
    private val _state = MutableStateFlow(HomeState())
    val state: StateFlow<HomeState> = _state.asStateFlow()
    private var hasShownInitialBroadcast = false

    init {
        _state.update {
            it.copy(
                accountSummary = AccountSummary(
                    serverLabel = session.portalName.ifBlank { "Smartifly service" },
                    username = session.username,
                    expDate = session.expDate,
                    maxConnections = session.maxConnections,
                    activeConnections = session.activeConnections,
                )
            )
        }
        observeFavorites()
        observeSettings()
        observeDownloads()
        observeWatchHistory()
        hydrateFromCachedCatalog()
        refreshCatalog()
        refreshDownloads()
        checkForUpdates()
        refreshAnnouncements()
        observeActiveProfile()
        observeReadAnnouncements()
    }

    private fun observeActiveProfile() {
        viewModelScope.launch {
            profileRepository.profileSetFlow.collect { set ->
                val profile = set.profiles.find { it.id == set.activeProfileId }
                _state.update { it.copy(activeProfile = profile) }
                // Re-apply filters when profile changes
                reFilterContent()
            }
        }
    }

    private fun observeReadAnnouncements() {
        viewModelScope.launch {
            preferences.readAnnouncementsFlow.collect { readIds ->
                val alreadyMarked = _state.value.readAnnouncementIds
                _state.update { it.copy(readAnnouncementIds = readIds) }
                
                // If any current active broadcast was just marked as read, dismiss it
                val currentActive = _state.value.activeBroadcast
                if (currentActive != null && readIds.contains(currentActive.id.toString())) {
                    dismissBroadcast()
                }
                
                // If this is the first time we get theIDs or they changed, re-fetch/filter
                if (alreadyMarked != readIds) {
                    refreshAnnouncements()
                }
            }
        }
    }

    private fun reFilterContent() {
        _state.update { current ->
            val profile = current.activeProfile ?: return@update current
            val filteredItems = current.rawAllItems.filter { isAllowed(it, profile) }
            current.copy(
                rails = filterRails(current.rawRails, profile),
                hero = current.rawHero?.takeIf { isAllowed(it, profile) },
                allItems = filteredItems,
                searchResults = filterResults(current.searchQuery, filteredItems),
            )
        }
    }

    private fun isAllowed(item: CatalogItem, profile: com.smartifly.tv.domain.model.UserProfile): Boolean {
        return com.smartifly.tv.core.policy.ContentRatingHelper.isAllowed(
            contentRating = item.contentRating,
            isKidsProfile = profile.isKidsProfile,
            maxRating = profile.maxRating,
        )
    }

    private fun filterRails(
        rails: List<HomeRail>,
        profile: com.smartifly.tv.domain.model.UserProfile
    ): List<HomeRail> {
        return rails.map { rail ->
            rail.copy(items = rail.items.filter { isAllowed(it, profile) })
        }.filter { it.items.isNotEmpty() }
    }

    private fun observeFavorites() {
        viewModelScope.launch {
            favoritesRepository.favoritesFlow.collect { favorites ->
                _state.update { it.copy(favorites = favorites) }
            }
        }
    }

    private fun observeSettings() {
        viewModelScope.launch {
            settingsRepository.settingsFlow.collect { settings ->
                _state.update { it.copy(appSettings = settings) }
            }
        }
    }

    private fun observeDownloads() {
        viewModelScope.launch {
            downloadsRepository.downloadsFlow.collect { downloads ->
                _state.update {
                    it.copy(
                        downloads = downloads,
                        downloadSummary = computeDownloadSummary(downloads),
                    )
                }
            }
        }
    }

    private fun observeWatchHistory() {
        viewModelScope.launch {
            watchHistoryRepository.historyFlow.collect { history ->
                _state.update {
                    it.copy(
                        continueWatching = history
                            .filter { entry -> entry.type != "live" }
                            .sortedByDescending { entry -> entry.lastUpdated }
                            .distinctBy { entry -> entry.id }
                            .take(12)
                            .map(::historyToCatalogItem)
                    )
                }
            }
        }
    }

    fun setTab(tab: HomeTab) {
        _state.update { it.copy(activeTab = tab) }
    }

    fun refreshCatalog() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, errorMessage = null) }
            val result = catalogRepository.loadHomeCatalog(session)

            result.onSuccess { data ->
                _state.update {
                    it.copy(
                        isLoading = false,
                        rawHero = data.hero,
                        rawRails = data.rails,
                        rawAllItems = data.allItems,
                        hero = data.hero?.takeIf { h -> it.activeProfile?.let { p -> isAllowed(h, p) } ?: true },
                        rails = it.activeProfile?.let { p -> filterRails(data.rails, p) } ?: data.rails,
                        allItems = it.activeProfile?.let { p -> data.allItems.filter { item -> isAllowed(item, p) } } ?: data.allItems,
                        searchResults = filterResults(
                            query = it.searchQuery,
                            items = it.activeProfile?.let { p -> data.allItems.filter { item -> isAllowed(item, p) } } ?: data.allItems,
                        ),
                    )
                }
            }.onFailure { error ->
                _state.update {
                    it.copy(
                        isLoading = false,
                        errorMessage = error.message ?: "Failed to load TV catalog.",
                    )
                }
            }
        }
    }

    private fun hydrateFromCachedCatalog() {
        viewModelScope.launch {
            val cached = catalogRepository.getCachedHomeCatalog(session) ?: return@launch
            _state.update {
                it.copy(
                    isLoading = false,
                    rawHero = cached.hero,
                    rawRails = cached.rails,
                    rawAllItems = cached.allItems,
                    hero = cached.hero?.takeIf { h -> it.activeProfile?.let { p -> isAllowed(h, p) } ?: true },
                    rails = it.activeProfile?.let { p -> filterRails(cached.rails, p) } ?: cached.rails,
                    allItems = it.activeProfile?.let { p -> cached.allItems.filter { item -> isAllowed(item, p) } } ?: cached.allItems,
                    searchResults = filterResults(
                        query = it.searchQuery,
                        items = it.activeProfile?.let { p -> cached.allItems.filter { item -> isAllowed(item, p) } } ?: cached.allItems,
                    ),
                )
            }
        }
    }

    fun onSearchQueryChange(query: String) {
        _state.update { current ->
            current.copy(
                searchQuery = query,
                searchResults = filterResults(query, current.allItems),
            )
        }
    }

    fun onSearchBackspace() {
        val query = _state.value.searchQuery
        onSearchQueryChange(query.dropLast(1))
    }

    fun onSearchClear() {
        onSearchQueryChange("")
    }

    fun onSearchKeyPress(key: String) {
        val next = (_state.value.searchQuery + key).take(70)
        onSearchQueryChange(next)
    }

    fun toggleFavorite(item: CatalogItem) {
        viewModelScope.launch {
            favoritesRepository.toggleFavorite(item)
        }
    }

    fun removeFavorite(id: String) {
        viewModelScope.launch {
            favoritesRepository.removeFavorite(id)
        }
    }

    fun queueMovieDownload(detail: com.smartifly.tv.domain.model.MovieDetail) {
        viewModelScope.launch {
            val playback = catalogRepository.createPlaybackSessionForMovie(session, detail)
            downloadsRepository.queueDownload(
                TvDownloadItem(
                    id = "movie_${detail.streamId}",
                    title = detail.title,
                    type = "movie",
                    sourceId = detail.streamId,
                    streamUrl = playback.streamUrl,
                    status = TvDownloadStatus.QUEUED,
                )
            )
        }
    }

    fun queueSeriesEpisodeDownload(
        detail: com.smartifly.tv.domain.model.SeriesDetail,
        episodeId: Int,
    ) {
        viewModelScope.launch {
            val playback = catalogRepository.createPlaybackSessionForSeriesEpisode(
                session = session,
                detail = detail,
                episodeId = episodeId
            )
            downloadsRepository.queueDownload(
                TvDownloadItem(
                    id = "series_${episodeId}",
                    title = playback.title,
                    type = "series",
                    sourceId = episodeId,
                    streamUrl = playback.streamUrl,
                    status = TvDownloadStatus.QUEUED,
                )
            )
        }
    }

    fun removeDownload(id: String) {
        viewModelScope.launch {
            downloadsRepository.removeDownload(id)
        }
    }

    fun clearCompletedDownloads() {
        viewModelScope.launch {
            downloadsRepository.clearCompleted()
        }
    }

    fun clearFailedDownloads() {
        viewModelScope.launch {
            downloadsRepository.clearFailed()
        }
    }

    fun clearAllDownloads() {
        viewModelScope.launch {
            downloadsRepository.clearAll()
        }
    }

    fun clearAllFavorites() {
        viewModelScope.launch {
            favoritesRepository.clearAll()
        }
    }

    fun retryDownload(id: String) {
        viewModelScope.launch {
            downloadsRepository.retryDownload(id)
        }
    }

    fun pauseDownload(id: String) {
        viewModelScope.launch {
            downloadsRepository.pauseDownload(id)
        }
    }

    fun resumeDownload(id: String) {
        viewModelScope.launch {
            downloadsRepository.resumeDownload(id)
        }
    }

    fun refreshDownloads() {
        viewModelScope.launch {
            downloadsRepository.refreshStatuses()
        }
    }

    fun playDownload(item: TvDownloadItem) {
        val source = item.localPath
            ?.takeIf { it.isNotBlank() }
            ?.let { path ->
                if (path.startsWith("content://") || path.startsWith("file://") || path.startsWith("http")) {
                    path
                } else {
                    "file://$path"
                }
            }
            ?: item.streamUrl
        _state.update {
            it.copy(
                scene = HomeScene.PLAYER,
                playbackSession = com.smartifly.tv.domain.model.PlaybackSession(
                    title = item.title,
                    streamUrl = source,
                    type = item.type,
                )
            )
        }
    }

    fun updateSetting(transform: (com.smartifly.tv.domain.model.TvAppSettings) -> com.smartifly.tv.domain.model.TvAppSettings) {
        viewModelScope.launch {
            settingsRepository.updateSettings(transform)
        }
    }

    private fun checkForUpdates() {
        viewModelScope.launch {
            val update = masterControlRepository.checkAppUpdate()
            if (update != null) {
                // If the server returns a version code, check against our current version
                val currentVersion = deviceProvider.getAppVersionCode()
                if ((update.versionCode ?: 0) > currentVersion) {
                    _state.update { it.copy(appUpdate = update) }
                }
            }
        }
    }

    fun refreshAnnouncements() {
        viewModelScope.launch {
            // Fetch Global Master Announcements
            val remote = masterControlRepository.getRemoteAnnouncements()
            // Fetch Portal Specific Announcements
            val portal = catalogRepository.getAnnouncements()
            
            val readIds = _state.value.readAnnouncementIds
            val unreadRemote = remote.filter { it.id.toString() !in readIds }
            
            _state.update { it.copy(
                remoteAnnouncements = unreadRemote,
                portalAnnouncements = portal
            ) }

            // Auto-popup logic for critical master broadcasts
            if (!hasShownInitialBroadcast) {
                unreadRemote.firstOrNull { 
                    val type = it.type?.uppercase()
                    type == "EMERGENCY" || type == "WARNING" || type == "INFO"
                }?.let { broadcast ->
                    _state.update { it.copy(activeBroadcast = broadcast) }
                    hasShownInitialBroadcast = true
                }
            }
        }
    }

    fun markAnnouncementAsRead(id: String) {
        viewModelScope.launch {
            preferences.markAnnouncementAsRead(id)
        }
    }

    fun dismissBroadcast() {
        _state.update { it.copy(activeBroadcast = null) }
    }

    fun dismissUpdate() {
        _state.update {
            it.copy(
                appUpdate = null,
                updateInstallError = null,
                isInstallingUpdate = false,
                updateInstallProgressPercent = null,
                updateInstallPhase = null,
            )
        }
    }

    fun startUpdateInstall() {
        val updateUrl = _state.value.appUpdate?.updateUrl
        if (updateUrl.isNullOrBlank()) {
            _state.update { it.copy(updateInstallError = "Update URL is unavailable.") }
            return
        }

        viewModelScope.launch {
            _state.update {
                it.copy(
                    isInstallingUpdate = true,
                    updateInstallError = null,
                    updateInstallProgressPercent = 0,
                    updateInstallPhase = com.smartifly.tv.core.update.UpdateInstallPhase.DOWNLOADING,
                )
            }
            updateInstaller.downloadAndInstall(
                url = updateUrl,
                onProgress = { progress ->
                    _state.update {
                        it.copy(
                            updateInstallPhase = progress.phase,
                            updateInstallProgressPercent = progress.percent ?: it.updateInstallProgressPercent,
                        )
                    }
                }
            )
                .onSuccess {
                    _state.update {
                        it.copy(
                            isInstallingUpdate = false,
                            updateInstallProgressPercent = 100,
                            updateInstallPhase = com.smartifly.tv.core.update.UpdateInstallPhase.INSTALL_READY,
                        )
                    }
                }
                .onFailure { error ->
                    _state.update {
                        it.copy(
                            isInstallingUpdate = false,
                            updateInstallPhase = null,
                            updateInstallError = error.message ?: "Unable to launch the update installer.",
                        )
                    }
                }
        }
    }

    fun resetSettingsToDefault() {
        viewModelScope.launch {
            settingsRepository.updateSettings { com.smartifly.tv.domain.model.TvAppSettings() }
        }
    }

    fun openItemDetails(item: CatalogItem) {
        viewModelScope.launch {
            if (item.sourceId <= 0) {
                _state.update { it.copy(errorMessage = "This item cannot be opened yet.") }
                return@launch
            }
            _state.update { it.copy(isLoading = true, errorMessage = null) }

            val detailResult = when (item.type) {
                "movie" -> catalogRepository.getMovieDetail(
                    session = session,
                    streamId = item.sourceId,
                    fallbackTitle = item.title
                ).map { DetailContent.Movie(it) }

                "series" -> catalogRepository.getSeriesDetail(
                    session = session,
                    seriesId = item.sourceId,
                    fallbackTitle = item.title
                ).map { DetailContent.Series(it) }

                "live" -> runCatching {
                    val playback = catalogRepository.createPlaybackSessionForLive(
                        session = session,
                        streamId = item.sourceId,
                        title = item.title
                    ).copy(imageUrl = item.imageUrl)
                    _state.update {
                        it.copy(
                            isLoading = false,
                            scene = HomeScene.PLAYER,
                            playbackSession = playback,
                        )
                    }
                    return@launch
                }

                else -> Result.failure(IllegalStateException("Unsupported type: ${item.type}"))
            }

            detailResult.onSuccess { detail ->
                _state.update {
                    it.copy(
                        isLoading = false,
                        scene = HomeScene.DETAIL,
                        currentDetail = detail,
                    )
                }
            }.onFailure { error ->
                _state.update {
                    it.copy(
                        isLoading = false,
                        errorMessage = error.message ?: "Unable to open details."
                    )
                }
            }
        }
    }

    fun playMovie(detail: com.smartifly.tv.domain.model.MovieDetail) {
        viewModelScope.launch {
            val playback = catalogRepository.createPlaybackSessionForMovie(session, detail)
            _state.update {
                it.copy(
                    scene = HomeScene.PLAYER,
                    playbackSession = playback.withResume(
                        positionMs = watchHistoryRepository.getEntry(playback.historyId.orEmpty())?.positionMs ?: 0L
                    )
                )
            }
        }
    }

    fun playSeriesEpisode(detail: com.smartifly.tv.domain.model.SeriesDetail, episodeId: Int) {
        viewModelScope.launch {
            val playback = catalogRepository.createPlaybackSessionForSeriesEpisode(
                session = session,
                detail = detail,
                episodeId = episodeId
            )
            val resumeEntry = watchHistoryRepository.getEntry(playback.historyId.orEmpty())
            _state.update {
                it.copy(
                    scene = HomeScene.PLAYER,
                    playbackSession = playback.withResume(
                        positionMs = resumeEntry
                            ?.takeIf { entry -> entry.episodeId == episodeId }
                            ?.positionMs
                            ?: 0L
                    )
                )
            }
        }
    }

    fun recordPlaybackProgress(
        playbackSession: PlaybackSession,
        positionMs: Long,
        durationMs: Long,
    ) {
        val historyId = playbackSession.historyId ?: return
        val sourceId = playbackSession.sourceId ?: return
        if (
            playbackSession.type == "live" ||
            positionMs < MIN_PROGRESS_SAVE_MS ||
            durationMs < MIN_CONTENT_DURATION_MS
        ) {
            return
        }

        viewModelScope.launch {
            watchHistoryRepository.upsert(
                WatchHistoryEntry(
                    id = historyId,
                    sourceId = sourceId,
                    title = playbackSession.title,
                    imageUrl = playbackSession.imageUrl,
                    type = playbackSession.type,
                    episodeId = playbackSession.episodeId,
                    positionMs = positionMs,
                    durationMs = durationMs,
                )
            )
        }
    }

    fun completePlayback(playbackSession: PlaybackSession) {
        val historyId = playbackSession.historyId ?: return
        viewModelScope.launch {
            watchHistoryRepository.remove(historyId)
        }
    }

    fun exitPlayer() {
        _state.update {
            it.copy(
                scene = HomeScene.DETAIL,
                playbackSession = null
            )
        }
    }

    fun backFromDetail() {
        _state.update {
            it.copy(
                scene = HomeScene.BROWSE,
                currentDetail = null,
                playbackSession = null,
            )
        }
    }

    private fun filterResults(query: String, items: List<CatalogItem>): List<CatalogItem> {
        val normalized = query.trim().lowercase()
        val profile = _state.value.activeProfile
        
        return items
            .asSequence()
            .filter { item ->
                (normalized.length < 2 || item.title.lowercase().contains(normalized)) &&
                (profile == null || isAllowed(item, profile))
            }
            .take(24)
            .toList()
    }

    private fun computeDownloadSummary(downloads: List<TvDownloadItem>): DownloadSummary {
        val active = downloads.count {
            it.status == TvDownloadStatus.QUEUED ||
                it.status == TvDownloadStatus.DOWNLOADING ||
                it.status == TvDownloadStatus.PAUSED
        }
        val completed = downloads.count { it.status == TvDownloadStatus.COMPLETED }
        val failed = downloads.count { it.status == TvDownloadStatus.FAILED }
        val usedBytes = downloads
            .filter { it.status == TvDownloadStatus.COMPLETED }
            .sumOf { item ->
                when {
                    item.sizeBytes > 0L -> item.sizeBytes
                    item.downloadedBytes > 0L -> item.downloadedBytes
                    item.totalBytes > 0L -> item.totalBytes
                    else -> 0L
                }
            }
        return DownloadSummary(
            totalItems = downloads.size,
            activeItems = active,
            completedItems = completed,
            failedItems = failed,
            usedBytes = usedBytes,
        )
    }

    private fun historyToCatalogItem(entry: WatchHistoryEntry): CatalogItem {
        return CatalogItem(
            id = entry.id,
            sourceId = entry.sourceId,
            title = entry.title,
            imageUrl = entry.imageUrl,
            categoryId = "continue_watching",
            categoryName = "Continue Watching",
            type = entry.type,
            description = "Resume ${entry.progressPercent}%",
        )
    }

    companion object {
        private const val MIN_PROGRESS_SAVE_MS = 30_000L
        private const val MIN_CONTENT_DURATION_MS = 90_000L

        fun factory(
            session: AuthSession,
            catalogRepository: CatalogRepository,
            profileRepository: ProfileRepository,
            favoritesRepository: FavoritesRepository,
            settingsRepository: SettingsRepository,
            downloadsRepository: DownloadsRepository,
            watchHistoryRepository: WatchHistoryRepository,
            updateInstaller: AndroidUpdateInstaller,
            deviceProvider: DeviceProvider,
            masterControlRepository: MasterControlRepository,
            preferences: com.smartifly.tv.data.local.AppPreferencesDataSource,
        ): ViewModelProvider.Factory = object : ViewModelProvider.Factory {
            override fun <T : ViewModel> create(modelClass: Class<T>): T {
                @Suppress("UNCHECKED_CAST")
                return HomeViewModel(
                    session = session,
                    catalogRepository = catalogRepository,
                    profileRepository = profileRepository,
                    favoritesRepository = favoritesRepository,
                    settingsRepository = settingsRepository,
                    downloadsRepository = downloadsRepository,
                    watchHistoryRepository = watchHistoryRepository,
                    updateInstaller = updateInstaller,
                    deviceProvider = deviceProvider,
                    masterControlRepository = masterControlRepository,
                    preferences = preferences
                ) as T
            }
        }
    }
}

private fun PlaybackSession.withResume(positionMs: Long): PlaybackSession {
    return copy(resumePositionMs = positionMs.coerceAtLeast(0L))
}
