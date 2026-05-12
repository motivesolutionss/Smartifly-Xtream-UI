package com.smartifly.tv.features.watchlist

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.material3.CircularProgressIndicator
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.Text
import com.smartifly.tv.data.models.MovieMetadata
import com.smartifly.tv.ui.components.base.PosterGrid
import com.smartifly.tv.ui.theme.Dimensions
import com.smartifly.tv.ui.theme.PrimaryRed
import com.smartifly.tv.ui.theme.SmartiflyTheme
import com.smartifly.tv.ui.theme.TextPrimary

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun WatchlistScreen(
    viewModel: WatchlistViewModel,
    onItemClick: (MovieMetadata) -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()

    SmartiflyTheme {
        Column(modifier = Modifier.fillMaxSize().padding(Dimensions.PaddingExtraLarge)) {
            Text(
                text = "MY LIST",
                style = MaterialTheme.typography.displaySmall,
                color = TextPrimary,
                modifier = Modifier.padding(bottom = Dimensions.PaddingLarge)
            )

            Box(modifier = Modifier.weight(1f)) {
                when (val state = uiState) {
                    is WatchlistUiState.Loading -> {
                        CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                    }
                    is WatchlistUiState.Success -> {
                        PosterGrid(
                            items = state.items,
                            onItemFocused = { },
                            onItemClick = onItemClick
                        )
                    }
                    is WatchlistUiState.Empty -> {
                        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Text(text = "Your watchlist is empty. Add movies and series to watch them later.", color = Color.Gray)
                        }
                    }
                    is WatchlistUiState.Error -> {
                        Text(text = "Error: ${state.message}", color = PrimaryRed)
                    }
                }
            }
        }
    }
}
