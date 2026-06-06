package com.smartifly.tv.ui.theme

import com.smartifly.tv.performance.lowend.LocalPerformanceConfig
import com.smartifly.tv.performance.lowend.LowEndModeManager
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.graphics.Color
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.darkColorScheme
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
@Composable
fun SmartiflyTheme(
    profileColor: Color? = null,
    content: @Composable () -> Unit
) {
    val performanceConfig = LowEndModeManager.getConfig()
    val colorScheme = MetallicColorScheme.copy(primary = profileColor ?: PrimaryRed)

    CompositionLocalProvider(
        LocalPerformanceConfig provides performanceConfig
    ) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography = SmartiflyTypography,
            content = content
        )
    }
}
