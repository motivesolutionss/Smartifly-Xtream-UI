package com.smartifly.tv.features.login.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.*
import com.smartifly.tv.ui.theme.*

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun LoginInputField(
    label: String,
    value: String,
    placeholder: String,
    modifier: Modifier = Modifier,
    isPassword: Boolean = false,
    isFocusedField: Boolean = false,
    error: String? = null
) {
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelMedium,
            color = TextSecondary,
            letterSpacing = 1.sp
        )
        
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(48.dp)
                .background(
                    if (isFocusedField) SurfaceMedium.copy(alpha = 0.35f) else Color.White.copy(alpha = 0.06f),
                    RoundedCornerShape(Dimensions.FocusCornerRadius)
                )
                .border(
                    width = if (isFocusedField) Dimensions.FocusBorderWidth else 1.dp,
                    color = if (isFocusedField) Color.White else Color.White.copy(alpha = 0.12f),
                    shape = RoundedCornerShape(Dimensions.FocusCornerRadius)
                )
                .padding(horizontal = 20.dp),
            contentAlignment = Alignment.CenterStart
        ) {
            if (value.isEmpty()) {
                Text(
                    text = placeholder,
                    style = MaterialTheme.typography.bodyLarge,
                    color = TextSecondary.copy(alpha = 0.4f)
                )
            } else {
                Text(
                    text = if (isPassword) "•".repeat(value.length.coerceAtMost(20)) else value,
                    style = MaterialTheme.typography.bodyLarge,
                    color = TextPrimary,
                    letterSpacing = if (isPassword) 3.sp else 0.sp
                )
            }
        }
        
        if (error != null) {
            Text(
                text = error,
                style = MaterialTheme.typography.labelSmall,
                color = PrimaryRed,
                modifier = Modifier.padding(start = 4.dp, top = 2.dp)
            )
        }
    }
}
