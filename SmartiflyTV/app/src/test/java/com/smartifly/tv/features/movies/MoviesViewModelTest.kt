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
import java.util.concurrent.atomic.AtomicReference

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

    @Test
    fun `portal key change invalidates category cache`() = runTest {
        val categories = listOf(MediaCategory(id = "100", name = "Action"))
        val fake = FakeMoviesDataSource(
            categories = flowOf(NetworkResult.Success(categories)),
            moviesByCategory = mapOf(
                "100" to listOf(
                    MovieMetadata(
                        id = "1",
                        title = "First Payload",
                        description = "desc",
                        year = "2026",
                        rating = "8.0",
                        duration = "120m",
                        posterUrl = "p1",
                        backdropUrl = "b1"
                    )
                )
            )
        )
        val vm = MoviesViewModel(fake)
        advanceUntilIdle()
        val firstFetchCount = fake.cachedFetchCalls

        vm.loadMoviesByCategory("100")
        advanceUntilIdle()
        assertEquals(firstFetchCount, fake.cachedFetchCalls)

        fake.portalKeyRef.set("NEW-PORTAL|http://new-host")
        fake.moviesByCategoryRef.set(
            mapOf(
                "100" to listOf(
                    MovieMetadata(
                        id = "2",
                        title = "Second Payload",
                        description = "desc",
                        year = "2026",
                        rating = "8.0",
                        duration = "120m",
                        posterUrl = "p2",
                        backdropUrl = "b2"
                    )
                )
            )
        )

        vm.loadMoviesByCategory("100")
        advanceUntilIdle()
        assertTrue(fake.cachedFetchCalls > firstFetchCount)

        val state = vm.uiState.value as MoviesUiState.Success
        assertEquals("Second Payload", state.movies.first().title)
    }

    private class FakeMoviesDataSource(
        private val categories: Flow<NetworkResult<List<MediaCategory>>> = flowOf(NetworkResult.Loading),
        private val moviesByCategory: Map<String, List<MovieMetadata>> = emptyMap(),
        private val defaultMovieResult: NetworkResult<List<MovieMetadata>> = NetworkResult.Success(emptyList()),
        val portalKeyRef: AtomicReference<String> = AtomicReference("SMARTIFLY-01|http://server"),
        val moviesByCategoryRef: AtomicReference<Map<String, List<MovieMetadata>>> = AtomicReference(moviesByCategory)
    ) : MoviesDataSource {
        var cachedFetchCalls: Int = 0
            private set

        override suspend fun getPortalCapabilityKey(): String = portalKeyRef.get()

        override fun getVodCategories(): Flow<NetworkResult<List<MediaCategory>>> = categories

        override fun getMoviesCached(categoryId: String): Flow<NetworkResult<List<MovieMetadata>>> {
            cachedFetchCalls++
            val payload = moviesByCategoryRef.get()[categoryId]
            return if (payload != null) flowOf(NetworkResult.Success(payload)) else flowOf(defaultMovieResult)
        }

        override fun getMovies(categoryId: String?, page: Int?): Flow<NetworkResult<List<XtreamMovie>>> {
            val payload = if (categoryId == null) {
                moviesByCategoryRef.get().values.flatten()
            } else {
                moviesByCategoryRef.get()[categoryId].orEmpty()
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
