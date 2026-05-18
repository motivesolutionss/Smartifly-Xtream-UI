package com.smartifly.tv.features.details

import com.smartifly.tv.data.remote.NetworkResult
import com.smartifly.tv.data.remote.models.XtreamMovie
import com.smartifly.tv.data.remote.models.XtreamMovieData
import com.smartifly.tv.data.remote.models.XtreamMovieInfo
import com.smartifly.tv.data.remote.models.XtreamMovieTechnicalData
import com.smartifly.tv.data.remote.models.XtreamSeries
import com.smartifly.tv.data.remote.models.XtreamSeriesInfo
import com.smartifly.tv.data.repository.ContentDetailsDataSource
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
class ContentDetailsViewModelTest {
    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun `movie success maps details and filters current item from similar`() = runTest {
        val fake = FakeContentDetailsDataSource(
            movieInfo = NetworkResult.Success(
                XtreamMovieInfo(
                    info = XtreamMovieData(
                        name = "Movie A",
                        plot = "Story",
                        releaseDate = "2024-01-01",
                        rating = "8.1",
                        genre = "Action"
                    ),
                    movieData = XtreamMovieTechnicalData(streamId = 100)
                )
            ),
            movies = listOf(
                XtreamMovie(name = "Movie A", streamId = 100, categoryId = "cat-1"),
                XtreamMovie(name = "Movie B", streamId = 101, categoryId = "cat-1")
            )
        )

        val vm = ContentDetailsViewModel(
            repository = fake,
            contentId = "100",
            contentType = "movie",
            categoryId = "cat-1",
            metadataEnricher = { _, _, _ -> null }
        )
        advanceUntilIdle()

        val state = vm.uiState.value
        assertTrue(state is ContentDetailsUiState.Success)
        state as ContentDetailsUiState.Success
        assertEquals("Movie A", state.details.title)
        assertEquals("movie", state.details.type)
        assertEquals(1, state.similarContent.size)
        assertEquals("101", state.similarContent.first().id)
    }

    @Test
    fun `movie info error sets error state`() = runTest {
        val fake = FakeContentDetailsDataSource(
            movieInfo = NetworkResult.Error("Info failed")
        )

        val vm = ContentDetailsViewModel(
            repository = fake,
            contentId = "200",
            contentType = "movie",
            categoryId = null,
            metadataEnricher = { _, _, _ -> null }
        )
        advanceUntilIdle()

        val state = vm.uiState.value
        assertTrue(state is ContentDetailsUiState.Error)
        assertEquals("Info failed", (state as ContentDetailsUiState.Error).message)
    }

    private class FakeContentDetailsDataSource(
        private val movieInfo: NetworkResult<XtreamMovieInfo> = NetworkResult.Error("not configured"),
        private val seriesInfo: NetworkResult<XtreamSeriesInfo> = NetworkResult.Error("not configured"),
        private val movies: List<XtreamMovie> = emptyList(),
        private val series: List<XtreamSeries> = emptyList()
    ) : ContentDetailsDataSource {
        override suspend fun getMovieInfo(vodId: Int): NetworkResult<XtreamMovieInfo> = movieInfo

        override suspend fun getSeriesInfo(seriesId: Int): NetworkResult<XtreamSeriesInfo> = seriesInfo

        override fun getMovies(categoryId: String?, page: Int?): Flow<NetworkResult<List<XtreamMovie>>> {
            return flowOf(NetworkResult.Success(movies))
        }

        override fun getSeries(categoryId: String?, page: Int?): Flow<NetworkResult<List<XtreamSeries>>> {
            return flowOf(NetworkResult.Success(series))
        }
    }
}
