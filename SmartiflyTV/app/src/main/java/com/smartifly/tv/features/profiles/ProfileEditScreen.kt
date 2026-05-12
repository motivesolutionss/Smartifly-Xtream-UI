package com.smartifly.tv.features.profiles

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.tv.material3.*
import coil.compose.AsyncImage
import com.smartifly.tv.data.models.UserProfile
import com.smartifly.tv.ui.theme.PrimaryRed
import com.smartifly.tv.ui.theme.SmartiflyTheme
import com.smartifly.tv.ui.theme.TextPrimary
import com.smartifly.tv.ui.theme.TextSecondary
import com.smartifly.tv.data.models.AvatarLibrary
import com.smartifly.tv.ui.components.dialogs.AvatarSelectionDialog
import com.smartifly.tv.ui.components.dialogs.PinEntryDialog

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun ProfileEditScreen(
    profile: UserProfile,
    onSave: (String, String, String?) -> Unit,
    onBack: () -> Unit
) {
    var name by remember { mutableStateOf(profile.name) }
    var selectedAvatar by remember { mutableStateOf(profile.avatarUrl) }
    var pin by remember { mutableStateOf(profile.pin ?: "") }
    
    var showAvatarPicker by remember { mutableStateOf(false) }
    var showPinPad by remember { mutableStateOf(false) }

    SmartiflyTheme {
        Box(modifier = Modifier.fillMaxSize().background(Color(0xFF0D1117))) {
            Column(
                modifier = Modifier.fillMaxSize().padding(48.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "Edit Profile",
                    style = MaterialTheme.typography.displaySmall,
                    color = TextPrimary,
                    fontWeight = FontWeight.Bold
                )
                
                Spacer(modifier = Modifier.height(32.dp))

                // Avatar Selection
                Box(
                    modifier = Modifier
                        .size(160.dp)
                        .clip(CircleShape)
                        .border(4.dp, PrimaryRed, CircleShape)
                        .clickable { showAvatarPicker = true }
                ) {
                    AsyncImage(
                        model = selectedAvatar,
                        contentDescription = null,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop
                    )
                    Box(
                        modifier = Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.3f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("Change", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                    }
                }

                Spacer(modifier = Modifier.height(48.dp))

                // Name Input Mock (In real app, use TextField)
                Column(horizontalAlignment = Alignment.Start, modifier = Modifier.width(400.dp)) {
                    Text("Profile Name", color = TextSecondary, style = MaterialTheme.typography.labelMedium)
                    Spacer(modifier = Modifier.height(8.dp))
                    Surface(
                        onClick = { /* Open Keyboard */ },
                        shape = ClickableSurfaceDefaults.shape(RoundedCornerShape(8.dp)),
                        colors = ClickableSurfaceDefaults.colors(containerColor = Color.White.copy(alpha = 0.05f))
                    ) {
                        Text(
                            text = name,
                            modifier = Modifier.padding(16.dp).fillMaxWidth(),
                            color = TextPrimary
                        )
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                // PIN Input Mock
                if (!profile.isKids) {
                    Column(horizontalAlignment = Alignment.Start, modifier = Modifier.width(400.dp)) {
                        Text("Profile PIN (4 digits)", color = TextSecondary, style = MaterialTheme.typography.labelMedium)
                        Spacer(modifier = Modifier.height(8.dp))
                        Surface(
                            onClick = { showPinPad = true },
                            shape = ClickableSurfaceDefaults.shape(RoundedCornerShape(8.dp)),
                            colors = ClickableSurfaceDefaults.colors(containerColor = Color.White.copy(alpha = 0.05f))
                        ) {
                            Text(
                                text = if (pin.isEmpty()) "No PIN set" else "****",
                                modifier = Modifier.padding(16.dp).fillMaxWidth(),
                                color = TextPrimary
                            )
                        }
                    }
                }

                // Dialogs
                if (showAvatarPicker) {
                    AvatarSelectionDialog(
                        isKids = profile.isKids,
                        onAvatarSelected = { 
                            selectedAvatar = it
                            showAvatarPicker = false
                        },
                        onDismiss = { showAvatarPicker = false }
                    )
                }

                if (showPinPad) {
                    PinEntryDialog(
                        onDismiss = { showPinPad = false },
                        onPinEntered = { 
                            pin = it
                            showPinPad = false
                        }
                    )
                }

                Spacer(modifier = Modifier.height(64.dp))

                Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                    Button(
                        onClick = { onSave(name, selectedAvatar, pin) },
                        colors = ButtonDefaults.colors(containerColor = PrimaryRed)
                    ) {
                        Text("Save Changes")
                    }
                    
                    Button(
                        onClick = onBack,
                        colors = ButtonDefaults.colors(containerColor = Color.White.copy(alpha = 0.1f))
                    ) {
                        Text("Cancel")
                    }
                }
            }
        }
    }
}
