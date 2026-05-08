package com.smartifly.tv.ui.design

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.Typography
import androidx.compose.runtime.remember
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.unit.dp
import com.smartifly.tv.ui.components.TvFocusButton
import com.smartifly.tv.ui.styling.TvStyles

private val SmartiflyColorScheme = darkColorScheme(
    primary = TvTokens.Colors.Primary,
    secondary = TvTokens.Colors.AccentCyan,
    tertiary = TvTokens.Colors.Tertiary,
    surface = TvTokens.Colors.Surface,
    background = TvTokens.Colors.BackgroundStart,
    error = TvTokens.Colors.Error,
    onPrimary = TvTokens.Colors.TextOnPrimary,
    onSurface = TvTokens.Colors.TextPrimary,
    onBackground = TvTokens.Colors.TextPrimary,
    onError = TvTokens.Colors.TextPrimary,
    surfaceVariant = TvTokens.Colors.SurfaceMuted,
    outline = TvTokens.Colors.Border,
    outlineVariant = TvTokens.Colors.BorderMedium,
)

private val SmartiflyTypography = Typography(
    displayLarge = TvTokens.TvType.DisplayLarge,
    displayMedium = TvTokens.TvType.DisplayMedium,
    displaySmall = TvTokens.TvType.DisplaySmall,
    headlineLarge = TvTokens.TvType.H1,
    headlineMedium = TvTokens.TvType.H2,
    headlineSmall = TvTokens.TvType.H3,
    titleLarge = TvTokens.TvType.H4,
    titleMedium = TvTokens.TvType.BodyLarge,
    titleSmall = TvTokens.TvType.BodyMedium,
    bodyLarge = TvTokens.TvType.BodyLarge,
    bodyMedium = TvTokens.TvType.BodyMedium,
    bodySmall = TvTokens.TvType.BodySmall,
    labelLarge = TvTokens.TvType.LabelLarge,
    labelMedium = TvTokens.TvType.LabelMedium,
    labelSmall = TvTokens.TvType.LabelSmall,
)

@Composable
fun SmartiflyTvTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = SmartiflyColorScheme,
        typography = SmartiflyTypography,
        content = {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(brush = TvStyles.appBackground)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(brush = TvStyles.coolGlow)
                        .alpha(0.92f)
                )
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(brush = TvStyles.subtleBlueGlow)
                        .alpha(0.85f)
                )
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(brush = TvStyles.topVignette)
                )
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(brush = TvStyles.bottomVignette)
                )
                content()
            }
        }
    )
}

@Preview(showBackground = true, widthDp = 960, heightDp = 540)
@Composable
private fun SmartiflyTvThemePreview() {
    val focusRequester = remember { FocusRequester() }
    SmartiflyTvTheme {
        Column(modifier = Modifier.padding(32.dp)) {
            Text(
                text = "Smartifly TV Theme",
                style = MaterialTheme.typography.displaySmall,
                color = TvTokens.Colors.TextPrimary
            )
            Text(
                text = "Previewing typography, spacing, and button treatments together.",
                modifier = Modifier.padding(top = 12.dp, bottom = 20.dp),
                style = MaterialTheme.typography.titleMedium,
                color = TvTokens.Colors.TextSecondary
            )
            TvFocusButton(
                text = "Primary Action",
                primary = true,
                requestInitialFocus = true,
                focusRequester = focusRequester,
                onClick = {}
            )
        }
    }
}
