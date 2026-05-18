package com.smartifly.tv.data.remote

import okhttp3.Interceptor
import okhttp3.Response
import java.io.IOException

class RetryInterceptor(
    private val maxRetries: Int = 3,
    @Suppress("unused") private val initialBackoffMs: Long = 250L,
    @Suppress("unused") private val maxBackoffMs: Long = 1200L
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        if (maxRetries <= 0) {
            return chain.proceed(chain.request())
        }
        val request = chain.request()
        var attempt = 0
        var lastException: IOException? = null

        while (attempt <= maxRetries) {
            try {
                val response = chain.proceed(request)
                val code = response.code
                val retryableHttp = code == 408 || code == 429 || code == 503 || code == 504
                if (response.isSuccessful || request.method != "GET" || !retryableHttp || attempt == maxRetries) {
                    return response
                }
                response.close()
            } catch (io: IOException) {
                lastException = io
                if (request.method != "GET" || attempt == maxRetries) {
                    throw io
                }
            }

            attempt++
        }

        throw lastException ?: IOException("Network request failed after retries")
    }
}
