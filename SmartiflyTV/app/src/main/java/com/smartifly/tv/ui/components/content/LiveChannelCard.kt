package com.smartifly.tv.ui.components.content

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.Text
import coil.compose.AsyncImage
import com.smartifly.tv.ui.components.base.BaseFocusableCard
import com.smartifly.tv.ui.theme.Dimensions
import com.smartifly.tv.ui.theme.PrimaryRed
import com.smartifly.tv.ui.theme.TextPrimary
import com.smartifly.tv.data.image.ImageFailureMemory
import com.smartifly.tv.data.image.ImagePolicyEngine
import com.smartifly.tv.data.image.ImageQualityMonitor
import com.smartifly.tv.data.image.ProviderHealthTelemetry
import com.smartifly.tv.data.hero.HeroImageResolver

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun LiveChannelCard(
    channelName: String,
    profileId: String? = null,
    onClick: () -> Unit,
    onFocus: () -> Unit,
    modifier: Modifier = Modifier,
    logoUrl: String? = null,
    contentId: String? = null,
    contentType: String = "live"
) {
    var showFallback by remember(contentId, logoUrl) { mutableStateOf(false) }
    val normalizedLogo = HeroImageResolver.normalizeImageUrl(logoUrl)
    val policyResolvedLogo = ImagePolicyEngine.resolveFirstUsable(logoUrl)
    val resolvedLogo = policyResolvedLogo ?: logoUrl
    val hasPolicyRejectedUrl = !logoUrl.isNullOrBlank() && normalizedLogo.isNullOrBlank()
    val suppressedByBadMemory = !normalizedLogo.isNullOrBlank() && policyResolvedLogo.isNullOrBlank()

    LaunchedEffect(hasPolicyRejectedUrl, suppressedByBadMemory, logoUrl, profileId, contentType, contentId) {
        if (hasPolicyRejectedUrl) {
            ProviderHealthTelemetry.recordEvent(
                eventType = "URL_REJECTED",
                context = ImageQualityMonitor.Context.LIVE_CARD,
                imageUrl = logoUrl,
                hostOverride = "invalid-host",
                profileId = profileId,
                contentType = contentType,
                contentId = contentId,
                metadata = mapOf("reason" to "url_policy_rejected")
            )
        } else if (suppressedByBadMemory) {
            ProviderHealthTelemetry.recordEvent(
                eventType = "URL_SUPPRESSED",
                context = ImageQualityMonitor.Context.LIVE_CARD,
                imageUrl = logoUrl,
                profileId = profileId,
                contentType = contentType,
                contentId = contentId,
                metadata = mapOf("reason" to "temporary_failure_memory")
            )
        }
    }

    BaseFocusableCard(
        onClick = onClick,
        onFocus = onFocus,
        modifier = modifier.size(Dimensions.LiveChannelWidth, Dimensions.LiveChannelHeight)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.DarkGray.copy(alpha = 0.2f)),
            contentAlignment = Alignment.Center
        ) {
            if (!resolvedLogo.isNullOrBlank() && !showFallback) {
                AsyncImage(
                    model = resolvedLogo,
                    contentDescription = null,
                    modifier = Modifier.size(80.dp).padding(12.dp),
                    contentScale = ContentScale.Fit,
                    onSuccess = {
                        ImageQualityMonitor.recordSuccess(
                            url = resolvedLogo,
                            context = ImageQualityMonitor.Context.LIVE_CARD,
                            profileId = profileId,
                            contentType = contentType,
                            contentId = contentId
                        )
                    },
                    onError = {
                        ImageFailureMemory.markBad(resolvedLogo)
                        showFallback = true
                        ImageQualityMonitor.recordFailure(
                            url = resolvedLogo,
                            context = ImageQualityMonitor.Context.LIVE_CARD,
                            profileId = profileId,
                            contentType = contentType,
                            contentId = contentId
                        )
                    }
                )
            } else {
                Text(
                    text = channelName.take(24),
                    style = MaterialTheme.typography.labelLarge,
                    color = TextPrimary,
                    modifier = Modifier.padding(8.dp)
                )
            }
            
            // "LIVE" Badge
            Box(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(8.dp)
                    .background(PrimaryRed, shape = androidx.compose.foundation.shape.RoundedCornerShape(2.dp))
                    .padding(horizontal = 4.dp, vertical = 2.dp)
            ) {
                Text(
                    text = "LIVE",
                    color = TextPrimary,
                    style = MaterialTheme.typography.labelSmall
                )
            }
        }
    }
}
