package com.smartifly.tv.features.profiles

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.foundation.Canvas
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.*
import coil.compose.AsyncImage
import com.smartifly.tv.R
import com.smartifly.tv.data.models.UserProfile
import com.smartifly.tv.ui.theme.PrimaryRed
import com.smartifly.tv.ui.theme.SmartiflyTheme
import com.smartifly.tv.ui.theme.TextPrimary
import com.smartifly.tv.ui.theme.TextSecondary
import com.smartifly.tv.ui.theme.fromHex
import com.smartifly.tv.ui.components.dialogs.PinEntryDialog
import kotlinx.coroutines.launch

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun ProfileSelectionScreen(
    viewModel: ProfilesViewModel,
    onProfileSelected: (UserProfile) -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    var selectedProfileForPin by remember { mutableStateOf<UserProfile?>(null) }
    var pinError by remember { mutableStateOf<String?>(null) }
    
    // Tracking current focused profile for D-pad scale highlights
    var focusedProfile by remember { mutableStateOf<UserProfile?>(null) }

    // Staggered entrance animation trigger
    var startEntrance by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        startEntrance = true
    }

    // Dynamic profile actions & states
    var isManageMode by remember { mutableStateOf(false) }
    var showCustomizeDialogForProfile by remember { mutableStateOf<UserProfile?>(null) }
    var showAddProfileDialog by remember { mutableStateOf(false) }
    var showDeleteConfirmForProfile by remember { mutableStateOf<UserProfile?>(null) }

    SmartiflyTheme {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.radialGradient(
                        colors = listOf(
                            PrimaryRed.copy(alpha = 0.15f),
                            Color(0xFF000000) // Keeps visual momentum matching WelcomeScreen cinematic background
                        ),
                        center = androidx.compose.ui.geometry.Offset(x = 1400f, y = 540f),
                        radius = 1200f
                    )
                )
        ) {
            Column(
                modifier = Modifier.fillMaxSize(),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                // Cinematic animated Title
                val titleAlpha by animateFloatAsState(if (startEntrance) 1f else 0f, animationSpec = tween(600))
                val titleOffset by animateDpAsState(if (startEntrance) 0.dp else (-20).dp, animationSpec = tween(600))
                
                Text(
                    text = if (isManageMode) "Manage Profiles" else "Who's watching?",
                    style = MaterialTheme.typography.displayMedium,
                    color = TextPrimary,
                    fontWeight = FontWeight.ExtraBold,
                    modifier = Modifier
                        .graphicsLayer {
                            alpha = titleAlpha
                            translationY = titleOffset.toPx()
                        }
                )
                
                Spacer(modifier = Modifier.height(56.dp))

                when (val state = uiState) {
                    is ProfilesUiState.Loading -> {
                        CircularProgressIndicator(color = PrimaryRed, strokeWidth = 4.dp)
                    }
                    is ProfilesUiState.Success -> {
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(36.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            state.profiles.forEachIndexed { index, profile ->
                                // Staggered card entrance slide & fade
                                var isCardVisible by remember { mutableStateOf(false) }
                                LaunchedEffect(Unit) {
                                    kotlinx.coroutines.delay(100L * (index + 1))
                                    isCardVisible = true
                                }
                                val cardAlpha by animateFloatAsState(if (isCardVisible) 1f else 0f, animationSpec = tween(400))
                                val cardOffset by animateDpAsState(if (isCardVisible) 0.dp else 24.dp, animationSpec = tween(400))

                                Box(
                                    modifier = Modifier
                                        .graphicsLayer {
                                            alpha = cardAlpha
                                            translationY = cardOffset.toPx()
                                        }
                                ) {
                                    ProfileCard(
                                        profile = profile,
                                        isManageMode = isManageMode,
                                        onFocus = { focusedProfile = profile }
                                    ) {
                                        if (isManageMode) {
                                            showCustomizeDialogForProfile = profile
                                        } else {
                                            if (profile.pin != null) {
                                                selectedProfileForPin = profile
                                            } else {
                                                viewModel.selectProfile(profile)
                                                onProfileSelected(profile)
                                            }
                                        }
                                    }
                                }
                            }
                            
                            if (state.profiles.size < 5) {
                                // Staggered Add Profile Button
                                var isAddVisible by remember { mutableStateOf(false) }
                                LaunchedEffect(Unit) {
                                    kotlinx.coroutines.delay(100L * (state.profiles.size + 1))
                                    isAddVisible = true
                                }
                                val addAlpha by animateFloatAsState(if (isAddVisible) 1f else 0f, animationSpec = tween(400))
                                val addOffset by animateDpAsState(if (isAddVisible) 0.dp else 24.dp, animationSpec = tween(400))

                                var isAddFocused by remember { mutableStateOf(false) }
                                val addScale by animateFloatAsState(if (isAddFocused) 1.08f else 1.0f, label = "addScale")
                                val addCorner = animateDpAsState(if (isAddFocused) 20.dp else 12.dp, label = "addCorner")

                                Surface(
                                    onClick = { showAddProfileDialog = true },
                                    shape = ClickableSurfaceDefaults.shape(RoundedCornerShape(addCorner.value)),
                                    border = ClickableSurfaceDefaults.border(
                                        border = Border(BorderStroke(1.dp, Color.White.copy(alpha = 0.12f)), shape = RoundedCornerShape(12.dp)),
                                        focusedBorder = Border(BorderStroke(4.dp, Color.White), shape = RoundedCornerShape(20.dp))
                                    ),
                                    colors = ClickableSurfaceDefaults.colors(
                                        containerColor = Color.White.copy(alpha = 0.03f),
                                        focusedContainerColor = Color.White.copy(alpha = 0.1f)
                                    ),
                                    modifier = Modifier
                                        .size(160.dp)
                                        .graphicsLayer {
                                            alpha = addAlpha
                                            translationY = addOffset.toPx()
                                        }
                                        .scale(addScale)
                                        .onFocusChanged { state ->
                                            isAddFocused = state.hasFocus
                                            if (state.hasFocus) {
                                                focusedProfile = null
                                            }
                                        }
                                ) {
                                    Box(
                                        contentAlignment = Alignment.Center,
                                        modifier = Modifier.fillMaxSize()
                                    ) {
                                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                            Icon(
                                                imageVector = Icons.Rounded.Add,
                                                contentDescription = "Add Profile",
                                                tint = Color.White.copy(alpha = 0.6f),
                                                modifier = Modifier.size(36.dp)
                                            )
                                            Spacer(modifier = Modifier.height(10.dp))
                                            Text(
                                                text = "Add Profile",
                                                style = MaterialTheme.typography.labelMedium,
                                                color = Color.White.copy(alpha = 0.6f),
                                                fontWeight = FontWeight.SemiBold
                                            )
                                        }
                                    }
                                }
                            }
                        }
                        
                        Spacer(modifier = Modifier.height(48.dp))

                        // Manage Profiles Options Row
                        var isManageFocused by remember { mutableStateOf(false) }
                        val manageScale by animateFloatAsState(if (isManageFocused) 1.05f else 1.0f)
                        
                        Surface(
                            onClick = { isManageMode = !isManageMode },
                            shape = ClickableSurfaceDefaults.shape(RoundedCornerShape(8.dp)),
                            border = ClickableSurfaceDefaults.border(
                                border = Border(BorderStroke(1.dp, Color.White.copy(alpha = 0.25f)), shape = RoundedCornerShape(8.dp)),
                                focusedBorder = Border(BorderStroke(2.dp, Color.White), shape = RoundedCornerShape(8.dp))
                            ),
                            colors = ClickableSurfaceDefaults.colors(
                                containerColor = if (isManageMode) Color.White.copy(alpha = 0.15f) else Color.Transparent,
                                focusedContainerColor = Color.White.copy(alpha = 0.25f)
                            ),
                            modifier = Modifier
                                .graphicsLayer { alpha = titleAlpha }
                                .scale(manageScale)
                                .onFocusChanged { isManageFocused = it.hasFocus }
                        ) {
                            Text(
                                text = if (isManageMode) "Done" else "Manage Profiles",
                                style = MaterialTheme.typography.labelLarge,
                                color = if (isManageFocused || isManageMode) TextPrimary else TextSecondary.copy(alpha = 0.65f),
                                fontWeight = FontWeight.SemiBold,
                                modifier = Modifier.padding(horizontal = 24.dp, vertical = 10.dp)
                            )
                        }
                    }
                    is ProfilesUiState.Error -> {
                        Text(text = state.message, color = Color.Red)
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(onClick = { viewModel.loadProfiles() }) {
                            Text("Retry")
                        }
                    }
                }
            }

            // PIN validation dialog
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

            // Add Profile Dialog
            if (showAddProfileDialog) {
                ProfileCustomizeDialog(
                    profile = null,
                    onDismiss = { showAddProfileDialog = false },
                    onSave = { name, pin ->
                        viewModel.createProfile(name, pin)
                        showAddProfileDialog = false
                    }
                )
            }

            // Edit Profile Dialog
            if (showCustomizeDialogForProfile != null) {
                ProfileCustomizeDialog(
                    profile = showCustomizeDialogForProfile,
                    onDismiss = { showCustomizeDialogForProfile = null },
                    onSave = { name, pin ->
                        showCustomizeDialogForProfile?.let { original ->
                            viewModel.updateProfile(original.id, name, original.avatarUrl, pin)
                        }
                        showCustomizeDialogForProfile = null
                    },
                    onDelete = {
                        showDeleteConfirmForProfile = showCustomizeDialogForProfile
                        showCustomizeDialogForProfile = null
                    }
                )
            }

            // Delete Confirmation Dialog
            if (showDeleteConfirmForProfile != null) {
                ProfileDeleteConfirmDialog(
                    profile = showDeleteConfirmForProfile!!,
                    onDismiss = { showDeleteConfirmForProfile = null },
                    onConfirm = {
                        showDeleteConfirmForProfile?.let { original ->
                            viewModel.deleteProfile(original.id)
                        }
                        showDeleteConfirmForProfile = null
                    }
                )
            }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun ProfileCard(
    profile: UserProfile,
    isManageMode: Boolean = false,
    onFocus: () -> Unit,
    onClick: () -> Unit
) {
    var isFocused by remember { mutableStateOf(false) }
    val scale by animateFloatAsState(if (isFocused) 1.08f else 1.0f, label = "cardScale")
    val cornerRadius = animateDpAsState(if (isFocused) 20.dp else 12.dp, label = "cardCorner")
    
    val focusBorderColor = remember(profile.primaryColor) {
        if (profile.primaryColor != null) fromHex(profile.primaryColor) else PrimaryRed
    }

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.width(160.dp)
    ) {
        Surface(
            onClick = onClick,
            shape = ClickableSurfaceDefaults.shape(RoundedCornerShape(cornerRadius.value)),
            border = ClickableSurfaceDefaults.border(
                border = Border(BorderStroke(1.dp, Color.White.copy(alpha = 0.1f)), shape = RoundedCornerShape(12.dp)),
                focusedBorder = Border(BorderStroke(4.dp, focusBorderColor), shape = RoundedCornerShape(20.dp))
            ),
            colors = ClickableSurfaceDefaults.colors(
                containerColor = Color.Transparent,
                focusedContainerColor = Color.Transparent
            ),
            modifier = Modifier
                .size(160.dp)
                .onFocusChanged { state -> 
                    isFocused = state.hasFocus
                    if (state.hasFocus) {
                        onFocus()
                    }
                }
                .scale(scale)
        ) {
            Box(modifier = Modifier.fillMaxSize()) {
                ProfileAvatar(
                    profile = profile,
                    isFocused = isFocused,
                    modifier = Modifier.fillMaxSize()
                )
    
                if (profile.pin != null && !isManageMode) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(Color.Black.copy(alpha = 0.35f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Rounded.Lock,
                            contentDescription = "Protected",
                            tint = Color.White.copy(alpha = 0.85f),
                            modifier = Modifier.size(36.dp)
                        )
                    }
                }

                if (isManageMode) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(Color.Black.copy(alpha = 0.6f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Box(
                            modifier = Modifier
                                .size(48.dp)
                                .background(Color.Black.copy(alpha = 0.7f), shape = CircleShape)
                                .border(2.dp, Color.White, CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Rounded.Edit,
                                contentDescription = "Edit Profile",
                                tint = Color.White,
                                modifier = Modifier.size(24.dp)
                            )
                        }
                    }
                }
            }
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        Text(
            text = profile.name,
            style = MaterialTheme.typography.titleMedium,
            color = if (isFocused) TextPrimary else TextSecondary.copy(alpha = 0.75f),
            fontWeight = if (isFocused) FontWeight.ExtraBold else FontWeight.Medium,
            maxLines = 1
        )
        
    }
}

@Composable
fun ProfileAvatar(
    profile: UserProfile,
    isFocused: Boolean,
    modifier: Modifier = Modifier,
    paddingDp: androidx.compose.ui.unit.Dp = 28.dp,
    cornerRadiusDp: androidx.compose.ui.unit.Dp? = null
) {
    val cornerRadius = animateDpAsState(
        if (cornerRadiusDp != null) {
            cornerRadiusDp
        } else {
            if (isFocused) 20.dp else 12.dp
        },
        label = "avatarCorner"
    )
    val presetIndex = remember(profile.id) { profile.id.hashCode().coerceAtLeast(0) }

    Box(
        modifier = modifier
            .clip(RoundedCornerShape(cornerRadius.value))
            .background(Color(0xFF1E2633)) // Soft dark background behind fallback
    ) {
        if (!profile.avatarUrl.isNullOrEmpty() && !profile.avatarUrl.contains("dicebear")) {
            AsyncImage(
                model = profile.avatarUrl,
                contentDescription = profile.name,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop
            )
        } else {
            // Programmatic classic gradient smiley avatar built specifically for SmartiflyTV
            SmileyAvatar(
                profile = profile,
                presetIndex = presetIndex,
                modifier = Modifier.fillMaxSize(),
                paddingDp = paddingDp
            )
        }
        
        // Inner cinematic glass reflection overlay
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.linearGradient(
                        0f to Color.White.copy(alpha = 0.12f),
                        0.4f to Color.Transparent,
                        1f to Color.Black.copy(alpha = 0.25f)
                    )
                )
        )
    }
}

@Composable
fun SmileyAvatar(
    profile: UserProfile,
    presetIndex: Int,
    modifier: Modifier = Modifier,
    paddingDp: androidx.compose.ui.unit.Dp = 28.dp
) {
    // Curated high-contrast gradient background matching classic streaming profiles
    val gradientBrush = remember(profile.primaryColor, presetIndex) {
        val baseColor = profile.primaryColor?.let { fromHex(it) }
        val colors = if (baseColor != null) {
            listOf(
                baseColor.copy(alpha = 0.9f),
                baseColor.copy(alpha = 0.45f)
            )
        } else {
            val palettes = listOf(
                listOf(Color(0xFF800000), Color(0xFFE50914)), // Crimson Red
                listOf(Color(0xFF00485C), Color(0xFF00F3FF)), // Cyber Cyan
                listOf(Color(0xFF806600), Color(0xFFFFD700)), // Amber Gold
                listOf(Color(0xFF1F2937), Color(0xFF6B7280))  // Metallic Slate/Slate Grey
            )
            palettes[presetIndex % palettes.size]
        }
        
        Brush.linearGradient(
            colors = colors,
            start = androidx.compose.ui.geometry.Offset.Zero,
            end = androidx.compose.ui.geometry.Offset(1000f, 1000f)
        )
    }

    Box(
        modifier = modifier.background(gradientBrush)
    ) {
        // Draw the iconic, clean smiley face (exactly like the Netflix profile icons!)
        Canvas(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingDp)
        ) {
            val width = size.width
            val height = size.height

            // Precise Netflix face proportions:
            // Symmetrical, perfectly balanced eyes and a warm, clean smile
            val eyeRadius = width * 0.07f
            val eyeY = height * 0.38f
            val leftEyeX = width * 0.33f
            val rightEyeX = width * 0.67f

            drawCircle(
                color = Color.White,
                radius = eyeRadius,
                center = androidx.compose.ui.geometry.Offset(leftEyeX, eyeY)
            )

            drawCircle(
                color = Color.White,
                radius = eyeRadius,
                center = androidx.compose.ui.geometry.Offset(rightEyeX, eyeY)
            )

            // Smile: beautiful, symmetrical curved stroke with round caps
            val smilePath = Path().apply {
                moveTo(width * 0.31f, height * 0.58f)
                quadraticTo(
                    width * 0.50f, height * 0.74f,
                    width * 0.69f, height * 0.58f
                )
            }

            drawPath(
                path = smilePath,
                color = Color.White,
                style = Stroke(
                    width = width * 0.08f,
                    cap = StrokeCap.Round,
                    join = StrokeJoin.Round
                )
            )
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun ProfileCustomizeDialog(
    profile: UserProfile?, // null if Add Profile, else Edit Profile
    onDismiss: () -> Unit,
    onSave: (name: String, pin: String?) -> Unit,
    onDelete: (() -> Unit)? = null
) {
    var nameValue by remember { mutableStateOf(profile?.name ?: "") }
    var pinValue by remember { mutableStateOf(profile?.pin ?: "") }
    var nameError by remember { mutableStateOf(false) }

    val focusColor = remember(profile?.primaryColor) {
        if (profile?.primaryColor != null) fromHex(profile.primaryColor) else PrimaryRed
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.85f)),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier
                .width(480.dp)
                .background(Color(0xFF0F0F0F), shape = RoundedCornerShape(24.dp))
                .border(BorderStroke(1.dp, Color.White.copy(alpha = 0.08f)), shape = RoundedCornerShape(24.dp))
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(24.dp)
        ) {
            Text(
                text = if (profile == null) "Create Profile" else "Edit Profile",
                style = MaterialTheme.typography.headlineMedium,
                color = Color.White,
                fontWeight = FontWeight.Bold
            )

            // Name Field
            androidx.compose.material3.OutlinedTextField(
                value = nameValue,
                onValueChange = { 
                    nameValue = it
                    if (it.isNotBlank()) nameError = false
                },
                label = { Text("Profile Name", color = Color.White.copy(alpha = 0.6f)) },
                singleLine = true,
                isError = nameError,
                textStyle = androidx.compose.ui.text.TextStyle(color = Color.White, fontSize = 18.sp),
                colors = androidx.compose.material3.OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = focusColor,
                    unfocusedBorderColor = Color.White.copy(alpha = 0.15f),
                    focusedLabelColor = focusColor,
                    unfocusedLabelColor = Color.White.copy(alpha = 0.6f),
                    errorBorderColor = Color.Red,
                    errorLabelColor = Color.Red
                ),
                modifier = Modifier.fillMaxWidth()
            )

            // PIN Field
            androidx.compose.material3.OutlinedTextField(
                value = pinValue,
                onValueChange = { 
                    if (it.length <= 4 && it.all { char -> char.isDigit() }) pinValue = it 
                },
                label = { Text("Profile PIN (4 digits for Lock - Optional)", color = Color.White.copy(alpha = 0.6f)) },
                singleLine = true,
                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(
                    keyboardType = androidx.compose.ui.text.input.KeyboardType.Number
                ),
                visualTransformation = androidx.compose.ui.text.input.PasswordVisualTransformation(),
                textStyle = androidx.compose.ui.text.TextStyle(color = Color.White, fontSize = 18.sp),
                colors = androidx.compose.material3.OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = focusColor,
                    unfocusedBorderColor = Color.White.copy(alpha = 0.15f),
                    focusedLabelColor = focusColor,
                    unfocusedLabelColor = Color.White.copy(alpha = 0.6f)
                ),
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(8.dp))

            // Action Buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Cancel
                Button(
                    onClick = onDismiss,
                    colors = ButtonDefaults.colors(
                        containerColor = Color.White.copy(alpha = 0.08f),
                        focusedContainerColor = Color.White.copy(alpha = 0.15f)
                    ),
                    modifier = Modifier.weight(1f)
                ) {
                    Text("Cancel", color = Color.White)
                }

                // Delete (Only in Edit mode)
                if (profile != null && onDelete != null) {
                    Button(
                        onClick = onDelete,
                        colors = ButtonDefaults.colors(
                            containerColor = Color.Red.copy(alpha = 0.15f),
                            focusedContainerColor = Color.Red
                        ),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("Delete", color = Color.White)
                    }
                }

                // Save
                Button(
                    onClick = {
                        if (nameValue.isNotBlank()) {
                            onSave(nameValue.trim(), pinValue.ifBlank { null })
                        } else {
                            nameError = true
                        }
                    },
                    colors = ButtonDefaults.colors(
                        containerColor = focusColor,
                        focusedContainerColor = focusColor
                    ),
                    modifier = Modifier.weight(1f)
                ) {
                    Text("Save", color = Color.White)
                }
            }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun ProfileDeleteConfirmDialog(
    profile: UserProfile,
    onDismiss: () -> Unit,
    onConfirm: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.9f)),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier
                .width(420.dp)
                .background(Color(0xFF0F0F0F), shape = RoundedCornerShape(24.dp))
                .border(BorderStroke(1.dp, Color.White.copy(alpha = 0.08f)), shape = RoundedCornerShape(24.dp))
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(24.dp)
        ) {
            Text(
                text = "Delete Profile?",
                style = MaterialTheme.typography.headlineMedium,
                color = Color.White,
                fontWeight = FontWeight.Bold
            )

            Text(
                text = "Are you sure you want to delete '${profile.name}'? This action is permanent and will delete all custom lists.",
                style = MaterialTheme.typography.bodyLarge,
                color = Color.White.copy(alpha = 0.7f),
                textAlign = androidx.compose.ui.text.style.TextAlign.Center
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Button(
                    onClick = onDismiss,
                    colors = ButtonDefaults.colors(
                        containerColor = Color.White.copy(alpha = 0.08f),
                        focusedContainerColor = Color.White.copy(alpha = 0.15f)
                    ),
                    modifier = Modifier.weight(1f)
                ) {
                    Text("Cancel", color = Color.White)
                }

                Button(
                    onClick = onConfirm,
                    colors = ButtonDefaults.colors(
                        containerColor = Color.Red,
                        focusedContainerColor = Color.Red
                    ),
                    modifier = Modifier.weight(1f)
                ) {
                    Text("Delete", color = Color.White)
                }
            }
        }
    }
}
