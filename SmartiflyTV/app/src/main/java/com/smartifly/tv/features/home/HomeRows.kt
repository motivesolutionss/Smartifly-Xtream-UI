package com.smartifly.tv.features.home

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusProperties
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.foundation.PivotOffsets
import androidx.tv.foundation.lazy.list.TvLazyRow
import androidx.tv.foundation.lazy.list.itemsIndexed
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.Text
import com.smartifly.tv.data.models.MovieMetadata
import com.smartifly.tv.ui.components.content.ContinueWatchingCard
import com.smartifly.tv.ui.components.content.LiveChannelCard
import com.smartifly.tv.ui.components.content.PosterCard
import com.smartifly.tv.ui.theme.Dimensions
import com.smartifly.tv.ui.theme.TextPrimary

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun ContentRow(
    section: HomeSection,
    profileId: String,
    onMovieClick: (MovieMetadata) -> Unit,
    firstItemFocusRequester: FocusRequester? = null,
    upFocusRequester: FocusRequester? = null,
    navBarFocusRequester: FocusRequester? = null,
    isActive: Boolean = true,
    isFocusedRow: Boolean = false,
    onMovieFocused: (MovieMetadata, Int, FocusRequester) -> Unit
) {
    val movies = section.items
    if (movies.isEmpty()) return

    val isLiveRail = section.title.contains("Live", ignoreCase = true) || movies.any { it.type.equals("live", ignoreCase = true) }
    val isContinueWatchingRail = section.title == "Continue Watching" && section.progressList != null
    val rowFocusRequester = firstItemFocusRequester ?: remember(section.title) { FocusRequester() }

    val rowAlpha by animateFloatAsState(
        targetValue = if (isActive) 1f else 0.58f,
        animationSpec = tween(220),
        label = "home_row_alpha_${section.title}"
    )

    Column(modifier = Modifier.graphicsLayer { alpha = rowAlpha }) {
        // Aesthetic section header with dynamic active indicator pill
        HomeSectionHeader(
            title = section.title,
            count = movies.size,
            isLiveRail = isLiveRail,
            isFocusedRow = isFocusedRow
        )
        
        BoxWithConstraints(modifier = Modifier.fillMaxWidth()) {
            val slotCount = if (isLiveRail || isContinueWatchingRail) 4 else 5
            val cardSpacing = Dimensions.CardSpacing
            val viewportWidth = maxWidth - (Dimensions.ContentGutter + Dimensions.PaddingExtraLarge)
            val cardWidth = (viewportWidth - cardSpacing * (slotCount - 1)) / slotCount
            val cardHeight = when {
                isContinueWatchingRail -> cardWidth / 1.75f
                isLiveRail -> cardWidth / (Dimensions.LiveChannelWidth / Dimensions.LiveChannelHeight)
                else -> cardWidth / (Dimensions.PosterWidth / Dimensions.PosterHeight)
            }

            TvLazyRow(
                modifier = Modifier.fillMaxWidth(),
                pivotOffsets = PivotOffsets(parentFraction = 0.08f),
                contentPadding = PaddingValues(
                    start = Dimensions.ContentGutter,
                    end = Dimensions.PaddingExtraLarge
                ),
                horizontalArrangement = Arrangement.spacedBy(cardSpacing)
            ) {
                itemsIndexed(
                    items = movies,
                    key = { index, movie -> "home_row_${section.title}_${movie.id}_$index" }
                ) { index, movie ->
                    val itemModifier = Modifier
                        .then(
                            if (index == 0) {
                                Modifier.focusRequester(rowFocusRequester)
                            } else {
                                Modifier
                            }
                        )
                        .focusProperties {
                            // Avoid explicit up target to detached nodes in lazy containers.
                        }
                        .testTag(homeRowItemTag(section.title, index))

                    when {
                        isContinueWatchingRail -> ContinueWatchingCard(
                            imageUrl = movie.backdropUrl.ifBlank { movie.posterUrl },
                            fallbackImageUrl = movie.posterUrl,
                            progress = section.progressList?.getOrNull(index) ?: 0f,
                            title = movie.title,
                            profileId = profileId,
                            contentId = movie.id,
                            contentType = movie.type,
                            onClick = { onMovieClick(movie) },
                            onFocus = { onMovieFocused(movie, index, rowFocusRequester) },
                            cardWidth = cardWidth,
                            cardHeight = cardHeight,
                            modifier = itemModifier
                        )

                        isLiveRail -> LiveChannelCard(
                            channelName = movie.title,
                            profileId = profileId,
                            onClick = { onMovieClick(movie) },
                            onFocus = { onMovieFocused(movie, index, rowFocusRequester) },
                            logoUrl = movie.backdropUrl.ifBlank { movie.posterUrl },
                            contentId = movie.id,
                            contentType = "live",
                            isFavorite = false,
                            cardWidth = cardWidth,
                            cardHeight = cardHeight,
                            modifier = itemModifier
                        )

                        else -> PosterCard(
                            movie = movie,
                            profileId = profileId,
                            onClick = { onMovieClick(movie) },
                            onFocus = { onMovieFocused(movie, index, rowFocusRequester) },
                            cardWidth = cardWidth,
                            cardHeight = cardHeight,
                            modifier = itemModifier
                        )
                    }
                }
            }
        }
    }
}

internal fun homeRowItemTag(sectionTitle: String, index: Int): String {
    val normalizedTitle = sectionTitle.lowercase().replace(Regex("[^a-z0-9]+"), "_").trim('_')
    return "home_row_${normalizedTitle}_item_$index"
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun HomeSectionHeader(
    title: String,
    count: Int,
    isLiveRail: Boolean,
    isFocusedRow: Boolean
) {
    // Dynamic vertical accent pill sizes reacting to focus with spring physics using smooth layout-independent scales
    val pillScaleX by animateFloatAsState(
        targetValue = if (isFocusedRow) 1.5f else 1.0f,
        animationSpec = spring(dampingRatio = Spring.DampingRatioNoBouncy, stiffness = Spring.StiffnessMedium),
        label = "pillScaleX"
    )
    val pillScaleY by animateFloatAsState(
        targetValue = if (isFocusedRow) 1.3f else 1.0f,
        animationSpec = spring(dampingRatio = Spring.DampingRatioNoBouncy, stiffness = Spring.StiffnessMedium),
        label = "pillScaleY"
    )
    val textScale by animateFloatAsState(
        targetValue = if (isFocusedRow) 1.02f else 1.0f,
        animationSpec = tween(180),
        label = "textScale"
    )

    Row(
        modifier = Modifier
            .padding(start = Dimensions.ContentGutter, bottom = Dimensions.PaddingSmall, top = Dimensions.PaddingSmall)
            .fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(Dimensions.HomeRailHeaderGap),
        verticalAlignment = Alignment.CenterVertically
    ) {
        val indicatorColor = if (isLiveRail) Color(0xFFE50914) else MaterialTheme.colorScheme.primary
        val pillColor = if (isFocusedRow) indicatorColor else indicatorColor.copy(alpha = 0.55f)

        Box(
            modifier = Modifier
                .width(4.dp)
                .height(18.dp)
                .graphicsLayer {
                    scaleX = pillScaleX
                    scaleY = pillScaleY
                    transformOrigin = androidx.compose.ui.graphics.TransformOrigin(0f, 0.5f) // Scale from left edge
                    if (isFocusedRow) {
                        shadowElevation = 6f
                    }
                }
                .background(
                    brush = Brush.verticalGradient(
                        colors = listOf(pillColor, pillColor.copy(alpha = 0.45f))
                    ),
                    shape = RoundedCornerShape(2.dp)
                )
        )

        Text(
            text = title,
            style = MaterialTheme.typography.titleLarge,
            color = if (isFocusedRow) Color.White else TextPrimary.copy(alpha = 0.85f),
            fontWeight = FontWeight.Bold,
            letterSpacing = 0.2.sp,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.graphicsLayer {
                scaleX = textScale
                scaleY = textScale
            }
        )

        if (isLiveRail) {
            val infiniteTransition = rememberInfiniteTransition(label = "livePulse")
            val pulseAlpha by infiniteTransition.animateFloat(
                initialValue = 0.32f,
                targetValue = 1f,
                animationSpec = infiniteRepeatable(
                    animation = tween(1000, easing = FastOutSlowInEasing),
                    repeatMode = RepeatMode.Reverse
                ),
                label = "livePulseAlpha"
            )
            Box(
                modifier = Modifier
                    .size(8.dp)
                    .graphicsLayer { alpha = pulseAlpha }
                    .background(Color(0xFFE50914), RoundedCornerShape(4.dp))
            )
        }

        Text(
            text = "$count",
            style = MaterialTheme.typography.labelMedium,
            color = if (isFocusedRow) Color.White else Color.White.copy(alpha = 0.68f),
            modifier = Modifier
                .border(
                    width = 0.8.dp,
                    color = if (isLiveRail) Color(0xFFE50914).copy(alpha = if (isFocusedRow) 0.6f else 0.3f) else Color.White.copy(alpha = if (isFocusedRow) 0.25f else 0.12f),
                    shape = RoundedCornerShape(12.dp)
                )
                .background(
                    color = if (isLiveRail) Color(0xFFE50914).copy(alpha = 0.12f) else Color.White.copy(alpha = 0.04f),
                    shape = RoundedCornerShape(12.dp)
                )
                .padding(
                    horizontal = Dimensions.HomeRailStatusHorizontalPadding,
                    vertical = Dimensions.HomeRailStatusVerticalPadding
                )
        )
    }
}
