package com.smartifly.tv.features.details

import com.smartifly.tv.data.remote.dto.CastMemberDto
import com.smartifly.tv.data.remote.dto.ContentDetailsDto
import com.smartifly.tv.testutil.FakeSmartiflyApi
import com.smartifly.tv.testutil.MainDispatcherRule
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import retrofit2.HttpException
import retrofit2.Response

@OptIn(ExperimentalCoroutinesApi::class)
class ContentDetailsViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun `emits Success when details load`() = runTest {
        val details = ContentDetailsDto(
            id = "m42",
            title = "Movie 42",
            description = "desc",
            year = "2026",
            rating = "PG",
            duration = "95m",
            posterUrl = "https://cdn/p.jpg",
            backdropUrl = "https://cdn/b.jpg",
            genres = listOf("Drama"),
            cast = listOf(CastMemberDto("John", "Lead", null)),
            trailerUrl = null,
            similar = emptyList()
        )

        val api = FakeSmartiflyApi(onGetContentDetails = { details })

        val viewModel = ContentDetailsViewModel(api, contentId = "m42")
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertTrue(state is ContentDetailsUiState.Success)
        state as ContentDetailsUiState.Success
        assertEquals("m42", state.details.id)
    }

    @Test
    fun `emits mapped Error when api returns 404`() = runTest {
        val api = FakeSmartiflyApi(
            onGetContentDetails = {
                throw HttpException(
                    Response.error<String>(
                        404,
                        "not found".toResponseBody("text/plain".toMediaType())
                    )
                )
            }
        )

        val viewModel = ContentDetailsViewModel(api, contentId = "missing")
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertTrue(state is ContentDetailsUiState.Error)
        state as ContentDetailsUiState.Error
        assertEquals("Requested content was not found.", state.message)
    }
}
