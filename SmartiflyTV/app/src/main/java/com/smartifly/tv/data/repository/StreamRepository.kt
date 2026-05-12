package com.smartifly.tv.data.repository

import com.smartifly.tv.data.SessionManager
import com.smartifly.tv.data.remote.dto.StreamDto

class StreamRepository(private val sessionManager: SessionManager) {
    private val liveExtensions = listOf("ts", "m3u8")

    /**
     * Resolves the stream URL based on content type.
     * 
     * [type] can be "live", "movie", or "series".
     */
    suspend fun resolveStream(id: String, type: String): StreamDto {
        val creds = sessionManager.getXtreamCredentials() 
            ?: return StreamDto(id, "", type, "Unauthorized", "")
            
        val typeLower = type.lowercase()
        
        val path = when (typeLower) {
            "live" -> buildLiveUrl(creds.baseUrl, creds.username, creds.password, id)
            "series" -> "${creds.baseUrl}/series/${creds.username}/${creds.password}/$id.mp4"
            else -> "${creds.baseUrl}/movie/${creds.username}/${creds.password}/$id.mp4"
        }

        return StreamDto(
            id = id,
            url = path,
            type = type,
            title = "Xtream $type Stream",
            backdropUrl = ""
        )
    }

    private fun buildLiveUrl(baseUrl: String, username: String, password: String, streamId: String): String {
        val root = baseUrl.trimEnd('/')
        val preferredExt = liveExtensions.first()
        return "$root/live/$username/$password/$streamId.$preferredExt"
    }
}
