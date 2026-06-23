package com.smartifly.tv.features.live

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.tv.foundation.lazy.list.items
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.Text
import com.smartifly.tv.data.models.LiveStream
import com.smartifly.tv.data.models.MediaCategory
import com.smartifly.tv.data.models.MovieMetadata
import com.smartifly.tv.data.repository.ParentalControlManager
import com.smartifly.tv.performance.PrefetchBudgetController
import com.smartifly.tv.performance.PrefetchOrchestrator
import com.smartifly.tv.performance.lowend.DeviceTier
import com.smartifly.tv.performance.lowend.LocalPerformanceConfig
import com.smartifly.tv.ui.components.base.TopCategoryChipsLive
import com.smartifly.tv.ui.components.dialogs.PinEntryDialog
import com.smartifly.tv.ui.theme.Dimensions
import com.smartifly.tv.ui.theme.SmartiflyTheme
import kotlinx.coroutines.launch

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun LiveScreen(
    viewModel: LiveViewModel,
    profileId: String,
    parentalControlManager: ParentalControlManager,
    onChannelClick: (LiveStream) -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()

    SmartiflyTheme {
        when (val state = uiState) {
            is LiveUiState.Loading -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    com.smartifly.tv.ui.components.base.SmartiflyLoader()
                }
            }
            is LiveUiState.Success -> {
                val context = LocalContext.current
                val config = LocalPerformanceConfig.current
                val prefetchManager = remember(context) { PrefetchOrchestrator.manager(context) }
                val isUnlocked by parentalControlManager.isUnlocked.collectAsState()
                val scope = rememberCoroutineScope()
                var showPinDialog by remember { mutableStateOf(false) }
                var pendingCategory by remember { mutableStateOf<String?>(null) }
                var pinError by remember { mutableStateOf<String?>(null) }
                PrimeLiveAboveFold(
                    channels = state.channels,
                    selectedCategoryId = state.selectedCategoryId,
                    prefetchManager = prefetchManager,
                    tier = config.tier
                )

                LiveContent(
                    categories = state.categories,
                    selectedCategoryId = state.selectedCategoryId,
                    channels = state.channels,
                    profileId = profileId,
                    uiState = state,
                    viewModel = viewModel,
                    onCategorySelected = { categoryId ->
                        val categoryName = state.categories.find { it.id == categoryId }?.name ?: ""
                        if (parentalControlManager.isCategoryLocked(categoryName) && !isUnlocked) {
                            pendingCategory = categoryId
                            showPinDialog = true
                        } else {
                            viewModel.loadChannelsByCategory(categoryId)
                        }
                    },
                    onLoadMore = { viewModel.loadMoreCurrentCategory() },
                    onChannelLongPress = { channel ->
                        viewModel.toggleFavorite(channel) { added ->
                            val message = if (added) "Added to Favorites" else "Removed from Favorites"
                            Toast.makeText(context, message, Toast.LENGTH_SHORT).show()
                        }
                    },
                    onChannelClick = onChannelClick
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
                                    pendingCategory?.let { viewModel.loadChannelsByCategory(it) }
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
            is LiveUiState.Error -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(text = "Error: ${state.message}", color = MaterialTheme.colorScheme.error)
                }
            }
            is LiveUiState.Empty -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(text = "No Live TV channels available.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }
}

@Composable
private fun PrimeLiveAboveFold(
    channels: List<LiveStream>,
    selectedCategoryId: String,
    prefetchManager: com.smartifly.tv.performance.RowPrefetchManager,
    tier: DeviceTier
) {
    LaunchedEffect(selectedCategoryId, channels, tier) {
        if (channels.isEmpty()) return@LaunchedEffect
        if (!PrefetchBudgetController.allowAboveFold(PrefetchBudgetController.Screen.LIVE)) return@LaunchedEffect
        val (criticalItems, nearItems, warmItems) = when (tier) {
            DeviceTier.LOW -> listOf(6, 10, 14)
            DeviceTier.MEDIUM -> listOf(10, 16, 22)
            DeviceTier.HIGH -> listOf(12, 20, 28)
        }
        val channelCards = channels.map { channel ->
            MovieMetadata(
                id = channel.id,
                title = channel.name,
                description = channel.currentProgram ?: "Live Broadcast",
                year = "",
                rating = "",
                duration = "LIVE",
                posterUrl = channel.logoUrl,
                backdropUrl = channel.logoUrl,
                type = "live",
                categoryId = channel.categoryId
            )
        }
        prefetchManager.primeHomeAboveFold(
            sections = listOf(channelCards),
            maxRails = 1,
            itemsPerRail = nearItems,
            criticalRails = 1,
            criticalItemsPerRail = criticalItems,
            warmItemsPerRail = warmItems,
            debugTag = "live_first_viewport"
        )
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun LiveContent(
    categories: List<MediaCategory>,
    selectedCategoryId: String,
    channels: List<LiveStream>,
    profileId: String,
    uiState: LiveUiState.Success,
    viewModel: LiveViewModel,
    onCategorySelected: (String) -> Unit,
    onLoadMore: () -> Unit,
    onChannelLongPress: (LiveStream) -> Unit,
    onChannelClick: (LiveStream) -> Unit
) {
    var focusedChannel by remember { mutableStateOf(channels.firstOrNull()) }
    LaunchedEffect(selectedCategoryId, channels.firstOrNull()?.id) {
        val first = channels.firstOrNull()
        focusedChannel = first
        if (first != null) {
            viewModel.onChannelFocused(first)
        }
    }

    Row(
        modifier = Modifier
            .fillMaxSize()
    ) {
        // Left Column: Vertical Category List (EPG Sidebar styled)
        androidx.tv.foundation.lazy.list.TvLazyColumn(
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
                        text = category.name,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                        maxLines = 1,
                        overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                    )
                }
            }
        }

        // Spacer
        Spacer(modifier = Modifier.width(16.dp))

        // Right Column: Program Info spotlight row, Loaded Channel Count, and the Grid!
        Column(
            modifier = Modifier
                .weight(1f)
                .fillMaxHeight()
        ) {
            // Horizontal program info banner at the top of right side!
            LiveProgramInfoHorizontal(
                channel = focusedChannel,
                programs = uiState.focusedChannelEpg,
                modifier = Modifier.height(68.dp)
            )

            Spacer(modifier = Modifier.height(8.dp))

            val selectedCategoryName = categories.find { it.id == selectedCategoryId }?.name ?: "Live"
            val pagingStatus = when {
                uiState.isLoadingChannels -> "Loading..."
                uiState.isLoadingMore -> "Loading more..."
                uiState.hasMore -> "More available"
                else -> "Complete"
            }

            Text(
                text = "$selectedCategoryName: ${channels.size} loaded ($pagingStatus)",
                style = MaterialTheme.typography.labelMedium,
                color = Color.Gray,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
            )

            LiveChannelGrid(
                channels = channels,
                profileId = profileId,
                favoriteChannelIds = uiState.favoriteChannelIds,
                hasMore = uiState.hasMore,
                isLoadingMore = uiState.isLoadingMore,
                onLoadMore = onLoadMore,
                onChannelLongPress = onChannelLongPress,
                onChannelFocused = {
                    focusedChannel = it
                    viewModel.onChannelFocused(it)
                },
                onChannelClick = onChannelClick,
                modifier = Modifier.weight(1f)
            )

            if (uiState.categoryError != null) {
                Text(
                    text = uiState.categoryError,
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                )
            }
        }
    }
}
