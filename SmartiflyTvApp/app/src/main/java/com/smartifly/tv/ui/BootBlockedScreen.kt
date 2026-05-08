package com.smartifly.tv.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.smartifly.tv.ui.components.SmartiflyBackdrop
import com.smartifly.tv.ui.components.TvFocusButton
import com.smartifly.tv.ui.design.TvTokens

@Composable
fun BootBlockedScreen(
    status: String,
    message: String?,
    retryAllowed: Boolean,
    onRetry: () -> Unit,
) {
    SmartiflyBackdrop(showLogo = true) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            Column(
                modifier = Modifier
                    .width(560.dp)
                    .background(TvTokens.Colors.Surface.copy(alpha = 0.88f), RoundedCornerShape(28.dp))
                    .border(1.dp, TvTokens.Colors.Border.copy(alpha = 0.72f), RoundedCornerShape(28.dp))
                    .padding(horizontal = 36.dp, vertical = 32.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Text(
                    text = status.replace('_', ' '),
                    style = TvTokens.TvType.H1,
                    color = TvTokens.Colors.TextPrimary,
                )
                Text(
                    text = message ?: "Access to Smartifly TV is currently restricted.",
                    style = TvTokens.TvType.BodyMedium,
                    color = TvTokens.Colors.TextSecondary,
                    textAlign = TextAlign.Center,
                )
                TvFocusButton(
                    text = if (retryAllowed) "Retry" else "Unavailable",
                    primary = true,
                    requestInitialFocus = true,
                    enabled = retryAllowed,
                    onClick = onRetry,
                )
            }
        }
    }
}
