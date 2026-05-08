package com.smartifly.tv.features.home

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.smartifly.tv.performance.lowend.DeviceTier
import com.smartifly.tv.performance.lowend.LocalPerformanceConfig

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.material3.Icon
import androidx.tv.foundation.lazy.list.TvLazyColumn
import androidx.tv.foundation.lazy.list.TvLazyRow
import androidx.tv.foundation.lazy.list.itemsIndexed
import androidx.tv.foundation.lazy.list.items
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.Text
import com.smartifly.tv.data.models.MovieMetadata
import com.smartifly.tv.performance.ImagePreloader
import com.smartifly.tv.performance.RowPrefetchManager
import com.smartifly.tv.ui.components.content.HeroBanner
import com.smartifly.tv.ui.components.content.PosterCard
import com.smartifly.tv.ui.theme.Dimensions
import com.smartifly.tv.ui.theme.SmartiflyTheme
import com.smartifly.tv.ui.theme.TextSecondary

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun HomeScreen(
    viewModel: HomeViewModel,
    onMovieClick: (MovieMetadata) -> Unit,
    onPlayClick: (MovieMetadata) -> Unit
) {
    val context = LocalContext.current
    val uiState by viewModel.uiState.collectAsState()
    val config = LocalPerformanceConfig.current

    val preloader = remember { ImagePreloader(context) }
    val prefetchManager = remember { RowPrefetchManager(preloader) }

    SmartiflyTheme {
        // Masterpiece Enhancement: Atmospheric Background Sync
        var atmosphereColor by remember { mutableStateOf(Color.Black) }
        val animatedAtmosphere by animateColorAsState(
            targetValue = atmosphereColor,
            animationSpec = tween(1000),
            label = "atmosphere"
        )

        Box(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
            // Atmospheric Glow (Top Left) - Only on High/Medium Tier
            if (config.tier != DeviceTier.LOW) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.radialGradient(
                                colors = listOf(animatedAtmosphere.copy(alpha = 0.15f), Color.Transparent),
                                center = Offset(0f, 0f),
                                radius = 2000f
                            )
                        )
                )
            }

            when (val state = uiState) {
                is HomeUiState.Loading -> {
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
                is HomeUiState.Success -> {
                    HomeContent(
                        heroMovie = state.heroMovie,
                        sections = state.sections,
                        prefetchManager = prefetchManager,
                        onMovieClick = onMovieClick,
                        onPlayClick = onPlayClick,
                        onAtmosphereChange = { color -> atmosphereColor = color }
                    )
                }
                is HomeUiState.Error -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(
                                com.smartifly.tv.ui.theme.SmartiflyIcons.Error, 
                                contentDescription = null, 
                                tint = Color.Red, 
                                modifier = Modifier.size(Dimensions.PlayerIconSizeLarge)
                            )
                            Spacer(modifier = Modifier.height(Dimensions.PaddingMedium))
                            Text(text = state.message, color = Color.White, style = MaterialTheme.typography.headlineSmall)
                        }
                    }
                }
                else -> {}
            }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun HomeContent(
    heroMovie: MovieMetadata,
    sections: List<HomeSection>,
    prefetchManager: RowPrefetchManager,
    onMovieClick: (MovieMetadata) -> Unit,
    onPlayClick: (MovieMetadata) -> Unit,
    onAtmosphereChange: (Color) -> Unit
) {
    var focusedMovie by remember { mutableStateOf(heroMovie) }
    var isBrowsingRails by remember { mutableStateOf(false) }
    val config = LocalPerformanceConfig.current

    // Masterpiece Enhancement: Depth Perception (Hero recedes when browsing)
    val heroScale by animateFloatAsState(
        targetValue = if (isBrowsingRails) 0.96f else 1.0f,
        animationSpec = tween(500),
        label = "heroDepth"
    )
    val heroAlpha by animateFloatAsState(
        targetValue = if (isBrowsingRails) 0.7f else 1.0f,
        animationSpec = tween(500),
        label = "heroDim"
    )

    TvLazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(bottom = Dimensions.RowSpacing * 2)
    ) {
        item {
            HeroBanner(
                movie = focusedMovie,
                onPlayClick = { onPlayClick(it) },
                modifier = Modifier
                    .graphicsLayer {
                        scaleX = if (config.tier == DeviceTier.LOW) 1f else heroScale
                        scaleY = if (config.tier == DeviceTier.LOW) 1f else heroScale
                        alpha = if (config.tier == DeviceTier.LOW) 1f else heroAlpha
                    }
                    .padding(bottom = Dimensions.PaddingLarge)
                    .onFocusChanged { state ->
                        if (state.isFocused) {
                            isBrowsingRails = false
                            onAtmosphereChange(Color.Transparent) // Reset atmosphere on hero
                        }
                    }
            )
        }
        
        items(sections) { section ->
            ContentRow(
                section = section,
                onMovieClick = onMovieClick,
                onMovieFocused = { movie, index -> 
                    focusedMovie = movie
                    isBrowsingRails = true
                    prefetchManager.onCardFocused(index, section.items)
                    
                    // Update atmosphere based on movie genre/vibe
                    // In a real app, this would come from movie metadata
                    val vibeColor = when {
                        section.title.contains("Action") -> Color(0xFFE50914) // Netflix Red
                        section.title.contains("Sci-Fi") -> Color(0xFF00D1FF) // Cyber Cyan
                        section.title.contains("Continue") -> Color(0xFFFFA500) // Warm Gold
                        else -> Color.White
                    }
                    onAtmosphereChange(vibeColor)
                }
            )
            Spacer(modifier = Modifier.height(Dimensions.RowSpacing))
        }
    }
}



@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun ContentRow(
    section: HomeSection,
    onMovieClick: (MovieMetadata) -> Unit,
    onMovieFocused: (MovieMetadata, Int) -> Unit
) {
    val title = section.title
    val movies = section.items
    
    Column {
        Text(
            text = title,
            style = MaterialTheme.typography.headlineSmall,
            modifier = Modifier.padding(start = Dimensions.PaddingExtraLarge, bottom = Dimensions.PaddingMedium),
            color = com.smartifly.tv.ui.theme.TextPrimary,
            fontWeight = FontWeight.Bold
        )
        
        TvLazyRow(
            contentPadding = PaddingValues(horizontal = Dimensions.PaddingExtraLarge),
            horizontalArrangement = Arrangement.spacedBy(Dimensions.ItemSpacing)
        ) {
            itemsIndexed(movies) { index, movie ->
                if (title == "Continue Watching" && section.progressList != null) {
                    com.smartifly.tv.ui.components.content.ContinueWatchingCard(
                        imageUrl = movie.posterUrl,
                        progress = section.progressList[index],
                        title = movie.title,
                        onClick = { onMovieClick(movie) }
                    )
                } else {
                    PosterCard(
                        movie = movie,
                        onFocus = { onMovieFocused(movie, index) },
                        onClick = { onMovieClick(movie) }
                    )
                }
            }
        }
    }
}
