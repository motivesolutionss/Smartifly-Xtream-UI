package com.smartifly.tv.features.live

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.Composable
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.Alignment
import androidx.tv.foundation.lazy.grid.TvGridCells
import androidx.tv.foundation.lazy.grid.TvLazyVerticalGrid
import androidx.tv.foundation.lazy.grid.items
import androidx.tv.foundation.lazy.grid.rememberTvLazyGridState
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Text
import com.smartifly.tv.data.models.LiveStream
import com.smartifly.tv.ui.components.content.LiveChannelCard
import com.smartifly.tv.ui.theme.Dimensions

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun LiveChannelGrid(
    channels: List<LiveStream>,
    profileId: String,
    favoriteChannelIds: Set<String>,
    hasMore: Boolean,
    isLoadingMore: Boolean,
    onLoadMore: () -> Unit,
    onChannelLongPress: (LiveStream) -> Unit,
    onChannelFocused: (LiveStream) -> Unit,
    onChannelClick: (LiveStream) -> Unit,
    modifier: Modifier = Modifier
) {
    val gridState = rememberTvLazyGridState()
    var lastLoadTriggerAtMs by remember { mutableLongStateOf(0L) }
    var lastTriggeredCount by remember { mutableIntStateOf(-1) }
    val shouldLoadMore by remember(channels, hasMore, isLoadingMore) {
        derivedStateOf {
            if (!hasMore || isLoadingMore || channels.isEmpty()) return@derivedStateOf false
            val visible = gridState.layoutInfo.visibleItemsInfo
            if (visible.isEmpty()) return@derivedStateOf false
            val lastVisible = visible.maxOf { it.index }
            lastVisible >= channels.lastIndex - 6
        }
    }

    LaunchedEffect(shouldLoadMore, channels.size) {
        if (!shouldLoadMore) return@LaunchedEffect

        val now = System.currentTimeMillis()
        val recentlyTriggered = now - lastLoadTriggerAtMs < 1500L
        val sameDataset = lastTriggeredCount == channels.size
        if (recentlyTriggered && sameDataset) return@LaunchedEffect

        lastLoadTriggerAtMs = now
        lastTriggeredCount = channels.size
        onLoadMore()
    }

    TvLazyVerticalGrid(
        state = gridState,
        columns = TvGridCells.Fixed(3),
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 8.dp, end = 24.dp, top = 8.dp, bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(Dimensions.ItemSpacing),
        horizontalArrangement = Arrangement.spacedBy(Dimensions.ItemSpacing)
    ) {
        items(channels) { channel ->
            LiveChannelCard(
                channelName = channel.name,
                profileId = profileId,
                logoUrl = channel.logoUrl,
                contentId = channel.id,
                contentType = channel.streamType,
                isFavorite = favoriteChannelIds.contains(channel.id),
                cardWidth = Dp.Unspecified,
                onClick = { onChannelClick(channel) },
                onFocus = { onChannelFocused(channel) },
                onLongPress = { onChannelLongPress(channel) }
            )
        }

        if (isLoadingMore || hasMore) {
            items(1, span = { androidx.tv.foundation.lazy.grid.TvGridItemSpan(3) }) {
                androidx.compose.foundation.layout.Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = Dimensions.PaddingLarge),
                    contentAlignment = Alignment.Center
                ) {
                    if (isLoadingMore) {
                        Text("Loading more channels...")
                    } else {
                        Text("Scroll down to load more")
                    }
                }
            }
        }
    }
}
