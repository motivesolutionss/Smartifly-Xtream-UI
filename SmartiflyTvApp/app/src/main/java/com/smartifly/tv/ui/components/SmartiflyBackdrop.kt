package com.smartifly.tv.ui.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.tooling.preview.Preview
import com.smartifly.tv.R
import com.smartifly.tv.ui.design.SmartiflyTvTheme
import com.smartifly.tv.ui.design.TvTokens
import androidx.compose.material3.Text
import com.smartifly.tv.ui.styling.TvStyles
import androidx.compose.ui.unit.dp

@Composable
fun SmartiflyBackdrop(
    modifier: Modifier = Modifier,
    showLogo: Boolean = true,
    showPosterWall: Boolean = true,
    content: @Composable () -> Unit,
) {
    Box(modifier = modifier.fillMaxSize()) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(TvStyles.appBackground)
        )
        if (showPosterWall) {
            Image(
                painter = painterResource(id = R.drawable.overlay),
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .fillMaxSize()
                    .alpha(0.76f)
            )
            Image(
                painter = painterResource(id = R.drawable.hero_overlay),
                contentDescription = null,
                contentScale = ContentScale.FillBounds,
                modifier = Modifier
                    .fillMaxSize()
                    .alpha(0.24f)
            )
            Image(
                painter = painterResource(id = R.drawable.hero_fade),
                contentDescription = null,
                contentScale = ContentScale.FillBounds,
                modifier = Modifier
                    .fillMaxSize()
                    .alpha(0.38f)
            )
        }
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(brush = TvStyles.stageOverlay)
                .alpha(if (showPosterWall) 0.9f else 0.72f)
        )
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(brush = TvStyles.heroOverlay)
        )
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(brush = TvStyles.coolGlow)
                .alpha(if (showPosterWall) 0.58f else 0.42f)
        )
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(brush = TvStyles.topVignette)
        )
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(brush = TvStyles.bottomVignette)
        )

        if (showLogo) {
            Image(
                painter = painterResource(id = R.drawable.smartifly_icon),
                contentDescription = "Smartifly logo",
                contentScale = ContentScale.Fit,
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(top = 4.dp, end = 6.dp)
                    .height(68.dp)
            )
        }

        content()
    }
}

@Preview(showBackground = true, widthDp = 960, heightDp = 540)
@Composable
private fun SmartiflyBackdropPreview() {
    SmartiflyTvTheme {
        SmartiflyBackdrop {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 48.dp, vertical = 36.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                horizontalAlignment = Alignment.Start
            ) {
                Text(
                    text = "Cinematic Backdrop",
                    style = TvTokens.TvType.DisplaySmall,
                    color = TvTokens.Colors.TextPrimary
                )
                Text(
                    text = "Overlay gradients, vignette layers, and brand lockup preview together here.",
                    style = TvTokens.TvType.BodyLarge,
                    color = TvTokens.Colors.TextSecondary
                )
            }
        }
    }
}
