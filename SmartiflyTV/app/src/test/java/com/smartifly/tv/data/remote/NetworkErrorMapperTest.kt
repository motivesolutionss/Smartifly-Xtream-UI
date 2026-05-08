package com.smartifly.tv.data.remote

import okhttp3.MediaType.Companion.toMediaType
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.Assert.assertEquals
import org.junit.Test
import retrofit2.HttpException
import retrofit2.Response
import java.io.IOException
import java.net.SocketTimeoutException

class NetworkErrorMapperTest {

    @Test
    fun `maps timeout to timeout message`() {
        val message = NetworkErrorMapper.toUserMessage(SocketTimeoutException("timeout"))
        assertEquals("Request timed out. Please try again.", message)
    }

    @Test
    fun `maps ioexception to connectivity message`() {
        val message = NetworkErrorMapper.toUserMessage(IOException("no network"))
        assertEquals("Network unavailable. Please check your internet connection.", message)
    }

    @Test
    fun `maps 401 to session expired`() {
        val message = NetworkErrorMapper.toUserMessage(httpException(401))
        assertEquals("Session expired. Please sign in again.", message)
    }

    @Test
    fun `maps 404 to content not found`() {
        val message = NetworkErrorMapper.toUserMessage(httpException(404))
        assertEquals("Requested content was not found.", message)
    }

    @Test
    fun `maps 500 to server unavailable`() {
        val message = NetworkErrorMapper.toUserMessage(httpException(500))
        assertEquals("Server is currently unavailable. Please try again later.", message)
    }

    @Test
    fun `maps unknown errors to generic message`() {
        val message = NetworkErrorMapper.toUserMessage(IllegalStateException("unexpected"))
        assertEquals("Something went wrong. Please try again.", message)
    }

    private fun httpException(code: Int): HttpException {
        val response = Response.error<String>(
            code,
            "error".toResponseBody("text/plain".toMediaType())
        )
        return HttpException(response)
    }
}
