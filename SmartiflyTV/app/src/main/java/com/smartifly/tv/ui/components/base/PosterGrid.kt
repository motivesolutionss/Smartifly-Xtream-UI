package com.smartifly.tv.ui.components.base

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.tv.foundation.lazy.grid.TvGridCells
import androidx.tv.foundation.lazy.grid.TvLazyVerticalGrid
import androidx.tv.foundation.lazy.grid.items
import androidx.tv.material3.ExperimentalTvMaterial3Api
import com.smartifly.tv.data.models.MovieMetadata
import com.smartifly.tv.ui.components.content.PosterCard
import com.smartifly.tv.ui.theme.Dimensions

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun PosterGrid(
    items: List<MovieMetadata>,
    onItemFocused: (MovieMetadata) -> Unit,
    onItemClick: (MovieMetadata) -> Unit,
    modifier: Modifier = Modifier,
    columns: Int = 5
) {
    TvLazyVerticalGrid(
        columns = TvGridCells.Fixed(columns),
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(Dimensions.PaddingMedium),
        verticalArrangement = Arrangement.spacedBy(Dimensions.ItemSpacing),
        horizontalArrangement = Arrangement.spacedBy(Dimensions.ItemSpacing)
    ) {
        items(items) { item ->
            PosterCard(
                movie = item,
                onClick = { onItemClick(item) },
                onFocus = { onItemFocused(item) }
            )
        }
    }
}
