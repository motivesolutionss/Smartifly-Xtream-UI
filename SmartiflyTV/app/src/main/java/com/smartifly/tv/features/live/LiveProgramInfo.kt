package com.smartifly.tv.features.live

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.Text
import com.smartifly.tv.data.models.ChannelMetadata
import com.smartifly.tv.ui.theme.Dimensions
import com.smartifly.tv.ui.theme.PrimaryRed
import com.smartifly.tv.ui.theme.TextPrimary
import com.smartifly.tv.ui.theme.TextSecondary
import com.smartifly.tv.ui.theme.TextTertiary
import com.smartifly.tv.ui.theme.TextMuted

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun LiveProgramInfo(
    channel: ChannelMetadata?,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(Dimensions.PaddingLarge)
    ) {
        channel?.let { data ->
            Text(
                text = data.name,
                style = MaterialTheme.typography.labelLarge,
                color = PrimaryRed,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = data.currentProgram,
                style = MaterialTheme.typography.headlineMedium,
                color = TextPrimary,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "Next: ${data.nextProgram}",
                style = MaterialTheme.typography.bodyMedium,
                color = TextTertiary
            )
        } ?: run {
            // Placeholder when no channel is focused
            Text(text = "Select a channel", style = MaterialTheme.typography.headlineMedium, color = TextMuted)
        }
    }
}
