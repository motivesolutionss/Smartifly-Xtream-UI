package com.smartifly.tv.data.remote

import retrofit2.HttpException
import java.io.IOException
import java.net.SocketTimeoutException

object NetworkErrorMapper {
    fun toUserMessage(error: Throwable): String {
        return when (error) {
            is SocketTimeoutException -> "Request timed out. Please try again."
            is IOException -> "Network unavailable. Please check your internet connection."
            is HttpException -> mapHttpCode(error.code())
            else -> "Something went wrong. Please try again."
        }
    }

    private fun mapHttpCode(code: Int): String {
        return when (code) {
            400 -> "Request could not be processed. Please try again."
            401 -> "Session expired. Please sign in again."
            403 -> "You are not authorized to access this content."
            404 -> "Requested content was not found."
            429 -> "Too many requests. Please wait and try again."
            in 500..599 -> "Server is currently unavailable. Please try again later."
            else -> "Unexpected server response. Please try again."
        }
    }
}
