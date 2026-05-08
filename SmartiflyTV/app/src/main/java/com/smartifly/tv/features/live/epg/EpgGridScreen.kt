package com.smartifly.tv.features.live.epg

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.tv.foundation.lazy.list.TvLazyColumn
import androidx.tv.foundation.lazy.list.TvLazyRow
import androidx.tv.foundation.lazy.list.items
import androidx.compose.material3.CircularProgressIndicator
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.Text
import com.smartifly.tv.ui.theme.SmartiflyTheme

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun EpgGridScreen(viewModel: EpgViewModel = viewModel()) {
    val uiState by viewModel.uiState.collectAsState()

    SmartiflyTheme {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black)
        ) {
            when (val state = uiState) {
                is EpgUiState.Loading -> {
                    CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                }
                is EpgUiState.Success -> {
                    EpgMatrix(state.channels, state.startTime)
                }
                is EpgUiState.Error -> {
                    Text(
                        text = state.message,
                        color = Color.Red,
                        modifier = Modifier.align(Alignment.Center)
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun EpgMatrix(channels: List<EpgChannel>, startTime: Long) {
    Column(modifier = Modifier.fillMaxSize()) {
        // Matrix Row
        Row(modifier = Modifier.fillMaxSize()) {
            // Channel Column (Stays fixed horizontally, scrolls vertically)
            Column(modifier = Modifier.padding(top = 40.dp)) { // Offset by header height
                TvLazyColumn {
                    items(channels) { channel ->
                        EpgChannelColumn(channel)
                    }
                }
            }

            // Grid Content (Scrolls both ways)
            Column(modifier = Modifier.weight(1f)) {
                // Time Header (Scrolls horizontally with programs)
                TvLazyRow(
                    contentPadding = PaddingValues(0.dp)
                ) {
                    item {
                        EpgTimelineHeader(startTime = startTime)
                    }
                }

                // Program Rows
                TvLazyColumn {
                    items(channels) { channel ->
                        EpgRow(channel = channel)
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun EpgRow(channel: EpgChannel) {
    TvLazyRow(
        modifier = Modifier.fillMaxWidth().height(80.dp),
        contentPadding = PaddingValues(0.dp)
    ) {
        items(channel.programs) { program ->
            EpgProgramCell(
                program = program,
                onClick = { /* Play Channel */ }
            )
        }
    }
}
