package com.smartifly.tv.features.live.epg

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.Text
import com.smartifly.tv.ui.theme.PrimaryRed
import com.smartifly.tv.ui.theme.SurfaceVariant
import com.smartifly.tv.ui.theme.TextPrimary
import com.smartifly.tv.ui.theme.TextSecondary
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

private const val MINUTE_WIDTH = 10 // 10dp per minute

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun EpgProgramCell(
    program: EpgProgram,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val durationMinutes = (program.endTime - program.startTime) / 60000
    val cellWidth = (durationMinutes.toInt() * MINUTE_WIDTH).dp
    
    var isFocused by remember { mutableStateOf(false) }
    val timeFormatter = remember { SimpleDateFormat("HH:mm", Locale.getDefault()) }

    Box(
        modifier = modifier
            .width(cellWidth)
            .height(80.dp)
            .padding(1.dp)
            .onFocusChanged { state -> isFocused = state.isFocused }
            .focusable()
            .clickable { onClick() }
            .background(if (isFocused) Color.White.copy(alpha = 0.2f) else SurfaceVariant)
            .border(
                width = 2.dp,
                color = if (isFocused) PrimaryRed else Color.Transparent
            )
            .padding(8.dp)
    ) {
        Column {
            Text(
                text = program.title,
                style = MaterialTheme.typography.labelLarge,
                color = if (isFocused) Color.White else TextPrimary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                fontWeight = if (isFocused) FontWeight.Bold else FontWeight.Normal
            )
            Text(
                text = "${timeFormatter.format(Date(program.startTime))} - ${timeFormatter.format(Date(program.endTime))}",
                style = MaterialTheme.typography.labelSmall,
                color = TextSecondary
            )
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun EpgTimelineHeader(startTime: Long, durationHours: Int = 24) {
    val timeFormatter = remember { SimpleDateFormat("HH:mm", Locale.getDefault()) }
    
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(40.dp)
            .background(Color.Black.copy(alpha = 0.8f))
    ) {
        for (i in 0 until (durationHours * 2)) {
            val tickTime = startTime + (i * 30 * 60000L)
            Box(
                modifier = Modifier
                    .width((30 * MINUTE_WIDTH).dp)
                    .fillMaxHeight(),
                contentAlignment = Alignment.CenterStart
            ) {
                Text(
                    text = timeFormatter.format(Date(tickTime)),
                    style = MaterialTheme.typography.labelMedium,
                    color = TextSecondary,
                    modifier = Modifier.padding(start = 8.dp)
                )
            }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun EpgChannelColumn(channel: EpgChannel) {
    Box(
        modifier = Modifier
            .width(150.dp)
            .height(80.dp)
            .background(SurfaceVariant.copy(alpha = 0.5f))
            .padding(8.dp),
        contentAlignment = Alignment.CenterStart
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = channel.name,
                style = MaterialTheme.typography.labelLarge,
                color = TextPrimary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}
