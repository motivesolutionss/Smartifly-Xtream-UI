package com.smartifly.tv.ui.components.dialogs

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.tv.material3.*
import com.smartifly.tv.ui.theme.PrimaryRed
import com.smartifly.tv.ui.theme.Dimensions
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.foundation.border
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.graphics.Brush

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun PinEntryDialog(
    onDismiss: () -> Unit,
    onPinEntered: (String) -> Unit,
    errorMessage: String? = null
) {
    var pin by remember { mutableStateOf("") }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.4f)),
        contentAlignment = Alignment.Center
    ) {
        // Glass Backdrop
        Box(
            modifier = Modifier
                .width(420.dp)
                .clip(RoundedCornerShape(28.dp))
                .background(Color.White.copy(alpha = 0.05f))
                .border(1.dp, Brush.verticalGradient(listOf(Color.White.copy(alpha = 0.2f), Color.Transparent)), RoundedCornerShape(28.dp))
                .padding(Dimensions.PaddingExtraLarge),
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = "Security Verification",
                    style = MaterialTheme.typography.headlineSmall,
                    color = Color.White,
                    fontWeight = FontWeight.ExtraBold
                )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Text(
                text = "Please enter your 4-digit PIN",
                style = MaterialTheme.typography.bodyMedium,
                color = Color.Gray
            )

            Spacer(modifier = Modifier.height(Dimensions.PaddingLarge))

            // PIN Display (Dots)
            Row(
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                repeat(4) { index ->
                    val isFilled = index < pin.length
                    Box(
                        modifier = Modifier
                            .size(20.dp)
                            .background(
                                if (isFilled) PrimaryRed else Color.White.copy(alpha = 0.2f),
                                shape = androidx.compose.foundation.shape.CircleShape
                            )
                    )
                }
            }

            if (errorMessage != null) {
                Spacer(modifier = Modifier.height(16.dp))
                Text(text = errorMessage, color = PrimaryRed, style = MaterialTheme.typography.labelMedium)
            }

            Spacer(modifier = Modifier.height(Dimensions.PaddingExtraLarge))

            // Number Pad
            val numbers = listOf("1", "2", "3", "4", "5", "6", "7", "8", "9", "Clear", "0", "Back")
            androidx.compose.foundation.lazy.grid.LazyVerticalGrid(
                columns = androidx.compose.foundation.lazy.grid.GridCells.Fixed(3),
                modifier = Modifier.width(300.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(numbers.size) { index ->
                    val label = numbers[index]
                    Surface(
                        onClick = {
                            when (label) {
                                "Clear" -> pin = ""
                                "Back" -> if (pin.isNotEmpty()) pin = pin.dropLast(1)
                                else -> {
                                    if (pin.length < 4) {
                                        pin += label
                                        if (pin.length == 4) {
                                            onPinEntered(pin)
                                            // Reset for next time if it fails
                                            // pin = "" 
                                        }
                                    }
                                }
                            }
                        },
                        colors = ClickableSurfaceDefaults.colors(
                            containerColor = Color.White.copy(alpha = 0.05f),
                            focusedContainerColor = PrimaryRed
                        ),
                        shape = ClickableSurfaceDefaults.shape(androidx.compose.foundation.shape.RoundedCornerShape(8.dp))
                    ) {
                        Box(
                            modifier = Modifier.padding(16.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(text = label, style = MaterialTheme.typography.titleMedium)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(Dimensions.PaddingLarge))

            Button(onClick = onDismiss, colors = ButtonDefaults.colors(containerColor = Color.Transparent)) {
                Text("Cancel")
            }
        }
    }
}
}
