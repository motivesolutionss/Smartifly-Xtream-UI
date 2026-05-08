package com.smartifly.tv.data.remote

import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.smartifly.tv.domain.model.AuthSession
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request

class XtreamContentService(
    private val httpClient: OkHttpClient,
    private val gson: Gson,
) {
    suspend fun getVodCategories(session: AuthSession): List<XtreamCategoryDto> {
        return requestList(
            session = session,
            action = "get_vod_categories",
            type = object : TypeToken<List<XtreamCategoryDto>>() {}.type
        )
    }

    suspend fun getLiveCategories(session: AuthSession): List<XtreamCategoryDto> {
        return requestList(
            session = session,
            action = "get_live_categories",
            type = object : TypeToken<List<XtreamCategoryDto>>() {}.type
        )
    }

    suspend fun getSeriesCategories(session: AuthSession): List<XtreamCategoryDto> {
        return requestList(
            session = session,
            action = "get_series_categories",
            type = object : TypeToken<List<XtreamCategoryDto>>() {}.type
        )
    }

    suspend fun getVodStreams(session: AuthSession, categoryId: String): List<XtreamMovieDto> {
        return requestList(
            session = session,
            action = "get_vod_streams",
            extraQuery = mapOf("category_id" to categoryId),
            type = object : TypeToken<List<XtreamMovieDto>>() {}.type
        )
    }

    suspend fun getLiveStreams(session: AuthSession, categoryId: String): List<XtreamLiveStreamDto> {
        return requestList(
            session = session,
            action = "get_live_streams",
            extraQuery = mapOf("category_id" to categoryId),
            type = object : TypeToken<List<XtreamLiveStreamDto>>() {}.type
        )
    }

    suspend fun getSeries(session: AuthSession, categoryId: String): List<XtreamSeriesDto> {
        return requestList(
            session = session,
            action = "get_series",
            extraQuery = mapOf("category_id" to categoryId),
            type = object : TypeToken<List<XtreamSeriesDto>>() {}.type
        )
    }

    suspend fun getVodInfo(session: AuthSession, vodId: Int): XtreamVodInfoResponseDto? {
        return requestObject(
            session = session,
            action = "get_vod_info",
            extraQuery = mapOf("vod_id" to vodId.toString()),
            type = object : TypeToken<XtreamVodInfoResponseDto>() {}.type
        )
    }

    suspend fun getSeriesInfo(session: AuthSession, seriesId: Int): XtreamSeriesInfoResponseDto? {
        return requestObject(
            session = session,
            action = "get_series_info",
            extraQuery = mapOf("series_id" to seriesId.toString()),
            type = object : TypeToken<XtreamSeriesInfoResponseDto>() {}.type
        )
    }

    fun buildMovieUrl(session: AuthSession, streamId: Int, extension: String): String {
        val user = java.net.URLEncoder.encode(session.username, Charsets.UTF_8)
        val pass = java.net.URLEncoder.encode(session.password, Charsets.UTF_8)
        return "${session.serverUrl.trimEnd('/')}/movie/$user/$pass/$streamId.$extension"
    }

    fun buildSeriesUrl(session: AuthSession, streamId: Int, extension: String): String {
        val user = java.net.URLEncoder.encode(session.username, Charsets.UTF_8)
        val pass = java.net.URLEncoder.encode(session.password, Charsets.UTF_8)
        return "${session.serverUrl.trimEnd('/')}/series/$user/$pass/$streamId.$extension"
    }

    fun buildLiveUrl(session: AuthSession, streamId: Int, extension: String = "m3u8"): String {
        val user = java.net.URLEncoder.encode(session.username, Charsets.UTF_8)
        val pass = java.net.URLEncoder.encode(session.password, Charsets.UTF_8)
        return "${session.serverUrl.trimEnd('/')}/live/$user/$pass/$streamId.$extension"
    }

    private suspend fun <T> requestList(
        session: AuthSession,
        action: String,
        type: java.lang.reflect.Type,
        extraQuery: Map<String, String> = emptyMap(),
    ): List<T> {
        val urlBuilder = buildXtreamPlayerApiUrl(session.serverUrl)?.newBuilder()
            ?.addQueryParameter("username", session.username)
            ?.addQueryParameter("password", session.password)
            ?.addQueryParameter("action", action)
            ?: return emptyList()

        extraQuery.forEach { (k, v) -> urlBuilder.addQueryParameter(k, v) }
        val request = Request.Builder().url(urlBuilder.build()).get().build()

        return withContext(Dispatchers.IO) {
            runCatching {
                httpClient.newCall(request).execute().use { response ->
                    if (!response.isSuccessful) return@use emptyList()
                    val raw = response.body?.string().orEmpty()
                    if (raw.isBlank()) return@use emptyList()
                    gson.fromJson<List<T>>(raw, type) ?: emptyList()
                }
            }.getOrDefault(emptyList())
        }
    }

    private suspend fun <T> requestObject(
        session: AuthSession,
        action: String,
        type: java.lang.reflect.Type,
        extraQuery: Map<String, String> = emptyMap(),
    ): T? {
        val urlBuilder = buildXtreamPlayerApiUrl(session.serverUrl)?.newBuilder()
            ?.addQueryParameter("username", session.username)
            ?.addQueryParameter("password", session.password)
            ?.addQueryParameter("action", action)
            ?: return null

        extraQuery.forEach { (k, v) -> urlBuilder.addQueryParameter(k, v) }
        val request = Request.Builder().url(urlBuilder.build()).get().build()

        return withContext(Dispatchers.IO) {
            runCatching {
                httpClient.newCall(request).execute().use { response ->
                    if (!response.isSuccessful) return@use null
                    val raw = response.body?.string().orEmpty()
                    if (raw.isBlank()) return@use null
                    gson.fromJson<T>(raw, type)
                }
            }.getOrNull()
        }
    }
}
