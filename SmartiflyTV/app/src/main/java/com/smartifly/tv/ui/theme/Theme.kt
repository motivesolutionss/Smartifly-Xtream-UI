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
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import com.smartifly.tv.ui.theme.RemoteThemeManager
import com.smartifly.tv.ui.theme.SmartiflyTypography

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

enum class ThemeMode { Metallic, Gold, Aether, Remote }

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun SmartiflyTheme(
    themeMode: ThemeMode = LocalThemeMode.current,
    profileColor: Color? = null,
    content: @Composable () -> Unit
) {
    val performanceConfig = remember { LowEndModeManager.getConfig() }
    
    val remoteTheme by RemoteThemeManager.currentConfig.collectAsState()
    
    val colorScheme = when (themeMode) {
        ThemeMode.Metallic -> MetallicColorScheme.copy(primary = profileColor ?: PrimaryRed)
        ThemeMode.Gold -> GoldColorScheme.copy(primary = profileColor ?: PrimaryGold)
        ThemeMode.Aether -> AetherColorScheme.copy(primary = profileColor ?: PrimaryCyan)
        ThemeMode.Remote -> darkColorScheme(
            primary = profileColor ?: remoteTheme.primaryColor,
            onPrimary = Color.White,
            background = remoteTheme.secondaryColor,
            onBackground = Color.White,
            surface = remoteTheme.secondaryColor.copy(alpha = 0.9f),
            onSurface = Color.White.copy(alpha = 0.7f)
        )
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
