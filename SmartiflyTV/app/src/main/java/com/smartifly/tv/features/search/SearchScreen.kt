package com.smartifly.tv.features.search

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
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
import com.smartifly.tv.ui.components.content.PosterCard
import com.smartifly.tv.ui.components.search.SearchKeyboard
import com.smartifly.tv.ui.theme.Dimensions
import com.smartifly.tv.ui.theme.PrimaryRed
import com.smartifly.tv.ui.theme.SmartiflyTheme
import com.smartifly.tv.ui.theme.TextPrimary
import com.smartifly.tv.ui.theme.TextSecondary

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun SearchScreen(viewModel: SearchViewModel) {
    val uiState by viewModel.uiState.collectAsState()
    var searchQuery by remember { mutableStateOf("") }

    SmartiflyTheme {
        Row(modifier = Modifier.fillMaxSize().padding(Dimensions.PaddingExtraLarge)) {
            // Left Column: Search Input + Keyboard
            Column(modifier = Modifier.width(400.dp)) {
                Text(
                    text = "SEARCH",
                    style = MaterialTheme.typography.headlineSmall,
                    color = PrimaryRed,
                    fontWeight = FontWeight.Bold
                )
                
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
                        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Text("Start typing to search movies, series, or live TV.", color = Color.Gray)
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
                        SearchResultsContent(state)
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
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun SearchResultsContent(state: SearchUiState.Success) {
    TvLazyVerticalGrid(
        columns = TvGridCells.Fixed(3),
        modifier = Modifier.fillMaxSize()
    ) {
        // Movies & Series Group
        itemsIndexed(state.results) { _, movie ->
            PosterCard(
                movie = movie,
                onFocus = { },
                onClick = { /* Open details */ }
            )
        }

        // Upcoming EPG Programs Group
        if (state.epgPrograms.isNotEmpty()) {
            item(span = { androidx.tv.foundation.lazy.grid.TvGridItemSpan(3) }) {
                Text(
                    text = "Upcoming on TV",
                    style = MaterialTheme.typography.headlineSmall,
                    modifier = Modifier.padding(vertical = 16.dp),
                    color = Color.Gray
                )
            }
            itemsIndexed(state.epgPrograms) { _, program ->
                EpgResultCard(program = program)
            }
        }
    }
}
