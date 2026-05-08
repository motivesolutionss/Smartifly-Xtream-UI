package com.smartifly.tv.data.repository

import com.smartifly.tv.data.remote.SmartiflyApi
import com.smartifly.tv.data.remote.dto.StreamDto

class StreamRepository(private val api: SmartiflyApi) {
    suspend fun resolveStream(id: String, type: String): StreamDto {
        return api.getStream(id, type)
    }
}
