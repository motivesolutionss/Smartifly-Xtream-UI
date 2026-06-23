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
import androidx.compose.ui.zIndex
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.Dp
import androidx.tv.material3.*
import com.smartifly.tv.performance.lowend.DeviceTier
import com.smartifly.tv.performance.lowend.LocalPerformanceConfig
import com.smartifly.tv.ui.theme.Dimensions

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun BaseFocusableCard(
    onClick: () -> Unit,
    onLongClick: (() -> Unit)? = null,
    modifier: Modifier = Modifier,
    onFocus: (() -> Unit)? = null,
    focusBorderColor: Color = Color.White,
    focusBorderWidth: Dp = Dimensions.FocusBorderWidth,
    content: @Composable BoxScope.() -> Unit
) {
    val config = LocalPerformanceConfig.current
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()
    var longPressTriggered by remember { mutableStateOf(false) }
    var suppressNextClick by remember { mutableStateOf(false) }
    var selectDownAtMs by remember { mutableStateOf(0L) }

    // Trigger the focus callback when focused changes to true
    LaunchedEffect(isFocused) {
        if (isFocused) {
            onFocus?.invoke()
        }
    }

    val scale by animateFloatAsState(
        targetValue = 1.0f,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioNoBouncy,
            stiffness = Spring.StiffnessMedium
        ),
        label = "scale"
    )

    Surface(
        onClick = {
            if (suppressNextClick) {
                suppressNextClick = false
                return@Surface
            }
            onClick()
        },
        interactionSource = interactionSource,
        scale = ClickableSurfaceDefaults.scale(focusedScale = 1f), // Using graphicsLayer for peak performance
        colors = ClickableSurfaceDefaults.colors(
            containerColor = Color.Transparent,
            focusedContainerColor = Color.Transparent
        ),
        shape = ClickableSurfaceDefaults.shape(RoundedCornerShape(Dimensions.FocusCornerRadius)),
        modifier = modifier
            .onPreviewKeyEvent { event ->
                val callback = onLongClick ?: return@onPreviewKeyEvent false
                val isSelectKey = event.key == Key.Enter || event.key == Key.DirectionCenter || event.key == Key.NumPadEnter
                if (!isSelectKey) return@onPreviewKeyEvent false

                when (event.type) {
                    KeyEventType.KeyDown -> {
                        if (event.nativeKeyEvent.repeatCount == 0) {
                            selectDownAtMs = System.currentTimeMillis()
                        }
                        if (!longPressTriggered && event.nativeKeyEvent.repeatCount >= 6) {
                            longPressTriggered = true
                            suppressNextClick = true
                            callback()
                            return@onPreviewKeyEvent true
                        }
                        longPressTriggered
                    }
                    KeyEventType.KeyUp -> {
                        val heldMs = if (selectDownAtMs > 0L) System.currentTimeMillis() - selectDownAtMs else 0L
                        if (!longPressTriggered && heldMs >= 700L) {
                            longPressTriggered = true
                            suppressNextClick = true
                            callback()
                        }
                        val consume = longPressTriggered
                        longPressTriggered = false
                        selectDownAtMs = 0L
                        consume
                    }
                    else -> false
                }
            }
            .then(Modifier.zIndex(if (isFocused) 10f else 1f))
            .shadow(
                elevation = if (isFocused && config.tier == DeviceTier.HIGH) 16.dp else 0.dp,
                shape = RoundedCornerShape(Dimensions.FocusCornerRadius),
                clip = false
            )
            .graphicsLayer {
                scaleX = scale
                scaleY = scale
            }
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            // Main content layer
            content()
            
            // Adaptive Professional Border
            if (isFocused) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .border(
                            width = focusBorderWidth,
                            color = focusBorderColor,
                            shape = RoundedCornerShape(Dimensions.FocusCornerRadius)
                        )
                )
            }
        }
    }
}
