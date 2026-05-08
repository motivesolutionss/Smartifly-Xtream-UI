package com.smartifly.tv.features.profiles

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.material3.CircularProgressIndicator
import androidx.tv.material3.*
import coil.compose.AsyncImage
import com.smartifly.tv.data.models.UserProfile
import com.smartifly.tv.ui.theme.SmartiflyTheme
import com.smartifly.tv.ui.theme.TextPrimary

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun ProfileSelectionScreen(
    viewModel: ProfilesViewModel,
    onProfileSelected: (UserProfile) -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()

    SmartiflyTheme {
        Box(modifier = Modifier.fillMaxSize().background(Color.Black), contentAlignment = Alignment.Center) {
            when (val state = uiState) {
                is ProfilesUiState.Loading -> CircularProgressIndicator()
                is ProfilesUiState.Success -> {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "Who's Watching?",
                            style = MaterialTheme.typography.displayMedium,
                            color = TextPrimary,
                            fontWeight = FontWeight.Bold
                        )
                        
                        Spacer(modifier = Modifier.height(60.dp))
                        
                        Row(horizontalArrangement = Arrangement.spacedBy(40.dp)) {
                            state.profiles.forEach { profile ->
                                ProfileCard(
                                    profile = profile,
                                    onClick = { 
                                        viewModel.selectProfile(profile)
                                        onProfileSelected(profile)
                                    }
                                )
                            }
                        }
                    }
                }
                is ProfilesUiState.Error -> {
                    Text(text = "Error: ${state.message}", color = Color.Red)
                }
            }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun ProfileCard(
    profile: UserProfile,
    onClick: () -> Unit
) {
    Surface(
        onClick = onClick,
        modifier = Modifier.size(160.dp),
        colors = ClickableSurfaceDefaults.colors(
            containerColor = Color.Transparent,
            focusedContainerColor = Color.White.copy(alpha = 0.1f)
        ),
        shape = ClickableSurfaceDefaults.shape(
            shape = androidx.compose.foundation.shape.RoundedCornerShape(8.dp)
        )
    ) {
        Column(
            modifier = Modifier.fillMaxSize().padding(8.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            AsyncImage(
                model = profile.avatarUrl,
                contentDescription = null,
                modifier = Modifier.size(100.dp).background(Color.DarkGray, shape = androidx.compose.foundation.shape.RoundedCornerShape(8.dp)),
                contentScale = ContentScale.Crop
            )
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = profile.name,
                style = MaterialTheme.typography.labelLarge,
                color = TextPrimary
            )
        }
    }
}
