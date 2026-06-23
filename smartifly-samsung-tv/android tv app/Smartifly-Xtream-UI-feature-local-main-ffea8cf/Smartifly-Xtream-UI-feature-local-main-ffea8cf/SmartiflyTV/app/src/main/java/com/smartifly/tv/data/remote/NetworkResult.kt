package com.smartifly.tv.data.remote

/**
 * Enterprise-grade wrapper for Network Responses.
 * 
 * Handles Success, Error, and Loading states with typed data.
 */
sealed class NetworkResult<out T> {
    data class Success<out T>(val data: T) : NetworkResult<T>()
    data class Error(val message: String, val exception: Throwable? = null) : NetworkResult<Nothing>()
    object Loading : NetworkResult<Nothing>()

    /**
     * Helper to transform the data if success.
     */
    fun <R> map(transform: (T) -> R): NetworkResult<R> {
        return when (this) {
            is Success -> Success(transform(data))
            is Error -> Error(message, exception)
            is Loading -> Loading
        }
    }
}
