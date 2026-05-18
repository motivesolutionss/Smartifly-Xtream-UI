package com.smartifly.tv.features.movies

import com.smartifly.tv.data.models.MediaCategory
import com.smartifly.tv.data.models.MovieMetadata
import com.smartifly.tv.data.remote.NetworkResult
import com.smartifly.tv.data.remote.models.XtreamMovie
import com.smartifly.tv.data.repository.MoviesDataSource
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
class MoviesViewModelTest {
    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun `init loads categories and first category movies`() = runTest {
        val categories = listOf(
            MediaCategory(id = "100", name = "Action")
        )
        val moviesByCategory = mapOf(
            "100" to listOf(
                MovieMetadata(
                    id = "m-1",
                    title = "Action One",
                    description = "desc",
                    year = "2026",
                    rating = "8.0",
                    duration = "120m",
                    posterUrl = "p1",
                    backdropUrl = "b1"
                )
            )
        )
        val fake = FakeMoviesDataSource(
            categories = flowOf(NetworkResult.Success(categories)),
            moviesByCategory = moviesByCategory
        )

        val vm = MoviesViewModel(fake)
        advanceUntilIdle()

        val state = vm.uiState.value
        assertTrue(state is MoviesUiState.Success)
        state as MoviesUiState.Success
        assertEquals(listOf("All", "Action"), state.categories)
        assertEquals(1, state.movies.size)
        assertEquals("Action One", state.movies.first().title)
    }

    @Test
    fun `init emits error when categories fail`() = runTest {
        val fake = FakeMoviesDataSource(
            categories = flowOf(NetworkResult.Error("Categories failed"))
        )

        val vm = MoviesViewModel(fake)
        advanceUntilIdle()

        val state = vm.uiState.value
        assertTrue(state is MoviesUiState.Error)
        assertEquals("Categories failed", (state as MoviesUiState.Error).message)
    }

    private class FakeMoviesDataSource(
        private val categories: Flow<NetworkResult<List<MediaCategory>>> = flowOf(NetworkResult.Loading),
        private val moviesByCategory: Map<String, List<MovieMetadata>> = emptyMap(),
        private val defaultMovieResult: NetworkResult<List<MovieMetadata>> = NetworkResult.Success(emptyList())
    ) : MoviesDataSource {
        override fun getVodCategories(): Flow<NetworkResult<List<MediaCategory>>> = categories

        override fun getMoviesCached(categoryId: String): Flow<NetworkResult<List<MovieMetadata>>> {
            val payload = moviesByCategory[categoryId]
            return if (payload != null) flowOf(NetworkResult.Success(payload)) else flowOf(defaultMovieResult)
        }

        override fun getMovies(categoryId: String?, page: Int?): Flow<NetworkResult<List<XtreamMovie>>> {
            val payload = if (categoryId == null) {
                moviesByCategory.values.flatten()
            } else {
                moviesByCategory[categoryId].orEmpty()
            }
            val mapped = payload.mapIndexed { index, movie ->
                XtreamMovie(
                    num = index + 1,
                    name = movie.title,
                    streamId = movie.id.toIntOrNull() ?: (index + 1),
                    streamIcon = movie.posterUrl,
                    rating = movie.rating,
                    categoryId = categoryId ?: "0",
                    cover = movie.posterUrl,
                    coverBig = movie.backdropUrl,
                    plot = movie.description
                )
            }
            return flowOf(NetworkResult.Success(mapped))
        }
    }
}
