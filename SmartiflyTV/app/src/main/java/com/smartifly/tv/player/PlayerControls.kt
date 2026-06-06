package com.smartifly.tv.player

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusProperties
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.tv.material3.Button
import androidx.tv.material3.ButtonDefaults
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.Text
import com.smartifly.tv.ui.theme.Dimensions
import com.smartifly.tv.ui.theme.PrimaryRed
import com.smartifly.tv.ui.theme.TextPrimary
import com.smartifly.tv.ui.theme.TextSecondary
import com.smartifly.tv.ui.theme.SmartiflyIcons
import com.smartifly.tv.ui.components.base.AppIconButton
import java.util.Locale

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun PlayerControls(
    isVisible: Boolean,
    title: String,
    isPlaying: Boolean,
    onPlayPause: () -> Unit,
    onSeekForward: (() -> Unit)?,
    onSeekBackward: (() -> Unit)?,
    onPreviousLive: (() -> Unit)? = null,
    onNextLive: (() -> Unit)? = null,
    onBack: () -> Unit,
    onSettingsClick: () -> Unit,
    showFavoriteToggle: Boolean = false,
    isFavorite: Boolean = false,
    onFavoriteToggle: (() -> Unit)? = null,
    progress: Float,
    currentTimeMs: Long,
    durationMs: Long,
    isScrubbing: Boolean,
    scrubTargetMs: Long,
    onScrubStart: () -> Unit,
    onScrubUpdate: (Long) -> Unit,
    onScrubCommit: (Long) -> Unit,
    onScrubCancel: () -> Unit,
    badges: List<String> = emptyList(),
    modifier: Modifier = Modifier
) {
    val isLive = durationMs <= 0L
    
    val backFocusRequester = remember { FocusRequester() }
    val favoriteFocusRequester = remember { FocusRequester() }
    val settingsFocusRequester = remember { FocusRequester() }
    val seekBarFocusRequester = remember { FocusRequester() }
    val playPauseFocusRequester = remember { FocusRequester() }
    val prevFocusRequester = remember { FocusRequester() }
    val nextFocusRequester = remember { FocusRequester() }

    LaunchedEffect(isVisible) {
        if (isVisible) {
            try {
                playPauseFocusRequester.requestFocus()
            } catch (e: Exception) {}
        }
    }

    AnimatedVisibility(
        visible = isVisible,
        enter = fadeIn(),
        exit = fadeOut(),
        modifier = modifier.fillMaxSize()
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        listOf(
                            Color.Black.copy(alpha = 0.85f),
                            Color.Transparent,
                            Color.Transparent,
                            Color.Black.copy(alpha = 0.95f)
                        )
                    )
                )
        ) {
            // --- TOP BAR ---
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 32.dp, vertical = 24.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Back Button
                AppIconButton(
                    onClick = onBack,
                    modifier = Modifier
                        .focusRequester(backFocusRequester)
                        .focusProperties {
                            down = if (isLive) playPauseFocusRequester else seekBarFocusRequester
                            right = if (showFavoriteToggle) favoriteFocusRequester else settingsFocusRequester
                        }
                ) {
                    Icon(SmartiflyIcons.Back, contentDescription = "Back", tint = Color.White)
                }

                Spacer(modifier = Modifier.width(16.dp))

                // Title and Badges
                Column(modifier = Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = title,
                            style = MaterialTheme.typography.headlineMedium,
                            color = TextPrimary,
                            fontWeight = FontWeight.Bold
                        )
                        if (isLive) {
                            Spacer(modifier = Modifier.width(12.dp))
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier
                                    .background(PrimaryRed, androidx.compose.foundation.shape.RoundedCornerShape(4.dp))
                                    .padding(horizontal = 8.dp, vertical = 2.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(6.dp)
                                        .background(Color.White, androidx.compose.foundation.shape.CircleShape)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = "LIVE",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = Color.White,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }

                    // Metadata badges (VOD only)
                    if (!isLive) {
                        val allowedBadges = listOf("4K", "HDR", "Dolby Atmos", "5.1")
                        val verifiedBadges = badges.filter { it in allowedBadges }
                        if (verifiedBadges.isNotEmpty()) {
                            Spacer(modifier = Modifier.height(6.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                verifiedBadges.forEach { badge ->
                                    Box(
                                        modifier = Modifier
                                            .border(1.dp, Color.Gray.copy(alpha = 0.6f), androidx.compose.foundation.shape.RoundedCornerShape(4.dp))
                                            .padding(horizontal = 6.dp, vertical = 2.dp)
                                    ) {
                                        Text(
                                            text = badge,
                                            style = MaterialTheme.typography.labelSmall,
                                            color = Color.LightGray,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                // Right actions (Favorites, Settings)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (showFavoriteToggle && onFavoriteToggle != null) {
                        AppIconButton(
                            onClick = onFavoriteToggle,
                            modifier = Modifier
                                .focusRequester(favoriteFocusRequester)
                                .focusProperties {
                                    left = backFocusRequester
                                    right = settingsFocusRequester
                                    down = playPauseFocusRequester
                                }
                        ) {
                            Icon(
                                SmartiflyIcons.Star,
                                contentDescription = "Favorite",
                                tint = if (isFavorite) PrimaryRed else Color.White
                            )
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                    }

                    AppIconButton(
                        onClick = onSettingsClick,
                        modifier = Modifier
                            .focusRequester(settingsFocusRequester)
                            .focusProperties {
                                left = if (showFavoriteToggle) favoriteFocusRequester else backFocusRequester
                                down = if (isLive) playPauseFocusRequester else seekBarFocusRequester
                            }
                    ) {
                        Icon(SmartiflyIcons.Settings, contentDescription = "Settings", tint = Color.White)
                    }
                }
            }

            // --- CENTER TRANSPORT CONTROLS ---
            Row(
                modifier = Modifier
                    .align(Alignment.Center)
                    .offset(y = 36.dp),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (!isLive) {
                    // Left action (Backward seek / Prev Channel)
                    val leadingAction = if (isLive) onPreviousLive else onSeekBackward
                    Box(modifier = Modifier.width(96.dp), contentAlignment = Alignment.Center) {
                        if (leadingAction != null) {
                            AppIconButton(
                                onClick = leadingAction,
                                modifier = Modifier
                                    .focusRequester(prevFocusRequester)
                                    .focusProperties {
                                        up = backFocusRequester
                                        right = playPauseFocusRequester
                                        down = if (isLive) FocusRequester.Default else seekBarFocusRequester
                                    }
                            ) {
                                Icon(
                                    if (isLive) SmartiflyIcons.SkipPrevious else SmartiflyIcons.FastRewind,
                                    contentDescription = if (isLive) "Previous Channel" else "-10s",
                                    modifier = Modifier.size(Dimensions.PlayerIconSizeMedium),
                                    tint = Color.White
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.width(24.dp))
                }

                // Play / Pause Button (Large center action)
                Button(
                    onClick = onPlayPause,
                    modifier = Modifier
                        .size(Dimensions.PlayerControlSizeLarge)
                        .focusRequester(playPauseFocusRequester)
                        .focusProperties {
                            up = backFocusRequester
                            left = if (onSeekBackward != null && !isLive) prevFocusRequester else FocusRequester.Default
                            right = if (onSeekForward != null && !isLive) nextFocusRequester else FocusRequester.Default
                            down = if (isLive) FocusRequester.Default else seekBarFocusRequester
                        }
                        .onKeyEvent { keyEvent ->
                            if (isLive && keyEvent.type == KeyEventType.KeyDown) {
                                when (keyEvent.key) {
                                    Key.DirectionLeft -> {
                                        onPreviousLive?.invoke()
                                        true
                                    }
                                    Key.DirectionRight -> {
                                        onNextLive?.invoke()
                                        true
                                    }
                                    else -> false
                                }
                            } else {
                                false
                            }
                        },
                    colors = ButtonDefaults.colors(
                        containerColor = PrimaryRed,
                        focusedContainerColor = Color.White,
                        focusedContentColor = Color.Black
                    )
                ) {
                    Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                        Icon(
                            if (isPlaying) SmartiflyIcons.Pause else SmartiflyIcons.Play,
                            contentDescription = "Play/Pause",
                            modifier = Modifier.size(Dimensions.PlayerIconSizeLarge)
                        )
                    }
                }

                if (!isLive) {
                    Spacer(modifier = Modifier.width(24.dp))

                    // Right action (Forward seek / Next Channel)
                    val trailingAction = if (isLive) onNextLive else onSeekForward
                    Box(modifier = Modifier.width(96.dp), contentAlignment = Alignment.Center) {
                        if (trailingAction != null) {
                            AppIconButton(
                                onClick = trailingAction,
                                modifier = Modifier
                                    .focusRequester(nextFocusRequester)
                                    .focusProperties {
                                        up = backFocusRequester
                                        left = playPauseFocusRequester
                                        down = if (isLive) FocusRequester.Default else seekBarFocusRequester
                                    }
                            ) {
                                Icon(
                                    if (isLive) SmartiflyIcons.SkipNext else SmartiflyIcons.FastForward,
                                    contentDescription = if (isLive) "Next Channel" else "+10s",
                                    modifier = Modifier.size(Dimensions.PlayerIconSizeMedium),
                                    tint = Color.White
                                )
                            }
                        }
                    }
                }
            }

            // --- BOTTOM SEEK AREA ---
            if (!isLive) {
                Column(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .fillMaxWidth()
                        .padding(horizontal = 32.dp, vertical = 32.dp)
                ) {
                    PlayerSeekBar(
                        currentTimeMs = currentTimeMs,
                        durationMs = durationMs,
                        isScrubbing = isScrubbing,
                        scrubTargetMs = scrubTargetMs,
                        onScrubStart = onScrubStart,
                        onScrubUpdate = onScrubUpdate,
                        onScrubCommit = onScrubCommit,
                        onScrubCancel = onScrubCancel,
                        focusRequester = seekBarFocusRequester,
                        modifier = Modifier
                            .focusProperties {
                                up = playPauseFocusRequester
                            },
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun PlayerSeekBar(
    currentTimeMs: Long,
    durationMs: Long,
    isScrubbing: Boolean,
    scrubTargetMs: Long,
    onScrubStart: () -> Unit,
    onScrubUpdate: (Long) -> Unit,
    onScrubCommit: (Long) -> Unit,
    onScrubCancel: () -> Unit,
    focusRequester: FocusRequester,
    modifier: Modifier = Modifier
) {
    var isFocused by remember { mutableStateOf(false) }

    val displayTimeMs = if (isScrubbing) scrubTargetMs else currentTimeMs
    val progress = if (durationMs > 0) displayTimeMs.toFloat() / durationMs.toFloat() else 0f

    val trackHeight by androidx.compose.animation.core.animateDpAsState(
        targetValue = if (isFocused) 6.dp else 4.dp,
        animationSpec = androidx.compose.animation.core.spring(),
        label = "trackHeight"
    )
    val thumbSize by androidx.compose.animation.core.animateDpAsState(
        targetValue = if (isScrubbing) 16.dp else 12.dp,
        animationSpec = androidx.compose.animation.core.spring(),
        label = "thumbSize"
    )

    Box(
        modifier = modifier
            .focusRequester(focusRequester)
            .onFocusChanged { isFocused = it.isFocused }
            .focusable()
            .onKeyEvent { keyEvent ->
                if (keyEvent.type == KeyEventType.KeyDown) {
                    when (keyEvent.key) {
                        Key.DirectionLeft -> {
                            if (!isScrubbing) {
                                onScrubStart()
                                onScrubUpdate((currentTimeMs - 10000L).coerceAtLeast(0L))
                            } else {
                                onScrubUpdate((scrubTargetMs - 10000L).coerceAtLeast(0L))
                            }
                            true
                        }
                        Key.DirectionRight -> {
                            if (!isScrubbing) {
                                onScrubStart()
                                onScrubUpdate((currentTimeMs + 10000L).coerceAtMost(durationMs))
                            } else {
                                onScrubUpdate((scrubTargetMs + 10000L).coerceAtMost(durationMs))
                            }
                            true
                        }
                        Key.DirectionCenter, Key.Enter, Key.NumPadEnter -> {
                            if (isScrubbing) {
                                onScrubCommit(scrubTargetMs)
                            }
                            true
                        }
                        Key.Back -> {
                            if (isScrubbing) {
                                onScrubCancel()
                                true
                            } else {
                                false
                            }
                        }
                        else -> false
                    }
                } else {
                    false
                }
            }
            .fillMaxWidth()
            .padding(vertical = 12.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            // Preview Bubble above thumb
            androidx.compose.animation.AnimatedVisibility(
                visible = isFocused && isScrubbing,
                enter = fadeIn(),
                exit = fadeOut(),
                modifier = Modifier.align(Alignment.CenterHorizontally)
            ) {
                Box(
                    modifier = Modifier
                        .background(Color.Black.copy(alpha = 0.85f), androidx.compose.foundation.shape.RoundedCornerShape(6.dp))
                        .border(1.dp, Color.Gray.copy(alpha = 0.5f), androidx.compose.foundation.shape.RoundedCornerShape(6.dp))
                        .padding(horizontal = 10.dp, vertical = 6.dp)
                ) {
                    Text(
                        text = formatTime(displayTimeMs),
                        color = Color.White,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = formatTime(displayTimeMs),
                    color = if (isFocused) Color.White else TextSecondary,
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = if (isFocused) FontWeight.Bold else FontWeight.Normal
                )

                Spacer(modifier = Modifier.width(16.dp))

                Box(
                    modifier = Modifier
                        .weight(1f)
                        .height(24.dp),
                    contentAlignment = Alignment.CenterStart
                ) {
                    // Background track
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(trackHeight)
                            .clip(androidx.compose.foundation.shape.CircleShape)
                            .background(Color.White.copy(alpha = 0.2f))
                    )

                    // Filled track
                    Box(
                        modifier = Modifier
                            .fillMaxWidth(progress)
                            .height(trackHeight)
                            .clip(androidx.compose.foundation.shape.CircleShape)
                            .background(PrimaryRed)
                    )

                    // Thumb
                    if (isFocused) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth(progress)
                                .height(24.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(thumbSize)
                                    .clip(androidx.compose.foundation.shape.CircleShape)
                                    .background(PrimaryRed)
                                    .align(Alignment.CenterEnd)
                                    .border(2.dp, Color.White, androidx.compose.foundation.shape.CircleShape)
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.width(16.dp))

                Text(
                    text = formatTime(durationMs),
                    color = if (isFocused) Color.White else TextSecondary,
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = if (isFocused) FontWeight.Bold else FontWeight.Normal
                )
            }
        }
    }
}

private fun formatTime(ms: Long): String {
    val totalSeconds = ms / 1000
    val minutes = totalSeconds / 60
    val seconds = totalSeconds % 60
    return String.format(Locale.getDefault(), "%02d:%02d", minutes, seconds)
}
