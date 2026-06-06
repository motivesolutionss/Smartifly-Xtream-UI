package com.smartifly.tv.features.search

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.LocalMovies
import androidx.compose.material.icons.filled.LiveTv
import androidx.compose.material.icons.filled.Tv
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.automirrored.rounded.TrendingUp
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.runtime.*
import com.smartifly.tv.BuildConfig
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.foundation.lazy.grid.TvGridCells
import androidx.tv.foundation.lazy.grid.TvLazyVerticalGrid
import androidx.tv.foundation.lazy.grid.itemsIndexed
import androidx.tv.foundation.lazy.list.TvLazyColumn
import androidx.tv.foundation.lazy.list.TvLazyRow
import androidx.tv.foundation.lazy.list.items
import androidx.tv.material3.*
import com.smartifly.tv.data.models.MovieMetadata
import com.smartifly.tv.data.models.SearchDiscoveryRow
import com.smartifly.tv.ui.components.content.LiveChannelCard
import com.smartifly.tv.ui.components.content.PosterCard
import com.smartifly.tv.ui.components.search.SearchKeyboard
import com.smartifly.tv.ui.theme.Dimensions
import com.smartifly.tv.ui.theme.PrimaryRed
import com.smartifly.tv.ui.theme.TextPrimary
import com.smartifly.tv.ui.theme.TextSecondary

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun SearchScreen(
    viewModel: SearchViewModel,
    profileId: String,
    onMovieClick: (MovieMetadata) -> Unit
) {
    val searchPerfTag = "SmartiflySearchPerf"
    val uiState by viewModel.uiState.collectAsState()
    var searchQuery by remember { mutableStateOf("") }
    var searchScreenLoadStartedAtMs by remember { mutableStateOf(System.currentTimeMillis()) }
    var searchSuccessLogged by remember { mutableStateOf(false) }
    var pendingSearchQuery by remember { mutableStateOf("") }
    
    val context = LocalContext.current
    val voiceManager = remember { VoiceSearchManager(context) }
    val voiceState by voiceManager.state.collectAsState()
    val voiceResult by voiceManager.results.collectAsState()

    LaunchedEffect(voiceResult) {
        if (voiceResult.isNotEmpty()) {
            searchQuery = voiceResult
            pendingSearchQuery = voiceResult.trim()
            searchScreenLoadStartedAtMs = System.currentTimeMillis()
            searchSuccessLogged = false
            viewModel.onQueryChanged(voiceResult)
        }
    }

    LaunchedEffect(searchQuery) {
        val trimmed = searchQuery.trim()
        if (trimmed.length >= 2) {
            pendingSearchQuery = trimmed
            searchScreenLoadStartedAtMs = System.currentTimeMillis()
            searchSuccessLogged = false
        }
    }

    LaunchedEffect(uiState) {
        when (val state = uiState) {
            is SearchUiState.Idle -> {
                searchSuccessLogged = false
            }
            is SearchUiState.Loading -> {
                if (pendingSearchQuery.length >= 2) {
                    searchScreenLoadStartedAtMs = System.currentTimeMillis()
                }
                searchSuccessLogged = false
            }
            is SearchUiState.Success -> {
                if (!searchSuccessLogged && BuildConfig.LIVE_DEBUG_TRACE) {
                    android.util.Log.i(
                        searchPerfTag,
                        "search_ui_success profile=$profileId query=$pendingSearchQuery duration_ms=${System.currentTimeMillis() - searchScreenLoadStartedAtMs} content_results=${state.results.size} epg_results=${state.epgPrograms.size}"
                    )
                }
                searchSuccessLogged = true
            }
            is SearchUiState.Empty -> {
                if (BuildConfig.LIVE_DEBUG_TRACE) {
                    android.util.Log.i(
                        searchPerfTag,
                        "search_ui_empty profile=$profileId query=$pendingSearchQuery duration_ms=${System.currentTimeMillis() - searchScreenLoadStartedAtMs}"
                    )
                }
            }
            is SearchUiState.Error -> {
                if (BuildConfig.LIVE_DEBUG_TRACE) {
                    android.util.Log.i(
                        searchPerfTag,
                        "search_ui_error profile=$profileId query=$pendingSearchQuery duration_ms=${System.currentTimeMillis() - searchScreenLoadStartedAtMs} message=${state.message}"
                    )
                }
            }
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {

            Row(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(vertical = 12.dp, horizontal = 24.dp),
                horizontalArrangement = Arrangement.spacedBy(24.dp)
            ) {
                // Left Column: Search Input + Keyboard (Glassmorphic Pane)
                Box(
                    modifier = Modifier
                        .width(300.dp)
                        .fillMaxHeight()
                        .background(Color.White.copy(alpha = 0.02f), RoundedCornerShape(24.dp))
                        .border(
                            width = 1.dp,
                            brush = Brush.verticalGradient(
                                listOf(Color.White.copy(alpha = 0.08f), Color.White.copy(alpha = 0.01f))
                            ),
                            shape = RoundedCornerShape(24.dp)
                        )
                        .padding(12.dp)
                ) {
                    Column(
                        modifier = Modifier.fillMaxSize(),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "SEARCH",
                                style = MaterialTheme.typography.titleMedium,
                                color = PrimaryRed,
                                fontWeight = FontWeight.Bold
                            )
                            
                            // Voice Search Trigger
                            val voiceInteractionSource = remember { MutableInteractionSource() }
                            val isVoiceFocused by voiceInteractionSource.collectIsFocusedAsState()
                            val voiceScale by animateFloatAsState(
                                targetValue = if (isVoiceFocused) 1.15f else 1.0f,
                                animationSpec = spring(
                                    dampingRatio = Spring.DampingRatioNoBouncy,
                                    stiffness = Spring.StiffnessMedium
                                ),
                                label = "voiceScale"
                            )
                            Surface(
                                onClick = { voiceManager.startListening() },
                                interactionSource = voiceInteractionSource,
                                modifier = Modifier
                                    .size(28.dp)
                                    .graphicsLayer {
                                        scaleX = voiceScale
                                        scaleY = voiceScale
                                    },
                                scale = ClickableSurfaceDefaults.scale(focusedScale = 1.0f),
                                shape = ClickableSurfaceDefaults.shape(CircleShape),
                                border = ClickableSurfaceDefaults.border(
                                    focusedBorder = Border(
                                        border = androidx.compose.foundation.BorderStroke(2.dp, Color.White),
                                        shape = CircleShape
                                    )
                                ),
                                colors = ClickableSurfaceDefaults.colors(
                                    containerColor = Color.White.copy(alpha = 0.06f),
                                    focusedContainerColor = PrimaryRed,
                                    focusedContentColor = Color.White,
                                    contentColor = Color.White
                                )
                            ) {
                                Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                                    Icon(
                                        imageVector = Icons.Default.Mic,
                                        contentDescription = "Voice Search",
                                        tint = Color.White,
                                        modifier = Modifier.size(16.dp)
                                    )
                                }
                            }
                        }
                        
                        Spacer(modifier = Modifier.height(8.dp))
                        
                        // Search Input Box (Focusable to allow quick clearing)
                        val inputInteractionSource = remember { MutableInteractionSource() }
                        val isInputFocused by inputInteractionSource.collectIsFocusedAsState()
                        Surface(
                            onClick = { 
                                searchQuery = ""
                                viewModel.onQueryChanged("")
                            },
                            interactionSource = inputInteractionSource,
                            shape = ClickableSurfaceDefaults.shape(RoundedCornerShape(12.dp)),
                            border = ClickableSurfaceDefaults.border(
                                focusedBorder = Border(
                                    border = androidx.compose.foundation.BorderStroke(2.dp, PrimaryRed),
                                    shape = RoundedCornerShape(12.dp)
                                )
                            ),
                            colors = ClickableSurfaceDefaults.colors(
                                containerColor = Color.White.copy(alpha = 0.06f),
                                focusedContainerColor = Color.White.copy(alpha = 0.12f),
                                focusedContentColor = TextPrimary,
                                contentColor = TextPrimary
                            ),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(36.dp)
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .padding(horizontal = 16.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Search,
                                    contentDescription = null,
                                    tint = if (isInputFocused) PrimaryRed else Color.Gray,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(12.dp))
                                Text(
                                    text = if (searchQuery.isEmpty()) "Type to search..." else searchQuery,
                                    color = if (searchQuery.isEmpty()) Color.Gray else TextPrimary,
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.SemiBold,
                                    modifier = Modifier.weight(1f)
                                )
                                if (searchQuery.isNotEmpty()) {
                                    Icon(
                                        imageVector = Icons.Rounded.Close,
                                        contentDescription = "Clear search",
                                        tint = Color.Gray,
                                        modifier = Modifier.size(16.dp)
                                    )
                                }
                            }
                        }
                        
                        Spacer(modifier = Modifier.height(8.dp))
                        
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
                            },
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }
                
                // Right Column: Search Results & Suggestions (Glassmorphic Pane)
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxHeight()
                        .background(Color.White.copy(alpha = 0.01f), RoundedCornerShape(24.dp))
                        .border(
                            width = 1.dp,
                            brush = Brush.verticalGradient(
                                listOf(Color.White.copy(alpha = 0.04f), Color.White.copy(alpha = 0.01f))
                            ),
                            shape = RoundedCornerShape(24.dp)
                        )
                        .padding(24.dp)
                ) {
                    Column(modifier = Modifier.fillMaxSize()) {
                        Text(
                            text = if (searchQuery.isEmpty()) "Discover Content" else "Results for '$searchQuery'",
                            style = MaterialTheme.typography.titleMedium,
                            color = TextSecondary,
                            fontWeight = FontWeight.SemiBold
                        )
                        
                        Spacer(modifier = Modifier.height(16.dp))
                        
                        when (val state = uiState) {
                            is SearchUiState.Idle -> {
                                TvLazyColumn(
                                    modifier = Modifier.fillMaxSize(),
                                    verticalArrangement = Arrangement.spacedBy(20.dp),
                                    contentPadding = PaddingValues(bottom = 24.dp)
                                ) {
                                    if (state.suggestions.isNotEmpty()) {
                                        item {
                                            Text(
                                                text = if (searchQuery.isBlank()) "TRENDING SEARCHES" else "SUGGESTED SEARCHES",
                                                style = MaterialTheme.typography.labelSmall,
                                                color = PrimaryRed,
                                                fontWeight = FontWeight.Bold,
                                                modifier = Modifier.padding(bottom = 12.dp)
                                            )
                                        }
                                        item {
                                            TvLazyRow(
                                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                                                contentPadding = PaddingValues(vertical = 4.dp)
                                            ) {
                                                items(state.suggestions) { suggestion ->
                                                    val chipInteractionSource = remember { MutableInteractionSource() }
                                                    val isChipFocused by chipInteractionSource.collectIsFocusedAsState()
                                                    val chipScale by animateFloatAsState(
                                                        targetValue = if (isChipFocused) 1.08f else 1.0f,
                                                        animationSpec = spring(
                                                            dampingRatio = Spring.DampingRatioNoBouncy,
                                                            stiffness = Spring.StiffnessMedium
                                                        ),
                                                        label = "chipScale"
                                                    )
                                                    Surface(
                                                        onClick = {
                                                            searchQuery = suggestion
                                                            viewModel.onQueryChanged(suggestion)
                                                        },
                                                        interactionSource = chipInteractionSource,
                                                        modifier = Modifier
                                                            .graphicsLayer {
                                                                scaleX = chipScale
                                                                scaleY = chipScale
                                                            },
                                                        scale = ClickableSurfaceDefaults.scale(focusedScale = 1.0f),
                                                        shape = ClickableSurfaceDefaults.shape(RoundedCornerShape(20.dp)),
                                                        border = ClickableSurfaceDefaults.border(
                                                            focusedBorder = Border(
                                                                border = androidx.compose.foundation.BorderStroke(2.dp, PrimaryRed),
                                                                shape = RoundedCornerShape(20.dp)
                                                            )
                                                        ),
                                                        colors = ClickableSurfaceDefaults.colors(
                                                            containerColor = Color.White.copy(alpha = 0.06f),
                                                            focusedContainerColor = Color.White,
                                                            focusedContentColor = Color.Black,
                                                            contentColor = Color.White
                                                        )
                                                    ) {
                                                        Row(
                                                            verticalAlignment = Alignment.CenterVertically,
                                                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                                                        ) {
                                                            Icon(
                                                                imageVector = Icons.AutoMirrored.Rounded.TrendingUp,
                                                                contentDescription = null,
                                                                tint = if (isChipFocused) Color.Black else PrimaryRed,
                                                                modifier = Modifier.size(16.dp)
                                                            )
                                                            Spacer(modifier = Modifier.width(6.dp))
                                                            Text(
                                                                text = suggestion,
                                                                style = MaterialTheme.typography.bodyMedium,
                                                                fontWeight = FontWeight.SemiBold
                                                            )
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }

                                    if (state.discoveryRows.isNotEmpty()) {
                                        item {
                                            Text(
                                                text = "SUGGESTED FOR YOU",
                                                style = MaterialTheme.typography.labelSmall,
                                                color = TextSecondary,
                                                fontWeight = FontWeight.Bold
                                            )
                                        }
                                        item {
                                            IdleDiscoveryRows(
                                                rows = state.discoveryRows,
                                                profileId = profileId,
                                                onMovieClick = onMovieClick
                                            )
                                        }
                                    }

                                    item {
                                        Column(horizontalAlignment = Alignment.Start) {
                                            Icon(
                                                imageVector = Icons.Default.Search,
                                                contentDescription = null,
                                                modifier = Modifier.size(72.dp),
                                                tint = Color.White.copy(alpha = 0.08f)
                                            )
                                            Spacer(modifier = Modifier.height(16.dp))
                                            Text(
                                                text = if (searchQuery.isBlank()) {
                                                    "Discover Movies, Series, and TV Channels"
                                                } else {
                                                    "Refine your search with live suggestions"
                                                },
                                                style = MaterialTheme.typography.titleMedium,
                                                color = TextPrimary,
                                                fontWeight = FontWeight.Bold
                                            )
                                            Spacer(modifier = Modifier.height(8.dp))
                                            Text(
                                                text = if (searchQuery.isBlank()) {
                                                    "Start typing on the left keyboard, use Voice Search, or pick a suggestion."
                                                } else {
                                                    "Suggestions are matched from current discovery trends while you type."
                                                },
                                                style = MaterialTheme.typography.bodyMedium,
                                                color = Color.Gray
                                            )
                                        }
                                    }
                                }
                            }
                            is SearchUiState.Loading -> {
                                TvLazyVerticalGrid(
                                    columns = TvGridCells.Fixed(5),
                                    contentPadding = PaddingValues(vertical = 8.dp),
                                    verticalArrangement = Arrangement.spacedBy(Dimensions.PaddingMedium),
                                    horizontalArrangement = Arrangement.spacedBy(Dimensions.PaddingMedium)
                                ) {
                                    items(10) {
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
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        Icon(
                                            imageVector = Icons.Default.Search,
                                            contentDescription = null,
                                            modifier = Modifier.size(64.dp),
                                            tint = PrimaryRed.copy(alpha = 0.5f)
                                        )
                                        Spacer(modifier = Modifier.height(16.dp))
                                        Text(
                                            text = "No results found for '$searchQuery'",
                                            style = MaterialTheme.typography.titleMedium,
                                            color = TextPrimary,
                                            fontWeight = FontWeight.Bold
                                        )
                                        Spacer(modifier = Modifier.height(8.dp))
                                        Text(
                                            text = "Try different keywords or verify spelling.",
                                            style = MaterialTheme.typography.bodyMedium,
                                            color = Color.Gray
                                        )
                                    }
                                }
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
                        Button(onClick = { voiceManager.stopListening() }) {
                            Text("Cancel")
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
    val liveResults = remember(state.results) { state.results.filter { it.type == "live" } }
    val onDemandResults = remember(state.results) { state.results.filter { it.type != "live" } }

    TvLazyVerticalGrid(
        columns = TvGridCells.Fixed(12),
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(bottom = 32.dp),
        verticalArrangement = Arrangement.spacedBy(Dimensions.PaddingMedium),
        horizontalArrangement = Arrangement.spacedBy(Dimensions.PaddingMedium)
    ) {
        if (liveResults.isNotEmpty()) {
            item(span = { androidx.tv.foundation.lazy.grid.TvGridItemSpan(12) }) {
                SearchResultSectionHeader(
                    title = "Live Channels",
                    count = liveResults.size
                )
            }
            itemsIndexed(
                items = liveResults,
                span = { _, _ -> androidx.tv.foundation.lazy.grid.TvGridItemSpan(4) }
            ) { _, movie ->
                SearchResultCard(
                    item = movie,
                    profileId = profileId,
                    onMovieClick = onMovieClick,
                    liveCardWidth = 300.dp,
                    liveCardHeight = 116.dp
                )
            }
        }

        if (onDemandResults.isNotEmpty()) {
            item(span = { androidx.tv.foundation.lazy.grid.TvGridItemSpan(12) }) {
                SearchResultSectionHeader(
                    title = "Movies & Series",
                    count = onDemandResults.size
                )
            }
            itemsIndexed(
                items = onDemandResults,
                span = { _, _ -> androidx.tv.foundation.lazy.grid.TvGridItemSpan(3) }
            ) { _, movie ->
                SearchResultCard(
                    item = movie,
                    profileId = profileId,
                    onMovieClick = onMovieClick,
                    posterCardWidth = 152.dp,
                    posterCardHeight = 228.dp,
                    liveCardWidth = 336.dp,
                    liveCardHeight = 116.dp
                )
            }
        }

        if (state.epgPrograms.isNotEmpty()) {
            item(span = { androidx.tv.foundation.lazy.grid.TvGridItemSpan(12) }) {
                SearchResultSectionHeader(
                    title = "Upcoming on TV",
                    count = state.epgPrograms.size
                )
            }
            itemsIndexed(
                items = state.epgPrograms,
                span = { _, _ -> androidx.tv.foundation.lazy.grid.TvGridItemSpan(6) }
            ) { _, program ->
                EpgResultCard(program = program)
            }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun SearchResultSectionHeader(
    title: String,
    count: Int
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 8.dp, bottom = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .width(4.dp)
                .height(24.dp)
                .background(PrimaryRed, RoundedCornerShape(999.dp))
        )
        Spacer(modifier = Modifier.width(10.dp))
        Text(
            text = "$title ($count)",
            style = MaterialTheme.typography.titleMedium,
            color = TextPrimary,
            fontWeight = FontWeight.Bold
        )
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun IdleDiscoveryRows(
    rows: List<SearchDiscoveryRow>,
    profileId: String,
    onMovieClick: (MovieMetadata) -> Unit
) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(20.dp)
    ) {
        rows.forEach { row ->
            IdleDiscoveryRow(
                row = row,
                profileId = profileId,
                onMovieClick = onMovieClick
            )
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun IdleDiscoveryRow(
    row: SearchDiscoveryRow,
    profileId: String,
    onMovieClick: (MovieMetadata) -> Unit
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .width(4.dp)
                    .height(24.dp)
                    .background(PrimaryRed, RoundedCornerShape(999.dp))
            )
            Spacer(modifier = Modifier.width(10.dp))
            Text(
                text = "${row.title} (${row.items.size})",
                style = MaterialTheme.typography.titleMedium,
                color = TextPrimary,
                fontWeight = FontWeight.Bold
            )
        }

        Spacer(modifier = Modifier.height(12.dp))

        TvLazyRow(
            horizontalArrangement = Arrangement.spacedBy(Dimensions.PaddingMedium),
            contentPadding = PaddingValues(horizontal = 2.dp)
        ) {
            items(row.items) { item ->
                SearchResultCard(
                    item = item,
                    profileId = profileId,
                    onMovieClick = onMovieClick,
                    allowLiveClick = false,
                    posterCardWidth = 132.dp,
                    posterCardHeight = 198.dp,
                    liveCardWidth = 164.dp,
                    liveCardHeight = 92.dp
                )
            }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun SearchResultCard(
    item: MovieMetadata,
    profileId: String,
    onMovieClick: (MovieMetadata) -> Unit,
    allowLiveClick: Boolean = true,
    posterCardWidth: androidx.compose.ui.unit.Dp = Dimensions.PosterWidth,
    posterCardHeight: androidx.compose.ui.unit.Dp = Dimensions.PosterHeight,
    liveCardWidth: androidx.compose.ui.unit.Dp = Dimensions.LiveChannelWidth,
    liveCardHeight: androidx.compose.ui.unit.Dp = Dimensions.LiveChannelHeight
) {
    if (item.type == "live") {
        Box(modifier = Modifier.width(liveCardWidth)) {
            LiveChannelCard(
                channelName = item.title,
                profileId = profileId,
                logoUrl = item.posterUrl.ifBlank { item.backdropUrl },
                contentId = item.id,
                contentType = item.type,
                onFocus = { },
                onClick = {
                    if (allowLiveClick) {
                        onMovieClick(item)
                    }
                },
                cardWidth = liveCardWidth,
                cardHeight = liveCardHeight
            )
        }
    } else {
        PosterCard(
            movie = item,
            profileId = profileId,
            onFocus = { },
            onClick = { onMovieClick(item) },
            cardWidth = posterCardWidth,
            cardHeight = posterCardHeight
        )
    }
}
