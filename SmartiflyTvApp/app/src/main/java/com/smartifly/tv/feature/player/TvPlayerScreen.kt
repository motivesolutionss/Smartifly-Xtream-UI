package com.smartifly.tv.feature.player

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import com.smartifly.tv.domain.model.PlaybackSession
import com.smartifly.tv.domain.model.TvAppSettings
import com.smartifly.tv.ui.components.TvFocusButton
import com.smartifly.tv.ui.design.TvTokens
import com.smartifly.tv.ui.preview.PreviewFrame
import com.smartifly.tv.ui.preview.previewAppSettings
import com.smartifly.tv.ui.styling.TvStyles
import kotlinx.coroutines.delay

private val SPEED_OPTIONS = listOf(0.75f, 1.0f, 1.25f, 1.5f, 2.0f)
private val QUALITY_OPTIONS = listOf("Auto", "1080p", "720p", "480p")
private val ASPECT_OPTIONS = listOf("Fit", "Fill", "Zoom")
private const val AUTO_RETRY_LIMIT = 2
private const val RESUME_SEEK_TOLERANCE_MS = 3_000L

@Composable
fun TvPlayerScreen(
    playbackSession: PlaybackSession,
    initialSettings: TvAppSettings,
    onQualityChanged: (String) -> Unit,
    onSpeedChanged: (Float) -> Unit,
    onAudioChanged: (String) -> Unit,
    onSubtitleChanged: (String) -> Unit,
    onAspectChanged: (String) -> Unit,
    onMutedChanged: (Boolean) -> Unit,
    onStatsChanged: (Boolean) -> Unit,
    onProgressSaved: (Long, Long) -> Unit,
    onPlaybackCompleted: () -> Unit,
    onExit: () -> Unit,
) {
    val context = LocalContext.current
    var isPlaying by remember { mutableStateOf(true) }
    var durationMs by remember { mutableLongStateOf(0L) }
    var positionMs by remember { mutableLongStateOf(0L) }
    var settingsOpen by remember { mutableStateOf(false) }
    var showStats by remember { mutableStateOf(initialSettings.showPlayerStats) }
    var isMuted by remember { mutableStateOf(initialSettings.defaultMuted) }
    var playbackSpeed by remember { mutableStateOf(initialSettings.defaultPlaybackSpeed) }
    var selectedQuality by remember { mutableStateOf(initialSettings.defaultQuality) }
    var selectedAudio by remember { mutableStateOf(initialSettings.preferredAudioLanguage) }
    var selectedSubtitle by remember { mutableStateOf(initialSettings.preferredSubtitleLanguage) }
    var selectedAspect by remember { mutableStateOf(initialSettings.aspectMode) }
    var audioLanguages by remember { mutableStateOf(emptyList<String>()) }
    var subtitleLanguages by remember { mutableStateOf(emptyList<String>()) }
    var isBuffering by remember { mutableStateOf(false) }
    var playbackErrorMessage by remember { mutableStateOf<String?>(null) }
    var retryCount by remember { mutableStateOf(0) }
    var pendingResumePositionMs by remember(playbackSession.streamUrl) {
        mutableLongStateOf(playbackSession.resumePositionMs.coerceAtLeast(0L))
    }
    val seekBackFocusRequester = remember { FocusRequester() }
    val playPauseFocusRequester = remember { FocusRequester() }
    val seekForwardFocusRequester = remember { FocusRequester() }
    val settingsButtonFocusRequester = remember { FocusRequester() }
    val exitButtonFocusRequester = remember { FocusRequester() }
    val settingsPanelEntryFocusRequester = remember { FocusRequester() }

    val player = remember(playbackSession.streamUrl) {
        ExoPlayer.Builder(context).build().apply {
            setMediaItem(MediaItem.fromUri(playbackSession.streamUrl))
            playWhenReady = true
            volume = if (initialSettings.defaultMuted) 0f else 1f
            setPlaybackSpeed(initialSettings.defaultPlaybackSpeed)
            prepare()
        }
    }

    val retryPlayback: (String?) -> Unit = remember(player, playbackSession.streamUrl) {
        { message ->
            val targetPosition = player.currentPosition
                .coerceAtLeast(positionMs)
                .takeIf { it > 0L }
                ?: pendingResumePositionMs
            pendingResumePositionMs = targetPosition.coerceAtLeast(0L)
            playbackErrorMessage = message
            isBuffering = true
            player.stop()
            player.setMediaItem(MediaItem.fromUri(playbackSession.streamUrl))
            player.prepare()
            player.playWhenReady = true
        }
    }

    BackHandler {
        if (settingsOpen) {
            settingsOpen = false
        } else {
            onExit()
        }
    }

    DisposableEffect(player) {
        val listener = object : Player.Listener {
            override fun onIsPlayingChanged(playing: Boolean) {
                isPlaying = playing
            }

            override fun onPlayerError(error: PlaybackException) {
                if (retryCount < AUTO_RETRY_LIMIT) {
                    retryCount += 1
                    retryPlayback("Playback interrupted. Reconnecting...")
                } else {
                    playbackErrorMessage = "Unable to play this stream. Retry or exit."
                    isBuffering = false
                }
            }

            override fun onPlaybackStateChanged(playbackState: Int) {
                isBuffering = playbackState == Player.STATE_BUFFERING
                if (playbackState == Player.STATE_ENDED) {
                    playbackErrorMessage = null
                    onPlaybackCompleted()
                } else if (playbackState == Player.STATE_READY) {
                    playbackErrorMessage = null
                    retryCount = 0
                    val pendingResume = pendingResumePositionMs
                    if (
                        pendingResume > 0L &&
                        kotlin.math.abs(player.currentPosition - pendingResume) > RESUME_SEEK_TOLERANCE_MS
                    ) {
                        player.seekTo(pendingResume)
                    }
                    pendingResumePositionMs = 0L
                }
            }

            override fun onEvents(player: Player, events: Player.Events) {
                durationMs = player.duration.coerceAtLeast(0L)
                positionMs = player.currentPosition.coerceAtLeast(0L)
                audioLanguages = extractLanguages(player, C.TRACK_TYPE_AUDIO)
                subtitleLanguages = extractLanguages(player, C.TRACK_TYPE_TEXT)
            }
        }
        player.addListener(listener)
        onDispose {
            if (playbackSession.historyId != null && playbackSession.type != "live") {
                onProgressSaved(
                    player.currentPosition.coerceAtLeast(0L),
                    player.duration.coerceAtLeast(0L),
                )
            }
            player.removeListener(listener)
            player.release()
        }
    }

    LaunchedEffect(player, playbackSession.historyId, playbackSession.type) {
        if (playbackSession.historyId == null || playbackSession.type == "live") return@LaunchedEffect
        while (true) {
            delay(5_000L)
            onProgressSaved(
                player.currentPosition.coerceAtLeast(0L),
                player.duration.coerceAtLeast(0L),
            )
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        AndroidView(
            modifier = Modifier.fillMaxSize(),
            factory = { ctx ->
                PlayerView(ctx).apply {
                    this.player = player
                    useController = false
                    resizeMode = aspectLabelToResizeMode(selectedAspect)
                }
            },
            update = { view ->
                view.player = player
                view.useController = false
                view.resizeMode = aspectLabelToResizeMode(selectedAspect)
            }
        )

        Column(
            modifier = Modifier
                .fillMaxWidth(0.66f)
                .align(Alignment.TopStart)
                .padding(start = 18.dp, top = 16.dp)
                .background(TvStyles.frostedPanel, RoundedCornerShape(22.dp))
                .border(1.dp, TvTokens.Colors.BorderStrong.copy(alpha = 0.26f), RoundedCornerShape(22.dp))
                .padding(horizontal = 22.dp, vertical = 18.dp)
        ) {
            Text(
                text = playbackSession.title,
                style = MaterialTheme.typography.titleLarge,
                color = TvTokens.Colors.TextPrimary
            )
            Text(
                text = "${formatTime(positionMs)} / ${formatTime(durationMs)}",
                style = MaterialTheme.typography.labelLarge,
                color = TvTokens.Colors.TextSecondary
            )
        }

        if (showStats) {
            Column(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(top = 96.dp, end = 18.dp)
                    .background(TvStyles.frostedPanelSoft, RoundedCornerShape(18.dp))
                    .border(1.dp, TvTokens.Colors.BorderStrong.copy(alpha = 0.24f), RoundedCornerShape(18.dp))
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text("Playback HUD", color = TvTokens.Colors.TextPrimary, style = MaterialTheme.typography.titleMedium)
                PlayerStatRow("Speed", "${playbackSpeed}x")
                PlayerStatRow("Quality", selectedQuality)
                PlayerStatRow("Audio", selectedAudio)
                PlayerStatRow("Subs", selectedSubtitle)
                PlayerStatRow("Aspect", selectedAspect)
            }
        }

        if (isBuffering || playbackErrorMessage != null) {
            Box(
                modifier = Modifier
                    .align(Alignment.Center)
                    .background(
                        TvStyles.frostedPanelSoft,
                        RoundedCornerShape(22.dp)
                    )
                    .border(1.dp, TvTokens.Colors.BorderStrong.copy(alpha = 0.28f), RoundedCornerShape(22.dp))
                    .padding(horizontal = 28.dp, vertical = 24.dp)
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(
                        text = playbackErrorMessage ?: "Buffering stream...",
                        style = MaterialTheme.typography.titleMedium,
                        color = TvTokens.Colors.TextPrimary
                    )
                    if (playbackErrorMessage != null) {
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            TvFocusButton(
                                text = "Retry",
                                primary = true,
                                onClick = {
                                    playbackErrorMessage = "Retrying stream..."
                                    retryPlayback(playbackErrorMessage)
                                }
                            )
                            TvFocusButton(
                                text = "Exit",
                                onClick = onExit
                            )
                        }
                    } else if (retryCount > 0) {
                        Text(
                            text = "Reconnect attempt $retryCount of $AUTO_RETRY_LIMIT",
                            style = MaterialTheme.typography.labelLarge,
                            color = TvTokens.Colors.TextSecondary
                        )
                    }
                }
            }
        }

        Row(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 24.dp)
                .background(TvStyles.frostedPanel, RoundedCornerShape(18.dp))
                .border(1.dp, TvTokens.Colors.BorderStrong.copy(alpha = 0.26f), RoundedCornerShape(18.dp))
                .padding(horizontal = 18.dp, vertical = 14.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            TvFocusButton(
                text = "-10s",
                focusRequester = seekBackFocusRequester,
                rightFocusRequester = playPauseFocusRequester,
                requestInitialFocus = true,
                onClick = {
                    val target = (player.currentPosition - 10_000).coerceAtLeast(0L)
                    player.seekTo(target)
                }
            )
            TvFocusButton(
                text = if (isPlaying) "Pause" else "Play",
                focusRequester = playPauseFocusRequester,
                leftFocusRequester = seekBackFocusRequester,
                rightFocusRequester = seekForwardFocusRequester,
                onClick = {
                    if (player.isPlaying) player.pause() else player.play()
                }
            )
            TvFocusButton(
                text = "+10s",
                focusRequester = seekForwardFocusRequester,
                leftFocusRequester = playPauseFocusRequester,
                rightFocusRequester = settingsButtonFocusRequester,
                onClick = {
                    val max = if (player.duration == C.TIME_UNSET) player.currentPosition + 10_000 else player.duration
                    val target = (player.currentPosition + 10_000).coerceAtMost(max)
                    player.seekTo(target)
                }
            )
            TvFocusButton(
                text = if (settingsOpen) "Close Settings" else "Settings",
                focusRequester = settingsButtonFocusRequester,
                leftFocusRequester = seekForwardFocusRequester,
                rightFocusRequester = exitButtonFocusRequester,
                onClick = { settingsOpen = !settingsOpen }
            )
            TvFocusButton(
                text = "Exit",
                focusRequester = exitButtonFocusRequester,
                leftFocusRequester = settingsButtonFocusRequester,
                onClick = onExit
            )
        }

        if (settingsOpen) {
            PlayerSettingsPanel(
                modifier = Modifier
                    .align(Alignment.CenterEnd)
                    .padding(end = 18.dp),
                selectedQuality = selectedQuality,
                selectedAudio = selectedAudio,
                selectedSubtitle = selectedSubtitle,
                selectedAspect = selectedAspect,
                playbackSpeed = playbackSpeed,
                isMuted = isMuted,
                showStats = showStats,
                entryFocusRequester = settingsPanelEntryFocusRequester,
                leftFocusRequester = settingsButtonFocusRequester,
                onToggleStats = {
                    val next = !showStats
                    showStats = next
                    onStatsChanged(next)
                },
                onToggleMute = {
                    val next = !isMuted
                    isMuted = next
                    player.volume = if (next) 0f else 1f
                    onMutedChanged(next)
                },
                onCycleSpeed = {
                    val next = cycleValue(playbackSpeed, SPEED_OPTIONS)
                    playbackSpeed = next
                    player.setPlaybackSpeed(next)
                    onSpeedChanged(next)
                },
                onCycleQuality = {
                    val next = cycleValue(selectedQuality, QUALITY_OPTIONS)
                    selectedQuality = next
                    applyQuality(player, next)
                    onQualityChanged(next)
                },
                onCycleAspect = {
                    val next = cycleValue(selectedAspect, ASPECT_OPTIONS)
                    selectedAspect = next
                    onAspectChanged(next)
                },
                onCycleAudio = {
                    val options = listOf("System") + audioLanguages
                    val next = cycleValue(selectedAudio, options)
                    selectedAudio = next
                    applyAudio(player, next)
                    onAudioChanged(next)
                },
                onCycleSubtitle = {
                    val options = listOf("Off") + subtitleLanguages
                    val next = cycleValue(selectedSubtitle, options)
                    selectedSubtitle = next
                    applySubtitle(player, next)
                    onSubtitleChanged(next)
                },
                onClose = { settingsOpen = false }
            )
        }
    }
}

@Composable
private fun PlayerSettingsPanel(
    modifier: Modifier = Modifier,
    selectedQuality: String,
    selectedAudio: String,
    selectedSubtitle: String,
    selectedAspect: String,
    playbackSpeed: Float,
    isMuted: Boolean,
    showStats: Boolean,
    entryFocusRequester: FocusRequester,
    leftFocusRequester: FocusRequester,
    onToggleStats: () -> Unit,
    onToggleMute: () -> Unit,
    onCycleSpeed: () -> Unit,
    onCycleQuality: () -> Unit,
    onCycleAspect: () -> Unit,
    onCycleAudio: () -> Unit,
    onCycleSubtitle: () -> Unit,
    onClose: () -> Unit,
) {
    Column(
        modifier = modifier
            .width(340.dp)
            .background(TvStyles.frostedPanel, RoundedCornerShape(20.dp))
            .border(1.dp, TvTokens.Colors.BorderStrong.copy(alpha = 0.28f), RoundedCornerShape(20.dp))
            .padding(horizontal = 16.dp, vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Text(
            text = "Player Settings",
            style = MaterialTheme.typography.titleMedium,
            color = TvTokens.Colors.TextPrimary
        )
        TvFocusButton(
            text = "Speed: ${playbackSpeed}x",
            requestInitialFocus = true,
            focusRequester = entryFocusRequester,
            leftFocusRequester = leftFocusRequester,
            onClick = onCycleSpeed
        )
        TvFocusButton(text = "Quality: $selectedQuality", onClick = onCycleQuality)
        TvFocusButton(text = "Audio: $selectedAudio", onClick = onCycleAudio)
        TvFocusButton(text = "Subtitles: $selectedSubtitle", onClick = onCycleSubtitle)
        TvFocusButton(text = "Aspect: $selectedAspect", onClick = onCycleAspect)
        TvFocusButton(text = if (isMuted) "Unmute" else "Mute", onClick = onToggleMute)
        TvFocusButton(text = if (showStats) "Hide Stats" else "Show Stats", onClick = onToggleStats)
        TvFocusButton(text = "Done", onClick = onClose)
    }
}

@Composable
private fun PlayerStatRow(
    label: String,
    value: String,
) {
    Row(
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.fillMaxWidth()
    ) {
        Text(label, color = TvTokens.Colors.TextMuted, style = MaterialTheme.typography.labelLarge)
        Spacer(modifier = Modifier.width(18.dp))
        Text(value, color = TvTokens.Colors.TextSecondary, style = MaterialTheme.typography.labelLarge)
    }
}

private fun applyQuality(player: ExoPlayer, quality: String) {
    val builder = player.trackSelectionParameters.buildUpon()
    when (quality) {
        "1080p" -> builder.setMaxVideoSize(1920, 1080)
        "720p" -> builder.setMaxVideoSize(1280, 720)
        "480p" -> builder.setMaxVideoSize(854, 480)
        else -> builder.setMaxVideoSize(Int.MAX_VALUE, Int.MAX_VALUE)
    }
    player.trackSelectionParameters = builder.build()
}

private fun applyAudio(player: ExoPlayer, selectedAudio: String) {
    val builder = player.trackSelectionParameters.buildUpon()
        .setTrackTypeDisabled(C.TRACK_TYPE_AUDIO, false)
    if (selectedAudio == "System") {
        builder.setPreferredAudioLanguage(null as String?)
    } else {
        builder.setPreferredAudioLanguage(selectedAudio)
    }
    player.trackSelectionParameters = builder.build()
}

private fun applySubtitle(player: ExoPlayer, selectedSubtitle: String) {
    val builder = player.trackSelectionParameters.buildUpon()
    if (selectedSubtitle == "Off") {
        builder
            .setTrackTypeDisabled(C.TRACK_TYPE_TEXT, true)
            .setPreferredTextLanguage(null as String?)
    } else {
        builder
            .setTrackTypeDisabled(C.TRACK_TYPE_TEXT, false)
            .setPreferredTextLanguage(selectedSubtitle)
    }
    player.trackSelectionParameters = builder.build()
}

private fun aspectLabelToResizeMode(label: String): Int {
    return when (label) {
        "Fill" -> AspectRatioFrameLayout.RESIZE_MODE_FILL
        "Zoom" -> AspectRatioFrameLayout.RESIZE_MODE_ZOOM
        else -> AspectRatioFrameLayout.RESIZE_MODE_FIT
    }
}

private fun extractLanguages(player: Player, trackType: Int): List<String> {
    val languages = linkedSetOf<String>()
    val tracks = player.currentTracks
    for (group in tracks.groups) {
        if (group.type != trackType) continue
        val mediaTrackGroup = group.mediaTrackGroup
        for (i in 0 until mediaTrackGroup.length) {
            val language = mediaTrackGroup.getFormat(i).language
            if (!language.isNullOrBlank()) {
                languages.add(language)
            }
        }
    }
    return languages.toList()
}

private fun <T> cycleValue(current: T, options: List<T>): T {
    if (options.isEmpty()) return current
    val currentIndex = options.indexOf(current).takeIf { it >= 0 } ?: 0
    val nextIndex = (currentIndex + 1) % options.size
    return options[nextIndex]
}

private fun formatTime(ms: Long): String {
    if (ms <= 0L) return "00:00"
    val totalSeconds = ms / 1000
    val hours = totalSeconds / 3600
    val minutes = (totalSeconds % 3600) / 60
    val seconds = totalSeconds % 60
    return if (hours > 0) {
        String.format("%d:%02d:%02d", hours, minutes, seconds)
    } else {
        String.format("%02d:%02d", minutes, seconds)
    }
}

@Preview(showBackground = true, widthDp = 960, heightDp = 540)
@Composable
private fun PlayerSettingsPanelPreview() {
    val entryFocusRequester = remember { FocusRequester() }
    val leftFocusRequester = remember { FocusRequester() }

    PreviewFrame {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.CenterEnd) {
            PlayerSettingsPanel(
                modifier = Modifier.padding(end = 24.dp),
                selectedQuality = previewAppSettings.defaultQuality,
                selectedAudio = previewAppSettings.preferredAudioLanguage,
                selectedSubtitle = previewAppSettings.preferredSubtitleLanguage,
                selectedAspect = previewAppSettings.aspectMode,
                playbackSpeed = previewAppSettings.defaultPlaybackSpeed,
                isMuted = previewAppSettings.defaultMuted,
                showStats = previewAppSettings.showPlayerStats,
                entryFocusRequester = entryFocusRequester,
                leftFocusRequester = leftFocusRequester,
                onToggleStats = {},
                onToggleMute = {},
                onCycleSpeed = {},
                onCycleQuality = {},
                onCycleAspect = {},
                onCycleAudio = {},
                onCycleSubtitle = {},
                onClose = {}
            )
        }
    }
}
