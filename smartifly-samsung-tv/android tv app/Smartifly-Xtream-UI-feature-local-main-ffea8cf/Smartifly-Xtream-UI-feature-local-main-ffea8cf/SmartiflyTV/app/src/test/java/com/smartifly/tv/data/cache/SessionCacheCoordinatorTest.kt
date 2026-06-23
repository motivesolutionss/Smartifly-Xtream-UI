package com.smartifly.tv.data.cache

import com.smartifly.tv.data.image.ImageFailureMemory
import com.smartifly.tv.data.models.MovieMetadata
import com.smartifly.tv.data.repository.SearchDataSource
import com.smartifly.tv.features.home.HomeFeedSnapshot
import com.smartifly.tv.features.home.HomeFeedSnapshotCache
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Test

class SessionCacheCoordinatorTest {

    @Test
    fun `clearSessionCaches resets home snapshot image memory and search cache`() {
        val now = System.currentTimeMillis()
        HomeFeedSnapshotCache.put(
            profileId = "p1",
            snapshot = HomeFeedSnapshot(
                heroMovie = sampleMovie("1"),
                sections = emptyList(),
                storedAtMs = now
            )
        )
        val badUrl = "https://img.example.com/poster.jpg"
        ImageFailureMemory.markBad(badUrl, ttlMs = 60_000L)
        val fakeSearch = FakeSearchDataSource()

        SessionCacheCoordinator.clearSessionCaches(fakeSearch)

        assertNull(HomeFeedSnapshotCache.getFresh("p1", now))
        assertFalse(ImageFailureMemory.isBad(badUrl))
        assertEquals(1, fakeSearch.clearCount)
    }

    private class FakeSearchDataSource : SearchDataSource {
        var clearCount: Int = 0
            private set

        override suspend fun search(query: String): List<MovieMetadata> = emptyList()

        override fun clearCache() {
            clearCount++
        }
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
