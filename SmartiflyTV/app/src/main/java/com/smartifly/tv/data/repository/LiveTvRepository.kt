package com.smartifly.tv.data.repository

import com.smartifly.tv.data.remote.SmartiflyApi
import com.smartifly.tv.data.remote.dto.LiveCategoryDto
import com.smartifly.tv.data.remote.dto.LiveChannelDto

class LiveTvRepository(private val api: SmartiflyApi) {
    
    suspend fun getCategories(): List<LiveCategoryDto> {
        return api.getLiveCategories()
    }

    suspend fun getChannels(categoryId: String? = null): List<LiveChannelDto> {
        return api.getLiveChannels(categoryId)
    }
}
