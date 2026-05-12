package com.smartifly.tv.data.repository

import com.smartifly.tv.data.SessionManager
import com.smartifly.tv.data.onboarding.XtreamCredentials
import com.smartifly.tv.data.mapper.toEntity
import com.smartifly.tv.data.mapper.toDomain
import com.smartifly.tv.data.mapper.toDomainLive
import com.smartifly.tv.data.mapper.toDomainMovie
import com.smartifly.tv.data.remote.NetworkErrorMapper
import com.smartifly.tv.data.remote.NetworkResult
import com.smartifly.tv.data.remote.XtreamApiFactory
import com.smartifly.tv.data.remote.XtreamService
import com.smartifly.tv.data.models.MediaCategory
import com.smartifly.tv.data.models.LiveStream
import com.smartifly.tv.data.models.MovieMetadata
import com.smartifly.tv.data.remote.models.*
import com.google.gson.Gson
import com.google.gson.JsonElement
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.emitAll
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Enterprise-grade Repository for Xtream UI Content.
 * 
 * This repository is the single source of truth for all media content.
 * It orchestrates session-based API calls and provides UI-ready states via Kotlin Flows.
 */
class XtreamRepository(
    private val apiFactory: XtreamApiFactory,
    private val sessionManager: SessionManager,
    private val database: com.smartifly.tv.data.local.SmartiflyDatabase
) {
    private val gson = Gson()
    private val categoryDao = database.categoryDao()
    private val streamDao = database.streamDao()
    private val accountDao = database.accountDao()

    private var cachedService: XtreamService? = null
    private var lastUsedCredentials: XtreamCredentials? = null

    /**
     * Obtains a thread-safe instance of the XtreamService.
     * Rebuilds the service only if credentials have changed.
     */
    private suspend fun getService(): XtreamService {
        val creds = sessionManager.getXtreamCredentials() 
            ?: throw IllegalStateException("User not authenticated with Xtream Portal")

        if (cachedService == null || creds != lastUsedCredentials) {
            cachedService = XtreamApiFactory.create(creds)
            lastUsedCredentials = creds
        }
        return cachedService!!
    }

    private suspend fun getCreds(): XtreamCredentials {
        var attempts = 0
        while (attempts < 3) {
            val creds = sessionManager.getXtreamCredentials()
            if (creds != null) return creds
            
            attempts++
            android.util.Log.w("SmartiflyData", "Credentials missing, retrying... (Attempt $attempts)")
            kotlinx.coroutines.delay(500L) // Wait for DataStore sync
        }
        throw IllegalStateException("Credentials missing after 3 retries. User not authenticated.")
    }

    suspend fun getPortalCapabilityKey(): String {
        val creds = getCreds()
        val operatorId = creds.operatorId.trim().uppercase().ifBlank { "unknown-op" }
        val baseUrl = creds.baseUrl.trim().removeSuffix("/").lowercase().ifBlank { "unknown-host" }
        return "$operatorId|$baseUrl"
    }

    // ==========================================
    // CORE DATA FETCHING (OFFLINE-FIRST)
    // ==========================================

    fun getLiveCategories(): Flow<NetworkResult<List<MediaCategory>>> = flow {
        emit(NetworkResult.Loading)

        // Trigger background sync (fire-and-forget within the IO dispatcher)
        CoroutineScope(Dispatchers.IO).launch {
            try {
                syncCategories("LIVE")
            } catch (e: Exception) {
                android.util.Log.e("SmartiflyData", "LIVE sync failed: ${e.message}")
            }
        }

        // Observe local database — UI auto-updates when sync writes new data
        emitAll(categoryDao.getCategoriesByType("LIVE").map { entities ->
            if (entities.isEmpty()) NetworkResult.Loading
            else NetworkResult.Success(entities.map { it.toDomain() })
        })
    }.flowOn(Dispatchers.IO)

    fun getVodCategories(): Flow<NetworkResult<List<MediaCategory>>> = flow {
        emit(NetworkResult.Loading)
        CoroutineScope(Dispatchers.IO).launch {
            try { syncCategories("VOD") } catch (e: Exception) {
                android.util.Log.e("SmartiflyData", "VOD sync failed: ${e.message}")
            }
        }
        emitAll(categoryDao.getCategoriesByType("VOD").map { entities ->
            if (entities.isEmpty()) NetworkResult.Loading
            else NetworkResult.Success(entities.map { it.toDomain() })
        })
    }.flowOn(Dispatchers.IO)

    fun getSeriesCategoriesCached(): Flow<NetworkResult<List<MediaCategory>>> = flow {
        emit(NetworkResult.Loading)
        CoroutineScope(Dispatchers.IO).launch {
            try { syncCategories("SERIES") } catch (e: Exception) {
                android.util.Log.e("SmartiflyData", "SERIES sync failed: ${e.message}")
            }
        }
        emitAll(categoryDao.getCategoriesByType("SERIES").map { entities ->
            if (entities.isEmpty()) NetworkResult.Loading
            else NetworkResult.Success(entities.map { it.toDomain() })
        })
    }.flowOn(Dispatchers.IO)

    private suspend fun syncCategories(type: String) {
        val creds = getCreds()
        val service = getService()
        val rawCategories = when (type) {
            "LIVE" -> parseXtreamList(
                service.getLiveCategories(creds.username, creds.password),
                XtreamCategory::class.java,
                listOf("categories", "live_categories")
            )
            "VOD" -> parseXtreamList(
                service.getMovieCategories(creds.username, creds.password),
                XtreamCategory::class.java,
                listOf("categories", "vod_categories")
            )
            "SERIES" -> parseXtreamList(
                service.getSeriesCategories(creds.username, creds.password),
                XtreamCategory::class.java,
                listOf("categories", "series_categories")
            )
            else -> emptyList()
        }
        val entities = rawCategories.map { it.toEntity(type) }

        categoryDao.clearCategoriesByType(type)
        categoryDao.insertCategories(entities)
        android.util.Log.d("SmartiflyData", "$type Categories SYNCED to Room (${entities.size} items)")
    }

    // ==========================================
    // CONTENT FLOWS
    // ==========================================

    /**
     * Fetches live streams for a category (with offline-first support).
     */
    fun getLiveStreamsCached(categoryId: String): Flow<NetworkResult<List<LiveStream>>> = flow {
        emit(NetworkResult.Loading)
        
        CoroutineScope(Dispatchers.IO).launch {
            try { syncStreams(categoryId, "LIVE") } catch (e: Exception) {
                android.util.Log.e("SmartiflyData", "LIVE streams sync failed: ${e.message}")
            }
        }

        emitAll(streamDao.getStreamsByCategory(categoryId).map { entities ->
            if (entities.isEmpty()) NetworkResult.Loading
            else NetworkResult.Success(entities.map { it.toDomainLive() })
        })
    }.flowOn(Dispatchers.IO)

    fun getLiveStreams(
        categoryId: String? = null,
        page: Int? = null,
        pageSize: Int = 120
    ): Flow<NetworkResult<List<XtreamLiveStream>>> = networkFlow {
        val creds = getCreds()
        val service = getService()
        val raw = if (page != null) {
            val safePage = page.coerceAtLeast(1)
            val safePageSize = pageSize.coerceIn(20, 500)
            val offset = (safePage - 1) * safePageSize
            service.getLiveStreamsPage(
                creds.username,
                creds.password,
                categoryId = categoryId,
                page = safePage,
                limit = safePageSize,
                perPage = safePageSize,
                offset = offset,
                start = offset
            )
        } else {
            service.getLiveStreams(creds.username, creds.password, categoryId = categoryId)
        }
        parseXtreamList(raw, XtreamLiveStream::class.java, listOf("live_streams", "channels", "streams"))
    }

    /**
     * Fetches movie categories.
     */
    fun getMovieCategories(): Flow<NetworkResult<List<XtreamCategory>>> = networkFlow {
        val creds = getCreds()
        parseXtreamList(
            getService().getMovieCategories(creds.username, creds.password),
            XtreamCategory::class.java,
            listOf("categories", "vod_categories")
        )
    }

    /**
     * Fetches movies for a category (with offline-first support).
     */
    fun getMoviesCached(categoryId: String): Flow<NetworkResult<List<MovieMetadata>>> = flow {
        emit(NetworkResult.Loading)
        
        CoroutineScope(Dispatchers.IO).launch {
            try { syncStreams(categoryId, "VOD") } catch (e: Exception) {
                android.util.Log.e("SmartiflyData", "VOD streams sync failed: ${e.message}")
            }
        }

        emitAll(streamDao.getStreamsByCategory(categoryId).map { entities ->
            if (entities.isEmpty()) NetworkResult.Loading
            else NetworkResult.Success(entities.map { it.toDomainMovie() })
        })
    }.flowOn(Dispatchers.IO)

    fun getMovies(categoryId: String? = null, page: Int? = null): Flow<NetworkResult<List<XtreamMovie>>> = networkFlow {
        val creds = getCreds()
        val service = getService()
        val raw = if (page != null) {
            service.getMoviesPage(creds.username, creds.password, categoryId = categoryId, page = page)
        } else {
            service.getMovies(creds.username, creds.password, categoryId = categoryId)
        }
        parseXtreamList(raw, XtreamMovie::class.java, listOf("vod_streams", "movies", "vod"))
    }

    /**
     * Fetches series for a category (with offline-first support).
     */
    fun getSeriesCached(categoryId: String): Flow<NetworkResult<List<MovieMetadata>>> = flow {
        emit(NetworkResult.Loading)
        
        CoroutineScope(Dispatchers.IO).launch {
            try { syncStreams(categoryId, "SERIES") } catch (e: Exception) {
                android.util.Log.e("SmartiflyData", "SERIES streams sync failed: ${e.message}")
            }
        }

        emitAll(streamDao.getStreamsByCategory(categoryId).map { entities ->
            if (entities.isEmpty()) NetworkResult.Loading
            else NetworkResult.Success(entities.map { it.toDomainMovie() })
        })
    }.flowOn(Dispatchers.IO)

    private suspend fun syncStreams(categoryId: String, type: String) {
        val creds = getCreds()
        val service = getService()
        
        val entities = when (type) {
            "LIVE" -> parseXtreamList(
                service.getLiveStreams(creds.username, creds.password, categoryId = categoryId),
                XtreamLiveStream::class.java,
                listOf("live_streams", "channels", "streams")
            ).map { it.toEntity() }
            "VOD" -> parseXtreamList(
                service.getMovies(creds.username, creds.password, categoryId = categoryId),
                XtreamMovie::class.java,
                listOf("vod_streams", "movies", "vod")
            ).map { it.toEntity() }
            "SERIES" -> parseXtreamList(
                service.getSeries(creds.username, creds.password, categoryId = categoryId),
                XtreamSeries::class.java,
                listOf("series", "series_list")
            ).map { it.toEntity() }
            else -> emptyList()
        }

        if (entities.isNotEmpty()) {
            streamDao.clearStreamsByCategory(categoryId)
            streamDao.insertStreams(entities)
            android.util.Log.d("SmartiflyData", "$type Streams for category $categoryId SYNCED to Room")
        }
    }

    fun getSeriesCategories(): Flow<NetworkResult<List<XtreamCategory>>> = networkFlow {
        val creds = getCreds()
        parseXtreamList(
            getService().getSeriesCategories(creds.username, creds.password),
            XtreamCategory::class.java,
            listOf("categories", "series_categories")
        )
    }

    /**
     * Fetches short EPG for a specific stream.
     */
    fun getShortEpg(streamId: Int): Flow<NetworkResult<List<com.smartifly.tv.features.live.epg.EpgProgram>>> = networkFlow {
        val creds = getCreds()
        val response = getService().getShortEpg(creds.username, creds.password, streamId = streamId)
        
        // The Xtream API get_short_epg returns a map with "epg_listings" key
        @Suppress("UNCHECKED_CAST")
        val listings = response["epg_listings"] as? List<Map<String, Any>> ?: emptyList()
        
        listings.map { item ->
            com.smartifly.tv.features.live.epg.EpgProgram(
                id = item["id"]?.toString() ?: "",
                title = com.smartifly.tv.util.Base64Util.decode(item["title"]?.toString() ?: ""),
                description = com.smartifly.tv.util.Base64Util.decode(item["description"]?.toString() ?: ""),
                startTime = (item["start_timestamp"]?.toString()?.toLongOrNull() ?: 0L) * 1000,
                endTime = (item["stop_timestamp"]?.toString()?.toLongOrNull() ?: 0L) * 1000,
                channelId = streamId.toString()
            )
        }
    }

    /**
     * Fetches series for a category.
     */
    fun getSeries(categoryId: String? = null, page: Int? = null): Flow<NetworkResult<List<XtreamSeries>>> = networkFlow {
        val creds = getCreds()
        val service = getService()
        val raw = if (page != null) {
            service.getSeriesPage(creds.username, creds.password, categoryId = categoryId, page = page)
        } else {
            service.getSeries(creds.username, creds.password, categoryId = categoryId)
        }
        parseXtreamList(raw, XtreamSeries::class.java, listOf("series", "series_list"))
    }

    // ==========================================
    // DETAILED INFO
    // ==========================================

    /**
     * Fetches detailed information for a VOD movie.
     */
    suspend fun getMovieInfo(vodId: Int): NetworkResult<XtreamMovieInfo> = safeApiCall {
        val creds = getCreds()
        getService().getMovieInfo(creds.username, creds.password, vodId = vodId)
    }

    /**
     * Fetches detailed info and episodes for a TV series.
     */
    suspend fun getSeriesInfo(seriesId: Int): NetworkResult<XtreamSeriesInfo> = safeApiCall {
        val creds = getCreds()
        getService().getSeriesInfo(creds.username, creds.password, seriesId = seriesId)
    }

    // ==========================================
    // INFRASTRUCTURE
    // ==========================================

    /**
     * Professional wrapper for one-shot API calls.
     */
    private suspend fun <T> safeApiCall(apiCall: suspend () -> T): NetworkResult<T> {
        return withContext(Dispatchers.IO) {
            try {
                val result = apiCall()
                android.util.Log.d("SmartiflyData", "API Call SUCCESS")
                NetworkResult.Success(result)
            } catch (e: Exception) {
                android.util.Log.e("SmartiflyData", "API Call ERROR: ${e.message}")
                NetworkResult.Error(NetworkErrorMapper.toUserMessage(e), e)
            }
        }
    }
    
    /**
     * Professional wrapper for Flow-based API calls.
     */
    private fun <T> networkFlow(apiCall: suspend () -> T): Flow<NetworkResult<T>> = flow {
        emit(NetworkResult.Loading)
        try {
            val result = apiCall()
            android.util.Log.d("SmartiflyData", "Flow Fetch SUCCESS")
            emit(NetworkResult.Success(result))
        } catch (e: Exception) {
            android.util.Log.e("SmartiflyData", "Flow Fetch ERROR: ${e.message}")
            emit(NetworkResult.Error(NetworkErrorMapper.toUserMessage(e), e))
        }
    }.flowOn(Dispatchers.IO)

    private fun <T> parseXtreamList(
        raw: JsonElement?,
        clazz: Class<T>,
        possibleKeys: List<String> = emptyList()
    ): List<T> {
        if (raw == null || raw.isJsonNull) return emptyList()

        if (raw.isJsonArray) {
            return raw.asJsonArray.mapNotNull { element ->
                runCatching { gson.fromJson(element, clazz) }.getOrNull()
            }
        }

        if (!raw.isJsonObject) return emptyList()
        val obj = raw.asJsonObject

        // Auth/error responses instead of content payloads.
        if (obj.has("user_info") && obj.has("server_info")) return emptyList()
        if ((obj.get("auth")?.asInt ?: -1) == 0) return emptyList()
        if (obj.getAsJsonObject("user_info")?.get("auth")?.asInt == 0) return emptyList()
        if (obj.has("error") || obj.has("Error") || obj.has("ERROR")) return emptyList()

        val keys = (possibleKeys + listOf(
            "data", "items", "list", "streams", "channels", "live_streams",
            "vod_streams", "series", "movies", "result", "results"
        )).distinct()

        for (key in keys) {
            val candidate = obj.get(key)
            if (candidate != null && candidate.isJsonArray) {
                return candidate.asJsonArray.mapNotNull { element ->
                    runCatching { gson.fromJson(element, clazz) }.getOrNull()
                }
            }
        }

        // Numeric-keyed object format: {"0": {...}, "1": {...}}
        val entries = obj.entrySet().toList()
        if (entries.isNotEmpty() && entries.all { (k, _) -> k.toIntOrNull() != null }) {
            return entries.sortedBy { it.key.toInt() }.mapNotNull { (_, value) ->
                runCatching { gson.fromJson(value, clazz) }.getOrNull()
            }
        }

        return emptyList()
    }
}
