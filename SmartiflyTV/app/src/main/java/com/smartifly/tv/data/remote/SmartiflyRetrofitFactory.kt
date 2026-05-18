package com.smartifly.tv.data.remote

import com.google.gson.Gson
import com.google.gson.GsonBuilder
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

object SmartiflyRetrofitFactory {
    private val defaultGson: Gson by lazy { GsonBuilder().create() }
    private val lenientGson: Gson by lazy { GsonBuilder().setLenient().create() }

    fun <T> createService(
        baseUrl: String,
        client: OkHttpClient,
        serviceClass: Class<T>,
        lenient: Boolean = false
    ): T {
        val gson = if (lenient) lenientGson else defaultGson
        return Retrofit.Builder()
            .baseUrl(sanitizeUrl(baseUrl))
            .client(client)
            .addConverterFactory(GsonConverterFactory.create(gson))
            .build()
            .create(serviceClass)
    }

    fun sanitizeUrl(url: String): String {
        val trimmed = url.trim()
        require(trimmed.isNotBlank()) { "Base URL cannot be blank" }
        return if (trimmed.endsWith("/")) trimmed else "$trimmed/"
    }
}
