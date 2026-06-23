package com.smartifly.tv.ui.components.base

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.tv.foundation.lazy.grid.TvGridCells
import androidx.tv.foundation.lazy.grid.TvLazyVerticalGrid
import androidx.tv.foundation.lazy.grid.items
import androidx.tv.foundation.lazy.grid.itemsIndexed
import androidx.tv.material3.ExperimentalTvMaterial3Api
import com.smartifly.tv.data.models.MovieMetadata
import com.smartifly.tv.ui.components.content.PosterCard
import com.smartifly.tv.ui.theme.Dimensions
import kotlinx.coroutines.delay

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun PosterGrid(
    items: List<MovieMetadata>,
    profileId: String? = null,
    onItemFocused: (MovieMetadata, Int) -> Unit,
    onItemClick: (MovieMetadata) -> Unit,
    modifier: Modifier = Modifier,
    columns: Int = 5
) {
    val initialChunkSize = 50
    val chunkSize = 50
    val prefetchThreshold = 12
    val maxVisible = items.size

    var visibleCount by remember(items) {
        mutableIntStateOf(minOf(initialChunkSize, maxVisible))
    }
    var isLoadingMore by remember(items) { mutableStateOf(false) }
    var loadGeneration by remember(items) { mutableIntStateOf(0) }

    val displayedItems = remember(items, visibleCount) {
        items.take(visibleCount)
    }
    val hasMore = visibleCount < items.size

    LaunchedEffect(loadGeneration) {
        if (loadGeneration == 0) return@LaunchedEffect
        // Briefly show skeleton placeholders while next window is prepared.
        delay(120L)
        visibleCount = minOf(visibleCount + chunkSize, items.size)
        isLoadingMore = false
    }

    TvLazyVerticalGrid(
        columns = TvGridCells.Fixed(columns),
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(Dimensions.PaddingMedium),
        verticalArrangement = Arrangement.spacedBy(Dimensions.ItemSpacing),
        horizontalArrangement = Arrangement.spacedBy(Dimensions.ItemSpacing)
    ) {
        itemsIndexed(displayedItems) { index, item ->
            PosterCard(
                movie = item,
                profileId = profileId,
                onClick = { onItemClick(item) },
                onFocus = {
                    onItemFocused(item, index)
                    val nearWindowEnd = index >= displayedItems.lastIndex - prefetchThreshold
                    if (nearWindowEnd && hasMore && !isLoadingMore) {
                        isLoadingMore = true
                        loadGeneration += 1
                    }
                }
            )
        }

        if (hasMore || isLoadingMore) {
            items(columns) {
                ShimmerPosterCard()
            }
        }
    }
}
