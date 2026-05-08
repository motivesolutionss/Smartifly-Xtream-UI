package com.smartifly.tv.features.search

import com.smartifly.tv.data.models.UserProfile
import com.smartifly.tv.data.remote.dto.ContentDto
import com.smartifly.tv.data.repository.SearchRepository
import com.smartifly.tv.features.live.epg.EpgProgram
import com.smartifly.tv.testutil.FakeSmartiflyApi
import com.smartifly.tv.testutil.MainDispatcherRule
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import java.io.IOException

@OptIn(ExperimentalCoroutinesApi::class)
class SearchViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private val profile = UserProfile(id = "p1", name = "Adult", avatarUrl = "", isKids = false)

    @Test
    fun `emits Success after debounced search`() = runTest {
        val api = FakeSmartiflyApi(
            onSearch = {
                listOf(ContentDto("s1", "Search One", "desc", "2024", "PG", "95m", "p", "b", null))
            }
        )

        val vm = SearchViewModel(
            repository = SearchRepository(api),
            epgSearchRepository = com.smartifly.tv.data.epg.EpgSearchRepository(
                com.smartifly.tv.data.epg.EpgRepository(api)
            ),
            activeProfile = profile,
            searchProgramsProvider = {
                listOf(
                    EpgProgram("e1", "Search Program", 0L, 10L, channelId = "1")
                )
            }
        )

        val emissions = mutableListOf<SearchUiState>()
        val collectJob = backgroundScope.launch { vm.uiState.collect { emissions.add(it) } }
        runCurrent()

        vm.onQueryChanged("sea")
        advanceTimeBy(1000)
        runCurrent()
        advanceUntilIdle()

        val state = vm.uiState.value
        assertTrue(state is SearchUiState.Success)
        state as SearchUiState.Success
        assertEquals(1, state.results.size)
        assertEquals(1, state.epgPrograms.size)

        assertTrue(emissions.size >= 2)
        assertTrue(emissions.any { it is SearchUiState.Idle })
        assertTrue(emissions.last() is SearchUiState.Success)
        collectJob.cancel()
    }

    @Test
    fun `emits Error with mapped message on search failure`() = runTest {
        val api = FakeSmartiflyApi(onSearch = { throw IOException("offline") })

        val vm = SearchViewModel(
            repository = SearchRepository(api),
            epgSearchRepository = com.smartifly.tv.data.epg.EpgSearchRepository(
                com.smartifly.tv.data.epg.EpgRepository(api)
            ),
            activeProfile = profile,
            searchProgramsProvider = { emptyList() }
        )

        val emissions = mutableListOf<SearchUiState>()
        val collectJob = backgroundScope.launch { vm.uiState.collect { emissions.add(it) } }
        runCurrent()

        vm.onQueryChanged("query")
        advanceTimeBy(1000)
        runCurrent()
        advanceUntilIdle()

        val state = vm.uiState.value
        assertTrue(state is SearchUiState.Error)
        state as SearchUiState.Error
        assertEquals("Network unavailable. Please check your internet connection.", state.message)

        assertTrue(emissions.size >= 2)
        assertTrue(emissions.any { it is SearchUiState.Idle })
        assertTrue(emissions.last() is SearchUiState.Error)
        collectJob.cancel()
    }
}
