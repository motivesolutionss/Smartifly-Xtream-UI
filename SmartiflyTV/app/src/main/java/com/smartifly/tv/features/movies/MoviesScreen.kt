package com.smartifly.tv.features.movies

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Text
import com.smartifly.tv.data.models.MovieMetadata
import com.smartifly.tv.data.models.UserProfile
import com.smartifly.tv.performance.ImagePreloader
import com.smartifly.tv.performance.RowPrefetchManager
import com.smartifly.tv.performance.lowend.DeviceTier
import com.smartifly.tv.performance.lowend.LocalPerformanceConfig
import com.smartifly.tv.ui.components.base.ContentDetailsPanel
import com.smartifly.tv.ui.components.base.PosterGrid
import com.smartifly.tv.ui.components.base.SideCategoryRail
import com.smartifly.tv.ui.theme.SmartiflyTheme
import com.smartifly.tv.ui.components.dialogs.PinEntryDialog
import com.smartifly.tv.data.repository.ParentalControlManager
import androidx.compose.runtime.rememberCoroutineScope
import com.smartifly.tv.features.profiles.ContentRestrictionManager
import kotlinx.coroutines.launch
import androidx.compose.runtime.LaunchedEffect

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun MoviesScreen(
    profile: UserProfile,
    viewModel: MoviesViewModel,
    parentalControlManager: ParentalControlManager,
    onMovieClick: (MovieMetadata) -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()

    SmartiflyTheme {
        when (val state = uiState) {
            is MoviesUiState.Loading -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    com.smartifly.tv.ui.components.base.SmartiflyLoader()
                }
            }
            is MoviesUiState.Success -> {
                val isUnlocked by parentalControlManager.isUnlocked.collectAsState()
                val scope = rememberCoroutineScope()
                var showPinDialog by remember { mutableStateOf(false) }
                var pendingCategory by remember { mutableStateOf<String?>(null) }
                var pinError by remember { mutableStateOf<String?>(null) }

                val filteredMovies = remember(state.movies, profile) {
                    ContentRestrictionManager.filterMovies(profile, state.movies)
                }

                MoviesContent(
                    profileId = profile.id,
                    categories = state.categories,
                    selectedCategory = state.selectedCategory,
                    movies = filteredMovies,
                    onCategorySelected = { category ->
                        if (parentalControlManager.isCategoryLocked(category) && !isUnlocked) {
                            pendingCategory = category
                            showPinDialog = true
                        } else {
                            viewModel.loadMoviesByCategory(if (category == "All") null else category)
                        }
                    },
                    onMovieClick = onMovieClick
                )

                if (showPinDialog) {
                    PinEntryDialog(
                        onDismiss = { 
                            showPinDialog = false
                            pendingCategory = null
                        },
                        onPinEntered = { pin ->
                            scope.launch {
                                if (parentalControlManager.validatePin(pin)) {
                                    showPinDialog = false
                                    pendingCategory?.let { viewModel.loadMoviesByCategory(if (it == "All") null else it) }
                                    pendingCategory = null
                                    pinError = null
                                } else {
                                    pinError = "Invalid PIN. Please try again."
                                }
                            }
                        },
                        errorMessage = pinError
                    )
                }
            }
            is MoviesUiState.Error -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(text = "Error: ${state.message}", color = Color.Red)
                }
            }
            is MoviesUiState.Empty -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(text = "No movies found.", color = Color.Gray)
                }
            }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun MoviesContent(
    profileId: String? = null,
    categories: List<String>,
    selectedCategory: String,
    movies: List<MovieMetadata>,
    onCategorySelected: (String) -> Unit,
    onMovieClick: (MovieMetadata) -> Unit
) {
    var focusedMovie by remember(movies) { mutableStateOf(movies.firstOrNull()) }
    val context = LocalContext.current
    val preloader = remember { ImagePreloader(context) }
    val prefetchManager = remember { RowPrefetchManager(preloader) }
    val config = LocalPerformanceConfig.current
    val (criticalItems, nearItems, warmItems, focusForward, focusBack) = when (config.tier) {
        DeviceTier.LOW -> listOf(6, 12, 14, 6, 2)
        DeviceTier.MEDIUM -> listOf(8, 18, 22, 10, 3)
        DeviceTier.HIGH -> listOf(10, 24, 28, 14, 4)
    }

    LaunchedEffect(movies) {
        prefetchManager.primeHomeAboveFold(
            sections = listOf(movies),
            maxRails = 1,
            itemsPerRail = nearItems,
            criticalRails = 1,
            criticalItemsPerRail = criticalItems,
            warmItemsPerRail = warmItems,
            debugTag = "movies_first_viewport"
        )
    }

    Row(modifier = Modifier.fillMaxSize()) {
        SideCategoryRail(
            categories = categories,
            selectedCategory = selectedCategory,
            onCategorySelected = { 
                onCategorySelected(it)
            }
        )
        
        Column(modifier = Modifier.weight(1f)) {
            focusedMovie?.let {
                ContentDetailsPanel(movie = it)
            }
            
            PosterGrid(
                items = movies,
                profileId = profileId,
                onItemFocused = { movie, index ->
                    focusedMovie = movie
                    prefetchManager.onCardFocused(
                        currentIndex = index,
                        items = movies,
                        prefetchCount = focusForward,
                        backwardBufferCount = focusBack
                    )
                },
                onItemClick = onMovieClick
            )
        }
    }
}
