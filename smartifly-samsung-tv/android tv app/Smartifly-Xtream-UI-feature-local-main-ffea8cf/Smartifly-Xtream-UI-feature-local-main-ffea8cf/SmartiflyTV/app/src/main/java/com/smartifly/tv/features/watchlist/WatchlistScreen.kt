package com.smartifly.tv.features.watchlist

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.tv.foundation.lazy.list.TvLazyColumn
import androidx.tv.foundation.lazy.list.TvLazyRow
import androidx.tv.foundation.lazy.list.items
import androidx.compose.material3.CircularProgressIndicator
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.Text
import com.smartifly.tv.data.WatchProgress
import com.smartifly.tv.data.models.LiveStream
import com.smartifly.tv.data.models.MovieMetadata
import com.smartifly.tv.ui.components.content.ContinueWatchingCard
import com.smartifly.tv.ui.components.content.LiveChannelCard
import com.smartifly.tv.ui.components.content.PosterCard
import com.smartifly.tv.ui.theme.Dimensions
import com.smartifly.tv.ui.theme.PrimaryRed
import com.smartifly.tv.ui.theme.SmartiflyTheme
import com.smartifly.tv.ui.theme.TextPrimary

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun WatchlistScreen(
    viewModel: WatchlistViewModel,
    onItemClick: (MovieMetadata) -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()

    SmartiflyTheme {
        Column(modifier = Modifier.fillMaxSize().padding(Dimensions.PaddingExtraLarge)) {
            Text(
                text = "MY LIST",
                style = MaterialTheme.typography.displaySmall,
                color = TextPrimary,
                modifier = Modifier.padding(bottom = Dimensions.PaddingLarge)
            )

            Box(modifier = Modifier.weight(1f)) {
                when (val state = uiState) {
                    is WatchlistUiState.Loading -> {
                        CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                    }
                    is WatchlistUiState.Success -> {
                        LibraryContent(
                            continueWatching = state.continueWatching,
                            watchlistItems = state.watchlistItems,
                            favoriteChannels = state.favoriteChannels,
                            onItemClick = onItemClick
                        )
                    }
                    is WatchlistUiState.Empty -> {
                        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Text(text = "Your library is empty. Start watching, save titles, or favorite channels to build it.", color = Color.Gray)
                        }
                    }
                    is WatchlistUiState.Error -> {
                        Text(text = "Error: ${state.message}", color = PrimaryRed)
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun LibraryContent(
    continueWatching: List<WatchProgress>,
    watchlistItems: List<MovieMetadata>,
    favoriteChannels: List<LiveStream>,
    onItemClick: (MovieMetadata) -> Unit
) {
    TvLazyColumn(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(20.dp)
    ) {
        if (continueWatching.isNotEmpty()) {
            item {
                LibrarySectionHeader(title = "Continue Watching", count = continueWatching.size)
            }
            item {
                TvLazyRow(horizontalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(Dimensions.CardSpacing)) {
                    items(continueWatching) { progress ->
                        ContinueWatchingCard(
                            imageUrl = progress.metadata.backdropUrl.ifBlank { progress.metadata.posterUrl },
                            fallbackImageUrl = progress.metadata.posterUrl,
                            progress = if (progress.durationMs <= 0L) 0f else progress.positionMs.toFloat() / progress.durationMs.toFloat(),
                            title = progress.metadata.title,
                            contentId = progress.contentId,
                            contentType = progress.metadata.type,
                            onClick = { onItemClick(progress.metadata) },
                            onFocus = { }
                        )
                    }
                }
            }
        }

        if (watchlistItems.isNotEmpty()) {
            item {
                LibrarySectionHeader(title = "Watchlist", count = watchlistItems.size)
            }
            item {
                TvLazyRow(horizontalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(Dimensions.CardSpacing)) {
                    items(watchlistItems) { item ->
                        PosterCard(
                            movie = item,
                            onClick = { onItemClick(item) },
                            onFocus = { }
                        )
                    }
                }
            }
        }

        if (favoriteChannels.isNotEmpty()) {
            item {
                LibrarySectionHeader(title = "Favorite Channels", count = favoriteChannels.size)
            }
            item {
                TvLazyRow(horizontalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(Dimensions.CardSpacing)) {
                    items(favoriteChannels) { channel ->
                        LiveChannelCard(
                            channelName = channel.name,
                            logoUrl = channel.logoUrl,
                            contentId = channel.id,
                            isFavorite = true,
                            onClick = {
                                onItemClick(
                                    MovieMetadata(
                                        id = channel.id,
                                        title = channel.name,
                                        description = "",
                                        year = "",
                                        rating = "",
                                        duration = "",
                                        posterUrl = channel.logoUrl,
                                        backdropUrl = channel.logoUrl,
                                        type = "live",
                                        categoryId = channel.categoryId,
                                        genre = "Live"
                                    )
                                )
                            },
                            onFocus = { }
                        )
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun LibrarySectionHeader(
    title: String,
    count: Int
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 4.dp, bottom = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .width(4.dp)
                .height(24.dp)
                .background(PrimaryRed, RoundedCornerShape(999.dp))
        )
        Spacer(modifier = Modifier.width(10.dp))
        Text(
            text = "$title ($count)",
            style = MaterialTheme.typography.titleMedium,
            color = TextPrimary,
            fontWeight = FontWeight.Bold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}
