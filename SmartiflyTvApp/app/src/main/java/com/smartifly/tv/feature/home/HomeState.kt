package com.smartifly.tv.feature.home

import com.smartifly.tv.data.remote.MasterBroadcastDto
import com.smartifly.tv.data.remote.UpdateResponseDto
import com.smartifly.tv.core.update.UpdateInstallPhase
import com.smartifly.tv.domain.model.CatalogItem
import com.smartifly.tv.domain.model.FavoriteItem
import com.smartifly.tv.domain.model.HomeRail
import com.smartifly.tv.domain.model.MovieDetail
import com.smartifly.tv.domain.model.PlaybackSession
import com.smartifly.tv.domain.model.SeriesDetail
import com.smartifly.tv.domain.model.TvAppSettings
import com.smartifly.tv.domain.model.TvDownloadItem

enum class HomeTab {
    SEARCH,
    HOME,
    LIVE,
    MOVIES,
    SERIES,
    ANNOUNCEMENTS,
    FAVORITES,
    DOWNLOADS,
    SETTINGS,
}

enum class HomeScene {
    BROWSE,
    DETAIL,
    PLAYER,
}

sealed class DetailContent {
    data class Movie(val detail: MovieDetail) : DetailContent()
    data class Series(val detail: SeriesDetail) : DetailContent()
}

data class AccountSummary(
    val serverLabel: String = "",
    val username: String = "",
    val expDate: String? = null,
    val maxConnections: Int = 0,
    val activeConnections: Int = 0,
)

data class DownloadSummary(
    val totalItems: Int = 0,
    val activeItems: Int = 0,
    val completedItems: Int = 0,
    val failedItems: Int = 0,
    val usedBytes: Long = 0L,
)

data class HomeState(
    val activeTab: HomeTab = HomeTab.HOME,
    val scene: HomeScene = HomeScene.BROWSE,
    val isLoading: Boolean = true,
    val errorMessage: String? = null,
    val hero: CatalogItem? = null,
    val rawHero: CatalogItem? = null,
    val rails: List<HomeRail> = emptyList(),
    val rawRails: List<HomeRail> = emptyList(),
    val allItems: List<CatalogItem> = emptyList(),
    val rawAllItems: List<CatalogItem> = emptyList(),
    val activeProfile: com.smartifly.tv.domain.model.UserProfile? = null,
    val continueWatching: List<CatalogItem> = emptyList(),
    val searchQuery: String = "",
    val searchResults: List<CatalogItem> = emptyList(),
    val favorites: List<FavoriteItem> = emptyList(),
    val downloads: List<TvDownloadItem> = emptyList(),
    val downloadSummary: DownloadSummary = DownloadSummary(),
    val accountSummary: AccountSummary = AccountSummary(),
    val appSettings: TvAppSettings = TvAppSettings(),
    val currentDetail: DetailContent? = null,
    val playbackSession: PlaybackSession? = null,
    val remoteAnnouncements: List<MasterBroadcastDto> = emptyList(),
    val portalAnnouncements: List<com.smartifly.tv.data.remote.MasterAnnouncementDto> = emptyList(),
    val appUpdate: UpdateResponseDto? = null,
    val activeBroadcast: MasterBroadcastDto? = null,
    val isInstallingUpdate: Boolean = false,
    val updateInstallProgressPercent: Int? = null,
    val updateInstallPhase: UpdateInstallPhase? = null,
    val updateInstallError: String? = null,
    val readAnnouncementIds: Set<String> = emptySet(),
)
