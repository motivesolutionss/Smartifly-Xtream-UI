package com.smartifly.tv.data.repository

import com.smartifly.tv.data.SessionManager
import com.smartifly.tv.analytics.TelemetryManager
import com.smartifly.tv.data.cache.CacheBudgetPolicy
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
import androidx.room.withTransaction
import com.google.gson.JsonElement
import okhttp3.ResponseBody
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.emitAll
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.supervisorScope
import kotlinx.coroutines.withContext
import kotlinx.coroutines.sync.Semaphore
import kotlinx.coroutines.sync.withPermit
import com.smartifly.tv.performance.RuntimeDownshiftManager
import java.io.IOException
import java.io.EOFException
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
    companion object {
        private const val CATEGORY_SCOPE_KEY = "__CATEGORY_SCOPE__"
        private const val WARMUP_SCOPE_KEY = "__WARMUP_SCOPE__"
        private const val SEARCH_GLOBAL_SCOPE_KEY = "__SEARCH_GLOBAL_SCOPE__"
        internal const val SYNC_FAILURE_COOLDOWN_MS = 60 * 1000L
        internal const val EMPTY_RESPONSE_PRESERVE_THRESHOLD = 2
        internal const val STREAM_DB_INSERT_CHUNK_SIZE = 250

        internal fun shouldSkipSyncForRecentFailure(state: SyncStateEntity, nowMs: Long): Boolean {
            if (state.lastError.isNullOrBlank() || state.lastAttemptAtMs <= 0L) return false
            return nowMs - state.lastAttemptAtMs < SYNC_FAILURE_COOLDOWN_MS
        }

        internal fun nextPreservedEmptyStreak(lastError: String?): Int {
            return extractPreservedEmptyCount(lastError) + 1
        }

        internal fun shouldPreserveCacheOnEmptyResponse(previous: SyncStateEntity?): Boolean {
            if (previous == null || previous.itemCount <= 0) return false
            val nextStreak = nextPreservedEmptyStreak(previous.lastError)
            return nextStreak <= EMPTY_RESPONSE_PRESERVE_THRESHOLD
        }

        internal fun <T> cooldownCacheMissResult(): NetworkResult<T> {
            val cause = IllegalStateException("Sync cooldown active and no cached data available")
            return NetworkResult.Error(NetworkErrorMapper.toUserMessage(cause), cause)
        }

        private fun extractPreservedEmptyCount(lastError: String?): Int {
            if (lastError.isNullOrBlank()) return 0
            if (!lastError.startsWith("empty_response_preserved_cache")) return 0
            val countPart = lastError.substringAfter("count=", "")
            return countPart.toIntOrNull() ?: 1
        }
    }

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
    private val searchWarmTtlMs = 30 * 60 * 1000L
    private val livePagingSupportByPortal = Collections.synchronizedMap(mutableMapOf<String, Boolean>())
    private val syncSemaphore = Semaphore(1)
    private val searchWarmLocks = Collections.synchronizedSet(mutableSetOf<String>())

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
        if (!sessionManager.waitUntilActivated(timeoutMs = 3_000L)) {
            throw IllegalStateException("Session not activated yet")
        }
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

    suspend fun ensureSearchCatalogReady() {
        val providerKey = getPortalCapabilityKey()
        val warmState = syncStateDao.getState(providerKey, "WARMUP", "SEARCH", WARMUP_SCOPE_KEY)
        val now = System.currentTimeMillis()
        if (warmState != null && now - warmState.lastSuccessAtMs <= searchWarmTtlMs) return
        val lockKey = "SEARCH_WARM:$providerKey"
        if (!tryAcquireSearchWarm(lockKey)) return
        try {
            val startMs = System.currentTimeMillis()
            warmTypeForSearch(providerKey, "VOD")
            warmTypeForSearch(providerKey, "SERIES")
            warmTypeForSearch(providerKey, "LIVE")
            recordWarmupDomainState(
                domain = "SEARCH",
                status = "SUCCESS",
                itemCount = 1,
                durationMs = System.currentTimeMillis() - startMs,
                error = null
            )
        } catch (error: Throwable) {
            recordWarmupDomainState(
                domain = "SEARCH",
                status = "FAILED",
                itemCount = 0,
                durationMs = 0L,
                error = error.message
            )
            throw error
        } finally {
            releaseSearchWarm(lockKey)
        }
    }

    suspend fun searchCatalog(query: String, limit: Int = CacheBudgetPolicy.SEARCH_RESULTS_LIMIT): List<MovieMetadata> {
        val providerKey = getPortalCapabilityKey()
        val normalized = query.trim().lowercase()
        if (normalized.isEmpty()) return emptyList()
        val escaped = escapeSqlLike(normalized)
        val compactNormalized = normalizeSearchKey(normalized)
        val compactEscaped = escapeSqlLike(compactNormalized)
        return streamDao.searchStreams(
            providerKey = providerKey,
            exactQuery = escaped,
            prefixQuery = "$escaped%",
            containsQuery = "%$escaped%",
            compactExactQuery = compactEscaped,
            compactPrefixQuery = "$compactEscaped%",
            compactContainsQuery = "%$compactEscaped%",
            limit = limit
        ).map { entity ->
            if (entity.streamType == "live") {
                entity.toDomainLive().toSearchCard()
            } else {
                entity.toDomainMovie()
            }
        }
    }

    suspend fun searchCatalogRemote(query: String, limit: Int = CacheBudgetPolicy.SEARCH_RESULTS_LIMIT): List<MovieMetadata> {
        val normalized = query.trim().lowercase()
        if (normalized.isEmpty()) return emptyList()

        val creds = getCreds()
        val service = getService()

        return supervisorScope {
            val liveDeferred = async {
                runCatching {
                    executeWithRetry("searchRemote:LIVE") {
                        parseXtreamListRaw(
                            service.getLiveStreamsRaw(
                                creds.username,
                                creds.password,
                                categoryId = null
                            ),
                            XtreamLiveStream::class.java,
                            listOf("live_streams", "channels", "streams")
                        ).mapNotNull { stream ->
                            if (matchesSearchQuery(stream.name, normalized)) {
                                stream.toDomainLive().toSearchCard()
                            } else {
                                null
                            }
                        }
                    }
                }.getOrElse {
                    android.util.Log.w("SmartiflySearch", "LIVE remote search failed: ${it.message}")
                    emptyList()
                }
            }

            val movieDeferred = async {
                runCatching {
                    executeWithRetry("searchRemote:VOD") {
                        parseXtreamListRaw(
                            service.getMoviesRaw(
                                creds.username,
                                creds.password,
                                categoryId = null
                            ),
                            XtreamMovie::class.java,
                            listOf("vod_streams", "movies", "vod")
                        ).mapNotNull { movie ->
                            if (matchesSearchQuery(movie.name, normalized)) {
                                movie.toDomain()
                            } else {
                                null
                            }
                        }
                    }
                }.getOrElse {
                    android.util.Log.w("SmartiflySearch", "VOD remote search failed: ${it.message}")
                    emptyList()
                }
            }

            val seriesDeferred = async {
                runCatching {
                    executeWithRetry("searchRemote:SERIES") {
                        parseXtreamListRaw(
                            service.getSeriesRaw(
                                creds.username,
                                creds.password,
                                categoryId = null
                            ),
                            XtreamSeries::class.java,
                            listOf("series", "series_list")
                        ).mapNotNull { series ->
                            if (matchesSearchQuery(series.name, normalized)) {
                                series.toDomain()
                            } else {
                                null
                            }
                        }
                    }
                }.getOrElse {
                    android.util.Log.w("SmartiflySearch", "SERIES remote search failed: ${it.message}")
                    emptyList()
                }
            }

            rankSearchResults(
                query = normalized,
                items = liveDeferred.await() + movieDeferred.await() + seriesDeferred.await()
            ).take(limit)
        }
    }

    suspend fun getRandomSearchCatalogItems(type: String, limit: Int): List<MovieMetadata> {
        val providerKey = getPortalCapabilityKey()
        return streamDao.getRandomStreamsByType(providerKey, streamTypeFor(type), limit).map { entity ->
            if (entity.streamType == "live") entity.toDomainLive().toSearchCard() else entity.toDomainMovie()
        }
    }

    // ==========================================
    // CORE DATA FETCHING (OFFLINE-FIRST)
    // ==========================================

    override fun getLiveCategories(): Flow<NetworkResult<List<MediaCategory>>> = flow {
        emit(NetworkResult.Loading)
        val providerKey = getPortalCapabilityKey()
        val syncNeeded = shouldSync(providerKey, "CATEGORY", "LIVE", CATEGORY_SCOPE_KEY, categorySyncTtlMs)
        val syncError = runCatching {
            if (syncNeeded) {
                syncCategories(providerKey, "LIVE")
            }
        }
            .exceptionOrNull()
            ?.also { if (it is RuntimeException) logSyncFailure("LIVE sync failed", it) }
        emitAll(categoryDao.getCategoriesByType(providerKey, "LIVE").map { entities ->
            if (entities.isEmpty()) {
                when {
                    syncError != null -> NetworkResult.Error(NetworkErrorMapper.toUserMessage(syncError), syncError)
                    !syncNeeded -> offlineCacheUnavailableResult()
                    else -> NetworkResult.Success(emptyList())
                }
            } else {
                NetworkResult.Success(entities.map { it.toDomain() })
            }
        })
    }.flowOn(Dispatchers.IO)

    override fun getLiveFavorites(): Flow<NetworkResult<List<LiveStream>>> = flow {
        emit(NetworkResult.Loading)
        val providerKey = getPortalCapabilityKey()
        emitAll(
            streamDao.getFavoritesByType(providerKey, "live").map { entities ->
                NetworkResult.Success(entities.map { it.toDomainLive() })
            }
        )
    }.flowOn(Dispatchers.IO)

    override fun getVodCategories(): Flow<NetworkResult<List<MediaCategory>>> = flow {
        emit(NetworkResult.Loading)
        val providerKey = getPortalCapabilityKey()
        val syncNeeded = shouldSync(providerKey, "CATEGORY", "VOD", CATEGORY_SCOPE_KEY, categorySyncTtlMs)
        val syncError = runCatching {
            if (syncNeeded) {
                syncCategories(providerKey, "VOD")
            }
        }
            .exceptionOrNull()
            ?.also { if (it is RuntimeException) logSyncFailure("VOD sync failed", it) }
        emitAll(categoryDao.getCategoriesByType(providerKey, "VOD").map { entities ->
            if (entities.isEmpty()) {
                when {
                    syncError != null -> NetworkResult.Error(NetworkErrorMapper.toUserMessage(syncError), syncError)
                    !syncNeeded -> offlineCacheUnavailableResult()
                    else -> NetworkResult.Success(emptyList())
                }
            } else {
                NetworkResult.Success(entities.map { it.toDomain() })
            }
        })
    }.flowOn(Dispatchers.IO)

    override fun getSeriesCategoriesCached(): Flow<NetworkResult<List<MediaCategory>>> = flow {
        emit(NetworkResult.Loading)
        val providerKey = getPortalCapabilityKey()
        val syncNeeded = shouldSync(providerKey, "CATEGORY", "SERIES", CATEGORY_SCOPE_KEY, categorySyncTtlMs)
        val syncError = runCatching {
            if (syncNeeded) {
                syncCategories(providerKey, "SERIES")
            }
        }
            .exceptionOrNull()
            ?.also { if (it is RuntimeException) logSyncFailure("SERIES sync failed", it) }
        emitAll(categoryDao.getCategoriesByType(providerKey, "SERIES").map { entities ->
            if (entities.isEmpty()) {
                when {
                    syncError != null -> NetworkResult.Error(NetworkErrorMapper.toUserMessage(syncError), syncError)
                    !syncNeeded -> offlineCacheUnavailableResult()
                    else -> NetworkResult.Success(emptyList())
                }
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
            syncSemaphore.withPermit {
            val creds = getCreds()
            val service = getService()
            val rawCategories = executeWithRetry("syncCategories:$type") {
                when (type) {
                "LIVE" -> parseXtreamListRaw(
                    service.getLiveCategoriesRaw(creds.username, creds.password),
                    XtreamCategory::class.java,
                    listOf("categories", "live_categories")
                )
                "VOD" -> parseXtreamListRaw(
                    service.getMovieCategoriesRaw(creds.username, creds.password),
                    XtreamCategory::class.java,
                    listOf("categories", "vod_categories")
                )
                "SERIES" -> parseXtreamListRaw(
                    service.getSeriesCategoriesRaw(creds.username, creds.password),
                    XtreamCategory::class.java,
                    listOf("categories", "series_categories")
                )
                else -> emptyList()
                }
            }
            val entities = rawCategories.map { it.toEntity(providerKey = providerKey, type = type) }

            database.withTransaction {
                categoryDao.clearCategoriesByType(providerKey, type)
                categoryDao.insertCategories(entities)
            }
            syncStateDao.upsert(
                SyncStateEntity(
                    providerKey = providerKey,
                    domain = "CATEGORY",
                    type = type,
                    categoryId = CATEGORY_SCOPE_KEY,
                    lastAttemptAtMs = attemptAt,
                    lastSuccessAtMs = System.currentTimeMillis(),
                    itemCount = entities.size,
                    lastError = null
                )
            )
            android.util.Log.d("SmartiflyData", "$type Categories SYNCED to Room (${entities.size} items)")
            }
        } catch (e: Throwable) {
            val previous = syncStateDao.getState(providerKey, "CATEGORY", type, CATEGORY_SCOPE_KEY)
            syncStateDao.upsert(
                SyncStateEntity(
                    providerKey = providerKey,
                    domain = "CATEGORY",
                    type = type,
                    categoryId = CATEGORY_SCOPE_KEY,
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
                when {
                    syncError != null -> NetworkResult.Error(NetworkErrorMapper.toUserMessage(syncError), syncError)
                    !syncNeeded -> offlineCacheUnavailableResult()
                    else -> NetworkResult.Success(emptyList())
                }
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
        val scopedCategoryId = categoryId?.takeIf { it.isNotBlank() }
            ?: throw IllegalArgumentException("Live category is required")
        val creds = getCreds()
        val service = getService()
        val providerKey = getPortalCapabilityKey()
        if (page == null) {
            val raw = service.getLiveStreamsRaw(creds.username, creds.password, categoryId = scopedCategoryId)
            parseXtreamListRaw(raw, XtreamLiveStream::class.java, listOf("live_streams", "channels", "streams"))
        } else {
            val safePage = page.coerceAtLeast(1)
            val safePageSize = pageSize.coerceIn(20, 500)
            val supportsPaging = livePagingSupportByPortal[providerKey]
            if (supportsPaging == false) {
                if (safePage > 1) {
                    return@networkFlow emptyList()
                }
                val snapshotRaw = service.getLiveStreamsRaw(creds.username, creds.password, categoryId = scopedCategoryId)
                parseXtreamListRaw(
                    snapshotRaw,
                    XtreamLiveStream::class.java,
                    listOf("live_streams", "channels", "streams"),
                    maxItems = CacheBudgetPolicy.LIVE_MAX_CHANNELS_PER_CATEGORY
                )
            } else {
                val offset = (safePage - 1) * safePageSize
                val pagedRaw = service.getLiveStreamsPageRaw(
                    creds.username,
                    creds.password,
                    categoryId = scopedCategoryId,
                    page = safePage,
                    limit = safePageSize,
                    perPage = safePageSize,
                    offset = offset,
                    start = offset
                )
                val paged = parseXtreamListRaw(pagedRaw, XtreamLiveStream::class.java, listOf("live_streams", "channels", "streams"))
                val likelySnapshot = when {
                    safePage == 1 && paged.size > safePageSize -> true
                    else -> false
                }
                if (likelySnapshot) {
                    livePagingSupportByPortal[providerKey] = false
                    paged.take(CacheBudgetPolicy.LIVE_MAX_CHANNELS_PER_CATEGORY)
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
        parseXtreamListRaw(
            getService().getMovieCategoriesRaw(creds.username, creds.password),
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
                when {
                    syncError != null -> NetworkResult.Error(NetworkErrorMapper.toUserMessage(syncError), syncError)
                    !syncNeeded -> offlineCacheUnavailableResult()
                    else -> NetworkResult.Success(emptyList())
                }
            } else {
                NetworkResult.Success(entities.map { it.toDomainMovie() })
            }
        })
    }.flowOn(Dispatchers.IO)

    override fun getMovies(categoryId: String?, page: Int?): Flow<NetworkResult<List<XtreamMovie>>> = networkFlow {
        val scopedCategoryId = categoryId?.takeIf { it.isNotBlank() }
            ?: throw IllegalArgumentException("Movie category is required")
        val creds = getCreds()
        val service = getService()
        if (page != null) {
            val raw = service.getMoviesPageRaw(creds.username, creds.password, categoryId = scopedCategoryId, page = page)
            parseXtreamListRaw(raw, XtreamMovie::class.java, listOf("vod_streams", "movies", "vod"))
        } else {
            val raw = service.getMoviesRaw(creds.username, creds.password, categoryId = scopedCategoryId)
            parseXtreamListRaw(raw, XtreamMovie::class.java, listOf("vod_streams", "movies", "vod"))
        }
    }

    fun getMovies(categoryId: String): Flow<NetworkResult<List<XtreamMovie>>> = getMovies(categoryId = categoryId, page = null)

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
                when {
                    syncError != null -> NetworkResult.Error(NetworkErrorMapper.toUserMessage(syncError), syncError)
                    !syncNeeded -> offlineCacheUnavailableResult()
                    else -> NetworkResult.Success(emptyList())
                }
            } else {
                NetworkResult.Success(entities.map { it.toDomainMovie() })
            }
        })
    }.flowOn(Dispatchers.IO)

    override suspend fun setLiveFavorite(streamId: String, isFavorite: Boolean) {
        val numericStreamId = streamId.toIntOrNull() ?: return
        val providerKey = getPortalCapabilityKey()
        streamDao.setFavorite(providerKey, "live", numericStreamId, isFavorite)
    }

    override suspend fun isLiveFavorite(streamId: String): Boolean {
        val numericStreamId = streamId.toIntOrNull() ?: return false
        val providerKey = getPortalCapabilityKey()
        return streamDao.isFavorite(providerKey, "live", numericStreamId)
    }

    private suspend fun syncStreams(
        providerKey: String,
        categoryId: String,
        type: String,
        maxItemsOverride: Int? = null,
        exhaustive: Boolean = false
    ) {
        val syncKey = "STREAM:$providerKey:$type:$categoryId"
        if (!tryAcquireSync(syncKey)) {
            android.util.Log.d("SmartiflyData", "Skipping duplicate stream sync for $type category=$categoryId")
            return
        }
        val attemptAt = System.currentTimeMillis()
        try {
            syncSemaphore.withPermit {
            val previous = syncStateDao.getState(providerKey, "STREAM", type, categoryId)
            val creds = getCreds()
            val service = getService()
            val streamType = streamTypeFor(type)
            val favoriteIds = streamDao.getFavoriteStreamIdsByType(providerKey, streamType).toSet()
            val entities = executeWithRetry("syncStreams:$type:$categoryId") {
                val syncCap = maxItemsOverride ?: CacheBudgetPolicy.streamSyncMaxItemsPerCategory(type)
                fetchStreamEntities(
                    service = service,
                    creds = creds,
                    providerKey = providerKey,
                    categoryId = categoryId,
                    type = type,
                    limit = syncCap,
                    exhaustive = exhaustive,
                    favoriteIds = favoriteIds
                )
            }

            if (entities.isEmpty() && (previous?.itemCount ?: 0) > 0) {
                val consecutiveEmptyResponses = nextPreservedEmptyStreak(previous?.lastError)
                if (shouldPreserveCacheOnEmptyResponse(previous)) {
                    syncStateDao.upsert(
                        SyncStateEntity(
                            providerKey = providerKey,
                            domain = "STREAM",
                            type = type,
                            categoryId = categoryId,
                            lastAttemptAtMs = attemptAt,
                            lastSuccessAtMs = previous?.lastSuccessAtMs ?: 0L,
                            itemCount = previous?.itemCount ?: 0,
                            lastError = "empty_response_preserved_cache:count=$consecutiveEmptyResponses"
                        )
                    )
                    android.util.Log.w(
                        "SmartiflyData",
                        "$type Streams EMPTY response for category=$categoryId; preserving existing cache (${previous?.itemCount ?: 0} items) streak=$consecutiveEmptyResponses"
                    )
                    return
                }

                syncStateDao.upsert(
                    SyncStateEntity(
                        providerKey = providerKey,
                        domain = "STREAM",
                        type = type,
                        categoryId = categoryId,
                        lastAttemptAtMs = attemptAt,
                        lastSuccessAtMs = System.currentTimeMillis(),
                        itemCount = 0,
                        lastError = null
                    )
                )
                android.util.Log.i(
                    "SmartiflyData",
                    "$type Streams EMPTY response accepted for category=$categoryId after streak=$consecutiveEmptyResponses; clearing stale cache"
                )
            }

            database.withTransaction {
                streamDao.clearStreamsByCategory(providerKey, streamType, categoryId)
                insertStreamsChunked(entities)
            }
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
            android.util.Log.d(
                "SmartiflyData",
                "$type Streams SYNCED to Room category=$categoryId (${entities.size} items) downshift_level=${RuntimeDownshiftManager.currentLevel()} downshift_scale=${RuntimeDownshiftManager.currentScale()}"
            )
            }
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
        val scopedCategoryId = categoryId?.takeIf { it.isNotBlank() }
            ?: throw IllegalArgumentException("Series category is required")
        val creds = getCreds()
        val service = getService()
        if (page != null) {
            val raw = service.getSeriesPageRaw(creds.username, creds.password, categoryId = scopedCategoryId, page = page)
            parseXtreamListRaw(raw, XtreamSeries::class.java, listOf("series", "series_list"))
        } else {
            val raw = service.getSeriesRaw(creds.username, creds.password, categoryId = scopedCategoryId)
            parseXtreamListRaw(raw, XtreamSeries::class.java, listOf("series", "series_list"))
        }
    }

    fun getSeries(categoryId: String): Flow<NetworkResult<List<XtreamSeries>>> = getSeries(categoryId = categoryId, page = null)

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
            } catch (e: Exception) {
                if (isMalformedJsonError(e)) {
                    TelemetryManager.trackEvent(
                        "malformed_json_response",
                        mapOf("operation" to "safeApiCall", "error" to e::class.java.simpleName)
                    )
                    TelemetryManager.logError("safeApiCall: malformed_json_response", e)
                }
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
        } catch (e: Exception) {
            if (isMalformedJsonError(e)) {
                TelemetryManager.trackEvent(
                    "malformed_json_response",
                    mapOf("operation" to "networkFlow", "error" to e::class.java.simpleName)
                )
                TelemetryManager.logError("networkFlow: malformed_json_response", e)
            }
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

    private fun tryAcquireSearchWarm(key: String): Boolean {
        synchronized(searchWarmLocks) {
            if (searchWarmLocks.contains(key)) return false
            searchWarmLocks.add(key)
            return true
        }
    }

    private fun releaseSearchWarm(key: String) {
        synchronized(searchWarmLocks) {
            searchWarmLocks.remove(key)
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
        if (isMalformedJsonError(error)) {
            TelemetryManager.trackEvent(
                "malformed_json_response",
                mapOf("operation" to prefix, "error" to (error::class.java.simpleName))
            )
            TelemetryManager.logError("$prefix: malformed_json_response", error)
        }
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

    private fun isMalformedJsonError(error: Throwable): Boolean {
        var current: Throwable? = error
        while (current != null) {
            if (current is EOFException) return true
            val message = current.message?.lowercase().orEmpty()
            if (message.contains("end of input") || message.contains("malformed json")) return true
            current = current.cause
        }
        return false
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
        possibleKeys: List<String> = emptyList(),
        maxItems: Int = Int.MAX_VALUE
    ): List<T> {
        return XtreamListParser.parse(raw, clazz, possibleKeys, maxItems)
    }

    private fun <T> parseXtreamListRaw(
        rawBody: ResponseBody,
        clazz: Class<T>,
        possibleKeys: List<String> = emptyList(),
        maxItems: Int = Int.MAX_VALUE
    ): List<T> {
        return XtreamStreamingListParser.parse(rawBody, clazz, possibleKeys, maxItems)
    }

    private fun streamTypeFor(contentType: String): String {
        return when (contentType) {
            "LIVE" -> "live"
            "VOD" -> "movie"
            "SERIES" -> "series"
            else -> contentType.lowercase()
        }
    }

    private suspend fun warmTypeForSearch(providerKey: String, type: String) {
        val shouldHydrateGlobal = shouldSync(providerKey, "WARMUP", type, SEARCH_GLOBAL_SCOPE_KEY, searchWarmTtlMs)
        if (!shouldHydrateGlobal) return

        val attemptAt = System.currentTimeMillis()
        val previous = syncStateDao.getState(providerKey, "WARMUP", type, SEARCH_GLOBAL_SCOPE_KEY)
        try {
            val creds = getCreds()
            val service = getService()
            val streamType = streamTypeFor(type)
            val maxItems = CacheBudgetPolicy.searchGlobalMaxItems(type)
            val favoriteIds = streamDao.getFavoriteStreamIdsByType(providerKey, streamType).toSet()
            val entities = executeWithRetry("searchWarm:$type") {
                when (type) {
                    "LIVE" -> parseXtreamListRaw(
                        service.getLiveStreamsRaw(
                            creds.username,
                            creds.password,
                            categoryId = null
                        ),
                        XtreamLiveStream::class.java,
                        listOf("live_streams", "channels", "streams"),
                        maxItems = maxItems
                    ).map { stream ->
                        stream.toEntity(providerKey).let { entity ->
                            if (entity.streamId in favoriteIds) entity.copy(isFavorite = true) else entity
                        }
                    }
                    "VOD" -> parseXtreamListRaw(
                        service.getMoviesRaw(
                            creds.username,
                            creds.password,
                            categoryId = null
                        ),
                        XtreamMovie::class.java,
                        listOf("vod_streams", "movies", "vod"),
                        maxItems = maxItems
                    ).map { stream ->
                        stream.toEntity(providerKey).let { entity ->
                            if (entity.streamId in favoriteIds) entity.copy(isFavorite = true) else entity
                        }
                    }
                    "SERIES" -> parseXtreamListRaw(
                        service.getSeriesRaw(
                            creds.username,
                            creds.password,
                            categoryId = null
                        ),
                        XtreamSeries::class.java,
                        listOf("series", "series_list"),
                        maxItems = maxItems
                    ).map { stream ->
                        stream.toEntity(providerKey).let { entity ->
                            if (entity.streamId in favoriteIds) entity.copy(isFavorite = true) else entity
                        }
                    }
                    else -> emptyList()
                }
            }

            database.withTransaction {
                streamDao.clearStreamsByType(providerKey, streamType)
                insertStreamsChunked(entities)
            }

            syncStateDao.upsert(
                SyncStateEntity(
                    providerKey = providerKey,
                    domain = "WARMUP",
                    type = type,
                    categoryId = SEARCH_GLOBAL_SCOPE_KEY,
                    lastAttemptAtMs = attemptAt,
                    lastSuccessAtMs = System.currentTimeMillis(),
                    itemCount = entities.size,
                    lastError = null
                )
            )
        } catch (error: Throwable) {
            syncStateDao.upsert(
                SyncStateEntity(
                    providerKey = providerKey,
                    domain = "WARMUP",
                    type = type,
                    categoryId = SEARCH_GLOBAL_SCOPE_KEY,
                    lastAttemptAtMs = attemptAt,
                    lastSuccessAtMs = previous?.lastSuccessAtMs ?: 0L,
                    itemCount = previous?.itemCount ?: 0,
                    lastError = error.message
                )
            )

            if (shouldSync(providerKey, "CATEGORY", type, CATEGORY_SCOPE_KEY, categorySyncTtlMs)) {
                syncCategories(providerKey, type)
            }
            val categories = categoryDao.getCategoriesByType(providerKey, type).first()
            val searchCap = CacheBudgetPolicy.searchSyncMaxItemsPerCategory(type)
            for (category in categories) {
                val shouldHydrate = shouldSync(providerKey, "STREAM", type, category.categoryId, searchWarmTtlMs)
                if (shouldHydrate) {
                    syncStreams(
                        providerKey = providerKey,
                        categoryId = category.categoryId,
                        type = type,
                        maxItemsOverride = searchCap,
                        exhaustive = true
                    )
                }
            }
        }
    }

    private suspend fun fetchStreamEntities(
        service: XtreamService,
        creds: XtreamCredentials,
        providerKey: String,
        categoryId: String,
        type: String,
        limit: Int,
        exhaustive: Boolean,
        favoriteIds: Set<Int>
    ): List<com.smartifly.tv.data.local.entities.StreamEntity> {
        return when (type) {
            "LIVE" -> fetchPagedEntities(
                limit = limit,
                pageFetcher = { page, pageSize ->
                    parseXtreamListRaw(
                        service.getLiveStreamsPageRaw(
                            creds.username,
                            creds.password,
                            categoryId = categoryId,
                            page = page,
                            limit = pageSize,
                            perPage = pageSize,
                            offset = (page - 1) * pageSize,
                            start = (page - 1) * pageSize
                        ),
                        XtreamLiveStream::class.java,
                        listOf("live_streams", "channels", "streams"),
                        maxItems = pageSize
                    ).map { stream ->
                        stream.toEntity(providerKey).let { entity ->
                            if (entity.streamId in favoriteIds) entity.copy(isFavorite = true) else entity
                        }
                    }
                },
                exhaustive = exhaustive
            )
            "VOD" -> fetchPagedEntities(
                limit = limit,
                pageFetcher = { page, pageSize ->
                    parseXtreamListRaw(
                        service.getMoviesPageRaw(
                            creds.username,
                            creds.password,
                            categoryId = categoryId,
                            page = page,
                            limit = pageSize
                        ),
                        XtreamMovie::class.java,
                        listOf("vod_streams", "movies", "vod"),
                        maxItems = pageSize
                    ).map { stream ->
                        stream.toEntity(providerKey).let { entity ->
                            if (entity.streamId in favoriteIds) entity.copy(isFavorite = true) else entity
                        }
                    }
                },
                exhaustive = exhaustive
            )
            "SERIES" -> fetchPagedEntities(
                limit = limit,
                pageFetcher = { page, pageSize ->
                    parseXtreamListRaw(
                        service.getSeriesPageRaw(
                            creds.username,
                            creds.password,
                            categoryId = categoryId,
                            page = page,
                            limit = pageSize
                        ),
                        XtreamSeries::class.java,
                        listOf("series", "series_list"),
                        maxItems = pageSize
                    ).map { stream ->
                        stream.toEntity(providerKey).let { entity ->
                            if (entity.streamId in favoriteIds) entity.copy(isFavorite = true) else entity
                        }
                    }
                },
                exhaustive = exhaustive
            )
            else -> emptyList()
        }
    }

    private suspend fun fetchPagedEntities(
        limit: Int,
        exhaustive: Boolean,
        pageFetcher: suspend (page: Int, pageSize: Int) -> List<com.smartifly.tv.data.local.entities.StreamEntity>
    ): List<com.smartifly.tv.data.local.entities.StreamEntity> {
        if (!exhaustive) {
            return pageFetcher(1, limit)
        }

        val results = ArrayList<com.smartifly.tv.data.local.entities.StreamEntity>(limit.coerceAtMost(512))
        val seenKeys = HashSet<String>()
        var page = 1
        val pageSize = limit.coerceAtMost(200)

        while (results.size < limit) {
            val remaining = limit - results.size
            val requestSize = remaining.coerceAtMost(pageSize)
            val pageItems = pageFetcher(page, requestSize)
            if (pageItems.isEmpty()) break

            var appended = 0
            pageItems.forEach { entity ->
                val key = "${entity.streamType}|${entity.categoryId}|${entity.streamId}"
                if (seenKeys.add(key)) {
                    results.add(entity)
                    appended++
                }
            }

            if (pageItems.size < requestSize || appended == 0) break
            page++
        }

        return results
    }

    private fun escapeSqlLike(value: String): String {
        return value
            .replace("\\", "\\\\")
            .replace("%", "\\%")
            .replace("_", "\\_")
    }

    private fun normalizeSearchKey(value: String): String {
        return value.lowercase().filter { it.isLetterOrDigit() }
    }

    private fun matchesSearchQuery(title: String, normalizedQuery: String): Boolean {
        val titleLower = title.lowercase()
        if (titleLower.contains(normalizedQuery)) return true
        val compactTitle = normalizeSearchKey(titleLower)
        val compactQuery = normalizeSearchKey(normalizedQuery)
        if (compactQuery.isEmpty()) return false
        return compactTitle.contains(compactQuery)
    }

    private fun rankSearchResults(query: String, items: List<MovieMetadata>): List<MovieMetadata> {
        val compactQuery = normalizeSearchKey(query)
        return items
            .distinctBy { "${it.type}|${it.id}" }
            .sortedWith(
                compareBy<MovieMetadata> { item ->
                    val title = item.title.trim().lowercase()
                    val compactTitle = normalizeSearchKey(title)
                    when {
                        title == query -> 0
                        compactQuery.isNotEmpty() && compactTitle == compactQuery -> 1
                        title.startsWith(query) -> 2
                        compactQuery.isNotEmpty() && compactTitle.startsWith(compactQuery) -> 3
                        title.contains(" $query") -> 4
                        compactQuery.isNotEmpty() && compactTitle.contains(compactQuery) -> 5
                        else -> 6
                    }
                }.thenBy { item ->
                    when (item.type) {
                        "live" -> 0
                        "movie" -> 1
                        else -> 2
                    }
                }.thenBy { it.title.lowercase() }
            )
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
        val now = System.currentTimeMillis()
        if (shouldSkipSyncForRecentFailure(state, now)) return false
        if (state.lastSuccessAtMs <= 0L) return true
        return now - state.lastSuccessAtMs > ttlMs
    }

    private fun <T> offlineCacheUnavailableResult(): NetworkResult<T> {
        return cooldownCacheMissResult()
    }

    private suspend fun insertStreamsChunked(
        entities: List<com.smartifly.tv.data.local.entities.StreamEntity>
    ) {
        if (entities.isEmpty()) return
        entities.chunked(STREAM_DB_INSERT_CHUNK_SIZE).forEach { chunk ->
            streamDao.insertStreams(chunk)
        }
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
        val previous = syncStateDao.getState(providerKey, "WARMUP", domain, WARMUP_SCOPE_KEY)
        val success = status.equals("SUCCESS", ignoreCase = true) || status.equals("PARTIAL", ignoreCase = true)
        syncStateDao.upsert(
            SyncStateEntity(
                providerKey = providerKey,
                domain = "WARMUP",
                type = domain.uppercase(),
                categoryId = WARMUP_SCOPE_KEY,
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

private fun LiveStream.toSearchCard(): MovieMetadata {
    return MovieMetadata(
        id = id,
        title = name,
        description = "",
        year = "",
        rating = "",
        duration = "",
        posterUrl = logoUrl,
        backdropUrl = logoUrl,
        type = "live",
        categoryId = categoryId,
        genre = "Live"
    )
}

