package com.smartifly.tv.features.home

import com.smartifly.tv.data.ResumeWatchingDataSource
import com.smartifly.tv.data.WatchProgress
import com.smartifly.tv.data.hero.HomeHeroEnricher
import com.smartifly.tv.data.hero.HomeHeroSelector
import com.smartifly.tv.data.models.LiveStream
import com.smartifly.tv.data.models.MediaCategory
import com.smartifly.tv.data.models.MovieMetadata
import com.smartifly.tv.data.remote.NetworkResult
import com.smartifly.tv.data.repository.HomeAnalyticsDataSource
import com.smartifly.tv.data.repository.HomeDataSource
import com.smartifly.tv.performance.lowend.DeviceTier
import com.smartifly.tv.performance.lowend.PerformanceConfig
import com.smartifly.tv.testutil.MainDispatcherRule
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class HomeViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun `home builds mandatory rails when sources return content`() = runTest {
        val data = FakeHomeDataSource(
            vodCategories = listOf(MediaCategory(id = "v1", name = "Action")),
            seriesCategories = listOf(MediaCategory(id = "s1", name = "Drama")),
            liveCategories = listOf(MediaCategory(id = "l1", name = "News")),
            moviesByCategory = mapOf(
                "v1" to listOf(movie(id = "m1", title = "Movie One", type = "movie", categoryId = "v1"))
            ),
            seriesByCategory = mapOf(
                "s1" to listOf(movie(id = "s10", title = "Series One", type = "series", categoryId = "s1"))
            ),
            liveByCategory = mapOf(
                "l1" to listOf(
                    LiveStream(
                        id = "l100",
                        name = "Live One",
                        logoUrl = "https://img/live1.png",
                        categoryId = "l1"
                    )
                )
            )
        )

        val vm = HomeViewModel(
            repository = data,
            resumeRepository = FakeResumeWatchingDataSource(emptyList()),
            analyticsRepository = FakeHomeAnalyticsDataSource(),
            heroRepository = FakeHomeHeroSelector(null),
            heroEnrichmentService = FakeHomeHeroEnricher(),
            performanceConfig = PerformanceConfig.fromTier(DeviceTier.MEDIUM),
            profileId = "profile-1",
            logger = NoopHomeLogger
        )

        advanceUntilIdle()

        val state = vm.uiState.value as HomeUiState.Success
        val titles = state.sections.map { it.title }
        assertTrue(titles.contains("Live Channels"))
        assertTrue(titles.contains("Movies"))
        assertTrue(titles.contains("Series"))
    }

    @Test
    fun `home emits empty when all sources are empty`() = runTest {
        val vm = HomeViewModel(
            repository = FakeHomeDataSource(),
            resumeRepository = FakeResumeWatchingDataSource(emptyList()),
            analyticsRepository = FakeHomeAnalyticsDataSource(),
            heroRepository = FakeHomeHeroSelector(null),
            heroEnrichmentService = FakeHomeHeroEnricher(),
            performanceConfig = PerformanceConfig.fromTier(DeviceTier.MEDIUM),
            profileId = "profile-1",
            logger = NoopHomeLogger
        )

        advanceUntilIdle()
        assertEquals(HomeUiState.Empty, vm.uiState.value)
    }

    private class FakeHomeDataSource(
        private val vodCategories: List<MediaCategory> = emptyList(),
        private val seriesCategories: List<MediaCategory> = emptyList(),
        private val liveCategories: List<MediaCategory> = emptyList(),
        private val moviesByCategory: Map<String, List<MovieMetadata>> = emptyMap(),
        private val seriesByCategory: Map<String, List<MovieMetadata>> = emptyMap(),
        private val liveByCategory: Map<String, List<LiveStream>> = emptyMap()
    ) : HomeDataSource {
        override fun getVodCategories(): Flow<NetworkResult<List<MediaCategory>>> {
            return flowOf(NetworkResult.Success(vodCategories))
        }

        override fun getSeriesCategoriesCached(): Flow<NetworkResult<List<MediaCategory>>> {
            return flowOf(NetworkResult.Success(seriesCategories))
        }

        override fun getLiveCategories(): Flow<NetworkResult<List<MediaCategory>>> {
            return flowOf(NetworkResult.Success(liveCategories))
        }

        override fun getMoviesCached(categoryId: String): Flow<NetworkResult<List<MovieMetadata>>> {
            return flowOf(NetworkResult.Success(moviesByCategory[categoryId].orEmpty()))
        }

        override fun getSeriesCached(categoryId: String): Flow<NetworkResult<List<MovieMetadata>>> {
            return flowOf(NetworkResult.Success(seriesByCategory[categoryId].orEmpty()))
        }

        override fun getLiveStreamsCached(categoryId: String): Flow<NetworkResult<List<LiveStream>>> {
            return flowOf(NetworkResult.Success(liveByCategory[categoryId].orEmpty()))
        }
    }

    private class FakeResumeWatchingDataSource(
        private val items: List<WatchProgress>
    ) : ResumeWatchingDataSource {
        override fun getAllWatchProgress(profileId: String): Flow<List<WatchProgress>> = flowOf(items)
    }

    private class FakeHomeAnalyticsDataSource : HomeAnalyticsDataSource {
        override suspend fun getTrendingIds(): List<String> = emptyList()
        override suspend fun getSmartRows(profileId: String): List<Pair<String, List<MovieMetadata>>> = emptyList()
    }

    private class FakeHomeHeroSelector(
        private val hero: MovieMetadata?
    ) : HomeHeroSelector {
        override fun selectHomeHero(
            profileId: String,
            continueWatching: List<MovieMetadata>,
            movies: List<MovieMetadata>,
            series: List<MovieMetadata>
        ): MovieMetadata? = hero
    }

    private class FakeHomeHeroEnricher : HomeHeroEnricher {
        override suspend fun enrich(base: MovieMetadata, timeoutMs: Long): MovieMetadata? = null
    }

    private object NoopHomeLogger : HomeLogger {
        override fun i(tag: String, message: String) = Unit
    }

    private companion object {
        fun movie(
            id: String,
            title: String,
            type: String,
            categoryId: String
        ): MovieMetadata = MovieMetadata(
            id = id,
            title = title,
            description = "$title description",
            year = "2026",
            rating = "8.0",
            duration = "120m",
            posterUrl = "https://img/$id-poster.jpg",
            backdropUrl = "https://img/$id-backdrop.jpg",
            type = type,
            categoryId = categoryId
        )
    }
}
