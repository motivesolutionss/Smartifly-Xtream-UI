package com.smartifly.tv.ui.components.player

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.*
import coil.compose.AsyncImage
import com.smartifly.tv.ui.theme.PrimaryRed
import com.smartifly.tv.ui.theme.TextPrimary
import com.smartifly.tv.ui.theme.TextSecondary

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun AutoPlayOverlay(
    nextEpisodeTitle: String,
    nextEpisodePoster: String,
    countdownSeconds: Int,
    onPlayNow: () -> Unit,
    onCancel: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(Color.Transparent, Color.Black.copy(alpha = 0.9f))
                )
            ),
        contentAlignment = Alignment.BottomEnd
    ) {
        Row(
            modifier = Modifier
                .padding(Dimensions.PaddingExtraLarge)
                .width(500.dp)
                .clip(RoundedCornerShape(16.dp))
                .background(Color(0xFF1A1C1E).copy(alpha = 0.95f))
                .padding(24.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Next Episode Poster
            Box(
                modifier = Modifier
                    .size(width = 120.dp, height = 180.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(Color.DarkGray)
            ) {
                AsyncImage(
                    model = nextEpisodePoster,
                    contentDescription = null,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop
                )
            }

            Spacer(modifier = Modifier.width(24.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "NEXT EPISODE",
                    style = MaterialTheme.typography.labelMedium,
                    color = PrimaryRed,
                    fontWeight = FontWeight.Black,
                    letterSpacing = 1.sp
                )
                
                Text(
                    text = nextEpisodeTitle,
                    style = MaterialTheme.typography.headlineSmall,
                    color = TextPrimary,
                    maxLines = 2,
                    fontWeight = FontWeight.Bold
                )
                
                Spacer(modifier = Modifier.height(16.dp))
                
                Text(
                    text = "Starting in ${countdownSeconds}s",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextSecondary
                )
                
                Spacer(modifier = Modifier.height(16.dp))
                
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Button(onClick = onPlayNow) {
                        Text("Play Now")
                    }
                    OutlinedButton(onClick = onCancel) {
                        Text("Cancel")
                    }
                }
            }
        }
    }
}

object Dimensions {
    val PaddingExtraLarge = 48.dp
}
