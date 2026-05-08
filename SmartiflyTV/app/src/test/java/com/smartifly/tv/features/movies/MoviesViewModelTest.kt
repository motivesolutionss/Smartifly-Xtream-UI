package com.smartifly.tv.features.movies

import com.smartifly.tv.data.models.UserProfile
import com.smartifly.tv.data.remote.dto.ContentDto
import com.smartifly.tv.data.repository.ContentRepository
import com.smartifly.tv.testutil.FakeSmartiflyApi
import com.smartifly.tv.testutil.MainDispatcherRule
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import java.io.IOException

@OptIn(ExperimentalCoroutinesApi::class)
class MoviesViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private val profile = UserProfile(id = "p1", name = "Adult", avatarUrl = "", isKids = false)

    @Test
    fun `emits Success when movies load`() = runTest {
        val api = FakeSmartiflyApi(
            onGetMovies = {
                listOf(
                    ContentDto("m1", "Movie 1", "desc", "2025", "PG", "90m", "p", "b", null)
                )
            }
        )
        val vm = MoviesViewModel(ContentRepository(api), profile)
        val emissions = mutableListOf<MoviesUiState>()
        val collectJob = backgroundScope.launch { vm.uiState.collect { emissions.add(it) } }
        runCurrent()
        vm.loadMovies()
        advanceUntilIdle()

        val state = vm.uiState.value
        assertTrue(state is MoviesUiState.Success)
        state as MoviesUiState.Success
        assertEquals(1, state.movies.size)
        assertEquals("m1", state.movies.first().id)
        assertTrue(emissions.isNotEmpty())
        assertTrue(emissions.last() is MoviesUiState.Success)
        collectJob.cancel()
    }

    @Test
    fun `emits Error with mapped message on failure`() = runTest {
        val api = FakeSmartiflyApi(onGetMovies = { throw IOException("offline") })
        val vm = MoviesViewModel(ContentRepository(api), profile)
        val emissions = mutableListOf<MoviesUiState>()
        val collectJob = backgroundScope.launch { vm.uiState.collect { emissions.add(it) } }
        runCurrent()
        vm.loadMovies()
        advanceUntilIdle()

        val state = vm.uiState.value
        assertTrue(state is MoviesUiState.Error)
        state as MoviesUiState.Error
        assertEquals("Network unavailable. Please check your internet connection.", state.message)
        assertTrue(emissions.isNotEmpty())
        assertTrue(emissions.last() is MoviesUiState.Error)
        collectJob.cancel()
    }
}
