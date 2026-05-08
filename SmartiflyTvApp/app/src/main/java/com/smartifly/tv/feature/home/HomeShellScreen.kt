package com.smartifly.tv.feature.home

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.Image
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.lazy.itemsIndexed as lazyItemsIndexed
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.itemsIndexed
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.ManageAccounts
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusProperties
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.focus.onFocusEvent
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil.compose.AsyncImage
import com.smartifly.tv.R
import com.smartifly.tv.domain.model.CatalogItem
import com.smartifly.tv.domain.model.HomeRail
import com.smartifly.tv.domain.model.TvAppSettings
import com.smartifly.tv.domain.model.TvDownloadItem
import com.smartifly.tv.domain.model.TvDownloadStatus
import com.smartifly.tv.feature.home.components.HomeContentCard
import com.smartifly.tv.feature.home.components.HomeRailSection
import com.smartifly.tv.feature.home.components.HomeSidebar
import com.smartifly.tv.feature.home.components.MovieDetailScreen
import com.smartifly.tv.feature.home.components.SeriesDetailScreen
import com.smartifly.tv.feature.player.TvPlayerScreen
import com.smartifly.tv.ui.components.SmartiflyBackdrop
import com.smartifly.tv.ui.components.TvFocusButton
import com.smartifly.tv.ui.components.TvKeyboardPanel
import com.smartifly.tv.ui.design.TvTokens
import com.smartifly.tv.ui.styling.TvStyles
import androidx.compose.ui.res.painterResource
import com.smartifly.tv.ui.preview.PreviewFrame
import com.smartifly.tv.ui.preview.previewAccountSummary
import com.smartifly.tv.ui.preview.previewAppSettings
import com.smartifly.tv.ui.preview.previewCatalogItems
import com.smartifly.tv.ui.preview.previewDownloads
import com.smartifly.tv.ui.preview.previewDownloadSummary
import com.smartifly.tv.ui.preview.previewHomeRails

@Composable
fun HomeShellScreen(
    viewModel: HomeViewModel,
    onSwitchProfile: () -> Unit,
    onSwitchAccount: () -> Unit,
    onLogout: () -> Unit,
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val favoriteIds = state.favorites.map { it.id }.toSet()
    val sidebarActiveTabFocusRequester = remember { FocusRequester() }
    val contentEntryFocusRequester = remember { FocusRequester() }

    val playbackSession = state.playbackSession
    if (state.scene == HomeScene.PLAYER && playbackSession != null) {
        BackHandler { viewModel.exitPlayer() }
        TvPlayerScreen(
            playbackSession = playbackSession,
            initialSettings = state.appSettings,
            onQualityChanged = { quality -> viewModel.updateSetting { it.copy(defaultQuality = quality) } },
            onSpeedChanged = { speed -> viewModel.updateSetting { it.copy(defaultPlaybackSpeed = speed) } },
            onAudioChanged = { language -> viewModel.updateSetting { it.copy(preferredAudioLanguage = language) } },
            onSubtitleChanged = { language -> viewModel.updateSetting { it.copy(preferredSubtitleLanguage = language) } },
            onAspectChanged = { mode -> viewModel.updateSetting { it.copy(aspectMode = mode) } },
            onMutedChanged = { muted -> viewModel.updateSetting { it.copy(defaultMuted = muted) } },
            onStatsChanged = { stats -> viewModel.updateSetting { it.copy(showPlayerStats = stats) } },
            onProgressSaved = { positionMs, durationMs ->
                viewModel.recordPlaybackProgress(
                    playbackSession = playbackSession,
                    positionMs = positionMs,
                    durationMs = durationMs,
                )
            },
            onPlaybackCompleted = { viewModel.completePlayback(playbackSession) },
            onExit = viewModel::exitPlayer
        )
        return
    }

    val detailContent = state.currentDetail
    if (state.scene == HomeScene.DETAIL && detailContent != null) {
        BackHandler { viewModel.backFromDetail() }
        when (detailContent) {
            is DetailContent.Movie -> MovieDetailScreen(
                detail = detailContent.detail,
                onBack = viewModel::backFromDetail,
                onPlay = { viewModel.playMovie(detailContent.detail) },
                onDownload = { viewModel.queueMovieDownload(detailContent.detail) }
            )

            is DetailContent.Series -> SeriesDetailScreen(
                detail = detailContent.detail,
                onBack = viewModel::backFromDetail,
                onPlayEpisode = { episode -> viewModel.playSeriesEpisode(detailContent.detail, episode.id) },
                onDownloadEpisode = { episode -> viewModel.queueSeriesEpisodeDownload(detailContent.detail, episode.id) }
            )
        }
        return
    }

    SmartiflyBackdrop(showLogo = false, showPosterWall = false) {
        Row(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 14.dp, vertical = 18.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            HomeSidebar(
                activeTab = state.activeTab,
                activeTabFocusRequester = sidebarActiveTabFocusRequester,
                contentFocusRequester = contentEntryFocusRequester,
                onTabSelected = viewModel::setTab,
                onRefresh = viewModel::refreshCatalog,
                onSwitchProfile = onSwitchProfile,
                onSwitchAccount = onSwitchAccount,
                onLogout = onLogout
            )

            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxSize()
                    .padding(horizontal = 2.dp, vertical = 2.dp)
            ) {
                when {
                    state.isLoading -> CenterMessage("Loading cinematic catalog...")
                    state.errorMessage != null -> {
                        Column(
                            modifier = Modifier.align(Alignment.Center),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(14.dp)
                        ) {
                            Text(
                                text = state.errorMessage ?: "Catalog load failed.",
                                style = TvTokens.TvType.H2,
                                color = TvTokens.Colors.Error
                            )
                            TvFocusButton(text = "Retry", primary = true, onClick = viewModel::refreshCatalog)
                        }
                    }

                    else -> {
                        when (state.activeTab) {
                            HomeTab.HOME -> HomeTabScreen(
                                hero = state.hero,
                                rails = state.rails,
                                allItems = state.allItems,
                                rawItemCount = state.rawAllItems.size,
                                continueWatching = state.continueWatching,
                                favoriteIds = favoriteIds,
                                contentEntryFocusRequester = contentEntryFocusRequester,
                                sidebarFocusRequester = sidebarActiveTabFocusRequester,
                                onOpenItem = viewModel::openItemDetails,
                                onToggleFavorite = viewModel::toggleFavorite
                            )

                            HomeTab.SEARCH -> SearchTabScreen(
                                query = state.searchQuery,
                                results = state.searchResults,
                                allItems = state.allItems,
                                favoriteIds = favoriteIds,
                                contentEntryFocusRequester = contentEntryFocusRequester,
                                sidebarFocusRequester = sidebarActiveTabFocusRequester,
                                onOpenItem = viewModel::openItemDetails,
                                onToggleFavorite = viewModel::toggleFavorite,
                                onKeyPress = viewModel::onSearchKeyPress,
                                onBackspace = viewModel::onSearchBackspace,
                                onClear = viewModel::onSearchClear
                            )

                            HomeTab.FAVORITES -> FavoritesTabScreen(
                                items = state.favorites.map {
                                    CatalogItem(
                                        id = it.id,
                                        sourceId = it.id.substringAfter('_').toIntOrNull() ?: 0,
                                        title = it.title,
                                        imageUrl = it.imageUrl,
                                        categoryId = "favorites",
                                        categoryName = "Favorites",
                                        type = it.type
                                    )
                                },
                                favoriteIds = favoriteIds,
                                contentEntryFocusRequester = contentEntryFocusRequester,
                                sidebarFocusRequester = sidebarActiveTabFocusRequester,
                                onOpenItem = viewModel::openItemDetails,
                                onToggleFavorite = viewModel::toggleFavorite
                            )

                            HomeTab.LIVE -> CategoryBrowseTab(
                                title = "Live TV",
                                emptyMessage = "No live channels available.",
                                items = state.allItems.filter { it.type == "live" },
                                favoriteIds = favoriteIds,
                                contentEntryFocusRequester = contentEntryFocusRequester,
                                sidebarFocusRequester = sidebarActiveTabFocusRequester,
                                onOpenItem = viewModel::openItemDetails,
                                onToggleFavorite = viewModel::toggleFavorite,
                                columns = 4,
                                cardWidth = 172,
                                cardHeight = 108
                            )

                            HomeTab.MOVIES -> CategoryBrowseTab(
                                title = "Movies",
                                emptyMessage = "No movies available.",
                                items = state.allItems.filter { it.type == "movie" },
                                favoriteIds = favoriteIds,
                                contentEntryFocusRequester = contentEntryFocusRequester,
                                sidebarFocusRequester = sidebarActiveTabFocusRequester,
                                onOpenItem = viewModel::openItemDetails,
                                onToggleFavorite = viewModel::toggleFavorite,
                                columns = 5,
                                cardWidth = 132,
                                cardHeight = 198
                            )

                            HomeTab.SERIES -> CategoryBrowseTab(
                                title = "Series",
                                emptyMessage = "No series available.",
                                items = state.allItems.filter { it.type == "series" },
                                favoriteIds = favoriteIds,
                                contentEntryFocusRequester = contentEntryFocusRequester,
                                sidebarFocusRequester = sidebarActiveTabFocusRequester,
                                onOpenItem = viewModel::openItemDetails,
                                onToggleFavorite = viewModel::toggleFavorite,
                                columns = 5,
                                cardWidth = 132,
                                cardHeight = 198
                            )

                            HomeTab.ANNOUNCEMENTS -> AnnouncementsTabScreen(
                                account = state.accountSummary,
                                downloadSummary = state.downloadSummary,
                                settings = state.appSettings,
                                remoteAnnouncements = state.remoteAnnouncements,
                                portalAnnouncements = state.portalAnnouncements,
                                contentEntryFocusRequester = contentEntryFocusRequester,
                                sidebarFocusRequester = sidebarActiveTabFocusRequester
                            )
                            HomeTab.DOWNLOADS -> DownloadsTabScreen(
                                downloads = state.downloads,
                                summary = state.downloadSummary,
                                contentEntryFocusRequester = contentEntryFocusRequester,
                                sidebarFocusRequester = sidebarActiveTabFocusRequester,
                                onPlayDownload = viewModel::playDownload,
                                onPauseDownload = viewModel::pauseDownload,
                                onResumeDownload = viewModel::resumeDownload,
                                onRetryDownload = viewModel::retryDownload,
                                onRefreshStatuses = viewModel::refreshDownloads,
                                onRemoveDownload = viewModel::removeDownload,
                                onClearCompleted = viewModel::clearCompletedDownloads
                            )
                            HomeTab.SETTINGS -> SettingsTabScreen(
                                account = state.accountSummary,
                                activeProfile = state.activeProfile,
                                downloadSummary = state.downloadSummary,
                                favoriteCount = state.favorites.size,
                                settings = state.appSettings,
                                contentEntryFocusRequester = contentEntryFocusRequester,
                                sidebarFocusRequester = sidebarActiveTabFocusRequester,
                                onSwitchProfile = onSwitchProfile,
                                onSwitchAccount = onSwitchAccount,
                                onLogout = onLogout,
                                onRefreshCatalog = viewModel::refreshCatalog,
                                onRefreshDownloads = viewModel::refreshDownloads,
                                onClearFavorites = viewModel::clearAllFavorites,
                                onClearFailedDownloads = viewModel::clearFailedDownloads,
                                onClearCompletedDownloads = viewModel::clearCompletedDownloads,
                                onClearAllDownloads = viewModel::clearAllDownloads,
                                onResetSettings = viewModel::resetSettingsToDefault,
                                onUpdateSettings = viewModel::updateSetting
                            )
                        }
                    }
                }
            }
        }
    }

    state.appUpdate?.let { update ->
        UpdateDialog(
            update = update,
            isInstalling = state.isInstallingUpdate,
            installProgressPercent = state.updateInstallProgressPercent,
            installPhase = state.updateInstallPhase,
            errorMessage = state.updateInstallError,
            onUpdate = viewModel::startUpdateInstall,
            onDismiss = viewModel::dismissUpdate
        )
    }

    state.activeBroadcast?.let { broadcast ->
        com.smartifly.tv.ui.components.AnnouncementDialog(
            announcement = broadcast,
            onDismiss = viewModel::dismissBroadcast,
            onMarkAsRead = { viewModel.markAnnouncementAsRead(broadcast.id.toString()) }
        )
    }
}

@Composable
private fun HomeTabScreen(
    hero: CatalogItem?,
    rails: List<HomeRail>,
    allItems: List<CatalogItem>,
    rawItemCount: Int,
    continueWatching: List<CatalogItem>,
    favoriteIds: Set<String>,
    contentEntryFocusRequester: FocusRequester,
    sidebarFocusRequester: FocusRequester,
    onOpenItem: (CatalogItem) -> Unit,
    onToggleFavorite: (CatalogItem) -> Unit,
) {
    val syntheticRails = buildList {
        if (continueWatching.isNotEmpty()) {
            add(HomeRail(id = "continue_watching", title = "Continue Watching", items = continueWatching.take(12)))
        }
        val liveItems = allItems.filter { it.type == "live" }.take(12)
        if (liveItems.isNotEmpty()) {
            add(HomeRail(id = "live_now", title = "Live Now", items = liveItems))
        }
        val movieItems = allItems.filter { it.type == "movie" }.take(12)
        if (movieItems.isNotEmpty()) {
            add(HomeRail(id = "new_movies", title = "New Movies", items = movieItems))
        }
    }
    val displayRails = if (syntheticRails.isNotEmpty()) syntheticRails + rails else rails
    val hasVisibleCatalog = hero != null || displayRails.isNotEmpty()
    val listState = rememberLazyListState()
    val coroutineScope = rememberCoroutineScope()

    if (!hasVisibleCatalog) {
        EmptyBrowseState(
            hasHiddenCatalog = rawItemCount > 0,
            isWatchHistoryAvailable = continueWatching.isNotEmpty()
        )
        return
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        state = listState,
        contentPadding = PaddingValues(top = 8.dp, bottom = 28.dp),
        verticalArrangement = Arrangement.spacedBy(24.dp)
    ) {
        item {
            if (hero != null) {
                HeroBanner(
                    item = hero,
                    focusRequester = contentEntryFocusRequester,
                    leftFocusRequester = sidebarFocusRequester,
                    onPlay = { onOpenItem(hero) },
                    onMoreInfo = { onOpenItem(hero) },
                    onFocusInside = { hasFocus ->
                        if (hasFocus) {
                            coroutineScope.launch {
                                listState.animateScrollToItem(0)
                            }
                        }
                    }
                )
            }
        }
        lazyItemsIndexed(displayRails, key = { _, rail -> rail.id }) { index, rail ->
            val useAsEntry = hero == null && index == 0
            HomeRailSection(
                rail = rail,
                favoriteIds = favoriteIds,
                entryFocusRequester = if (useAsEntry) contentEntryFocusRequester else null,
                entryLeftFocusRequester = if (useAsEntry) sidebarFocusRequester else null,
                onItemClick = onOpenItem,
                onItemToggleFavorite = onToggleFavorite
            )
        }
    }
}

@Composable
private fun EmptyBrowseState(
    hasHiddenCatalog: Boolean,
    isWatchHistoryAvailable: Boolean,
) {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier
                .width(760.dp)
                .background(TvStyles.frostedPanel, RoundedCornerShape(24.dp))
                .border(1.dp, TvTokens.Colors.BorderStrong.copy(alpha = 0.28f), RoundedCornerShape(24.dp))
                .padding(horizontal = 28.dp, vertical = 26.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Text(
                text = if (hasHiddenCatalog) "Content Filtered For This Profile" else "Preparing Your Home Experience",
                style = TvTokens.TvType.H1,
                color = TvTokens.Colors.TextPrimary,
                textAlign = TextAlign.Center
            )
            Text(
                text = if (hasHiddenCatalog) {
                    "This profile is hiding the available catalog. Switch profile or relax content restrictions to see the library."
                } else {
                    "No featured rows are available yet. Refresh the catalog or wait for the service to sync your home feed."
                },
                style = TvTokens.TvType.BodyLarge,
                color = TvTokens.Colors.TextSecondary,
                textAlign = TextAlign.Center
            )
            Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                HeroMetaPill(
                    text = if (hasHiddenCatalog) "PROFILE FILTERS ACTIVE" else "CATALOG STANDBY",
                    background = if (hasHiddenCatalog) TvTokens.Colors.WarningBg else TvTokens.Colors.InfoBg,
                    contentColor = if (hasHiddenCatalog) TvTokens.Colors.Warning else TvTokens.Colors.Info
                )
                if (isWatchHistoryAvailable) {
                    HeroMetaPill(
                        text = "RESUME HISTORY READY",
                        background = TvTokens.Colors.SuccessBg,
                        contentColor = TvTokens.Colors.Success
                    )
                }
            }
        }
    }
}

@Composable
private fun HeroBanner(
    item: CatalogItem,
    focusRequester: FocusRequester,
    leftFocusRequester: FocusRequester,
    onPlay: () -> Unit,
    onMoreInfo: () -> Unit,
    onFocusInside: (Boolean) -> Unit,
) {
    var revealHero by remember(item.id) { mutableStateOf(false) }

    LaunchedEffect(item.id) {
        revealHero = true
    }

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(276.dp)
            .onFocusEvent { onFocusInside(it.hasFocus) }
            .clip(RoundedCornerShape(22.dp))
            .border(1.dp, TvTokens.Colors.BorderStrong.copy(alpha = 0.34f), RoundedCornerShape(22.dp))
            .background(
                Brush.verticalGradient(
                    listOf(
                        TvTokens.Colors.BackgroundElevated,
                        TvTokens.Colors.Surface,
                        TvTokens.Colors.BackgroundStart
                    )
                ),
                RoundedCornerShape(22.dp)
            )
    ) {
        if (item.imageUrl.isNotBlank()) {
            AsyncImage(
                model = item.imageUrl,
                contentDescription = item.title,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .fillMaxSize()
                    .alpha(if (revealHero) 1f else 0.92f)
            )
        }
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.horizontalGradient(
                        colors = listOf(Color(0xFC060C14), Color(0xF0081018), Color(0x9A081018), Color(0x18081018)),
                        startX = 0f,
                        endX = 1080f
                    )
                )
        )
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            TvTokens.Colors.BackgroundStart.copy(alpha = 0.08f),
                            TvTokens.Colors.BackgroundStart.copy(alpha = 0.18f),
                            TvTokens.Colors.BackgroundStart.copy(alpha = 0.9f)
                        )
                    )
                )
        )
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(72.dp)
                .align(Alignment.BottomCenter)
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color.Transparent,
                            TvTokens.Colors.BackgroundStart.copy(alpha = 0.34f),
                            TvTokens.Colors.BackgroundStart.copy(alpha = 0.94f)
                        )
                    )
                )
        )
        Box(
            modifier = Modifier
                .fillMaxHeight()
                .width(432.dp)
                .align(Alignment.CenterStart)
                .background(
                    Brush.horizontalGradient(
                        colors = listOf(
                            Color(0xF7060C14),
                            TvTokens.Colors.BackgroundStart.copy(alpha = 0.76f),
                            TvTokens.Colors.BackgroundStart.copy(alpha = 0.28f),
                            Color.Transparent
                        )
                    )
                )
        )
        Box(
            modifier = Modifier
                .fillMaxHeight()
                .width(220.dp)
                .align(Alignment.CenterEnd)
                .background(
                    Brush.horizontalGradient(
                        colors = listOf(
                            Color.Transparent,
                            TvTokens.Colors.BackgroundStart.copy(alpha = 0.14f),
                            TvTokens.Colors.BackgroundStart.copy(alpha = 0.3f)
                        )
                    )
                )
        )

        Column(
            modifier = Modifier
                .align(Alignment.CenterStart)
                .padding(start = 28.dp, end = 18.dp)
                .width(360.dp)
                .alpha(if (revealHero) 1f else 0f),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Box(
                modifier = Modifier
                    .width(34.dp)
                    .height(3.dp)
                    .background(
                        Brush.horizontalGradient(
                            colors = listOf(
                                TvTokens.Colors.Primary,
                                TvTokens.Colors.FocusCyan
                            )
                        ),
                        RoundedCornerShape(999.dp)
                    )
            )
            Text(
                text = item.title,
                style = TvTokens.TvType.DisplaySmall.copy(fontSize = 34.sp, lineHeight = 38.sp),
                color = TvTokens.Colors.TextPrimary,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .background(
                            TvTokens.Colors.Glass.copy(alpha = 0.44f),
                            RoundedCornerShape(999.dp)
                        )
                        .border(
                            width = 1.dp,
                            color = TvTokens.Colors.Border.copy(alpha = 0.22f),
                            shape = RoundedCornerShape(999.dp)
                        )
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = "EDITOR'S PICK",
                        style = TvTokens.TvType.Badge.copy(fontSize = 9.sp, lineHeight = 10.sp, letterSpacing = 1.1.sp),
                        color = TvTokens.Colors.TextMuted,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                HeroMetaPill(
                    text = when (item.type.lowercase()) {
                        "movie" -> "Movie"
                        "series" -> "Series"
                        else -> "Live"
                    },
                    background = when (item.type.lowercase()) {
                        "movie" -> TvTokens.Colors.MoviesGlow
                        "series" -> TvTokens.Colors.SeriesGlow
                        else -> TvTokens.Colors.LiveGlow
                    },
                    contentColor = TvTokens.Colors.TextPrimary
                )
                if (item.categoryName.isNotBlank()) {
                    HeroMetaPill(
                        text = displayCategoryName(item),
                        background = TvTokens.Colors.Glass.copy(alpha = 0.35f),
                        contentColor = TvTokens.Colors.TextSecondary
                    )
                }
                item.rating?.let { rating ->
                    HeroMetaPill(
                        text = "IMDb ${"%.1f".format(rating)}",
                        background = TvTokens.Colors.AccentGold,
                        contentColor = TvTokens.Colors.TextInverse
                    )
                }
            }
            Text(
                text = if (item.description.isNotBlank()) {
                    item.description
                } else {
                    "Discover premium ${displayCategoryName(item).lowercase()} entertainment curated for the big screen."
                },
                style = TvTokens.TvType.BodySmall.copy(fontSize = 13.sp, lineHeight = 18.sp),
                color = TvTokens.Colors.TextSecondary,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                TvFocusButton(
                    text = if (item.type == "live") "Watch Live" else "Play Now",
                    primary = true,
                    compact = true,
                    requestInitialFocus = true,
                    focusRequester = focusRequester,
                    leftFocusRequester = leftFocusRequester,
                    onClick = onPlay
                )
                TvFocusButton(
                    text = "More Info",
                    compact = true,
                    onClick = onMoreInfo
                )
            }
        }
    }
}

@Composable
private fun HeroMetaPill(
    text: String,
    background: Color,
    contentColor: Color,
) {
    Box(
        modifier = Modifier
            .background(background, RoundedCornerShape(999.dp))
            .border(
                width = 1.dp,
                color = contentColor.copy(alpha = 0.14f),
                shape = RoundedCornerShape(999.dp)
            )
            .padding(horizontal = 10.dp, vertical = 5.dp)
    ) {
        Text(
            text = text,
            style = TvTokens.TvType.Badge.copy(fontSize = 12.sp, lineHeight = 13.sp),
            color = contentColor,
            fontWeight = FontWeight.Bold
        )
    }
}

@Composable
private fun SearchTabScreen(
    query: String,
    results: List<CatalogItem>,
    allItems: List<CatalogItem>,
    favoriteIds: Set<String>,
    contentEntryFocusRequester: FocusRequester,
    sidebarFocusRequester: FocusRequester,
    onOpenItem: (CatalogItem) -> Unit,
    onToggleFavorite: (CatalogItem) -> Unit,
    onKeyPress: (String) -> Unit,
    onBackspace: () -> Unit,
    onClear: () -> Unit,
) {
    val keyboardEntryFocusRequester = remember { FocusRequester() }
    val suggestions = remember(allItems) {
        mapOf(
            "Popular Movies" to allItems.filter { it.type == "movie" }.take(6),
            "Trending Series" to allItems.filter { it.type == "series" }.take(6),
            "Live Channels" to allItems.filter { it.type == "live" }.take(6)
        )
    }
    val groupedResults = remember(results) {
        listOf(
            "Movies" to results.filter { it.type == "movie" },
            "Series" to results.filter { it.type == "series" },
            "Live TV" to results.filter { it.type == "live" }
        )
    }

    Row(modifier = Modifier.fillMaxSize(), horizontalArrangement = Arrangement.spacedBy(22.dp)) {
        Column(
            modifier = Modifier
                .width(376.dp)
                .fillMaxHeight()
                .background(
                    Color.Transparent,
                    RoundedCornerShape(20.dp)
                )
                .border(
                    width = 1.dp,
                    color = TvTokens.Colors.Border.copy(alpha = 0.36f),
                    shape = RoundedCornerShape(20.dp)
                )
                .padding(horizontal = 22.dp, vertical = 24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Image(
                painter = painterResource(id = R.drawable.smartifly_icon),
                contentDescription = "Smartifly",
                contentScale = ContentScale.Fit,
                modifier = Modifier
                    .width(188.dp)
                    .height(56.dp)
            )
            Text(text = "Search", style = TvTokens.TvType.DisplaySmall, color = TvTokens.Colors.TextPrimary)
            SearchInputShell(
                query = query,
                resultCount = results.size
            )
            TvKeyboardPanel(
                requestInitialFocus = true,
                firstKeyFocusRequester = keyboardEntryFocusRequester,
                firstKeyLeftFocusRequester = sidebarFocusRequester,
                firstKeyRightFocusRequester = contentEntryFocusRequester, // Points to results
                onKeyPress = onKeyPress,
                onBackspace = onBackspace,
                onClear = onClear
            )
        }
        LazyColumn(
            modifier = Modifier
                .weight(1f)
                .fillMaxHeight()
                .background(Color.Transparent, RoundedCornerShape(22.dp))
                .border(
                    width = 1.dp,
                    color = TvTokens.Colors.Border.copy(alpha = 0.24f),
                    shape = RoundedCornerShape(22.dp)
                )
                .padding(horizontal = 24.dp, vertical = 18.dp),
            verticalArrangement = Arrangement.spacedBy(22.dp)
        ) {
            item {
                SearchResultsHeader(
                    title = if (query.length < 2) "Suggested For You" else "Results",
                    subtitle = if (query.length < 2) {
                        "Browse curated picks across movies, series, and live channels."
                    } else {
                        "${results.size} matching items"
                    }
                )
            }
            if (query.length < 2) {
                val suggestionSections = suggestions.entries.filter { it.value.isNotEmpty() }
                suggestionSections.forEachIndexed { sectionIndex, (title, sectionItems) ->
                    if (sectionItems.isNotEmpty()) {
                        item(title) {
                            SearchResultSection(
                                title = title,
                                items = sectionItems,
                                favoriteIds = favoriteIds,
                                contentEntryFocusRequester = if (sectionIndex == 0) contentEntryFocusRequester else null,
                                sidebarFocusRequester = sidebarFocusRequester,
                                onOpenItem = onOpenItem,
                                onToggleFavorite = onToggleFavorite
                            )
                        }
                    }
                }
            } else if (results.isEmpty()) {
                item {
                    SearchEmptyState("No results found for \"$query\".")
                }
            } else {
                val resultSections = groupedResults.filter { it.second.isNotEmpty() }
                resultSections.forEachIndexed { sectionIndex, (title, sectionItems) ->
                    if (sectionItems.isNotEmpty()) {
                        item(title) {
                            SearchResultSection(
                                title = title,
                                items = sectionItems.take(12),
                                favoriteIds = favoriteIds,
                                contentEntryFocusRequester = if (sectionIndex == 0) contentEntryFocusRequester else null,
                                sidebarFocusRequester = sidebarFocusRequester,
                                onOpenItem = onOpenItem,
                                onToggleFavorite = onToggleFavorite
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SearchInputShell(
    query: String,
    resultCount: Int,
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                Brush.verticalGradient(
                    listOf(
                        TvTokens.Colors.BackgroundInput,
                        TvTokens.Colors.Surface
                    )
                ),
                RoundedCornerShape(18.dp)
            )
            .border(
                width = 1.dp,
                color = TvTokens.Colors.FocusCyan.copy(alpha = 0.65f),
                shape = RoundedCornerShape(18.dp)
            )
            .padding(horizontal = 18.dp, vertical = 16.dp)
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(
                text = "Type to search",
                style = TvTokens.TvType.Badge.copy(letterSpacing = 1.2.sp),
                color = TvTokens.Colors.TextMuted
            )
            Text(
                text = if (query.isBlank()) "Movies, series, and live channels" else query,
                style = TvTokens.TvType.H3,
                color = if (query.isBlank()) TvTokens.Colors.TextMuted else TvTokens.Colors.TextPrimary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = if (query.length < 2) {
                    "Search starts after 2 characters."
                } else {
                    "$resultCount matching items"
                },
                style = TvTokens.TvType.CaptionSmall,
                color = TvTokens.Colors.TextSecondary
            )
        }
    }
}

@Composable
private fun SearchResultsHeader(
    title: String,
    subtitle: String,
) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(
            text = title,
            style = TvTokens.TvType.H2,
            color = TvTokens.Colors.TextPrimary
        )
        Text(
            text = subtitle,
            style = TvTokens.TvType.BodySmall,
            color = TvTokens.Colors.TextSecondary
        )
    }
}

@Composable
private fun SearchEmptyState(
    message: String,
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(260.dp)
            .background(
                Brush.verticalGradient(
                    listOf(
                        TvTokens.Colors.BackgroundInput.copy(alpha = 0.72f),
                        TvTokens.Colors.Surface.copy(alpha = 0.78f)
                    )
                ),
                RoundedCornerShape(20.dp)
            )
            .border(
                width = 1.dp,
                color = TvTokens.Colors.Border.copy(alpha = 0.26f),
                shape = RoundedCornerShape(20.dp)
            ),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = message,
            style = TvTokens.TvType.BodyLarge,
            color = TvTokens.Colors.TextMuted,
            textAlign = TextAlign.Center
        )
    }
}

@Composable
private fun SearchResultSection(
    title: String,
    items: List<CatalogItem>,
    favoriteIds: Set<String>,
    contentEntryFocusRequester: FocusRequester?,
    sidebarFocusRequester: FocusRequester,
    onOpenItem: (CatalogItem) -> Unit,
    onToggleFavorite: (CatalogItem) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Box(
                modifier = Modifier
                    .width(4.dp)
                    .height(20.dp)
                    .background(TvTokens.Colors.Primary, RoundedCornerShape(4.dp))
            )
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(
                    text = title,
                    style = TvTokens.TvType.LabelLarge.copy(fontSize = 18.sp, letterSpacing = 0.6.sp),
                    color = TvTokens.Colors.TextPrimary
                )
                Text(
                    text = "${items.size} items",
                    style = TvTokens.TvType.CaptionSmall,
                    color = TvTokens.Colors.TextMuted
                )
            }
        }
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.verticalGradient(
                        listOf(
                            TvTokens.Colors.BackgroundInput.copy(alpha = 0.35f),
                            TvTokens.Colors.Surface.copy(alpha = 0.3f)
                        )
                    ),
                    RoundedCornerShape(TvStyles.Radius.md)
                )
                .border(
                    width = 1.dp,
                    color = TvTokens.Colors.Border.copy(alpha = 0.18f),
                    shape = RoundedCornerShape(TvStyles.Radius.md)
                )
                .padding(horizontal = 16.dp, vertical = 16.dp)
        ) {
            LazyVerticalGrid(
                columns = GridCells.Fixed(5), // Increased density slightly but with better proportions
                modifier = Modifier.height(280.dp),
                horizontalArrangement = Arrangement.spacedBy(TvStyles.Layout.itemGap),
                verticalArrangement = Arrangement.spacedBy(TvStyles.Layout.itemGap)
            ) {
                itemsIndexed(items, key = { _, item -> item.id }) { index, item ->
                    val isLive = item.type == "live"
                    // Proportions matching SmartiflyApp: 16:9 (172x108) for Live, 2:3 (132x198) for Movie/Series
                    val width = if (isLive) 172 else 132
                    val height = if (isLive) 108 else 198
                    
                    HomeContentCard(
                        item = item,
                        widthDp = width,
                        heightDp = height,
                        isFavorite = favoriteIds.contains(item.id),
                        focusRequester = if (index == 0) contentEntryFocusRequester else null,
                        // Focus Handoff: Left from first card in ANY row should return to keypad/sidebar
                        leftFocusRequester = if (index % 5 == 0) sidebarFocusRequester else null,
                        onClick = { onOpenItem(item) },
                        onLongClick = { onToggleFavorite(item) }
                    )
                }
            }
        }
    }
}

private data class BrowseCategory(
    val id: String,
    val label: String,
    val count: Int,
)

@Composable
private fun CategoryBrowseTab(
    title: String,
    emptyMessage: String,
    items: List<CatalogItem>,
    favoriteIds: Set<String>,
    contentEntryFocusRequester: FocusRequester,
    sidebarFocusRequester: FocusRequester,
    onOpenItem: (CatalogItem) -> Unit,
    onToggleFavorite: (CatalogItem) -> Unit,
    columns: Int,
    cardWidth: Int,
    cardHeight: Int,
) {
    val categories = remember(items, title) {
        val grouped = items
            .groupBy { item -> item.categoryId.ifBlank { item.type } }
            .map { (categoryId, categoryItems) ->
                BrowseCategory(
                    id = categoryId,
                    label = displayCategoryName(categoryItems.first()),
                    count = categoryItems.size
                )
            }
            .sortedBy { it.label }

        buildList {
            add(BrowseCategory(id = "all", label = "All $title", count = items.size))
            addAll(grouped)
        }
    }
    var selectedCategoryId by remember(items, title) { mutableStateOf("all") }
    val selectedCategoryIndex = categories.indexOfFirst { it.id == selectedCategoryId }.coerceAtLeast(0)
    val selectedItems = remember(items, selectedCategoryId) {
        if (selectedCategoryId == "all") {
            items
        } else {
            items.filter { item -> item.categoryId.ifBlank { item.type } == selectedCategoryId }
        }
    }
    val gridEntryFocusRequester = remember { FocusRequester() }
    val categoryFocusRequesters = remember(categories.size) {
        List(categories.size) { FocusRequester() }
    }
    val selectedCategoryFocusRequester = if (selectedCategoryIndex == 0) {
        contentEntryFocusRequester
    } else {
        categoryFocusRequesters[selectedCategoryIndex]
    }

    Row(modifier = Modifier.fillMaxSize(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
        Column(
            modifier = Modifier
                .width(220.dp)
                .fillMaxHeight()
                .background(TvTokens.Colors.Surface.copy(alpha = 0.58f), RoundedCornerShape(18.dp))
                .border(1.dp, TvTokens.Colors.Border.copy(alpha = 0.68f), RoundedCornerShape(18.dp))
                .padding(horizontal = 14.dp, vertical = 14.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(text = title, style = TvTokens.TvType.H2, color = TvTokens.Colors.TextPrimary)
            Text(
                text = "${items.size} titles available",
                style = TvTokens.TvType.LabelSmall,
                color = TvTokens.Colors.TextSecondary
            )
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                lazyItemsIndexed(categories, key = { _, category -> category.id }) { index, category ->
                    BrowseCategoryItem(
                        category = category,
                        selected = category.id == selectedCategoryId,
                        focusRequester = if (index == 0) contentEntryFocusRequester else categoryFocusRequesters[index],
                        leftFocusRequester = sidebarFocusRequester,
                        rightFocusRequester = if (selectedItems.isNotEmpty()) gridEntryFocusRequester else null,
                        onClick = { selectedCategoryId = category.id }
                    )
                }
            }
        }

        Column(
            modifier = Modifier
                .weight(1f)
                .fillMaxHeight(),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            val selectedCategoryLabel = categories
                .getOrNull(selectedCategoryIndex)
                ?.label
                ?: title
            Text(
                text = selectedCategoryLabel,
                style = TvTokens.TvType.H3.copy(fontSize = 16.sp, lineHeight = 20.sp),
                color = TvTokens.Colors.TextSecondary
            )
            if (selectedItems.isEmpty()) {
                CenterMessage(emptyMessage)
            } else {
                LazyVerticalGrid(
                    columns = GridCells.Fixed(columns),
                    modifier = Modifier.fillMaxSize(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    itemsIndexed(selectedItems, key = { _, item -> item.id }) { index, item ->
                        HomeContentCard(
                            item = item,
                            widthDp = cardWidth,
                            heightDp = cardHeight,
                            isFavorite = favoriteIds.contains(item.id),
                            focusRequester = if (index == 0) gridEntryFocusRequester else null,
                            leftFocusRequester = if (index % columns == 0) selectedCategoryFocusRequester else null,
                            onClick = { onOpenItem(item) },
                            onLongClick = { onToggleFavorite(item) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun BrowseCategoryItem(
    category: BrowseCategory,
    selected: Boolean,
    focusRequester: FocusRequester,
    leftFocusRequester: FocusRequester,
    rightFocusRequester: FocusRequester?,
    onClick: () -> Unit,
) {
    var focused by remember(category.id, selected) { mutableStateOf(false) }
    val backgroundColor = when {
        selected -> TvTokens.Colors.Primary.copy(alpha = 0.18f)
        focused -> TvTokens.Colors.SurfaceMuted.copy(alpha = 0.9f)
        else -> TvTokens.Colors.Surface.copy(alpha = 0.45f)
    }
    val borderColor = when {
        selected -> TvTokens.Colors.Primary
        focused -> TvTokens.Colors.FocusCyan
        else -> TvTokens.Colors.Border.copy(alpha = 0.7f)
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(backgroundColor, RoundedCornerShape(14.dp))
            .border(1.dp, borderColor, RoundedCornerShape(14.dp))
            .focusRequester(focusRequester)
            .focusProperties {
                left = leftFocusRequester
                rightFocusRequester?.let { right = it }
            }
            .onFocusChanged { focused = it.isFocused }
            .focusable()
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onClick
            )
            .padding(horizontal = 12.dp, vertical = 10.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = category.label,
            style = TvTokens.TvType.LabelMedium.copy(
                fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
                fontSize = 13.sp,
                lineHeight = 16.sp
            ),
            color = TvTokens.Colors.TextPrimary,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f)
        )
        Text(
            text = category.count.toString(),
            style = TvTokens.TvType.LabelSmall.copy(fontSize = 11.sp, lineHeight = 14.sp),
            color = if (selected) TvTokens.Colors.Primary else TvTokens.Colors.TextSecondary
        )
    }
}

@Composable
private fun CatalogGrid(
    subtitle: String,
    items: List<CatalogItem>,
    favoriteIds: Set<String>,
    contentEntryFocusRequester: FocusRequester,
    sidebarFocusRequester: FocusRequester,
    onOpenItem: (CatalogItem) -> Unit,
    onToggleFavorite: (CatalogItem) -> Unit,
    modifier: Modifier = Modifier.fillMaxSize(),
) {
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text(
            text = subtitle,
            style = TvTokens.TvType.H3.copy(fontSize = 16.sp, lineHeight = 20.sp),
            color = TvTokens.Colors.TextSecondary
        )
        if (items.isEmpty()) {
            CenterMessage("No content available.")
            return@Column
        }
        LazyVerticalGrid(
            columns = GridCells.Fixed(6),
            modifier = Modifier.fillMaxSize(),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            itemsIndexed(items, key = { _, item -> item.id }) { index, item ->
                HomeContentCard(
                    item = item,
                    isFavorite = favoriteIds.contains(item.id),
                    requestInitialFocus = index == 0,
                    focusRequester = if (index == 0) contentEntryFocusRequester else null,
                    leftFocusRequester = if (index == 0) sidebarFocusRequester else null,
                    onClick = { onOpenItem(item) },
                    onLongClick = { onToggleFavorite(item) }
                )
            }
        }
    }
}

@Composable
private fun FavoritesTabScreen(
    items: List<CatalogItem>,
    favoriteIds: Set<String>,
    contentEntryFocusRequester: FocusRequester,
    sidebarFocusRequester: FocusRequester,
    onOpenItem: (CatalogItem) -> Unit,
    onToggleFavorite: (CatalogItem) -> Unit,
) {
    Column(modifier = Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text(
            text = "Saved favorites",
            style = TvTokens.TvType.H3.copy(fontSize = 16.sp, lineHeight = 20.sp),
            color = TvTokens.Colors.TextSecondary
        )
        if (items.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(TvTokens.Colors.Surface.copy(alpha = 0.48f), RoundedCornerShape(18.dp))
                    .border(1.dp, TvTokens.Colors.Border.copy(alpha = 0.7f), RoundedCornerShape(18.dp))
                    .padding(24.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(text = "Favorites Empty", style = TvTokens.TvType.H2, color = TvTokens.Colors.TextPrimary)
                    Text(
                        text = "Long-press any poster or channel to save it here for instant access.",
                        style = TvTokens.TvType.BodyMedium,
                        color = TvTokens.Colors.TextSecondary
                    )
                    Text(
                        text = "Use Home, Live, Movies, or Series to build your library.",
                        style = TvTokens.TvType.LabelMedium,
                        color = TvTokens.Colors.TextMuted
                    )
                }
            }
            return@Column
        }

        LazyVerticalGrid(
            columns = GridCells.Fixed(5),
            modifier = Modifier.fillMaxSize(),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            itemsIndexed(items, key = { _, item -> item.id }) { index, item ->
                HomeContentCard(
                    item = item,
                    widthDp = 132,
                    heightDp = 198,
                    isFavorite = favoriteIds.contains(item.id),
                    requestInitialFocus = index == 0,
                    focusRequester = if (index == 0) contentEntryFocusRequester else null,
                    leftFocusRequester = if (index == 0) sidebarFocusRequester else null,
                    onClick = { onOpenItem(item) },
                    onLongClick = { onToggleFavorite(item) }
                )
            }
        }
    }
}

private data class HomeAnnouncement(
    val id: String,
    val category: String,
    val title: String,
    val body: String,
    val tag: String,
    val urgent: Boolean = false,
)

private fun stripHtml(html: String): String {
    return html.replace(Regex("<[^>]*>"), "")
        .replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&quot;", "\"")
        .replace("&apos;", "'")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .trim()
}

@Composable
private fun AnnouncementsTabScreen(
    account: AccountSummary,
    downloadSummary: DownloadSummary,
    settings: TvAppSettings,
    remoteAnnouncements: List<com.smartifly.tv.data.remote.MasterBroadcastDto>,
    portalAnnouncements: List<com.smartifly.tv.data.remote.MasterAnnouncementDto>,
    contentEntryFocusRequester: FocusRequester,
    sidebarFocusRequester: FocusRequester,
) {
    val announcements = remember(account, downloadSummary, settings, remoteAnnouncements, portalAnnouncements) {
        buildList {
            // 1. Global Master Announcements (Priority 1)
            remoteAnnouncements.forEach { remote ->
                add(
                    HomeAnnouncement(
                        id = "master_${remote.id ?: "anon"}",
                        category = when (remote.type?.uppercase()) {
                            "EMERGENCY" -> "critical"
                            "WARNING" -> "critical"
                            else -> "general"
                        },
                        title = remote.type?.uppercase() ?: "ANNOUNCEMENT",
                        body = remote.message ?: "",
                        tag = "OFFICIAL",
                        urgent = remote.type?.uppercase() == "EMERGENCY" || remote.type?.uppercase() == "WARNING"
                    )
                )
            }

            // 2. Xtream Portal Announcements (Priority 2)
            portalAnnouncements.forEach { portal ->
                add(
                    HomeAnnouncement(
                        id = "portal_${portal.id ?: "anon"}",
                        category = "system", // Group portal messages in System category to avoid 0 count
                        title = portal.title ?: "Information",
                        body = stripHtml(portal.message ?: portal.content ?: ""),
                        tag = "ADMIN",
                        urgent = portal.priority?.lowercase() == "high" || portal.priority?.lowercase() == "critical"
                    )
                )
            }
            
            // 3. System Fallback
            if (remoteAnnouncements.isEmpty() && portalAnnouncements.isEmpty()) {
                add(
                    HomeAnnouncement(
                        id = "system_portal",
                        category = "system",
                        title = "Portal Connected",
                        body = "Signed in to ${account.serverLabel.ifBlank { "your Smartifly server" }} as ${account.username}.",
                        tag = "SYSTEM"
                    )
                )
            }
        }
    }
    val categories = remember(announcements) {
        listOf(
            BrowseCategory("all", "All Announcements", announcements.size),
            BrowseCategory("system", "System Messages", announcements.count { it.category == "system" }),
            BrowseCategory("critical", "Critical Alerts", announcements.count { it.category == "critical" }),
            BrowseCategory("general", "General Info", announcements.count { it.category == "general" })
        )
    }
    var selectedCategoryId by remember(announcements) { mutableStateOf("all") }
    val filteredAnnouncements = remember(announcements, selectedCategoryId) {
        if (selectedCategoryId == "all") announcements else announcements.filter { it.category == selectedCategoryId }
    }

    Row(modifier = Modifier.fillMaxSize(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
        Column(
            modifier = Modifier
                .width(250.dp)
                .fillMaxHeight()
                .background(TvTokens.Colors.Surface.copy(alpha = 0.58f), RoundedCornerShape(18.dp))
                .border(1.dp, TvTokens.Colors.Border.copy(alpha = 0.68f), RoundedCornerShape(18.dp))
                .padding(horizontal = 14.dp, vertical = 14.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(text = "Announcements", style = TvTokens.TvType.H2, color = TvTokens.Colors.TextPrimary)
            LazyColumn(modifier = Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                lazyItemsIndexed(categories, key = { _, category -> category.id }) { index, category ->
                    BrowseCategoryItem(
                        category = category,
                        selected = category.id == selectedCategoryId,
                        focusRequester = if (index == 0) contentEntryFocusRequester else FocusRequester(),
                        leftFocusRequester = sidebarFocusRequester,
                        rightFocusRequester = null,
                        onClick = { selectedCategoryId = category.id }
                    )
                }
            }
        }

        if (filteredAnnouncements.isEmpty()) {
            CenterMessage("No announcements in this category.")
        } else {
            LazyColumn(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                lazyItemsIndexed(filteredAnnouncements, key = { _, item -> item.id }) { _, item ->
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(
                                if (item.urgent) TvTokens.Colors.Error.copy(alpha = 0.14f) else TvTokens.Colors.Surface.copy(alpha = 0.54f),
                                RoundedCornerShape(18.dp)
                            )
                            .border(
                                1.dp,
                                if (item.urgent) TvTokens.Colors.Error.copy(alpha = 0.72f) else TvTokens.Colors.Border.copy(alpha = 0.7f),
                                RoundedCornerShape(18.dp)
                            )
                            .padding(18.dp)
                    ) {
                        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Row(horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                Text(text = item.title, style = TvTokens.TvType.H3, color = TvTokens.Colors.TextPrimary)
                                Box(
                                    modifier = Modifier
                                        .background(
                                            if (item.urgent) TvTokens.Colors.Error else TvTokens.Colors.Primary,
                                            RoundedCornerShape(999.dp)
                                        )
                                        .padding(horizontal = 10.dp, vertical = 4.dp)
                                ) {
                                    Text(
                                        text = item.tag,
                                        style = TvTokens.TvType.LabelSmall.copy(fontWeight = FontWeight.Bold, fontSize = 10.sp),
                                        color = TvTokens.Colors.TextPrimary
                                    )
                                }
                            }
                            Text(
                                text = item.body,
                                style = TvTokens.TvType.BodyMedium,
                                color = TvTokens.Colors.TextSecondary
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun CenterMessage(text: String) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Icon(imageVector = Icons.Default.Info, contentDescription = null, tint = TvTokens.Colors.TextMuted)
            Text(text = text, style = TvTokens.TvType.H3, color = TvTokens.Colors.TextSecondary)
        }
    }
}

@Composable
private fun UpdateDialog(
    update: com.smartifly.tv.data.remote.UpdateResponseDto,
    isInstalling: Boolean,
    installProgressPercent: Int?,
    installPhase: com.smartifly.tv.core.update.UpdateInstallPhase?,
    errorMessage: String?,
    onUpdate: () -> Unit,
    onDismiss: () -> Unit,
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.88f))
            .clickable(enabled = !update.isMandatory) { onDismiss() },
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier
                .width(420.dp)
                .background(TvTokens.Colors.Surface, RoundedCornerShape(24.dp))
                .border(2.dp, TvTokens.Colors.Primary, RoundedCornerShape(24.dp))
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            Icon(
                imageVector = Icons.Default.Info,
                contentDescription = null,
                tint = TvTokens.Colors.Primary,
                modifier = Modifier.size(56.dp)
            )
            
            Text(
                text = "New Update Available",
                style = TvTokens.TvType.H2,
                color = TvTokens.Colors.TextPrimary
            )
            
            Text(
                text = "Version ${update.versionName ?: "vNext"} is now available. ${update.releaseNotes ?: "This update includes performance improvements and bug fixes."}",
                style = TvTokens.TvType.BodyMedium,
                color = TvTokens.Colors.TextSecondary,
                textAlign = TextAlign.Center
            )

            if (isInstalling) {
                Text(
                    text = when (installPhase) {
                        com.smartifly.tv.core.update.UpdateInstallPhase.DOWNLOADING -> {
                            val progressLabel = installProgressPercent?.let { "$it%" } ?: "Preparing"
                            "Downloading update: $progressLabel"
                        }
                        com.smartifly.tv.core.update.UpdateInstallPhase.INSTALL_READY -> "Installer ready. Follow the system prompt to continue."
                        null -> "Preparing update..."
                    },
                    style = TvTokens.TvType.LabelSmall,
                    color = TvTokens.Colors.TextSecondary,
                    textAlign = TextAlign.Center
                )
            }
            
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                TvFocusButton(
                    text = if (isInstalling) {
                        when (installPhase) {
                            com.smartifly.tv.core.update.UpdateInstallPhase.DOWNLOADING -> {
                                "Downloading ${installProgressPercent ?: 0}%"
                            }
                            com.smartifly.tv.core.update.UpdateInstallPhase.INSTALL_READY -> "Install Ready"
                            null -> "Preparing Update..."
                        }
                    } else {
                        "Update Now"
                    },
                    primary = true,
                    requestInitialFocus = true,
                    enabled = !isInstalling,
                    onClick = onUpdate
                )

                if (!errorMessage.isNullOrBlank()) {
                    Text(
                        text = errorMessage,
                        style = TvTokens.TvType.LabelSmall,
                        color = TvTokens.Colors.Error,
                        textAlign = TextAlign.Center
                    )
                }
                 
                if (!update.isMandatory) {
                    TvFocusButton(
                        text = "Later",
                        onClick = onDismiss
                    )
                }
            }
        }
    }
}

private fun displayCategoryName(item: CatalogItem): String {
    return item.categoryName
        .takeIf { it.isNotBlank() }
        ?: normalizeCategoryLabel(item.categoryId.ifBlank { item.type })
}

private fun normalizeCategoryLabel(rawValue: String): String {
    return rawValue
        .replace('_', ' ')
        .replace('-', ' ')
        .trim()
        .split(' ')
        .filter { it.isNotBlank() }
        .joinToString(" ") { segment ->
            segment.lowercase().replaceFirstChar { it.uppercase() }
        }
}

@Composable
private fun DownloadsTabScreen(
    downloads: List<TvDownloadItem>,
    summary: DownloadSummary,
    contentEntryFocusRequester: FocusRequester,
    sidebarFocusRequester: FocusRequester,
    onPlayDownload: (TvDownloadItem) -> Unit,
    onPauseDownload: (String) -> Unit,
    onResumeDownload: (String) -> Unit,
    onRetryDownload: (String) -> Unit,
    onRefreshStatuses: () -> Unit,
    onRemoveDownload: (String) -> Unit,
    onClearCompleted: () -> Unit,
) {
    val activeDownloads = remember(downloads) {
        downloads.filter { it.status == TvDownloadStatus.QUEUED || it.status == TvDownloadStatus.DOWNLOADING || it.status == TvDownloadStatus.PAUSED }
    }
    val completedDownloads = remember(downloads) { downloads.filter { it.status == TvDownloadStatus.COMPLETED } }
    val failedDownloads = remember(downloads) { downloads.filter { it.status == TvDownloadStatus.FAILED } }

    LazyColumn(modifier = Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
                TvFocusButton(
                    text = "Refresh",
                    compact = true,
                    requestInitialFocus = true,
                    focusRequester = contentEntryFocusRequester,
                    leftFocusRequester = sidebarFocusRequester,
                    onClick = onRefreshStatuses
                )
                TvFocusButton(text = "Clear Completed", compact = true, onClick = onClearCompleted)
                Text(
                    text = "${summary.totalItems} total | ${formatBytes(summary.usedBytes)} used",
                    style = TvTokens.TvType.LabelSmall,
                    color = TvTokens.Colors.TextSecondary
                )
            }
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                DownloadSummaryCard("Active", summary.activeItems.toString())
                DownloadSummaryCard("Ready", summary.completedItems.toString())
                DownloadSummaryCard("Failed", summary.failedItems.toString(), highlight = summary.failedItems > 0)
            }
        }
        if (downloads.isEmpty()) {
            item {
                CenterMessage("No downloads queued.")
            }
            return@LazyColumn
        }
        if (activeDownloads.isNotEmpty()) {
            item {
                DownloadGridSection(
                    title = "Downloading",
                    downloads = activeDownloads,
                    entryFocusRequester = null,
                    entryLeftFocusRequester = sidebarFocusRequester,
                    onPlayDownload = onPlayDownload,
                    onPauseDownload = onPauseDownload,
                    onResumeDownload = onResumeDownload,
                    onRetryDownload = onRetryDownload,
                    onRemoveDownload = onRemoveDownload
                )
            }
        }
        if (completedDownloads.isNotEmpty()) {
            item {
                DownloadGridSection(
                    title = "Available Offline",
                    downloads = completedDownloads,
                    entryFocusRequester = if (activeDownloads.isEmpty()) contentEntryFocusRequester else null,
                    entryLeftFocusRequester = sidebarFocusRequester,
                    onPlayDownload = onPlayDownload,
                    onPauseDownload = onPauseDownload,
                    onResumeDownload = onResumeDownload,
                    onRetryDownload = onRetryDownload,
                    onRemoveDownload = onRemoveDownload
                )
            }
        }
        if (failedDownloads.isNotEmpty()) {
            item {
                DownloadGridSection(
                    title = "Needs Attention",
                    downloads = failedDownloads,
                    entryFocusRequester = null,
                    entryLeftFocusRequester = sidebarFocusRequester,
                    onPlayDownload = onPlayDownload,
                    onPauseDownload = onPauseDownload,
                    onResumeDownload = onResumeDownload,
                    onRetryDownload = onRetryDownload,
                    onRemoveDownload = onRemoveDownload
                )
            }
        }
    }
}

@Composable
private fun SettingsTabScreen(
    account: AccountSummary,
    activeProfile: com.smartifly.tv.domain.model.UserProfile?,
    downloadSummary: DownloadSummary,
    favoriteCount: Int,
    settings: TvAppSettings,
    contentEntryFocusRequester: FocusRequester,
    sidebarFocusRequester: FocusRequester,
    onSwitchProfile: () -> Unit,
    onSwitchAccount: () -> Unit,
    onLogout: () -> Unit,
    onRefreshCatalog: () -> Unit,
    onRefreshDownloads: () -> Unit,
    onClearFavorites: () -> Unit,
    onClearFailedDownloads: () -> Unit,
    onClearCompletedDownloads: () -> Unit,
    onClearAllDownloads: () -> Unit,
    onResetSettings: () -> Unit,
    onUpdateSettings: (transform: (TvAppSettings) -> TvAppSettings) -> Unit,
) {
    val sections = listOf(
        SettingsSection("Account", Icons.Default.AccountCircle),
        SettingsSection("Profiles", Icons.Default.ManageAccounts),
        SettingsSection("Playback", Icons.Default.PlayArrow),
        SettingsSection("App", Icons.Default.Settings),
        SettingsSection("About", Icons.Default.Info),
    )
    var selectedSection by remember { mutableStateOf(sections.first().label) }

    Row(modifier = Modifier.fillMaxSize(), horizontalArrangement = Arrangement.spacedBy(26.dp)) {
        Column(
            modifier = Modifier
                .width(320.dp)
                .fillMaxHeight()
                .background(TvTokens.Colors.Surface.copy(alpha = 0.34f), RoundedCornerShape(18.dp))
                .border(1.dp, TvTokens.Colors.Border.copy(alpha = 0.42f), RoundedCornerShape(18.dp))
                .padding(horizontal = 30.dp, vertical = 34.dp),
            verticalArrangement = Arrangement.spacedBy(22.dp)
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    text = "SETTINGS",
                    style = TvTokens.TvType.H2.copy(fontWeight = FontWeight.Black, letterSpacing = 4.sp),
                    color = TvTokens.Colors.AccentCyan
                )
                Box(
                    modifier = Modifier
                        .width(40.dp)
                        .height(3.dp)
                        .background(TvTokens.Colors.AccentCyan, RoundedCornerShape(999.dp))
                )
            }
            LazyColumn(modifier = Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                lazyItemsIndexed(sections, key = { _, section -> section }) { index, section ->
                    SettingsSectionItem(
                        label = section.label,
                        icon = section.icon,
                        selected = section.label == selectedSection,
                        focusRequester = if (index == 0) contentEntryFocusRequester else null,
                        leftFocusRequester = sidebarFocusRequester,
                        onClick = { selectedSection = section.label }
                    )
                }
            }
        }

        LazyColumn(
            modifier = Modifier.weight(1f),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(top = 10.dp, bottom = 28.dp, end = 8.dp),
            verticalArrangement = Arrangement.spacedBy(18.dp)
        ) {
            when (selectedSection) {
                "Account" -> {
                    item {
                        SettingsHeroCard(
                            title = account.username.ifBlank { "Smartifly User" },
                            subtitle = account.serverLabel.ifBlank { "Connected account" },
                            badge = if ((account.expDate ?: "").isNotBlank()) "ACTIVE" else "STANDARD",
                            badgeColor = TvTokens.Colors.Primary,
                        )
                    }
                    item {
                        SettingsSectionHeading("Subscription HUD")
                    }
                    item {
                        SettingsInfoCard(
                            title = "Service Account",
                            lines = listOf(
                                "Expiration: ${account.expDate ?: "Unknown"}",
                                "Connections: ${account.activeConnections}/${account.maxConnections}",
                                "Portal: ${account.serverLabel}",
                            )
                        )
                    }
                    item {
                        SettingsActionRow(
                            label = "Portal Switcher",
                            value = "Manage Accounts",
                            leftFocusRequester = sidebarFocusRequester,
                            onClick = onSwitchAccount
                        )
                    }
                    item {
                        SettingsActionRow(
                            label = "Sync Catalog",
                            value = "Refresh Home Data",
                            leftFocusRequester = sidebarFocusRequester,
                            onClick = onRefreshCatalog
                        )
                    }
                    item {
                        SettingsActionRow(
                            label = "Sync Downloads",
                            value = "Refresh Offline Status",
                            leftFocusRequester = sidebarFocusRequester,
                            onClick = onRefreshDownloads
                        )
                    }
                    item {
                        SettingsActionRow(
                            label = "Terminate Session",
                            value = "Sign Out",
                            leftFocusRequester = sidebarFocusRequester,
                            accentColor = TvTokens.Colors.Error,
                            onClick = onLogout
                        )
                    }
                }
                "Profiles" -> {
                    item {
                        SettingsHeroCard(
                            title = activeProfile?.name ?: "Primary Profile",
                            subtitle = if (activeProfile?.isKidsProfile == true) "Kids profile active" else "Adult profile active",
                            badge = if (activeProfile?.isKidsProfile == true) "KIDS MODE" else "STANDARD",
                            badgeColor = if (activeProfile?.isKidsProfile == true) TvTokens.Colors.Success else TvTokens.Colors.AccentCyan,
                        )
                    }
                    item {
                        SettingsSectionHeading("Parental Controls")
                    }
                    item {
                        SettingsInfoCard(
                            title = "Profile Rules",
                            lines = listOf(
                                "Content Rating: ${activeProfile?.maxRating ?: "NC-17"}",
                                "PIN Protection: ${if (activeProfile?.pinRequired == true) "Enabled" else "Disabled"}",
                            )
                        )
                    }
                    item {
                        SettingsActionRow(
                            label = "Switch Profile",
                            value = "Show All Profiles",
                            leftFocusRequester = sidebarFocusRequester,
                            onClick = onSwitchProfile
                        )
                    }
                    item {
                        SettingsActionRow(
                            label = "Profile Controls",
                            value = if (activeProfile?.isKidsProfile == true) "Kids Safeguards On" else "Adult Access",
                            leftFocusRequester = sidebarFocusRequester,
                            onClick = onSwitchProfile
                        )
                    }
                }
                "Playback" -> {
                    item {
                        SettingsSectionHeading("Engine Configuration")
                    }
                    item {
                        SettingsActionRow(
                            label = "Default Quality",
                            value = settings.defaultQuality,
                            leftFocusRequester = sidebarFocusRequester,
                            onClick = {
                                val next = cycleValue(settings.defaultQuality, listOf("Auto", "1080p", "720p", "480p"))
                                onUpdateSettings { it.copy(defaultQuality = next) }
                            }
                        )
                    }
                    item {
                        SettingsActionRow(
                            label = "Playback Speed",
                            value = "${settings.defaultPlaybackSpeed}x",
                            leftFocusRequester = sidebarFocusRequester,
                            onClick = {
                                val next = cycleValue(settings.defaultPlaybackSpeed, listOf(0.75f, 1.0f, 1.25f, 1.5f, 2.0f))
                                onUpdateSettings { it.copy(defaultPlaybackSpeed = next) }
                            }
                        )
                    }
                    item {
                        SettingsActionRow(
                            label = "Audio Language",
                            value = settings.preferredAudioLanguage,
                            leftFocusRequester = sidebarFocusRequester,
                            onClick = {
                                val next = cycleValue(settings.preferredAudioLanguage, listOf("System", "English", "Spanish"))
                                onUpdateSettings { it.copy(preferredAudioLanguage = next) }
                            }
                        )
                    }
                    item {
                        SettingsActionRow(
                            label = "Subtitle Engine",
                            value = settings.preferredSubtitleLanguage,
                            leftFocusRequester = sidebarFocusRequester,
                            onClick = {
                                val next = cycleValue(settings.preferredSubtitleLanguage, listOf("Off", "English", "Spanish"))
                                onUpdateSettings { it.copy(preferredSubtitleLanguage = next) }
                            }
                        )
                    }
                    item {
                        SettingsActionRow(
                            label = "Aspect Ratio",
                            value = settings.aspectMode,
                            leftFocusRequester = sidebarFocusRequester,
                            onClick = {
                                val next = cycleValue(settings.aspectMode, listOf("Fit", "Fill", "Stretch"))
                                onUpdateSettings { it.copy(aspectMode = next) }
                            }
                        )
                    }
                    item {
                        SettingsActionRow(
                            label = "Autoplay Next Episode",
                            value = if (settings.autoPlayNextEpisode) "Enabled" else "Disabled",
                            leftFocusRequester = sidebarFocusRequester,
                            onClick = { onUpdateSettings { it.copy(autoPlayNextEpisode = !it.autoPlayNextEpisode) } }
                        )
                    }
                    item {
                        SettingsActionRow(
                            label = "Player Stats",
                            value = if (settings.showPlayerStats) "Visible" else "Hidden",
                            leftFocusRequester = sidebarFocusRequester,
                            onClick = { onUpdateSettings { it.copy(showPlayerStats = !it.showPlayerStats) } }
                        )
                    }
                }
                "App" -> {
                    item {
                        SettingsSectionHeading("Interface")
                    }
                    item {
                        SettingsActionRow(
                            label = "Favorites Stored",
                            value = favoriteCount.toString(),
                            leftFocusRequester = sidebarFocusRequester,
                            onClick = {}
                        )
                    }
                    item {
                        SettingsActionRow(
                            label = "Offline Ready",
                            value = downloadSummary.completedItems.toString(),
                            leftFocusRequester = sidebarFocusRequester,
                            onClick = {}
                        )
                    }
                    item {
                        SettingsActionRow(
                            label = "Reset Settings",
                            value = "Restore Defaults",
                            leftFocusRequester = sidebarFocusRequester,
                            onClick = onResetSettings
                        )
                    }
                    item {
                        SettingsSectionHeading("Maintenance")
                    }
                    item {
                        SettingsActionRow(
                            label = "Clear Favorites",
                            value = "Remove Saved Titles",
                            leftFocusRequester = sidebarFocusRequester,
                            onClick = onClearFavorites
                        )
                    }
                    item {
                        SettingsActionRow(
                            label = "Clear Failed Downloads",
                            value = "Purge Failed Queue",
                            leftFocusRequester = sidebarFocusRequester,
                            onClick = onClearFailedDownloads
                        )
                    }
                    item {
                        SettingsActionRow(
                            label = "Clear Completed Downloads",
                            value = "Purge Ready Files",
                            leftFocusRequester = sidebarFocusRequester,
                            onClick = onClearCompletedDownloads
                        )
                    }
                    item {
                        SettingsActionRow(
                            label = "Clear All Downloads",
                            value = "Remove Offline Library",
                            leftFocusRequester = sidebarFocusRequester,
                            accentColor = TvTokens.Colors.Error,
                            onClick = onClearAllDownloads
                        )
                    }
                }
                "About" -> {
                    item {
                        SettingsInfoCard(
                            title = "System Manifest",
                            lines = listOf(
                                "Service: ${account.serverLabel}",
                                "User: ${account.username}",
                                "Quality default: ${settings.defaultQuality}",
                                "Playback stats: ${if (settings.showPlayerStats) "Enabled" else "Disabled"}",
                                "Offline storage: ${formatBytes(downloadSummary.usedBytes)}",
                            )
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun DownloadSummaryCard(
    label: String,
    value: String,
    highlight: Boolean = false,
) {
    Box(
        modifier = Modifier
            .background(
                if (highlight) TvTokens.Colors.Error.copy(alpha = 0.14f) else TvTokens.Colors.Surface.copy(alpha = 0.58f),
                RoundedCornerShape(14.dp)
            )
            .border(
                1.dp,
                if (highlight) TvTokens.Colors.Error.copy(alpha = 0.72f) else TvTokens.Colors.Border.copy(alpha = 0.7f),
                RoundedCornerShape(14.dp)
            )
            .padding(horizontal = 16.dp, vertical = 12.dp)
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(text = label, style = TvTokens.TvType.LabelSmall, color = TvTokens.Colors.TextSecondary)
            Text(text = value, style = TvTokens.TvType.H2, color = TvTokens.Colors.TextPrimary)
        }
    }
}

@Composable
private fun DownloadGridSection(
    title: String,
    downloads: List<TvDownloadItem>,
    entryFocusRequester: FocusRequester?,
    entryLeftFocusRequester: FocusRequester,
    onPlayDownload: (TvDownloadItem) -> Unit,
    onPauseDownload: (String) -> Unit,
    onResumeDownload: (String) -> Unit,
    onRetryDownload: (String) -> Unit,
    onRemoveDownload: (String) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text(
            text = title,
            style = TvTokens.TvType.H3.copy(fontSize = 16.sp, lineHeight = 20.sp),
            color = TvTokens.Colors.TextSecondary
        )
        LazyVerticalGrid(
            columns = GridCells.Fixed(4),
            modifier = Modifier.height(360.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            itemsIndexed(downloads, key = { _, item -> item.id }) { index, item ->
                DownloadTile(
                    item = item,
                    requestInitialFocus = index == 0 && entryFocusRequester != null,
                    focusRequester = if (index == 0) entryFocusRequester else null,
                    leftFocusRequester = if (index % 4 == 0) entryLeftFocusRequester else null,
                    onPlayDownload = onPlayDownload,
                    onPauseDownload = onPauseDownload,
                    onResumeDownload = onResumeDownload,
                    onRetryDownload = onRetryDownload,
                    onRemoveDownload = onRemoveDownload
                )
            }
        }
    }
}

@Composable
private fun DownloadTile(
    item: TvDownloadItem,
    requestInitialFocus: Boolean,
    focusRequester: FocusRequester?,
    leftFocusRequester: FocusRequester?,
    onPlayDownload: (TvDownloadItem) -> Unit,
    onPauseDownload: (String) -> Unit,
    onResumeDownload: (String) -> Unit,
    onRetryDownload: (String) -> Unit,
    onRemoveDownload: (String) -> Unit,
) {
    var focused by remember(item.id) { mutableStateOf(false) }
    val internalFocusRequester = remember { FocusRequester() }
    val resolvedFocusRequester = focusRequester ?: internalFocusRequester
    var didRequestFocus by remember(item.id) { mutableStateOf(false) }
    val statusText = when (item.status) {
        TvDownloadStatus.QUEUED -> "Queued"
        TvDownloadStatus.DOWNLOADING -> "Downloading ${item.progress}%"
        TvDownloadStatus.PAUSED -> item.errorMessage ?: "Paused ${item.progress}%"
        TvDownloadStatus.COMPLETED -> "Ready Offline"
        TvDownloadStatus.FAILED -> item.errorMessage ?: "Failed - Retry"
    }

    androidx.compose.runtime.LaunchedEffect(requestInitialFocus) {
        if (requestInitialFocus && !didRequestFocus) {
            resolvedFocusRequester.requestFocus()
            didRequestFocus = true
        }
    }

    Box(
        modifier = Modifier
            .background(TvTokens.Colors.Surface.copy(alpha = 0.7f), RoundedCornerShape(16.dp))
            .border(
                if (focused) 2.dp else 1.dp,
                when (item.status) {
                    TvDownloadStatus.COMPLETED -> TvTokens.Colors.AccentGold
                    TvDownloadStatus.FAILED -> TvTokens.Colors.Error
                    else -> TvTokens.Colors.Border
                },
                RoundedCornerShape(16.dp)
            )
            .focusRequester(resolvedFocusRequester)
            .focusProperties { leftFocusRequester?.let { left = it } }
            .onFocusChanged { focused = it.isFocused }
            .focusable()
            .combinedClickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = {
                    when (item.status) {
                        TvDownloadStatus.COMPLETED -> onPlayDownload(item)
                        TvDownloadStatus.PAUSED -> onResumeDownload(item.id)
                        TvDownloadStatus.FAILED -> onRetryDownload(item.id)
                        TvDownloadStatus.QUEUED,
                        TvDownloadStatus.DOWNLOADING -> onPauseDownload(item.id)
                    }
                },
                onLongClick = { onRemoveDownload(item.id) }
            )
            .padding(14.dp)
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = item.title,
                    style = TvTokens.TvType.LabelMedium.copy(fontWeight = FontWeight.SemiBold),
                    color = TvTokens.Colors.TextPrimary,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f)
                )
                Box(
                    modifier = Modifier
                        .background(
                            when (item.status) {
                                TvDownloadStatus.COMPLETED -> TvTokens.Colors.AccentGold
                                TvDownloadStatus.FAILED -> TvTokens.Colors.Error
                                else -> TvTokens.Colors.Primary
                            },
                            RoundedCornerShape(999.dp)
                        )
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = item.type.uppercase(),
                        style = TvTokens.TvType.Badge.copy(fontSize = 9.sp),
                        color = TvTokens.Colors.TextInverse
                    )
                }
            }
            Text(text = statusText, style = TvTokens.TvType.LabelSmall, color = TvTokens.Colors.TextSecondary)
            if (item.status == TvDownloadStatus.DOWNLOADING || item.status == TvDownloadStatus.PAUSED) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(6.dp)
                        .background(TvTokens.Colors.SurfaceMuted, RoundedCornerShape(999.dp))
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth(item.progress.coerceIn(0, 100) / 100f)
                            .height(6.dp)
                            .background(TvTokens.Colors.Primary, RoundedCornerShape(999.dp))
                    )
                }
            }
            Text(
                text = if (focused) {
                    when (item.status) {
                        TvDownloadStatus.COMPLETED -> "Press to play. Long press to remove."
                        TvDownloadStatus.PAUSED -> "Press to resume. Long press to remove."
                        TvDownloadStatus.FAILED -> "Press to retry. Long press to remove."
                        TvDownloadStatus.QUEUED,
                        TvDownloadStatus.DOWNLOADING -> "Press to pause. Long press to remove."
                    }
                } else {
                    " "
                },
                style = TvTokens.TvType.LabelSmall.copy(fontSize = 11.sp),
                color = TvTokens.Colors.TextMuted
            )
        }
    }
}

private data class SettingsSection(
    val label: String,
    val icon: ImageVector,
)

@Composable
private fun SettingsSectionItem(
    label: String,
    icon: ImageVector,
    selected: Boolean,
    focusRequester: FocusRequester? = null,
    requestInitialFocus: Boolean = false,
    leftFocusRequester: FocusRequester,
    onClick: () -> Unit,
) {
    var focused by remember(label) { mutableStateOf(false) }
    val internalFocusRequester = remember { FocusRequester() }
    val resolvedFocusRequester = focusRequester ?: internalFocusRequester
    var didRequestFocus by remember(label) { mutableStateOf(false) }

    androidx.compose.runtime.LaunchedEffect(requestInitialFocus) {
        if (requestInitialFocus && !didRequestFocus) {
            resolvedFocusRequester.requestFocus()
            didRequestFocus = true
        }
    }
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .alpha(if (selected || focused) 1f else 0.94f)
            .background(
                when {
                    focused -> TvStyles.frostedPanelSoft
                    selected -> TvStyles.frostedPanel
                    else -> TvStyles.frostedPanelSoft
                },
                RoundedCornerShape(12.dp)
            )
            .border(
                1.dp,
                when {
                    focused -> TvTokens.Colors.FocusCyan.copy(alpha = 0.56f)
                    selected -> TvTokens.Colors.Primary.copy(alpha = 0.38f)
                    else -> TvTokens.Colors.Border.copy(alpha = 0.18f)
                },
                RoundedCornerShape(12.dp)
            )
            .focusRequester(resolvedFocusRequester)
            .focusProperties { left = leftFocusRequester }
            .onFocusChanged { focused = it.isFocused }
            .focusable()
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onClick
            )
            .padding(horizontal = 20.dp, vertical = 18.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = if (focused) TvTokens.Colors.FocusCyan else if (selected) TvTokens.Colors.Primary else TvTokens.Colors.TextTertiary,
            modifier = Modifier.size(22.dp)
        )
        androidx.compose.foundation.layout.Spacer(modifier = Modifier.width(18.dp))
        Text(
            text = label,
            style = TvTokens.TvType.LabelLarge.copy(fontWeight = if (selected || focused) FontWeight.Bold else FontWeight.SemiBold),
            color = TvTokens.Colors.TextPrimary,
            modifier = Modifier.weight(1f)
        )
        if (focused) {
            Box(
                modifier = Modifier
                    .size(6.dp)
                    .background(TvTokens.Colors.FocusCyan, RoundedCornerShape(999.dp))
            )
        }
    }
}

@Composable
private fun SettingsInfoCard(
    title: String,
    lines: List<String>,
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(TvStyles.frostedPanelSoft, RoundedCornerShape(18.dp))
            .border(1.dp, TvTokens.Colors.BorderStrong.copy(alpha = 0.22f), RoundedCornerShape(18.dp))
            .padding(24.dp)
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(text = title, style = TvTokens.TvType.H2, color = TvTokens.Colors.TextPrimary)
            lines.forEach { line ->
                Text(text = line, style = TvTokens.TvType.LabelMedium, color = TvTokens.Colors.TextSecondary)
            }
        }
    }
}

@Composable
private fun SettingsHeroCard(
    title: String,
    subtitle: String,
    badge: String,
    badgeColor: Color,
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(TvStyles.frostedPanel, RoundedCornerShape(18.dp))
            .border(1.dp, TvTokens.Colors.BorderStrong.copy(alpha = 0.24f), RoundedCornerShape(18.dp))
            .padding(horizontal = 30.dp, vertical = 26.dp)
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(
                text = title,
                style = TvTokens.TvType.H1.copy(fontWeight = FontWeight.Black),
                color = TvTokens.Colors.TextPrimary
            )
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .background(badgeColor.copy(alpha = 0.18f), RoundedCornerShape(999.dp))
                        .border(1.dp, badgeColor.copy(alpha = 0.5f), RoundedCornerShape(999.dp))
                        .padding(horizontal = 12.dp, vertical = 5.dp)
                ) {
                    Text(
                        text = badge,
                        style = TvTokens.TvType.Badge.copy(fontSize = 11.sp, lineHeight = 12.sp),
                        color = badgeColor,
                        fontWeight = FontWeight.Black
                    )
                }
                Text(
                    text = subtitle,
                    style = TvTokens.TvType.LabelMedium,
                    color = TvTokens.Colors.TextSecondary
                )
            }
        }
    }
}

@Composable
private fun SettingsSectionHeading(text: String) {
    Text(
        text = text.uppercase(),
        style = TvTokens.TvType.Badge.copy(fontSize = 12.sp, lineHeight = 13.sp, letterSpacing = 3.sp),
        color = TvTokens.Colors.AccentCyan,
        fontWeight = FontWeight.Black
    )
}

@Composable
private fun SettingsActionRow(
    label: String,
    value: String,
    focusRequester: FocusRequester? = null,
    requestInitialFocus: Boolean = false,
    leftFocusRequester: FocusRequester,
    accentColor: Color = TvTokens.Colors.AccentCyan,
    onClick: () -> Unit,
) {
    var focused by remember(label) { mutableStateOf(false) }
    val internalFocusRequester = remember { FocusRequester() }
    val resolvedFocusRequester = focusRequester ?: internalFocusRequester
    var didRequestFocus by remember(label) { mutableStateOf(false) }

    androidx.compose.runtime.LaunchedEffect(requestInitialFocus) {
        if (requestInitialFocus && !didRequestFocus) {
            resolvedFocusRequester.requestFocus()
            didRequestFocus = true
        }
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                if (focused) {
                    Brush.horizontalGradient(
                        colors = listOf(
                            accentColor.copy(alpha = 0.14f),
                            TvTokens.Colors.Surface.copy(alpha = 0.7f)
                        )
                    )
                } else {
                    TvStyles.frostedPanelSoft
                },
                RoundedCornerShape(4.dp)
            )
            .border(
                1.dp,
                if (focused) accentColor.copy(alpha = 0.5f) else TvTokens.Colors.Border.copy(alpha = 0.14f),
                RoundedCornerShape(4.dp)
            )
            .focusRequester(resolvedFocusRequester)
            .focusProperties { left = leftFocusRequester }
            .onFocusChanged { focused = it.isFocused }
            .focusable()
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onClick
            )
            .padding(horizontal = 30.dp, vertical = 24.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(horizontalArrangement = Arrangement.spacedBy(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .width(16.dp)
                    .height(2.dp)
                    .background(
                        if (focused) accentColor else accentColor.copy(alpha = 0.4f),
                        RoundedCornerShape(999.dp)
                    )
            )
            Text(
                text = label,
                style = TvTokens.TvType.LabelLarge.copy(fontWeight = if (focused) FontWeight.Bold else FontWeight.SemiBold),
                color = if (accentColor == TvTokens.Colors.Error) {
                    if (focused) accentColor else TvTokens.Colors.TextPrimary
                } else {
                    TvTokens.Colors.TextPrimary
                }
            )
        }
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = value,
                style = TvTokens.TvType.LabelMedium.copy(fontWeight = if (focused) FontWeight.Bold else FontWeight.Medium),
                color = if (focused) accentColor else TvTokens.Colors.TextMuted
            )
            Text(
                text = ">",
                style = TvTokens.TvType.H3.copy(fontWeight = FontWeight.Black),
                color = if (focused) accentColor else TvTokens.Colors.TextMuted
            )
        }
    }
}

private fun <T> cycleValue(current: T, options: List<T>): T {
    if (options.isEmpty()) return current
    val idx = options.indexOf(current).takeIf { it >= 0 } ?: 0
    return options[(idx + 1) % options.size]
}

private fun formatBytes(bytes: Long): String {
    if (bytes <= 0L) return "0 B"
    val kb = 1024.0
    val mb = kb * 1024.0
    val gb = mb * 1024.0
    val value = bytes.toDouble()
    return when {
        value >= gb -> String.format("%.2f GB", value / gb)
        value >= mb -> String.format("%.1f MB", value / mb)
        value >= kb -> String.format("%.1f KB", value / kb)
        else -> "$bytes B"
    }
}

@Preview(showBackground = true, widthDp = 960, heightDp = 540)
@Composable
private fun HomeTabScreenPreview() {
    val contentEntryFocusRequester = remember { FocusRequester() }
    val sidebarFocusRequester = remember { FocusRequester() }

    PreviewFrame {
        HomeTabScreen(
            hero = previewCatalogItems.first(),
            rails = previewHomeRails,
            allItems = previewCatalogItems,
            rawItemCount = previewCatalogItems.size,
            continueWatching = previewCatalogItems.take(2),
            favoriteIds = setOf("movie_202"),
            contentEntryFocusRequester = contentEntryFocusRequester,
            sidebarFocusRequester = sidebarFocusRequester,
            onOpenItem = {},
            onToggleFavorite = {}
        )
    }
}

@Preview(showBackground = true, widthDp = 960, heightDp = 540)
@Composable
private fun SearchTabScreenPreview() {
    val contentEntryFocusRequester = remember { FocusRequester() }
    val sidebarFocusRequester = remember { FocusRequester() }

    PreviewFrame {
        SearchTabScreen(
            query = "sig",
            results = previewCatalogItems.filter { it.title.contains("i", ignoreCase = true) },
            allItems = previewCatalogItems,
            favoriteIds = setOf("series_303"),
            contentEntryFocusRequester = contentEntryFocusRequester,
            sidebarFocusRequester = sidebarFocusRequester,
            onOpenItem = {},
            onToggleFavorite = {},
            onKeyPress = {},
            onBackspace = {},
            onClear = {}
        )
    }
}

@Preview(showBackground = true, widthDp = 960, heightDp = 540)
@Composable
private fun DownloadsTabScreenPreview() {
    val contentEntryFocusRequester = remember { FocusRequester() }
    val sidebarFocusRequester = remember { FocusRequester() }

    PreviewFrame {
        DownloadsTabScreen(
            downloads = previewDownloads,
            summary = previewDownloadSummary,
            contentEntryFocusRequester = contentEntryFocusRequester,
            sidebarFocusRequester = sidebarFocusRequester,
            onPlayDownload = {},
            onPauseDownload = {},
            onResumeDownload = {},
            onRetryDownload = {},
            onRefreshStatuses = {},
            onRemoveDownload = {},
            onClearCompleted = {}
        )
    }
}

@Preview(showBackground = true, widthDp = 960, heightDp = 540)
@Composable
private fun SettingsTabScreenPreview() {
    val contentEntryFocusRequester = remember { FocusRequester() }
    val sidebarFocusRequester = remember { FocusRequester() }

    PreviewFrame {
        SettingsTabScreen(
            account = previewAccountSummary,
            activeProfile = null,
            downloadSummary = previewDownloadSummary,
            favoriteCount = 4,
            settings = previewAppSettings,
            contentEntryFocusRequester = contentEntryFocusRequester,
            sidebarFocusRequester = sidebarFocusRequester,
            onSwitchProfile = {},
            onSwitchAccount = {},
            onLogout = {},
            onRefreshCatalog = {},
            onRefreshDownloads = {},
            onClearFavorites = {},
            onClearFailedDownloads = {},
            onClearCompletedDownloads = {},
            onClearAllDownloads = {},
            onResetSettings = {},
            onUpdateSettings = { _ -> }
        )
    }
}

