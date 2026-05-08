package com.smartifly.tv.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.platform.LocalInspectionMode
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.smartifly.tv.ui.design.TvTokens
import com.smartifly.tv.ui.preview.PreviewFrame

@Composable
fun TvValueField(
    label: String,
    value: String,
    modifier: Modifier = Modifier,
    placeholder: String = "",
    isActive: Boolean = false,
    obscureValue: Boolean = false,
    requestInitialFocus: Boolean = false,
    focusRequester: FocusRequester? = null,
    onClick: () -> Unit,
) {
    var focused by remember { mutableStateOf(false) }
    val internalFocusRequester = remember { FocusRequester() }
    val resolvedFocusRequester = focusRequester ?: internalFocusRequester
    var didRequestFocus by remember { mutableStateOf(false) }
    val isInPreview = LocalInspectionMode.current
    val scale by animateFloatAsState(
        targetValue = if (focused) 1.015f else 1f,
        label = "fieldScale"
    )

    LaunchedEffect(requestInitialFocus) {
        if (requestInitialFocus && !didRequestFocus && !isInPreview) {
            resolvedFocusRequester.requestFocus()
            didRequestFocus = true
        }
    }

    val borderColor = when {
        focused -> TvTokens.Colors.FocusCyan
        isActive -> TvTokens.Colors.AccentGold
        else -> TvTokens.Colors.SurfaceBorder
    }

    val displayText = when {
        value.isBlank() -> placeholder
        obscureValue -> "*".repeat(value.length.coerceAtMost(16))
        else -> value
    }

    val textColor = if (value.isBlank()) TvTokens.Colors.TextSecondary else TvTokens.Colors.TextPrimary

    Column(
        modifier = modifier
            .scale(scale)
            .fillMaxWidth()
            .border(1.5.dp, borderColor, RoundedCornerShape(14.dp))
            .background(TvTokens.Colors.SurfaceMuted, RoundedCornerShape(14.dp))
            .focusRequester(resolvedFocusRequester)
            .onFocusChanged { focused = it.isFocused }
            .focusable()
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onClick
            )
            .padding(horizontal = 16.dp, vertical = 12.dp)
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelLarge,
            color = TvTokens.Colors.TextSecondary,
        )
        Text(
            text = displayText,
            style = MaterialTheme.typography.bodyLarge,
            color = textColor,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}

@Preview(showBackground = true, widthDp = 960, heightDp = 540)
@Composable
private fun TvValueFieldPreview() {
    PreviewFrame {
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            TvValueField(
                label = "Username",
                value = "smartifly_demo",
                requestInitialFocus = true,
                onClick = {}
            )
            TvValueField(
                label = "Password",
                value = "secret123",
                placeholder = "Enter password",
                obscureValue = true,
                isActive = true,
                onClick = {}
            )
        }
    }
}

