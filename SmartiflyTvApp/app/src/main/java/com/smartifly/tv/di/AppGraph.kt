package com.smartifly.tv.di

import android.content.Context
import com.google.gson.Gson
import com.smartifly.tv.core.network.NetworkClientFactory
import com.smartifly.tv.core.download.AndroidDownloadEngine
import com.smartifly.tv.core.hardware.AndroidDeviceProvider
import com.smartifly.tv.core.update.AndroidUpdateInstaller
import com.smartifly.tv.data.local.AppPreferencesDataSource
import com.smartifly.tv.data.remote.BackendApiService
import com.smartifly.tv.data.remote.MasterApiService
import com.smartifly.tv.data.repository.DefaultAuthRepository
import com.smartifly.tv.data.remote.XtreamContentService
import com.smartifly.tv.data.repository.DefaultCatalogRepository
import com.smartifly.tv.data.repository.DefaultFavoritesRepository
import com.smartifly.tv.data.repository.DefaultDownloadsRepository
import com.smartifly.tv.data.repository.DefaultMasterControlRepository
import com.smartifly.tv.data.repository.DefaultProfileRepository
import com.smartifly.tv.data.repository.DefaultSettingsRepository
import com.smartifly.tv.data.repository.DefaultWatchHistoryRepository
import com.smartifly.tv.domain.repository.AuthRepository
import com.smartifly.tv.domain.repository.CatalogRepository
import com.smartifly.tv.domain.repository.DownloadsRepository
import com.smartifly.tv.domain.repository.FavoritesRepository
import com.smartifly.tv.domain.repository.MasterControlRepository
import com.smartifly.tv.domain.repository.ProfileRepository
import com.smartifly.tv.domain.repository.SettingsRepository
import com.smartifly.tv.domain.repository.WatchHistoryRepository
import com.smartifly.tv.domain.provider.DeviceProvider

class AppGraph(context: Context) {
    private val appContext = context.applicationContext
    private val gson = Gson()
    private val backendRetrofit = NetworkClientFactory.backendRetrofit()
    private val masterRetrofit = NetworkClientFactory.masterRetrofit()
    private val backendApi = backendRetrofit.create(BackendApiService::class.java)
    private val masterApi = masterRetrofit.create(MasterApiService::class.java)
    val preferences = AppPreferencesDataSource(appContext)
    private val downloadEngine = AndroidDownloadEngine(appContext)
    val updateInstaller = AndroidUpdateInstaller(
        context = appContext,
        httpClient = NetworkClientFactory.xtreamHttpClient(),
    )
    val deviceProvider: DeviceProvider = AndroidDeviceProvider(appContext)
    private val xtreamContentService = XtreamContentService(
        httpClient = NetworkClientFactory.xtreamHttpClient(),
        gson = gson
    )

    val masterControlRepository: MasterControlRepository = DefaultMasterControlRepository(
        masterApi = masterApi,
        backendApi = backendApi,
        deviceProvider = deviceProvider,
    )

    val authRepository: AuthRepository = DefaultAuthRepository(
        backendApi = backendApi,
        xtreamHttpClient = NetworkClientFactory.xtreamHttpClient(),
        gson = gson,
        preferences = preferences,
        masterControlRepository = masterControlRepository,
    )

    val profileRepository: ProfileRepository = DefaultProfileRepository(
        preferences = preferences
    )

    val catalogRepository: CatalogRepository = DefaultCatalogRepository(
        xtreamContentService = xtreamContentService,
        backendApi = backendApi,
        preferences = preferences,
    )

    val favoritesRepository: FavoritesRepository = DefaultFavoritesRepository(
        preferences = preferences,
        profileRepository = profileRepository,
    )

    val settingsRepository: SettingsRepository = DefaultSettingsRepository(
        preferences = preferences
    )

    val watchHistoryRepository: WatchHistoryRepository = DefaultWatchHistoryRepository(
        preferences = preferences,
        profileRepository = profileRepository,
    )

    val downloadsRepository: DownloadsRepository = DefaultDownloadsRepository(
        context = appContext,
        preferences = preferences,
        downloadEngine = downloadEngine
    )
}
