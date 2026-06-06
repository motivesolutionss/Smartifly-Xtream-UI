package com.smartifly.tv.features.home

import com.smartifly.tv.data.models.MovieMetadata
import com.smartifly.tv.performance.lowend.DeviceTier
import com.smartifly.tv.performance.lowend.PerformanceConfig
import androidx.compose.ui.graphics.Color
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class HomeContentCoordinatorTest {

    private val mediumMotion = PerformanceConfig.fromTier(DeviceTier.MEDIUM).homeMotion

    @Test
    fun `resolve hero candidate falls back to first section item and copies poster into empty backdrop`() {
        val movie = movie(
            id = "m1",
            title = "Test Movie",
            posterUrl = "https://img/poster.jpg",
            backdropUrl = ""
        )

        val resolved = HomeCoordinatorMath.resolveHeroCandidate(
            heroMovie = null,
            sections = listOf(HomeSection(title = "New Movies", items = listOf(movie)))
        )

        assertNotNull(resolved)
        assertEquals("https://img/poster.jpg", resolved?.backdropUrl)
    }

    @Test
    fun `scroll phase uses hero then transition then rails thresholds`() {
        assertEquals(HomeScrollPhase.HERO, HomeCoordinatorMath.scrollPhaseFor(0.05f, mediumMotion))
        assertEquals(HomeScrollPhase.TRANSITION, HomeCoordinatorMath.scrollPhaseFor(0.20f, mediumMotion))
        assertEquals(HomeScrollPhase.RAILS, HomeCoordinatorMath.scrollPhaseFor(0.50f, mediumMotion))
    }

    @Test
    fun `hide progress clamps between zero and one`() {
        assertEquals(0f, HomeCoordinatorMath.hideProgressFor(0.01f, mediumMotion))
        assertEquals(1f, HomeCoordinatorMath.hideProgressFor(0.99f, mediumMotion))
    }

    @Test
    fun `hero visibility follows configured threshold`() {
        assertTrue(HomeCoordinatorMath.isHeroVisible(0.20f, mediumMotion))
        assertFalse(HomeCoordinatorMath.isHeroVisible(0.60f, mediumMotion))
    }

    @Test
    fun `atmosphere color prioritizes section and title heuristics`() {
        assertEquals(
            Color(0xFFE50914),
            resolveAtmosphereColor("Action Hits", movie(title = "Anything"))
        )
        assertEquals(
            Color(0xFF00D1FF),
            resolveAtmosphereColor("Library", movie(title = "Space Journey"))
        )
        assertEquals(
            Color(0xFFFFA500),
            resolveAtmosphereColor("Continue Watching", movie(title = "Drama"))
        )
    }

    private fun movie(
        id: String = "id-1",
        title: String,
        posterUrl: String = "https://img/poster.jpg",
        backdropUrl: String = "https://img/backdrop.jpg"
    ): MovieMetadata = MovieMetadata(
        id = id,
        title = title,
        description = "desc",
        year = "2026",
        rating = "8.0",
        duration = "120m",
        posterUrl = posterUrl,
        backdropUrl = backdropUrl,
        type = "movie",
        categoryId = "c1"
    )
}
