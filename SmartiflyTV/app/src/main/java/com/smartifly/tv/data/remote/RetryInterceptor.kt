package com.smartifly.tv.data.remote

import okhttp3.Interceptor
import okhttp3.Response
import java.io.IOException

class RetryInterceptor(
    private val maxRetries: Int = 3,
    private val initialBackoffMs: Long = 400L
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        var attempt = 0
        var backoffMs = initialBackoffMs
        var lastException: IOException? = null

        while (attempt <= maxRetries) {
            try {
                val response = chain.proceed(request)
                if (response.isSuccessful || request.method != "GET" || attempt == maxRetries) {
                    return response
                }
                response.close()
            } catch (io: IOException) {
                lastException = io
                if (request.method != "GET" || attempt == maxRetries) {
                    throw io
                }
            }

            try {
                Thread.sleep(backoffMs)
            } catch (_: InterruptedException) {
                Thread.currentThread().interrupt()
                break
            }
            backoffMs *= 2
            attempt++
        }

        throw lastException ?: IOException("Network request failed after retries")
    }
}
