package com.smartifly.tv.data.remote

import android.annotation.SuppressLint
import android.content.Context
import com.smartifly.tv.BuildConfig
import com.smartifly.tv.data.SessionManager

@SuppressLint("StaticFieldLeak")
object ApiClient {
    private val baseUrl: String
        get() = SmartiflyRetrofitFactory.sanitizeUrl(BuildConfig.API_BASE_URL)

    lateinit var sessionManager: SessionManager
        private set

    fun init(context: Context) {
        this.sessionManager = SessionManager(context.applicationContext)
    }

    val api: SmartiflyApi by lazy {
        val client = SmartiflyHttpClientFactory.create(
            debug = BuildConfig.DEBUG,
            includeResponseRepair = true
        )
        SmartiflyRetrofitFactory.createService(
            baseUrl = baseUrl,
            client = client,
            serviceClass = SmartiflyApi::class.java
        )
    }
}
