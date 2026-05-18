package com.smartifly.tv.data.repository

import com.smartifly.tv.data.models.MediaCategory
import com.smartifly.tv.data.models.MovieMetadata
import com.smartifly.tv.data.remote.NetworkResult
import com.smartifly.tv.data.remote.models.XtreamMovie
import kotlinx.coroutines.flow.Flow

interface MoviesDataSource {
    suspend fun getPortalCapabilityKey(): String
    fun getVodCategories(): Flow<NetworkResult<List<MediaCategory>>>
    fun getMoviesCached(categoryId: String): Flow<NetworkResult<List<MovieMetadata>>>
    fun getMovies(categoryId: String?, page: Int?): Flow<NetworkResult<List<XtreamMovie>>>
}
