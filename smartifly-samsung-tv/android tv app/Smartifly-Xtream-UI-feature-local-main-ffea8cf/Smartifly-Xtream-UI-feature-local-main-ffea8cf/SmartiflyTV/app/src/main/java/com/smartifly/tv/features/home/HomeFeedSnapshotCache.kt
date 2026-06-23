package com.smartifly.tv.features.home

import com.smartifly.tv.data.models.MovieMetadata
import com.smartifly.tv.data.cache.CacheBudgetPolicy
import java.util.concurrent.ConcurrentHashMap

data class HomeFeedSnapshot(
    val heroMovie: MovieMetadata?,
    val heroCarousel: List<MovieMetadata> = emptyList(),
    val sections: List<HomeSection>,
    val storedAtMs: Long
)

object HomeFeedSnapshotCache {
    private val cache = ConcurrentHashMap<String, HomeFeedSnapshot>()

    fun getFresh(profileId: String, nowMs: Long): HomeFeedSnapshot? {
        val snapshot = cache[profileId] ?: return null
        return if (nowMs - snapshot.storedAtMs <= CacheBudgetPolicy.HOME_SNAPSHOT_TTL_MS) snapshot else null
    }

    fun put(profileId: String, snapshot: HomeFeedSnapshot) {
        evictOldestIfNeeded()
        cache[profileId] = snapshot
    }

    fun remove(profileId: String) {
        cache.remove(profileId)
    }

    fun clearAll() {
        cache.clear()
    }

    private fun evictOldestIfNeeded() {
        if (cache.size < CacheBudgetPolicy.HOME_SNAPSHOT_MAX_PROFILES) return
        val oldestEntry = cache.entries.minByOrNull { it.value.storedAtMs } ?: return
        cache.remove(oldestEntry.key)
    }
}
