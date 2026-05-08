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
import androidx.compose.material3.CircularProgressIndicator
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Text
import com.smartifly.tv.data.models.MovieMetadata
import com.smartifly.tv.data.remote.ApiClient
import com.smartifly.tv.data.repository.ContentRepository
import com.smartifly.tv.ui.components.base.ContentDetailsPanel
import com.smartifly.tv.ui.components.base.PosterGrid
import com.smartifly.tv.ui.components.base.SideCategoryRail
import com.smartifly.tv.ui.theme.SmartiflyTheme

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun MoviesScreen(profile: com.smartifly.tv.data.models.UserProfile) {
    val repository = remember { ContentRepository(ApiClient.api) }
    val viewModel = remember(profile.id) { MoviesViewModel(repository, profile) }
    val uiState by viewModel.uiState.collectAsState()

    SmartiflyTheme {
        when (val state = uiState) {
            is MoviesUiState.Loading -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }
            is MoviesUiState.Success -> {
                MoviesContent(
                    categories = state.categories,
                    movies = state.movies,
                    onCategorySelected = { viewModel.loadMovies(it) }
                )
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
    categories: List<String>,
    movies: List<MovieMetadata>,
    onCategorySelected: (String) -> Unit
) {
    var selectedCategory by remember { mutableStateOf(if (categories.isNotEmpty()) categories.first() else "") }
    var focusedMovie by remember { mutableStateOf(movies.firstOrNull()) }

    Row(modifier = Modifier.fillMaxSize()) {
        SideCategoryRail(
            categories = categories,
            selectedCategory = selectedCategory,
            onCategorySelected = { 
                selectedCategory = it
                onCategorySelected(it)
            }
        )
        
        Column(modifier = Modifier.weight(1f)) {
            focusedMovie?.let {
                ContentDetailsPanel(movie = it)
            }
            
            PosterGrid(
                items = movies,
                onItemFocused = { focusedMovie = it },
                onItemClick = { /* Open Player */ }
            )
        }
    }
}
