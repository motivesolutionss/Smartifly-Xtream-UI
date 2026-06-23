package com.smartifly.tv.ui.components.content

import androidx.compose.animation.Crossfade
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.blur
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusProperties
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.Button
import androidx.tv.material3.ButtonDefaults
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.Text
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.smartifly.tv.data.image.ImageErrorClassifier
import com.smartifly.tv.data.image.ImageFailureMemory
import com.smartifly.tv.data.image.ImagePolicyEngine
import com.smartifly.tv.data.image.ImageQualityMonitor
import com.smartifly.tv.data.models.MovieMetadata
import com.smartifly.tv.BuildConfig
import com.smartifly.tv.performance.PerformanceKpiMonitor
import com.smartifly.tv.performance.lowend.DeviceTier
import com.smartifly.tv.performance.lowend.LocalPerformanceConfig
import com.smartifly.tv.ui.components.base.Badge
import com.smartifly.tv.ui.components.base.DotSeparator
import com.smartifly.tv.ui.theme.Dimensions
import com.smartifly.tv.ui.theme.PrimaryRed
import com.smartifly.tv.ui.theme.SmartiflyIcons
import androidx.compose.ui.res.painterResource
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.wrapContentWidth
import com.smartifly.tv.R
import java.util.Calendar
import java.util.Locale

private val HeroContainerShape = RoundedCornerShape(28.dp)

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun HeroBanner(
    movie: MovieMetadata?,
    currentIndex: Int = 0,
    totalCount: Int = 1,
    onNextHero: () -> Unit = {},
    onPrevHero: () -> Unit = {},
    onPlayClick: (MovieMetadata) -> Unit,
    onMoreInfoClick: (MovieMetadata) -> Unit,
    onPrimaryActionsFocusChanged: (Boolean) -> Unit = {},
    onPlayFocused: () -> Unit = {},
    playFocusRequester: FocusRequester = FocusRequester.Default,
    moreInfoFocusRequester: FocusRequester = FocusRequester.Default,
    firstRailFocusRequester: FocusRequester = FocusRequester.Default,
    navBarFocusRequester: FocusRequester? = null,
    onSearchClick: () -> Unit = {},
    onSettingsClick: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    val config = LocalPerformanceConfig.current

    // Premium Ken Burns pan-and-zoom motion engine (optimized by device tier)
    val breathing = rememberInfiniteTransition(label = "heroBreathing")
    val zoomScale by if (config.tier == DeviceTier.HIGH) {
        breathing.animateFloat(
            initialValue = 1.0f,
            targetValue = 1.07f,
            animationSpec = infiniteRepeatable(
                animation = tween(20_000, easing = LinearEasing),
                repeatMode = RepeatMode.Reverse
            ),
            label = "heroZoomScale"
        )
    } else {
        remember { mutableStateOf(1.0f) }
    }

    val panX by if (config.tier == DeviceTier.HIGH) {
        breathing.animateFloat(
            initialValue = -12f,
            targetValue = 12f,
            animationSpec = infiniteRepeatable(
                animation = tween(24_000, easing = LinearEasing),
                repeatMode = RepeatMode.Reverse
            ),
            label = "heroPanX"
        )
    } else {
        remember { mutableStateOf(0f) }
    }

    val panY by if (config.tier == DeviceTier.HIGH) {
        breathing.animateFloat(
            initialValue = -6f,
            targetValue = 6f,
            animationSpec = infiniteRepeatable(
                animation = tween(28_000, easing = LinearEasing),
                repeatMode = RepeatMode.Reverse
            ),
            label = "heroPanY"
        )
    } else {
        remember { mutableStateOf(0f) }
    }

    val resolvedBackdrop = remember(movie?.backdropUrl, movie?.posterUrl) {
        ImagePolicyEngine.resolveFirstUsable(
            movie?.backdropUrl?.takeIf { it.isNotBlank() },
            movie?.posterUrl?.takeIf { it.isNotBlank() }
        )
    }
    val placeholderBackdrop = remember(movie?.posterUrl, movie?.backdropUrl, resolvedBackdrop) {
        ImagePolicyEngine.resolveFirstUsable(
            movie?.posterUrl?.takeIf { it.isNotBlank() },
            movie?.backdropUrl?.takeIf { it.isNotBlank() }
        )
    }
    val heroImageLoadStartedAt = remember(resolvedBackdrop) { System.currentTimeMillis() }
    val playInteractionSource = remember { MutableInteractionSource() }
    val infoInteractionSource = remember { MutableInteractionSource() }
    val isPlayFocused by playInteractionSource.collectIsFocusedAsState()
    val isInfoFocused by infoInteractionSource.collectIsFocusedAsState()

    LaunchedEffect(isPlayFocused, isInfoFocused) {
        onPrimaryActionsFocusChanged(isPlayFocused || isInfoFocused)
    }

    HeroContainer(modifier = modifier) {
        HeroBackdrop(
            resolvedBackdrop = resolvedBackdrop,
            placeholderBackdrop = placeholderBackdrop,
            zoomScale = zoomScale,
            panX = panX,
            panY = panY,
            movie = movie,
            imageLoadStartedAt = heroImageLoadStartedAt
        )
        HeroOverlays()
        movie?.let { data ->
            HeroContent(
                data = data,
                currentIndex = currentIndex,
                totalCount = totalCount,
                onNextHero = {
                    if (totalCount > 1) onNextHero()
                },
                onPrevHero = {
                    if (totalCount > 1) onPrevHero()
                },
                playInteractionSource = playInteractionSource,
                infoInteractionSource = infoInteractionSource,
                playFocusRequester = playFocusRequester,
                moreInfoFocusRequester = moreInfoFocusRequester,
                firstRailFocusRequester = firstRailFocusRequester,
                navBarFocusRequester = navBarFocusRequester,
                isPlayFocused = isPlayFocused,
                isInfoFocused = isInfoFocused,
                onPlayFocused = onPlayFocused,
                onPlayClick = onPlayClick,
                onMoreInfoClick = onMoreInfoClick
            )
        }
    }
}

@Composable
private fun HeroContainer(
    modifier: Modifier,
    shape: Shape = HeroContainerShape,
    content: @Composable BoxScope.() -> Unit
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .clip(shape)
            .background(Color(0xFF040405))
            .border(1.dp, Color.White.copy(alpha = 0.08f), shape)
    ) {
        content()
    }
}

@Composable
private fun BoxScope.HeroBackdrop(
    resolvedBackdrop: String?,
    placeholderBackdrop: String?,
    zoomScale: Float,
    panX: Float,
    panY: Float,
    movie: MovieMetadata?,
    imageLoadStartedAt: Long
) {
    val context = LocalContext.current
    var heroReady by remember(resolvedBackdrop) { mutableStateOf(false) }
    val mainRequest = remember(resolvedBackdrop) {
        resolvedBackdrop?.let {
            ImageRequest.Builder(context)
                .data(it)
                .crossfade(false)
                .build()
        }
    }
    val placeholderRequest = remember(placeholderBackdrop) {
        placeholderBackdrop?.let {
            ImageRequest.Builder(context)
                .data(it)
                .crossfade(false)
                .build()
        }
    }
    Crossfade(
        targetState = resolvedBackdrop,
        modifier = Modifier
            .align(Alignment.CenterEnd)
            .fillMaxHeight()
            .fillMaxWidth(0.88f),
        label = "hero_backdrop"
    ) { url ->
        Box(modifier = Modifier.fillMaxSize()) {
            if (placeholderRequest != null && !heroReady) {
                AsyncImage(
                    model = placeholderRequest,
                    contentDescription = null,
                    modifier = Modifier
                        .fillMaxSize()
                        .graphicsLayer {
                            scaleX = (zoomScale * 1.02f)
                            scaleY = (zoomScale * 1.02f)
                            translationX = panX
                            translationY = panY
                            alpha = 0.95f
                        }
                        .blur(18.dp),
                    contentScale = ContentScale.Crop
                )
            }
            AsyncImage(
                model = mainRequest ?: url,
                contentDescription = null,
                modifier = Modifier
                    .fillMaxSize()
                    .graphicsLayer {
                        scaleX = zoomScale
                        scaleY = zoomScale
                        translationX = panX
                        translationY = panY
                    },
                contentScale = ContentScale.Crop,
                onError = {
                    heroReady = false
                    if (!url.isNullOrBlank()) {
                        val classification = ImageErrorClassifier.classify(it.result.throwable)
                        classification.temporaryTtlMs?.let { ttl -> ImageFailureMemory.markTemporarilyBad(url, ttl) }
                            ?: ImageFailureMemory.markBad(url)
                        ImageQualityMonitor.recordFailure(
                            url = url,
                            context = ImageQualityMonitor.Context.HOME_HERO,
                            contentType = movie?.type,
                            contentId = movie?.id
                        )
                        PerformanceKpiMonitor.recordImageLoad(
                            context = ImageQualityMonitor.Context.HOME_HERO,
                            durationMs = System.currentTimeMillis() - imageLoadStartedAt,
                            success = false
                        )
                    }
                },
                onSuccess = {
                    heroReady = true
                    if (!url.isNullOrBlank()) {
                        ImageFailureMemory.markHostSuccess(url)
                        ImageQualityMonitor.recordSuccess(
                            url = url,
                            context = ImageQualityMonitor.Context.HOME_HERO,
                            contentType = movie?.type,
                            contentId = movie?.id
                        )
                        PerformanceKpiMonitor.recordImageLoad(
                            context = ImageQualityMonitor.Context.HOME_HERO,
                            durationMs = System.currentTimeMillis() - imageLoadStartedAt,
                            success = true
                        )
                        if (BuildConfig.LIVE_DEBUG_TRACE) {
                            android.util.Log.i(
                                "SmartiflyHomePerf",
                                "home_hero_image_ready content_id=${movie?.id ?: "none"} duration_ms=${System.currentTimeMillis() - imageLoadStartedAt} url_host=${runCatching { java.net.URI(url).host ?: "unknown" }.getOrDefault("unknown")}"
                            )
                        }
                    }
                }
            )
        }
    }
}

@Composable
private fun BoxScope.HeroOverlays() {
    // Premium cinematic vertical gradients (fading edges to blend seamlessly into screen and rails)
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colorStops = arrayOf(
                        0.0f to Color.Black.copy(alpha = 0.40f),
                        0.22f to Color.Transparent,
                        0.60f to Color.Transparent,
                        1.0f to Color(0xFF000000)
                    )
                )
            )
    )
    // Horizontal cinematic mask protecting content visibility
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.horizontalGradient(
                    colorStops = arrayOf(
                        0.0f to Color(0xFF000000),
                        0.30f to Color(0xFF000000),
                        0.48f to Color(0xFF000000).copy(alpha = 0.90f),
                        0.68f to Color(0xFF000000).copy(alpha = 0.25f),
                        0.88f to Color.Transparent
                    )
                )
            )
    )
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun BoxScope.HeroContent(
    data: MovieMetadata,
    currentIndex: Int,
    totalCount: Int,
    onNextHero: () -> Unit,
    onPrevHero: () -> Unit,
    playInteractionSource: MutableInteractionSource,
    infoInteractionSource: MutableInteractionSource,
    playFocusRequester: FocusRequester,
    moreInfoFocusRequester: FocusRequester,
    firstRailFocusRequester: FocusRequester,
    navBarFocusRequester: FocusRequester?,
    isPlayFocused: Boolean,
    isInfoFocused: Boolean,
    onPlayFocused: () -> Unit,
    onPlayClick: (MovieMetadata) -> Unit,
    onMoreInfoClick: (MovieMetadata) -> Unit
) {
    val titleLength = data.title.trim().length
    val descriptionLength = data.description.trim().length
    val genres = data.genre
        .split(",", "/", "|")
        .map { it.trim() }
        .filter { it.isNotBlank() }
    val isDenseHeroContent = titleLength > 38 || descriptionLength > 180 || genres.size > 2
    val isVeryDenseHeroContent = titleLength > 52 || descriptionLength > 260 || genres.size > 3
    val titleFontSize = when {
        isVeryDenseHeroContent -> 32.sp
        isDenseHeroContent -> 35.sp
        else -> 38.sp
    }
    val titleLineHeight = when {
        isVeryDenseHeroContent -> 38.sp
        isDenseHeroContent -> 41.sp
        else -> 44.sp
    }
    val visibleGenres = when {
        isVeryDenseHeroContent -> genres.take(2)
        isDenseHeroContent -> genres.take(3)
        else -> genres
    }
    val theaterBadges = remember(data, isDenseHeroContent, isVeryDenseHeroContent) {
        val resolved = buildHeroTechnicalBadges(data)
        when {
            isVeryDenseHeroContent -> resolved.take(2)
            isDenseHeroContent -> resolved.take(3)
            else -> resolved.take(4)
        }
    }
    val descriptionMaxLines = when {
        isVeryDenseHeroContent -> 2
        isDenseHeroContent -> 3
        else -> 4
    }
    val descriptionBottomGap = if (isDenseHeroContent) 16.dp else 24.dp
    val heroDescription = data.description.trim().ifBlank { "Description unavailable." }

    // Premium Spring focus scale physics (Apple TV+ feel)
    val playScale by animateFloatAsState(
        targetValue = if (isPlayFocused) 1.05f else 1.0f,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioNoBouncy,
            stiffness = Spring.StiffnessMedium
        ),
        label = "playScale"
    )
    val infoScale by animateFloatAsState(
        targetValue = if (isInfoFocused) 1.05f else 1.0f,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioNoBouncy,
            stiffness = Spring.StiffnessMedium
        ),
        label = "infoScale"
    )

    Column(
        modifier = Modifier
            .align(Alignment.TopStart)
            .padding(start = Dimensions.ContentGutter, top = Dimensions.HomeHeroContentTop)
            .width(Dimensions.HomeHeroContentWidth)
    ) {
        Image(
            painter = painterResource(id = R.drawable.smartifly_icon),
            contentDescription = "Smartifly Logo",
            modifier = Modifier
                .height(28.dp)
                .wrapContentWidth()
        )
        Spacer(modifier = Modifier.height(14.dp))

        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Badge(text = primaryHeroBadge(data), containerColor = PrimaryRed)
            Text(
                text = heroTypeLabel(data).uppercase(Locale.ROOT),
                style = MaterialTheme.typography.labelMedium,
                color = PrimaryRed,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.sp
            )
        }
        Spacer(modifier = Modifier.height(10.dp))

        Text(
            text = data.title,
            style = MaterialTheme.typography.headlineLarge.copy(
                fontSize = titleFontSize,
                lineHeight = titleLineHeight,
                fontWeight = FontWeight.Black,
                letterSpacing = (-0.5).sp
            ),
            color = Color.White,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis
        )

        // Date & IMDb Rating Row
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.padding(top = 10.dp, bottom = 4.dp)
        ) {
            if (data.year.isNotBlank()) {
                Text(
                    text = data.year,
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color.White.copy(alpha = 0.75f),
                    fontWeight = FontWeight.SemiBold,
                    letterSpacing = 0.2.sp
                )
            }

            if (data.year.isNotBlank() && data.rating.isNotBlank() && data.rating != "0.0") {
                Box(
                    modifier = Modifier
                        .padding(horizontal = 4.dp)
                        .size(5.dp)
                        .background(Color(0xFF22C55E), RoundedCornerShape(2.5.dp))
                )
            }

            if (data.rating.isNotBlank() && data.rating != "0.0") {
                Box(
                    modifier = Modifier
                        .background(Color(0xFFF5C518), RoundedCornerShape(4.dp))
                        .padding(horizontal = 6.dp, vertical = 2.dp)
                ) {
                    Text(
                        text = "IMDb ${data.rating}",
                        color = Color.Black,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Black,
                        letterSpacing = 0.2.sp
                    )
                }
            }

            if (data.duration.isNotBlank()) {
                Box(
                    modifier = Modifier
                        .padding(horizontal = 4.dp)
                        .size(5.dp)
                        .background(Color(0xFF22C55E), RoundedCornerShape(2.5.dp))
                )
                Text(
                    text = data.duration,
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color.White.copy(alpha = 0.75f),
                    fontWeight = FontWeight.SemiBold,
                    letterSpacing = 0.2.sp
                )
            }
        }

        if (visibleGenres.isNotEmpty()) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.padding(top = 2.dp, bottom = 6.dp)
            ) {
                visibleGenres.forEachIndexed { index, gen ->
                    Text(
                        text = gen,
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color.White.copy(alpha = 0.7f),
                        fontWeight = FontWeight.Medium
                    )
                    if (index < visibleGenres.size - 1) {
                        Text(
                            text = "•",
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color.White.copy(alpha = 0.3f)
                        )
                    }
                }
            }
        }

        // Theater-quality badges
        if (theaterBadges.isNotEmpty()) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                modifier = Modifier.padding(top = 4.dp, bottom = 14.dp)
            ) {
                theaterBadges.forEach { badge ->
                    TheaterBadge(
                        badge,
                        color = when (badge) {
                            "DOLBY VISION" -> Color(0xFFFFD700).copy(alpha = 0.9f)
                            "DOLBY ATMOS" -> Color(0xFFB794F4)
                            else -> Color.White.copy(alpha = 0.72f)
                        }
                    )
                }
            }
        }

        Text(
            text = heroDescription,
            style = MaterialTheme.typography.bodyLarge.copy(
                lineHeight = 22.sp,
                fontSize = 15.sp,
                letterSpacing = 0.1.sp,
                fontWeight = FontWeight.Normal
            ),
            color = Color.White.copy(alpha = 0.7f),
            maxLines = descriptionMaxLines,
            overflow = TextOverflow.Ellipsis
        )

        Spacer(modifier = Modifier.height(descriptionBottomGap))

        Row(horizontalArrangement = Arrangement.spacedBy(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Button(
                onClick = { onPlayClick(data) },
                interactionSource = playInteractionSource,
                colors = ButtonDefaults.colors(
                    containerColor = PrimaryRed,
                    focusedContainerColor = Color.White,
                    focusedContentColor = Color.Black
                ),
                shape = ButtonDefaults.shape(RoundedCornerShape(12.dp)),
                scale = ButtonDefaults.scale(focusedScale = 1f),
                modifier = Modifier
                    .graphicsLayer {
                        scaleX = playScale
                        scaleY = playScale
                    }
                    .focusRequester(playFocusRequester)
                    .dpadVerticalFocus(
                        upFocusRequester = navBarFocusRequester,
                        downFocusRequester = firstRailFocusRequester
                    )
                    .onPreviewKeyEvent { event ->
                        if (event.type == KeyEventType.KeyDown && event.key == Key.DirectionLeft && totalCount > 1) {
                            onPrevHero()
                            true
                        } else false
                    }
                    .onFocusChanged { state -> if (state.isFocused) onPlayFocused() }
                    .testTag("hero_play_button")
                    .height(46.dp)
            ) {
                Icon(SmartiflyIcons.Play, contentDescription = null, modifier = Modifier.size(20.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("Play", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold)
            }

            Button(
                onClick = { onMoreInfoClick(data) },
                interactionSource = infoInteractionSource,
                colors = ButtonDefaults.colors(
                    containerColor = Color.White.copy(alpha = 0.08f),
                    focusedContainerColor = Color.White,
                    focusedContentColor = Color.Black,
                    contentColor = Color.White
                ),
                shape = ButtonDefaults.shape(RoundedCornerShape(12.dp)),
                scale = ButtonDefaults.scale(focusedScale = 1f),
                modifier = Modifier
                    .graphicsLayer {
                        scaleX = infoScale
                        scaleY = infoScale
                    }
                    .focusRequester(moreInfoFocusRequester)
                    .dpadVerticalFocus(
                        upFocusRequester = navBarFocusRequester,
                        downFocusRequester = firstRailFocusRequester
                    )
                    .onPreviewKeyEvent { event ->
                        if (event.type == KeyEventType.KeyDown && event.key == Key.DirectionRight && totalCount > 1) {
                            onNextHero()
                            true
                        } else false
                    }
                    .onFocusChanged { state -> if (state.isFocused) onPlayFocused() }
                    .border(1.dp, Color.White.copy(alpha = if (isInfoFocused) 0f else 0.15f), RoundedCornerShape(12.dp))
                    .testTag("hero_more_info_button")
                    .height(46.dp)
            ) {
                Icon(SmartiflyIcons.Info, contentDescription = null, modifier = Modifier.size(20.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("More Info", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold)
            }
        }
    }

    if (totalCount > 1) {
        Row(
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(end = 48.dp, bottom = 32.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            repeat(totalCount) { index ->
                val isSelected = index == currentIndex
                val width by animateDpAsState(
                    targetValue = if (isSelected) 18.dp else 6.dp,
                    animationSpec = tween(300),
                    label = "dotWidth"
                )
                val alpha by animateFloatAsState(
                    targetValue = if (isSelected) 1f else 0.4f,
                    label = "dotAlpha"
                )
                Box(
                    modifier = Modifier
                        .size(width = width, height = 6.dp)
                        .graphicsLayer { this.alpha = alpha }
                        .background(
                            color = if (isSelected) PrimaryRed else Color.White,
                            shape = RoundedCornerShape(3.dp)
                        )
                )
            }
        }
    }

}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun TheaterBadge(text: String, color: Color = Color.White.copy(alpha = 0.72f)) {
    Box(
        modifier = Modifier
            .border(
                width = 1.dp,
                color = Color.White.copy(alpha = 0.12f),
                shape = RoundedCornerShape(4.dp)
            )
            .background(Color.White.copy(alpha = 0.04f), RoundedCornerShape(4.dp))
            .padding(horizontal = 6.dp, vertical = 2.dp)
    ) {
        Text(
            text = text,
            color = color,
            fontSize = 9.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 0.8.sp
        )
    }
}

private fun heroTypeLabel(movie: MovieMetadata): String {
    return when (movie.type.lowercase(Locale.ROOT)) {
        "series" -> "Series"
        "live" -> "Live"
        else -> "Movie"
    }
}

private fun primaryHeroBadge(movie: MovieMetadata): String {
    movie.badges.firstOrNull { it.isNotBlank() }?.let { return it.uppercase(Locale.ROOT) }
    val rating = movie.rating.toDoubleOrNull()
    val year = movie.year.toIntOrNull()
    val currentYear = Calendar.getInstance().get(Calendar.YEAR)
    return when {
        movie.type.equals("live", ignoreCase = true) -> "LIVE"
        rating != null && rating >= 8.5 -> "TOP RATED"
        year != null && currentYear - year <= 1 -> "NEW"
        else -> "FEATURED"
    }
}

private fun buildHeroTechnicalBadges(movie: MovieMetadata): List<String> {
    val sourceHints = buildString {
        append(movie.qualityLabel)
        append(' ')
        append(movie.badges.joinToString(" "))
        append(' ')
        append(movie.title)
        append(' ')
        append(movie.description)
    }.uppercase(Locale.ROOT)

    val normalizedBadges = movie.badges
        .map { it.trim().uppercase(Locale.ROOT) }
        .filter { it.isNotBlank() }

    val ordered = linkedSetOf<String>()

    if (movie.qualityLabel.isNotBlank()) {
        ordered += movie.qualityLabel.trim().uppercase(Locale.ROOT)
    }
    normalizedBadges.forEach { ordered += it }

    if (sourceHints.contains("4K")) ordered += "4K UHD"
    if (sourceHints.contains("UHD")) ordered += "UHD"
    if (sourceHints.contains("HDR10")) ordered += "HDR10"
    if (sourceHints.contains("HDR")) ordered += "HDR"
    if (sourceHints.contains("DOLBY VISION")) ordered += "DOLBY VISION"
    if (sourceHints.contains("DOLBY ATMOS")) ordered += "DOLBY ATMOS"
    if (sourceHints.contains("ATMOS")) ordered += "ATMOS"
    if (sourceHints.contains("HEVC")) ordered += "HEVC"
    if (sourceHints.contains("H.265")) ordered += "H.265"
    if (sourceHints.contains("FHD") || sourceHints.contains("1080P")) ordered += "1080P"
    if (sourceHints.contains("720P")) ordered += "720P"

    return ordered.takeIf { it.isNotEmpty() }?.toList() ?: defaultHeroTechnicalBadges(movie)
}

private fun defaultHeroTechnicalBadges(movie: MovieMetadata): List<String> {
    return when (movie.type.lowercase(Locale.ROOT)) {
        "live" -> listOf("LIVE")
        "series" -> listOf("HD", "SERIES")
        else -> listOf("HD", "FEATURE")
    }
}

private fun Modifier.dpadVerticalFocus(
    upFocusRequester: FocusRequester?,
    downFocusRequester: FocusRequester?
): Modifier {
    val directionalOverrides = if (upFocusRequester != null || downFocusRequester != null) {
        Modifier
            .focusProperties {
                upFocusRequester?.let { up = it }
                downFocusRequester?.let { down = it }
            }
            .onPreviewKeyEvent { event ->
                if (event.type != KeyEventType.KeyDown) return@onPreviewKeyEvent false
                when (event.key) {
                    Key.DirectionUp -> upFocusRequester?.let { requester ->
                        runCatching { requester.requestFocus() }.isSuccess
                    } ?: false
                    Key.DirectionDown -> downFocusRequester?.let { requester ->
                        runCatching { requester.requestFocus() }.isSuccess
                    } ?: false
                    else -> false
                }
            }
    } else {
        Modifier
    }
    return this.then(directionalOverrides)
}
