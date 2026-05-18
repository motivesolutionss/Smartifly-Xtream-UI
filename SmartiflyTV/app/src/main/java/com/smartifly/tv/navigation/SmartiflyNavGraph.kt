package com.smartifly.tv.navigation

import android.content.Context
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
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Text
import com.smartifly.tv.data.models.MovieMetadata
import com.smartifly.tv.data.onboarding.DeviceStatus
import com.smartifly.tv.features.onboarding.OnboardingUiState
import com.smartifly.tv.features.details.ContentDetailsScreen
import com.smartifly.tv.features.home.HomeScreen
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
import com.smartifly.tv.features.watchlist.WatchlistScreen
import com.smartifly.tv.performance.AppInitializer
import com.smartifly.tv.performance.MemoryTrimHandler
import com.smartifly.tv.data.warmup.CatalogWarmupOrchestrator
import com.smartifly.tv.features.home.HomeFeedSnapshotCache
import com.smartifly.tv.data.cache.SessionCacheCoordinator
import com.smartifly.tv.ui.theme.ThemeMode
import com.smartifly.tv.ui.theme.SmartiflyTheme
import com.smartifly.tv.ui.theme.fromHex
import com.smartifly.tv.ui.components.navigation.SidebarNav
import kotlinx.coroutines.launch

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun SmartiflyNavGraph(
    appContext: Context,
    appGraph: AppGraph,
    isInPipMode: Boolean = false
) {
    val scope = rememberCoroutineScope()
    val sessionManager = appGraph.sessionManager
    val settingsManager = appGraph.settingsManager
    val profileRepository = appGraph.profileRepository
    val watchlistRepository = appGraph.watchlistRepository
    val resumeRepository = appGraph.resumeRepository
    val parentalControlManager = appGraph.parentalControlManager
    val xtreamRepository = appGraph.xtreamRepository
    val onboardingRepository = appGraph.onboardingRepository
    val activationManager = appGraph.activationManager
    val remoteControlManager = appGraph.remoteControlManager
    
    val onboardingViewModel = remember { com.smartifly.tv.features.onboarding.OnboardingViewModel(onboardingRepository) }
    val profilesViewModel = remember { ProfilesViewModel(profileRepository) }
    val selectedProfile by profileRepository.selectedProfile.collectAsState()
    val warmupOrchestrator = remember { CatalogWarmupOrchestrator(appGraph.xtreamRepository) }
    var previousProfileId by remember { mutableStateOf<String?>(null) }

    // Effects & Lifecycle
    LaunchedEffect(Unit) { 
        AppInitializer.initialize(appContext, scope)
        com.smartifly.tv.performance.lowend.LowEndModeManager.initialize(appContext)
    }
    
    val perfConfig = com.smartifly.tv.performance.lowend.LowEndModeManager.getConfig()

    LaunchedEffect(selectedProfile) {
        val currentProfileId = selectedProfile?.id
        if (previousProfileId != null && previousProfileId != currentProfileId) {
            HomeFeedSnapshotCache.remove(previousProfileId!!)
        }
        if (currentProfileId == null) {
            SessionCacheCoordinator.clearSessionCaches(appGraph.searchRepository)
        }
        previousProfileId = currentProfileId

        parentalControlManager.setUserId(sessionManager.getBoundUserId())
        selectedProfile?.let { profile ->
            watchlistRepository.syncFromCloud(profile.id)
            resumeRepository.syncFromCloud(profile.id)
            scope.launch { parentalControlManager.loadConfig() }
            scope.launch(kotlinx.coroutines.Dispatchers.IO) {
                warmupOrchestrator.runBackgroundWarmup()
            }
        }
    }

    val memoryHandler = remember { MemoryTrimHandler(appContext) }
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
                    warmupOrchestrator = warmupOrchestrator,
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
                val homeViewModel = remember(profileId) {
                    com.smartifly.tv.features.home.HomeViewModel(
                        repository = appGraph.xtreamRepository,
                        resumeRepository = appGraph.resumeRepository,
                        analyticsRepository = appGraph.analyticsRepository,
                        heroRepository = appGraph.heroRepository,
                        heroEnrichmentService = appGraph.heroEnrichmentService,
                        performanceConfig = perfConfig,
                        profileId = profileId
                    )
                }
                val moviesViewModel = remember(profileId) { com.smartifly.tv.features.movies.MoviesViewModel(appGraph.xtreamRepository) }
                val seriesViewModel = remember(profileId) { com.smartifly.tv.features.series.SeriesViewModel(appGraph.xtreamRepository) }

                var watchlistViewModel by remember(profileId) { mutableStateOf<com.smartifly.tv.features.watchlist.WatchlistViewModel?>(null) }
                val liveViewModel = remember(profileId) { com.smartifly.tv.features.live.LiveViewModel(appGraph.xtreamRepository) }
                var searchViewModel by remember(profileId) { mutableStateOf<com.smartifly.tv.features.search.SearchViewModel?>(null) }

                DisposableEffect(profileId) {
                    onDispose {
                        liveViewModel.disposeForScreenExit()
                        moviesViewModel.disposeForScreenExit()
                        seriesViewModel.disposeForScreenExit()
                        watchlistViewModel = null
                        searchViewModel = null
                    }
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
                                    viewModel = moviesViewModel,
                                    parentalControlManager = parentalControlManager,
                                    onMovieClick = {
                                        selectedMovie = it
                                        currentDestination = Destination.Details
                                    }
                                )
                                Destination.Series -> SeriesScreen(
                                    profile = profile,
                                    viewModel = seriesViewModel,
                                    parentalControlManager = parentalControlManager,
                                    onSeriesClick = {
                                        selectedMovie = it
                                        currentDestination = Destination.Details
                                    }
                                )
                                Destination.Live -> LiveScreen(
                                    viewModel = liveViewModel,
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
                                    viewModel = (searchViewModel ?: com.smartifly.tv.features.search.SearchViewModel(
                                        appGraph.searchRepository,
                                        appGraph.analyticsRepository,
                                        appGraph.epgSearchRepository,
                                        profile
                                    ).also { searchViewModel = it }),
                                    profileId = profileId,
                                    onMovieClick = {
                                        selectedMovie = it
                                        currentDestination = Destination.Details
                                    }
                                )
                                Destination.Watchlist -> WatchlistScreen(
                                    viewModel = (watchlistViewModel ?: com.smartifly.tv.features.watchlist.WatchlistViewModel(
                                        appGraph.watchlistRepository,
                                        profileId
                                    ).also { watchlistViewModel = it }),
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
