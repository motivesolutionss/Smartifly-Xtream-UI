package com.smartifly.tv.ui.components.base

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.tv.material3.*
import com.smartifly.tv.performance.lowend.DeviceTier
import com.smartifly.tv.performance.lowend.LocalPerformanceConfig
import com.smartifly.tv.ui.theme.Dimensions
import com.smartifly.tv.ui.theme.PrimaryRed
import com.smartifly.tv.ui.theme.PrimaryRedGlow

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun BaseFocusableCard(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    onFocus: (() -> Unit)? = null,
    content: @Composable BoxScope.() -> Unit
) {
    val config = LocalPerformanceConfig.current
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()

    // Trigger the focus callback when focused changes to true
    LaunchedEffect(isFocused) {
        if (isFocused) {
            onFocus?.invoke()
        }
    }

    // Professional Scale Animation
    val scale by animateFloatAsState(
        targetValue = if (isFocused) Dimensions.FocusScale else 1.0f,
        animationSpec = spring(dampingRatio = Spring.DampingRatioLowBouncy, stiffness = Spring.StiffnessMediumLow),
        label = "scale"
    )

    // Hardware-accelerated Glow alpha (Much more subtle)
    val glowAlpha by animateFloatAsState(
        targetValue = if (isFocused && config.tier != DeviceTier.LOW) 0.3f else 0f,
        label = "glow"
    )

    // Masterpiece Shine Animation
    val shineProgress by animateFloatAsState(
        targetValue = if (isFocused) 1f else 0f,
        animationSpec = if (isFocused) tween(600) else snap(),
        label = "shine"
    )

    Surface(
        onClick = onClick,
        interactionSource = interactionSource,
        scale = ClickableSurfaceDefaults.scale(focusedScale = 1f), // Using graphicsLayer for peak performance
        colors = ClickableSurfaceDefaults.colors(
            containerColor = Color.Transparent,
            focusedContainerColor = Color.Transparent
        ),
        shape = ClickableSurfaceDefaults.shape(RoundedCornerShape(Dimensions.FocusCornerRadius)),
        modifier = modifier
            .graphicsLayer {
                scaleX = scale
                scaleY = scale
            }
            .then(
                if (isFocused && config.tier != DeviceTier.LOW) {
                    Modifier.shadow(
                        elevation = Dimensions.GlowRadius,
                        shape = RoundedCornerShape(Dimensions.FocusCornerRadius),
                        ambientColor = PrimaryRedGlow.copy(alpha = glowAlpha),
                        spotColor = PrimaryRedGlow.copy(alpha = glowAlpha)
                    )
                } else Modifier
            )
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            // Main content layer
            content()
            
            // Masterpiece Enhancement: Spotlight Shine (Sweep effect) - Only on High Tier
            if (isFocused && config.tier == DeviceTier.HIGH) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.linearGradient(
                                colors = listOf(
                                    Color.Transparent,
                                    Color.White.copy(alpha = 0.2f),
                                    Color.Transparent
                                ),
                                start = Offset(x = shineProgress * 1000f - 500f, y = 0f),
                                end = Offset(x = shineProgress * 1000f, y = 1000f)
                            )
                        )
                )
            }
            
            // Specular Highlight (The "Glass" Reflection) - High Tier Only
            if (isFocused && config.tier == DeviceTier.HIGH) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.linearGradient(
                                colors = listOf(
                                    Color.White.copy(alpha = 0.15f),
                                    Color.Transparent,
                                    Color.Transparent
                                )
                            )
                        )
                )
            }

            // Adaptive Professional Border
            if (isFocused) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .border(
                            width = Dimensions.FocusBorderWidth,
                            color = if (config.tier == DeviceTier.LOW) Color.White else PrimaryRed,
                            shape = RoundedCornerShape(Dimensions.FocusCornerRadius)
                        )
                )
            }
        }
    }
}
