package com.smartifly.tv.ui.components.content

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import coil.compose.AsyncImage
import com.smartifly.tv.data.models.MovieMetadata
import com.smartifly.tv.ui.components.base.BaseFocusableCard
import com.smartifly.tv.ui.theme.Dimensions

import androidx.compose.ui.draw.clip
import com.smartifly.tv.ui.theme.SurfaceDark

@Composable
fun PosterCard(
    movie: MovieMetadata,
    onClick: () -> Unit,
    onFocus: () -> Unit,
    modifier: Modifier = Modifier
) {
    BaseFocusableCard(
        onClick = onClick,
        onFocus = onFocus,
        modifier = modifier
            .size(Dimensions.PosterWidth, Dimensions.PosterHeight)
            .clip(androidx.compose.foundation.shape.RoundedCornerShape(Dimensions.FocusCornerRadius))
    ) {
        // Base layer / Placeholder
        Box(modifier = Modifier.fillMaxSize().background(SurfaceDark))
        
        AsyncImage(
            model = movie.posterUrl,
            contentDescription = movie.title,
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop
        )
    }
}

