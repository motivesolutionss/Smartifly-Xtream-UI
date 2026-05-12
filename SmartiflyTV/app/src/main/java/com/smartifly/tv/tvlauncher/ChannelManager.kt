package com.smartifly.tv.tvlauncher

import android.content.Context
import android.graphics.BitmapFactory
import android.net.Uri
import androidx.tvprovider.media.tv.Channel
import androidx.tvprovider.media.tv.ChannelLogoUtils
import androidx.tvprovider.media.tv.PreviewProgram
import androidx.tvprovider.media.tv.TvContractCompat
import androidx.tvprovider.media.tv.WatchNextProgram
import com.smartifly.tv.R
import com.smartifly.tv.data.models.MovieMetadata

class ChannelManager(private val context: Context) {

    companion object {
        private const val CHANNEL_NAME = "Smartifly Trending"
        private const val CHANNEL_ID_PREF = "launcher_channel_id"
    }

    private val prefs = context.getSharedPreferences("launcher_prefs", Context.MODE_PRIVATE)

    /**
     * Ensures the Smartifly channel exists on the Home Screen.
     */
    fun createOrUpdateChannel() {
        val channelId = prefs.getLong(CHANNEL_ID_PREF, -1L)
        
        val channel = Channel.Builder()
            .setType(TvContractCompat.Channels.TYPE_PREVIEW)
            .setDisplayName(CHANNEL_NAME)
            .setAppLinkIntentUri(Uri.parse("smartifly://home"))
            .build()

        if (channelId == -1L) {
            // Create new channel
            val uri = context.contentResolver.insert(TvContractCompat.Channels.CONTENT_URI, channel.toContentValues())
            val newId = uri?.lastPathSegment?.toLong() ?: -1L
            if (newId != -1L) {
                prefs.edit().putLong(CHANNEL_ID_PREF, newId).apply()
                // Set logo
                val bitmap = BitmapFactory.decodeResource(context.resources, R.drawable.app_banner)
                ChannelLogoUtils.storeChannelLogo(context, newId, bitmap)
            }
        } else {
            // Update existing channel
            context.contentResolver.update(
                TvContractCompat.buildChannelUri(channelId),
                channel.toContentValues(),
                null, null
            )
        }
    }

    /**
     * Updates the custom channel with a list of trending movies.
     */
    fun updatePrograms(movies: List<MovieMetadata>) {
        val channelId = prefs.getLong(CHANNEL_ID_PREF, -1L)
        if (channelId == -1L) return

        // Delete old programs
        context.contentResolver.delete(
            TvContractCompat.buildPreviewProgramsUriForChannel(channelId),
            null, null
        )

        // Add new programs
        movies.take(10).forEach { movie ->
            val program = PreviewProgram.Builder()
                .setChannelId(channelId)
                .setTitle(movie.title)
                .setDescription(movie.description)
                .setPosterArtUri(Uri.parse(movie.posterUrl))
                .setIntentUri(Uri.parse("smartifly://video/${movie.id}?type=${movie.type}"))
                .setType(TvContractCompat.PreviewPrograms.TYPE_MOVIE)
                .build()

            context.contentResolver.insert(
                TvContractCompat.PreviewPrograms.CONTENT_URI,
                program.toContentValues()
            )
        }
    }

    /**
     * Adds or updates a program in the system "Watch Next" row.
     */
    fun updateWatchNext(movie: MovieMetadata, positionMs: Long, durationMs: Long) {
        // Delete any existing watch next entries for this content
        context.contentResolver.delete(
            TvContractCompat.WatchNextPrograms.CONTENT_URI,
            "${TvContractCompat.WatchNextPrograms.COLUMN_INTERNAL_PROVIDER_ID} = ?",
            arrayOf(movie.id)
        )

        val program = WatchNextProgram.Builder()
            .setType(TvContractCompat.WatchNextPrograms.TYPE_MOVIE)
            .setWatchNextType(TvContractCompat.WatchNextPrograms.WATCH_NEXT_TYPE_CONTINUE)
            .setLastEngagementTimeUtcMillis(System.currentTimeMillis())
            .setLastPlaybackPositionMillis(positionMs.toInt())
            .setDurationMillis(durationMs.toInt())
            .setTitle(movie.title)
            .setDescription(movie.description)
            .setPosterArtUri(Uri.parse(movie.posterUrl))
            .setIntentUri(Uri.parse("smartifly://video/${movie.id}?type=${movie.type}"))
            .setInternalProviderId(movie.id)
            .build()

        context.contentResolver.insert(
            TvContractCompat.WatchNextPrograms.CONTENT_URI,
            program.toContentValues()
        )
    }
}
