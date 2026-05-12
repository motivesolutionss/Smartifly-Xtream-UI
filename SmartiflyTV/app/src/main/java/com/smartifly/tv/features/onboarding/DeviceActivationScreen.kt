package com.smartifly.tv.features.onboarding

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.material3.CircularProgressIndicator
import androidx.tv.material3.*
import com.smartifly.tv.data.onboarding.DeviceActivationInfo
import com.smartifly.tv.ui.theme.PrimaryRed
import com.smartifly.tv.ui.theme.SurfaceVariant
import com.smartifly.tv.ui.theme.TextPrimary
import com.smartifly.tv.ui.theme.TextSecondary

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun DeviceActivationScreen(
    activationInfo: DeviceActivationInfo,
    @Suppress("UNUSED_PARAMETER") onActivationComplete: () -> Unit
) {
    Row(
        modifier = Modifier.fillMaxSize().padding(64.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Left Side: Instructions
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = "Scan to register this TV",
                style = MaterialTheme.typography.displaySmall,
                color = TextPrimary,
                fontWeight = FontWeight.Bold
            )
            
            Spacer(modifier = Modifier.height(32.dp))
            
            InstructionItem("1. Scan the QR code with your phone")
            InstructionItem("2. Submit your name and phone number")
            InstructionItem("3. Our operator will contact you for setup")
            InstructionItem("4. Keep this screen open for auto-activation")
            
            Spacer(modifier = Modifier.height(48.dp))
            
            Text(text = "Website: ${activationInfo.websiteUrl}", color = TextSecondary)
        }

        // Right Side: QR & Code
        Column(
            modifier = Modifier.width(400.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Box(
                modifier = Modifier
                    .size(250.dp)
                    .background(Color.White, RoundedCornerShape(16.dp))
                    .padding(16.dp),
                contentAlignment = Alignment.Center
            ) {
                // In a real app, generate QR from activationInfo.qrToken
                Text("QR CODE", color = Color.Black, fontWeight = FontWeight.Bold)
            }

            Spacer(modifier = Modifier.height(32.dp))

            Text(text = "Activation Code", color = TextSecondary, style = MaterialTheme.typography.labelMedium)
            
            Box(
                modifier = Modifier
                    .padding(top = 8.dp)
                    .background(SurfaceVariant, RoundedCornerShape(8.dp))
                    .padding(horizontal = 24.dp, vertical = 12.dp)
            ) {
                Text(
                    text = activationInfo.activationCode,
                    style = MaterialTheme.typography.headlineLarge,
                    color = PrimaryRed,
                    letterSpacing = 4.sp,
                    fontWeight = FontWeight.ExtraBold
                )
            }
            
            Spacer(modifier = Modifier.height(32.dp))
            
            com.smartifly.tv.ui.components.base.SmartiflyLoader(modifier = Modifier.size(40.dp))
            Text(
                text = "Waiting for operator approval...",
                modifier = Modifier.padding(top = 16.dp),
                style = MaterialTheme.typography.labelSmall,
                color = TextSecondary
            )
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun InstructionItem(text: String) {
    Text(
        text = text,
        style = MaterialTheme.typography.headlineSmall,
        color = TextPrimary,
        modifier = Modifier.padding(vertical = 8.dp)
    )
}
