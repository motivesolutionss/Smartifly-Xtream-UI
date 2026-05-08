package com.smartifly.tv.features.live

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.tv.foundation.lazy.grid.TvGridCells
import androidx.tv.foundation.lazy.grid.TvLazyVerticalGrid
import androidx.tv.foundation.lazy.grid.items
import androidx.tv.material3.ExperimentalTvMaterial3Api
import com.smartifly.tv.data.remote.dto.LiveChannelDto
import com.smartifly.tv.ui.components.content.LiveChannelCard
import com.smartifly.tv.ui.theme.Dimensions

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun LiveChannelGrid(
    channels: List<LiveChannelDto>,
    onChannelFocused: (LiveChannelDto) -> Unit,
    onChannelClick: (LiveChannelDto) -> Unit,
    modifier: Modifier = Modifier
) {
    TvLazyVerticalGrid(
        columns = TvGridCells.Fixed(5),
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(Dimensions.PaddingExtraLarge),
        verticalArrangement = Arrangement.spacedBy(Dimensions.ItemSpacing),
        horizontalArrangement = Arrangement.spacedBy(Dimensions.ItemSpacing)
    ) {
        items(channels) { channel ->
            LiveChannelCard(
                channelName = channel.name,
                logoUrl = channel.logo,
                onClick = { onChannelClick(channel) },
                onFocus = { onChannelFocused(channel) }
            )
        }
    }
}
