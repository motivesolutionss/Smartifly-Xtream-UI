package com.smartifly.tv.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.NotificationsActive
import androidx.compose.material.icons.filled.ReportProblem
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.smartifly.tv.data.remote.MasterBroadcastDto
import com.smartifly.tv.ui.design.TvTokens

@Composable
fun AnnouncementDialog(
    announcement: MasterBroadcastDto,
    onDismiss: () -> Unit,
    onMarkAsRead: () -> Unit,
) {
    val type = announcement.type?.uppercase() ?: "INFO"
    val color = when (type) {
        "EMERGENCY" -> Color(0xFFEF4444)
        "WARNING" -> Color(0xFFF59E0B)
        else -> TvTokens.Colors.Primary
    }

    val icon = when (type) {
        "EMERGENCY" -> Icons.Default.NotificationsActive
        "WARNING" -> Icons.Default.ReportProblem
        else -> Icons.Default.Info
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.82f)),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier
                .width(480.dp)
                .background(TvTokens.Colors.Surface, RoundedCornerShape(28.dp))
                .border(2.dp, color.copy(alpha = 0.5f), RoundedCornerShape(28.dp))
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(24.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(72.dp)
                    .background(color.copy(alpha = 0.15f), CircleShape)
                    .border(1.5.dp, color.copy(alpha = 0.3f), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = color,
                    modifier = Modifier.size(36.dp)
                )
            }

            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .background(color.copy(alpha = 0.2f), RoundedCornerShape(4.dp))
                            .padding(horizontal = 8.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = type,
                            style = TvTokens.TvType.Badge.copy(fontSize = 11.sp),
                            color = color,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    Text(
                        text = "OFFICIAL BROADCAST",
                        style = TvTokens.TvType.LabelSmall.copy(letterSpacing = 1.2.sp),
                        color = TvTokens.Colors.TextMuted
                    )
                }

                Text(
                    text = if (type == "EMERGENCY") "Critical System Alert" else "Important Announcement",
                    style = TvTokens.TvType.H2,
                    color = TvTokens.Colors.TextPrimary,
                    textAlign = TextAlign.Center
                )
            }

            Text(
                text = announcement.message ?: "",
                style = TvTokens.TvType.BodyMedium.copy(lineHeight = 26.sp),
                color = TvTokens.Colors.TextSecondary,
                textAlign = TextAlign.Center
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                TvFocusButton(
                    text = "Mark as Read",
                    onClick = onMarkAsRead,
                    modifier = Modifier.weight(1f)
                )
                TvFocusButton(
                    text = "Close",
                    primary = true,
                    requestInitialFocus = true,
                    onClick = onDismiss,
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}
