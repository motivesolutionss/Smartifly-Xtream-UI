package com.smartifly.tv.ui.components.base

import androidx.compose.animation.core.*
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.smartifly.tv.ui.theme.PrimaryRed

/**
 * Enterprise-grade Smartifly Loader.
 * Features a pulsing and spinning cinematic red ring.
 */
@Composable
fun SmartiflyLoader(
    modifier: Modifier = Modifier,
    size: Dp = 60.dp,
    strokeWidth: Dp = 4.dp
) {
    val infiniteTransition = rememberInfiniteTransition(label = "smartifly_loader")
    
    val scale by infiniteTransition.animateFloat(
        initialValue = 0.95f,
        targetValue = 1.05f,
        animationSpec = infiniteRepeatable(
            animation = tween(1200, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulse"
    )

    val rotation by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(1500, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "rotation"
    )

    Box(
        modifier = modifier
            .size(size)
            .scale(scale),
        contentAlignment = Alignment.Center
    ) {
        androidx.compose.foundation.Canvas(modifier = Modifier.fillMaxSize()) {
            // Static background ring (faint)
            drawCircle(
                color = PrimaryRed.copy(alpha = 0.1f),
                style = Stroke(width = strokeWidth.toPx())
            )
            
            // Pulsing glow ring
            drawCircle(
                color = PrimaryRed.copy(alpha = 0.05f),
                radius = size.toPx() / 2 * scale,
                style = Stroke(width = (strokeWidth * 2).toPx())
            )

            // Spinning active segment
            drawArc(
                brush = Brush.sweepGradient(
                    colors = listOf(
                        PrimaryRed.copy(alpha = 0.1f),
                        PrimaryRed,
                        Color(0xFFFF4D4D)
                    )
                ),
                startAngle = rotation,
                sweepAngle = 90f,
                useCenter = false,
                style = Stroke(
                    width = strokeWidth.toPx(),
                    cap = androidx.compose.ui.graphics.StrokeCap.Round
                )
            )
        }
    }
}
