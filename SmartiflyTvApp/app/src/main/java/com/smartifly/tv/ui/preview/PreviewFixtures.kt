package com.smartifly.tv.ui.preview

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.smartifly.tv.domain.model.CatalogItem
import com.smartifly.tv.domain.model.HomeRail
import com.smartifly.tv.domain.model.MovieDetail
import com.smartifly.tv.domain.model.PlaybackSession
import com.smartifly.tv.domain.model.Portal
import com.smartifly.tv.domain.model.SeriesDetail
import com.smartifly.tv.domain.model.SeriesEpisode
import com.smartifly.tv.domain.model.TvAppSettings
import com.smartifly.tv.domain.model.TvDownloadItem
import com.smartifly.tv.domain.model.TvDownloadStatus
import com.smartifly.tv.feature.home.AccountSummary
import com.smartifly.tv.feature.home.DownloadSummary
import com.smartifly.tv.ui.design.SmartiflyTvTheme
import com.smartifly.tv.ui.design.TvTokens

@Composable
fun PreviewFrame(
    modifier: Modifier = Modifier,
    padded: Boolean = true,
    content: @Composable () -> Unit,
) {
    val frameModifier = if (padded) {
        modifier
            .fillMaxSize()
            .background(TvTokens.Colors.BackgroundStart)
            .padding(24.dp)
    } else {
        modifier
            .fillMaxSize()
            .background(TvTokens.Colors.BackgroundStart)
    }

    SmartiflyTvTheme {
        Box(modifier = frameModifier) {
            content()
        }
    }
}

fun previewCatalogItem(
    id: String,
    sourceId: Int,
    title: String,
    type: String,
    categoryId: String = type,
    categoryName: String = categoryId.replaceFirstChar { it.uppercase() },
    rating: Double? = null,
): CatalogItem = CatalogItem(
    id = id,
    sourceId = sourceId,
    title = title,
    imageUrl = "",
    categoryId = categoryId,
    categoryName = categoryName,
    type = type,
    rating = rating,
)

val previewCatalogItems = listOf(
    previewCatalogItem(id = "live_101", sourceId = 101, title = "Championship Live", type = "live", categoryId = "sports", categoryName = "Sports", rating = 9.1),
    previewCatalogItem(id = "movie_202", sourceId = 202, title = "Skyline Pursuit", type = "movie", categoryId = "action", categoryName = "Action", rating = 8.4),
    previewCatalogItem(id = "series_303", sourceId = 303, title = "Signal Point", type = "series", categoryId = "drama", categoryName = "Drama", rating = 8.7),
    previewCatalogItem(id = "movie_404", sourceId = 404, title = "After Orbit", type = "movie", categoryId = "scifi", categoryName = "Sci-Fi", rating = 7.9),
    previewCatalogItem(id = "series_505", sourceId = 505, title = "Harbor Files", type = "series", categoryId = "crime", categoryName = "Crime", rating = 8.1),
    previewCatalogItem(id = "live_606", sourceId = 606, title = "World News", type = "live", categoryId = "news", categoryName = "News", rating = 7.4),
)

val previewHomeRails = listOf(
    HomeRail(
        id = "featured_live",
        title = "Featured Live",
        items = previewCatalogItems.filter { it.type == "live" }
    ),
    HomeRail(
        id = "editor_picks",
        title = "Editor Picks",
        items = previewCatalogItems.filter { it.type != "live" }
    )
)

val previewMovieDetail = MovieDetail(
    streamId = 202,
    title = "Skyline Pursuit",
    plot = "An elite crew races across collapsing cities to prevent a broadcast blackout that could destabilize the region.",
    rating = 8.4,
    genre = "Action, Thriller",
    director = "Jordan Hale",
    cast = "Mira West, Colin Drake, Tessa Vale",
    duration = "2h 03m",
    releaseYear = "2025",
    posterUrl = "",
    backdropUrl = "",
    trailerUrl = null,
)

val previewSeriesEpisodes = listOf(
    SeriesEpisode(
        id = 1,
        title = "Cold Open",
        episodeNumber = 1,
        seasonNumber = 1,
        duration = "47m",
        imageUrl = "",
        containerExtension = "mp4"
    ),
    SeriesEpisode(
        id = 2,
        title = "Signal Lost",
        episodeNumber = 2,
        seasonNumber = 1,
        duration = "45m",
        imageUrl = "",
        containerExtension = "mp4"
    ),
    SeriesEpisode(
        id = 3,
        title = "Night Relay",
        episodeNumber = 3,
        seasonNumber = 1,
        duration = "49m",
        imageUrl = "",
        containerExtension = "mp4"
    )
)

val previewSeriesDetail = SeriesDetail(
    seriesId = 303,
    title = "Signal Point",
    plot = "A coastal team intercepts coded transmissions that connect a missing vessel, a media empire, and a wider conspiracy.",
    rating = 8.7,
    genre = "Drama, Mystery",
    director = "Avery Knox",
    cast = "Leah Hart, Omar Reid, Nina Cole",
    posterUrl = "",
    backdropUrl = "",
    trailerUrl = null,
    episodes = previewSeriesEpisodes,
)

val previewPortals = listOf(
    Portal(id = "us-east", name = "US East", url = "https://east.smartifly.example", isPrimary = true),
    Portal(id = "eu-central", name = "EU Central", url = "https://eu.smartifly.example"),
    Portal(id = "apac", name = "APAC", url = "https://apac.smartifly.example"),
)

val previewAppSettings = TvAppSettings(
    defaultQuality = "1080p",
    defaultPlaybackSpeed = 1.25f,
    defaultMuted = false,
    preferredAudioLanguage = "en",
    preferredSubtitleLanguage = "Off",
    aspectMode = "Fit",
    showPlayerStats = true,
)

val previewDownloads = listOf(
    TvDownloadItem(
        id = "download_1",
        title = "Skyline Pursuit",
        type = "movie",
        sourceId = 202,
        streamUrl = "https://cdn.smartifly.example/skyline-pursuit.m3u8",
        status = TvDownloadStatus.COMPLETED,
        progress = 100,
        downloadedBytes = 2_900_000_000,
        sizeBytes = 2_900_000_000,
        localPath = "file:///storage/emulated/0/Movies/skyline-pursuit.mp4",
    ),
    TvDownloadItem(
        id = "download_2",
        title = "Signal Point S1E2",
        type = "series",
        sourceId = 2,
        streamUrl = "https://cdn.smartifly.example/signal-point-s1e2.m3u8",
        status = TvDownloadStatus.DOWNLOADING,
        progress = 61,
        downloadedBytes = 890_000_000,
        totalBytes = 1_400_000_000,
    ),
    TvDownloadItem(
        id = "download_3",
        title = "World News",
        type = "live",
        sourceId = 606,
        streamUrl = "https://cdn.smartifly.example/world-news.m3u8",
        status = TvDownloadStatus.FAILED,
        progress = 12,
        errorMessage = "Connection interrupted",
    ),
)

val previewAccountSummary = AccountSummary(
    serverLabel = "east.smartifly.example",
    username = "demo_user",
    expDate = "2026-12-31",
    maxConnections = 4,
    activeConnections = 1,
)

val previewDownloadSummary = DownloadSummary(
    totalItems = previewDownloads.size,
    activeItems = 1,
    completedItems = 1,
    failedItems = 1,
    usedBytes = 2_900_000_000,
)

val previewPlaybackSession = PlaybackSession(
    title = "Skyline Pursuit",
    streamUrl = "https://cdn.smartifly.example/skyline-pursuit.m3u8",
    type = "movie",
)
