package com.smartifly.tv.data.repository

import com.smartifly.tv.data.models.LiveStream
import com.smartifly.tv.data.models.MediaCategory
import com.smartifly.tv.data.models.MovieMetadata
import com.smartifly.tv.data.remote.NetworkResult
import kotlinx.coroutines.flow.Flow

interface HomeDataSource {
    fun getVodCategories(): Flow<NetworkResult<List<MediaCategory>>>
    fun getSeriesCategoriesCached(): Flow<NetworkResult<List<MediaCategory>>>
    fun getLiveCategories(): Flow<NetworkResult<List<MediaCategory>>>
    fun getMoviesCached(categoryId: String): Flow<NetworkResult<List<MovieMetadata>>>
    fun getSeriesCached(categoryId: String): Flow<NetworkResult<List<MovieMetadata>>>
    fun getLiveStreamsCached(categoryId: String): Flow<NetworkResult<List<LiveStream>>>
}
