package com.smartifly.tv.features.home

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalDensity
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.background
import androidx.compose.ui.unit.dp
import androidx.tv.foundation.PivotOffsets
import androidx.tv.foundation.lazy.list.TvLazyColumn
import androidx.tv.foundation.lazy.list.itemsIndexed
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.Text
import com.smartifly.tv.data.models.MovieMetadata
import com.smartifly.tv.data.models.UserProfile
import com.smartifly.tv.performance.RowPrefetchManager
import com.smartifly.tv.performance.lowend.DeviceTier
import com.smartifly.tv.performance.lowend.LocalPerformanceConfig
import com.smartifly.tv.ui.components.content.HeroBanner
import com.smartifly.tv.ui.components.navigation.TopNav
import com.smartifly.tv.navigation.Destination
import com.smartifly.tv.ui.theme.Dimensions
import com.smartifly.tv.ui.theme.TextSecondary

@OptIn(
    ExperimentalTvMaterial3Api::class,
    ExperimentalFoundationApi::class,
    androidx.compose.ui.ExperimentalComposeUiApi::class
)
@Composable
fun HomeContent(
    heroMovie: MovieMetadata?,
    heroCarousel: List<MovieMetadata> = emptyList(),
    sections: List<HomeSection>,
    isDegraded: Boolean,
    profileId: String,
    profiles: List<UserProfile> = emptyList(),
    selectedProfile: UserProfile? = null,
    onProfileSelected: (UserProfile) -> Unit = {},
    prefetchManager: RowPrefetchManager,
    focusPrefetchEnabled: Boolean,
    navBarFocusRequester: FocusRequester? = null,
    screenContentFocusRequester: FocusRequester? = null,
    onHeroVisibilityChanged: (Boolean) -> Unit = {},
    onMovieClick: (MovieMetadata) -> Unit,
    onPlayClick: (MovieMetadata) -> Unit,
    onSearchClick: () -> Unit,
    onSettingsClick: () -> Unit,
    onAtmosphereChange: (Color) -> Unit,
    onNavigationClick: (Destination) -> Unit
) {
    val config = LocalPerformanceConfig.current
    val themePrimary = MaterialTheme.colorScheme.primary
    val coordinator = rememberHomeContentCoordinator(
        heroMovie = heroMovie,
        sections = sections,
        config = config,
        focusPrefetchEnabled = focusPrefetchEnabled,
        prefetchManager = prefetchManager,
        onHeroVisibilityChanged = onHeroVisibilityChanged,
        onAtmosphereChange = onAtmosphereChange
    )
    val homeEntryFocusRequester = screenContentFocusRequester ?: FocusRequester.Default

    val density = LocalDensity.current
    val scope = rememberCoroutineScope()
    val navBarHeight = 64.dp
    val navBarHeightPx = with(density) { navBarHeight.toPx() }

    val navTranslationY by remember {
        derivedStateOf {
            if (coordinator.lazyListState.firstVisibleItemIndex > 0) {
                -navBarHeightPx
            } else {
                -coordinator.lazyListState.firstVisibleItemScrollOffset.toFloat().coerceAtMost(navBarHeightPx)
            }
        }
    }

    val featuredMovies = remember(heroMovie, heroCarousel, sections) {
        if (heroCarousel.isNotEmpty()) {
            heroCarousel.distinctBy { it.id }.take(5)
        } else {
            val list = mutableListOf<MovieMetadata>()
            heroMovie?.takeIf { it.backdropUrl.isNotBlank() }?.let { list.add(it) }
            sections.flatMap { it.items }
                .filter { item ->
                    item.type != "live" &&
                        item.backdropUrl.isNotBlank()
                }
                .forEach { item ->
                    if (list.none { it.id == item.id }) {
                        list.add(item)
                    }
                }
            list.take(5)
        }
    }

    var currentHeroIndex by remember(featuredMovies) { mutableIntStateOf(0) }
    var isHeroFocused by remember { mutableStateOf(false) }
    var isTopNavFocused by remember { mutableStateOf(false) }
    var initialFocusApplied by remember { mutableStateOf(false) }

    LaunchedEffect(isTopNavFocused) {
        if (isTopNavFocused) {
            scope.launch {
                if (coordinator.lazyListState.firstVisibleItemIndex > 0 ||
                    coordinator.lazyListState.firstVisibleItemScrollOffset > 0
                ) {
                    coordinator.lazyListState.animateScrollToItem(0)
                }
            }
        }
    }

    LaunchedEffect(isHeroFocused, featuredMovies) {
        if (featuredMovies.size <= 1 || !isHeroFocused) return@LaunchedEffect
        while (true) {
            delay(8000L)
            currentHeroIndex = (currentHeroIndex + 1) % featuredMovies.size
        }
    }

    val activeHeroMovie = featuredMovies.getOrNull(currentHeroIndex)

    LaunchedEffect(sections, activeHeroMovie) {
        if (sections.isNotEmpty() && !initialFocusApplied) {
            coordinator.lazyListState.scrollToItem(0)
            if (activeHeroMovie != null) {
                runCatching { coordinator.heroPlayFocusRequester.requestFocus() }
            } else if (navBarFocusRequester != null) {
                runCatching { navBarFocusRequester.requestFocus() }
            } else {
                coordinator.requestActiveFocus()
            }
            initialFocusApplied = true
        }
    }

    val entryModifier = if (screenContentFocusRequester != null) {
        Modifier
            .focusRequester(homeEntryFocusRequester)
            .focusable()
            .onFocusChanged { state ->
                if (state.isFocused) {
                    coordinator.requestActiveFocus()
                }
            }
    } else {
        Modifier
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .then(entryModifier)
    ) {
        val pivotFraction by remember {
            derivedStateOf {
                if (coordinator.activeRowTitle != null) 0.35f else 0.85f
            }
        }

        TvLazyColumn(
            state = coordinator.lazyListState,
            pivotOffsets = PivotOffsets(parentFraction = pivotFraction),
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(
                top = 0.dp,
                bottom = Dimensions.HomeRailBottomPadding
            )
        ) {
            item(key = "nav_spacer") {
                Spacer(modifier = Modifier.height(navBarHeight))
            }
            item(key = "hero") {
                Column {
                    if (isDegraded) {
                        Text(
                            text = "Some content is still loading. Results may be partial.",
                            color = TextSecondary,
                            style = MaterialTheme.typography.bodyMedium,
                            modifier = Modifier
                                .padding(
                                    start = Dimensions.ContentGutter,
                                    end = Dimensions.PaddingExtraLarge,
                                    top = Dimensions.PaddingSmall,
                                    bottom = Dimensions.PaddingSmall
                                )
                                .background(
                                    color = Color.White.copy(alpha = 0.06f),
                                    shape = RoundedCornerShape(12.dp)
                                )
                                .padding(horizontal = 12.dp, vertical = 8.dp)
                        )
                    }

                    activeHeroMovie?.let { movie ->
                        HeroBanner(
                            movie = movie,
                            currentIndex = currentHeroIndex,
                            totalCount = featuredMovies.size,
                            onNextHero = {
                                if (featuredMovies.isNotEmpty()) {
                                    currentHeroIndex = (currentHeroIndex + 1) % featuredMovies.size
                                }
                            },
                            onPrevHero = {
                                if (featuredMovies.isNotEmpty()) {
                                    currentHeroIndex = (currentHeroIndex - 1 + featuredMovies.size) % featuredMovies.size
                                }
                            },
                            onPlayClick = onPlayClick,
                            onMoreInfoClick = onMovieClick,
                            onPrimaryActionsFocusChanged = coordinator.onHeroPrimaryActionsFocusChanged,
                            onPlayFocused = coordinator.onHeroPlayFocused,
                            playFocusRequester = coordinator.heroPlayFocusRequester,
                            moreInfoFocusRequester = coordinator.heroMoreInfoFocusRequester,
                            firstRailFocusRequester = coordinator.firstRailCardFocusRequester,
                            navBarFocusRequester = navBarFocusRequester,
                            onSearchClick = onSearchClick,
                            onSettingsClick = onSettingsClick,
                            modifier = Modifier
                                .padding(horizontal = Dimensions.PaddingMedium)
                                .fillMaxWidth()
                                .height(coordinator.heroVisualState.heroHeight)
                                .graphicsLayer {
                                    val isLowEnd = config.tier == DeviceTier.LOW
                                    if (!isLowEnd) {
                                        scaleX = coordinator.heroVisualState.heroScale
                                        scaleY = coordinator.heroVisualState.heroScaleY
                                        translationY = coordinator.heroVisualState.heroTranslationY
                                    }
                                    alpha = coordinator.heroVisualState.heroAlpha
                                }
                                .onFocusChanged { state ->
                                    val wasFocused = isHeroFocused
                                    isHeroFocused = state.hasFocus
                                    if (state.hasFocus) {
                                        if (!wasFocused) {
                                            coordinator.onHeroContainerFocused()
                                        }
                                        onAtmosphereChange(themePrimary)
                                    }
                                }
                        )
                    }
                }
            }

            itemsIndexed(
                items = sections,
                key = { index, section ->
                    val anchorId = section.items.firstOrNull()?.id ?: "empty"
                    "home_section_${index}_${section.title}_$anchorId"
                }
            ) { _, section ->
                val isFirstSection = section == sections.firstOrNull()
                ContentRow(
                    section = section,
                    profileId = profileId,
                    onMovieClick = onMovieClick,
                    firstItemFocusRequester = if (isFirstSection) coordinator.firstRailCardFocusRequester else null,
                    upFocusRequester = if (isFirstSection && activeHeroMovie != null) {
                        coordinator.heroPlayFocusRequester
                    } else {
                        null
                    },
                    navBarFocusRequester = if (isFirstSection) navBarFocusRequester else null,
                    isActive = coordinator.activeRowTitle == null || coordinator.activeRowTitle == section.title,
                    isFocusedRow = coordinator.activeRowTitle == section.title,
                    onMovieFocused = { movie, index, focusRequester ->
                        coordinator.onRailMovieFocused(section.title, section.items, movie, index, focusRequester)
                    }
                )
                Spacer(modifier = Modifier.height(Dimensions.RowSpacing))
            }
        }
        TopNav(
            selectedDestination = Destination.Home,
            onDestinationSelected = onNavigationClick,
            contentFocusRequester = if (activeHeroMovie != null) coordinator.heroPlayFocusRequester else null,
            navFocusRequester = navBarFocusRequester,
            profiles = profiles,
            selectedProfile = selectedProfile,
            onProfileSelected = onProfileSelected,
            modifier = Modifier
                .fillMaxWidth()
                .graphicsLayer {
                    translationY = navTranslationY
                }
                .onFocusChanged { state ->
                    isTopNavFocused = state.hasFocus
                }
        )
    }
}
