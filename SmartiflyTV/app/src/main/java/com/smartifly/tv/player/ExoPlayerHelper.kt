package com.smartifly.tv.player

import android.content.Context
import androidx.annotation.OptIn
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.remember
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.ExoPlayer
import com.smartifly.tv.data.remote.dto.StreamDto

@OptIn(UnstableApi::class)
@Composable
fun rememberExoPlayer(
    streamInfo: StreamDto,
    isLive: Boolean,
    playerSessionKey: Int
): ExoPlayer {
    val context = androidx.compose.ui.platform.LocalContext.current
    
    val exoPlayer = remember(
        playerSessionKey,
        streamInfo.id,
        streamInfo.url,
        streamInfo.licenseUrl,
        streamInfo.drmType,
        isLive
    ) {
        val loadControl = DefaultLoadControl.Builder()
            .setBufferDurationsMs(
                if (isLive) 25_000 else 15_000,
                if (isLive) 60_000 else 50_000,
                if (isLive) 3_000 else 2_500,
                if (isLive) 10_000 else 5_000
            )
            .build()

        ExoPlayer.Builder(context)
            .setLoadControl(loadControl)
            .build().apply {
            val mediaItemBuilder = MediaItem.Builder()
                .setUri(streamInfo.url)
                .setMediaId(streamInfo.id)

            // DRM Configuration
            if (streamInfo.drmType == "WIDEVINE" && streamInfo.licenseUrl != null) {
                mediaItemBuilder.setDrmConfiguration(
                    MediaItem.DrmConfiguration.Builder(C.WIDEVINE_UUID)
                        .setLicenseUri(streamInfo.licenseUrl)
                        .setLicenseRequestHeaders(streamInfo.licenseHeaders ?: emptyMap())
                        .build()
                )
            }

            setMediaItem(mediaItemBuilder.build())
            prepare()
            playWhenReady = true
            if (isLive) {
                repeatMode = ExoPlayer.REPEAT_MODE_ONE
            }
        }
    }

    DisposableEffect(exoPlayer) {
        onDispose {
            exoPlayer.release()
        }
    }

    return exoPlayer
}
