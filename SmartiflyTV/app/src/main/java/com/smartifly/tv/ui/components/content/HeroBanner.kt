package com.smartifly.tv.ui.components.content

import androidx.compose.animation.Crossfade
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.Button
import androidx.tv.material3.ButtonDefaults
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.Text
import coil.compose.AsyncImage
import com.smartifly.tv.data.models.MovieMetadata
import com.smartifly.tv.ui.theme.Dimensions
import com.smartifly.tv.ui.theme.PrimaryRed
import com.smartifly.tv.ui.theme.TextPrimary
import com.smartifly.tv.ui.theme.TextSecondary
import com.smartifly.tv.ui.theme.TextTertiary

import androidx.compose.material3.Icon
import com.smartifly.tv.performance.lowend.DeviceTier
import com.smartifly.tv.performance.lowend.LocalPerformanceConfig
import com.smartifly.tv.ui.theme.SmartiflyIcons
import com.smartifly.tv.ui.components.base.Badge
import com.smartifly.tv.ui.components.base.DotSeparator
import com.smartifly.tv.data.image.ImageFailureMemory
import com.smartifly.tv.data.image.ImageErrorClassifier
import com.smartifly.tv.data.image.ImagePolicyEngine
import com.smartifly.tv.data.image.ImageQualityMonitor


@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun HeroBanner(
    movie: MovieMetadata?,
    onPlayClick: (MovieMetadata) -> Unit,
    modifier: Modifier = Modifier
) {
    val config = LocalPerformanceConfig.current
    
    // Premium cinematic zoom effect animation
    val infiniteTransition = rememberInfiniteTransition(label = "heroZoom")
    val zoomScale by if (config.tier == DeviceTier.HIGH) {
        infiniteTransition.animateFloat(
            initialValue = 1.0f,
            targetValue = 1.05f,
            animationSpec = infiniteRepeatable(
                animation = tween(15000, easing = LinearEasing),
                repeatMode = RepeatMode.Reverse
            ),
            label = "zoom"
        )
    } else {
        remember { mutableStateOf(1.0f) }
    }

    val resolvedBackdrop = ImagePolicyEngine.resolveFirstUsable(
        movie?.backdropUrl,
        movie?.posterUrl
    )

    Box(modifier = modifier.height(480.dp).fillMaxWidth()) {
        Crossfade(targetState = resolvedBackdrop, label = "heroFade") { url ->
            AsyncImage(
                model = url,
                contentDescription = null,
                modifier = Modifier
                    .fillMaxSize()
                    .graphicsLayer {
                        scaleX = zoomScale
                        scaleY = zoomScale
                    },
                contentScale = ContentScale.Crop,
                onError = {
                    if (!url.isNullOrBlank()) {
                        val classification = ImageErrorClassifier.classify(it.result.throwable)
                        val ttl = classification.temporaryTtlMs
                        if (ttl != null) {
                            ImageFailureMemory.markTemporarilyBad(url, ttl)
                        } else {
                            ImageFailureMemory.markBad(url)
                        }
                        ImageQualityMonitor.recordFailure(
                            url = url,
                            context = ImageQualityMonitor.Context.HOME_HERO,
                            contentType = movie?.type,
                            contentId = movie?.id
                        )
                    }
                },
                onSuccess = {
                    if (!url.isNullOrBlank()) {
                        ImageFailureMemory.markHostSuccess(url)
                        ImageQualityMonitor.recordSuccess(
                            url = url,
                            context = ImageQualityMonitor.Context.HOME_HERO,
                            contentType = movie?.type,
                            contentId = movie?.id
                        )
                    }
                }
            )
        }


        // Sophisticated Gradients
        Box(modifier = Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color.Transparent, Color.Transparent, Color.Black.copy(alpha = 0.3f), Color.Black))))
        Box(modifier = Modifier.fillMaxSize().background(Brush.horizontalGradient(listOf(Color.Black.copy(alpha = 0.9f), Color.Black.copy(alpha = 0.4f), Color.Transparent))))

        movie?.let { data ->
            Column(
                modifier = Modifier
                    .align(Alignment.CenterStart)
                    .padding(start = Dimensions.PaddingExtraLarge, top = 80.dp)
                    .width(550.dp)
            ) {
                // Category/Badge Row
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Badge(text = "TOP 10", containerColor = PrimaryRed)
                    Spacer(modifier = Modifier.width(Dimensions.PaddingSmall))
                    Text(text = "Series", style = MaterialTheme.typography.labelLarge, color = PrimaryRed, fontWeight = FontWeight.Bold)
                }
                
                Spacer(modifier = Modifier.height(Dimensions.PaddingSmall))
                
                Text(text = data.title, style = MaterialTheme.typography.displayMedium, color = TextPrimary, fontWeight = FontWeight.ExtraBold)
                
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = Dimensions.PaddingSmall)) {
                    Text(text = data.year, style = MaterialTheme.typography.labelLarge, color = TextTertiary)
                    DotSeparator()
                    Text(text = data.rating, style = MaterialTheme.typography.labelLarge, color = TextTertiary)
                    DotSeparator()
                    Text(text = data.duration, style = MaterialTheme.typography.labelLarge, color = TextTertiary)
                    Spacer(modifier = Modifier.width(Dimensions.PaddingMedium))
                    Badge(text = "4K Ultra HD", containerColor = Color.White.copy(alpha = 0.1f), contentColor = TextSecondary)
                }
                
                Spacer(modifier = Modifier.height(Dimensions.PaddingMedium))
                
                Text(
                    text = data.description,
                    style = MaterialTheme.typography.bodyLarge,
                    color = TextSecondary,
                    maxLines = 3,
                    lineHeight = 24.sp
                )
                
                Spacer(modifier = Modifier.height(Dimensions.PaddingExtraLarge))
                
                Row {
                    Button(
                        onClick = { onPlayClick(data) },
                        colors = ButtonDefaults.colors(
                            containerColor = PrimaryRed,
                            focusedContainerColor = Color.White,
                            focusedContentColor = Color.Black
                        ),
                        shape = ButtonDefaults.shape(androidx.compose.foundation.shape.RoundedCornerShape(8.dp))
                    ) {
                        Icon(SmartiflyIcons.Play, contentDescription = null, modifier = Modifier.size(Dimensions.PlayerIconSizeSmall))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Play", style = MaterialTheme.typography.labelLarge)
                    }
                    Spacer(modifier = Modifier.width(Dimensions.PaddingMedium))
                    Button(
                        onClick = { },
                        colors = ButtonDefaults.colors(
                            containerColor = Color.White.copy(alpha = 0.1f),
                            focusedContainerColor = Color.White,
                            focusedContentColor = Color.Black
                        ),
                        shape = ButtonDefaults.shape(androidx.compose.foundation.shape.RoundedCornerShape(8.dp))
                    ) {
                        Icon(SmartiflyIcons.Info, contentDescription = null, modifier = Modifier.size(Dimensions.PlayerIconSizeSmall))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("More Info", style = MaterialTheme.typography.labelLarge)
                    }
                }
            }
        }
    }
}
