package com.smartifly.tv.data.repository

import com.smartifly.tv.data.remote.NetworkResult
import com.smartifly.tv.data.remote.models.XtreamMovie
import com.smartifly.tv.data.remote.models.XtreamMovieInfo
import com.smartifly.tv.data.remote.models.XtreamSeries
import com.smartifly.tv.data.remote.models.XtreamSeriesInfo
import kotlinx.coroutines.flow.Flow

interface ContentDetailsDataSource {
    suspend fun getMovieInfo(vodId: Int): NetworkResult<XtreamMovieInfo>
    suspend fun getSeriesInfo(seriesId: Int): NetworkResult<XtreamSeriesInfo>
    fun getMovies(categoryId: String? = null, page: Int? = null): Flow<NetworkResult<List<XtreamMovie>>>
    fun getSeries(categoryId: String? = null, page: Int? = null): Flow<NetworkResult<List<XtreamSeries>>>
}
