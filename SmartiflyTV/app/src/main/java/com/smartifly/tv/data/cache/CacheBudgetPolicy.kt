package com.smartifly.tv.data.cache

import com.smartifly.tv.performance.RuntimeDownshiftManager

object CacheBudgetPolicy {
    const val HOME_SNAPSHOT_TTL_MS: Long = 3 * 60 * 1000L
    const val HOME_SNAPSHOT_MAX_PROFILES: Int = 3

    const val MOVIES_MEMORY_MAX_BUCKETS: Int = 8
    const val MOVIES_CATEGORY_MAX_ITEMS: Int = 800
    const val MOVIES_PREFETCH_COUNT: Int = 0

    const val SERIES_MEMORY_MAX_BUCKETS: Int = 8
    const val SERIES_CATEGORY_MAX_ITEMS: Int = 800
    const val SERIES_PREFETCH_COUNT: Int = 0

    const val SEARCH_MOVIES_MAX_ITEMS: Int = 2_000
    const val SEARCH_SERIES_MAX_ITEMS: Int = 2_000
    const val SEARCH_RESULTS_LIMIT: Int = 250

    const val LIVE_INITIAL_PAGE_SIZE: Int = 30
    const val LIVE_PAGE_SIZE: Int = 50
    const val LIVE_MAX_CHANNELS_PER_CATEGORY: Int = 400
    const val LIVE_EPG_MAX_CHANNELS: Int = 50

    private const val BASE_STREAM_SYNC_MAX_ITEMS_PER_CATEGORY: Int = 240
    private const val BASE_LIVE_STREAM_SYNC_MAX_ITEMS_PER_CATEGORY: Int = 180
    private const val BASE_SEARCH_STREAM_SYNC_MAX_ITEMS_PER_CATEGORY: Int = 1200
    private const val BASE_SEARCH_LIVE_STREAM_SYNC_MAX_ITEMS_PER_CATEGORY: Int = 800
    private const val BASE_SEARCH_GLOBAL_MAX_ITEMS: Int = 6000
    private const val BASE_SEARCH_GLOBAL_LIVE_MAX_ITEMS: Int = 4000

    fun streamSyncMaxItemsPerCategory(): Int {
        return RuntimeDownshiftManager.scaledInt(BASE_STREAM_SYNC_MAX_ITEMS_PER_CATEGORY, min = 120)
    }

    fun streamSyncMaxItemsPerCategory(type: String): Int {
        return when (type.uppercase()) {
            "LIVE" -> RuntimeDownshiftManager.scaledInt(BASE_LIVE_STREAM_SYNC_MAX_ITEMS_PER_CATEGORY, min = 120)
            else -> streamSyncMaxItemsPerCategory()
        }
    }

    fun searchSyncMaxItemsPerCategory(type: String): Int {
        return when (type.uppercase()) {
            "LIVE" -> RuntimeDownshiftManager.scaledInt(BASE_SEARCH_LIVE_STREAM_SYNC_MAX_ITEMS_PER_CATEGORY, min = 250)
            else -> RuntimeDownshiftManager.scaledInt(BASE_SEARCH_STREAM_SYNC_MAX_ITEMS_PER_CATEGORY, min = 400)
        }
    }

    fun searchGlobalMaxItems(type: String): Int {
        return when (type.uppercase()) {
            "LIVE" -> RuntimeDownshiftManager.scaledInt(BASE_SEARCH_GLOBAL_LIVE_MAX_ITEMS, min = 1200)
            else -> RuntimeDownshiftManager.scaledInt(BASE_SEARCH_GLOBAL_MAX_ITEMS, min = 2000)
        }
    }

    fun adjustedHomeFetchItems(base: Int): Int {
        return RuntimeDownshiftManager.scaledInt(base, min = 12)
    }
}
