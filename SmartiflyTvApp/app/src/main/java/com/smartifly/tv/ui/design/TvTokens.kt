package com.smartifly.tv.ui.design

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * Smartifly TV design tokens aligned with SmartiflyApp TV reference.
 */
object TvTokens {

    object Colors {
        val Primary = Color(0xFFE50914)
        val PrimaryDark = Color(0xFFB20710)
        val PrimaryLight = Color(0xFFFF1A1A)
        val Accent = Color(0xFFFFFFFF)
        val AccentCyan = Color(0xFF00E5FF)
        val AccentGold = Color(0xFFF5C518)
        val AccentRed = Color(0xFFE50914)
        val Tertiary = Color(0xFF46D369)

        val BackgroundStart = Color(0xFF040507)
        val BackgroundMid = Color(0xFF0B0F15)
        val BackgroundEnd = Color(0xFF141A23)
        val BackgroundElevated = Color(0xFF1C2531)
        val BackgroundInput = Color(0xFF222D3C)
        val Overlay = Color(0xDB020306)
        val OverlayLight = Color(0x9E06090E)

        val Surface = Color(0xFF0F151E)
        val SurfaceMuted = Color(0xFF1C2531)
        val SurfaceBorder = Color(0x29AABDD6)
        val SurfaceBorderStrong = Color(0x61AABDD6)

        val TextPrimary = Color(0xFFFFFFFF)
        val TextSecondary = Color(0xFFE7ECF4)
        val TextTertiary = Color(0xFFB6C0D1)
        val TextMuted = Color(0xFF8D9AAF)
        val TextDisabled = Color(0xFF5A6576)
        val TextInverse = Color(0xFF0C1118)
        val TextOnPrimary = Color(0xFFFFFFFF)

        val Success = Color(0xFF46D369)
        val SuccessBg = Color(0x2646D369)
        val Warning = Color(0xFFF5C518)
        val WarningBg = Color(0x26F5C518)
        val Error = Color(0xFFE50914)
        val ErrorBg = Color(0x26E50914)
        val Info = Color(0xFF3B82F6)
        val InfoBg = Color(0x263B82F6)

        val Live = Color(0xFFE50914)
        val LiveGlow = Color(0x66E50914)
        val Movies = Color(0xFF9333EA)
        val MoviesGlow = Color(0x669333EA)
        val Series = Color(0xFF0EA5E9)
        val SeriesGlow = Color(0x660EA5E9)
        val Sports = Color(0xFF46D369)
        val News = Color(0xFFF97316)
        val Kids = Color(0xFFEC4899)

        val Border = Color(0x29AABDD6)
        val BorderMedium = Color(0x42AABDD6)
        val BorderStrong = Color(0x61AABDD6)
        val BorderFocus = Color(0xFFFFFFFF)
        val FocusCyan = Color(0xFF00E5FF)
        val Divider = Color(0x1FB0C6E2)
        val Icon = Color(0xFFC6CFDB)
        val IconActive = Color(0xFFFFFFFF)
        val IconMuted = Color(0xFF8B97A8)
        val TabInactive = Color(0xFF8B97A8)
        val TabActive = Color(0xFFFFFFFF)
        val TabIndicator = Color(0xFFE50914)
        val Skeleton = Color(0x17B0C6E2)
        val SkeletonHighlight = Color(0x2EC6D6EB)

        val Glass = Color(0x1AAABDD6)
        val GlassMedium = Color(0x12AABDD6)
        val GlassDark = Color(0xCC070A10)

        val QualityUHD = Color(0xFFF5C518)
        val QualityHD = Color(0xFF46D369)
        val QualitySD = Color(0xFF8B97A8)

        val CardBackground = Color(0xFF0F151E)
        val Neon = Color(0xFFD9E4F2)
        val NeonGlow = Color(0x38C1D6F0)
    }

    object Spacing {
        val none = 0.dp
        val hairline = 4.dp
        val xxs = 8.dp
        val xs = 12.dp
        val sm = 16.dp
        val md = 20.dp
        val base = 24.dp
        val lg = 32.dp
        val xl = 40.dp
        val xxl = 48.dp
        val xxxl = 64.dp
        val xxxxl = 80.dp
    }

    object TvType {
        val DisplayLarge = TextStyle(
            fontSize = 56.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = (-0.6).sp,
            lineHeight = 62.sp
        )
        val DisplayMedium = TextStyle(
            fontSize = 48.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = (-0.5).sp,
            lineHeight = 54.sp
        )
        val DisplaySmall = TextStyle(
            fontSize = 40.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = (-0.4).sp,
            lineHeight = 46.sp
        )

        val H1 = TextStyle(
            fontSize = 36.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = (-0.3).sp,
            lineHeight = 42.sp
        )
        val H2 = TextStyle(
            fontSize = 32.sp,
            fontWeight = FontWeight.SemiBold,
            lineHeight = 38.sp
        )
        val H3 = TextStyle(
            fontSize = 28.sp,
            fontWeight = FontWeight.SemiBold,
            lineHeight = 34.sp
        )
        val H4 = TextStyle(
            fontSize = 24.sp,
            fontWeight = FontWeight.SemiBold,
            lineHeight = 30.sp
        )

        val BodyLarge = TextStyle(
            fontSize = 22.sp,
            fontWeight = FontWeight.Normal,
            lineHeight = 32.sp
        )
        val BodyMedium = TextStyle(
            fontSize = 20.sp,
            fontWeight = FontWeight.Normal,
            lineHeight = 30.sp
        )
        val BodySmall = TextStyle(
            fontSize = 18.sp,
            fontWeight = FontWeight.Normal,
            lineHeight = 24.sp
        )

        val LabelLarge = TextStyle(
            fontSize = 20.sp,
            fontWeight = FontWeight.SemiBold,
            letterSpacing = 0.5.sp,
            lineHeight = 22.sp
        )
        val LabelMedium = TextStyle(
            fontSize = 18.sp,
            fontWeight = FontWeight.Medium,
            letterSpacing = 0.5.sp,
            lineHeight = 20.sp
        )
        val LabelSmall = TextStyle(
            fontSize = 16.sp,
            fontWeight = FontWeight.Medium,
            letterSpacing = 0.4.sp,
            lineHeight = 18.sp
        )

        val Caption = TextStyle(
            fontSize = 16.sp,
            fontWeight = FontWeight.Normal,
            lineHeight = 22.sp
        )
        val CaptionSmall = TextStyle(
            fontSize = 14.sp,
            fontWeight = FontWeight.Normal,
            lineHeight = 20.sp
        )

        val Badge = TextStyle(
            fontSize = 14.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.sp,
            lineHeight = 15.sp
        )
        val Button = TextStyle(
            fontSize = 22.sp,
            fontWeight = FontWeight.SemiBold,
            letterSpacing = 0.5.sp,
            lineHeight = 24.sp
        )
        val ButtonSmall = TextStyle(
            fontSize = 18.sp,
            fontWeight = FontWeight.SemiBold,
            letterSpacing = 0.4.sp,
            lineHeight = 20.sp
        )
        val Logo = TextStyle(
            fontSize = 48.sp,
            fontWeight = FontWeight.ExtraBold,
            letterSpacing = 2.sp,
            lineHeight = 53.sp
        )
    }
}
