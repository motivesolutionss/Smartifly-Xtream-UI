package com.smartifly.tv.data.repository

import com.smartifly.tv.data.models.MediaCategory
import com.smartifly.tv.data.remote.NetworkResult
import com.smartifly.tv.data.remote.models.XtreamLiveStream
import com.smartifly.tv.features.live.epg.EpgProgram
import kotlinx.coroutines.flow.Flow

interface LiveDataSource {
    fun getLiveCategories(): Flow<NetworkResult<List<MediaCategory>>>
    fun getLiveFavorites(): Flow<NetworkResult<List<com.smartifly.tv.data.models.LiveStream>>>

    fun getLiveStreams(
        categoryId: String? = null,
        page: Int? = null,
        pageSize: Int = 120
    ): Flow<NetworkResult<List<XtreamLiveStream>>>

    suspend fun setLiveFavorite(streamId: String, isFavorite: Boolean)
    suspend fun isLiveFavorite(streamId: String): Boolean

    fun getShortEpg(streamId: Int): Flow<NetworkResult<List<EpgProgram>>>

    suspend fun getPortalCapabilityKey(): String
}
