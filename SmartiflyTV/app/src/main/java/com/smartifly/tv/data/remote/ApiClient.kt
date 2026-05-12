package com.smartifly.tv.data.remote

import android.annotation.SuppressLint
import android.content.Context
import com.smartifly.tv.BuildConfig
import com.smartifly.tv.data.SessionManager
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

@SuppressLint("StaticFieldLeak")
object ApiClient {
    private var context: Context? = null
    
    private val baseUrl: String
        get() = if (BuildConfig.API_BASE_URL.endsWith("/")) {
            BuildConfig.API_BASE_URL
        } else {
            "${BuildConfig.API_BASE_URL}/"
        }

    lateinit var sessionManager: SessionManager
        private set

    fun init(context: Context) {
        this.context = context.applicationContext
        this.sessionManager = SessionManager(this.context!!)
    }

    val api: SmartiflyApi by lazy {
        val logging = HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) {
                HttpLoggingInterceptor.Level.BASIC
            } else {
                HttpLoggingInterceptor.Level.NONE
            }
        }

        val client = OkHttpClient.Builder()
            .connectTimeout(20, TimeUnit.SECONDS)
            .readTimeout(25, TimeUnit.SECONDS)
            .writeTimeout(25, TimeUnit.SECONDS)
            .retryOnConnectionFailure(true)
            .addInterceptor(logging)
            .build()

        Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(SmartiflyApi::class.java)
    }
}
