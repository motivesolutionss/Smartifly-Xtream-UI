package com.smartifly.tv.features.search

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.tv.foundation.lazy.grid.TvGridCells
import androidx.tv.foundation.lazy.grid.TvLazyVerticalGrid
import androidx.tv.foundation.lazy.grid.itemsIndexed
import androidx.compose.material3.CircularProgressIndicator
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.Text
import com.smartifly.tv.data.models.MovieMetadata
import com.smartifly.tv.ui.components.content.PosterCard
import com.smartifly.tv.ui.components.search.SearchKeyboard
import com.smartifly.tv.ui.theme.Dimensions
import com.smartifly.tv.ui.theme.PrimaryRed
import com.smartifly.tv.ui.theme.SmartiflyTheme
import com.smartifly.tv.ui.theme.TextPrimary
import com.smartifly.tv.ui.theme.TextSecondary
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material3.Icon
import androidx.compose.ui.platform.LocalContext
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.ui.draw.clip
import androidx.tv.material3.Surface
import androidx.tv.material3.ClickableSurfaceDefaults

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun SearchScreen(
    viewModel: SearchViewModel,
    profileId: String,
    onMovieClick: (MovieMetadata) -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    var searchQuery by remember { mutableStateOf("") }
    
    val context = LocalContext.current
    val voiceManager = remember { VoiceSearchManager(context) }
    val voiceState by voiceManager.state.collectAsState()
    val voiceResult by voiceManager.results.collectAsState()

    LaunchedEffect(voiceResult) {
        if (voiceResult.isNotEmpty()) {
            searchQuery = voiceResult
            viewModel.onQueryChanged(voiceResult)
        }
    }

    SmartiflyTheme {
        Box(modifier = Modifier.fillMaxSize().background(Color.Black)) {
            // Subtle Background Gradient
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(
                                Color.Transparent,
                                Color.Black.copy(alpha = 0.5f),
                                Color.Black
                            )
                        )
                    )
            )

            Row(modifier = Modifier.fillMaxSize().padding(Dimensions.PaddingExtraLarge)) {
                // Left Column: Search Input + Keyboard
                Column(modifier = Modifier.width(400.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "SEARCH",
                            style = MaterialTheme.typography.headlineSmall,
                            color = PrimaryRed,
                            fontWeight = FontWeight.Bold
                        )
                        
                        // Voice Search Trigger
                        Surface(
                            onClick = { voiceManager.startListening() },
                            modifier = Modifier.size(48.dp).clip(CircleShape),
                            colors = ClickableSurfaceDefaults.colors(
                                containerColor = Color.White.copy(alpha = 0.1f),
                                focusedContainerColor = PrimaryRed
                            )
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    imageVector = Icons.Default.Mic,
                                    contentDescription = "Voice Search",
                                    tint = Color.White,
                                    modifier = Modifier.size(24.dp)
                                )
                            }
                        }
                    }
                    
                    Spacer(modifier = Modifier.height(Dimensions.PaddingMedium))
                
                // Search Input Box
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(60.dp)
                        .background(Color.White.copy(alpha = 0.1f), shape = androidx.compose.foundation.shape.RoundedCornerShape(8.dp))
                        .padding(horizontal = 16.dp),
                    contentAlignment = Alignment.CenterStart
                ) {
                    Text(
                        text = if (searchQuery.isEmpty()) "Type to search..." else searchQuery,
                        color = if (searchQuery.isEmpty()) Color.Gray else TextPrimary,
                        style = MaterialTheme.typography.headlineSmall
                    )
                }
                
                Spacer(modifier = Modifier.height(Dimensions.PaddingLarge))
                
                SearchKeyboard(
                    onKeyClick = { 
                        searchQuery += it
                        viewModel.onQueryChanged(searchQuery)
                    },
                    onDeleteClick = { 
                        if (searchQuery.isNotEmpty()) {
                            searchQuery = searchQuery.dropLast(1)
                            viewModel.onQueryChanged(searchQuery)
                        }
                    },
                    onClearClick = { 
                        searchQuery = ""
                        viewModel.onQueryChanged(searchQuery)
                    }
                )
            }
            
            Spacer(modifier = Modifier.width(Dimensions.PaddingExtraLarge))
            
            // Right Column: Search Results
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = if (searchQuery.isEmpty()) "Discover Content" else "Results for '$searchQuery'",
                    style = MaterialTheme.typography.headlineSmall,
                    color = TextSecondary
                )
                
                Spacer(modifier = Modifier.height(Dimensions.PaddingMedium))
                
                when (val state = uiState) {
                    is SearchUiState.Idle -> {
                        Column(modifier = Modifier.fillMaxSize().padding(top = Dimensions.PaddingLarge)) {
                            if (state.suggestions.isNotEmpty()) {
                                Text(
                                    text = "TRENDING SEARCHES",
                                    style = MaterialTheme.typography.labelLarge,
                                    color = PrimaryRed,
                                    fontWeight = FontWeight.Bold
                                )
                                Spacer(modifier = Modifier.height(Dimensions.PaddingMedium))
                                
                                androidx.compose.foundation.lazy.LazyRow(
                                    horizontalArrangement = Arrangement.spacedBy(Dimensions.PaddingMedium)
                                ) {
                                    items(state.suggestions.size) { index ->
                                        val suggestion = state.suggestions[index]
                                        androidx.tv.material3.Surface(
                                            onClick = { 
                                                searchQuery = suggestion
                                                viewModel.onQueryChanged(suggestion)
                                            },
                                            shape = androidx.tv.material3.ClickableSurfaceDefaults.shape(androidx.compose.foundation.shape.RoundedCornerShape(20.dp)),
                                            colors = androidx.tv.material3.ClickableSurfaceDefaults.colors(
                                                containerColor = Color.White.copy(alpha = 0.1f),
                                                focusedContainerColor = PrimaryRed
                                            )
                                        ) {
                                            Text(
                                                text = suggestion,
                                                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                                                style = MaterialTheme.typography.bodyMedium
                                            )
                                        }
                                    }
                                }
                            }
                            
                            Box(modifier = Modifier.weight(1f), contentAlignment = Alignment.Center) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Icon(
                                        imageVector = Icons.Default.Search,
                                        contentDescription = null,
                                        modifier = Modifier.size(64.dp),
                                        tint = Color.Gray.copy(alpha = 0.3f)
                                    )
                                    Spacer(modifier = Modifier.height(16.dp))
                                    Text("Start typing or use Voice to discover content", color = Color.Gray)
                                }
                            }
                        }
                    }
                    is SearchUiState.Loading -> {
                        TvLazyVerticalGrid(
                            columns = TvGridCells.Fixed(6),
                            contentPadding = PaddingValues(Dimensions.PaddingExtraLarge),
                            verticalArrangement = Arrangement.spacedBy(Dimensions.PaddingMedium),
                            horizontalArrangement = Arrangement.spacedBy(Dimensions.PaddingMedium)
                        ) {
                            items(12) {
                                com.smartifly.tv.ui.components.base.ShimmerPosterCard()
                            }
                        }
                    }
                    is SearchUiState.Success -> {
                        SearchResultsContent(
                            state = state,
                            profileId = profileId,
                            onMovieClick = onMovieClick
                        )
                    }
                    is SearchUiState.Error -> {
                        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Text(text = "Search Error: ${state.message}", color = Color.Red)
                        }
                    }
                    is SearchUiState.Empty -> {
                        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Text("No results found for '$searchQuery'.", color = Color.Gray)
                        }
                    }
                }
            }
            }
        }

        // Voice Listening Overlay (Enterprise Glassmorphism)
        AnimatedVisibility(
            visible = voiceState != VoiceState.IDLE,
            enter = fadeIn(),
            exit = fadeOut()
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.8f))
                    .padding(32.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    com.smartifly.tv.ui.components.base.SmartiflyLoader(modifier = Modifier.size(100.dp))
                    Spacer(modifier = Modifier.height(32.dp))
                    Text(
                        text = when (voiceState) {
                            VoiceState.LISTENING -> "Listening..."
                            VoiceState.PROCESSING -> "Processing..."
                            VoiceState.ERROR -> "Didn't catch that. Try again."
                            else -> ""
                        },
                        style = MaterialTheme.typography.displaySmall,
                        color = Color.White,
                        fontWeight = FontWeight.Bold
                    )
                    
                    if (voiceState == VoiceState.ERROR) {
                        Spacer(modifier = Modifier.height(16.dp))
                        androidx.tv.material3.Button(onClick = { voiceManager.stopListening() }) {
                            Text("Cancel")
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun SearchResultsContent(
    state: SearchUiState.Success,
    profileId: String,
    onMovieClick: (MovieMetadata) -> Unit
) {
    TvLazyVerticalGrid(
        columns = TvGridCells.Fixed(6),
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(bottom = 32.dp),
        verticalArrangement = Arrangement.spacedBy(Dimensions.PaddingMedium),
        horizontalArrangement = Arrangement.spacedBy(Dimensions.PaddingMedium)
    ) {
        // Movies & Series Group
        itemsIndexed(state.results) { _, movie ->
            PosterCard(
                movie = movie,
                profileId = profileId,
                onFocus = { },
                onClick = { onMovieClick(movie) }
            )
        }

        // Upcoming EPG Programs Group
        if (state.epgPrograms.isNotEmpty()) {
            item(span = { androidx.tv.foundation.lazy.grid.TvGridItemSpan(6) }) {
                Text(
                    text = "Upcoming on TV",
                    style = MaterialTheme.typography.headlineSmall,
                    modifier = Modifier.padding(vertical = 16.dp),
                    color = Color.Gray
                )
            }
            itemsIndexed(
                items = state.epgPrograms,
                span = { _, _ -> androidx.tv.foundation.lazy.grid.TvGridItemSpan(3) }
            ) { _, program ->
                EpgResultCard(program = program)
            }
        }
    }
}
