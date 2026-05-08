package com.smartifly.tv.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Text
import com.smartifly.tv.data.ResumeWatchingRepository
import com.smartifly.tv.data.SettingsManager
import com.smartifly.tv.data.models.MovieMetadata
import com.smartifly.tv.data.remote.ApiClient
import com.smartifly.tv.data.repository.ProfileRepository
import com.smartifly.tv.data.repository.WatchlistRepository
import com.smartifly.tv.data.onboarding.DeviceStatus
import com.smartifly.tv.features.onboarding.OnboardingUiState
import com.smartifly.tv.features.details.ContentDetailsScreen
import com.smartifly.tv.features.home.HomeScreen
import com.smartifly.tv.features.home.HomeViewModel
import com.smartifly.tv.features.live.epg.EpgGridScreen
import com.smartifly.tv.features.live.epg.EpgViewModel
import com.smartifly.tv.features.movies.MoviesScreen
import com.smartifly.tv.player.PlayerScreen
import com.smartifly.tv.features.series.SeriesScreen
import com.smartifly.tv.features.settings.SettingsScreen
import com.smartifly.tv.features.profiles.ProfileSelectionScreen
import com.smartifly.tv.features.profiles.ProfilesViewModel
import com.smartifly.tv.features.search.SearchScreen
import com.smartifly.tv.features.search.SearchViewModel
import com.smartifly.tv.features.watchlist.WatchlistScreen
import com.smartifly.tv.features.watchlist.WatchlistViewModel
import com.smartifly.tv.performance.AppInitializer
import com.smartifly.tv.performance.MemoryTrimHandler
import com.smartifly.tv.ui.components.navigation.SidebarNav
import com.smartifly.tv.ui.theme.SmartiflyTheme
import com.smartifly.tv.ui.theme.ThemeMode
import android.net.Uri
import com.smartifly.tv.navigation.Destination
import kotlinx.coroutines.launch

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun SmartiflyNavGraph(
    isInPipMode: Boolean = false,
    initialIntentUri: Uri? = null
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    
    val cloudWatchlistRepo = remember { com.smartifly.tv.data.cloud.CloudWatchlistRepository() }

    val profileRepository = remember { ProfileRepository(ApiClient.api) }
    val watchlistRepository = remember { WatchlistRepository(context, cloudWatchlistRepo) }
    val resumeRepository = remember { ResumeWatchingRepository(context) }
    val contentRepository = remember { com.smartifly.tv.data.repository.ContentRepository(ApiClient.api) }
    val epgRepository = remember { com.smartifly.tv.data.epg.EpgRepository(ApiClient.api) }
    val epgSearchRepository = remember { com.smartifly.tv.data.epg.EpgSearchRepository(epgRepository) }
    val searchRepository = remember { com.smartifly.tv.data.repository.SearchRepository(ApiClient.api) }
    
    val recommendationRepository = remember { 
        com.smartifly.tv.data.repository.RecommendationRepository(
            contentRepository,
            resumeRepository,
            watchlistRepository
        ) 
    }
    
    val onboardingRepository = remember { com.smartifly.tv.data.onboarding.OnboardingRepository() }
    val activationManager = remember { com.smartifly.tv.data.onboarding.ActivationStateManager(context) }
    val remoteControlManager = remember { 
        com.smartifly.tv.data.onboarding.RemoteDeviceControlManager(onboardingRepository, activationManager, scope) 
    }
    
    val onboardingViewModel = remember { com.smartifly.tv.features.onboarding.OnboardingViewModel(onboardingRepository) }
    
    val profilesViewModel = remember { ProfilesViewModel(profileRepository) }
    val selectedProfile by profileRepository.selectedProfile.collectAsState()

    LaunchedEffect(Unit) { 
        com.smartifly.tv.performance.lowend.LowEndModeManager.initialize(context)
        AppInitializer.initialize(context, scope) 
    }
    
    val perfConfig = remember { com.smartifly.tv.performance.lowend.LowEndModeManager.getConfig() }

    LaunchedEffect(selectedProfile) {
        selectedProfile?.let { profile ->
            watchlistRepository.syncFromCloud(profile.id)
        }
    }

    val memoryHandler = remember { MemoryTrimHandler(context) }
    DisposableEffect(Unit) {
        memoryHandler.register()
        onDispose { memoryHandler.unregister() }
    }

    val settingsManager = remember { SettingsManager(context) }
    val currentTheme by settingsManager.themeMode.collectAsState(initial = ThemeMode.Metallic)
    
    var currentDestination by remember { mutableStateOf(Destination.Home) }
    var selectedMovie by remember { mutableStateOf<MovieMetadata?>(null) }

    LaunchedEffect(initialIntentUri) {
        initialIntentUri?.let { uri ->
            if (uri.scheme == "smartifly" && uri.host == "video") {
                val contentId = uri.lastPathSegment
                val contentType = uri.getQueryParameter("type") ?: "movie"
                if (!contentId.isNullOrEmpty()) {
                    // Pre-select the movie so the detail/player screen knows what to show
                    selectedMovie = MovieMetadata(
                        id = contentId,
                        title = "Loading...", // Will be updated when screen loads
                        description = "",
                        year = "",
                        rating = "",
                        duration = "",
                        posterUrl = "",
                        backdropUrl = "",
                        type = contentType
                    )
                    currentDestination = Destination.Player
                }
            }
        }
    }

    val activationStatus by activationManager.activationStatus.collectAsState(initial = DeviceStatus.PENDING)
    val metadata by activationManager.deviceMetadata.collectAsState(initial = emptyMap())

    LaunchedEffect(metadata["deviceId"]) {
        val id = metadata["deviceId"]
        if (!id.isNullOrEmpty()) {
            remoteControlManager.startRemoteMonitoring(id)
        }
    }

    SmartiflyTheme(themeMode = currentTheme) {
        CompositionLocalProvider(com.smartifly.tv.performance.lowend.LocalPerformanceConfig provides perfConfig) {
            if (activationStatus == DeviceStatus.BLOCKED) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("This device is BLOCKED. Contact your operator.", color = Color.Red)
                }
            } else if (activationStatus != DeviceStatus.ACTIVATED) {
                val onboardingState by onboardingViewModel.uiState.collectAsState()
                when (val state = onboardingState) {
                    is OnboardingUiState.Welcome -> {
                        com.smartifly.tv.features.onboarding.WelcomeScreen(
                            onExistingCustomer = { onboardingViewModel.showExistingLogin() },
                            onNewCustomer = { onboardingViewModel.startNewCustomerFlow() }
                        )
                    }
                    is OnboardingUiState.NewRegistration -> {
                        com.smartifly.tv.features.onboarding.DeviceActivationScreen(
                            activationInfo = state.info,
                            onActivationComplete = { 
                                com.smartifly.tv.analytics.TelemetryManager.trackEvent("onboarding_complete")
                                scope.launch { activationManager.saveActivation(state.info, DeviceStatus.ACTIVATED) }
                            }
                        )
                    }
                    else -> { }
                }
            } else if (selectedProfile == null) {
                ProfileSelectionScreen(
                    viewModel = profilesViewModel,
                    onProfileSelected = { profile ->
                        com.smartifly.tv.analytics.TelemetryManager.setUserContext(profile.id)
                        com.smartifly.tv.analytics.TelemetryManager.trackEvent("profile_selected", mapOf("profile_id" to profile.id, "name" to profile.name))
                    }
                )
            } else {
                val profile = selectedProfile!!
                val profileId = profile.id
                val watchlistViewModel = remember(profileId) { 
                    WatchlistViewModel(watchlistRepository, profileId) 
                }
                val homeViewModel = remember(profileId) {
                    HomeViewModel(
                        contentRepository,
                        resumeRepository,
                        recommendationRepository,
                        profile
                    )
                }
                val searchViewModel = remember(profileId) {
                    SearchViewModel(searchRepository, epgSearchRepository, profile)
                }

                if (currentDestination == Destination.Player && selectedMovie != null && !isInPipMode) {
                    PlayerScreen(
                        contentId = selectedMovie!!.id,
                        contentType = selectedMovie!!.type,
                        profileId = profileId,
                        isInPipMode = false,
                        onBack = { currentDestination = Destination.Details }
                    )
                } else if (isInPipMode && selectedMovie != null) {
                    PlayerScreen(
                        contentId = selectedMovie!!.id,
                        contentType = selectedMovie!!.type,
                        profileId = profileId,
                        isInPipMode = true,
                        onBack = { }
                    )
                } else {
                    Row(modifier = Modifier.fillMaxSize()) {
                        SidebarNav(
                            selectedDestination = currentDestination,
                            onDestinationSelected = { 
                                if (it != Destination.Settings || currentDestination != Destination.Settings) {
                                    currentDestination = it 
                                }
                            }
                        )
                        
                        Box(modifier = Modifier.weight(1f)) {
                            when (currentDestination) {
                                Destination.Home -> HomeScreen(
                                    viewModel = homeViewModel,
                                    onMovieClick = { 
                                        selectedMovie = it
                                        currentDestination = Destination.Details
                                    },
                                    onPlayClick = {
                                        selectedMovie = it
                                        currentDestination = Destination.Player
                                    }
                                )
                                Destination.Movies -> MoviesScreen(profile = profile)
                                Destination.Series -> SeriesScreen(profile = profile)
                                Destination.Live -> EpgGridScreen(viewModel = remember { EpgViewModel(epgRepository) })
                                Destination.Search -> SearchScreen(viewModel = searchViewModel)
                                Destination.Watchlist -> WatchlistScreen(viewModel = watchlistViewModel)
                                Destination.Details -> selectedMovie?.let {
                                    ContentDetailsScreen(
                                        contentId = it.id,
                                        contentType = it.type,
                                        profileId = profileId,
                                        onPlayClick = { _ -> currentDestination = Destination.Player },
                                        onBack = { currentDestination = Destination.Home }
                                    )
                                }
                                Destination.Settings -> SettingsScreen(
                                    currentTheme = currentTheme,
                                    onThemeChanged = { scope.launch { settingsManager.setThemeMode(it) } }
                                )
                                else -> {}
                            }
                        }
                    }
                }
            }
        }
    }
}
