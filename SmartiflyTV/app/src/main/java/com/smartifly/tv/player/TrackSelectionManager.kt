package com.smartifly.tv.player

import androidx.annotation.OptIn
import androidx.media3.common.C
import androidx.media3.common.Player
import androidx.media3.common.TrackGroup
import androidx.media3.common.Tracks
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer

data class TrackInfo(
    val id: String,
    val label: String,
    val isSelected: Boolean,
    val groupIndex: Int,
    val trackIndex: Int
)

@OptIn(UnstableApi::class)
class TrackSelectionManager(private val player: ExoPlayer) {

    fun getSubtitleTracks(): List<TrackInfo> {
        val tracks = player.currentTracks
        val subtitleTracks = mutableListOf<TrackInfo>()
        
        // Add "Off" option
        subtitleTracks.add(TrackInfo("off", "Off", !hasSelectedTextTrack(tracks), -1, -1))

        tracks.groups.forEachIndexed { groupIndex, group ->
            if (group.type == C.TRACK_TYPE_TEXT) {
                for (i in 0 until group.length) {
                    val format = group.getTrackFormat(i)
                    subtitleTracks.add(
                        TrackInfo(
                            id = format.id ?: "${groupIndex}_$i",
                            label = format.label ?: format.language ?: "Unknown",
                            isSelected = group.isTrackSelected(i),
                            groupIndex = groupIndex,
                            trackIndex = i
                        )
                    )
                }
            }
        }
        return subtitleTracks
    }

    fun getAudioTracks(): List<TrackInfo> {
        val tracks = player.currentTracks
        val audioTracks = mutableListOf<TrackInfo>()
        
        tracks.groups.forEachIndexed { groupIndex, group ->
            if (group.type == C.TRACK_TYPE_AUDIO) {
                for (i in 0 until group.length) {
                    val format = group.getTrackFormat(i)
                    audioTracks.add(
                        TrackInfo(
                            id = format.id ?: "${groupIndex}_$i",
                            label = "${format.label ?: format.language ?: "Unknown"} (${format.channelCount}ch)",
                            isSelected = group.isTrackSelected(i),
                            groupIndex = groupIndex,
                            trackIndex = i
                        )
                    )
                }
            }
        }
        return audioTracks
    }

    fun getVideoTracks(): List<TrackInfo> {
        val tracks = player.currentTracks
        val videoTracks = mutableListOf<TrackInfo>()
        
        // Add "Auto" option
        videoTracks.add(TrackInfo("auto", "Auto", player.trackSelectionParameters.maxVideoWidth == Int.MAX_VALUE, -1, -1))

        tracks.groups.forEachIndexed { groupIndex, group ->
            if (group.type == C.TRACK_TYPE_VIDEO) {
                for (i in 0 until group.length) {
                    val format = group.getTrackFormat(i)
                    videoTracks.add(
                        TrackInfo(
                            id = format.id ?: "${groupIndex}_$i",
                            label = "${format.height}p",
                            isSelected = group.isTrackSelected(i),
                            groupIndex = groupIndex,
                            trackIndex = i
                        )
                    )
                }
            }
        }
        return videoTracks.sortedByDescending { it.label.filter { c -> c.isDigit() }.toIntOrNull() ?: 0 }
    }

    fun selectTrack(track: TrackInfo, type: Int) {
        val parametersBuilder = player.trackSelectionParameters.buildUpon()
        
        when (type) {
            C.TRACK_TYPE_TEXT -> {
                if (track.id == "off") {
                    parametersBuilder.setTrackTypeDisabled(C.TRACK_TYPE_TEXT, true)
                } else {
                    parametersBuilder.setTrackTypeDisabled(C.TRACK_TYPE_TEXT, false)
                    val group = player.currentTracks.groups[track.groupIndex]
                    parametersBuilder.setOverrideForType(
                        androidx.media3.common.TrackSelectionOverride(group.mediaTrackGroup, track.trackIndex)
                    )
                }
            }
            C.TRACK_TYPE_AUDIO -> {
                val group = player.currentTracks.groups[track.groupIndex]
                parametersBuilder.setOverrideForType(
                    androidx.media3.common.TrackSelectionOverride(group.mediaTrackGroup, track.trackIndex)
                )
            }
            C.TRACK_TYPE_VIDEO -> {
                if (track.id == "auto") {
                    parametersBuilder.setMaxVideoSizeSd() // Reset to auto
                    parametersBuilder.clearOverridesOfType(C.TRACK_TYPE_VIDEO)
                } else {
                    val group = player.currentTracks.groups[track.groupIndex]
                    parametersBuilder.setOverrideForType(
                        androidx.media3.common.TrackSelectionOverride(group.mediaTrackGroup, track.trackIndex)
                    )
                }
            }
        }
        
        player.trackSelectionParameters = parametersBuilder.build()
    }

    private fun hasSelectedTextTrack(tracks: Tracks): Boolean {
        return tracks.groups.any { it.type == C.TRACK_TYPE_TEXT && it.isSelected }
    }
}
