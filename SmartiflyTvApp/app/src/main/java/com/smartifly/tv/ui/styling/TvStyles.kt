package com.smartifly.tv.ui.styling

import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.smartifly.tv.ui.design.TvTokens

object TvStyles {

    object Radius {
        val xs = 4.dp
        val sm = 8.dp
        val md = 12.dp
        val lg = 12.dp
        val xl = 20.dp
        val xxl = 28.dp
        val full = 999.dp
    }

    object Layout {
        val screenHorizontal = 96.dp
        val screenVertical = 54.dp
        val sectionGap = 48.dp
        val itemGap = 24.dp
        val sidebarWidth = 80.dp
    }

    object Effects {
        const val focusScale = 1.02f
        const val cardFocusScale = 1.05f
        const val buttonFocusScale = 1.05f
    }

    object Elevation {
        val none = 0.dp
        val xs = 2.dp
        val sm = 6.dp
        val md = 12.dp
        val lg = 18.dp
        val xl = 24.dp
        val xxl = 30.dp
    }

    object GlowColors {
        val primary = Color(0x66E50914)
        val accent = Color(0x6600E5FF)
        val live = Color(0x66E50914)
        val success = Color(0x6646D369)
        val warning = Color(0x66F5C518)
        val error = Color(0x66E50914)
        val focus = Color(0xFF00E5FF)
    }

    val glassSurface: Brush
        get() = Brush.verticalGradient(
            colors = listOf(
                Color(0x1AAABDD6),
                Color(0xCC0F151E)
            )
        )

    val glassDark: Brush
        get() = Brush.verticalGradient(
            colors = listOf(
                Color(0xCC070A10),
                Color(0xE60B0F15)
            )
        )

    val frostedPanel: Brush
        get() = Brush.linearGradient(
            colors = listOf(
                Color(0xCC0B1017),
                Color(0xD9151D28),
                Color(0xC40A0E14)
            )
        )

    val frostedPanelSoft: Brush
        get() = Brush.verticalGradient(
            colors = listOf(
                Color(0xB80F151E),
                Color(0xA91A2431)
            )
        )

    val sidebarShell: Brush
        get() = Brush.verticalGradient(
            colors = listOf(
                Color(0xE1080B11),
                Color(0xD1111822),
                Color(0xCC070A10)
            )
        )

    val appBackground: Brush
        get() = Brush.linearGradient(
            colors = listOf(
                TvTokens.Colors.BackgroundStart,
                TvTokens.Colors.BackgroundMid,
                TvTokens.Colors.BackgroundEnd
            )
        )

    val topVignette: Brush
        get() = Brush.verticalGradient(
            colors = listOf(Color(0xDB020306), Color(0x7D020306), Color.Transparent)
        )

    val bottomVignette: Brush
        get() = Brush.verticalGradient(
            colors = listOf(Color.Transparent, Color(0xE0040507))
        )

    val coolGlow: Brush
        get() = Brush.radialGradient(
            colors = listOf(Color(0x1200E5FF), Color.Transparent),
            radius = 1500f
        )

    val subtleBlueGlow: Brush
        get() = Brush.radialGradient(
            colors = listOf(Color(0x10C1D6F0), Color.Transparent),
            radius = 1800f
        )

    val heroOverlay: Brush
        get() = Brush.horizontalGradient(
            colors = listOf(Color(0xDE090C12), Color(0x94090C12), Color(0x29090C12), Color.Transparent)
        )

    val stageOverlay: Brush
        get() = Brush.radialGradient(
            colors = listOf(Color(0x1FC1D6F0), Color.Transparent),
            radius = 1400f
        )

    val cardOverlay: Brush
        get() = Brush.verticalGradient(
            colors = listOf(Color.Transparent, Color(0xD90B0F15))
        )

    val cardHover: Brush
        get() = Brush.verticalGradient(
            colors = listOf(Color.Transparent, Color(0x1AC6D6EB))
        )

    val shimmer: Brush
        get() = Brush.linearGradient(
            colors = listOf(Color(0x00FFFFFF), Color(0x17C6D6EB), Color(0x00FFFFFF))
        )

    val primaryButton: Brush
        get() = Brush.horizontalGradient(
            colors = listOf(TvTokens.Colors.PrimaryLight, TvTokens.Colors.Primary)
        )

    val accentButton: Brush
        get() = Brush.horizontalGradient(
            colors = listOf(TvTokens.Colors.Accent, Color(0xFFE5E5E5))
        )

    fun contentTypeGlow(type: String): Brush {
        val glowColor = when (type.lowercase()) {
            "live" -> TvTokens.Colors.LiveGlow
            "movie" -> TvTokens.Colors.MoviesGlow
            "series" -> TvTokens.Colors.SeriesGlow
            else -> TvTokens.Colors.NeonGlow
        }
        return Brush.radialGradient(colors = listOf(glowColor, Color.Transparent), radius = 300f)
    }

    fun contentTypeColor(type: String): Color {
        return when (type.lowercase()) {
            "live" -> TvTokens.Colors.Live
            "movie" -> TvTokens.Colors.Movies
            "series" -> TvTokens.Colors.Series
            "sports" -> TvTokens.Colors.Sports
            "news" -> TvTokens.Colors.News
            "kids" -> TvTokens.Colors.Kids
            else -> TvTokens.Colors.AccentCyan
        }
    }
}
