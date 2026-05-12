package com.smartifly.tv.features.live

import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.Text
import com.smartifly.tv.data.models.LiveStream
import com.smartifly.tv.data.models.MediaCategory
import com.smartifly.tv.data.repository.XtreamRepository
import com.smartifly.tv.ui.theme.SmartiflyTheme
import com.smartifly.tv.ui.components.dialogs.PinEntryDialog
import com.smartifly.tv.data.repository.ParentalControlManager
import kotlinx.coroutines.launch
import androidx.compose.runtime.rememberCoroutineScope

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun LiveScreen(
    repository: XtreamRepository,
    profileId: String,
    parentalControlManager: ParentalControlManager,
    onChannelClick: (LiveStream) -> Unit
) {
    val viewModel = remember(repository) { LiveViewModel(repository) }
    DisposableEffect(viewModel) {
        onDispose { viewModel.disposeForScreenExit() }
    }
    val uiState by viewModel.uiState.collectAsState()

    SmartiflyTheme {
        when (val state = uiState) {
            is LiveUiState.Loading -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    com.smartifly.tv.ui.components.base.SmartiflyLoader()
                }
            }
            is LiveUiState.Success -> {
                val isUnlocked by parentalControlManager.isUnlocked.collectAsState()
                val scope = rememberCoroutineScope()
                var showPinDialog by remember { mutableStateOf(false) }
                var pendingCategory by remember { mutableStateOf<String?>(null) }
                var pinError by remember { mutableStateOf<String?>(null) }

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

    Row(modifier = Modifier.fillMaxSize()) {
        LiveCategoryRail(
            categories = categories,
            selectedCategoryId = selectedCategoryId,
            onCategorySelected = onCategorySelected
        )
        
        Column(modifier = Modifier.weight(1f)) {
            val selectedCategoryName = categories.find { it.id == selectedCategoryId }?.name ?: "All"
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
                modifier = Modifier.padding(horizontal = 24.dp, vertical = 8.dp)
            )

            LiveProgramInfo(
                channel = focusedChannel,
                programs = (uiState as? LiveUiState.Success)?.focusedChannelEpg ?: emptyList()
            )
            
            LiveChannelGrid(
                channels = channels,
                profileId = profileId,
                hasMore = uiState.hasMore,
                isLoadingMore = uiState.isLoadingMore,
                onLoadMore = onLoadMore,
                onChannelFocused = { 
                    focusedChannel = it
                    viewModel.onChannelFocused(it)
                },
                onChannelClick = onChannelClick
            )

            if (uiState.categoryError != null) {
                Text(
                    text = uiState.categoryError,
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.padding(horizontal = 24.dp, vertical = 8.dp)
                )
            }
        }
    }
}
