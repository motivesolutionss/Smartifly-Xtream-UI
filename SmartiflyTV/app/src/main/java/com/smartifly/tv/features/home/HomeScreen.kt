package com.smartifly.tv.features.home

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import com.smartifly.tv.BuildConfig
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.material3.Icon
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.Text
import com.smartifly.tv.data.models.MovieMetadata
import com.smartifly.tv.data.models.UserProfile
import com.smartifly.tv.navigation.Destination
import com.smartifly.tv.performance.PrefetchBudgetController
import com.smartifly.tv.performance.PrefetchOrchestrator
import com.smartifly.tv.performance.RowPrefetchManager
import com.smartifly.tv.performance.lowend.DeviceTier
import com.smartifly.tv.performance.lowend.LocalPerformanceConfig
import com.smartifly.tv.ui.theme.Dimensions
import com.smartifly.tv.ui.theme.SmartiflyTheme

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun HomeScreen(
    viewModel: HomeViewModel,
    profileId: String,
    profiles: List<UserProfile> = emptyList(),
    selectedProfile: UserProfile? = null,
    onProfileSelected: (UserProfile) -> Unit = {},
    navBarFocusRequester: androidx.compose.ui.focus.FocusRequester? = null,
    screenContentFocusRequester: androidx.compose.ui.focus.FocusRequester? = null,
    onHeroVisibilityChanged: (Boolean) -> Unit = {},
    onMovieClick: (MovieMetadata) -> Unit,
    onPlayClick: (MovieMetadata) -> Unit,
    onSearchClick: () -> Unit = {},
    onSettingsClick: () -> Unit = {},
    onNavigationClick: (Destination) -> Unit = {}
) {
    val context = LocalContext.current
    val uiState by viewModel.uiState.collectAsState()
    val config = LocalPerformanceConfig.current
    val prefetchManager = remember(context) { PrefetchOrchestrator.manager(context) }
    var homeScreenLoadStartedAtMs by remember { mutableStateOf(System.currentTimeMillis()) }
    var homeSuccessLogged by remember { mutableStateOf(false) }

    LaunchedEffect(uiState) {
        if (uiState is HomeUiState.Loading && (uiState as HomeUiState.Loading).heroMovie == null) {
            homeScreenLoadStartedAtMs = System.currentTimeMillis()
            homeSuccessLogged = false
        } else if (!homeSuccessLogged && uiState is HomeUiState.Success) {
            val success = uiState as HomeUiState.Success
            if (BuildConfig.LIVE_DEBUG_TRACE) {
                android.util.Log.i(
                    "SmartiflyHomePerf",
                    "home_ui_success profile=$profileId duration_ms=${System.currentTimeMillis() - homeScreenLoadStartedAtMs} hero_present=${success.heroMovie != null} sections=${success.sections.size} first_section=${success.sections.firstOrNull()?.title ?: "none"} first_items=${success.sections.firstOrNull()?.items?.size ?: 0}"
                )
            }
            homeSuccessLogged = true
        }
    }

    SmartiflyTheme {
        var atmosphereColor by rememberAtmosphereColor()
        val animatedAtmosphere by animateColorAsState(
            targetValue = atmosphereColor,
            animationSpec = tween(1000),
            label = "homeAtmosphere"
        )

        HomeScreenShell(atmosphereColor = animatedAtmosphere, tier = config.tier) {
            when (val state = uiState) {
                is HomeUiState.Loading -> {
                    PrimeHeroImage(
                        heroMovie = state.heroMovie,
                        prefetchManager = prefetchManager
                    )
                    HomeLoadingState()
                }
                is HomeUiState.Success -> {
                    val focusPrefetchEnabled = rememberFocusPrefetchEnabled(state.sections)
                    PrimeHeroImage(
                        heroMovie = state.heroMovie,
                        prefetchManager = prefetchManager
                    )
                    PrimeHomeAboveFold(
                        sections = state.sections,
                        prefetchManager = prefetchManager,
                        tier = config.tier
                    )
                    HomeContent(
                        heroMovie = state.heroMovie,
                        heroCarousel = state.heroCarousel,
                        sections = state.sections,
                        isDegraded = state.isDegraded,
                        profileId = profileId,
                        profiles = profiles,
                        selectedProfile = selectedProfile,
                        onProfileSelected = onProfileSelected,
                        prefetchManager = prefetchManager,
                        focusPrefetchEnabled = focusPrefetchEnabled,
                        navBarFocusRequester = navBarFocusRequester,
                        screenContentFocusRequester = screenContentFocusRequester,
                        onHeroVisibilityChanged = onHeroVisibilityChanged,
                        onMovieClick = onMovieClick,
                        onPlayClick = onPlayClick,
                        onSearchClick = onSearchClick,
                        onSettingsClick = onSettingsClick,
                        onAtmosphereChange = { color -> atmosphereColor = color },
                        onNavigationClick = onNavigationClick
                    )
                }
                is HomeUiState.Error -> HomeErrorState(message = state.message)
                else -> Unit
            }
        }
    }
}

@Composable
private fun PrimeHeroImage(
    heroMovie: MovieMetadata?,
    prefetchManager: RowPrefetchManager
) {
    LaunchedEffect(heroMovie?.id, heroMovie?.backdropUrl, heroMovie?.posterUrl) {
        prefetchManager.primeHeroImage(heroMovie, debugTag = "home_hero")
    }
}

@Composable
private fun PrimeHomeAboveFold(
    sections: List<HomeSection>,
    prefetchManager: RowPrefetchManager,
    tier: DeviceTier
) {
    LaunchedEffect(sections, tier) {
        if (sections.isEmpty()) return@LaunchedEffect
        if (!PrefetchBudgetController.allowAboveFold(PrefetchBudgetController.Screen.HOME)) return@LaunchedEffect
        val (criticalRails, criticalItems, nearItems, warmItems) = when (tier) {
            DeviceTier.LOW -> listOf(1, 2, 3, 4)
            DeviceTier.MEDIUM -> listOf(1, 3, 4, 6)
            DeviceTier.HIGH -> listOf(1, 4, 6, 8)
        }
        prefetchManager.primeHomeAboveFold(
            sections = sections.map { it.items },
            maxRails = 2,
            itemsPerRail = nearItems,
            criticalRails = criticalRails,
            criticalItemsPerRail = criticalItems,
            warmItemsPerRail = warmItems,
            debugTag = "home_above_fold"
        )
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun rememberAtmosphereColor(): androidx.compose.runtime.MutableState<Color> {
    val primary = MaterialTheme.colorScheme.primary
    return remember(primary) { mutableStateOf(primary) }
}

@Composable
private fun rememberFocusPrefetchEnabled(sections: List<HomeSection>): Boolean {
    return remember(sections) {
        sections.any { it.items.isNotEmpty() } &&
            PrefetchBudgetController.allowFocusPrefetch(PrefetchBudgetController.Screen.HOME)
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun HomeScreenShell(
    atmosphereColor: Color,
    tier: DeviceTier,
    content: @Composable () -> Unit
) {
    val ambientTransition = rememberInfiniteTransition(label = "homeAmbientGlow")
    val glowRadius by if (tier == DeviceTier.HIGH) {
        ambientTransition.animateFloat(
            initialValue = 2000f,
            targetValue = 2800f,
            animationSpec = infiniteRepeatable(
                animation = tween(15000, easing = LinearEasing),
                repeatMode = RepeatMode.Reverse
            ),
            label = "glowRadius"
        )
    } else {
        remember { mutableStateOf(2400f) }
    }
    val glowCenterX by if (tier == DeviceTier.HIGH) {
        ambientTransition.animateFloat(
            initialValue = -120f,
            targetValue = 120f,
            animationSpec = infiniteRepeatable(
                animation = tween(18000, easing = LinearEasing),
                repeatMode = RepeatMode.Reverse
            ),
            label = "glowCenterX"
        )
    } else {
        remember { mutableStateOf(0f) }
    }
    val glowCenterY by if (tier == DeviceTier.HIGH) {
        ambientTransition.animateFloat(
            initialValue = -120f,
            targetValue = 120f,
            animationSpec = infiniteRepeatable(
                animation = tween(21000, easing = LinearEasing),
                repeatMode = RepeatMode.Reverse
            ),
            label = "glowCenterY"
        )
    } else {
        remember { mutableStateOf(0f) }
    }

    androidx.compose.foundation.layout.Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        if (tier != DeviceTier.LOW) {
            androidx.compose.foundation.layout.Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.radialGradient(
                            colors = listOf(
                                atmosphereColor.copy(alpha = 0.28f),
                                atmosphereColor.copy(alpha = 0.05f),
                                Color.Transparent
                            ),
                            center = Offset(glowCenterX, glowCenterY),
                            radius = glowRadius
                        )
                    )
            )
        }
        content()
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun HomeLoadingState() {
    Column(modifier = Modifier.fillMaxSize().padding(Dimensions.PaddingExtraLarge)) {
        com.smartifly.tv.ui.components.base.ShimmerHeroBanner()
        Spacer(modifier = Modifier.height(Dimensions.RowSpacing))
        repeat(2) {
            Row {
                repeat(6) {
                    com.smartifly.tv.ui.components.base.ShimmerPosterCard()
                    Spacer(modifier = Modifier.width(Dimensions.ItemSpacing))
                }
            }
            Spacer(modifier = Modifier.height(Dimensions.RowSpacing))
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun HomeErrorState(message: String) {
    androidx.compose.foundation.layout.Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(
                com.smartifly.tv.ui.theme.SmartiflyIcons.Error,
                contentDescription = null,
                tint = Color.Red,
                modifier = Modifier.padding(bottom = Dimensions.PaddingMedium)
            )
            Text(
                text = message,
                color = Color.White,
                style = MaterialTheme.typography.headlineSmall
            )
        }
    }
}
