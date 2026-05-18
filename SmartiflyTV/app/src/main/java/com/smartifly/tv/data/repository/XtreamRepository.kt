package com.smartifly.tv.data.repository

import com.smartifly.tv.data.SessionManager
import com.smartifly.tv.analytics.TelemetryManager
import com.smartifly.tv.data.onboarding.XtreamCredentials
import com.smartifly.tv.data.mapper.toEntity
import com.smartifly.tv.data.mapper.toDomain
import com.smartifly.tv.data.mapper.toDomainLive
import com.smartifly.tv.data.mapper.toDomainMovie
import com.smartifly.tv.data.remote.NetworkErrorMapper
import com.smartifly.tv.data.remote.NetworkResult
import com.smartifly.tv.data.remote.XtreamApiFactory
import com.smartifly.tv.data.remote.XtreamService
import com.smartifly.tv.data.local.entities.SyncStateEntity
import com.smartifly.tv.data.models.MediaCategory
import com.smartifly.tv.data.models.LiveStream
import com.smartifly.tv.data.models.MovieMetadata
import com.smartifly.tv.data.remote.models.*
import com.google.gson.JsonElement
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.emitAll
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withContext
import java.io.IOException
import java.net.SocketTimeoutException
import java.net.UnknownHostException
import java.util.Collections
import javax.net.ssl.SSLException

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
) : LiveDataSource, MoviesDataSource, ContentDetailsDataSource, HomeDataSource {
    private val categoryDao = database.categoryDao()
    private val streamDao = database.streamDao()
    private val accountDao = database.accountDao()
    private val syncStateDao = database.syncStateDao()

    private var cachedService: XtreamService? = null
    private var lastUsedCredentials: XtreamCredentials? = null
    private val inFlightSyncKeys = Collections.synchronizedSet(mutableSetOf<String>())
    private var lastCredentialMissingLogAtMs: Long = 0L
    private val credentialMissingLogThrottleMs = 15_000L
    private val networkRetryAttempts = 3
    private val networkRetryInitialDelayMs = 250L
    private val networkRetryMaxDelayMs = 1_200L
    private val categorySyncTtlMs = 10 * 60 * 1000L
    private val streamSyncTtlMs = 5 * 60 * 1000L
    private val livePagingSupportByPortal = Collections.synchronizedMap(mutableMapOf<String, Boolean>())

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
            logCredentialMissing(attempts)
            kotlinx.coroutines.delay(500L) // Wait for DataStore sync
        }
        throw IllegalStateException("Credentials missing after 3 retries. User not authenticated.")
    }

    override suspend fun getPortalCapabilityKey(): String {
        val creds = getCreds()
        val operatorId = creds.operatorId.trim().uppercase().ifBlank { "unknown-op" }
        val baseUrl = creds.baseUrl.trim().removeSuffix("/").lowercase().ifBlank { "unknown-host" }
        return "$operatorId|$baseUrl"
    }

    // ==========================================
    // CORE DATA FETCHING (OFFLINE-FIRST)
    // ==========================================

    override fun getLiveCategories(): Flow<NetworkResult<List<MediaCategory>>> = flow {
        emit(NetworkResult.Loading)
        val providerKey = getPortalCapabilityKey()
        val syncError = runCatching {
            if (shouldSync(providerKey, "CATEGORY", "LIVE", "__ALL__", categorySyncTtlMs)) {
                syncCategories(providerKey, "LIVE")
            }
        }
            .exceptionOrNull()
            ?.also { if (it is RuntimeException) logSyncFailure("LIVE sync failed", it) }
        emitAll(categoryDao.getCategoriesByType(providerKey, "LIVE").map { entities ->
            if (entities.isEmpty()) {
                syncError?.let { NetworkResult.Error(NetworkErrorMapper.toUserMessage(it), it) } ?: NetworkResult.Loading
            } else {
                NetworkResult.Success(entities.map { it.toDomain() })
            }
        })
    }.flowOn(Dispatchers.IO)

    override fun getVodCategories(): Flow<NetworkResult<List<MediaCategory>>> = flow {
        emit(NetworkResult.Loading)
        val providerKey = getPortalCapabilityKey()
        val syncError = runCatching {
            if (shouldSync(providerKey, "CATEGORY", "VOD", "__ALL__", categorySyncTtlMs)) {
                syncCategories(providerKey, "VOD")
            }
        }
            .exceptionOrNull()
            ?.also { if (it is RuntimeException) logSyncFailure("VOD sync failed", it) }
        emitAll(categoryDao.getCategoriesByType(providerKey, "VOD").map { entities ->
            if (entities.isEmpty()) {
                syncError?.let { NetworkResult.Error(NetworkErrorMapper.toUserMessage(it), it) } ?: NetworkResult.Loading
            } else {
                NetworkResult.Success(entities.map { it.toDomain() })
            }
        })
    }.flowOn(Dispatchers.IO)

    override fun getSeriesCategoriesCached(): Flow<NetworkResult<List<MediaCategory>>> = flow {
        emit(NetworkResult.Loading)
        val providerKey = getPortalCapabilityKey()
        val syncError = runCatching {
            if (shouldSync(providerKey, "CATEGORY", "SERIES", "__ALL__", categorySyncTtlMs)) {
                syncCategories(providerKey, "SERIES")
            }
        }
            .exceptionOrNull()
            ?.also { if (it is RuntimeException) logSyncFailure("SERIES sync failed", it) }
        emitAll(categoryDao.getCategoriesByType(providerKey, "SERIES").map { entities ->
            if (entities.isEmpty()) {
                syncError?.let { NetworkResult.Error(NetworkErrorMapper.toUserMessage(it), it) } ?: NetworkResult.Loading
            } else {
                NetworkResult.Success(entities.map { it.toDomain() })
            }
        })
    }.flowOn(Dispatchers.IO)

    private suspend fun syncCategories(providerKey: String, type: String) {
        val syncKey = "CAT:$providerKey:$type"
        if (!tryAcquireSync(syncKey)) {
            android.util.Log.d("SmartiflyData", "Skipping duplicate category sync for $type")
            return
        }
        val attemptAt = System.currentTimeMillis()
        try {
            val creds = getCreds()
            val service = getService()
            val rawCategories = executeWithRetry("syncCategories:$type") {
                when (type) {
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
            }
            val entities = rawCategories.map { it.toEntity(providerKey = providerKey, type = type) }

            categoryDao.clearCategoriesByType(providerKey, type)
            categoryDao.insertCategories(entities)
            syncStateDao.upsert(
                SyncStateEntity(
                    providerKey = providerKey,
                    domain = "CATEGORY",
                    type = type,
                    categoryId = "__ALL__",
                    lastAttemptAtMs = attemptAt,
                    lastSuccessAtMs = System.currentTimeMillis(),
                    itemCount = entities.size,
                    lastError = null
                )
            )
            android.util.Log.d("SmartiflyData", "$type Categories SYNCED to Room (${entities.size} items)")
        } catch (e: Throwable) {
            val previous = syncStateDao.getState(providerKey, "CATEGORY", type, "__ALL__")
            syncStateDao.upsert(
                SyncStateEntity(
                    providerKey = providerKey,
                    domain = "CATEGORY",
                    type = type,
                    categoryId = "__ALL__",
                    lastAttemptAtMs = attemptAt,
                    lastSuccessAtMs = previous?.lastSuccessAtMs ?: 0L,
                    itemCount = previous?.itemCount ?: 0,
                    lastError = e.message
                )
            )
            throw e
        } finally {
            releaseSync(syncKey)
        }
    }

    // ==========================================
    // CONTENT FLOWS
    // ==========================================

    /**
     * Fetches live streams for a category (with offline-first support).
     */
    override fun getLiveStreamsCached(categoryId: String): Flow<NetworkResult<List<LiveStream>>> = flow {
        emit(NetworkResult.Loading)
        val providerKey = getPortalCapabilityKey()
        val syncNeeded = shouldSync(providerKey, "STREAM", "LIVE", categoryId, streamSyncTtlMs)
        TelemetryManager.trackCacheProbe("live", hit = !syncNeeded)
        val syncError = runCatching {
            if (syncNeeded) {
                syncStreams(providerKey, categoryId, "LIVE")
            }
        }
            .exceptionOrNull()
            ?.also { if (it is RuntimeException) logSyncFailure("LIVE streams sync failed", it) }
        emitAll(streamDao.getStreamsByCategory(providerKey, "live", categoryId).map { entities ->
            if (entities.isEmpty()) {
                syncError?.let { NetworkResult.Error(NetworkErrorMapper.toUserMessage(it), it) } ?: NetworkResult.Loading
            } else {
                NetworkResult.Success(entities.map { it.toDomainLive() })
            }
        })
    }.flowOn(Dispatchers.IO)

    override fun getLiveStreams(
        categoryId: String?,
        page: Int?,
        pageSize: Int
    ): Flow<NetworkResult<List<XtreamLiveStream>>> = networkFlow {
        val creds = getCreds()
        val service = getService()
        val providerKey = getPortalCapabilityKey()
        if (page == null) {
            val raw = service.getLiveStreams(creds.username, creds.password, categoryId = categoryId)
            parseXtreamList(raw, XtreamLiveStream::class.java, listOf("live_streams", "channels", "streams"))
        } else {
            val safePage = page.coerceAtLeast(1)
            val safePageSize = pageSize.coerceIn(20, 500)
            val supportsPaging = livePagingSupportByPortal[providerKey]
            if (supportsPaging == false) {
                val snapshotRaw = service.getLiveStreams(creds.username, creds.password, categoryId = categoryId)
                val all = parseXtreamList(snapshotRaw, XtreamLiveStream::class.java, listOf("live_streams", "channels", "streams"))
                slicePage(all, safePage, safePageSize)
            } else {
                val offset = (safePage - 1) * safePageSize
                val pagedRaw = service.getLiveStreamsPage(
                    creds.username,
                    creds.password,
                    categoryId = categoryId,
                    page = safePage,
                    limit = safePageSize,
                    perPage = safePageSize,
                    offset = offset,
                    start = offset
                )
                val paged = parseXtreamList(pagedRaw, XtreamLiveStream::class.java, listOf("live_streams", "channels", "streams"))
                val likelySnapshot = when {
                    safePage == 1 && paged.size > safePageSize -> true
                    else -> false
                }
                if (likelySnapshot) {
                    livePagingSupportByPortal[providerKey] = false
                    slicePage(paged, safePage, safePageSize)
                } else {
                    livePagingSupportByPortal[providerKey] = true
                    paged
                }
            }
        }
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
    override fun getMoviesCached(categoryId: String): Flow<NetworkResult<List<MovieMetadata>>> = flow {
        emit(NetworkResult.Loading)
        val providerKey = getPortalCapabilityKey()
        val syncNeeded = shouldSync(providerKey, "STREAM", "VOD", categoryId, streamSyncTtlMs)
        TelemetryManager.trackCacheProbe("movies", hit = !syncNeeded)
        val syncError = runCatching {
            if (syncNeeded) {
                syncStreams(providerKey, categoryId, "VOD")
            }
        }
            .exceptionOrNull()
            ?.also { if (it is RuntimeException) logSyncFailure("VOD streams sync failed", it) }
        emitAll(streamDao.getStreamsByCategory(providerKey, "movie", categoryId).map { entities ->
            if (entities.isEmpty()) {
                syncError?.let { NetworkResult.Error(NetworkErrorMapper.toUserMessage(it), it) } ?: NetworkResult.Loading
            } else {
                NetworkResult.Success(entities.map { it.toDomainMovie() })
            }
        })
    }.flowOn(Dispatchers.IO)

    override fun getMovies(categoryId: String?, page: Int?): Flow<NetworkResult<List<XtreamMovie>>> = networkFlow {
        val creds = getCreds()
        val service = getService()
        val raw = if (page != null) {
            service.getMoviesPage(creds.username, creds.password, categoryId = categoryId, page = page)
        } else {
            service.getMovies(creds.username, creds.password, categoryId = categoryId)
        }
        parseXtreamList(raw, XtreamMovie::class.java, listOf("vod_streams", "movies", "vod"))
    }

    fun getMovies(): Flow<NetworkResult<List<XtreamMovie>>> = getMovies(categoryId = null, page = null)
    fun getMovies(categoryId: String?): Flow<NetworkResult<List<XtreamMovie>>> = getMovies(categoryId = categoryId, page = null)

    /**
     * Fetches series for a category (with offline-first support).
     */
    override fun getSeriesCached(categoryId: String): Flow<NetworkResult<List<MovieMetadata>>> = flow {
        emit(NetworkResult.Loading)
        val providerKey = getPortalCapabilityKey()
        val syncNeeded = shouldSync(providerKey, "STREAM", "SERIES", categoryId, streamSyncTtlMs)
        TelemetryManager.trackCacheProbe("series", hit = !syncNeeded)
        val syncError = runCatching {
            if (syncNeeded) {
                syncStreams(providerKey, categoryId, "SERIES")
            }
        }
            .exceptionOrNull()
            ?.also { if (it is RuntimeException) logSyncFailure("SERIES streams sync failed", it) }
        emitAll(streamDao.getStreamsByCategory(providerKey, "series", categoryId).map { entities ->
            if (entities.isEmpty()) {
                syncError?.let { NetworkResult.Error(NetworkErrorMapper.toUserMessage(it), it) } ?: NetworkResult.Loading
            } else {
                NetworkResult.Success(entities.map { it.toDomainMovie() })
            }
        })
    }.flowOn(Dispatchers.IO)

    private suspend fun syncStreams(providerKey: String, categoryId: String, type: String) {
        val syncKey = "STREAM:$providerKey:$type:$categoryId"
        if (!tryAcquireSync(syncKey)) {
            android.util.Log.d("SmartiflyData", "Skipping duplicate stream sync for $type category=$categoryId")
            return
        }
        val attemptAt = System.currentTimeMillis()
        try {
            val previous = syncStateDao.getState(providerKey, "STREAM", type, categoryId)
            val creds = getCreds()
            val service = getService()
            val entities = executeWithRetry("syncStreams:$type:$categoryId") {
                when (type) {
                    "LIVE" -> parseXtreamList(
                        service.getLiveStreams(creds.username, creds.password, categoryId = categoryId),
                        XtreamLiveStream::class.java,
                        listOf("live_streams", "channels", "streams")
                    ).map { it.toEntity(providerKey) }
                    "VOD" -> parseXtreamList(
                        service.getMovies(creds.username, creds.password, categoryId = categoryId),
                        XtreamMovie::class.java,
                        listOf("vod_streams", "movies", "vod")
                    ).map { it.toEntity(providerKey) }
                    "SERIES" -> parseXtreamList(
                        service.getSeries(creds.username, creds.password, categoryId = categoryId),
                        XtreamSeries::class.java,
                        listOf("series", "series_list")
                    ).map { it.toEntity(providerKey) }
                    else -> emptyList()
                }
            }

            if (entities.isEmpty() && (previous?.itemCount ?: 0) > 0) {
                syncStateDao.upsert(
                    SyncStateEntity(
                        providerKey = providerKey,
                        domain = "STREAM",
                        type = type,
                        categoryId = categoryId,
                        lastAttemptAtMs = attemptAt,
                        lastSuccessAtMs = previous?.lastSuccessAtMs ?: 0L,
                        itemCount = previous?.itemCount ?: 0,
                        lastError = "empty_response_preserved_cache"
                    )
                )
                android.util.Log.w(
                    "SmartiflyData",
                    "$type Streams EMPTY response for category=$categoryId; preserving existing cache (${previous?.itemCount ?: 0} items)"
                )
                return
            }

            streamDao.clearStreamsByCategory(providerKey, streamTypeFor(type), categoryId)
            streamDao.insertStreams(entities)
            syncStateDao.upsert(
                SyncStateEntity(
                    providerKey = providerKey,
                    domain = "STREAM",
                    type = type,
                    categoryId = categoryId,
                    lastAttemptAtMs = attemptAt,
                    lastSuccessAtMs = System.currentTimeMillis(),
                    itemCount = entities.size,
                    lastError = null
                )
            )
            android.util.Log.d("SmartiflyData", "$type Streams SYNCED to Room category=$categoryId (${entities.size} items)")
        } catch (e: Throwable) {
            val previous = syncStateDao.getState(providerKey, "STREAM", type, categoryId)
            syncStateDao.upsert(
                SyncStateEntity(
                    providerKey = providerKey,
                    domain = "STREAM",
                    type = type,
                    categoryId = categoryId,
                    lastAttemptAtMs = attemptAt,
                    lastSuccessAtMs = previous?.lastSuccessAtMs ?: 0L,
                    itemCount = previous?.itemCount ?: 0,
                    lastError = e.message
                )
            )
            throw e
        } finally {
            releaseSync(syncKey)
        }
    }

    /**
     * Fetches short EPG for a specific stream.
     */
    override fun getShortEpg(streamId: Int): Flow<NetworkResult<List<com.smartifly.tv.features.live.epg.EpgProgram>>> = networkFlow {
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
    override fun getSeries(categoryId: String?, page: Int?): Flow<NetworkResult<List<XtreamSeries>>> = networkFlow {
        val creds = getCreds()
        val service = getService()
        val raw = if (page != null) {
            service.getSeriesPage(creds.username, creds.password, categoryId = categoryId, page = page)
        } else {
            service.getSeries(creds.username, creds.password, categoryId = categoryId)
        }
        parseXtreamList(raw, XtreamSeries::class.java, listOf("series", "series_list"))
    }

    fun getSeries(): Flow<NetworkResult<List<XtreamSeries>>> = getSeries(categoryId = null, page = null)
    fun getSeries(categoryId: String?): Flow<NetworkResult<List<XtreamSeries>>> = getSeries(categoryId = categoryId, page = null)

    // ==========================================
    // DETAILED INFO
    // ==========================================

    /**
     * Fetches detailed information for a VOD movie.
     */
    override suspend fun getMovieInfo(vodId: Int): NetworkResult<XtreamMovieInfo> = safeApiCall {
        val creds = getCreds()
        getService().getMovieInfo(creds.username, creds.password, vodId = vodId)
    }

    /**
     * Fetches detailed info and episodes for a TV series.
     */
    override suspend fun getSeriesInfo(seriesId: Int): NetworkResult<XtreamSeriesInfo> = safeApiCall {
        val creds = getCreds()
        val service = getService()
        try {
            service.getSeriesInfo(creds.username, creds.password, seriesId = seriesId)
        } catch (e: RuntimeException) {
            service.getSeriesInfoCompat(creds.username, creds.password, series = seriesId)
        }
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
                val result = executeWithRetry("safeApiCall") { apiCall() }
                android.util.Log.d("SmartiflyData", "API Call SUCCESS")
                NetworkResult.Success(result)
            } catch (e: CancellationException) {
                throw e
            } catch (e: RuntimeException) {
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
            val result = executeWithRetry("networkFlow") { apiCall() }
            android.util.Log.d("SmartiflyData", "Flow Fetch SUCCESS")
            emit(NetworkResult.Success(result))
        } catch (e: CancellationException) {
            // Expected when collector is cancelled (screen switch / first{} short-circuit).
            throw e
        } catch (e: RuntimeException) {
            android.util.Log.e("SmartiflyData", "Flow Fetch ERROR: ${e.message}")
            emit(NetworkResult.Error(NetworkErrorMapper.toUserMessage(e), e))
        }
    }.flowOn(Dispatchers.IO)

    private fun tryAcquireSync(key: String): Boolean {
        synchronized(inFlightSyncKeys) {
            if (inFlightSyncKeys.contains(key)) return false
            inFlightSyncKeys.add(key)
            return true
        }
    }

    private fun releaseSync(key: String) {
        synchronized(inFlightSyncKeys) {
            inFlightSyncKeys.remove(key)
        }
    }

    private fun logCredentialMissing(attempt: Int) {
        val now = System.currentTimeMillis()
        if (now - lastCredentialMissingLogAtMs >= credentialMissingLogThrottleMs || attempt >= 3) {
            lastCredentialMissingLogAtMs = now
            android.util.Log.w("SmartiflyData", "Credentials missing, retrying... (Attempt $attempt)")
        }
    }

    private fun logSyncFailure(prefix: String, error: Throwable) {
        val message = error.message ?: error::class.java.simpleName
        if (error is CancellationException || isExpectedAbortMessage(message)) {
            android.util.Log.d("SmartiflyData", "$prefix: $message")
        } else {
            android.util.Log.e("SmartiflyData", "$prefix: $message")
        }
    }

    private fun isExpectedAbortMessage(message: String): Boolean {
        val lowered = message.lowercase()
        return lowered.contains("flow was aborted") || lowered.contains("standalonecoroutine was cancelled")
    }

    private suspend fun <T> executeWithRetry(
        operation: String,
        block: suspend () -> T
    ): T {
        var attempt = 0
        var backoffMs = networkRetryInitialDelayMs
        var lastError: Throwable? = null
        while (attempt < networkRetryAttempts) {
            try {
                return block()
            } catch (e: CancellationException) {
                throw e
            } catch (e: Throwable) {
                lastError = e
                val isRetryable = isRetryableNetworkError(e)
                val isLastAttempt = attempt == networkRetryAttempts - 1
                if (!isRetryable || isLastAttempt) {
                    throw e
                }
                android.util.Log.w(
                    "SmartiflyData",
                    "retrying op=$operation attempt=${attempt + 1}/$networkRetryAttempts wait_ms=$backoffMs reason=${e.message}"
                )
                delay(backoffMs)
                backoffMs = (backoffMs * 2).coerceAtMost(networkRetryMaxDelayMs)
                attempt++
            }
        }
        throw lastError ?: IllegalStateException("Retry loop exited unexpectedly for $operation")
    }

    private fun isRetryableNetworkError(error: Throwable): Boolean {
        val message = error.message?.lowercase().orEmpty()
        return when (error) {
            is SocketTimeoutException,
            is UnknownHostException,
            is SSLException,
            is IOException -> true
            else -> {
                message.contains("timeout") ||
                    message.contains("timed out") ||
                    message.contains("429") ||
                    message.contains("too many requests") ||
                    message.contains("reset") ||
                    message.contains("refused") ||
                    message.contains("temporarily unavailable")
            }
        }
    }

    private fun <T> parseXtreamList(
        raw: JsonElement?,
        clazz: Class<T>,
        possibleKeys: List<String> = emptyList()
    ): List<T> {
        return XtreamListParser.parse(raw, clazz, possibleKeys)
    }

    private fun streamTypeFor(contentType: String): String {
        return when (contentType) {
            "LIVE" -> "live"
            "VOD" -> "movie"
            "SERIES" -> "series"
            else -> contentType.lowercase()
        }
    }

    private fun <T> slicePage(items: List<T>, page: Int, pageSize: Int): List<T> {
        val fromIndex = ((page - 1) * pageSize).coerceAtLeast(0)
        if (fromIndex >= items.size) return emptyList()
        val toIndex = (fromIndex + pageSize).coerceAtMost(items.size)
        return items.subList(fromIndex, toIndex)
    }

    private suspend fun shouldSync(
        providerKey: String,
        domain: String,
        type: String,
        categoryId: String,
        ttlMs: Long
    ): Boolean {
        val state = syncStateDao.getState(providerKey, domain, type, categoryId) ?: return true
        if (state.lastSuccessAtMs <= 0L) return true
        return System.currentTimeMillis() - state.lastSuccessAtMs > ttlMs
    }

    suspend fun recordWarmupDomainState(
        domain: String,
        status: String,
        itemCount: Int,
        durationMs: Long,
        error: String?
    ) {
        val providerKey = getPortalCapabilityKey()
        val now = System.currentTimeMillis()
        val previous = syncStateDao.getState(providerKey, "WARMUP", domain, "__ALL__")
        val success = status.equals("SUCCESS", ignoreCase = true) || status.equals("PARTIAL", ignoreCase = true)
        syncStateDao.upsert(
            SyncStateEntity(
                providerKey = providerKey,
                domain = "WARMUP",
                type = domain.uppercase(),
                categoryId = "__ALL__",
                lastAttemptAtMs = now,
                lastSuccessAtMs = if (success) now else (previous?.lastSuccessAtMs ?: 0L),
                itemCount = itemCount,
                lastError = if (success) null else (error ?: "warmup_failed")
            )
        )
        TelemetryManager.trackTiming(
            eventName = "warmup_${domain.lowercase()}_ms",
            durationMs = durationMs,
            extra = mapOf("status" to status, "items" to itemCount.toString())
        )
    }
}

