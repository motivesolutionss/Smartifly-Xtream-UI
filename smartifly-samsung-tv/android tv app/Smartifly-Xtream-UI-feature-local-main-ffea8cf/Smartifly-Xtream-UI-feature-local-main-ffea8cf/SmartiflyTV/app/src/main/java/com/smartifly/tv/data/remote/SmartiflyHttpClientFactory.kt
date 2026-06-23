package com.smartifly.tv.data.remote

import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import java.util.concurrent.TimeUnit

object SmartiflyHttpClientFactory {
    private const val CONNECT_TIMEOUT_SECONDS = 60L
    private const val READ_TIMEOUT_SECONDS = 60L
    private const val WRITE_TIMEOUT_SECONDS = 60L

    fun create(
        debug: Boolean,
        includeResponseRepair: Boolean = true
    ): OkHttpClient {
        val logging = HttpLoggingInterceptor().apply {
            level = if (debug) HttpLoggingInterceptor.Level.HEADERS else HttpLoggingInterceptor.Level.NONE
        }

        return OkHttpClient.Builder()
            .connectTimeout(CONNECT_TIMEOUT_SECONDS, TimeUnit.SECONDS)
            .readTimeout(READ_TIMEOUT_SECONDS, TimeUnit.SECONDS)
            .writeTimeout(WRITE_TIMEOUT_SECONDS, TimeUnit.SECONDS)
            .retryOnConnectionFailure(false)
            .addInterceptor(RetryInterceptor())
            .apply {
                if (includeResponseRepair) {
                    addInterceptor(XtreamResponseRepairInterceptor())
                }
            }
            .addInterceptor { chain ->
                val request = chain.request().newBuilder()
                    .header("User-Agent", "SmartiflyTV-Enterprise/1.0.0")
                    .build()
                chain.proceed(request)
            }
            .addInterceptor(logging)
            .build()
    }
}
