package com.smartifly.tv.data.repository

import com.smartifly.tv.data.SessionManager
import com.smartifly.tv.data.remote.dto.StreamDto

class StreamRepository(private val sessionManager: SessionManager) {
    private val liveExtensions = listOf("m3u8", "ts")
    private val movieExtensions = listOf("mp4", "mkv", "m3u8")
    private val seriesExtensions = listOf("mp4", "mkv", "m3u8")

    /**
     * Resolves the stream URL based on content type.
     * 
     * [type] can be "live", "movie", or "series".
     */
    suspend fun resolveStream(id: String, type: String): StreamDto {
        val creds = sessionManager.getXtreamCredentials() 
            ?: return StreamDto(id, "", type, "Unauthorized", "")
            
        val typeLower = type.lowercase()
        val candidates = when (typeLower) {
            "live" -> buildLiveCandidates(creds.baseUrl, creds.username, creds.password, id)
            "series" -> buildVodLikeCandidates("series", creds.baseUrl, creds.username, creds.password, id, seriesExtensions)
            else -> buildVodLikeCandidates("movie", creds.baseUrl, creds.username, creds.password, id, movieExtensions)
        }
        val primary = candidates.firstOrNull().orEmpty()
        val fallbacks = if (candidates.size > 1) candidates.drop(1) else emptyList()

        return StreamDto(
            id = id,
            url = primary,
            type = type,
            title = "Xtream $type Stream",
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
