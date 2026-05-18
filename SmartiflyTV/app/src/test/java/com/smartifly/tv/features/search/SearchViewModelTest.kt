package com.smartifly.tv.features.search

import com.smartifly.tv.data.epg.EpgSearchDataSource
import com.smartifly.tv.data.models.MovieMetadata
import com.smartifly.tv.data.models.UserProfile
import com.smartifly.tv.data.repository.SearchDataSource
import com.smartifly.tv.data.repository.SearchSuggestionsDataSource
import com.smartifly.tv.features.live.epg.EpgProgram
import com.smartifly.tv.testutil.MainDispatcherRule
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class SearchViewModelTest {
    @get:Rule
    val mainDispatcherRule = MainDispatcherRule(StandardTestDispatcher())

    @Test
    fun `short query keeps idle suggestions`() = runTest {
        val vm = SearchViewModel(
            repository = FakeSearchDataSource(),
            analyticsRepository = FakeSuggestionsDataSource(listOf("alpha", "beta")),
            epgSearchRepository = FakeEpgSearchDataSource(),
            activeProfile = adultProfile()
        )

        advanceUntilIdle()
        vm.onQueryChanged("a")
        advanceUntilIdle()

        val state = vm.uiState.value
        assertTrue(state is SearchUiState.Idle)
        assertEquals(listOf("alpha", "beta"), (state as SearchUiState.Idle).suggestions)
    }

    @Test
    fun `query returns success with vod and epg results`() = runTest {
        val vm = SearchViewModel(
            repository = FakeSearchDataSource(
                results = listOf(
                    MovieMetadata(
                        id = "m1",
                        title = "Action Hero",
                        description = "desc",
                        year = "2026",
                        rating = "8.0",
                        duration = "120m",
                        posterUrl = "p",
                        backdropUrl = "b"
                    )
                )
            ),
            analyticsRepository = FakeSuggestionsDataSource(emptyList()),
            epgSearchRepository = FakeEpgSearchDataSource(
                programs = listOf(
                    EpgProgram(
                        id = "e1",
                        title = "Action Tonight",
                        startTime = 1L,
                        endTime = 2L,
                        channelId = "10"
                    )
                )
            ),
            activeProfile = adultProfile()
        )

        vm.onQueryChanged("action")
        advanceTimeBy(550)
        advanceUntilIdle()

        val state = vm.uiState.value
        assertTrue(state is SearchUiState.Success)
        state as SearchUiState.Success
        assertEquals(1, state.results.size)
        assertEquals("Action Hero", state.results.first().title)
        assertEquals(1, state.epgPrograms.size)
    }

    @Test
    fun `query returns empty when both sources are empty`() = runTest {
        val vm = SearchViewModel(
            repository = FakeSearchDataSource(results = emptyList()),
            analyticsRepository = FakeSuggestionsDataSource(emptyList()),
            epgSearchRepository = FakeEpgSearchDataSource(programs = emptyList()),
            activeProfile = adultProfile()
        )

        vm.onQueryChanged("zz")
        advanceTimeBy(550)
        advanceUntilIdle()

        assertTrue(vm.uiState.value is SearchUiState.Empty)
    }

    @Test
    fun `query sets error when repository throws`() = runTest {
        val vm = SearchViewModel(
            repository = FakeSearchDataSource(throwOnSearch = IllegalStateException("boom")),
            analyticsRepository = FakeSuggestionsDataSource(emptyList()),
            epgSearchRepository = FakeEpgSearchDataSource(),
            activeProfile = adultProfile()
        )

        vm.onQueryChanged("abc")
        advanceTimeBy(550)
        advanceUntilIdle()

        assertTrue(vm.uiState.value is SearchUiState.Error)
    }

    private fun adultProfile() = UserProfile(
        id = "u1",
        name = "Primary",
        avatarUrl = "",
        isKids = false
    )

    private class FakeSearchDataSource(
        private val results: List<MovieMetadata> = emptyList(),
        private val throwOnSearch: Throwable? = null
    ) : SearchDataSource {
        override suspend fun search(query: String): List<MovieMetadata> {
            throwOnSearch?.let { throw it }
            return results
        }

        override fun clearCache() = Unit
    }

    private class FakeSuggestionsDataSource(
        private val suggestions: List<String>
    ) : SearchSuggestionsDataSource {
        override suspend fun getSearchSuggestions(): List<String> = suggestions
    }

    private class FakeEpgSearchDataSource(
        private val programs: List<EpgProgram> = emptyList()
    ) : EpgSearchDataSource {
        override suspend fun searchPrograms(query: String): List<EpgProgram> = programs
    }
}
