package com.smartifly.tv.data.repository

import com.smartifly.tv.data.SessionManager
import com.smartifly.tv.data.models.PlaybackRequest
import com.smartifly.tv.data.remote.dto.StreamDto

class StreamRepository(private val sessionManager: SessionManager) {
    class StreamResolutionException(message: String) : IllegalStateException(message)

    private val liveExtensions = listOf("ts", "m3u8")
    private val movieExtensions = listOf("mp4", "mkv", "m3u8")
    private val seriesExtensions = listOf("mp4", "mkv", "m3u8")

    /**
     * Resolves the stream URL based on content type.
     * 
     * [type] can be "live", "movie", or "series".
     */
    suspend fun resolveStream(request: PlaybackRequest): StreamDto {
        val creds = sessionManager.getXtreamCredentials() 
            ?: throw StreamResolutionException("Session expired. Please sign in again.")
            
        val typeLower = request.type.lowercase()
        val candidates = when (typeLower) {
            "live" -> buildLiveCandidates(creds.baseUrl, creds.username, creds.password, request.id)
            "series" -> buildVodLikeCandidates("series", creds.baseUrl, creds.username, creds.password, request.id, seriesExtensions)
            else -> buildVodLikeCandidates("movie", creds.baseUrl, creds.username, creds.password, request.id, movieExtensions)
        }
        val primary = candidates.firstOrNull().orEmpty()
        val fallbacks = if (candidates.size > 1) candidates.drop(1) else emptyList()

        if (primary.isBlank()) {
            throw StreamResolutionException("Unable to resolve playback URL for this content.")
        }

        return StreamDto(
            id = request.id,
            url = primary,
            type = request.type,
            title = request.title,
            backdropUrl = "",
            fallbackUrls = fallbacks
        )
    }

    private fun buildLiveCandidates(baseUrl: String, username: String, password: String, streamId: String): List<String> {
        val root = baseUrl.trimEnd('/')
        val user = encodePathSegment(username)
        val pass = encodePathSegment(password)
        val id = encodePathSegment(streamId)
        return liveExtensions.map { ext -> "$root/live/$user/$pass/$id.$ext" }
    }

    private fun buildVodLikeCandidates(
        typePath: String,
        baseUrl: String,
        username: String,
        password: String,
        streamId: String,
        extensions: List<String>
    ): List<String> {
        val root = baseUrl.trimEnd('/')
        val user = encodePathSegment(username)
        val pass = encodePathSegment(password)
        val id = encodePathSegment(streamId)
        return extensions.map { ext -> "$root/$typePath/$user/$pass/$id.$ext" }
    }

    private fun encodePathSegment(value: String): String {
        return java.net.URLEncoder.encode(value, Charsets.UTF_8.name()).replace("+", "%20")
    }
}
