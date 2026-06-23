package com.smartifly.tv.features.onboarding

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.*
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.*
import coil.compose.AsyncImage
import com.smartifly.tv.R
import com.smartifly.tv.ui.theme.PrimaryRed
import com.smartifly.tv.ui.theme.TextPrimary
import com.smartifly.tv.ui.theme.TextSecondary
import com.smartifly.tv.ui.theme.Dimensions
import com.smartifly.tv.ui.theme.OnboardingBg
import com.smartifly.tv.ui.theme.OnboardingGlow
import com.smartifly.tv.ui.components.base.BaseFocusableCard

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun WelcomeScreen(
    onExistingCustomer: () -> Unit,
    onNewCustomer: () -> Unit
) {
    // Animation States for Staggered Entrance
    var showBranding by remember { mutableStateOf(false) }
    var showContent by remember { mutableStateOf(false) }
    var showButtons by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        kotlinx.coroutines.delay(300)
        showBranding = true
        kotlinx.coroutines.delay(400)
        showContent = true
        kotlinx.coroutines.delay(400)
        showButtons = true
    }

    // Cinematic Background (Subtle Gradient)
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.radialGradient(
                    colors = listOf(
                        OnboardingGlow,
                        OnboardingBg
                    ),
                    center = androidx.compose.ui.geometry.Offset(x = 1400f, y = 540f),
                    radius = 1200f
                )
            )
    ) {
        // Native TV side-aligned layout
        Row(modifier = Modifier.fillMaxSize()) {
            // Left Content Panel (45%)
            Box(
                modifier = Modifier
                    .fillMaxHeight()
                    .weight(0.45f)
                    .padding(start = Dimensions.OnboardingPadding),
                contentAlignment = Alignment.CenterStart
            ) {
                Column(verticalArrangement = Arrangement.Center) {
                    // Staggered Branding
                    androidx.compose.animation.AnimatedVisibility(
                        visible = showBranding,
                        enter = androidx.compose.animation.fadeIn() + androidx.compose.animation.expandVertically()
                    ) {
                        Image(
                            painter = painterResource(id = R.drawable.smartifly_icon),
                            contentDescription = "Smartifly",
                            modifier = Modifier
                                .width(Dimensions.OnboardingLogoWidth)
                                .height(Dimensions.OnboardingLogoHeight),
                            contentScale = ContentScale.Fit
                        )
                    }
                    
                    Spacer(modifier = Modifier.height(12.dp)) // Reduced margin from 32.dp

                    // Staggered Title & Description
                    androidx.compose.animation.AnimatedVisibility(
                        visible = showContent,
                        enter = androidx.compose.animation.fadeIn() + androidx.compose.animation.slideInVertically { it / 2 }
                    ) {
                        Column {
                            Text(
                                text = "The Future\nof Television.",
                                style = MaterialTheme.typography.headlineLarge,
                                color = TextPrimary,
                                lineHeight = 42.sp,
                                fontWeight = FontWeight.ExtraBold
                            )
                            
                            Text(
                                text = "Experience 4K IPTV, live cable, and premium streaming in one unified, high-performance interface.",
                                style = MaterialTheme.typography.bodyLarge,
                                color = TextSecondary.copy(alpha = 0.7f),
                                modifier = Modifier.padding(top = 16.dp).width(Dimensions.OnboardingDescWidth),
                                lineHeight = 24.sp
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(32.dp)) // Reduced margin from 48.dp

                    // Staggered Action Buttons
                    androidx.compose.animation.AnimatedVisibility(
                        visible = showButtons,
                        enter = androidx.compose.animation.fadeIn() + androidx.compose.animation.slideInVertically { it / 3 }
                    ) {
                        Column(
                            modifier = Modifier.width(320.dp),
                            verticalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            PremiumOnboardingButton(
                                text = "Sign In",
                                isPrimary = true,
                                icon = com.smartifly.tv.ui.theme.SmartiflyIcons.Profiles,
                                onClick = onExistingCustomer
                            )
                            
                            PremiumOnboardingButton(
                                text = "Create Account",
                                isPrimary = false,
                                icon = com.smartifly.tv.ui.theme.SmartiflyIcons.Live,
                                onClick = onNewCustomer
                            )
                        }
                    }
                    
                    Spacer(modifier = Modifier.height(48.dp)) // Reduced margin from 64.dp
                    
                    // Cinematic Status Row (Refined)
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.graphicsLayer { alpha = 0.6f }
                    ) {
                        Box(
                            modifier = Modifier
                                .padding(end = 12.dp)
                                .background(PrimaryRed.copy(alpha = 0.12f), androidx.compose.foundation.shape.RoundedCornerShape(4.dp))
                                .padding(horizontal = 8.dp, vertical = 3.dp)
                        ) {
                            Text(
                                text = "STABLE",
                                style = MaterialTheme.typography.labelSmall,
                                color = PrimaryRed,
                                fontWeight = FontWeight.Black,
                                letterSpacing = 1.sp
                            )
                        }
                        Text(
                            text = "Unified Stream Hub • 4K HDR Optimized",
                            style = MaterialTheme.typography.labelSmall,
                            color = TextSecondary,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }

            // Right Visual Panel (55%) - Cinematic Showcase
            Box(
                modifier = Modifier.weight(0.55f).fillMaxHeight(),
                contentAlignment = Alignment.Center
            ) {
                CinematicContentShowcase()
            }
        }
    }
}

@Composable
fun CinematicContentShowcase() {
    val infiniteTransition = rememberInfiniteTransition(label = "floating")
    val floatOffset by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 20f,
        animationSpec = infiniteRepeatable(
            animation = tween(3000, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "float"
    )

    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        // Tilted Poster Stack
        Row(
            modifier = Modifier.padding(start = 40.dp),
            horizontalArrangement = Arrangement.spacedBy((-60).dp), // Overlapping
            verticalAlignment = Alignment.CenterVertically
        ) {
            PosterCard(
                imageModel = R.drawable.left_pillar, // Your specific branded image
                rotation = -12f,
                offsetY = floatOffset
            )
            PosterCard(
                imageModel = R.drawable.center_pillar, // Your specific branded image
                rotation = -5f,
                offsetY = -floatOffset * 0.8f,
                isMain = true
            )
            PosterCard(
                imageModel = R.drawable.right_pillar, // Your specific branded image
                rotation = 8f,
                offsetY = floatOffset * 0.5f
            )
        }
    }
}

@Composable
fun PosterCard(imageModel: Any, rotation: Float, offsetY: Float, isMain: Boolean = false) {
    Box(
        modifier = Modifier
            .width(if (isMain) 220.dp else 180.dp)
            .height(if (isMain) 320.dp else 260.dp)
            .graphicsLayer {
                rotationZ = rotation
                translationY = offsetY
                cameraDistance = 12f
                rotationY = if (rotation > 0) -15f else 15f
                shape = androidx.compose.foundation.shape.RoundedCornerShape(12.dp)
                clip = true
            }
            .background(Color.DarkGray)
    ) {
        AsyncImage(
            model = imageModel,
            contentDescription = null,
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop,
            placeholder = androidx.compose.ui.graphics.painter.ColorPainter(Color(0xFF1A1C1E)),
            error = androidx.compose.ui.graphics.painter.ColorPainter(Color(0xFF323639))
        )
        // Glass Reflection
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.linearGradient(
                        0f to Color.White.copy(alpha = 0.1f),
                        0.5f to Color.Transparent,
                        1f to Color.Black.copy(alpha = 0.2f)
                    )
                )
        )
    }
}


@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun PremiumOnboardingButton(
    text: String,
    isPrimary: Boolean,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    BaseFocusableCard(
        onClick = onClick,
        modifier = modifier.fillMaxWidth().height(56.dp)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    if (isPrimary) PrimaryRed.copy(alpha = 0.95f) 
                    else Color.White.copy(alpha = 0.08f)
                ),
            contentAlignment = Alignment.Center
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center,
                modifier = Modifier.fillMaxSize()
            ) {
                androidx.compose.material3.Icon(
                    imageVector = icon,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp),
                    tint = Color.White
                )
                Spacer(modifier = Modifier.width(12.dp))
                Text(
                    text = text,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            }
        }
    }
}
