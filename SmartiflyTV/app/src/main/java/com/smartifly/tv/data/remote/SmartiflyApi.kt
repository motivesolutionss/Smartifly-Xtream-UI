package com.smartifly.tv.data.remote

import com.smartifly.tv.data.remote.dto.*
import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query

interface SmartiflyApi {
    @GET("home")
    suspend fun getHomeData(): HomeResponse

    @GET("movies")
    suspend fun getMovies(@Query("category") category: String? = null): List<ContentDto>

    @GET("series")
    suspend fun getSeries(@Query("category") category: String? = null): List<ContentDto>

    @GET("search")
    suspend fun search(@Query("q") query: String): List<ContentDto>

    @GET("content/{id}")
    suspend fun getContentDetails(@Path("id") id: String): ContentDetailsDto

    @GET("live/categories")
    suspend fun getLiveCategories(): List<LiveCategoryDto>

    @GET("live/channels")
    suspend fun getLiveChannels(@Query("category") categoryId: String? = null): List<LiveChannelDto>

    @GET("stream/{id}")
    suspend fun getStream(
        @Path("id") id: String,
        @Query("type") contentType: String // MOVIE, SERIES, LIVE
    ): StreamDto
}
