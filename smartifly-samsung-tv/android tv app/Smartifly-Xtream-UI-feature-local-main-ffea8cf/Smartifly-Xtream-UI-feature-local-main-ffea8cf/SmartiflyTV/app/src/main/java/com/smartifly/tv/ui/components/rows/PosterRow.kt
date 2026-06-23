package com.smartifly.tv.ui.components.rows

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.tv.foundation.lazy.list.TvLazyRow
import androidx.tv.foundation.lazy.list.items
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.Text
import com.smartifly.tv.data.models.MovieMetadata
import com.smartifly.tv.ui.components.content.PosterCard
import com.smartifly.tv.ui.theme.Dimensions
import com.smartifly.tv.ui.theme.TextSecondary

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun PosterRow(
    title: String,
    movies: List<MovieMetadata>,
    onMovieFocused: (MovieMetadata) -> Unit,
    onMovieClick: (MovieMetadata) -> Unit,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier.padding(vertical = Dimensions.PaddingSmall)) {
        Text(
            text = title,
            style = MaterialTheme.typography.headlineSmall,
            color = TextSecondary,
            modifier = Modifier.padding(start = Dimensions.PaddingExtraLarge, bottom = Dimensions.PaddingSmall)
        )
        
        TvLazyRow(
            contentPadding = PaddingValues(horizontal = Dimensions.PaddingExtraLarge),
            horizontalArrangement = Arrangement.spacedBy(Dimensions.ItemSpacing)
        ) {
            items(movies) { movie ->
                PosterCard(
                    movie = movie,
                    onClick = { onMovieClick(movie) },
                    onFocus = { onMovieFocused(movie) }
                )
            }
        }
    }
}
