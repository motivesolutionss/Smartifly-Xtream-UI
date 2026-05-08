package com.smartifly.tv.ui.theme

import com.smartifly.tv.performance.lowend.LocalPerformanceConfig
import com.smartifly.tv.performance.lowend.LowEndModeManager
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.remember
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.darkColorScheme

@OptIn(ExperimentalTvMaterial3Api::class)
private val MetallicColorScheme = darkColorScheme(
    primary = PrimaryRed,
    onPrimary = TextPrimary,
    background = BackgroundMetallic,
    onBackground = TextPrimary,
    surface = Color(0xFF0B0F15),
    onSurface = TextSecondary
)

@OptIn(ExperimentalTvMaterial3Api::class)
private val GoldColorScheme = darkColorScheme(
    primary = PrimaryGold,
    onPrimary = Color.Black,
    background = BackgroundGold,
    onBackground = TextPrimary,
    surface = Color(0xFF121212),
    onSurface = TextSecondary
)

@OptIn(ExperimentalTvMaterial3Api::class)
private val AetherColorScheme = darkColorScheme(
    primary = PrimaryCyan,
    onPrimary = Color.Black,
    background = BackgroundAether,
    onBackground = TextPrimary,
    surface = Color(0xFF080C14),
    onSurface = TextSecondary
)

val LocalThemeMode = staticCompositionLocalOf { ThemeMode.Metallic }

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun SmartiflyTheme(
    themeMode: ThemeMode = LocalThemeMode.current,
    content: @Composable () -> Unit
) {
    val performanceConfig = remember { LowEndModeManager.getConfig() }
    
    val colorScheme = when (themeMode) {
        ThemeMode.Metallic -> MetallicColorScheme
        ThemeMode.Gold -> GoldColorScheme
        ThemeMode.Aether -> AetherColorScheme
    }

    CompositionLocalProvider(
        LocalThemeMode provides themeMode,
        LocalPerformanceConfig provides performanceConfig
    ) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography = SmartiflyTypography,
            content = content
        )
    }
}
