package com.smartifly.tv.player

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.tv.material3.Button
import androidx.tv.material3.ButtonDefaults
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.Text
import coil.compose.AsyncImage
import com.smartifly.tv.data.models.EpisodeMetadata
import com.smartifly.tv.ui.theme.Dimensions
import com.smartifly.tv.ui.theme.PrimaryRed
import com.smartifly.tv.ui.theme.TextPrimary
import com.smartifly.tv.ui.theme.TextSecondary

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun UpNextOverlay(
    isVisible: Boolean,
    nextEpisode: EpisodeMetadata?,
    countdownSeconds: Int,
    onPlayNow: () -> Unit,
    onCancel: () -> Unit,
    modifier: Modifier = Modifier
) {
    AnimatedVisibility(
        visible = isVisible,
        enter = fadeIn(),
        exit = fadeOut(),
        modifier = modifier.fillMaxSize()
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.8f))
                .padding(Dimensions.PaddingExtraLarge),
            contentAlignment = Alignment.BottomEnd
        ) {
            nextEpisode?.let { episode ->
                Column(
                    modifier = Modifier
                        .width(400.dp)
                        .background(Color.DarkGray.copy(alpha = 0.5f), shape = androidx.compose.foundation.shape.RoundedCornerShape(12.dp))
                        .padding(Dimensions.PaddingLarge),
                    horizontalAlignment = Alignment.Start
                ) {
                    Text(
                        text = "UP NEXT IN $countdownSeconds",
                        style = MaterialTheme.typography.labelMedium,
                        color = PrimaryRed,
                        fontWeight = FontWeight.Bold
                    )
                    
                    Spacer(modifier = Modifier.height(12.dp))
                    
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        AsyncImage(
                            model = episode.thumbnailUrl,
                            contentDescription = null,
                            modifier = Modifier.size(120.dp, 80.dp),
                            contentScale = ContentScale.Crop
                        )
                        Spacer(modifier = Modifier.width(16.dp))
                        Column {
                            Text(
                                text = "S${episode.seasonNumber} E${episode.episodeNumber}",
                                style = MaterialTheme.typography.labelSmall,
                                color = TextSecondary
                            )
                            Text(
                                text = episode.title,
                                style = MaterialTheme.typography.headlineSmall,
                                color = TextPrimary,
                                maxLines = 1
                            )
                        }
                    }
                    
                    Spacer(modifier = Modifier.height(24.dp))
                    
                    Row {
                        Button(
                            onClick = onPlayNow,
                            colors = ButtonDefaults.colors(containerColor = Color.White, contentColor = Color.Black)
                        ) {
                            Text("Play Now")
                        }
                        Spacer(modifier = Modifier.width(16.dp))
                        Button(
                            onClick = onCancel,
                            colors = ButtonDefaults.colors(containerColor = Color.Gray.copy(alpha = 0.3f))
                        ) {
                            Text("Cancel")
                        }
                    }
                }
            }
        }
    }
}
