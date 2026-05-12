package com.smartifly.tv.ui.components.content

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import coil.compose.AsyncImage
import com.smartifly.tv.data.models.MovieMetadata
import com.smartifly.tv.ui.components.base.BaseFocusableCard
import com.smartifly.tv.ui.theme.Dimensions

import androidx.compose.ui.draw.clip
import com.smartifly.tv.ui.theme.SurfaceDark
import com.smartifly.tv.data.image.ImageFailureMemory
import com.smartifly.tv.data.image.ImagePolicyEngine
import com.smartifly.tv.data.image.ImageQualityMonitor

@Composable
fun PosterCard(
    movie: MovieMetadata,
    profileId: String? = null,
    onClick: () -> Unit,
    onFocus: () -> Unit,
    modifier: Modifier = Modifier
) {
    val resolvedImage = ImagePolicyEngine.resolveFirstUsable(
        movie.posterUrl,
        movie.backdropUrl
    ) ?: movie.posterUrl

    BaseFocusableCard(
        onClick = onClick,
        onFocus = onFocus,
        modifier = modifier
            .size(Dimensions.PosterWidth, Dimensions.PosterHeight)
            .clip(androidx.compose.foundation.shape.RoundedCornerShape(Dimensions.FocusCornerRadius))
    ) {
        // Base layer / Placeholder
        Box(modifier = Modifier.fillMaxSize().background(SurfaceDark))
        
        AsyncImage(
            model = resolvedImage,
            contentDescription = movie.title,
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop,
            onError = {
                if (resolvedImage.isNotBlank()) {
                    ImageFailureMemory.markBad(resolvedImage)
                    ImageQualityMonitor.recordFailure(
                        url = resolvedImage,
                        context = ImageQualityMonitor.Context.HOME_POSTER,
                        profileId = profileId,
                        contentType = movie.type,
                        contentId = movie.id
                    )
                }
            },
            onSuccess = {
                if (resolvedImage.isNotBlank()) {
                    ImageQualityMonitor.recordSuccess(
                        url = resolvedImage,
                        context = ImageQualityMonitor.Context.HOME_POSTER,
                        profileId = profileId,
                        contentType = movie.type,
                        contentId = movie.id
                    )
                }
            }
        )
    }
}
