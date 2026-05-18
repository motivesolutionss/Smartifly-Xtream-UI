package com.smartifly.tv.tvlauncher

import android.content.Context
import android.content.ContentValues
import android.graphics.BitmapFactory
import android.net.Uri
import androidx.tvprovider.media.tv.Channel
import androidx.tvprovider.media.tv.ChannelLogoUtils
import androidx.tvprovider.media.tv.TvContractCompat
import com.smartifly.tv.R
import com.smartifly.tv.data.models.MovieMetadata

class ChannelManager(private val context: Context) {

    companion object {
        private const val CHANNEL_NAME = "Smartifly Trending"
        private const val CHANNEL_ID_PREF = "launcher_channel_id"
        private const val TYPE_MOVIE = 0
        private const val WATCH_NEXT_TYPE_CONTINUE = 0
        private const val COLUMN_INTERNAL_PROVIDER_ID = "internal_provider_id"
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
            val programValues = ContentValues().apply {
                put("channel_id", channelId)
                put("title", movie.title)
                put("description", movie.description)
                put("poster_art_uri", movie.posterUrl)
                put("intent_uri", "smartifly://video/${movie.id}?type=${movie.type}")
                put("type", TYPE_MOVIE)
            }

            context.contentResolver.insert(
                TvContractCompat.PreviewPrograms.CONTENT_URI,
                programValues
            )
        }
    }

    /**
     * Adds or updates a program in the system "Watch Next" row.
     */
    fun updateWatchNext(movie: MovieMetadata, positionMs: Long, durationMs: Long) {
        val resolver = context.contentResolver
        try {
            // Delete any existing watch next entries for this content
            resolver.delete(
                TvContractCompat.WatchNextPrograms.CONTENT_URI,
                "$COLUMN_INTERNAL_PROVIDER_ID = ?",
                arrayOf(movie.id)
            )
        } catch (se: SecurityException) {
            android.util.Log.w("SmartiflyLauncher", "Watch Next delete blocked by provider policy: ${se.message}")
            return
        } catch (t: Throwable) {
            android.util.Log.w("SmartiflyLauncher", "Watch Next delete failed: ${t.message}")
            return
        }

        val programValues = ContentValues().apply {
            put("type", TYPE_MOVIE)
            put("watch_next_type", WATCH_NEXT_TYPE_CONTINUE)
            put("last_engagement_time_utc_millis", System.currentTimeMillis())
            put("last_playback_position_millis", positionMs.toInt())
            put("duration_millis", durationMs.toInt())
            put("title", movie.title)
            put("description", movie.description)
            put("poster_art_uri", movie.posterUrl)
            put("intent_uri", "smartifly://video/${movie.id}?type=${movie.type}")
            put(COLUMN_INTERNAL_PROVIDER_ID, movie.id)
        }

        try {
            resolver.insert(
                TvContractCompat.WatchNextPrograms.CONTENT_URI,
                programValues
            )
        } catch (se: SecurityException) {
            android.util.Log.w("SmartiflyLauncher", "Watch Next insert blocked by provider policy: ${se.message}")
        } catch (t: Throwable) {
            android.util.Log.w("SmartiflyLauncher", "Watch Next insert failed: ${t.message}")
        }
    }
}
