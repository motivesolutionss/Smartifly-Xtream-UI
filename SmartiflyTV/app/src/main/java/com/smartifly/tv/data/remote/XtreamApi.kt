package com.smartifly.tv.data.remote

import com.smartifly.tv.data.remote.dto.*
import retrofit2.http.GET
import retrofit2.http.Query

/**
 * Xtream UI Player API Interface
 * Standard API for IPTV content delivery.
 */
interface XtreamApi {

    @GET("player_api.php")
    suspend fun authenticate(
        @Query("username") user: String,
        @Query("password") pass: String
    ): Any

    @GET("player_api.php")
    suspend fun getVodCategories(
        @Query("username") user: String,
        @Query("password") pass: String,
        @Query("action") action: String = "get_vod_categories"
    ): List<XtreamCategoryDto>

    @GET("player_api.php")
    suspend fun getVodStreams(
        @Query("username") user: String,
        @Query("password") pass: String,
        @Query("action") action: String = "get_vod_streams",
        @Query("category_id") categoryId: String? = null
    ): List<ContentDto>

    @GET("player_api.php")
    suspend fun getSeriesCategories(
        @Query("username") user: String,
        @Query("password") pass: String,
        @Query("action") action: String = "get_series_categories"
    ): List<XtreamCategoryDto>

    @GET("player_api.php")
    suspend fun getSeries(
        @Query("username") user: String,
        @Query("password") pass: String,
        @Query("action") action: String = "get_series",
        @Query("category_id") categoryId: String? = null
    ): List<ContentDto>

    @GET("player_api.php")
    suspend fun getLiveCategories(
        @Query("username") user: String,
        @Query("password") pass: String,
        @Query("action") action: String = "get_live_categories"
    ): List<XtreamCategoryDto>

    @GET("player_api.php")
    suspend fun getLiveStreams(
        @Query("username") user: String,
        @Query("password") pass: String,
        @Query("action") action: String = "get_live_streams",
        @Query("category_id") categoryId: String? = null
    ): List<LiveChannelDto>
}

data class XtreamCategoryDto(
    val category_id: String,
    val category_name: String,
    val parent_id: Int = 0
)
