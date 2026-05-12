package com.smartifly.tv.ui.theme

import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color



// Futuristic & Enterprise Color Palette
val PrimaryRed = Color(0xFFE50914) // Classic Netflix Red
val PrimaryRedGlow = Color(0xFFFF3232)
val PrimaryGold = Color(0xFFFFD700)
val PrimaryCyan = Color(0xFF00F3FF)

// Semantic Surfaces (Dark Mode Focused)
val BackgroundMetallic = Color(0xFF040507)
val BackgroundGold = Color(0xFF000000)
val BackgroundAether = Color(0xFF020408)

val SurfaceUltraDark = Color(0xFF080C14)
val SurfaceDark = Color(0xFF121826)
val SurfaceMedium = Color(0xFF1C222B)
val SurfaceVariant = Color(0xFF2A313C)
val SurfaceOverlay = Color(0xCC0D1117)

// Text Hierarchy
val TextPrimary = Color(0xFFFFFFFF)
val TextSecondary = Color(0xFFE7ECF4)
val TextTertiary = Color(0xFFB6C0D1)
val TextMuted = Color(0xFF8D9AAF)

// Borders & Accents
val BorderSubtle = Color(0x29AABDD6)
val BorderMedium = Color(0x52AABDD6)
val Error = Color(0xFFE50914)

// Gradient Presets
val PremiumGradient = Brush.verticalGradient(listOf(Color.Transparent, Color.Black.copy(alpha = 0.8f)))
val FuturisticGradient = Brush.verticalGradient(listOf(PrimaryCyan.copy(alpha = 0.1f), Color.Transparent))
val GlassGradient = Brush.verticalGradient(listOf(Color.White.copy(alpha = 0.1f), Color.White.copy(alpha = 0.02f)))

// Onboarding Semantic Colors
val OnboardingBg = Color(0xFF04070D)
val OnboardingGlow = PrimaryRed.copy(alpha = 0.15f)

// Extension to parse hex strings safely
// Utility to parse hex strings safely
fun fromHex(hex: String?): Color {
    return try {
        Color(android.graphics.Color.parseColor(hex ?: "#E50914"))
    } catch (e: Exception) {
        PrimaryRed
    }
}
