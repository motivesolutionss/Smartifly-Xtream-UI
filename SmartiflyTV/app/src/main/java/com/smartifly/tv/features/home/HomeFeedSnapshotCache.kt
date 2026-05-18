package com.smartifly.tv.features.home

import com.smartifly.tv.data.models.MovieMetadata
import java.util.concurrent.ConcurrentHashMap

data class HomeFeedSnapshot(
    val heroMovie: MovieMetadata?,
    val sections: List<HomeSection>,
    val storedAtMs: Long
)

object HomeFeedSnapshotCache {
    private const val SNAPSHOT_TTL_MS: Long = 10 * 60 * 1000L
    private val cache = ConcurrentHashMap<String, HomeFeedSnapshot>()

    fun getFresh(profileId: String, nowMs: Long): HomeFeedSnapshot? {
        val snapshot = cache[profileId] ?: return null
        return if (nowMs - snapshot.storedAtMs <= SNAPSHOT_TTL_MS) snapshot else null
    }

    fun put(profileId: String, snapshot: HomeFeedSnapshot) {
        cache[profileId] = snapshot
    }

    fun remove(profileId: String) {
        cache.remove(profileId)
    }

    fun clearAll() {
        cache.clear()
    }
}
