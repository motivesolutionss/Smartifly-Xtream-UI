package com.smartifly.tv.data.remote

import com.smartifly.tv.data.remote.models.*
import com.google.gson.JsonElement
import okhttp3.ResponseBody
import retrofit2.http.GET
import retrofit2.http.Query

/**
 * Enterprise-grade Retrofit Service for Xtream UI API.
 * 
 * This interface defines the contract for communication with the Xtream server.
 * All media content (Live, VOD, Series) is orchestrated through these endpoints.
 */
interface XtreamService {

    /**
     * Authenticates the user and retrieves server metadata.
     * Uses @Url to support dynamic server connection during onboarding.
     */
    @GET
    suspend fun authenticate(
        @retrofit2.http.Url url: String,
        @Query("username") user: String,
        @Query("password") pass: String
    ): ResponseBody

    // ==========================================
    // CATEGORIES
    // ==========================================

    @GET("player_api.php")
    suspend fun getLiveCategories(
        @Query("username") user: String,
        @Query("password") pass: String,
        @Query("action") action: String = "get_live_categories"
    ): JsonElement

    @GET("player_api.php")
    suspend fun getMovieCategories(
        @Query("username") user: String,
        @Query("password") pass: String,
        @Query("action") action: String = "get_vod_categories"
    ): JsonElement

    @GET("player_api.php")
    suspend fun getSeriesCategories(
        @Query("username") user: String,
        @Query("password") pass: String,
        @Query("action") action: String = "get_series_categories"
    ): JsonElement

    // ==========================================
    // STREAMS & CONTENT (Basic)
    // ==========================================

    @GET("player_api.php")
    suspend fun getLiveStreams(
        @Query("username") user: String,
        @Query("password") pass: String,
        @Query("action") action: String = "get_live_streams",
        @Query("category_id") categoryId: String? = null
    ): JsonElement

    @GET("player_api.php")
    suspend fun getMovies(
        @Query("username") user: String,
        @Query("password") pass: String,
        @Query("action") action: String = "get_vod_streams",
        @Query("category_id") categoryId: String? = null
    ): JsonElement

    @GET("player_api.php")
    suspend fun getSeries(
        @Query("username") user: String,
        @Query("password") pass: String,
        @Query("action") action: String = "get_series",
        @Query("category_id") categoryId: String? = null
    ): JsonElement

    // ==========================================
    // PAGINATION (Professional Scale)
    // ==========================================

    @GET("player_api.php")
    suspend fun getLiveStreamsPage(
        @Query("username") user: String,
        @Query("password") pass: String,
        @Query("action") action: String = "get_live_streams",
        @Query("category_id") categoryId: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 100,
        @Query("per_page") perPage: Int? = null,
        @Query("offset") offset: Int? = null,
        @Query("start") start: Int? = null
    ): JsonElement

    @GET("player_api.php")
    suspend fun getMoviesPage(
        @Query("username") user: String,
        @Query("password") pass: String,
        @Query("action") action: String = "get_vod_streams",
        @Query("category_id") categoryId: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 100
    ): JsonElement

    @GET("player_api.php")
    suspend fun getSeriesPage(
        @Query("username") user: String,
        @Query("password") pass: String,
        @Query("action") action: String = "get_series",
        @Query("category_id") categoryId: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 100
    ): JsonElement

    // ==========================================
    // DETAILS & EPG
    // ==========================================

    @GET("player_api.php")
    suspend fun getMovieInfo(
        @Query("username") user: String,
        @Query("password") pass: String,
        @Query("action") action: String = "get_vod_info",
        @Query("vod_id") vodId: Int
    ): XtreamMovieInfo

    @GET("player_api.php")
    suspend fun getSeriesInfo(
        @Query("username") user: String,
        @Query("password") pass: String,
        @Query("action") action: String = "get_series_info",
        @Query("series_id") seriesId: Int
    ): XtreamSeriesInfo

    @GET("player_api.php")
    suspend fun getShortEpg(
        @Query("username") user: String,
        @Query("password") pass: String,
        @Query("action") action: String = "get_short_epg",
        @Query("stream_id") streamId: Int,
        @Query("limit") limit: Int = 10
    ): Map<String, Any> // EPG data varies, map is safer for raw processing
}
