package com.smartifly.tv.ui.components.base

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.Text
import com.smartifly.tv.data.models.MovieMetadata
import com.smartifly.tv.ui.theme.Dimensions
import com.smartifly.tv.ui.theme.PrimaryRed
import com.smartifly.tv.ui.theme.TextPrimary
import com.smartifly.tv.ui.theme.TextSecondary
import com.smartifly.tv.ui.theme.TextTertiary

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun ContentDetailsPanel(
    movie: MovieMetadata?, // Changed from 'item' to 'movie' to match caller
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(Dimensions.PaddingLarge)
    ) {
        movie?.let { data ->
            Text(
                text = data.title,
                style = MaterialTheme.typography.headlineMedium,
                color = TextPrimary,
                fontWeight = FontWeight.Bold
            )
            
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(text = data.year, style = MaterialTheme.typography.labelMedium, color = TextTertiary)
                Spacer(modifier = Modifier.width(Dimensions.PaddingSmall))
                Text(text = data.rating, style = MaterialTheme.typography.labelMedium, color = TextTertiary)
                Spacer(modifier = Modifier.width(Dimensions.PaddingSmall))
                Text(text = data.duration, style = MaterialTheme.typography.labelMedium, color = TextTertiary)
            }
            
            Spacer(modifier = Modifier.height(Dimensions.PaddingSmall))
            
            Text(
                text = data.description,
                style = MaterialTheme.typography.bodyMedium,
                color = TextSecondary,
                maxLines = 2
            )
        }
    }
}
