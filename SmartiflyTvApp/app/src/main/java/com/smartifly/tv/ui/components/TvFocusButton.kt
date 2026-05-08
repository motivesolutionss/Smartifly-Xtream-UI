package com.smartifly.tv.ui.components

import android.view.KeyEvent as AndroidKeyEvent
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.focusProperties
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.platform.LocalInspectionMode
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.smartifly.tv.ui.design.TvTokens
import com.smartifly.tv.ui.preview.PreviewFrame
import com.smartifly.tv.ui.styling.TvStyles

@Composable
fun TvFocusButton(
    text: String,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    selected: Boolean = false,
    primary: Boolean = false,
    compact: Boolean = false,
    requestInitialFocus: Boolean = false,
    focusRequester: FocusRequester? = null,
    leftFocusRequester: FocusRequester? = null,
    rightFocusRequester: FocusRequester? = null,
    upFocusRequester: FocusRequester? = null,
    downFocusRequester: FocusRequester? = null,
    singleLine: Boolean = true,
    onClick: () -> Unit,
) {
    var focused by remember { mutableStateOf(false) }
    val internalFocusRequester = remember { FocusRequester() }
    val resolvedFocusRequester = focusRequester ?: internalFocusRequester
    var didRequestFocus by remember { mutableStateOf(false) }
    val isInPreview = LocalInspectionMode.current
    val scale by animateFloatAsState(
        targetValue = if (focused) TvStyles.Effects.buttonFocusScale else 1f,
        label = "buttonScale"
    )
    
    // Shimmer effect for focused primary buttons
    val infiniteTransition = rememberInfiniteTransition(label = "shimmerTransition")
    val shimmerOffset by infiniteTransition.animateFloat(
        initialValue = -500f,
        targetValue = 1000f,
        animationSpec = infiniteRepeatable(
            animation = tween(1200, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "shimmerOffset"
    )

    val minHeight = if (compact) 54.dp else 66.dp
    val horizontalPadding = if (compact) 18.dp else 28.dp
    val verticalPadding = if (compact) 10.dp else 16.dp

    val borderColor = when {
        primary && focused -> TvTokens.Colors.PrimaryLight
        primary -> TvTokens.Colors.Primary.copy(alpha = 0.92f)
        focused -> TvTokens.Colors.FocusCyan
        selected -> TvTokens.Colors.AccentGold.copy(alpha = 0.9f)
        else -> TvTokens.Colors.BorderMedium
    }

    val containerBrush: Brush = when {
        primary -> TvStyles.primaryButton
        focused -> TvStyles.accentButton
        selected -> TvStyles.glassSurface
        else -> TvStyles.glassDark
    }

    val textColor = when {
        !enabled -> TvTokens.Colors.TextDisabled
        primary -> TvTokens.Colors.TextOnPrimary
        focused -> TvTokens.Colors.TextInverse
        selected -> TvTokens.Colors.TextPrimary
        else -> TvTokens.Colors.TextSecondary.copy(alpha = 0.96f)
    }

    val glowColor = when {
        primary -> TvStyles.GlowColors.primary
        focused -> TvStyles.GlowColors.focus
        selected -> TvStyles.GlowColors.warning
        else -> Color.Transparent
    }

    LaunchedEffect(requestInitialFocus) {
        if (requestInitialFocus && !didRequestFocus && !isInPreview) {
            resolvedFocusRequester.requestFocus()
            didRequestFocus = true
        }
    }

    Box(
        modifier = modifier
            .scale(scale)
            .shadow(
                elevation = when {
                    focused -> TvStyles.Elevation.lg
                    selected || primary -> TvStyles.Elevation.sm
                    else -> TvStyles.Elevation.none
                },
                shape = RoundedCornerShape(TvStyles.Radius.lg),
                ambientColor = glowColor,
                spotColor = glowColor
            )
            .defaultMinSize(minHeight = minHeight)
            .border(
                width = if (focused || primary) 2.dp else 1.dp,
                color = borderColor,
                shape = RoundedCornerShape(TvStyles.Radius.lg),
            )
            .background(
                brush = containerBrush,
                shape = RoundedCornerShape(TvStyles.Radius.lg)
            )
            .focusRequester(resolvedFocusRequester)
            .focusProperties {
                leftFocusRequester?.let { left = it }
                rightFocusRequester?.let { right = it }
                upFocusRequester?.let { up = it }
                downFocusRequester?.let { down = it }
            }
            .onFocusChanged { focused = it.isFocused }
            .onKeyEvent { event ->
                val byComposeKey = event.key == Key.Enter ||
                    event.key == Key.NumPadEnter ||
                    event.key == Key.DirectionCenter ||
                    event.key == Key.Spacebar

                val keyCode = event.nativeKeyEvent.keyCode
                val byNativeCode = keyCode == AndroidKeyEvent.KEYCODE_DPAD_CENTER ||
                    keyCode == AndroidKeyEvent.KEYCODE_ENTER ||
                    keyCode == AndroidKeyEvent.KEYCODE_NUMPAD_ENTER ||
                    keyCode == AndroidKeyEvent.KEYCODE_SPACE ||
                    keyCode == AndroidKeyEvent.KEYCODE_BUTTON_A ||
                    keyCode == AndroidKeyEvent.KEYCODE_BUTTON_SELECT

                if (enabled && (byComposeKey || byNativeCode) && event.type == KeyEventType.KeyUp) {
                    onClick()
                    if (!isInPreview) {
                        resolvedFocusRequester.requestFocus()
                    }
                    true
                } else {
                    false
                }
            }
            .focusable(enabled = enabled)
            .clickable(
                enabled = enabled,
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onClick,
            )
            .drawWithContent {
                drawContent()
                if (focused && primary) {
                    drawRect(
                        brush = Brush.linearGradient(
                            colors = listOf(
                                Color.White.copy(alpha = 0f),
                                Color.White.copy(alpha = 0.22f),
                                Color.White.copy(alpha = 0f)
                            ),
                            start = Offset(shimmerOffset, 0f),
                            end = Offset(shimmerOffset + 180f, 220f)
                        )
                    )
                }
            }
            .padding(horizontal = horizontalPadding, vertical = verticalPadding),
        contentAlignment = Alignment.Center
    ) {
        Row(horizontalArrangement = Arrangement.Center) {
            Text(
                text = text,
                style = if (compact) TvTokens.TvType.ButtonSmall else TvTokens.TvType.Button,
                color = textColor,
                maxLines = if (singleLine) 1 else Int.MAX_VALUE,
                overflow = if (singleLine && !compact) TextOverflow.Ellipsis else TextOverflow.Clip,
                textAlign = TextAlign.Center,
            )
        }
    }
}

@Preview(showBackground = true, widthDp = 960, heightDp = 540)
@Composable
private fun TvFocusButtonPreview() {
    PreviewFrame {
        Column {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                TvFocusButton(
                    text = "Play",
                    primary = true,
                    requestInitialFocus = true,
                    onClick = {}
                )
                TvFocusButton(text = "Selected", selected = true, onClick = {})
                TvFocusButton(text = "Compact", compact = true, onClick = {})
            }
        }
    }
}
