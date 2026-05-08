package com.smartifly.tv.core.network

import com.smartifly.tv.core.config.AppConfig
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object NetworkClientFactory {
    private fun newHttpClient(timeoutMs: Long): OkHttpClient {
        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BASIC
        }

        return OkHttpClient.Builder()
            .connectTimeout(timeoutMs, TimeUnit.MILLISECONDS)
            .readTimeout(timeoutMs, TimeUnit.MILLISECONDS)
            .writeTimeout(timeoutMs, TimeUnit.MILLISECONDS)
            .addInterceptor(logging)
            .build()
    }

    fun backendRetrofit(): Retrofit {
        return Retrofit.Builder()
            .baseUrl(AppConfig.BACKEND_BASE_URL)
            .client(newHttpClient(AppConfig.BACKEND_TIMEOUT_MS))
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    fun masterRetrofit(): Retrofit {
        return Retrofit.Builder()
            .baseUrl(AppConfig.MASTER_BASE_URL)
            .client(newHttpClient(AppConfig.MASTER_TIMEOUT_MS))
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    fun xtreamHttpClient(): OkHttpClient {
        return newHttpClient(AppConfig.XTREAM_TIMEOUT_MS)
    }
}
