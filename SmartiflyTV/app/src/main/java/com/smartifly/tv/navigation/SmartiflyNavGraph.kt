package com.smartifly.tv.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.*
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.CompositionLocalProvider
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
import com.smartifly.tv.data.repository.*
import com.smartifly.tv.data.hero.HeroEnrichmentService
import com.smartifly.tv.data.hero.HeroRepository
import com.smartifly.tv.data.onboarding.DeviceStatus
import com.smartifly.tv.features.onboarding.OnboardingUiState
import com.smartifly.tv.features.details.ContentDetailsScreen
import com.smartifly.tv.features.home.HomeScreen
import com.smartifly.tv.features.home.HomeViewModel
import com.smartifly.tv.features.live.epg.EpgGridScreen
import com.smartifly.tv.features.live.epg.EpgViewModel
import com.smartifly.tv.features.movies.MoviesScreen
import com.smartifly.tv.features.live.LiveScreen
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
import com.smartifly.tv.ui.theme.ThemeMode
import com.smartifly.tv.ui.theme.SmartiflyTheme
import com.smartifly.tv.ui.theme.fromHex
import com.smartifly.tv.ui.components.navigation.SidebarNav
import kotlinx.coroutines.launch

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun SmartiflyNavGraph(
    isInPipMode: Boolean = false
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    
    // Core Managers
    val sessionManager = ApiClient.sessionManager
    val settingsManager = remember { SettingsManager(context) }
    
    // Repositories
    val cloudWatchlistRepo = remember { com.smartifly.tv.data.cloud.CloudWatchlistRepository() }
    val profileRepository = remember { ProfileRepository(ApiClient.api, sessionManager) }
    val watchlistRepository = remember { WatchlistRepository(context, cloudWatchlistRepo) }
    val resumeRepository = remember { ResumeWatchingRepository(context, ApiClient.api) }
    val parentalControlManager = remember { com.smartifly.tv.data.repository.ParentalControlManager(ApiClient.api) }
    val database = remember { com.smartifly.tv.data.local.SmartiflyDatabase.getInstance(context) }
    val xtreamRepository = remember {
        com.smartifly.tv.data.repository.XtreamRepository(
            com.smartifly.tv.data.remote.XtreamApiFactory,
            sessionManager,
            database
        )
    }
    val epgRepository = remember { com.smartifly.tv.data.epg.EpgRepository(sessionManager) }
    val epgSearchRepository = remember { com.smartifly.tv.data.epg.EpgSearchRepository(epgRepository) }
    val searchRepository = remember { SearchRepository(xtreamRepository) }
    val analyticsRepository = remember { AnalyticsRepository(ApiClient.api) }
    val heroRepository = remember { HeroRepository() }
    val heroEnrichmentService = remember { HeroEnrichmentService(xtreamRepository) }
    
    val onboardingRepository = remember { 
        com.smartifly.tv.data.onboarding.OnboardingRepository(
            ApiClient.api,
            sessionManager
        ) 
    }
    val activationManager = remember { com.smartifly.tv.data.onboarding.ActivationStateManager(context) }
    val remoteControlManager = remember { 
        com.smartifly.tv.data.onboarding.RemoteDeviceControlManager(onboardingRepository, activationManager, scope) 
    }
    
    val onboardingViewModel = remember { com.smartifly.tv.features.onboarding.OnboardingViewModel(onboardingRepository) }
    val profilesViewModel = remember { ProfilesViewModel(profileRepository) }
    val selectedProfile by profileRepository.selectedProfile.collectAsState()

    // Effects & Lifecycle
    LaunchedEffect(Unit) { 
        com.smartifly.tv.performance.lowend.LowEndModeManager.initialize(context)
        AppInitializer.initialize(context, scope) 
    }
    
    val perfConfig = remember { com.smartifly.tv.performance.lowend.LowEndModeManager.getConfig() }

    LaunchedEffect(selectedProfile) {
        parentalControlManager.setUserId(sessionManager.getBoundUserId())
        selectedProfile?.let { profile ->
            watchlistRepository.syncFromCloud(profile.id)
            resumeRepository.syncFromCloud(profile.id)
            scope.launch { parentalControlManager.loadConfig() }
        }
    }

    val memoryHandler = remember { MemoryTrimHandler(context) }
    DisposableEffect(Unit) {
        memoryHandler.register()
        onDispose { memoryHandler.unregister() }
    }

    val currentTheme by settingsManager.themeMode.collectAsState(initial = ThemeMode.Metallic)
    
    var currentDestination by remember { mutableStateOf(Destination.Home) }
    var selectedMovie by remember { mutableStateOf<MovieMetadata?>(null) }

    // Activation Monitoring
    val activationStatus by activationManager.activationStatus.collectAsState(initial = DeviceStatus.PENDING)
    val metadata by activationManager.deviceMetadata.collectAsState(initial = emptyMap())

    LaunchedEffect(metadata["deviceId"]) {
        val id = metadata["deviceId"]
        if (!id.isNullOrEmpty()) {
            remoteControlManager.startRemoteMonitoring(id)
        }
    }

    var isInitialized by remember { mutableStateOf(false) }

    val profileColor = remember(selectedProfile) {
        selectedProfile?.primaryColor?.let { fromHex(it) }
    }

    SmartiflyTheme(themeMode = currentTheme, profileColor = profileColor) {
        CompositionLocalProvider(com.smartifly.tv.performance.lowend.LocalPerformanceConfig provides perfConfig) {
            if (!isInitialized) {
                com.smartifly.tv.features.onboarding.SplashScreen(
                    deviceId = metadata["deviceId"] ?: "unknown",
                    repository = onboardingRepository,
                    activationManager = activationManager,
                    onInitializationComplete = { _ -> isInitialized = true }
                )
            } else if (activationStatus == DeviceStatus.BLOCKED) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("This device is BLOCKED. Contact your operator.", color = Color.Red)
                }
            } else if (activationStatus != DeviceStatus.ACTIVATED) {
                val onboardingState by onboardingViewModel.uiState.collectAsState()
                when (onboardingState) {
                    is OnboardingUiState.Welcome -> {
                        com.smartifly.tv.features.onboarding.WelcomeScreen(
                            onExistingCustomer = { onboardingViewModel.showExistingLogin() },
                            onNewCustomer = { onboardingViewModel.startNewCustomerFlow() }
                        )
                    }
                    is OnboardingUiState.ExistingLogin -> {
                        val loginViewModel = remember { 
                            com.smartifly.tv.features.login.LoginViewModel(onboardingRepository) 
                        }
                        com.smartifly.tv.features.login.LoginScreen(
                            viewModel = loginViewModel,
                            onLoginSuccess = { 
                                com.smartifly.tv.analytics.TelemetryManager.trackEvent("login_complete")
                                scope.launch { activationManager.updateStatus(com.smartifly.tv.data.onboarding.DeviceStatus.ACTIVATED) } 
                            },
                            onBack = { onboardingViewModel.goBack() }
                        )
                    }
                    is OnboardingUiState.NewRegistration -> {
                        val loginViewModel = remember { 
                            com.smartifly.tv.features.login.LoginViewModel(onboardingRepository) 
                        }
                        com.smartifly.tv.features.login.RegistrationScreen(
                            viewModel = loginViewModel,
                            onRegistrationSuccess = { 
                                com.smartifly.tv.analytics.TelemetryManager.trackEvent("onboarding_complete")
                                scope.launch { activationManager.updateStatus(com.smartifly.tv.data.onboarding.DeviceStatus.ACTIVATED) }
                            },
                            onBack = { onboardingViewModel.goBack() }
                        )
                    }
                    else -> { }
                }
            } else if (selectedProfile == null) {
                ProfileSelectionScreen(
                    viewModel = profilesViewModel,
                    onProfileSelected = { profile ->
                        com.smartifly.tv.analytics.TelemetryManager.setUserContext(profile.id)
                        com.smartifly.tv.analytics.TelemetryManager.trackEvent("profile_selected", mapOf("profile_id" to profile.id))
                    }
                )
            } else {
                val profile = selectedProfile!!
                val profileId = profile.id
                val watchlistViewModel = remember(profileId) { WatchlistViewModel(watchlistRepository, profileId) }
                val homeViewModel = remember(profileId) {
                    HomeViewModel(
                        repository = xtreamRepository,
                        resumeRepository = resumeRepository,
                        analyticsRepository = analyticsRepository,
                        heroRepository = heroRepository,
                        heroEnrichmentService = heroEnrichmentService,
                        performanceConfig = perfConfig,
                        profileId = profileId
                    )
                }
                val searchViewModel = remember(profileId) {
                    SearchViewModel(searchRepository, analyticsRepository, epgSearchRepository, profile)
                }

                if (currentDestination == Destination.Player && selectedMovie != null && !isInPipMode) {
                    PlayerScreen(
                        movie = selectedMovie!!,
                        profileId = profileId,
                        isInPipMode = false,
                        onBack = { 
                            if (selectedMovie?.type == "live") {
                                currentDestination = Destination.Live
                            } else {
                                currentDestination = Destination.Details
                            }
                        }
                    )
                } else {
                    Row(modifier = Modifier.fillMaxSize()) {
                        SidebarNav(
                            selectedDestination = currentDestination,
                            onDestinationSelected = { currentDestination = it }
                        )
                        
                        Box(modifier = Modifier.weight(1f)) {
                            when (currentDestination) {
                                Destination.Home -> HomeScreen(
                                    viewModel = homeViewModel,
                                    profileId = profileId,
                                    onMovieClick = { 
                                        selectedMovie = it
                                        currentDestination = Destination.Details
                                    },
                                    onPlayClick = {
                                        selectedMovie = it
                                        currentDestination = Destination.Player
                                    }
                                )
                                Destination.Movies -> MoviesScreen(
                                    profile = profile,
                                    repository = xtreamRepository,
                                    parentalControlManager = parentalControlManager,
                                    onMovieClick = {
                                        selectedMovie = it
                                        currentDestination = Destination.Details
                                    }
                                )
                                Destination.Series -> SeriesScreen(
                                    profile = profile,
                                    repository = xtreamRepository,
                                    parentalControlManager = parentalControlManager,
                                    onSeriesClick = {
                                        selectedMovie = it
                                        currentDestination = Destination.Details
                                    }
                                )
                                Destination.Live -> LiveScreen(
                                    repository = xtreamRepository,
                                    profileId = profileId,
                                    parentalControlManager = parentalControlManager,
                                    onChannelClick = { channel ->
                                        selectedMovie = MovieMetadata(
                                            id = channel.id,
                                            title = channel.name,
                                            type = "live",
                                            posterUrl = channel.logoUrl,
                                            description = channel.currentProgram ?: "Live Broadcast",
                                            year = "",
                                            rating = "",
                                            duration = "LIVE",
                                            backdropUrl = channel.logoUrl
                                        )
                                        currentDestination = Destination.Player
                                    }
                                )
                                Destination.Search -> SearchScreen(
                                    viewModel = searchViewModel,
                                    profileId = profileId,
                                    onMovieClick = {
                                        selectedMovie = it
                                        currentDestination = Destination.Details
                                    }
                                )
                                Destination.Watchlist -> WatchlistScreen(
                                    viewModel = watchlistViewModel,
                                    onItemClick = {
                                        selectedMovie = it
                                        currentDestination = Destination.Details
                                    }
                                )
                                Destination.Details -> selectedMovie?.let {
                                    ContentDetailsScreen(
                                        contentId = it.id,
                                        contentType = it.type,
                                        categoryId = it.categoryId,
                                        profileId = profileId,
                                        repository = xtreamRepository,
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
