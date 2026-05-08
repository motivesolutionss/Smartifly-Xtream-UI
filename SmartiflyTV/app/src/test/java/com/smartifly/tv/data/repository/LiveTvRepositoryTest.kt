package com.smartifly.tv.data.repository

import com.smartifly.tv.data.remote.dto.LiveCategoryDto
import com.smartifly.tv.data.remote.dto.LiveChannelDto
import com.smartifly.tv.testutil.FakeSmartiflyApi
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Test

class LiveTvRepositoryTest {

    @Test
    fun `getCategories returns api categories`() = runTest {
        val expected = listOf(LiveCategoryDto(id = "1", name = "News"))
        val api = FakeSmartiflyApi(onGetLiveCategories = { expected })
        val repository = LiveTvRepository(api)

        val result = repository.getCategories()

        assertEquals(expected, result)
    }

    @Test
    fun `getChannels passes category id to api`() = runTest {
        val expected = listOf(
            LiveChannelDto(
                id = "c1",
                name = "Channel One",
                logo = "https://cdn/logo.png",
                streamUrl = "https://stream/live.m3u8",
                categoryId = "sports",
                currentProgram = "Now",
                nextProgram = "Next"
            )
        )

        var capturedCategory: String? = null
        val api = FakeSmartiflyApi(
            onGetLiveChannels = { categoryId ->
                capturedCategory = categoryId
                expected
            }
        )
        val repository = LiveTvRepository(api)

        val result = repository.getChannels("sports")

        assertEquals("sports", capturedCategory)
        assertEquals(expected, result)
    }
}
