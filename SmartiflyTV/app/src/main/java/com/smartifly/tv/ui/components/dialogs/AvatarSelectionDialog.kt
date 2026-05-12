package com.smartifly.tv.ui.components.dialogs

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import androidx.tv.material3.*
import coil.compose.AsyncImage
import com.smartifly.tv.data.models.AvatarLibrary
import com.smartifly.tv.ui.theme.PrimaryRed
import com.smartifly.tv.ui.theme.Dimensions

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun AvatarSelectionDialog(
    isKids: Boolean,
    onAvatarSelected: (String) -> Unit,
    onDismiss: () -> Unit
) {
    val avatars = remember { 
        if (isKids) AvatarLibrary.getByCategory("Kids") 
        else AvatarLibrary.getByCategory("Adults") 
    }

    Box(
        modifier = Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.8f)),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier
                .width(600.dp)
                .background(Color(0xFF121826), shape = androidx.compose.foundation.shape.RoundedCornerShape(24.dp))
                .padding(Dimensions.PaddingExtraLarge),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "Choose Your Character",
                style = MaterialTheme.typography.headlineMedium,
                color = Color.White
            )
            
            Spacer(modifier = Modifier.height(32.dp))

            LazyVerticalGrid(
                columns = GridCells.Fixed(5),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                modifier = Modifier.height(300.dp)
            ) {
                items(avatars) { avatar ->
                    Surface(
                        onClick = { onAvatarSelected(avatar.url) },
                        colors = ClickableSurfaceDefaults.colors(
                            containerColor = Color.Transparent,
                            focusedContainerColor = Color.White.copy(alpha = 0.1f)
                        ),
                        shape = ClickableSurfaceDefaults.shape(CircleShape),
                        modifier = Modifier.size(100.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                            AsyncImage(
                                model = avatar.url,
                                contentDescription = null,
                                modifier = Modifier
                                    .size(80.dp)
                                    .clip(CircleShape)
                                    .border(2.dp, Color.White.copy(alpha = 0.2f), CircleShape),
                                contentScale = ContentScale.Crop
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(32.dp))

            Button(onClick = onDismiss, colors = ButtonDefaults.colors(containerColor = Color.White.copy(alpha = 0.1f))) {
                Text("Cancel")
            }
        }
    }
}
