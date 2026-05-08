package com.smartifly.tv.features.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.material3.Icon
import androidx.tv.material3.*

import com.smartifly.tv.ui.theme.Dimensions
import com.smartifly.tv.ui.theme.ThemeMode
import com.smartifly.tv.ui.theme.PrimaryRed
import com.smartifly.tv.ui.theme.PrimaryGold
import com.smartifly.tv.ui.theme.PrimaryCyan
import com.smartifly.tv.ui.theme.TextPrimary
import com.smartifly.tv.ui.theme.TextSecondary

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun SettingsScreen(
    currentTheme: ThemeMode,
    onThemeChanged: (ThemeMode) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(Dimensions.PaddingExtraLarge)
    ) {
        Text(
            text = "SETTINGS",
            style = MaterialTheme.typography.displaySmall,
            color = TextPrimary,
            fontWeight = FontWeight.Bold
        )
        
        Spacer(modifier = Modifier.height(Dimensions.RowSpacing))
        
        Text(
            text = "Personalization",
            style = MaterialTheme.typography.headlineMedium,
            color = TextSecondary,
            fontWeight = FontWeight.SemiBold
        )
        
        Spacer(modifier = Modifier.height(Dimensions.PaddingMedium))
        
        Row(horizontalArrangement = Arrangement.spacedBy(Dimensions.ItemSpacing)) {
            ThemeCard(
                title = "Metallic Noir",
                color = PrimaryRed,
                isSelected = currentTheme == ThemeMode.Metallic,
                onClick = { onThemeChanged(ThemeMode.Metallic) }
            )
            ThemeCard(
                title = "Midnight Gold",
                color = PrimaryGold,
                isSelected = currentTheme == ThemeMode.Gold,
                onClick = { onThemeChanged(ThemeMode.Gold) }
            )
            ThemeCard(
                title = "Aether",
                color = PrimaryCyan,
                isSelected = currentTheme == ThemeMode.Aether,
                onClick = { onThemeChanged(ThemeMode.Aether) }
            )
        }

        Spacer(modifier = Modifier.height(Dimensions.RowSpacing))
        
        Text(
            text = "Support & Info",
            style = MaterialTheme.typography.headlineMedium,
            color = TextSecondary,
            fontWeight = FontWeight.SemiBold
        )
        
        Spacer(modifier = Modifier.height(Dimensions.PaddingMedium))
        
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    color = Color.White.copy(alpha = 0.05f),
                    shape = androidx.compose.foundation.shape.RoundedCornerShape(Dimensions.FocusCornerRadius)
                )
        ) {
            Row(
                modifier = Modifier.padding(Dimensions.PaddingMedium),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(com.smartifly.tv.ui.theme.SmartiflyIcons.Info, contentDescription = null, tint = TextSecondary)
                Spacer(modifier = Modifier.width(Dimensions.PaddingMedium))
                Text(text = "Version 1.0.2 (Build 3)", color = TextSecondary, style = MaterialTheme.typography.bodyLarge)
                Spacer(modifier = Modifier.weight(1f))
                Text(text = "STABLE", color = PrimaryCyan, style = MaterialTheme.typography.labelLarge)
            }
        }

    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun ThemeCard(
    title: String,
    color: Color,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Button(
        onClick = onClick,
        modifier = Modifier.width(200.dp).height(120.dp),
        colors = ButtonDefaults.colors(
            containerColor = Color.White.copy(alpha = 0.05f),
            focusedContainerColor = Color.White,
            focusedContentColor = Color.Black
        )
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Box(modifier = Modifier.size(40.dp).background(color, shape = androidx.compose.foundation.shape.CircleShape))
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = title,
                style = MaterialTheme.typography.labelLarge,
                color = if (isSelected) color else Color.Unspecified,
                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
            )
        }
    }
}
