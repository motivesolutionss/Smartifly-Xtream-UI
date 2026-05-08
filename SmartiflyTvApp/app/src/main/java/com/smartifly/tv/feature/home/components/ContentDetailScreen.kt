package com.smartifly.tv.feature.home.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.scale
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalInspectionMode
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.smartifly.tv.domain.model.MovieDetail
import com.smartifly.tv.domain.model.SeriesDetail
import com.smartifly.tv.domain.model.SeriesEpisode
import com.smartifly.tv.ui.components.TvFocusButton
import com.smartifly.tv.ui.design.TvTokens
import com.smartifly.tv.ui.preview.PreviewFrame
import com.smartifly.tv.ui.preview.previewMovieDetail
import com.smartifly.tv.ui.preview.previewSeriesDetail
import com.smartifly.tv.ui.styling.TvStyles

@Composable
fun MovieDetailScreen(
    detail: MovieDetail,
    onBack: () -> Unit,
    onPlay: () -> Unit,
    onDownload: () -> Unit,
) {
    val isInPreview = LocalInspectionMode.current

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(TvStyles.appBackground)
    ) {
        // 1. Full Screen Backdrop
        if (detail.backdropUrl.isNotBlank() || detail.posterUrl.isNotBlank()) {
            AsyncImage(
                model = detail.backdropUrl.ifBlank { detail.posterUrl },
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize()
            )
        }

        // 2. Cinematic Gradient Overlays
        // Left-to-Right Gradient
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.horizontalGradient(
                        colors = listOf(
                            Color.Black.copy(alpha = 0.95f),
                            Color.Black.copy(alpha = 0.8f),
                            Color.Black.copy(alpha = 0.4f),
                            Color.Transparent
                        ),
                        startX = 0f,
                        endX = 1400f // Adjust for typical TV width
                    )
                )
        )
        // Bottom-to-Top Gradient
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color.Transparent,
                            Color.Black.copy(alpha = 0.5f),
                            Color.Black
                        ),
                        startY = 400f
                    )
                )
        )

        // 3. Floating Content
        Row(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 60.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Left Column: Poster
            Box(
                modifier = Modifier
                    .width(300.dp)
                    .height(450.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .border(2.dp, TvTokens.Colors.BorderStrong.copy(alpha = 0.24f), RoundedCornerShape(16.dp))
            ) {
                AsyncImage(
                    model = detail.posterUrl,
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )
            }

            Spacer(modifier = Modifier.width(60.dp))

            // Right Column: Info
            Column(
                modifier = Modifier
                    .weight(1f)
                    .background(TvStyles.frostedPanelSoft, RoundedCornerShape(28.dp))
                    .border(1.dp, TvTokens.Colors.BorderStrong.copy(alpha = 0.24f), RoundedCornerShape(28.dp))
                    .padding(horizontal = 28.dp, vertical = 30.dp),
                verticalArrangement = Arrangement.Center
            ) {
                // Meta Row
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    if (detail.rating != null) {
                        Box(
                            modifier = Modifier
                                .background(TvTokens.Colors.AccentGold, RoundedCornerShape(4.dp))
                                .padding(horizontal = 10.dp, vertical = 4.dp)
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    text = "★ ${detail.rating}",
                                    style = TvTokens.TvType.Badge.copy(fontSize = 14.sp),
                                    color = Color.Black,
                                    fontWeight = FontWeight.Black
                                )
                            }
                        }
                    }
                    if (detail.releaseYear != null) {
                        Text(
                            text = "${detail.releaseYear}",
                            style = TvTokens.TvType.LabelMedium,
                            color = Color(0xFFE0E0E0),
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                    if (detail.duration != null) {
                        Box(
                            modifier = Modifier
                                .width(1.dp)
                                .height(14.dp)
                                .background(Color.White.copy(alpha = 0.4f))
                        )
                        Text(
                            text = detail.duration ?: "",
                            style = TvTokens.TvType.LabelMedium,
                            color = Color(0xFFE0E0E0),
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                    if (detail.genre != null) {
                        Box(
                            modifier = Modifier
                                .width(1.dp)
                                .height(14.dp)
                                .background(Color.White.copy(alpha = 0.4f))
                        )
                        Text(
                            text = detail.genre ?: "",
                            style = TvTokens.TvType.LabelMedium,
                            color = Color(0xFFE0E0E0),
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                    detail.contentRating?.takeIf { it.isNotBlank() }?.let { contentRating ->
                        Box(
                            modifier = Modifier
                                .border(1.dp, Color.White.copy(alpha = 0.34f), RoundedCornerShape(4.dp))
                                .padding(horizontal = 8.dp, vertical = 2.dp)
                        ) {
                            Text(
                                text = contentRating,
                                style = TvTokens.TvType.Badge.copy(fontSize = 11.sp),
                                color = Color(0xFFD7DEE7),
                                fontWeight = FontWeight.Black
                            )
                        }
                    }
                    Box(
                        modifier = Modifier
                            .border(1.5.dp, Color.White.copy(alpha = 0.6f), RoundedCornerShape(4.dp))
                            .padding(horizontal = 8.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = "HD",
                            style = TvTokens.TvType.Badge.copy(fontSize = 12.sp),
                            color = Color(0xFFDDDDDD),
                            fontWeight = FontWeight.Black
                        )
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                // Title
                Text(
                    text = detail.title,
                    style = TvTokens.TvType.DisplayMedium.copy(fontSize = 64.sp, lineHeight = 72.sp),
                    color = Color.White,
                    fontWeight = FontWeight.Black,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )

                Spacer(modifier = Modifier.height(20.dp))

                // Plot
                Text(
                    text = detail.plot,
                    style = TvTokens.TvType.BodyMedium.copy(fontSize = 18.sp, lineHeight = 28.sp),
                    color = TvTokens.Colors.TextSecondary,
                    maxLines = 4,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.fillMaxWidth(0.9f)
                )

                Spacer(modifier = Modifier.height(24.dp))

                // Credits
                Row(
                    modifier = Modifier
                        .fillMaxWidth(0.9f)
                        .padding(top = 20.dp)
                        .drawBehind {
                            val strokeWidth = 1.dp.toPx()
                            drawLine(
                                color = Color.White.copy(alpha = 0.1f),
                                start = Offset(0f, 0f),
                                end = Offset(size.width, 0f),
                                strokeWidth = strokeWidth
                            )
                        }
                        .padding(top = 20.dp)
                ) {
                    if (detail.director != null) {
                        Text(
                            text = buildAnnotatedString {
                                withStyle(SpanStyle(color = Color.White.copy(alpha = 0.6f), fontWeight = FontWeight.SemiBold)) {
                                    append("Directed by ")
                                }
                                withStyle(SpanStyle(color = Color.White)) {
                                    append(detail.director ?: "")
                                }
                            },
                            style = TvTokens.TvType.LabelSmall.copy(fontSize = 14.sp)
                        )
                    }
                    if (detail.cast != null) {
                        Spacer(modifier = Modifier.width(30.dp))
                        Text(
                            text = buildAnnotatedString {
                                withStyle(SpanStyle(color = Color.White.copy(alpha = 0.6f), fontWeight = FontWeight.SemiBold)) {
                                    append("Starring ")
                                }
                                withStyle(SpanStyle(color = Color.White)) {
                                    append(detail.cast ?: "")
                                }
                            },
                            style = TvTokens.TvType.LabelSmall.copy(fontSize = 14.sp),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                Spacer(modifier = Modifier.height(32.dp))

                // Action Buttons
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    TvFocusButton(
                        text = "Watch Now",
                        requestInitialFocus = !isInPreview,
                        onClick = onPlay,
                        primary = true
                    )
                    TvFocusButton(
                        text = "Download",
                        onClick = onDownload
                    )
                    TvFocusButton(
                        text = "Go Back",
                        onClick = onBack
                    )
                }
            }
        }
    }
}

// No-op - removed mid-file imports
@Composable
fun SeriesDetailScreen(
    detail: SeriesDetail,
    onBack: () -> Unit,
    onPlayEpisode: (SeriesEpisode) -> Unit,
    onDownloadEpisode: (SeriesEpisode) -> Unit,
) {
    val isInPreview = LocalInspectionMode.current
    val seasons = remember(detail) { 
        detail.episodes.map { it.seasonNumber }.distinct().sorted() 
    }
    var selectedSeason by remember { 
        mutableStateOf(seasons.firstOrNull() ?: 1) 
    }
    val filteredEpisodes = remember(detail, selectedSeason) {
        detail.episodes.filter { it.seasonNumber == selectedSeason }
            .sortedBy { it.episodeNumber }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
    ) {
        // 1. Full Screen Backdrop
        if (detail.backdropUrl.isNotBlank() || detail.posterUrl.isNotBlank()) {
            AsyncImage(
                model = detail.backdropUrl.ifBlank { detail.posterUrl },
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize()
            )
        }

        // 2. Cinematic Gradient Overlays
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.horizontalGradient(
                        colors = listOf(
                            Color.Black.copy(alpha = 0.95f),
                            Color.Black.copy(alpha = 0.8f),
                            Color.Black.copy(alpha = 0.4f),
                            Color.Transparent
                        ),
                        startX = 0f,
                        endX = 1400f
                    )
                )
        )
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color.Transparent,
                            Color.Black.copy(alpha = 0.5f),
                            Color.Black
                        ),
                        startY = 400f
                    )
                )
        )

        // 3. Floating Content Layout (2-Column)
        Row(
            modifier = Modifier
                .fillMaxSize()
                .padding(40.dp)
        ) {
            // Left Column: Series Info (Fixed width)
            Column(
                modifier = Modifier
                    .width(380.dp)
                    .background(TvStyles.frostedPanelSoft, RoundedCornerShape(24.dp))
                    .border(1.dp, TvTokens.Colors.BorderStrong.copy(alpha = 0.22f), RoundedCornerShape(24.dp))
                    .padding(24.dp)
                    .padding(end = 40.dp)
            ) {
                // Poster
                Box(
                    modifier = Modifier
                        .width(220.dp)
                        .height(330.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .border(2.dp, TvTokens.Colors.BorderStrong.copy(alpha = 0.24f), RoundedCornerShape(12.dp))
                ) {
                    AsyncImage(
                        model = detail.posterUrl,
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize()
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Title
                Text(
                    text = detail.title,
                    style = TvTokens.TvType.DisplaySmall.copy(fontSize = 42.sp, lineHeight = 48.sp),
                    color = Color.White,
                    fontWeight = FontWeight.Black,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Meta Info
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    if (detail.rating != null) {
                        Box(
                            modifier = Modifier
                                .background(TvTokens.Colors.AccentGold, RoundedCornerShape(4.dp))
                                .padding(horizontal = 10.dp, vertical = 4.dp)
                        ) {
                            Text(
                                text = "★ ${detail.rating}",
                                style = TvTokens.TvType.Badge.copy(fontSize = 14.sp),
                                color = Color.Black,
                                fontWeight = FontWeight.Black
                            )
                        }
                    }
                    Text(
                        text = "${seasons.size} Seasons",
                        style = TvTokens.TvType.LabelMedium,
                        color = Color(0xFFE0E0E0),
                        fontWeight = FontWeight.SemiBold
                    )
                    if (detail.genre != null) {
                        Box(
                            modifier = Modifier
                                .width(1.dp)
                                .height(14.dp)
                                .background(Color.White.copy(alpha = 0.4f))
                        )
                        Text(
                            text = detail.genre ?: "",
                            style = TvTokens.TvType.LabelMedium,
                            color = Color(0xFFE0E0E0),
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                    detail.contentRating?.takeIf { it.isNotBlank() }?.let { contentRating ->
                        Box(
                            modifier = Modifier
                                .border(1.dp, Color.White.copy(alpha = 0.34f), RoundedCornerShape(4.dp))
                                .padding(horizontal = 8.dp, vertical = 2.dp)
                        ) {
                            Text(
                                text = contentRating,
                                style = TvTokens.TvType.Badge.copy(fontSize = 11.sp),
                                color = Color(0xFFD7DEE7),
                                fontWeight = FontWeight.Black
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Action Buttons
                Row(
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    TvFocusButton(
                        text = "Watch Now",
                        requestInitialFocus = !isInPreview,
                        onClick = { 
                            filteredEpisodes.firstOrNull()?.let { onPlayEpisode(it) }
                        },
                        primary = true
                    )
                    TvFocusButton(
                        text = "Go Back",
                        onClick = onBack
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Synopsis
                Text(
                    text = detail.plot,
                    style = TvTokens.TvType.BodySmall.copy(fontSize = 15.sp, lineHeight = 22.sp),
                    color = TvTokens.Colors.TextSecondary,
                    maxLines = 5,
                    overflow = TextOverflow.Ellipsis
                )

                Spacer(modifier = Modifier.height(20.dp))

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .drawBehind {
                            val strokeWidth = 1.dp.toPx()
                            drawLine(
                                color = Color.White.copy(alpha = 0.08f),
                                start = Offset(0f, 0f),
                                end = Offset(size.width * 0.88f, 0f),
                                strokeWidth = strokeWidth
                            )
                        }
                        .padding(top = 18.dp),
                    horizontalArrangement = Arrangement.spacedBy(24.dp)
                ) {
                    detail.director?.takeIf { it.isNotBlank() }?.let { director ->
                        Text(
                            text = buildAnnotatedString {
                                withStyle(SpanStyle(color = Color.White.copy(alpha = 0.58f), fontWeight = FontWeight.SemiBold)) {
                                    append("Director: ")
                                }
                                withStyle(SpanStyle(color = Color.White)) { append(director) }
                            },
                            style = TvTokens.TvType.LabelSmall.copy(fontSize = 14.sp)
                        )
                    }
                    detail.cast?.takeIf { it.isNotBlank() }?.let { cast ->
                        Text(
                            text = buildAnnotatedString {
                                withStyle(SpanStyle(color = Color.White.copy(alpha = 0.58f), fontWeight = FontWeight.SemiBold)) {
                                    append("Cast: ")
                                }
                                withStyle(SpanStyle(color = Color.White)) { append(cast) }
                            },
                            style = TvTokens.TvType.LabelSmall.copy(fontSize = 14.sp),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
            }

            // Right Column: Seasons & Episodes (Scrollable)
            Column(
                modifier = Modifier
                    .weight(1f)
                    .background(TvStyles.frostedPanelSoft, RoundedCornerShape(20.dp))
                    .border(1.dp, TvTokens.Colors.BorderStrong.copy(alpha = 0.22f), RoundedCornerShape(20.dp))
                    .padding(18.dp)
            ) {
                // Seasons Horizontal List
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.padding(bottom = 24.dp)
                ) {
                    items(seasons) { season ->
                        val isSelected = selectedSeason == season
                        TvFocusButton(
                            text = "Season $season",
                            onClick = { selectedSeason = season },
                            primary = isSelected,
                            compact = true
                        )
                    }
                }

                // Episodes Vertical List
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(TvStyles.frostedPanelSoft, RoundedCornerShape(12.dp))
                        .border(1.dp, TvTokens.Colors.BorderStrong.copy(alpha = 0.22f), RoundedCornerShape(12.dp))
                        .padding(12.dp)
                ) {
                    items(filteredEpisodes, key = { it.id }) { episode ->
                        EpisodeCard(
                            episode = episode,
                            onClick = { onPlayEpisode(episode) },
                            onDownload = { onDownloadEpisode(episode) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun EpisodeCard(
    episode: SeriesEpisode,
    onClick: () -> Unit,
    onDownload: () -> Unit,
) {
    var focused by remember(episode.id) { mutableStateOf(false) }
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(90.dp)
            .scale(if (focused) 1.01f else 1f)
            .background(
                if (focused) TvStyles.frostedPanel else TvStyles.frostedPanelSoft,
                RoundedCornerShape(10.dp)
            )
            .border(
                if (focused) 1.5.dp else 1.dp,
                if (focused) TvTokens.Colors.AccentCyan else Color.Transparent,
                RoundedCornerShape(10.dp)
            )
            .clip(RoundedCornerShape(10.dp))
            .onFocusChanged { focused = it.isFocused }
            .focusable()
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onClick
            ),
        verticalAlignment = Alignment.CenterVertically
    ) {
        AsyncImage(
            model = episode.imageUrl,
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier
                .width(160.dp)
                .fillMaxSize()
        )

        Spacer(modifier = Modifier.width(20.dp))

        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = "EPISODE ${episode.episodeNumber}",
                style = TvTokens.TvType.LabelSmall.copy(fontSize = 12.sp),
                color = if (focused) TvTokens.Colors.AccentCyan else TvTokens.Colors.AccentCyan.copy(alpha = 0.9f),
                fontWeight = FontWeight.Black
            )
            Text(
                text = episode.title,
                style = TvTokens.TvType.BodyMedium.copy(fontSize = 18.sp),
                color = if (focused) TvTokens.Colors.AccentCyan else Color.White,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            if (episode.duration != null) {
                Text(
                    text = episode.duration ?: "",
                    style = TvTokens.TvType.CaptionSmall.copy(fontSize = 13.sp),
                    color = Color(0xFF888888),
                    fontWeight = FontWeight.SemiBold
                )
            }
        }

        TvFocusButton(
            text = "Play",
            onClick = onClick,
            compact = true
        )

        Spacer(modifier = Modifier.width(10.dp))

        TvFocusButton(
            text = "Download",
            onClick = onDownload,
            compact = true
        )

        Spacer(modifier = Modifier.width(10.dp))
    }
}

@Composable
private fun MetaBadge(
    text: String,
    color: androidx.compose.ui.graphics.Color = TvTokens.Colors.TextSecondary
) {
    Text(
        text = text,
        style = TvTokens.TvType.Badge,
        color = color,
        modifier = Modifier
            .background(
                color = TvTokens.Colors.SurfaceMuted,
                shape = RoundedCornerShape(TvStyles.Radius.xs)
            )
            .border(
                1.dp,
                TvTokens.Colors.Border,
                RoundedCornerShape(TvStyles.Radius.xs)
            )
            .padding(horizontal = 10.dp, vertical = 4.dp)
    )
}

@Preview(showBackground = true, widthDp = 960, heightDp = 540)
@Composable
private fun MovieDetailScreenPreview() {
    PreviewFrame {
        MovieDetailScreen(
            detail = previewMovieDetail,
            onBack = {},
            onPlay = {},
            onDownload = {}
        )
    }
}

@Preview(showBackground = true, widthDp = 960, heightDp = 540)
@Composable
private fun SeriesDetailScreenPreview() {
    PreviewFrame {
        SeriesDetailScreen(
            detail = previewSeriesDetail,
            onBack = {},
            onPlayEpisode = {},
            onDownloadEpisode = {}
        )
    }
}
