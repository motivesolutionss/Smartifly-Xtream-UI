package com.smartifly.tv.navigation

import android.content.Context
import androidx.compose.foundation.background
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
import com.smartifly.tv.data.models.PlaybackRequest
import com.smartifly.tv.data.models.UserProfile
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
import com.smartifly.tv.performance.PrefetchBudgetController
import com.smartifly.tv.data.warmup.CatalogWarmupOrchestrator
import com.smartifly.tv.features.home.HomeFeedSnapshotCache
import com.smartifly.tv.data.cache.SessionCacheCoordinator
import com.smartifly.tv.ui.theme.SmartiflyTheme
import com.smartifly.tv.ui.theme.fromHex
import com.smartifly.tv.ui.theme.PrimaryRed
import com.smartifly.tv.ui.components.navigation.SidebarNav
import com.smartifly.tv.ui.components.navigation.TopNav
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.foundation.layout.padding
import androidx.compose.ui.unit.dp
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

    var allProfiles by remember { mutableStateOf<List<UserProfile>>(emptyList()) }
    LaunchedEffect(selectedProfile) {
        allProfiles = try {
            profileRepository.getProfiles()
        } catch (e: Exception) {
            emptyList()
        }
    }

    // Effects & Lifecycle
    LaunchedEffect(Unit) { 
        AppInitializer.initialize(appContext, scope)
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
        }
    }

    val memoryHandler = remember { MemoryTrimHandler(appContext) }
    DisposableEffect(Unit) {
        memoryHandler.register()
        onDispose { memoryHandler.unregister() }
    }

    var currentDestination by remember { mutableStateOf(Destination.Home) }
    var selectedMovie by remember { mutableStateOf<MovieMetadata?>(null) }
    var selectedPlayback by remember { mutableStateOf<PlaybackRequest?>(null) }
    val navBarFocusRequester = remember { FocusRequester() }

    // Activation Monitoring
    val activationStatus by activationManager.activationStatus.collectAsState(initial = DeviceStatus.PENDING)
    val metadata by activationManager.deviceMetadata.collectAsState(initial = emptyMap())

    var isInitialized by remember { mutableStateOf(false) }

    LaunchedEffect(metadata["deviceId"], isInitialized, activationStatus) {
        val id = metadata["deviceId"]
        if (isInitialized && activationStatus == DeviceStatus.ACTIVATED && !id.isNullOrEmpty()) {
            remoteControlManager.startRemoteMonitoring(id)
        } else {
            remoteControlManager.stopMonitoring()
        }
    }

    LaunchedEffect(currentDestination) {
        PrefetchBudgetController.setActiveDestination(currentDestination)
    }

    val profileColor = remember(selectedProfile) {
        selectedProfile?.primaryColor?.let { fromHex(it) }
    }

    SmartiflyTheme(profileColor = profileColor) {
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
                        heroFallbackRepository = appGraph.heroBannerFallbackRepository,
                        heroRepository = appGraph.heroRepository,
                        heroEnrichmentService = appGraph.heroEnrichmentService,
                        performanceConfig = perfConfig,
                        profileId = profileId
                    )
                }
                var moviesViewModel by remember(profileId) { mutableStateOf<com.smartifly.tv.features.movies.MoviesViewModel?>(null) }
                var seriesViewModel by remember(profileId) { mutableStateOf<com.smartifly.tv.features.series.SeriesViewModel?>(null) }
                var watchlistViewModel by remember(profileId) { mutableStateOf<com.smartifly.tv.features.watchlist.WatchlistViewModel?>(null) }
                var liveViewModel by remember(profileId) { mutableStateOf<com.smartifly.tv.features.live.LiveViewModel?>(null) }
                var searchViewModel by remember(profileId) { mutableStateOf<com.smartifly.tv.features.search.SearchViewModel?>(null) }

                DisposableEffect(profileId) {
                    onDispose {
                        liveViewModel?.disposeForScreenExit()
                        moviesViewModel?.disposeForScreenExit()
                        seriesViewModel?.disposeForScreenExit()
                        liveViewModel = null
                        moviesViewModel = null
                        seriesViewModel = null
                        watchlistViewModel = null
                        searchViewModel = null
                    }
                }
                if (currentDestination == Destination.Player && selectedPlayback != null && !isInPipMode) {
                    PlayerScreen(
                        playbackRequest = selectedPlayback!!,
                        profileId = profileId,
                        repository = xtreamRepository,
                        isInPipMode = false,
                        onPlaybackRequestChange = { selectedPlayback = it },
                        onBack = { 
                            if (selectedPlayback?.type == "live") {
                                currentDestination = Destination.Live
                            } else {
                                currentDestination = Destination.Details
                            }
                        }
                    )
                } else {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(Color.Black)
                    ) {
                        // Ambient Red Glow (Top Right) for the whole app
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(
                                    androidx.compose.ui.graphics.Brush.radialGradient(
                                        colors = listOf(PrimaryRed.copy(alpha = 0.12f), Color.Transparent),
                                        center = androidx.compose.ui.geometry.Offset(x = 1600f, y = -100f),
                                        radius = 1200f
                                    )
                                )
                        )
                        // Ambient Red Glow (Bottom Left) for the whole app
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(
                                    androidx.compose.ui.graphics.Brush.radialGradient(
                                        colors = listOf(PrimaryRed.copy(alpha = 0.06f), Color.Transparent),
                                        center = androidx.compose.ui.geometry.Offset(x = -100f, y = 900f),
                                        radius = 900f
                                    )
                                )
                        )

                        // Content container
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .then(
                                     if (currentDestination != Destination.Home && currentDestination != Destination.Details) {
                                         Modifier.padding(top = 72.dp)
                                     } else {
                                         Modifier
                                     }
                                )
                        ) {
                            when (currentDestination) {
                                Destination.Home -> HomeScreen(
                                    viewModel = homeViewModel,
                                    profileId = profileId,
                                    profiles = allProfiles,
                                    selectedProfile = profile,
                                    onProfileSelected = { profilesViewModel.selectProfile(it) },
                                    navBarFocusRequester = navBarFocusRequester,
                                    onMovieClick = { 
                                        selectedMovie = it
                                        currentDestination = Destination.Details
                                    },
                                    onPlayClick = {
                                        selectedMovie = it
                                        selectedPlayback = PlaybackRequest.OnDemand(it)
                                        currentDestination = Destination.Player
                                    },
                                    onNavigationClick = { destination ->
                                        currentDestination = destination
                                    }
                                )
                                Destination.Movies -> MoviesScreen(
                                    profile = profile,
                                    viewModel = (moviesViewModel ?: com.smartifly.tv.features.movies.MoviesViewModel(
                                        appGraph.xtreamRepository
                                    ).also { moviesViewModel = it }),
                                    parentalControlManager = parentalControlManager,
                                    onMovieClick = {
                                        selectedMovie = it
                                        currentDestination = Destination.Details
                                    }
                                )
                                Destination.Series -> SeriesScreen(
                                    profile = profile,
                                    viewModel = (seriesViewModel ?: com.smartifly.tv.features.series.SeriesViewModel(
                                        appGraph.xtreamRepository
                                    ).also { seriesViewModel = it }),
                                    parentalControlManager = parentalControlManager,
                                    onSeriesClick = {
                                        selectedMovie = it
                                        currentDestination = Destination.Details
                                    }
                                )
                                Destination.Live -> LiveScreen(
                                    viewModel = (liveViewModel ?: com.smartifly.tv.features.live.LiveViewModel(
                                        appGraph.xtreamRepository
                                    ).also { liveViewModel = it }),
                                    profileId = profileId,
                                    parentalControlManager = parentalControlManager,
                                    onChannelClick = { channel ->
                                        selectedPlayback = PlaybackRequest.Live(channel)
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
                                        appGraph.resumeRepository,
                                        appGraph.xtreamRepository,
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
                                        onMovieClick = { movie -> selectedMovie = movie },
                                        onPlayClick = { _ ->
                                            selectedMovie?.let { selectedPlayback = PlaybackRequest.OnDemand(it) }
                                            currentDestination = Destination.Player
                                        },
                                        onBack = { currentDestination = Destination.Home }
                                    )
                                }
                                Destination.Settings -> SettingsScreen()
                                else -> {}
                            }
                        }

                        // Fixed top navigation capsule for non-Home Destinations
                        if (currentDestination != Destination.Home && currentDestination != Destination.Player && currentDestination != Destination.Details) {
                            TopNav(
                                selectedDestination = currentDestination,
                                onDestinationSelected = { currentDestination = it },
                                contentFocusRequester = null,
                                profiles = allProfiles,
                                selectedProfile = profile,
                                onProfileSelected = { profilesViewModel.selectProfile(it) },
                                modifier = Modifier.align(Alignment.TopCenter)
                            )
                        }
                    }
                }
            }
        }
    }
}
