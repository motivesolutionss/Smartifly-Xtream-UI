package com.smartifly.tv.features.home

import com.smartifly.tv.data.WatchProgress
import com.smartifly.tv.data.models.MovieMetadata
import com.smartifly.tv.data.models.UserProfile
import com.smartifly.tv.data.remote.dto.ContentDto
import com.smartifly.tv.data.remote.dto.HomeResponse
import com.smartifly.tv.data.remote.dto.HomeSectionDto
import com.smartifly.tv.data.repository.ContentRepository
import com.smartifly.tv.testutil.FakeSmartiflyApi
import com.smartifly.tv.testutil.MainDispatcherRule
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.flowOf
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
class HomeViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private val profile = UserProfile(id = "p1", name = "Adult", avatarUrl = "", isKids = false)

    @Test
    fun `emits Success when home data loads`() = runTest {
        val hero = ContentDto("h1", "Hero", "desc", "2025", "PG", "100m", "p", "b", null)
        val api = FakeSmartiflyApi(
            onGetHomeData = {
                HomeResponse(hero = hero, sections = listOf(HomeSectionDto("Trending", emptyList())))
            }
        )

        val sections = listOf(
            HomeSection(
                title = "Recommended",
                items = listOf(
                    MovieMetadata("m1", "Movie 1", "desc", "2024", "PG", "90m", "p", "b")
                )
            )
        )

        val vm = HomeViewModel(
            repository = ContentRepository(api),
            resumeRepository = null,
            recommendationRepository = null,
            activeProfile = profile,
            watchProgressProvider = { flowOf(emptyList()) },
            personalizedHomeProvider = { _, _ -> sections }
        )
        val emissions = mutableListOf<HomeUiState>()
        val collectJob = backgroundScope.launch { vm.uiState.collect { emissions.add(it) } }
        runCurrent()
        vm.loadHomeData()
        advanceUntilIdle()

        val state = vm.uiState.value
        assertTrue(state is HomeUiState.Success)
        state as HomeUiState.Success
        assertEquals("h1", state.heroMovie.id)
        assertEquals("Recommended", state.sections.first().title)
        assertTrue(emissions.isNotEmpty())
        assertTrue(emissions.last() is HomeUiState.Success)
        collectJob.cancel()
    }

    @Test
    fun `emits Error with mapped message when home fails`() = runTest {
        val api = FakeSmartiflyApi(onGetHomeData = { throw IOException("offline") })

        val vm = HomeViewModel(
            repository = ContentRepository(api),
            resumeRepository = null,
            recommendationRepository = null,
            activeProfile = profile,
            watchProgressProvider = { flowOf(emptyList<WatchProgress>()) },
            personalizedHomeProvider = { _, _ -> emptyList() }
        )
        val emissions = mutableListOf<HomeUiState>()
        val collectJob = backgroundScope.launch { vm.uiState.collect { emissions.add(it) } }
        runCurrent()
        vm.loadHomeData()
        advanceUntilIdle()

        val state = vm.uiState.value
        assertTrue(state is HomeUiState.Error)
        state as HomeUiState.Error
        assertEquals("Network unavailable. Please check your internet connection.", state.message)
        assertTrue(emissions.isNotEmpty())
        assertTrue(emissions.last() is HomeUiState.Error)
        collectJob.cancel()
    }
}
