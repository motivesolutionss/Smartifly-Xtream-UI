package com.smartifly.tv.player

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.media3.common.C
import androidx.tv.foundation.lazy.list.TvLazyColumn
import androidx.tv.foundation.lazy.list.items
import androidx.tv.material3.*
import com.smartifly.tv.ui.theme.Dimensions
import com.smartifly.tv.ui.theme.PrimaryRed
import com.smartifly.tv.ui.theme.TextPrimary
import com.smartifly.tv.ui.theme.TextSecondary
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import com.smartifly.tv.performance.lowend.DeviceTier
import com.smartifly.tv.performance.lowend.LocalPerformanceConfig
import com.smartifly.tv.ui.theme.SmartiflyIcons
import androidx.compose.material3.Icon
import androidx.compose.ui.text.font.FontWeight

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun PlayerSettingsOverlay(
    isVisible: Boolean,
    onClose: () -> Unit,
    trackSelectionManager: TrackSelectionManager?,
    modifier: Modifier = Modifier
) {
    val config = LocalPerformanceConfig.current
    var activeView by remember { mutableStateOf("Main") }

    if (isVisible) {
        BackHandler {
            if (activeView == "Main") {
                onClose()
            } else {
                activeView = "Main"
            }
        }
    }

    AnimatedVisibility(
        visible = isVisible,
        enter = slideInHorizontally(initialOffsetX = { it }),
        exit = slideOutHorizontally(targetOffsetX = { it }),
        modifier = modifier.fillMaxSize()
    ) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.CenterEnd) {
            // Glassmorphism / Fallback Background
            Box(
                modifier = Modifier
                    .fillMaxHeight()
                    .width(400.dp)
                    .then(
                        if (config.tier == DeviceTier.HIGH) {
                            Modifier.blur(20.dp).background(Color.Black.copy(alpha = 0.6f))
                        } else {
                            Modifier.background(Color.Black.copy(alpha = 0.95f))
                        }
                    )
                    .padding(Dimensions.PaddingExtraLarge)
            ) {
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        if (activeView != "Main") {
                            com.smartifly.tv.ui.components.base.AppIconButton(
                                onClick = { activeView = "Main" },
                                modifier = Modifier.size(32.dp)
                            ) {
                                Icon(SmartiflyIcons.Back, contentDescription = null, tint = Color.White)
                            }
                            Spacer(modifier = Modifier.width(Dimensions.PaddingMedium))
                        }
                        Text(
                            text = if (activeView == "Main") "Settings" else activeView,
                            style = MaterialTheme.typography.headlineMedium,
                            color = TextPrimary,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    
                    Spacer(modifier = Modifier.height(Dimensions.RowSpacing))

                    when (activeView) {
                        "Main" -> {
                            Column(verticalArrangement = Arrangement.spacedBy(Dimensions.PaddingMedium)) {
                                SettingsOption(
                                    title = "Subtitles", 
                                    icon = SmartiflyIcons.Subtitles,
                                    onClick = { activeView = "Subtitles" }
                                )
                                SettingsOption(
                                    title = "Audio Tracks", 
                                    icon = SmartiflyIcons.Audio,
                                    onClick = { activeView = "Audio" }
                                )
                                SettingsOption(
                                    title = "Quality", 
                                    icon = SmartiflyIcons.Quality,
                                    onClick = { activeView = "Quality" }
                                )
                            }
                        }
                        "Subtitles" -> {
                            val tracks = trackSelectionManager?.getSubtitleTracks() ?: emptyList()
                            SelectorView(
                                options = tracks,
                                onSelect = { 
                                    trackSelectionManager?.selectTrack(it, C.TRACK_TYPE_TEXT)
                                    activeView = "Main"
                                }
                            )
                        }
                        "Audio" -> {
                            val tracks = trackSelectionManager?.getAudioTracks() ?: emptyList()
                            SelectorView(
                                options = tracks,
                                onSelect = { 
                                    trackSelectionManager?.selectTrack(it, C.TRACK_TYPE_AUDIO)
                                    activeView = "Main"
                                }
                            )
                        }
                        "Quality" -> {
                            val tracks = trackSelectionManager?.getVideoTracks() ?: emptyList()
                            SelectorView(
                                options = tracks,
                                onSelect = { 
                                    trackSelectionManager?.selectTrack(it, C.TRACK_TYPE_VIDEO)
                                    activeView = "Main"
                                }
                            )
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun SettingsOption(
    title: String, 
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    onClick: () -> Unit
) {
    Surface(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        colors = ClickableSurfaceDefaults.colors(
            containerColor = Color.White.copy(alpha = 0.05f),
            focusedContainerColor = Color.White,
            focusedContentColor = Color.Black
        ),
        shape = ClickableSurfaceDefaults.shape(androidx.compose.foundation.shape.RoundedCornerShape(8.dp))
    ) {
        Row(
            modifier = Modifier.padding(Dimensions.PaddingMedium),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(icon, contentDescription = null, modifier = Modifier.size(24.dp))
            Spacer(modifier = Modifier.width(Dimensions.PaddingMedium))
            Text(text = title, style = MaterialTheme.typography.labelLarge)
            Spacer(modifier = Modifier.weight(1f))
            Icon(SmartiflyIcons.ChevronRight, contentDescription = null, modifier = Modifier.size(16.dp))
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun SelectorView(
    options: List<TrackInfo>,
    onSelect: (TrackInfo) -> Unit
) {
    TvLazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        items(options) { track ->
            Surface(
                onClick = { onSelect(track) },
                modifier = Modifier.fillMaxWidth(),
                colors = ClickableSurfaceDefaults.colors(
                    containerColor = if (track.isSelected) PrimaryRed.copy(alpha = 0.1f) else Color.Transparent,
                    focusedContainerColor = PrimaryRed,
                    focusedContentColor = Color.White
                ),
                shape = ClickableSurfaceDefaults.shape(androidx.compose.foundation.shape.RoundedCornerShape(8.dp))
            ) {
                Row(
                    modifier = Modifier.padding(Dimensions.PaddingMedium),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = track.label,
                        style = MaterialTheme.typography.labelLarge,
                        modifier = Modifier.weight(1f),
                        color = if (track.isSelected && !androidx.compose.ui.platform.LocalView.current.isFocused) PrimaryRed else Color.Unspecified
                    )
                    if (track.isSelected) {
                        Icon(SmartiflyIcons.Check, contentDescription = null, tint = if (androidx.compose.ui.platform.LocalView.current.isFocused) Color.White else PrimaryRed, modifier = Modifier.size(20.dp))
                    }
                }
            }
        }
    }
}
