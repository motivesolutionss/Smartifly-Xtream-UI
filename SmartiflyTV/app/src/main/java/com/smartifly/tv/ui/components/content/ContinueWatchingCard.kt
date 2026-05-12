package com.smartifly.tv.ui.components.content

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.Composable
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

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun ContinueWatchingCard(
    imageUrl: String,
    fallbackImageUrl: String? = null,
    progress: Float,
    title: String,
    profileId: String? = null,
    contentId: String? = null,
    contentType: String? = null,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val resolvedImage = ImagePolicyEngine.resolveFirstUsable(
        imageUrl,
        fallbackImageUrl
    ) ?: imageUrl

    BaseFocusableCard(
        onClick = onClick,
        modifier = modifier.size(Dimensions.ContinueWatchingWidth, Dimensions.ContinueWatchingHeight)
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            Box(modifier = Modifier.weight(1f).fillMaxWidth()) {
                AsyncImage(
                    model = resolvedImage,
                    contentDescription = null,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop,
                    onSuccess = {
                        if (resolvedImage.isNotBlank()) {
                            ImageQualityMonitor.recordSuccess(
                                url = resolvedImage,
                                context = ImageQualityMonitor.Context.CONTINUE_WATCHING,
                                profileId = profileId,
                                contentType = contentType,
                                contentId = contentId
                            )
                        }
                    },
                    onError = {
                        if (resolvedImage.isNotBlank()) {
                            ImageFailureMemory.markBad(resolvedImage)
                            ImageQualityMonitor.recordFailure(
                                url = resolvedImage,
                                context = ImageQualityMonitor.Context.CONTINUE_WATCHING,
                                profileId = profileId,
                                contentType = contentType,
                                contentId = contentId
                            )
                        }
                    }
                )
                
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .fillMaxWidth()
                        .height(4.dp)
                        .background(Color.White.copy(alpha = 0.3f))
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth(progress)
                            .fillMaxHeight()
                            .background(PrimaryRed)
                    )
                }
            }
            
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(40.dp)
                    .background(Color.Black.copy(alpha = 0.6f))
                    .padding(horizontal = 8.dp),
                contentAlignment = Alignment.CenterStart
            ) {
                Text(
                    text = title,
                    color = TextPrimary,
                    style = MaterialTheme.typography.labelMedium,
                    maxLines = 1
                )
            }
        }
    }
}
