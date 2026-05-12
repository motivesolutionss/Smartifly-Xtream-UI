@file:OptIn(ExperimentalTvMaterial3Api::class)
package com.smartifly.tv.features.login

import androidx.compose.animation.*
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.QrCode
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.blur
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.*
import coil.compose.AsyncImage
import com.smartifly.tv.R
import com.smartifly.tv.ui.theme.*

@Composable
fun RegistrationScreen(
    viewModel: LoginViewModel,
    onRegistrationSuccess: () -> Unit,
    onBack: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(Unit) {
        viewModel.navigateTo(LoginStep.Registration)
        viewModel.startActivationPolling(onRegistrationSuccess)
    }

    Box(modifier = Modifier.fillMaxSize().background(OnboardingBg)) {
        // Aesthetic ambient glow
        Box(
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .fillMaxSize(0.6f)
                .blur(100.dp)
                .background(
                    Brush.radialGradient(
                        colors = listOf(OnboardingGlow.copy(alpha = 0.15f), Color.Transparent)
                    )
                )
        )
        
        Row(modifier = Modifier.fillMaxSize()) {
            // Left Panel: Brand & Focus
            Box(modifier = Modifier.weight(0.45f).fillMaxHeight()) {
                Image(
                    painter = painterResource(id = R.drawable.loginscreen_image),
                    contentDescription = null,
                    modifier = Modifier.fillMaxSize().alpha(0.2f),
                    contentScale = ContentScale.Crop
                )
                
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.linearGradient(
                                colors = listOf(
                                    SurfaceUltraDark.copy(alpha = 0.95f),
                                    SurfaceUltraDark.copy(alpha = 0.6f),
                                    Color.Transparent
                                )
                            )
                        )
                )
                
                Column(
                    modifier = Modifier.fillMaxSize().padding(48.dp),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Image(
                        painter = painterResource(id = R.drawable.smartifly_icon),
                        contentDescription = "Smartifly",
                        modifier = Modifier.width(Dimensions.OnboardingLogoWidth)
                    )
                    Spacer(modifier = Modifier.height(32.dp))
                    Text(
                        text = "SMARTIFLY TV",
                        style = MaterialTheme.typography.displaySmall,
                        color = TextPrimary,
                        fontWeight = FontWeight.ExtraBold,
                        letterSpacing = 4.sp
                    )
                    Text(
                        text = "ENTERPRISE ACTIVATION",
                        style = MaterialTheme.typography.labelLarge,
                        color = PrimaryRed,
                        letterSpacing = 6.sp
                    )
                }
            }

            // Right Panel: Registration & QR
            Box(
                modifier = Modifier
                    .weight(0.55f)
                    .fillMaxHeight()
                    .background(SurfaceUltraDark)
                    .padding(horizontal = 64.dp, vertical = 48.dp)
            ) {
                Column(modifier = Modifier.fillMaxSize()) {
                    // Header Status
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(12.dp, 12.dp)
                                .background(PrimaryRed, RoundedCornerShape(4.dp))
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(
                            text = "AWAITING BINDING...",
                            style = MaterialTheme.typography.labelMedium,
                            color = PrimaryRed,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 2.sp
                        )
                    }

                    Spacer(modifier = Modifier.height(24.dp))
                    
                    Text(
                        text = "Connect your account",
                        style = MaterialTheme.typography.headlineLarge.copy(fontWeight = FontWeight.Bold),
                        color = TextPrimary
                    )
                    Text(
                        text = "Scan the QR code or visit the link below on your phone. Once logged in, your TV will automatically activate.",
                        style = MaterialTheme.typography.bodyLarge,
                        color = TextSecondary,
                        lineHeight = 24.sp
                    )

                    Spacer(modifier = Modifier.height(48.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // QR Section
                        Surface(
                            modifier = Modifier.size(220.dp),
                            shape = ClickableSurfaceDefaults.shape(RoundedCornerShape(16.dp)),
                            colors = ClickableSurfaceDefaults.colors(
                                containerColor = Color.White,
                                contentColor = Color.Black
                            ),
                            onClick = {}
                        ) {
                            Box(
                                modifier = Modifier.fillMaxSize(),
                                contentAlignment = Alignment.Center
                            ) {
                                if (uiState.qrData != null) {
                                    AsyncImage(
                                        model = uiState.qrData,
                                        contentDescription = "Activation QR",
                                        modifier = Modifier.fillMaxSize().padding(16.dp)
                                    )
                                } else {
                                    Icon(
                                        imageVector = Icons.Default.QrCode,
                                        contentDescription = null,
                                        modifier = Modifier.size(160.dp),
                                        tint = Color.Black.copy(alpha = 0.1f)
                                    )
                                }
                            }
                        }

                        Spacer(modifier = Modifier.width(48.dp))

                        // Details Section
                        Column {
                            ActivationDetailItem(
                                label = "ACTIVATION CODE",
                                value = uiState.activationCode.ifBlank { "--------" },
                                valueColor = Color.White
                            )
                            Spacer(modifier = Modifier.height(24.dp))
                            ActivationDetailItem(
                                label = "PORTAL LINK",
                                value = uiState.activationUrl,
                                valueColor = TextSecondary,
                                isSmall = true
                            )
                        }
                    }

                    Spacer(modifier = Modifier.weight(1f))

                    // Action Footer
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.Start
                    ) {
                        Button(
                            onClick = onBack,
                            colors = ButtonDefaults.colors(
                                containerColor = Color.White.copy(alpha = 0.05f),
                                focusedContainerColor = Color.White.copy(alpha = 0.15f)
                            ),
                            shape = ButtonDefaults.shape(RoundedCornerShape(8.dp))
                        ) {
                            Text(
                                "CANCEL & RETURN",
                                style = MaterialTheme.typography.labelLarge,
                                color = TextSecondary,
                                modifier = Modifier.padding(horizontal = 16.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ActivationDetailItem(
    label: String,
    value: String,
    valueColor: Color,
    isSmall: Boolean = false
) {
    Column {
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = TextSecondary.copy(alpha = 0.5f),
            letterSpacing = 2.sp
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = value,
            style = if (isSmall) MaterialTheme.typography.bodyMedium else MaterialTheme.typography.headlineLarge,
            color = valueColor,
            fontWeight = if (isSmall) FontWeight.Normal else FontWeight.ExtraBold,
            letterSpacing = if (isSmall) 0.sp else 4.sp
        )
    }
}
