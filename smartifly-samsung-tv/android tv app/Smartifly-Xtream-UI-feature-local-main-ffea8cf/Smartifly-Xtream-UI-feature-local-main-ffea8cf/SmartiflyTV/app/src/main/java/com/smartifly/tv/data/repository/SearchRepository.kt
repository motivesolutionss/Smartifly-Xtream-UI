package com.smartifly.tv.data.repository

import com.smartifly.tv.BuildConfig
import com.smartifly.tv.data.models.MovieMetadata
import com.smartifly.tv.data.models.SearchDiscoveryRow
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Enterprise-grade Repository for Global Search.
 * 
 * Orchestrates cross-content discovery across the fully hydrated
 * portal catalog using Room-backed indexed lookup.
 */
class SearchRepository(
    private val xtreamRepository: XtreamRepository,
    private val logger: SearchLogger = AndroidSearchLogger
) : SearchDataSource {
    private companion object {
        private const val IDLE_ROW_ITEM_COUNT = 10
        private const val MATCH_PREVIEW_LIMIT = 5
        private const val NO_MATCH_PROBE_LIMIT = 8
        private const val SEARCH_DATA_TAG = "SmartiflySearchData"
        private const val SEARCH_PERF_TAG = "SmartiflySearchPerf"
    }

    override suspend fun search(query: String): List<MovieMetadata> {
        return withContext(Dispatchers.IO) {
            if (query.isBlank()) return@withContext emptyList()
            val startedAtMs = System.currentTimeMillis()
            val localResults = xtreamRepository.searchCatalog(query)
            if (localResults.isNotEmpty()) {
                logger.i(
                    SEARCH_DATA_TAG,
                    "search_local_hit query=${query.trim()} count=${localResults.size} duration_ms=${System.currentTimeMillis() - startedAtMs}"
                )
                logMatchPreview("search_local_preview", query, localResults)
                return@withContext localResults
            }
            logger.i(
                SEARCH_DATA_TAG,
                "search_local_miss query=${query.trim()} duration_ms=${System.currentTimeMillis() - startedAtMs} fallback=remote"
            )
            val remoteStartedAtMs = System.currentTimeMillis()
            val remoteResults = xtreamRepository.searchCatalogRemote(query)
            logger.i(
                SEARCH_DATA_TAG,
                "search_remote_complete query=${query.trim()} count=${remoteResults.size} duration_ms=${System.currentTimeMillis() - remoteStartedAtMs}"
            )
            if (remoteResults.isNotEmpty()) {
                logMatchPreview("search_remote_preview", query, remoteResults)
            } else {
                logNoMatchProbe(query)
            }
            remoteResults
        }
    }

    override suspend fun warmSearchCatalog() {
        withContext(Dispatchers.IO) {
            val startedAtMs = System.currentTimeMillis()
            logger.i(SEARCH_PERF_TAG, "search_warmup_started")
            xtreamRepository.ensureSearchCatalogReady()
            logger.i(
                SEARCH_PERF_TAG,
                "search_warmup_complete duration_ms=${System.currentTimeMillis() - startedAtMs}"
            )
        }
    }

    override suspend fun getIdleDiscoveryRows(): List<SearchDiscoveryRow> {
        return withContext(Dispatchers.IO) {
            val movieItems = xtreamRepository.getRandomSearchCatalogItems("VOD", IDLE_ROW_ITEM_COUNT)
            val seriesItems = xtreamRepository.getRandomSearchCatalogItems("SERIES", IDLE_ROW_ITEM_COUNT)
            val liveItems = xtreamRepository.getRandomSearchCatalogItems("LIVE", IDLE_ROW_ITEM_COUNT)

            buildList {
                if (movieItems.isNotEmpty()) add(SearchDiscoveryRow("Popular Movies", movieItems))
                if (seriesItems.isNotEmpty()) add(SearchDiscoveryRow("Trending Series", seriesItems))
                if (liveItems.isNotEmpty()) add(SearchDiscoveryRow("Live Channels", liveItems))
            }
        }
    }
    
    override fun clearCache() {
    }

    private fun logMatchPreview(event: String, query: String, items: List<MovieMetadata>) {
        val preview = items
            .take(MATCH_PREVIEW_LIMIT)
            .joinToString(" | ") { item ->
                val title = item.title.ifBlank { "untitled" }
                "${item.type}:${title}"
            }
        logger.i(
            SEARCH_DATA_TAG,
            "$event query=${query.trim()} preview=$preview"
        )
    }

    private suspend fun logNoMatchProbe(query: String) {
        val trimmed = query.trim()
        if (trimmed.isEmpty()) return
        val probeToken = trimmed.split(Regex("\\s+"))
            .filter { it.isNotBlank() }
            .maxByOrNull { it.length }
            ?.lowercase()
            ?: return
        if (probeToken.length < 2) return

        val probeResults = xtreamRepository.searchCatalog(probeToken, NO_MATCH_PROBE_LIMIT)
        if (probeResults.isEmpty()) {
            logger.i(
                SEARCH_DATA_TAG,
                "search_no_match_probe query=$trimmed token=$probeToken preview=none"
            )
            return
        }

        val preview = probeResults.joinToString(" | ") { item ->
            val title = item.title.ifBlank { "untitled" }
            "${item.type}:${title}"
        }
        logger.i(
            SEARCH_DATA_TAG,
            "search_no_match_probe query=$trimmed token=$probeToken preview=$preview"
        )
    }
}

interface SearchLogger {
    fun i(tag: String, message: String)
}

object AndroidSearchLogger : SearchLogger {
    override fun i(tag: String, message: String) {
        if (BuildConfig.LIVE_DEBUG_TRACE) {
            android.util.Log.i(tag, message)
        }
    }
}
