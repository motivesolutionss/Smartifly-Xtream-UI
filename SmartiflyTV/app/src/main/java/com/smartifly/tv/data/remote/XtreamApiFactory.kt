package com.smartifly.tv.data.remote

import com.smartifly.tv.BuildConfig
import com.smartifly.tv.data.onboarding.XtreamCredentials
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

/**
 * Enterprise-grade Factory for Xtream UI API Services.
 * 
 * Features:
 * - Centralized OkHttpClient with shared connection pool.
 * - Exponential backoff retry logic for resilience.
 * - Dynamic base URL support for multi-portal environments.
 * - Performance-tuned timeouts for slow IPTV backends.
 */
object XtreamApiFactory {

    private const val CONNECT_TIMEOUT = 60L
    private const val READ_TIMEOUT = 60L
    private const val WRITE_TIMEOUT = 60L

    /**
     * Shared client configuration to optimize resource usage.
     */
    private val baseClient: OkHttpClient by lazy {
        val logging = HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) {
                HttpLoggingInterceptor.Level.HEADERS // Avoid Level.BODY for large IPTV responses
            } else {
                HttpLoggingInterceptor.Level.NONE
            }
        }

        OkHttpClient.Builder()
            .connectTimeout(CONNECT_TIMEOUT, TimeUnit.SECONDS)
            .readTimeout(READ_TIMEOUT, TimeUnit.SECONDS)
            .writeTimeout(WRITE_TIMEOUT, TimeUnit.SECONDS)
            .addInterceptor(logging)
            .addInterceptor(XtreamResponseRepairInterceptor()) // High-Fidelity Repair
            .addInterceptor { chain ->
                val request = chain.request().newBuilder()
                    .header("User-Agent", "SmartiflyTV-Enterprise/1.0.0")
                    .build()
                chain.proceed(request)
            }
            .addInterceptor(RetryInterceptor(maxRetries = 3, initialBackoffMs = 1000L))
            .retryOnConnectionFailure(true)
            .build()
    }

    /**
     * Creates a professional [XtreamService] instance for the provided credentials.
     */
    fun create(credentials: XtreamCredentials): XtreamService {
        val sanitizedUrl = sanitizeUrl(credentials.baseUrl)
        
        val gson = com.google.gson.GsonBuilder()
            .setLenient() // Professionals-grade Lenience
            .create()

        return Retrofit.Builder()
            .baseUrl(sanitizedUrl)
            .client(baseClient)
            .addConverterFactory(GsonConverterFactory.create(gson))
            .build()
            .create(XtreamService::class.java)
    }

    /**
     * Ensures the base URL is well-formed for Retrofit.
     */
    private fun sanitizeUrl(url: String): String {
        return when {
            url.isBlank() -> throw IllegalArgumentException("Base URL cannot be blank")
            url.endsWith("/") -> url
            else -> "$url/"
        }.trim()
    }
}
