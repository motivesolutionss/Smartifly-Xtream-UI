package com.smartifly.tv.features.home

import com.smartifly.tv.data.models.MovieMetadata
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test

class HomeFeedSnapshotCacheTest {

    @Test
    fun `remove clears specific profile snapshot`() {
        val now = System.currentTimeMillis()
        HomeFeedSnapshotCache.put(
            profileId = "p1",
            snapshot = HomeFeedSnapshot(
                heroMovie = sampleMovie("1"),
                sections = emptyList(),
                storedAtMs = now
            )
        )
        HomeFeedSnapshotCache.put(
            profileId = "p2",
            snapshot = HomeFeedSnapshot(
                heroMovie = sampleMovie("2"),
                sections = emptyList(),
                storedAtMs = now
            )
        )

        HomeFeedSnapshotCache.remove("p1")

        assertNull(HomeFeedSnapshotCache.getFresh("p1", now))
        assertNotNull(HomeFeedSnapshotCache.getFresh("p2", now))
        HomeFeedSnapshotCache.clearAll()
    }

    @Test
    fun `clearAll resets all snapshots`() {
        val now = System.currentTimeMillis()
        HomeFeedSnapshotCache.put(
            profileId = "p1",
            snapshot = HomeFeedSnapshot(
                heroMovie = sampleMovie("1"),
                sections = emptyList(),
                storedAtMs = now
            )
        )

        HomeFeedSnapshotCache.clearAll()

        assertNull(HomeFeedSnapshotCache.getFresh("p1", now))
    }

    private fun sampleMovie(id: String): MovieMetadata {
        return MovieMetadata(
            id = id,
            title = "Movie $id",
            description = "",
            year = "2026",
            rating = "8.0",
            duration = "120m",
            posterUrl = "poster-$id",
            backdropUrl = "backdrop-$id"
        )
    }
}
