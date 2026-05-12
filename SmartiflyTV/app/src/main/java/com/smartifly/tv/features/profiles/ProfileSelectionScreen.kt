package com.smartifly.tv.features.profiles

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import kotlinx.coroutines.launch
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.tv.material3.*
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.foundation.BorderStroke
import coil.compose.AsyncImage
import com.smartifly.tv.data.models.UserProfile
import com.smartifly.tv.ui.theme.PrimaryRed
import com.smartifly.tv.ui.theme.SmartiflyTheme
import com.smartifly.tv.ui.theme.TextPrimary
import com.smartifly.tv.ui.theme.TextSecondary
import com.smartifly.tv.ui.components.dialogs.PinEntryDialog
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material3.Icon

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun ProfileSelectionScreen(
    viewModel: ProfilesViewModel,
    onProfileSelected: (UserProfile) -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    var selectedProfileForPin by remember { mutableStateOf<UserProfile?>(null) }
    var pinError by remember { mutableStateOf<String?>(null) }

    SmartiflyTheme {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color(0xFF0D1117))
        ) {
            // Background Glow
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.radialGradient(
                            colors = listOf(PrimaryRed.copy(alpha = 0.15f), Color.Transparent),
                            center = androidx.compose.ui.geometry.Offset(500f, 500f),
                            radius = 1000f
                        )
                    )
            )

            Column(
                modifier = Modifier.fillMaxSize(),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Text(
                    text = "Who's watching?",
                    style = MaterialTheme.typography.displayMedium,
                    color = TextPrimary,
                    fontWeight = FontWeight.Bold
                )
                
                Spacer(modifier = Modifier.height(64.dp))

                when (val state = uiState) {
                    is ProfilesUiState.Loading -> {
                        CircularProgressIndicator(color = PrimaryRed)
                    }
                    is ProfilesUiState.Success -> {
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(48.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            state.profiles.forEach { profile ->
                                ProfileCard(profile = profile) {
                                    if (profile.pin != null) {
                                        selectedProfileForPin = profile
                                    } else {
                                        viewModel.selectProfile(profile)
                                        onProfileSelected(profile)
                                    }
                                }
                            }
                            
                            // Add Profile Button
                            Surface(
                                onClick = { /* Open Add Profile Logic */ },
                                shape = ClickableSurfaceDefaults.shape(CircleShape),
                                colors = ClickableSurfaceDefaults.colors(
                                    containerColor = Color.White.copy(alpha = 0.05f),
                                    focusedContainerColor = Color.White.copy(alpha = 0.2f)
                                ),
                                modifier = Modifier.size(160.dp)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Text("+", style = MaterialTheme.typography.displaySmall, color = TextSecondary)
                                }
                            }
                        }
                    }
                    is ProfilesUiState.Error -> {
                        Text(text = state.message, color = Color.Red)
                        Button(onClick = { viewModel.loadProfiles() }) {
                            Text("Retry")
                        }
                    }
                }
            }

            if (selectedProfileForPin != null) {
                PinEntryDialog(
                    onDismiss = { 
                        selectedProfileForPin = null 
                        pinError = null
                    },
                    onPinEntered = { pin ->
                        if (viewModel.verifyPin(selectedProfileForPin!!, pin)) {
                            val profile = selectedProfileForPin!!
                            viewModel.selectProfile(profile)
                            onProfileSelected(profile)
                            selectedProfileForPin = null
                            pinError = null
                        } else {
                            pinError = "Incorrect PIN. Please try again."
                        }
                    },
                    errorMessage = pinError
                )
            }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun ProfileCard(profile: UserProfile, onClick: () -> Unit) {
    var isFocused by remember { mutableStateOf(false) }
    val scale by animateFloatAsState(if (isFocused) 1.2f else 1.0f)

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.width(160.dp)
    ) {
        Surface(
            onClick = onClick,
            shape = ClickableSurfaceDefaults.shape(CircleShape),
            border = ClickableSurfaceDefaults.border(
                focusedBorder = Border(BorderStroke(4.dp, PrimaryRed), shape = CircleShape)
            ),
            modifier = Modifier
                .size(160.dp)
                .onFocusChanged { state: androidx.compose.ui.focus.FocusState -> isFocused = state.hasFocus }
                .scale(scale)
        ) {
            Box(modifier = Modifier.fillMaxSize()) {
                AsyncImage(
                    model = profile.avatarUrl,
                    contentDescription = profile.name,
                    modifier = Modifier.fillMaxSize().clip(CircleShape),
                    contentScale = ContentScale.Crop
                )
    
                if (profile.pin != null) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(Color.Black.copy(alpha = 0.3f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Lock,
                            contentDescription = "Protected",
                            tint = Color.White.copy(alpha = 0.7f),
                            modifier = Modifier.size(32.dp)
                        )
                    }
                }
            }
        }
        
        Spacer(modifier = Modifier.height(24.dp))
        
        Text(
            text = profile.name,
            style = MaterialTheme.typography.headlineSmall,
            color = if (isFocused) TextPrimary else TextSecondary,
            fontWeight = if (isFocused) FontWeight.Bold else FontWeight.Normal
        )
        
        if (profile.isKids) {
            Box(
                modifier = Modifier
                    .padding(top = 8.dp)
                    .background(Color.Cyan.copy(alpha = 0.2f), shape = RoundedCornerShape(4.dp))
                    .padding(horizontal = 8.dp, vertical = 2.dp)
            ) {
                Text("KIDS", style = MaterialTheme.typography.labelSmall, color = Color.Cyan)
            }
        }
    }
}
