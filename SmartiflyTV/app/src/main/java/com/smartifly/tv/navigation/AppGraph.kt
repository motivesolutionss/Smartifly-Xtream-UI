package com.smartifly.tv.navigation

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import kotlinx.coroutines.CoroutineScope
import com.smartifly.tv.features.home.HomeViewModel
import com.smartifly.tv.features.movies.MoviesViewModel
import com.smartifly.tv.features.search.SearchViewModel
import com.smartifly.tv.features.series.SeriesViewModel
import com.smartifly.tv.features.watchlist.WatchlistViewModel
import com.smartifly.tv.features.live.LiveViewModel
import com.smartifly.tv.performance.lowend.PerformanceConfig
import com.smartifly.tv.data.SettingsManager
import com.smartifly.tv.data.SessionManager
import com.smartifly.tv.data.ResumeWatchingRepository
import com.smartifly.tv.data.remote.SmartiflyApi
import com.smartifly.tv.data.repository.AnalyticsRepository
import com.smartifly.tv.data.repository.ParentalControlManager
import com.smartifly.tv.data.repository.ProfileRepository
import com.smartifly.tv.data.repository.SearchRepository
import com.smartifly.tv.data.repository.WatchlistRepository
import com.smartifly.tv.data.repository.XtreamRepository
import com.smartifly.tv.data.hero.HeroEnrichmentService
import com.smartifly.tv.data.hero.HeroRepository

data class AppGraph(
    val sessionManager: com.smartifly.tv.data.SessionManager,
    val settingsManager: SettingsManager,
    val cloudWatchlistRepo: com.smartifly.tv.data.cloud.CloudWatchlistRepository,
    val profileRepository: ProfileRepository,
    val watchlistRepository: WatchlistRepository,
    val resumeRepository: ResumeWatchingRepository,
    val parentalControlManager: ParentalControlManager,
    val database: com.smartifly.tv.data.local.SmartiflyDatabase,
    val xtreamRepository: XtreamRepository,
    val epgRepository: com.smartifly.tv.data.epg.EpgRepository,
    val epgSearchRepository: com.smartifly.tv.data.epg.EpgSearchRepository,
    val searchRepository: SearchRepository,
    val analyticsRepository: AnalyticsRepository,
    val heroRepository: HeroRepository,
    val heroEnrichmentService: HeroEnrichmentService,
    val onboardingRepository: com.smartifly.tv.data.onboarding.OnboardingRepository,
    val activationManager: com.smartifly.tv.data.onboarding.ActivationStateManager,
    val remoteControlManager: com.smartifly.tv.data.onboarding.RemoteDeviceControlManager
)

data class AuthenticatedScreenGraph(
    val watchlistViewModel: WatchlistViewModel,
    val liveViewModel: LiveViewModel,
    val moviesViewModel: MoviesViewModel,
    val seriesViewModel: SeriesViewModel,
    val homeViewModel: HomeViewModel,
    val searchViewModel: SearchViewModel
)

fun createAppGraph(
    context: Context,
    scope: CoroutineScope,
    sessionManager: SessionManager,
    api: SmartiflyApi
): AppGraph {
    val settingsManager = SettingsManager(context)
    val cloudWatchlistRepo = com.smartifly.tv.data.cloud.CloudWatchlistRepository()
    val profileRepository = ProfileRepository(api, sessionManager)
    val watchlistRepository = WatchlistRepository(context, cloudWatchlistRepo)
    val resumeRepository = ResumeWatchingRepository(context, api)
    val parentalControlManager = ParentalControlManager(api)
    val database = com.smartifly.tv.data.local.SmartiflyDatabase.getInstance(context)
    val xtreamRepository = XtreamRepository(
        com.smartifly.tv.data.remote.XtreamApiFactory,
        sessionManager,
        database
    )
    val epgRepository = com.smartifly.tv.data.epg.EpgRepository(sessionManager)
    val epgSearchRepository = com.smartifly.tv.data.epg.EpgSearchRepository(epgRepository)
    val searchRepository = SearchRepository(xtreamRepository)
    val analyticsRepository = AnalyticsRepository(api)
    val heroRepository = HeroRepository()
    val heroEnrichmentService = HeroEnrichmentService(xtreamRepository)
    val onboardingRepository = com.smartifly.tv.data.onboarding.OnboardingRepository(
        api,
        sessionManager
    )
    val activationManager = com.smartifly.tv.data.onboarding.ActivationStateManager(context)
    val remoteControlManager = com.smartifly.tv.data.onboarding.RemoteDeviceControlManager(
        onboardingRepository,
        activationManager,
        scope
    )

    return AppGraph(
        sessionManager = sessionManager,
        settingsManager = settingsManager,
        cloudWatchlistRepo = cloudWatchlistRepo,
        profileRepository = profileRepository,
        watchlistRepository = watchlistRepository,
        resumeRepository = resumeRepository,
        parentalControlManager = parentalControlManager,
        database = database,
        xtreamRepository = xtreamRepository,
        epgRepository = epgRepository,
        epgSearchRepository = epgSearchRepository,
        searchRepository = searchRepository,
        analyticsRepository = analyticsRepository,
        heroRepository = heroRepository,
        heroEnrichmentService = heroEnrichmentService,
        onboardingRepository = onboardingRepository,
        activationManager = activationManager,
        remoteControlManager = remoteControlManager
    )
}

@Composable
fun rememberAuthenticatedScreenGraph(
    appGraph: AppGraph,
    profile: com.smartifly.tv.data.models.UserProfile,
    perfConfig: PerformanceConfig
): AuthenticatedScreenGraph {
    val profileId = profile.id
    val watchlistViewModel = remember(profileId) { WatchlistViewModel(appGraph.watchlistRepository, profileId) }
    val liveViewModel = remember(profileId) { LiveViewModel(appGraph.xtreamRepository) }
    val moviesViewModel = remember(profileId) { MoviesViewModel(appGraph.xtreamRepository) }
    val seriesViewModel = remember(profileId) { SeriesViewModel(appGraph.xtreamRepository) }
    val homeViewModel = remember(profileId) {
        HomeViewModel(
            repository = appGraph.xtreamRepository,
            resumeRepository = appGraph.resumeRepository,
            analyticsRepository = appGraph.analyticsRepository,
            heroRepository = appGraph.heroRepository,
            heroEnrichmentService = appGraph.heroEnrichmentService,
            performanceConfig = perfConfig,
            profileId = profileId
        )
    }
    val searchViewModel = remember(profileId) {
        SearchViewModel(appGraph.searchRepository, appGraph.analyticsRepository, appGraph.epgSearchRepository, profile)
    }

    return remember(
        watchlistViewModel,
        liveViewModel,
        moviesViewModel,
        seriesViewModel,
        homeViewModel,
        searchViewModel
    ) {
        AuthenticatedScreenGraph(
            watchlistViewModel = watchlistViewModel,
            liveViewModel = liveViewModel,
            moviesViewModel = moviesViewModel,
            seriesViewModel = seriesViewModel,
            homeViewModel = homeViewModel,
            searchViewModel = searchViewModel
        )
    }
}
