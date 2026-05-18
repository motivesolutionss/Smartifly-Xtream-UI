package com.smartifly.tv.features.live

import com.smartifly.tv.data.models.MediaCategory
import com.smartifly.tv.data.remote.NetworkResult
import com.smartifly.tv.data.remote.models.XtreamLiveStream
import com.smartifly.tv.data.repository.LiveDataSource
import com.smartifly.tv.features.live.epg.EpgProgram
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
class LiveViewModelTest {
    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun `init loads categories and first page for first real category`() = runTest {
        val fake = FakeLiveDataSource(
            categories = flowOf(NetworkResult.Success(listOf(MediaCategory(id = "10", name = "Sports")))),
            streams = flowOf(
                NetworkResult.Success(
                    listOf(XtreamLiveStream(name = "Sports HD", streamId = 1001, categoryId = "10"))
                )
            )
        )

        val vm = LiveViewModel(fake)
        advanceUntilIdle()

        val state = vm.uiState.value
        assertTrue(state is LiveUiState.Success)
        state as LiveUiState.Success
        assertEquals("10", state.selectedCategoryId)
        assertEquals(2, state.categories.size)
        assertEquals(1, state.channels.size)
        assertEquals("Sports HD", state.channels.first().name)
    }

    @Test
    fun `init emits fatal error when category fetch fails before initialization`() = runTest {
        val fake = FakeLiveDataSource(
            categories = flowOf(NetworkResult.Error("Category fetch failed"))
        )

        val vm = LiveViewModel(fake)
        advanceUntilIdle()

        val state = vm.uiState.value
        assertTrue(state is LiveUiState.Error)
        assertEquals("Category fetch failed", (state as LiveUiState.Error).message)
    }

    private class FakeLiveDataSource(
        private val categories: Flow<NetworkResult<List<MediaCategory>>> = flowOf(NetworkResult.Loading),
        private val streams: Flow<NetworkResult<List<XtreamLiveStream>>> = flowOf(NetworkResult.Success(emptyList()))
    ) : LiveDataSource {
        override fun getLiveCategories(): Flow<NetworkResult<List<MediaCategory>>> = categories

        override fun getLiveStreams(
            categoryId: String?,
            page: Int?,
            pageSize: Int
        ): Flow<NetworkResult<List<XtreamLiveStream>>> = streams

        override fun getShortEpg(streamId: Int): Flow<NetworkResult<List<EpgProgram>>> {
            return flowOf(NetworkResult.Success(emptyList()))
        }

        override suspend fun getPortalCapabilityKey(): String = "SMARTIFLY-01|http://server"
    }
}
