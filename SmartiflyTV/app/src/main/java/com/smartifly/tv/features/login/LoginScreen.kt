package com.smartifly.tv.features.login

import androidx.compose.animation.*
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
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
import androidx.compose.animation.core.tween
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Login
import androidx.tv.material3.*
import androidx.compose.material3.CircularProgressIndicator
import com.smartifly.tv.R
import com.smartifly.tv.features.login.components.LoginInputField
import com.smartifly.tv.features.login.components.LoginKeyboard
import com.smartifly.tv.ui.theme.*

enum class LoginSubStep {
    PORTAL, USERNAME, PASSWORD
}

@OptIn(ExperimentalTvMaterial3Api::class, ExperimentalAnimationApi::class)
@Composable
fun LoginScreen(
    viewModel: LoginViewModel,
    onLoginSuccess: () -> Unit,
    onBack: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    
    // Local state for the 3-step rapid-fire flow
    var subStep by remember { mutableStateOf(LoginSubStep.PORTAL) }
    
    // Always start at Identity for Login flow
    LaunchedEffect(Unit) {
        viewModel.navigateTo(LoginStep.Identity)
    }

    // Sync subStep with global step
    LaunchedEffect(uiState.step) {
        if (uiState.step == LoginStep.Identity) {
            subStep = LoginSubStep.PORTAL
        }
    }

    Box(modifier = Modifier.fillMaxSize().background(OnboardingBg)) {
        // Shared Background Glow
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
            // Left Side: Branding & Context (Cinematic)
            Box(modifier = Modifier.weight(0.45f).fillMaxHeight()) {
                Image(
                    painter = painterResource(id = R.drawable.loginscreen_image),
                    contentDescription = null,
                    modifier = Modifier.fillMaxSize().alpha(0.3f),
                    contentScale = ContentScale.Crop
                )
                
                // Professional Dark Overlay for Readability
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.linearGradient(
                                colors = listOf(
                                    SurfaceUltraDark.copy(alpha = 0.9f),
                                    SurfaceUltraDark.copy(alpha = 0.4f),
                                    Color.Transparent
                                )
                            )
                        )
                )
                
                Column(
                    modifier = Modifier.fillMaxSize().padding(horizontal = 48.dp, vertical = 48.dp),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Spacer(modifier = Modifier.weight(1f))
                    
                    Image(
                        painter = painterResource(id = R.drawable.smartifly_icon),
                        contentDescription = "Smartifly",
                        modifier = Modifier.width(Dimensions.OnboardingLogoWidth)
                    )
                    
                    Spacer(modifier = Modifier.height(32.dp))
                    
                    Text(
                        text = "UNIFIED STREAM HUB",
                        style = MaterialTheme.typography.headlineMedium.copy(
                            fontSize = 24.sp,
                            letterSpacing = 3.sp
                        ),
                        color = TextPrimary,
                        fontWeight = FontWeight.Bold,
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                        maxLines = 1,
                        softWrap = false
                    )
                    
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    Text(
                        text = "Experience 4K IPTV, live cable, and premium streaming in one unified, high-performance interface.",
                        style = MaterialTheme.typography.bodyLarge,
                        color = TextSecondary.copy(alpha = 0.7f),
                        modifier = Modifier.width(Dimensions.OnboardingDescWidth),
                        lineHeight = 24.sp,
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center
                    )
                    
                    Spacer(modifier = Modifier.weight(1.5f))
                }
            }

            Box(
                modifier = Modifier
                    .weight(0.55f)
                    .fillMaxHeight()
                    .background(SurfaceUltraDark)
                    .padding(horizontal = 48.dp, vertical = 24.dp)
            ) {
                Column(
                    modifier = Modifier.fillMaxSize()
                ) {
                    // Stage Indicator
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = when (uiState.step) {
                                LoginStep.Identity -> "STEP 01 — IDENTITY"
                                LoginStep.Credentials -> "STEP 02 — SECURITY"
                                else -> "ACCOUNT LOGIN"
                            },
                            style = MaterialTheme.typography.labelMedium,
                            color = PrimaryRed,
                            fontWeight = FontWeight.ExtraBold,
                            letterSpacing = 2.sp
                        )
                        Spacer(modifier = Modifier.width(16.dp))
                        Box(modifier = Modifier.weight(1f).height(1.dp).background(Color.White.copy(alpha = 0.05f)))
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Box(modifier = Modifier.weight(1f)) {
                        AnimatedContent(
                            targetState = uiState.step,
                            transitionSpec = {
                                fadeIn(tween(400)) togetherWith fadeOut(tween(300))
                            },
                            label = "LoginStepTransition"
                        ) { step ->
                            when (step) {
                                LoginStep.Identity -> {
                                    IdentityPanel(
                                        viewModel = viewModel,
                                        uiState = uiState,
                                        onNext = { 
                                            viewModel.onIdentityNext()
                                            // subStep will be updated automatically in the step effect
                                        },
                                        onBack = onBack
                                    )
                                }
                                LoginStep.Credentials -> {
                                    // Set subStep to USERNAME when we enter this state
                                    SideEffect {
                                        if (subStep == LoginSubStep.PORTAL) {
                                            subStep = LoginSubStep.USERNAME
                                        }
                                    }

                                    if (subStep == LoginSubStep.USERNAME) {
                                        UsernamePanel(
                                            viewModel = viewModel,
                                            uiState = uiState,
                                            onNext = { subStep = LoginSubStep.PASSWORD },
                                            onBack = { 
                                                viewModel.goBackToIdentity()
                                                subStep = LoginSubStep.PORTAL 
                                            }
                                        )
                                    } else {
                                        PasswordPanel(
                                            viewModel = viewModel,
                                            uiState = uiState,
                                            onLoginSuccess = onLoginSuccess,
                                            onBack = { subStep = LoginSubStep.USERNAME }
                                        )
                                    }
                                }
                                else -> { /* No registration logic here */ }
                            }
                        }
                    }
                }
            }
        }

        // Professional Stable Loading Overlay
        if (uiState.isLoading) {
            Box(
                modifier = Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.8f)),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    // Safe, non-crashing high-fidelity indicator
                    Text(
                        text = "ESTABLISHING HANDSHAKE...",
                        style = MaterialTheme.typography.labelLarge,
                        color = PrimaryRed,
                        fontWeight = FontWeight.ExtraBold,
                        letterSpacing = 2.sp
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Box(modifier = Modifier.size(40.dp).background(PrimaryRed.copy(alpha = 0.2f)))
                }
            }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun IdentityPanel(
    viewModel: LoginViewModel,
    uiState: LoginUiState,
    onNext: () -> Unit,
    onBack: () -> Unit
) {
    Column(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.Top
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(
                text = "Connect to your server",
                style = MaterialTheme.typography.headlineMedium,
                color = TextPrimary,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = "Enter your unique Server Identity code to establish a secure handshake.",
                style = MaterialTheme.typography.bodyMedium,
                color = TextSecondary,
                lineHeight = 20.sp
            )
            
            Spacer(modifier = Modifier.height(4.dp))

            LoginInputField(
                label = "SERVER IDENTITY",
                value = uiState.portalCode,
                placeholder = "e.g. SMARTIFLY-01",
                isFocusedField = true,
                error = uiState.error,
                modifier = Modifier.fillMaxWidth()
            )
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        LoginKeyboard(
            onKeyClick = { viewModel.onPortalKeyClick(it) },
            onBackspace = { viewModel.onPortalBackspace() },
            onEnter = { 
                if (uiState.portalCode.isNotEmpty() && !uiState.isLoading) {
                    onNext()
                }
            },
            actionLabel = "Next",
            onBack = onBack,
            modifier = Modifier.fillMaxWidth()
        )
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun UsernamePanel(
    viewModel: LoginViewModel,
    uiState: LoginUiState,
    onNext: () -> Unit,
    onBack: () -> Unit
) {
    Column(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.Top
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(
                text = "Account Access",
                style = MaterialTheme.typography.headlineMedium,
                color = TextPrimary,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = "Please enter your verified account username to proceed.",
                style = MaterialTheme.typography.bodyMedium,
                color = TextSecondary
            )
            
            LoginInputField(
                label = "USERNAME",
                value = uiState.username,
                placeholder = "Enter account username",
                isFocusedField = true,
                modifier = Modifier.fillMaxWidth()
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        LoginKeyboard(
            onKeyClick = { viewModel.onCredentialKeyClick(it, "USERNAME") },
            onBackspace = { viewModel.onCredentialBackspace("USERNAME") },
            onEnter = { 
                if (uiState.username.isNotEmpty()) {
                    onNext()
                }
            },
            actionLabel = "Next",
            onBack = onBack,
            modifier = Modifier.fillMaxWidth()
        )
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun PasswordPanel(
    viewModel: LoginViewModel,
    uiState: LoginUiState,
    onLoginSuccess: () -> Unit,
    onBack: () -> Unit
) {
    Column(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.Top
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(
                text = "Secure Verification",
                style = MaterialTheme.typography.headlineMedium,
                color = TextPrimary,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = "Finally, enter your password to authorize your session.",
                style = MaterialTheme.typography.bodyMedium,
                color = TextSecondary
            )
            
            LoginInputField(
                label = "PASSWORD",
                value = uiState.password,
                placeholder = "Enter account password",
                isPassword = false,
                isFocusedField = true,
                error = uiState.error,
                modifier = Modifier.fillMaxWidth()
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        LoginKeyboard(
            onKeyClick = { viewModel.onCredentialKeyClick(it, "PASSWORD") },
            onBackspace = { viewModel.onCredentialBackspace("PASSWORD") },
            onEnter = { viewModel.performLogin(onLoginSuccess) },
            actionLabel = "Login",
            onBack = onBack,
            modifier = Modifier.fillMaxWidth()
        )
    }
}
