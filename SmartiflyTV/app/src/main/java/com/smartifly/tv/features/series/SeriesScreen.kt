package com.smartifly.tv.features.series

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
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
import com.smartifly.tv.performance.PrefetchOrchestrator
import com.smartifly.tv.performance.PrefetchBudgetController
import com.smartifly.tv.performance.lowend.DeviceTier
import com.smartifly.tv.performance.lowend.LocalPerformanceConfig
import com.smartifly.tv.ui.components.base.ContentDetailsPanel
import com.smartifly.tv.ui.components.base.PosterGrid
import com.smartifly.tv.ui.components.base.SideRailCategoryItem
import com.smartifly.tv.ui.components.base.TopCategoryChips
import com.smartifly.tv.ui.theme.SmartiflyTheme
import com.smartifly.tv.ui.components.dialogs.PinEntryDialog
import com.smartifly.tv.data.repository.ParentalControlManager
import androidx.compose.runtime.rememberCoroutineScope
import kotlinx.coroutines.launch
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.tv.foundation.lazy.list.TvLazyColumn
import androidx.tv.foundation.lazy.list.items
import com.smartifly.tv.ui.theme.Dimensions

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun SeriesScreen(
    profile: UserProfile,
    viewModel: SeriesViewModel,
    parentalControlManager: ParentalControlManager,
    onSeriesClick: (MovieMetadata) -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(viewModel) {
        viewModel.ensureLoaded()
    }

    SmartiflyTheme {
        when (val state = uiState) {
            is SeriesUiState.Loading -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    com.smartifly.tv.ui.components.base.SmartiflyLoader()
                }
            }
            is SeriesUiState.Success -> {
                val isUnlocked by parentalControlManager.isUnlocked.collectAsState()
                val scope = rememberCoroutineScope()
                var showPinDialog by remember { mutableStateOf(false) }
                var pendingCategory by remember { mutableStateOf<String?>(null) }
                var pinError by remember { mutableStateOf<String?>(null) }

                SeriesContent(
                    profileId = profile.id,
                    categories = state.categories,
                    selectedCategoryId = state.selectedCategoryId,
                    seriesList = state.series,
                    onCategorySelected = { categoryId ->
                        val categoryName = state.categories.firstOrNull { it.id == categoryId }?.title ?: ""
                        if (parentalControlManager.isCategoryLocked(categoryName) && !isUnlocked) {
                            pendingCategory = categoryId
                            showPinDialog = true
                        } else {
                            viewModel.loadSeriesByCategory(categoryId)
                        }
                    },
                    onSeriesClick = onSeriesClick
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
                                    pendingCategory?.let { viewModel.loadSeriesByCategory(it) }
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
            is SeriesUiState.Error -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(text = "Error: ${state.message}", color = Color.Red)
                }
            }
            is SeriesUiState.EmptyCategory -> {
                SeriesEmptyCategoryContent(
                    categories = state.categories,
                    selectedCategoryId = state.selectedCategoryId,
                    message = state.message,
                    onCategorySelected = viewModel::loadSeriesByCategory
                )
            }
            is SeriesUiState.EmptyProvider -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(text = "No series available on this provider.", color = Color.Gray)
                        Spacer(modifier = Modifier.height(Dimensions.PaddingSmall))
                        Text(text = "Try Movies or Live TV.", color = Color.Gray)
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun SeriesEmptyCategoryContent(
    categories: List<SideRailCategoryItem>,
    selectedCategoryId: String,
    message: String,
    onCategorySelected: (String) -> Unit
) {
    Row(modifier = Modifier.fillMaxSize()) {
        TvLazyColumn(
            modifier = Modifier
                .width(220.dp)
                .fillMaxHeight()
                .background(Color.White.copy(alpha = 0.02f), RoundedCornerShape(16.dp))
                .border(1.dp, Color.White.copy(alpha = 0.06f), RoundedCornerShape(16.dp))
                .padding(vertical = 12.dp, horizontal = 8.dp),
            contentPadding = PaddingValues(vertical = 4.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(categories, key = { it.id }) { category ->
                val isSelected = category.id == selectedCategoryId
                androidx.tv.material3.Button(
                    onClick = { onCategorySelected(category.id) },
                    shape = androidx.tv.material3.ButtonDefaults.shape(RoundedCornerShape(12.dp)),
                    colors = androidx.tv.material3.ButtonDefaults.colors(
                        containerColor = if (isSelected) Color.White.copy(alpha = 0.15f) else Color.Transparent,
                        focusedContainerColor = Color.White,
                        focusedContentColor = Color.Black,
                        contentColor = if (isSelected) androidx.tv.material3.MaterialTheme.colorScheme.primary else Color.White.copy(alpha = 0.88f)
                    ),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    if (isSelected) {
                        Box(
                            modifier = Modifier
                                .size(4.dp, 16.dp)
                                .background(androidx.tv.material3.MaterialTheme.colorScheme.primary, RoundedCornerShape(2.dp))
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                    }
                    Text(
                        text = category.title,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                        maxLines = 1,
                        overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                    )
                }
            }
        }

        Spacer(modifier = Modifier.width(16.dp))

        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            Text(text = message, color = Color.Gray)
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun SeriesContent(
    profileId: String? = null,
    categories: List<SideRailCategoryItem>,
    selectedCategoryId: String,
    seriesList: List<MovieMetadata>,
    onCategorySelected: (String) -> Unit,
    onSeriesClick: (MovieMetadata) -> Unit
) {
    var focusedSeries by remember(seriesList) { mutableStateOf(seriesList.firstOrNull()) }
    val focusPrefetchEnabled = remember(seriesList) {
        seriesList.isNotEmpty() &&
            PrefetchBudgetController.allowFocusPrefetch(PrefetchBudgetController.Screen.SERIES)
    }
    val context = LocalContext.current
    val prefetchManager = remember(context) { PrefetchOrchestrator.manager(context) }
    val config = LocalPerformanceConfig.current
    val (criticalItems, nearItems, warmItems, focusForward, focusBack) = when (config.tier) {
        DeviceTier.LOW -> listOf(4, 8, 10, 4, 1)
        DeviceTier.MEDIUM -> listOf(6, 12, 16, 6, 2)
        DeviceTier.HIGH -> listOf(8, 16, 20, 8, 2)
    }

    LaunchedEffect(seriesList) {
        if (seriesList.isEmpty()) return@LaunchedEffect
        if (!PrefetchBudgetController.allowAboveFold(PrefetchBudgetController.Screen.SERIES)) return@LaunchedEffect
        prefetchManager.primeHomeAboveFold(
            sections = listOf(seriesList),
            maxRails = 1,
            itemsPerRail = nearItems,
            criticalRails = 1,
            criticalItemsPerRail = criticalItems,
            warmItemsPerRail = warmItems,
            debugTag = "series_first_viewport"
        )
    }

    Row(
        modifier = Modifier
            .fillMaxSize()
    ) {
        // Left Column: Vertical Category List (EPG Sidebar styled)
        TvLazyColumn(
            modifier = Modifier
                .width(220.dp)
                .fillMaxHeight()
                .background(Color.White.copy(alpha = 0.02f), RoundedCornerShape(16.dp))
                .border(1.dp, Color.White.copy(alpha = 0.06f), RoundedCornerShape(16.dp))
                .padding(vertical = 12.dp, horizontal = 8.dp),
            contentPadding = PaddingValues(vertical = 4.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(categories, key = { it.id }) { category ->
                val isSelected = category.id == selectedCategoryId
                androidx.tv.material3.Button(
                    onClick = { onCategorySelected(category.id) },
                    shape = androidx.tv.material3.ButtonDefaults.shape(RoundedCornerShape(12.dp)),
                    colors = androidx.tv.material3.ButtonDefaults.colors(
                        containerColor = if (isSelected) Color.White.copy(alpha = 0.15f) else Color.Transparent,
                        focusedContainerColor = Color.White,
                        focusedContentColor = Color.Black,
                        contentColor = if (isSelected) androidx.tv.material3.MaterialTheme.colorScheme.primary else Color.White.copy(alpha = 0.88f)
                    ),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    if (isSelected) {
                        Box(
                            modifier = Modifier
                                .size(4.dp, 16.dp)
                                .background(androidx.tv.material3.MaterialTheme.colorScheme.primary, RoundedCornerShape(2.dp))
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                    }
                    Text(
                        text = category.title,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                        maxLines = 1,
                        overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                    )
                }
            }
        }

        // Spacer
        Spacer(modifier = Modifier.width(16.dp))

        // Right Column: Focused Series Details Panel & Poster Grid
        Column(
            modifier = Modifier
                .weight(1f)
                .fillMaxHeight()
        ) {
            PosterGrid(
                items = seriesList,
                profileId = profileId,
                onItemFocused = { series, index ->
                    focusedSeries = series
                    if (focusPrefetchEnabled) {
                        prefetchManager.onCardFocused(
                            laneKey = "series:$selectedCategoryId",
                            currentIndex = index,
                            items = seriesList,
                            prefetchCount = focusForward,
                            backwardBufferCount = focusBack
                        )
                    }
                },
                onItemClick = onSeriesClick,
                modifier = Modifier.weight(1f),
                columns = 4
            )
        }
    }
}
