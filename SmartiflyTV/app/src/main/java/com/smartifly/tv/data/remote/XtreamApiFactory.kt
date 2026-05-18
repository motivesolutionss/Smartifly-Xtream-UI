package com.smartifly.tv.data.remote

import com.smartifly.tv.BuildConfig
import com.smartifly.tv.data.onboarding.XtreamCredentials

/**
 * Enterprise-grade Factory for Xtream UI API Services.
 * 
 * Features:
 * - Centralized OkHttpClient with shared connection pool.
 * - Repository-level coroutine retry for resilience (non-blocking).
 * - Dynamic base URL support for multi-portal environments.
 * - Performance-tuned timeouts for slow IPTV backends.
 */
object XtreamApiFactory {

    /**
     * Shared client configuration to optimize resource usage.
     */
    private val baseClient by lazy {
        SmartiflyHttpClientFactory.create(
            debug = BuildConfig.DEBUG,
            includeResponseRepair = true
        )
    }

    /**
     * Creates a professional [XtreamService] instance for the provided credentials.
     */
    fun create(credentials: XtreamCredentials): XtreamService {
        return SmartiflyRetrofitFactory.createService(
            baseUrl = credentials.baseUrl,
            client = baseClient,
            serviceClass = XtreamService::class.java,
            lenient = true
        )
    }
}
