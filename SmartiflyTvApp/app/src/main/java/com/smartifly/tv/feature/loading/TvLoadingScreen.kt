package com.smartifly.tv.feature.loading

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.smartifly.tv.R
import com.smartifly.tv.ui.components.TvFocusButton
import com.smartifly.tv.ui.design.TvTokens
import com.smartifly.tv.ui.styling.TvStyles

@Composable
fun TvLoadingScreen(
    viewModel: LoadingViewModel,
    onFinished: () -> Unit,
    onCancel: () -> Unit,
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val transition = rememberInfiniteTransition(label = "loading")
    val logoScale by transition.animateFloat(
        initialValue = 1f,
        targetValue = 1.045f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1800),
            repeatMode = RepeatMode.Reverse
        ),
        label = "logoScale"
    )
    val logoGlow by transition.animateFloat(
        initialValue = 0.42f,
        targetValue = 0.9f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 2200),
            repeatMode = RepeatMode.Reverse
        ),
        label = "logoGlow"
    )
    val shimmerOffset by transition.animateFloat(
        initialValue = -0.55f,
        targetValue = 1.15f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1500, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "shimmerOffset"
    )

    LaunchedEffect(state.completed) {
        if (state.completed) {
            onFinished()
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(TvStyles.appBackground),
        contentAlignment = Alignment.Center
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(TvStyles.coolGlow)
        )
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(TvStyles.subtleBlueGlow)
        )
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(TvStyles.topVignette)
        )
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(TvStyles.bottomVignette)
        )

        Column(
            modifier = Modifier
                .width(720.dp)
                .background(TvStyles.frostedPanelSoft, RoundedCornerShape(32.dp))
                .border(1.dp, TvTokens.Colors.BorderStrong.copy(alpha = 0.28f), RoundedCornerShape(32.dp))
                .padding(horizontal = 56.dp, vertical = 42.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Box(
                modifier = Modifier
                    .shadow(
                        elevation = 24.dp,
                        shape = CircleShape,
                        ambientColor = TvTokens.Colors.Primary.copy(alpha = logoGlow * 0.45f),
                        spotColor = TvTokens.Colors.Primary.copy(alpha = logoGlow * 0.45f)
                    )
                    .scale(logoScale)
            ) {
                Image(
                    painter = painterResource(id = R.drawable.smartifly_icon),
                    contentDescription = "Smartifly",
                    contentScale = ContentScale.Fit,
                    modifier = Modifier
                        .width(340.dp)
                        .height(110.dp)
                )
            }

            Box(
                modifier = Modifier
                    .padding(top = 28.dp)
                    .width(420.dp)
                    .height(6.dp)
                    .background(
                        TvTokens.Colors.TextSecondary.copy(alpha = 0.18f),
                        CircleShape
                    )
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth(state.progress.coerceIn(0, 100) / 100f)
                        .height(6.dp)
                        .background(TvTokens.Colors.Primary, CircleShape)
                )
                Box(
                    modifier = Modifier
                        .align(Alignment.CenterStart)
                        .padding(start = (420 * shimmerOffset).coerceAtLeast(0f).dp)
                        .width(96.dp)
                        .height(6.dp)
                        .alpha(0.9f)
                        .background(
                            Brush.horizontalGradient(
                                colors = listOf(
                                    Color.Transparent,
                                    TvTokens.Colors.TextPrimary.copy(alpha = 0.65f),
                                    Color.Transparent
                                )
                            ),
                            CircleShape
                        )
                )
            }

            Text(
                text = state.stageLabel,
                modifier = Modifier.padding(top = 14.dp),
                style = TvTokens.TvType.LabelSmall.copy(fontSize = 12.sp, letterSpacing = 4.sp),
                color = TvTokens.Colors.TextSecondary.copy(alpha = 0.62f)
            )

            if (state.usingCachedHome) {
                Text(
                    text = "Using cached home data while live services recover.",
                    modifier = Modifier.padding(top = 10.dp),
                    style = TvTokens.TvType.LabelSmall.copy(fontSize = 12.sp, lineHeight = 18.sp),
                    color = TvTokens.Colors.TextSecondary.copy(alpha = 0.74f)
                )
            }

            if (state.phase == LoadingPhase.FAILED) {
                Text(
                    text = state.errorMessage.orEmpty(),
                    modifier = Modifier.padding(top = 18.dp),
                    style = TvTokens.TvType.BodySmall.copy(fontSize = 15.sp, lineHeight = 22.sp),
                    color = TvTokens.Colors.Error
                )
                TvFocusButton(
                    text = "Retry",
                    primary = true,
                    compact = true,
                    modifier = Modifier
                        .padding(top = 22.dp)
                        .width(180.dp),
                    onClick = viewModel::retryBootstrap
                )
            }
        }
    }
}

@Preview(showBackground = true, widthDp = 960, heightDp = 540)
@Composable
private fun TvLoadingScreenPreview() {
    // Preview keeps the legacy screen self-contained.
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(TvStyles.appBackground)
    )
}
