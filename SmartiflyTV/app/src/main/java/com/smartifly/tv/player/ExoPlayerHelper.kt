package com.smartifly.tv.player

import android.content.Context
import androidx.annotation.OptIn
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.remember
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import com.smartifly.tv.data.remote.dto.StreamDto

@OptIn(UnstableApi::class)
@Composable
fun rememberExoPlayer(streamInfo: StreamDto): ExoPlayer {
    val context = androidx.compose.ui.platform.LocalContext.current
    
    val exoPlayer = remember(
        streamInfo.id,
        streamInfo.url,
        streamInfo.licenseUrl,
        streamInfo.drmType
    ) {
        ExoPlayer.Builder(context).build().apply {
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
        }
    }

    DisposableEffect(exoPlayer) {
        onDispose {
            exoPlayer.release()
        }
    }

    return exoPlayer
}
