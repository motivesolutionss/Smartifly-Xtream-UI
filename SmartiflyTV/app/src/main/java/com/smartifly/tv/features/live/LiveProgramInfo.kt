package com.smartifly.tv.features.live

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.Text
import com.smartifly.tv.data.models.LiveStream
import com.smartifly.tv.features.live.epg.EpgProgram
import com.smartifly.tv.ui.theme.*
import java.text.SimpleDateFormat
import java.util.*

/**
 * Enterprise-grade Program Information display for Live TV.
 * Shows high-fidelity metadata for the currently focused channel and its EPG.
 */
@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun LiveProgramInfo(
    channel: LiveStream?,
    programs: List<EpgProgram>,
    modifier: Modifier = Modifier
) {
    val timeFormatter = SimpleDateFormat("HH:mm", Locale.getDefault())
    val now = System.currentTimeMillis()
    
    val currentProgram = programs.find { now in it.startTime..it.endTime }
    val nextProgram = programs.find { it.startTime > now }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(start = 24.dp, end = 16.dp, top = 24.dp, bottom = 16.dp)
    ) {
        channel?.let { data ->
            Text(
                text = data.name.uppercase(),
                style = MaterialTheme.typography.labelMedium,
                color = PrimaryRed,
                fontWeight = FontWeight.Bold,
                letterSpacing = androidx.compose.ui.unit.TextUnit.Unspecified
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Text(
                text = currentProgram?.title ?: data.currentProgram ?: "Live Broadcast",
                style = MaterialTheme.typography.headlineLarge,
                color = TextPrimary,
                fontWeight = FontWeight.Bold
            )
            
            currentProgram?.let { prog ->
                val progress = ((now - prog.startTime).toFloat() / (prog.endTime - prog.startTime).toFloat()).coerceIn(0f, 1f)
                
                Spacer(modifier = Modifier.height(12.dp))
                
                // Progress Bar (Professional boutique style)
                androidx.compose.material3.LinearProgressIndicator(
                    progress = { progress },
                    modifier = Modifier.fillMaxWidth().height(4.dp),
                    color = PrimaryRed,
                    trackColor = Color.White.copy(alpha = 0.1f),
                    strokeCap = androidx.compose.ui.graphics.StrokeCap.Round
                )
                
                Spacer(modifier = Modifier.height(8.dp))
                
                Text(
                    text = "${timeFormatter.format(Date(prog.startTime))} - ${timeFormatter.format(Date(prog.endTime))}",
                    style = MaterialTheme.typography.labelSmall,
                    color = TextTertiary
                )
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            nextProgram?.let { next ->
                Row {
                    Text(
                        text = "NEXT: ",
                        style = MaterialTheme.typography.labelSmall,
                        color = TextSecondary,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "${next.title} (${timeFormatter.format(Date(next.startTime))})",
                        style = MaterialTheme.typography.labelSmall,
                        color = TextTertiary
                    )
                }
            } ?: run {
                Text(
                    text = data.nextProgram ?: "Upcoming: Schedule Unavailable",
                    style = MaterialTheme.typography.labelSmall,
                    color = TextTertiary
                )
            }
        } ?: run {
            Text(
                text = "Discover Live Channels",
                style = MaterialTheme.typography.headlineLarge,
                color = TextMuted,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = "Select a channel to see what's playing now.",
                style = MaterialTheme.typography.bodyLarge,
                color = TextMuted
            )
        }
    }
}

/**
 * Premium horizontal spotlight banner displaying channel and EPG information.
 * Ideal for top placement on TV screens.
 */
@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun LiveProgramInfoHorizontal(
    channel: LiveStream?,
    programs: List<EpgProgram>,
    modifier: Modifier = Modifier
) {
    val timeFormatter = SimpleDateFormat("HH:mm", Locale.getDefault())
    val now = System.currentTimeMillis()
    
    val currentProgram = programs.find { now in it.startTime..it.endTime }
    val nextProgram = programs.find { it.startTime > now }

    Box(
        modifier = modifier
            .fillMaxWidth()
            .background(Color.White.copy(alpha = 0.02f), RoundedCornerShape(16.dp))
            .border(1.dp, Color.White.copy(alpha = 0.05f), RoundedCornerShape(16.dp))
            .padding(vertical = 6.dp, horizontal = 20.dp)
    ) {
        channel?.let { data ->
            Row(
                modifier = Modifier.fillMaxSize(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Left side: Current Program details
                Column(
                    modifier = Modifier.weight(1.1f),
                    verticalArrangement = Arrangement.Center
                ) {
                    Text(
                        text = data.name.uppercase(),
                        style = MaterialTheme.typography.titleMedium,
                        color = androidx.tv.material3.MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                    )
                    
                    Spacer(modifier = Modifier.height(2.dp))
                    
                    Text(
                        text = currentProgram?.title ?: data.currentProgram ?: "Live Broadcast",
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextSecondary,
                        fontWeight = FontWeight.Medium,
                        maxLines = 1,
                        overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                    )
                    
                    currentProgram?.let { prog ->
                        val progress = ((now - prog.startTime).toFloat() / (prog.endTime - prog.startTime).toFloat()).coerceIn(0f, 1f)
                        
                        Spacer(modifier = Modifier.height(6.dp))
                        
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            androidx.compose.material3.LinearProgressIndicator(
                                progress = { progress },
                                modifier = Modifier.width(140.dp).height(4.dp),
                                color = PrimaryRed,
                                trackColor = Color.White.copy(alpha = 0.1f),
                                strokeCap = androidx.compose.ui.graphics.StrokeCap.Round
                            )
                            
                            Spacer(modifier = Modifier.width(10.dp))
                            
                            Text(
                                text = "${timeFormatter.format(Date(prog.startTime))} - ${timeFormatter.format(Date(prog.endTime))}",
                                style = MaterialTheme.typography.labelSmall,
                                color = TextTertiary
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.width(24.dp))

                // Right side: Next Program details
                Column(
                    modifier = Modifier.weight(0.9f),
                    horizontalAlignment = Alignment.Start,
                    verticalArrangement = Arrangement.Center
                ) {
                    Text(
                        text = "UPCOMING",
                        style = MaterialTheme.typography.labelSmall,
                        color = TextSecondary,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    
                    nextProgram?.let { next ->
                        Text(
                            text = next.title,
                            style = MaterialTheme.typography.bodyLarge,
                            color = TextPrimary,
                            fontWeight = FontWeight.Bold,
                            maxLines = 1,
                            overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                        )
                        Text(
                            text = "Starts at ${timeFormatter.format(Date(next.startTime))}",
                            style = MaterialTheme.typography.labelSmall,
                            color = TextTertiary
                        )
                    } ?: run {
                        Text(
                            text = data.nextProgram ?: "Schedule Unavailable",
                            style = MaterialTheme.typography.bodyLarge,
                            color = TextPrimary,
                            fontWeight = FontWeight.Bold,
                            maxLines = 1,
                            overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                        )
                    }
                }
            }
        } ?: run {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text(
                    text = "Select a channel to view live schedule details",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextMuted
                )
            }
        }
    }
}
