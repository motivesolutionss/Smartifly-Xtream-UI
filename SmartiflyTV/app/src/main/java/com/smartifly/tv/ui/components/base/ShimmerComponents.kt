package com.smartifly.tv.ui.components.base

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.smartifly.tv.performance.lowend.LocalPerformanceConfig
import com.smartifly.tv.ui.theme.Dimensions

@Composable
fun ShimmerBase(
    modifier: Modifier = Modifier,
    shape: RoundedCornerShape = RoundedCornerShape(Dimensions.PaddingSmall)
) {
    val perfConfig = LocalPerformanceConfig.current
    
    if (perfConfig.tier == com.smartifly.tv.performance.lowend.DeviceTier.LOW) {
        // Simplified static skeleton for low-end devices
        Box(
            modifier = modifier.background(Color.White.copy(alpha = 0.05f), shape)
        )
        return
    }

    val shimmerColors = listOf(
        Color.White.copy(alpha = 0.05f),
        Color.White.copy(alpha = 0.15f),
        Color.White.copy(alpha = 0.05f),
    )

    val transition = rememberInfiniteTransition(label = "shimmer")
    val translateAnim = transition.animateFloat(
        initialValue = 0f,
        targetValue = 1000f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1200, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "shimmerTranslation"
    )

    val brush = Brush.linearGradient(
        colors = shimmerColors,
        start = Offset.Zero,
        end = Offset(x = translateAnim.value, y = translateAnim.value)
    )

    Box(
        modifier = modifier.background(brush, shape)
    )
}

@Composable
fun ShimmerPosterCard() {
    ShimmerBase(
        modifier = Modifier
            .width(160.dp)
            .aspectRatio(2/3f),
        shape = RoundedCornerShape(Dimensions.FocusCornerRadius)
    )
}

@Composable
fun ShimmerLandscapeCard() {
    ShimmerBase(
        modifier = Modifier
            .width(280.dp)
            .aspectRatio(16/9f),
        shape = RoundedCornerShape(Dimensions.FocusCornerRadius)
    )
}

@Composable
fun ShimmerHeroBanner() {
    ShimmerBase(
        modifier = Modifier
            .fillMaxWidth()
            .height(400.dp),
        shape = RoundedCornerShape(0.dp)
    )
}

@Composable
fun ShimmerText(width: androidx.compose.ui.unit.Dp, height: androidx.compose.ui.unit.Dp = 20.dp) {
    ShimmerBase(
        modifier = Modifier.width(width).height(height),
        shape = RoundedCornerShape(4.dp)
    )
}

@Composable
fun ShimmerBadge() {
    ShimmerBase(
        modifier = Modifier.width(60.dp).height(24.dp),
        shape = RoundedCornerShape(12.dp)
    )
}
