package com.smartifly.tv.features.home

import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.Spring
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.Stable
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalDensity
import androidx.tv.foundation.lazy.list.TvLazyListState
import androidx.tv.foundation.lazy.list.rememberTvLazyListState
import com.smartifly.tv.data.models.MovieMetadata
import com.smartifly.tv.performance.RowPrefetchManager
import com.smartifly.tv.performance.lowend.DeviceTier
import com.smartifly.tv.performance.lowend.HomeMotionConfig
import com.smartifly.tv.performance.lowend.PerformanceConfig
import com.smartifly.tv.ui.theme.Dimensions
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private enum class HomeFocusZone {
    HERO,
    RAILS
}

internal enum class HomeScrollPhase {
    HERO,
    TRANSITION,
    RAILS
}

@Stable
internal data class HomeHeroVisualState(
    val bannerHeightPx: Float,
    val scrollPhase: HomeScrollPhase,
    val hideProgress: Float,
    val heroScale: Float,
    val heroScaleY: Float,
    val heroTranslationY: Float,
    val heroAlpha: Float,
    val heroHeight: Dp,
    val isHeroVisible: Boolean
)

internal object HomeCoordinatorMath {
    fun resolveHeroCandidate(
        heroMovie: MovieMetadata?,
        sections: List<HomeSection>
    ): MovieMetadata? {
        val candidate = heroMovie ?: sections.flatMap { it.items }.firstOrNull { it.backdropUrl.isNotBlank() }
        return candidate?.takeIf { it.backdropUrl.isNotBlank() }
    }

    fun scrollPhaseFor(scrollFraction: Float, homeMotion: HomeMotionConfig): HomeScrollPhase {
        return when {
            scrollFraction < homeMotion.holdThreshold -> HomeScrollPhase.HERO
            scrollFraction < homeMotion.hideThreshold -> HomeScrollPhase.TRANSITION
            else -> HomeScrollPhase.RAILS
        }
    }

    fun hideProgressFor(scrollFraction: Float, homeMotion: HomeMotionConfig): Float {
        val range = (homeMotion.hideThreshold - homeMotion.holdThreshold).coerceAtLeast(0.01f)
        return ((scrollFraction - homeMotion.holdThreshold) / range).coerceIn(0f, 1f)
    }

    fun isHeroVisible(scrollFraction: Float, homeMotion: HomeMotionConfig): Boolean {
        return scrollFraction < homeMotion.heroVisibleThreshold
    }
}

@Stable
internal class HomeContentCoordinator(
    val lazyListState: TvLazyListState,
    val heroPlayFocusRequester: FocusRequester,
    val heroMoreInfoFocusRequester: FocusRequester,
    val firstRailCardFocusRequester: FocusRequester,
    val resolvedHero: MovieMetadata?,
    val activeHero: MovieMetadata?, // Debounced dynamic hero movie state
    val focusPrefetchWindow: Pair<Int, Int>,
    val heroVisualState: HomeHeroVisualState,
    val activeRowTitle: String?,
    val lastFocusedRailRequester: FocusRequester?,
    val onHeroPrimaryActionsFocusChanged: (Boolean) -> Unit,
    val onHeroPlayFocused: () -> Unit,
    val onHeroContainerFocused: () -> Unit,
    val onRailMovieFocused: (String, List<MovieMetadata>, MovieMetadata, Int, FocusRequester) -> Unit,
    val requestActiveFocus: () -> Unit
)

@Composable
internal fun rememberHomeContentCoordinator(
    heroMovie: MovieMetadata?,
    sections: List<HomeSection>,
    config: PerformanceConfig,
    focusPrefetchEnabled: Boolean,
    prefetchManager: RowPrefetchManager,
    onHeroVisibilityChanged: (Boolean) -> Unit,
    onAtmosphereChange: (Color) -> Unit
): HomeContentCoordinator {
    val lazyListState = rememberTvLazyListState()
    val scope = rememberCoroutineScope()
    val density = LocalDensity.current
    val homeMotion = config.homeMotion

    val heroPlayFocusRequester = remember { FocusRequester() }
    val heroMoreInfoFocusRequester = remember { FocusRequester() }
    val firstRailCardFocusRequester = remember { FocusRequester() }

    var activeFocusZone by remember { mutableStateOf(HomeFocusZone.HERO) }
    var activeRowTitle by remember { mutableStateOf<String?>(null) }
    var lastFocusedRailRequester by remember { mutableStateOf<FocusRequester?>(null) }
    var heroActionsFocused by remember { mutableStateOf(false) }

    val resolvedHero = remember(heroMovie, sections) {
        HomeCoordinatorMath.resolveHeroCandidate(heroMovie, sections)
    }

    // Stable, curated, session-locked featured spotlight hero
    val activeHero = resolvedHero

    val focusPrefetchWindow = remember(config.tier) {
        when (config.tier) {
            DeviceTier.LOW -> 3 to 1
            DeviceTier.MEDIUM -> 6 to 2
            DeviceTier.HIGH -> 8 to 3
        }
    }

    val scrollFraction by remember {
        derivedStateOf {
            if (lazyListState.firstVisibleItemIndex > 0) {
                1f
            } else {
                val heroHeightPx = with(density) { Dimensions.HomeHeroHeight.toPx() }
                if (heroHeightPx <= 0f) 0f else {
                    (lazyListState.firstVisibleItemScrollOffset.toFloat() / heroHeightPx).coerceIn(0f, 1f)
                }
            }
        }
    }
    val scrollPhase by remember(scrollFraction, homeMotion) {
        derivedStateOf { HomeCoordinatorMath.scrollPhaseFor(scrollFraction, homeMotion) }
    }
    val hideProgress by remember(scrollFraction, homeMotion) {
        derivedStateOf { HomeCoordinatorMath.hideProgressFor(scrollFraction, homeMotion) }
    }
    val isHeroVisible by remember(scrollFraction, homeMotion) {
        derivedStateOf { HomeCoordinatorMath.isHeroVisible(scrollFraction, homeMotion) }
    }

    LaunchedEffect(isHeroVisible) {
        onHeroVisibilityChanged(isHeroVisible)
    }

    val heroScale by animateFloatAsState(
        targetValue = if (activeFocusZone == HomeFocusZone.RAILS && !heroActionsFocused) 0.975f else 1.0f,
        animationSpec = tween(280),
        label = "heroScale"
    )
    val heroScaleY by animateFloatAsState(
        targetValue = if (activeFocusZone == HomeFocusZone.RAILS && !heroActionsFocused) 0.85f else 1.0f,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioNoBouncy,
            stiffness = Spring.StiffnessMedium
        ),
        label = "heroScaleY"
    )
    val heroTranslationY by animateFloatAsState(
        targetValue = if (activeFocusZone == HomeFocusZone.RAILS && !heroActionsFocused) -200f else 0f,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioLowBouncy,
            stiffness = Spring.StiffnessMediumLow
        ),
        label = "heroTranslationY"
    )
    val heroAlpha by animateFloatAsState(
        targetValue = if (activeFocusZone == HomeFocusZone.RAILS && !heroActionsFocused) 0.0f else 1.0f,
        animationSpec = tween(320),
        label = "heroAlpha"
    )
    val heroHeight by animateDpAsState(
        targetValue = if (activeFocusZone == HomeFocusZone.RAILS && !heroActionsFocused) 0.dp else Dimensions.HomeHeroHeight,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioNoBouncy,
            stiffness = Spring.StiffnessMedium
        ),
        label = "heroHeight"
    )

    val heroVisualState = remember(scrollPhase, hideProgress, heroScale, heroScaleY, heroTranslationY, heroAlpha, heroHeight, isHeroVisible, density) {
        HomeHeroVisualState(
            bannerHeightPx = with(density) { Dimensions.HomeHeroHeight.toPx() },
            scrollPhase = scrollPhase,
            hideProgress = hideProgress,
            heroScale = heroScale,
            heroScaleY = heroScaleY,
            heroTranslationY = heroTranslationY,
            heroAlpha = heroAlpha,
            heroHeight = heroHeight,
            isHeroVisible = isHeroVisible
        )
    }

    val requestActiveFocus = remember {
        {
            runCatching {
                when (activeFocusZone) {
                    HomeFocusZone.HERO -> heroPlayFocusRequester.requestFocus()
                    HomeFocusZone.RAILS -> (lastFocusedRailRequester ?: firstRailCardFocusRequester).requestFocus()
                }
            }
            Unit
        }
    }

    return remember(
        lazyListState,
        heroPlayFocusRequester,
        heroMoreInfoFocusRequester,
        firstRailCardFocusRequester,
        resolvedHero,
        activeHero,
        focusPrefetchWindow,
        heroVisualState,
        activeRowTitle,
        lastFocusedRailRequester,
        focusPrefetchEnabled,
        prefetchManager,
        config.tier
    ) {
        HomeContentCoordinator(
            lazyListState = lazyListState,
            heroPlayFocusRequester = heroPlayFocusRequester,
            heroMoreInfoFocusRequester = heroMoreInfoFocusRequester,
            firstRailCardFocusRequester = firstRailCardFocusRequester,
            resolvedHero = resolvedHero,
            activeHero = activeHero,
            focusPrefetchWindow = focusPrefetchWindow,
            heroVisualState = heroVisualState,
            activeRowTitle = activeRowTitle,
            lastFocusedRailRequester = lastFocusedRailRequester,
            onHeroPrimaryActionsFocusChanged = { focused ->
                heroActionsFocused = focused
                if (focused) {
                    activeFocusZone = HomeFocusZone.HERO
                    activeRowTitle = null
                }
            },
            onHeroPlayFocused = {
                activeFocusZone = HomeFocusZone.HERO
                activeRowTitle = null
            },
            onHeroContainerFocused = {
                activeFocusZone = HomeFocusZone.HERO
                activeRowTitle = null
                onAtmosphereChange(Color.Unspecified)
                scope.launch {
                    if (lazyListState.firstVisibleItemIndex > 0 ||
                        lazyListState.firstVisibleItemScrollOffset > 0
                    ) {
                        lazyListState.animateScrollToItem(0)
                    }
                }
            },
            onRailMovieFocused = { sectionTitle, items, movie, index, focusRequester ->
                activeFocusZone = HomeFocusZone.RAILS
                activeRowTitle = sectionTitle
                lastFocusedRailRequester = focusRequester
                if (focusPrefetchEnabled) {
                    prefetchManager.onCardFocused(
                        laneKey = "home:$sectionTitle",
                        currentIndex = index,
                        items = items,
                        prefetchCount = focusPrefetchWindow.first,
                        backwardBufferCount = focusPrefetchWindow.second
                    )
                }
                if (config.tier != DeviceTier.LOW) {
                    onAtmosphereChange(resolveAtmosphereColor(movie))
                }
            },
            requestActiveFocus = requestActiveFocus
        )
    }
}

// Masterpiece Dominant Hash HSL color generator for ambient atmosphere backlights
internal fun resolveAtmosphereColor(movie: MovieMetadata): Color {
    if (movie.type.equals("live", ignoreCase = true)) {
        return Color(0xFFE50914) // Rich Netflix/Smartifly Red for active broadcasts
    }
    val url = movie.backdropUrl.ifBlank { movie.posterUrl }
    if (url.isBlank()) return Color(0xFF1F1F1F)
    
    val hash = url.hashCode()
    val hue = (hash and 0xFFFF) % 360
    return Color.hsl(hue = hue.toFloat(), saturation = 0.60f, lightness = 0.22f)
}
