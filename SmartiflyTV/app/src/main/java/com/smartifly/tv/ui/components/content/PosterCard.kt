package com.smartifly.tv.ui.components.content

import androidx.compose.foundation.background
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.Alignment
import androidx.compose.ui.graphics.Brush
import androidx.tv.material3.Text
import androidx.tv.material3.ExperimentalTvMaterial3Api
import coil.compose.AsyncImage
import com.smartifly.tv.data.models.MovieMetadata
import com.smartifly.tv.ui.components.base.BaseFocusableCard
import com.smartifly.tv.ui.theme.Dimensions

import androidx.compose.ui.draw.clip
import com.smartifly.tv.ui.theme.SurfaceDark
import com.smartifly.tv.data.image.ImageFailureMemory
import com.smartifly.tv.data.image.ImageErrorClassifier
import com.smartifly.tv.data.image.ImagePolicyEngine
import com.smartifly.tv.data.image.ImageQualityMonitor
import com.smartifly.tv.data.image.ProviderHealthTelemetry
import com.smartifly.tv.data.hero.HeroImageResolver
import androidx.compose.runtime.setValue
import androidx.compose.ui.res.painterResource
import com.smartifly.tv.R
import com.smartifly.tv.performance.PerformanceKpiMonitor

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun PosterCard(
    movie: MovieMetadata,
    profileId: String? = null,
    onClick: () -> Unit,
    onFocus: () -> Unit,
    modifier: Modifier = Modifier
) {
    var showFallback by remember(movie.id, movie.posterUrl, movie.backdropUrl) { mutableStateOf(false) }
    var candidateIndex by remember(movie.id, movie.posterUrl, movie.backdropUrl) { mutableStateOf(0) }
    val primaryCandidate = movie.posterUrl.ifBlank { movie.backdropUrl }
    val candidates = remember(movie.posterUrl, movie.backdropUrl) { ImagePolicyEngine.resolveCandidates(movie.posterUrl, movie.backdropUrl) }
    val resolvedImage = candidates.getOrNull(candidateIndex).orEmpty()
    val normalizedPrimary = HeroImageResolver.normalizeImageUrl(primaryCandidate)
    val hasPolicyRejectedUrl = !primaryCandidate.isBlank() && normalizedPrimary.isNullOrBlank()
    val suppressedByPolicy = candidates.isEmpty()
    val fallbackPainter = painterResource(id = pickFallbackResId(movie))
    val imageLoadStartedAt = remember(resolvedImage) { System.currentTimeMillis() }

    LaunchedEffect(hasPolicyRejectedUrl, suppressedByPolicy, primaryCandidate, profileId, movie.type, movie.id) {
        if (hasPolicyRejectedUrl) {
            ProviderHealthTelemetry.recordEvent(
                eventType = "URL_REJECTED",
                context = ImageQualityMonitor.Context.HOME_POSTER,
                imageUrl = primaryCandidate,
                hostOverride = "invalid-host",
                profileId = profileId,
                contentType = movie.type,
                contentId = movie.id,
                metadata = mapOf("reason" to "url_policy_rejected")
            )
        } else if (suppressedByPolicy) {
            ProviderHealthTelemetry.recordEvent(
                eventType = "URL_SUPPRESSED",
                context = ImageQualityMonitor.Context.HOME_POSTER,
                imageUrl = primaryCandidate,
                profileId = profileId,
                contentType = movie.type,
                contentId = movie.id,
                metadata = mapOf("reason" to "low_trust_or_bad_host_policy")
            )
        }
    }
    LaunchedEffect(candidateIndex, candidates.size) {
        if (candidateIndex < candidates.size) showFallback = false
    }

    BaseFocusableCard(
        onClick = onClick,
        onFocus = onFocus,
        modifier = modifier
            .size(Dimensions.PosterWidth, Dimensions.PosterHeight)
            .clip(androidx.compose.foundation.shape.RoundedCornerShape(Dimensions.FocusCornerRadius))
    ) {
        // Base layer / Placeholder
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(SurfaceDark),
            contentAlignment = Alignment.Center
        ) {
            if (!resolvedImage.isBlank() && !showFallback) {
                AsyncImage(
                    model = resolvedImage,
                    contentDescription = movie.title,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop,
                    onError = {
                        val classification = ImageErrorClassifier.classify(it.result.throwable)
                        val temporaryTtl = classification.temporaryTtlMs
                        if (temporaryTtl != null) {
                            ImageFailureMemory.markTemporarilyBad(resolvedImage, ttlMs = temporaryTtl)
                        } else {
                            ImageFailureMemory.markBad(resolvedImage)
                        }
                        ImageQualityMonitor.recordFailure(
                            url = resolvedImage,
                            context = ImageQualityMonitor.Context.HOME_POSTER,
                            profileId = profileId,
                            contentType = movie.type,
                            contentId = movie.id
                        )
                        PerformanceKpiMonitor.recordImageLoad(
                            context = ImageQualityMonitor.Context.HOME_POSTER,
                            durationMs = System.currentTimeMillis() - imageLoadStartedAt,
                            success = false
                        )
                        if (candidateIndex + 1 < candidates.size) {
                            candidateIndex += 1
                        } else {
                            showFallback = true
                        }
                    },
                    onSuccess = {
                        ImageFailureMemory.markHostSuccess(resolvedImage)
                        ImageQualityMonitor.recordSuccess(
                            url = resolvedImage,
                            context = ImageQualityMonitor.Context.HOME_POSTER,
                            profileId = profileId,
                            contentType = movie.type,
                            contentId = movie.id
                        )
                        PerformanceKpiMonitor.recordImageLoad(
                            context = ImageQualityMonitor.Context.HOME_POSTER,
                            durationMs = System.currentTimeMillis() - imageLoadStartedAt,
                            success = true
                        )
                    }
                )
            } else {
                Image(
                    painter = fallbackPainter,
                    contentDescription = movie.title,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop
                )
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .fillMaxWidth()
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(
                                    Color.Transparent,
                                    Color.Black.copy(alpha = 0.94f)
                                ),
                                startY = 0f,
                                endY = 220f
                            )
                        )
                ) {
                    Text(
                        text = movie.title.take(54),
                        color = Color.White,
                        modifier = Modifier
                            .padding(horizontal = Dimensions.PaddingSmall, vertical = Dimensions.PaddingSmall)
                    )
                }
            }
        }
    }
}

private fun pickFallbackResId(movie: MovieMetadata): Int {
    val seed = "${movie.type}|${movie.id}|${movie.title}".hashCode()
    return when ((seed and Int.MAX_VALUE) % 5) {
        0 -> R.drawable.fallback_1
        1 -> R.drawable.fallback_2
        2 -> R.drawable.fallback_3
        3 -> R.drawable.fallback_4
        else -> R.drawable.fallback_5
    }
}
