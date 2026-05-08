package com.smartifly.tv.feature.home.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.LiveTv
import androidx.compose.material.icons.filled.Movie
import androidx.compose.material.icons.filled.Newspaper
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.VideoLibrary
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusProperties
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalInspectionMode
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.lerp
import com.smartifly.tv.feature.home.HomeTab
import com.smartifly.tv.ui.design.TvTokens
import com.smartifly.tv.ui.preview.PreviewFrame
import com.smartifly.tv.ui.styling.TvStyles
import kotlinx.coroutines.delay

private data class SidebarEntry(
    val key: String,
    val label: String,
    val icon: ImageVector,
    val tab: HomeTab? = null,
)

private data class SidebarMetrics(
    val outerVerticalPadding: Dp,
    val shellTopPadding: Dp,
    val shellBottomPadding: Dp,
    val shellInnerHorizontalPadding: Dp,
    val menuGap: Dp,
    val dividerVerticalPadding: Dp,
    val dividerWidthFraction: Float,
    val itemHeight: Dp,
    val profileItemHeight: Dp,
    val rowStartInset: Dp,
    val rowEndInset: Dp,
    val focusedRowStartInset: Dp,
    val focusedRowEndInset: Dp,
    val itemHorizontalPadding: Dp,
    val iconLaneWidth: Dp,
    val iconBoxSize: Dp,
    val iconColumnStart: Dp,
    val labelMaxWidth: Dp,
    val activeIndicatorWidth: Dp,
    val activeIndicatorHeight: Dp,
    val activeIndicatorStart: Dp,
    val activeHaloSize: Dp,
    val activeHaloStart: Dp,
)

private const val PROFILE_KEY = "profile"
private const val SETTINGS_KEY = "settings"
private const val SIDEBAR_BASE_HEIGHT_DP = 740f
private val SidebarShape = RoundedCornerShape(48.dp)
private val SidebarInnerShape = RoundedCornerShape(44.dp)

@Composable
fun HomeSidebar(
    activeTab: HomeTab,
    activeTabFocusRequester: FocusRequester,
    contentFocusRequester: FocusRequester,
    onTabSelected: (HomeTab) -> Unit,
    onRefresh: () -> Unit,
    onSwitchProfile: () -> Unit,
    onSwitchAccount: () -> Unit,
    onLogout: () -> Unit,
) {
    val menuEntries = listOf(
        SidebarEntry("search", "Search", Icons.Default.Search, HomeTab.SEARCH),
        SidebarEntry("home", "Home", Icons.Default.Home, HomeTab.HOME),
        SidebarEntry("live", "Live TV", Icons.Default.LiveTv, HomeTab.LIVE),
        SidebarEntry("movies", "Movies", Icons.Default.Movie, HomeTab.MOVIES),
        SidebarEntry("series", "Series", Icons.Default.VideoLibrary, HomeTab.SERIES),
        SidebarEntry("announcements", "News", Icons.Default.Newspaper, HomeTab.ANNOUNCEMENTS),
        SidebarEntry("favorites", "My List", Icons.Default.Favorite, HomeTab.FAVORITES),
        SidebarEntry("downloads", "Downloads", Icons.Default.Download, HomeTab.DOWNLOADS),
    )

    val profileRequester = remember { FocusRequester() }
    val searchRequester = if (activeTab == HomeTab.SEARCH) activeTabFocusRequester else remember { FocusRequester() }
    val homeRequester = if (activeTab == HomeTab.HOME) activeTabFocusRequester else remember { FocusRequester() }
    val liveRequester = if (activeTab == HomeTab.LIVE) activeTabFocusRequester else remember { FocusRequester() }
    val moviesRequester = if (activeTab == HomeTab.MOVIES) activeTabFocusRequester else remember { FocusRequester() }
    val seriesRequester = if (activeTab == HomeTab.SERIES) activeTabFocusRequester else remember { FocusRequester() }
    val announcementsRequester = if (activeTab == HomeTab.ANNOUNCEMENTS) activeTabFocusRequester else remember { FocusRequester() }
    val favoritesRequester = if (activeTab == HomeTab.FAVORITES) activeTabFocusRequester else remember { FocusRequester() }
    val downloadsRequester = if (activeTab == HomeTab.DOWNLOADS) activeTabFocusRequester else remember { FocusRequester() }
    val settingsRequester = if (activeTab == HomeTab.SETTINGS) activeTabFocusRequester else remember { FocusRequester() }

    val requesterMap = mapOf(
        "search" to searchRequester,
        "home" to homeRequester,
        "live" to liveRequester,
        "movies" to moviesRequester,
        "series" to seriesRequester,
        "announcements" to announcementsRequester,
        "favorites" to favoritesRequester,
        "downloads" to downloadsRequester,
    )

    var sidebarFocused by remember { mutableStateOf(false) }
    var focusedEntryKey by remember { mutableStateOf<String?>(null) }
    var collapseGeneration by remember { mutableIntStateOf(0) }
    val expandProgress by animateFloatAsState(
        targetValue = if (sidebarFocused) 1f else 0f,
        animationSpec = spring(dampingRatio = 0.86f, stiffness = 260f),
        label = "sidebarExpandProgress"
    )

    fun onEntryFocusChanged(entryKey: String, focused: Boolean) {
        if (focused) {
            collapseGeneration += 1
            sidebarFocused = true
            focusedEntryKey = entryKey
            return
        }

        if (focusedEntryKey == entryKey) {
            focusedEntryKey = null
        }

        val snapshot = collapseGeneration + 1
        collapseGeneration = snapshot
    }

    BoxWithConstraints(
        modifier = Modifier.fillMaxHeight()
    ) {
        val metrics = remember(maxHeight) { sidebarMetrics(maxHeight) }
        val sidebarWidth = lerp(72.dp, 210.dp, expandProgress)
        val shellAlpha = 0.82f + (0.10f * expandProgress)
        val shellHeight = (maxHeight - (metrics.outerVerticalPadding * 2)).coerceAtLeast(440.dp)

        LaunchedEffect(collapseGeneration, focusedEntryKey) {
            if (focusedEntryKey != null) return@LaunchedEffect
            val snapshot = collapseGeneration
            delay(90)
            if (snapshot == collapseGeneration && focusedEntryKey == null) {
                sidebarFocused = false
            }
        }

        Box(
            modifier = Modifier
                .fillMaxHeight()
                .padding(vertical = metrics.outerVerticalPadding),
            contentAlignment = Alignment.Center
        ) {
            Surface(
                modifier = Modifier
                    .width(sidebarWidth)
                    .height(shellHeight)
                    .shadow(
                        elevation = 28.dp,
                        shape = SidebarShape,
                        ambientColor = TvTokens.Colors.BackgroundEnd.copy(alpha = 0.55f),
                        spotColor = TvTokens.Colors.BackgroundEnd.copy(alpha = 0.55f)
                    ),
                color = Color.Transparent,
                shadowElevation = 0.dp
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(shellHeight)
                        .background(
                            TvStyles.sidebarShell,
                            SidebarShape
                        )
                        .border(
                            width = 1.5.dp,
                            color = TvTokens.Colors.BorderStrong.copy(alpha = 0.36f + (0.10f * expandProgress)),
                            shape = SidebarShape
                        )
                        .alpha(shellAlpha)
                ) {
                    Box(
                        modifier = Modifier
                            .matchParentSize()
                            .padding(1.5.dp)
                            .border(
                                width = 0.8.dp,
                                color = TvTokens.Colors.FocusCyan.copy(alpha = 0.12f),
                                shape = RoundedCornerShape(46.5.dp)
                            )
                    )
                    Box(
                        modifier = Modifier
                            .matchParentSize()
                            .padding(4.dp)
                            .background(
                                brush = Brush.verticalGradient(
                                    colors = listOf(
                                        Color.White.copy(alpha = 0.04f),
                                        Color.White.copy(alpha = 0.015f)
                                    )
                                ),
                                shape = SidebarInnerShape
                            )
                            .border(
                                width = 1.dp,
                                color = TvTokens.Colors.Border.copy(alpha = 0.2f),
                                shape = SidebarInnerShape
                            )
                    )

                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(shellHeight)
                            .padding(horizontal = metrics.shellInnerHorizontalPadding)
                            .padding(top = metrics.shellTopPadding, bottom = metrics.shellBottomPadding),
                        horizontalAlignment = Alignment.Start
                    ) {
                        SidebarMenuItem(
                            label = "Profile",
                            icon = Icons.Default.AccountCircle,
                            isActive = false,
                            isFocused = focusedEntryKey == PROFILE_KEY,
                            expandProgress = expandProgress,
                            metrics = metrics,
                            itemHeight = metrics.profileItemHeight,
                            focusRequester = profileRequester,
                            requestInitialFocus = false,
                            upRequester = profileRequester,
                            downRequester = searchRequester,
                            rightRequester = contentFocusRequester,
                            onFocusChanged = { focused ->
                                onEntryFocusChanged(PROFILE_KEY, focused)
                            },
                            onClick = onSwitchProfile
                        )

                        SidebarDivider(metrics = metrics)

                        Column(
                            modifier = Modifier.weight(1f),
                            verticalArrangement = Arrangement.Center
                        ) {
                            menuEntries.forEachIndexed { index, entry ->
                                val requester = requesterMap.getValue(entry.key)
                                val upRequester = if (index == 0) profileRequester else requesterMap.getValue(menuEntries[index - 1].key)
                                val downRequester = if (index == menuEntries.lastIndex) settingsRequester else requesterMap.getValue(menuEntries[index + 1].key)

                                SidebarMenuItem(
                                    label = entry.label,
                                    icon = entry.icon,
                                    isActive = activeTab == entry.tab,
                                    isFocused = focusedEntryKey == entry.key,
                                    expandProgress = expandProgress,
                                    metrics = metrics,
                                    itemHeight = metrics.itemHeight,
                                    focusRequester = requester,
                                    requestInitialFocus = activeTab == entry.tab,
                                    upRequester = upRequester,
                                    downRequester = downRequester,
                                    rightRequester = contentFocusRequester,
                                    onFocusChanged = { focused ->
                                        onEntryFocusChanged(entry.key, focused)
                                    },
                                    onClick = {
                                        if (entry.tab != null && activeTab != entry.tab) {
                                            onTabSelected(entry.tab)
                                        }
                                    }
                                )

                                if (index != menuEntries.lastIndex) {
                                    Spacer(modifier = Modifier.height(metrics.menuGap))
                                }
                            }
                        }

                        SidebarDivider(metrics = metrics)

                        SidebarMenuItem(
                            label = "Settings",
                            icon = Icons.Default.Settings,
                            isActive = activeTab == HomeTab.SETTINGS,
                            isFocused = focusedEntryKey == SETTINGS_KEY,
                            expandProgress = expandProgress,
                            metrics = metrics,
                            itemHeight = metrics.itemHeight,
                            focusRequester = settingsRequester,
                            requestInitialFocus = activeTab == HomeTab.SETTINGS,
                            upRequester = downloadsRequester,
                            downRequester = settingsRequester,
                            rightRequester = contentFocusRequester,
                            onFocusChanged = { focused ->
                                onEntryFocusChanged(SETTINGS_KEY, focused)
                            },
                            onClick = {
                                if (activeTab != HomeTab.SETTINGS) {
                                    onTabSelected(HomeTab.SETTINGS)
                                }
                            }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun SidebarMenuItem(
    label: String,
    icon: ImageVector,
    isActive: Boolean,
    isFocused: Boolean,
    expandProgress: Float,
    metrics: SidebarMetrics,
    itemHeight: Dp,
    focusRequester: FocusRequester,
    requestInitialFocus: Boolean,
    upRequester: FocusRequester,
    downRequester: FocusRequester,
    rightRequester: FocusRequester,
    onFocusChanged: (Boolean) -> Unit,
    onClick: () -> Unit,
) {
    var didRequestFocus by remember { mutableStateOf(false) }
    val isInPreview = LocalInspectionMode.current
    val labelRevealProgress = ((expandProgress - 0.72f) / 0.28f).coerceIn(0f, 1f)
    val itemScale by animateFloatAsState(
        targetValue = if (isFocused) 1.06f else 1f,
        animationSpec = spring(dampingRatio = 0.9f, stiffness = 320f),
        label = "sidebarItemScale"
    )

    LaunchedEffect(requestInitialFocus) {
        if (requestInitialFocus && !didRequestFocus && !isInPreview) {
            focusRequester.requestFocus()
            didRequestFocus = true
        }
    }

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(
                start = if (isFocused) metrics.focusedRowStartInset else metrics.rowStartInset,
                end = if (isFocused) metrics.focusedRowEndInset else metrics.rowEndInset
            )
            .height(itemHeight)
            .scale(itemScale)
            .background(
                brush = when {
                    isFocused -> Brush.horizontalGradient(
                        colors = listOf(
                            TvTokens.Colors.FocusCyan.copy(alpha = 0.16f),
                            Color.White.copy(alpha = 0.12f)
                        )
                    )
                    isActive -> Brush.horizontalGradient(
                        colors = listOf(
                            TvTokens.Colors.Primary.copy(alpha = 0.16f),
                            Color.Transparent
                        )
                    )
                    else -> Brush.horizontalGradient(
                        colors = listOf(Color.Transparent, Color.Transparent)
                    )
                },
                shape = RoundedCornerShape(itemHeight / 2)
            )
            .border(
                width = 1.dp,
                color = when {
                    isFocused -> TvTokens.Colors.FocusCyan.copy(alpha = 0.44f)
                    isActive -> TvTokens.Colors.Primary.copy(alpha = 0.28f)
                    else -> Color.Transparent
                },
                shape = RoundedCornerShape(itemHeight / 2)
            )
            .focusRequester(focusRequester)
            .focusProperties {
                left = focusRequester
                right = rightRequester
                up = upRequester
                down = downRequester
            }
            .onFocusChanged { onFocusChanged(it.isFocused) }
            .focusable()
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onClick
            )
    ) {
        if (isActive) {
            Box(
                modifier = Modifier
                    .align(Alignment.CenterStart)
                    .padding(start = metrics.activeIndicatorStart)
                    .width(metrics.activeIndicatorWidth)
                    .height(metrics.activeIndicatorHeight)
                    .background(TvTokens.Colors.Primary, RoundedCornerShape(3.dp))
            )
            Box(
                modifier = Modifier
                    .align(Alignment.CenterStart)
                    .padding(start = metrics.activeHaloStart)
                    .size(metrics.activeHaloSize)
                    .background(
                        Brush.radialGradient(
                            colors = listOf(
                                TvTokens.Colors.Primary.copy(alpha = 0.28f),
                                Color.Transparent
                            )
                        ),
                        RoundedCornerShape(999.dp)
                    )
            )
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = metrics.itemHorizontalPadding, end = 18.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .width(metrics.iconLaneWidth)
                    .height(itemHeight),
                contentAlignment = Alignment.Center
            ) {
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .width(metrics.iconBoxSize * 0.78f)
                    .height(if (isActive || isFocused) 3.dp else 0.dp)
                    .background(
                        color = when {
                            isFocused -> TvTokens.Colors.FocusCyan
                            isActive -> TvTokens.Colors.Primary
                            else -> Color.Transparent
                        },
                        shape = RoundedCornerShape(3.dp)
                    )
                )
                Icon(
                    imageVector = icon,
                    contentDescription = label,
                    tint = when {
                        isFocused -> TvTokens.Colors.FocusCyan
                        isActive -> TvTokens.Colors.Primary
                        else -> TvTokens.Colors.TextMuted
                    },
                    modifier = Modifier.size(metrics.iconBoxSize)
                )
            }

            Box(
                modifier = Modifier
                    .padding(start = lerp(0.dp, 22.dp, labelRevealProgress))
                    .width(lerp(0.dp, metrics.labelMaxWidth, labelRevealProgress))
                    .alpha(labelRevealProgress),
                contentAlignment = Alignment.CenterStart
            ) {
                Text(
                    text = label,
                    color = when {
                        isFocused -> TvTokens.Colors.TextPrimary
                        isActive -> TvTokens.Colors.Primary
                        else -> TvTokens.Colors.TextSecondary.copy(alpha = 0.86f)
                    },
                    style = TvTokens.TvType.LabelLarge,
                    fontWeight = if (isFocused) FontWeight.Bold else FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

@Composable
private fun SidebarDivider(
    metrics: SidebarMetrics,
) {
    Box(
        modifier = Modifier
            .padding(
                start = metrics.rowStartInset + metrics.itemHorizontalPadding + metrics.iconColumnStart,
                end = metrics.rowEndInset + 18.dp
            )
            .padding(vertical = metrics.dividerVerticalPadding)
            .fillMaxWidth(metrics.dividerWidthFraction)
            .height(1.dp)
            .background(
                Brush.horizontalGradient(
                    colors = listOf(
                        Color.Transparent,
                        TvTokens.Colors.BorderStrong.copy(alpha = 0.44f),
                        Color.Transparent
                    )
                )
            )
    )
}

private fun sidebarMetrics(maxHeight: Dp): SidebarMetrics {
    val scale = (maxHeight.value / SIDEBAR_BASE_HEIGHT_DP).coerceIn(0.70f, 1f)

    fun scaled(value: Dp, min: Dp): Dp = (value * scale).coerceAtLeast(min)

    return SidebarMetrics(
        outerVerticalPadding = scaled(16.dp, 8.dp),
        shellTopPadding = scaled(10.dp, 8.dp),
        shellBottomPadding = scaled(10.dp, 8.dp),
        shellInnerHorizontalPadding = scaled(10.dp, 6.dp),
        menuGap = scaled(3.dp, 1.dp),
        dividerVerticalPadding = scaled(7.dp, 4.dp),
        dividerWidthFraction = 0.66f,
        itemHeight = scaled(42.dp, 36.dp),
        profileItemHeight = scaled(50.dp, 40.dp),
        rowStartInset = scaled(8.dp, 6.dp),
        rowEndInset = scaled(8.dp, 6.dp),
        focusedRowStartInset = scaled(10.dp, 8.dp),
        focusedRowEndInset = scaled(10.dp, 8.dp),
        itemHorizontalPadding = scaled(20.dp, 16.dp),
        iconLaneWidth = scaled(30.dp, 26.dp),
        iconBoxSize = scaled(20.dp, 18.dp),
        iconColumnStart = scaled(0.dp, 0.dp),
        labelMaxWidth = scaled(104.dp, 92.dp),
        activeIndicatorWidth = scaled(5.dp, 4.dp),
        activeIndicatorHeight = scaled(24.dp, 18.dp),
        activeIndicatorStart = scaled(8.dp, 6.dp),
        activeHaloSize = scaled(40.dp, 34.dp),
        activeHaloStart = scaled(18.dp, 14.dp),
    )
}

@Preview(showBackground = true, widthDp = 960, heightDp = 540)
@Composable
private fun HomeSidebarPreview() {
    val activeTabFocusRequester = remember { FocusRequester() }
    val contentFocusRequester = remember { FocusRequester() }

    PreviewFrame(padded = false) {
        Surface(color = Color.Transparent) {
            HomeSidebar(
                activeTab = HomeTab.HOME,
                activeTabFocusRequester = activeTabFocusRequester,
                contentFocusRequester = contentFocusRequester,
                onTabSelected = {},
                onRefresh = {},
                onSwitchProfile = {},
                onSwitchAccount = {},
                onLogout = {}
            )
        }
    }
}
