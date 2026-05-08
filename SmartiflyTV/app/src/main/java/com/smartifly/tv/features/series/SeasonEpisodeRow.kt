package com.smartifly.tv.features.series

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.tv.foundation.lazy.list.TvLazyRow
import androidx.tv.foundation.lazy.list.items
import androidx.tv.material3.ClickableSurfaceDefaults
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.Surface
import androidx.tv.material3.Text
import com.smartifly.tv.ui.theme.Dimensions
import com.smartifly.tv.ui.theme.TextPrimary
import com.smartifly.tv.ui.theme.TextSecondary

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun SeasonEpisodeRow(
    seasonName: String,
    episodes: List<String>,
    onEpisodeClick: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier.padding(vertical = 8.dp)) {
        Text(
            text = seasonName,
            style = MaterialTheme.typography.labelLarge,
            color = TextSecondary,
            modifier = Modifier.padding(start = Dimensions.PaddingExtraLarge, bottom = 8.dp)
        )
        
        TvLazyRow(
            contentPadding = PaddingValues(horizontal = Dimensions.PaddingExtraLarge),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(episodes) { episode ->
                Surface(
                    onClick = { onEpisodeClick(episode) },
                    modifier = Modifier.width(180.dp).height(100.dp),
                    colors = ClickableSurfaceDefaults.colors(
                        containerColor = MaterialTheme.colorScheme.surface,
                        focusedContainerColor = MaterialTheme.colorScheme.primary,
                        focusedContentColor = MaterialTheme.colorScheme.onPrimary
                    )
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text(text = episode, color = TextPrimary, style = MaterialTheme.typography.labelMedium)
                        Text(text = "Episode details...", color = TextSecondary, style = MaterialTheme.typography.labelSmall)
                    }
                }
            }
        }
    }
}
