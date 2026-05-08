package com.smartifly.tv.features.live

import com.smartifly.tv.data.remote.dto.LiveCategoryDto
import com.smartifly.tv.data.remote.dto.LiveChannelDto
import com.smartifly.tv.data.repository.LiveTvRepository
import com.smartifly.tv.testutil.FakeSmartiflyApi
import com.smartifly.tv.testutil.MainDispatcherRule
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import java.io.IOException

@OptIn(ExperimentalCoroutinesApi::class)
class LiveViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun `emits Success when categories and channels load`() = runTest {
        val categories = listOf(LiveCategoryDto("cat1", "News"))
        val channels = listOf(
            LiveChannelDto(
                id = "ch1",
                name = "News One",
                logo = "https://cdn/logo.png",
                streamUrl = "https://stream/news.m3u8",
                categoryId = "cat1",
                currentProgram = "Morning",
                nextProgram = "Noon"
            )
        )

        val api = FakeSmartiflyApi(
            onGetLiveCategories = { categories },
            onGetLiveChannels = { channels }
        )

        val viewModel = LiveViewModel(LiveTvRepository(api))
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertTrue(state is LiveUiState.Success)
        state as LiveUiState.Success
        assertEquals(categories, state.categories)
        assertEquals(channels, state.channels)
    }

    @Test
    fun `emits Error with mapped message on network failure`() = runTest {
        val api = FakeSmartiflyApi(
            onGetLiveCategories = { throw IOException("offline") }
        )

        val viewModel = LiveViewModel(LiveTvRepository(api))
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertTrue(state is LiveUiState.Error)
        state as LiveUiState.Error
        assertEquals("Network unavailable. Please check your internet connection.", state.message)
    }
}
