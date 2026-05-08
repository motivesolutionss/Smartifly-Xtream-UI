package com.smartifly.tv.features.live

import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.material3.CircularProgressIndicator
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.Text
import com.smartifly.tv.data.models.ChannelMetadata
import com.smartifly.tv.data.remote.ApiClient
import com.smartifly.tv.data.remote.dto.LiveCategoryDto
import com.smartifly.tv.data.remote.dto.LiveChannelDto
import com.smartifly.tv.data.repository.LiveTvRepository
import com.smartifly.tv.ui.theme.SmartiflyTheme

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun LiveScreen() {
    val repository = remember { LiveTvRepository(ApiClient.api) }
    val viewModel = remember { LiveViewModel(repository) }
    val uiState by viewModel.uiState.collectAsState()

    SmartiflyTheme {
        when (val state = uiState) {
            is LiveUiState.Loading -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }
            is LiveUiState.Success -> {
                LiveContent(
                    categories = state.categories,
                    channels = state.channels,
                    onCategorySelected = { viewModel.loadChannelsByCategory(it) }
                )
            }
            is LiveUiState.Error -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(text = "Error: ${state.message}", color = Color.Red)
                }
            }
            is LiveUiState.Empty -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(text = "No Live TV channels available.", color = Color.Gray)
                }
            }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun LiveContent(
    categories: List<LiveCategoryDto>,
    channels: List<LiveChannelDto>,
    onCategorySelected: (String) -> Unit
) {
    var selectedCategoryId by remember { mutableStateOf(categories.firstOrNull()?.id ?: "") }
    var focusedChannel by remember { mutableStateOf(channels.firstOrNull()) }
    val currentCategoryName = categories.find { it.id == selectedCategoryId }?.name ?: "General"

    Row(modifier = Modifier.fillMaxSize()) {
        LiveCategoryRail(
            categories = categories.map { it.name },
            selectedCategory = currentCategoryName,
            onCategorySelected = { name ->
                val category = categories.find { it.name == name }
                category?.let {
                    selectedCategoryId = it.id
                    onCategorySelected(it.id)
                }
            }
        )
        
        Column(modifier = Modifier.weight(1f)) {
            focusedChannel?.let {
                LiveProgramInfo(
                    channel = ChannelMetadata(
                        id = it.id,
                        name = it.name,
                        logoUrl = it.logo,
                        currentProgram = it.currentProgram ?: "No Program Info",
                        nextProgram = it.nextProgram ?: "Coming Up: Unknown",
                        category = currentCategoryName
                    )
                )
            }
            
            LiveChannelGrid(
                channels = channels,
                onChannelFocused = { focusedChannel = it },
                onChannelClick = { /* Open Player with it.streamUrl */ }
            )
        }
    }
}
