package com.smartifly.tv.ui.components.content

import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.Text
import coil.compose.AsyncImage
import com.smartifly.tv.ui.components.base.BaseFocusableCard
import com.smartifly.tv.ui.theme.Dimensions
import com.smartifly.tv.ui.theme.PrimaryRed
import com.smartifly.tv.ui.theme.TextPrimary
import com.smartifly.tv.ui.theme.TextSecondary
import com.smartifly.tv.ui.theme.SmartiflyIcons
import com.smartifly.tv.data.image.ImageFailureMemory
import com.smartifly.tv.data.image.ImageErrorClassifier
import com.smartifly.tv.data.image.ImagePolicyEngine
import com.smartifly.tv.data.image.ImageQualityMonitor
import com.smartifly.tv.performance.PerformanceKpiMonitor

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun ContinueWatchingCard(
    imageUrl: String,
    fallbackImageUrl: String? = null,
    progress: Float,
    title: String,
    profileId: String? = null,
    contentId: String? = null,
    contentType: String? = null,
    onClick: () -> Unit,
    onFocus: (() -> Unit)? = null,
    cardWidth: Dp = Dimensions.ContinueWatchingWidth,
    cardHeight: Dp = Dimensions.ContinueWatchingHeight,
    modifier: Modifier = Modifier
) {
    val resolvedImage = remember(imageUrl, fallbackImageUrl) {
        ImagePolicyEngine.resolveFirstUsable(imageUrl, fallbackImageUrl) ?: imageUrl
    }
    val imageLoadStartedAt = remember(resolvedImage) { System.currentTimeMillis() }

    var isFocused by remember { mutableStateOf(false) }

    val playButtonScale by animateFloatAsState(
        targetValue = if (isFocused) 1.15f else 1.0f,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessLow
        ),
        label = "playButtonScale"
    )

    Column(
        modifier = modifier.width(cardWidth),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        BaseFocusableCard(
            onClick = onClick,
            onFocus = onFocus,
            modifier = Modifier
                .size(cardWidth, cardHeight)
                .onFocusChanged { isFocused = it.isFocused }
                .clip(RoundedCornerShape(Dimensions.FocusCornerRadius))
        ) {
            Box(modifier = Modifier.fillMaxSize()) {
                AsyncImage(
                    model = resolvedImage,
                    contentDescription = title,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop,
                    onSuccess = {
                        if (resolvedImage.isNotBlank()) {
                            ImageFailureMemory.markHostSuccess(resolvedImage)
                            ImageQualityMonitor.recordSuccess(
                                url = resolvedImage,
                                context = ImageQualityMonitor.Context.CONTINUE_WATCHING,
                                profileId = profileId,
                                contentType = contentType,
                                contentId = contentId
                            )
                            PerformanceKpiMonitor.recordImageLoad(
                                context = ImageQualityMonitor.Context.CONTINUE_WATCHING,
                                durationMs = System.currentTimeMillis() - imageLoadStartedAt,
                                success = true
                            )
                        }
                    },
                    onError = {
                        if (resolvedImage.isNotBlank()) {
                            val classification = ImageErrorClassifier.classify(it.result.throwable)
                            val ttl = classification.temporaryTtlMs
                            if (ttl != null) {
                                ImageFailureMemory.markTemporarilyBad(resolvedImage, ttl)
                            } else {
                                ImageFailureMemory.markBad(resolvedImage)
                            }
                            ImageQualityMonitor.recordFailure(
                                url = resolvedImage,
                                context = ImageQualityMonitor.Context.CONTINUE_WATCHING,
                                profileId = profileId,
                                contentType = contentType,
                                contentId = contentId
                            )
                            PerformanceKpiMonitor.recordImageLoad(
                                context = ImageQualityMonitor.Context.CONTINUE_WATCHING,
                                durationMs = System.currentTimeMillis() - imageLoadStartedAt,
                                success = false
                            )
                        }
                    }
                )

                // Gradient scrim to ensure progress bar visibility
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .fillMaxWidth()
                        .height(20.dp)
                        .background(
                            androidx.compose.ui.graphics.Brush.verticalGradient(
                                colors = listOf(Color.Transparent, Color.Black.copy(alpha = 0.5f))
                            )
                        )
                )

                // Elegant progress bar overlay at the bottom
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .fillMaxWidth()
                        .height(4.dp)
                        .background(Color.White.copy(alpha = 0.24f))
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth(progress.coerceIn(0f, 1f))
                            .fillMaxHeight()
                            .background(PrimaryRed)
                    )
                }

                // Content type badge in the top-left corner
                val displayType = remember(contentType) {
                    if (contentType.isNullOrBlank()) {
                        "MOVIE"
                    } else {
                        when (contentType.lowercase().trim()) {
                            "tvshow", "series", "tvshows" -> "SERIES"
                            "movie", "movies" -> "MOVIE"
                            "live", "channel" -> "LIVE"
                            else -> contentType.uppercase()
                        }
                    }
                }

                Box(
                    modifier = Modifier
                        .padding(top = 8.dp, start = 8.dp)
                        .align(Alignment.TopStart)
                        .background(
                            color = Color.Black.copy(alpha = 0.7f),
                            shape = RoundedCornerShape(4.dp)
                        )
                        .padding(horizontal = 6.dp, vertical = 2.dp)
                ) {
                    Text(
                        text = displayType,
                        style = MaterialTheme.typography.labelSmall,
                        color = Color.White,
                        fontWeight = FontWeight.Bold
                    )
                }

                // Center play icon overlay (with premium scale animation on focus)
                Box(
                    modifier = Modifier
                        .align(Alignment.Center)
                        .graphicsLayer {
                            scaleX = playButtonScale
                            scaleY = playButtonScale
                        }
                        .size(36.dp)
                        .background(Color.White, shape = CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = SmartiflyIcons.Play,
                        contentDescription = "Play",
                        tint = Color.Black,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(6.dp))

        Text(
            text = title,
            style = MaterialTheme.typography.bodyMedium,
            color = Color.White.copy(alpha = 0.85f),
            fontWeight = FontWeight.Medium,
            maxLines = 1,
            overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
            modifier = Modifier.padding(horizontal = 4.dp)
        )
    }
}
