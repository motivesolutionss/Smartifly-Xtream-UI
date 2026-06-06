package com.smartifly.tv.features.details

import android.util.Log
import androidx.activity.compose.BackHandler
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.DisposableEffect
import androidx.compose.ui.viewinterop.AndroidView
import androidx.tv.foundation.PivotOffsets
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.Spring
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.withStyle
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.foundation.lazy.list.TvLazyColumn
import androidx.tv.foundation.lazy.list.TvLazyRow
import androidx.tv.foundation.lazy.list.items
import androidx.tv.foundation.lazy.list.TvLazyListState
import androidx.tv.foundation.lazy.list.rememberTvLazyListState
import androidx.tv.material3.Button
import androidx.tv.material3.ButtonDefaults
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.Text
import coil.compose.AsyncImage
import com.smartifly.tv.data.image.ImageErrorClassifier
import com.smartifly.tv.data.image.ImageFailureMemory
import com.smartifly.tv.data.image.ImagePolicyEngine
import com.smartifly.tv.data.image.ImageQualityMonitor
import com.smartifly.tv.data.models.ContentDetails
import com.smartifly.tv.data.models.MovieMetadata
import com.smartifly.tv.data.repository.WatchlistRepository
import com.smartifly.tv.ui.components.base.DotSeparator
import com.smartifly.tv.ui.components.base.PreviewPlayer
import com.smartifly.tv.ui.components.content.PosterCard
import com.smartifly.tv.ui.theme.Dimensions
import com.smartifly.tv.ui.theme.PrimaryRed
import com.smartifly.tv.ui.theme.SmartiflyIcons
import com.smartifly.tv.ui.theme.SmartiflyTheme
import com.smartifly.tv.ui.theme.TextPrimary
import com.smartifly.tv.ui.theme.TextSecondary
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.util.Locale

private const val TRAILER_DETAILS_TAG = "SmartiflyTrailer"

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun ContentDetailsScreen(
    contentId: String,
    contentType: String,
    categoryId: String? = null,
    profileId: String,
    repository: com.smartifly.tv.data.repository.XtreamRepository,
    onMovieClick: (MovieMetadata) -> Unit,
    onPlayClick: (String) -> Unit,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val cloudRepository = remember { com.smartifly.tv.data.cloud.CloudWatchlistRepository() }
    val watchlistRepository = remember { WatchlistRepository(context, cloudRepository) }
    val scope = rememberCoroutineScope()
    
    val viewModel = remember(contentId) { 
        ContentDetailsViewModel(repository, contentId, contentType, categoryId = categoryId)
    }
    val uiState by viewModel.uiState.collectAsState()

    val isInWatchlist by watchlistRepository.isInWatchlist(profileId, contentId).collectAsState(initial = false)

    SmartiflyTheme {
        Box(modifier = Modifier.fillMaxSize().background(Color.Black)) {
            when (val state = uiState) {
                is ContentDetailsUiState.Loading -> {
                    Box(modifier = Modifier.fillMaxSize()) {
                        com.smartifly.tv.ui.components.base.ShimmerHeroBanner()
                        
                        Column(
                            modifier = Modifier
                                .align(Alignment.BottomStart)
                                .padding(Dimensions.PaddingExtraLarge)
                        ) {
                            com.smartifly.tv.ui.components.base.ShimmerText(300.dp, 40.dp)
                            Spacer(modifier = Modifier.height(16.dp))
                            Row {
                                repeat(3) { 
                                    com.smartifly.tv.ui.components.base.ShimmerBadge()
                                    Spacer(modifier = Modifier.width(8.dp))
                                }
                            }
                            Spacer(modifier = Modifier.height(24.dp))
                            com.smartifly.tv.ui.components.base.ShimmerText(600.dp, 100.dp)
                        }
                    }
                }
                is ContentDetailsUiState.Success -> {
                    LaunchedEffect(contentId) {
                        com.smartifly.tv.analytics.TelemetryManager.trackEvent("content_view", mapOf("content_id" to contentId, "title" to state.details.title))
                    }
                    ContentDetailsContent(
                        details = state.details,
                        similarContent = state.similarContent,
                        enrichedMetadata = state.enrichedMetadata,
                        profileId = profileId,
                        isInWatchlist = isInWatchlist,
                        onPlayClick = onPlayClick,
                        onWatchlistToggle = {
                            com.smartifly.tv.analytics.TelemetryManager.trackEvent(
                                if (isInWatchlist) "watchlist_remove" else "watchlist_add",
                                mapOf("content_id" to contentId, "title" to state.details.title)
                            )
                            scope.launch {
                                if (isInWatchlist) {
                                    watchlistRepository.removeFromWatchlist(profileId, contentId)
                                } else {
                                    watchlistRepository.addToWatchlist(profileId, state.details.toMovieMetadata())
                                }
                            }
                        },
                        onMovieClick = onMovieClick,
                        onBack = onBack
                    )
                }
                is ContentDetailsUiState.Error -> {
                    Text(text = "Error: ${state.message}", color = Color.Red, modifier = Modifier.align(Alignment.Center))
                }
            }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun ContentDetailsContent(
    details: ContentDetails,
    similarContent: List<MovieMetadata>,
    enrichedMetadata: Map<String, Any>?,
    profileId: String,
    isInWatchlist: Boolean,
    onPlayClick: (String) -> Unit,
    onWatchlistToggle: () -> Unit,
    onMovieClick: (MovieMetadata) -> Unit,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    var activeTrailerVideoId by remember { mutableStateOf<String?>(null) }
    val ageRating = enrichedMetadata?.get("ageRating") as? String ?: "NR"
    val tmdbOverview = enrichedMetadata?.get("overview") as? String ?: details.description
    val trailerUrl = enrichedMetadata?.get("trailerUrl") as? String
    
    var showPreview by remember { mutableStateOf(false) }
    val resolvedBackdrop = remember(details.backdropUrl, details.posterUrl) {
        ImagePolicyEngine.resolveFirstUsable(details.backdropUrl, details.posterUrl) ?: details.backdropUrl
    }
    val resolvedPoster = remember(details.posterUrl, details.backdropUrl) {
        ImagePolicyEngine.resolveFirstUsable(details.posterUrl, details.backdropUrl) ?: details.posterUrl
    }

    LaunchedEffect(trailerUrl) {
        if (!trailerUrl.isNullOrEmpty()) {
            delay(2500) // Delay for cinematic impact
            showPreview = true
        }
    }

    val lazyListState = rememberTvLazyListState()
    val scope = rememberCoroutineScope()
    var isDetailsFocused by remember { mutableStateOf(true) }
    val pivotFraction by remember {
        derivedStateOf {
            if (isDetailsFocused) 0.95f else 0.35f
        }
    }

    LaunchedEffect(isDetailsFocused) {
        if (isDetailsFocused) {
            scope.launch {
                if (lazyListState.firstVisibleItemIndex > 0 ||
                    lazyListState.firstVisibleItemScrollOffset > 0
                ) {
                    lazyListState.animateScrollToItem(0)
                }
            }
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        AsyncImage(
            model = resolvedBackdrop,
            contentDescription = null,
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop,
            onError = {
                if (resolvedBackdrop.isNotBlank()) {
                    val classification = ImageErrorClassifier.classify(it.result.throwable)
                    val ttl = classification.temporaryTtlMs
                    if (ttl != null) {
                        ImageFailureMemory.markTemporarilyBad(resolvedBackdrop, ttl)
                    } else {
                        ImageFailureMemory.markBad(resolvedBackdrop)
                    }
                    ImageQualityMonitor.recordFailure(
                        url = resolvedBackdrop,
                        context = ImageQualityMonitor.Context.DETAILS,
                        profileId = profileId,
                        contentType = details.type,
                        contentId = details.id
                    )
                }
            },
            onSuccess = {
                if (resolvedBackdrop.isNotBlank()) {
                    ImageFailureMemory.markHostSuccess(resolvedBackdrop)
                    ImageQualityMonitor.recordSuccess(
                        url = resolvedBackdrop,
                        context = ImageQualityMonitor.Context.DETAILS,
                        profileId = profileId,
                        contentType = details.type,
                        contentId = details.id
                    )
                }
            }
        )

        if (showPreview && !trailerUrl.isNullOrEmpty()) {
            PreviewPlayer(videoUrl = trailerUrl)
        }

        // Horizontal cinematic overlay (left 60% dark) for text visibility
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.horizontalGradient(
                        colorStops = arrayOf(
                            0.0f to Color.Black,
                            0.30f to Color.Black,
                            0.45f to Color.Black.copy(alpha = 0.90f),
                            0.65f to Color.Black.copy(alpha = 0.25f),
                            0.85f to Color.Transparent
                        )
                    )
                )
        )
        // Vertical cinematic overlay (bottom 40% dark) to blend into scroll area
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colorStops = arrayOf(
                            0.0f to Color.Transparent,
                            0.50f to Color.Transparent,
                            0.70f to Color.Black.copy(alpha = 0.50f),
                            1.0f to Color.Black
                        )
                    )
                )
        )

        TvLazyColumn(
            state = lazyListState,
            pivotOffsets = PivotOffsets(parentFraction = pivotFraction),
            modifier = Modifier
                .padding(start = Dimensions.ContentGutter)
                .fillMaxSize(),
            contentPadding = PaddingValues(
                top = Dimensions.PaddingExtraLarge,
                bottom = Dimensions.PaddingExtraLarge,
                end = Dimensions.PaddingExtraLarge
            )
        ) {
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .onFocusChanged { state ->
                            if (state.hasFocus) {
                                isDetailsFocused = true
                            }
                        }
                ) {
                    AsyncImage(
                        model = resolvedPoster,
                        contentDescription = null,
                        modifier = Modifier
                            .size(200.dp, 300.dp)
                            .clip(RoundedCornerShape(16.dp))
                            .border(
                                width = 1.dp,
                                color = Color.White.copy(alpha = 0.12f),
                                shape = RoundedCornerShape(16.dp)
                            )
                            .background(Color.White.copy(alpha = 0.04f)),
                        contentScale = ContentScale.Crop,
                        onError = {
                            if (resolvedPoster.isNotBlank()) {
                                val classification = ImageErrorClassifier.classify(it.result.throwable)
                                val ttl = classification.temporaryTtlMs
                                if (ttl != null) {
                                    ImageFailureMemory.markTemporarilyBad(resolvedPoster, ttl)
                                } else {
                                    ImageFailureMemory.markBad(resolvedPoster)
                                }
                                ImageQualityMonitor.recordFailure(
                                    url = resolvedPoster,
                                    context = ImageQualityMonitor.Context.DETAILS,
                                    profileId = profileId,
                                    contentType = details.type,
                                    contentId = details.id
                                )
                            }
                        },
                        onSuccess = {
                            if (resolvedPoster.isNotBlank()) {
                                ImageFailureMemory.markHostSuccess(resolvedPoster)
                                ImageQualityMonitor.recordSuccess(
                                    url = resolvedPoster,
                                    context = ImageQualityMonitor.Context.DETAILS,
                                    profileId = profileId,
                                    contentType = details.type,
                                    contentId = details.id
                                )
                            }
                        }
                    )
                    Spacer(modifier = Modifier.width(Dimensions.PaddingExtraLarge))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(text = details.title, style = MaterialTheme.typography.displayMedium, color = TextPrimary, fontWeight = FontWeight.Bold)
                        
                        // Metadata row
                        val releaseYear = remember(details.releaseDate) {
                            val raw = details.releaseDate.trim()
                            if (raw.length >= 4 && raw.take(4).all { it.isDigit() }) {
                                raw.take(4)
                            } else {
                                raw
                            }
                        }
                        
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.padding(vertical = 8.dp)
                        ) {
                            // Age Rating Badge
                            if (ageRating.isNotBlank()) {
                                Box(
                                    modifier = Modifier
                                        .background(Color.White.copy(alpha = 0.2f), shape = RoundedCornerShape(4.dp))
                                        .padding(horizontal = 8.dp, vertical = 2.dp)
                                ) {
                                    Text(text = ageRating, style = MaterialTheme.typography.labelSmall, color = TextPrimary, fontWeight = FontWeight.Bold)
                                }
                                DotSeparator()
                            }
                            
                            // Release Year
                            if (releaseYear.isNotBlank()) {
                                Text(text = releaseYear, color = TextSecondary, style = MaterialTheme.typography.bodyMedium)
                                DotSeparator()
                            }
                            
                            // IMDb Rating Badge
                            val ratingValue = details.rating.trim()
                            if (ratingValue.isNotBlank() && ratingValue != "0.0" && ratingValue != "0") {
                                Box(
                                    modifier = Modifier
                                        .background(Color(0xFFF5C518), RoundedCornerShape(4.dp))
                                        .padding(horizontal = 6.dp, vertical = 2.dp)
                                ) {
                                    Text(
                                        text = "IMDb $ratingValue",
                                        color = Color.Black,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Black
                                    )
                                }
                                DotSeparator()
                            }
                            
                            // Duration
                            if (details.duration.isNotBlank()) {
                                Text(text = details.duration, color = TextSecondary, style = MaterialTheme.typography.bodyMedium)
                            }
                        }
                        
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(text = tmdbOverview, style = MaterialTheme.typography.bodyMedium.copy(fontSize = 13.sp, lineHeight = 18.sp), color = TextSecondary, maxLines = 6)
                        
                        if (details.cast.isNotBlank()) {
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                text = buildAnnotatedString {
                                    withStyle(style = SpanStyle(color = TextSecondary, fontWeight = FontWeight.Normal)) {
                                        append("Starring: ")
                                    }
                                    withStyle(style = SpanStyle(color = TextPrimary, fontWeight = FontWeight.Bold)) {
                                        append(details.cast)
                                    }
                                },
                                style = MaterialTheme.typography.bodyMedium
                            )
                        }
                        Spacer(modifier = Modifier.height(32.dp))
                        
                        // Action buttons
                        val playInteractionSource = remember { MutableInteractionSource() }
                        val isPlayFocused by playInteractionSource.collectIsFocusedAsState()
                        val playScale by animateFloatAsState(
                            targetValue = if (isPlayFocused) 1.05f else 1.0f,
                            animationSpec = spring(
                                dampingRatio = Spring.DampingRatioNoBouncy,
                                stiffness = Spring.StiffnessMedium
                            ),
                            label = "playScale"
                        )
                        
                        val watchlistInteractionSource = remember { MutableInteractionSource() }
                        val isWatchlistFocused by watchlistInteractionSource.collectIsFocusedAsState()
                        val watchlistScale by animateFloatAsState(
                            targetValue = if (isWatchlistFocused) 1.05f else 1.0f,
                            animationSpec = spring(
                                dampingRatio = Spring.DampingRatioNoBouncy,
                                stiffness = Spring.StiffnessMedium
                            ),
                            label = "watchlistScale"
                        )
                        
                        val trailerInteractionSource = remember { MutableInteractionSource() }
                        val isTrailerFocused by trailerInteractionSource.collectIsFocusedAsState()
                        val trailerScale by animateFloatAsState(
                            targetValue = if (isTrailerFocused) 1.05f else 1.0f,
                            animationSpec = spring(
                                dampingRatio = Spring.DampingRatioNoBouncy,
                                stiffness = Spring.StiffnessMedium
                            ),
                            label = "trailerScale"
                        )
                        
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Button(
                                onClick = { onPlayClick(details.id) },
                                interactionSource = playInteractionSource,
                                colors = ButtonDefaults.colors(
                                    containerColor = PrimaryRed,
                                    focusedContainerColor = Color.White,
                                    focusedContentColor = Color.Black,
                                    contentColor = Color.White
                                ),
                                shape = ButtonDefaults.shape(RoundedCornerShape(12.dp)),
                                scale = ButtonDefaults.scale(focusedScale = 1.0f),
                                modifier = Modifier
                                    .graphicsLayer {
                                        scaleX = playScale
                                        scaleY = playScale
                                    }
                                    .height(46.dp)
                            ) {
                                androidx.tv.material3.Icon(
                                    imageVector = SmartiflyIcons.Play,
                                    contentDescription = null,
                                    modifier = Modifier.size(20.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Play", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold)
                            }
                            Spacer(modifier = Modifier.width(16.dp))
                            Button(
                                onClick = onWatchlistToggle,
                                interactionSource = watchlistInteractionSource,
                                colors = ButtonDefaults.colors(
                                    containerColor = if (isInWatchlist) PrimaryRed.copy(alpha = 0.2f) else Color.White.copy(alpha = 0.08f),
                                    focusedContainerColor = Color.White,
                                    focusedContentColor = Color.Black,
                                    contentColor = Color.White
                                ),
                                border = ButtonDefaults.border(
                                    border = androidx.tv.material3.Border(
                                        border = androidx.compose.foundation.BorderStroke(
                                            width = 1.dp,
                                            color = Color.White.copy(alpha = if (isWatchlistFocused) 0f else 0.15f)
                                        ),
                                        shape = RoundedCornerShape(12.dp)
                                    )
                                ),
                                shape = ButtonDefaults.shape(RoundedCornerShape(12.dp)),
                                scale = ButtonDefaults.scale(focusedScale = 1.0f),
                                modifier = Modifier
                                    .graphicsLayer {
                                        scaleX = watchlistScale
                                        scaleY = watchlistScale
                                    }
                                    .height(46.dp)
                            ) {
                                androidx.tv.material3.Icon(
                                    imageVector = if (isInWatchlist) SmartiflyIcons.Check else SmartiflyIcons.Add,
                                    contentDescription = null,
                                    modifier = Modifier.size(20.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = if (isInWatchlist) "In Watchlist" else "Add to Watchlist",
                                    style = MaterialTheme.typography.labelLarge,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                            
                            val trailerUrl = details.youtubeTrailer
                            if (!trailerUrl.isNullOrBlank()) {
                                Spacer(modifier = Modifier.width(16.dp))
                                Button(
                                    onClick = {
                                        activeTrailerVideoId = extractYoutubeVideoId(trailerUrl)
                                    },
                                    interactionSource = trailerInteractionSource,
                                    colors = ButtonDefaults.colors(
                                        containerColor = Color.White.copy(alpha = 0.08f),
                                        focusedContainerColor = Color.White,
                                        focusedContentColor = Color.Black,
                                        contentColor = Color.White
                                    ),
                                    border = ButtonDefaults.border(
                                        border = androidx.tv.material3.Border(
                                            border = androidx.compose.foundation.BorderStroke(
                                                width = 1.dp,
                                                color = Color.White.copy(alpha = if (isTrailerFocused) 0f else 0.15f)
                                            ),
                                            shape = RoundedCornerShape(12.dp)
                                        )
                                    ),
                                    shape = ButtonDefaults.shape(RoundedCornerShape(12.dp)),
                                    scale = ButtonDefaults.scale(focusedScale = 1.0f),
                                    modifier = Modifier
                                        .graphicsLayer {
                                            scaleX = trailerScale
                                            scaleY = trailerScale
                                        }
                                        .height(46.dp)
                                ) {
                                    androidx.tv.material3.Icon(
                                        imageVector = SmartiflyIcons.Trailer,
                                        contentDescription = null,
                                        modifier = Modifier.size(20.dp)
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        text = "Trailer",
                                        style = MaterialTheme.typography.labelLarge,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                }
                            }
                        }
                    }
                }
            }
            item { 
                SimilarTitlesRow(
                    titles = similarContent, 
                    onMovieClick = onMovieClick,
                    onFocused = { isDetailsFocused = false }
                ) 
            }
        }

        activeTrailerVideoId?.let { videoId ->
            FullscreenYoutubePlayer(
                videoId = videoId,
                onDismiss = { activeTrailerVideoId = null }
            )
        }
    }
}

private fun formatYoutubeUrl(trailer: String): String {
    return if (trailer.contains("://") || trailer.contains("www.") || trailer.contains("youtu.be")) {
        trailer
    } else {
        "https://www.youtube.com/watch?v=$trailer"
    }
}

private fun extractYoutubeVideoId(url: String): String {
    val trimmed = url.trim()
    if (!trimmed.contains("/")) return trimmed
    
    if (trimmed.contains("youtu.be/")) {
        return trimmed.substringAfter("youtu.be/").substringBefore("?").substringBefore("&")
    }
    
    if (trimmed.contains("v=")) {
        return trimmed.substringAfter("v=").substringBefore("&").substringBefore("?")
    }
    
    if (trimmed.contains("embed/")) {
        return trimmed.substringAfter("embed/").substringBefore("?").substringBefore("&")
    }
    
    if (trimmed.contains("/v/")) {
        return trimmed.substringAfter("/v/").substringBefore("?").substringBefore("&")
    }
    
    return trimmed.substringAfterLast("/").substringBefore("?")
}

@Composable
fun FullscreenYoutubePlayer(
    videoId: String,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier
) {
    var webViewRef by remember { mutableStateOf<android.webkit.WebView?>(null) }
    
    BackHandler(onBack = onDismiss)
    
    DisposableEffect(Unit) {
        onDispose {
            webViewRef?.apply {
                stopLoading()
                loadUrl("about:blank")
                destroy()
            }
        }
    }
    
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color.Black)
    ) {
        AndroidView(
            factory = { ctx ->
                android.webkit.WebView(ctx).apply {
                    layoutParams = android.view.ViewGroup.LayoutParams(
                        android.view.ViewGroup.LayoutParams.MATCH_PARENT,
                        android.view.ViewGroup.LayoutParams.MATCH_PARENT
                    )
                    settings.apply {
                        javaScriptEnabled = true
                        mediaPlaybackRequiresUserGesture = false
                        domStorageEnabled = true
                        useWideViewPort = true
                        loadWithOverviewMode = true
                    }
                    webChromeClient = android.webkit.WebChromeClient()
                    webViewClient = android.webkit.WebViewClient()
                    
                    isFocusable = true
                    isFocusableInTouchMode = true
                    requestFocus()
                    
                    val embedHtml = """
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <style>
                                html, body {
                                    margin: 0;
                                    padding: 0;
                                    width: 100%;
                                    height: 100%;
                                    background-color: #000000;
                                    overflow: hidden;
                                }
                                iframe {
                                    width: 100%;
                                    height: 100%;
                                    border: none;
                                }
                            </style>
                        </head>
                        <body>
                            <iframe 
                                src="https://www.youtube.com/embed/$videoId?autoplay=1&controls=1&rel=0&showinfo=0&modestbranding=1&iv_load_policy=3" 
                                allow="autoplay; encrypted-media" 
                                allowfullscreen>
                            </iframe>
                        </body>
                        </html>
                    """.trimIndent()
                    
                    loadDataWithBaseURL("https://www.youtube.com", embedHtml, "text/html", "utf-8", null)
                    webViewRef = this
                }
            },
            modifier = Modifier.fillMaxSize()
        )
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun SimilarTitlesRow(
    titles: List<MovieMetadata>,
    onMovieClick: (MovieMetadata) -> Unit,
    onFocused: () -> Unit
) {
    if (titles.isEmpty()) return
    
    Column(
        modifier = Modifier
            .padding(top = 32.dp)
            .onFocusChanged { state ->
                if (state.hasFocus) {
                    onFocused()
                }
            }
    ) {
        Text(
            text = "Similar Titles",
            style = MaterialTheme.typography.headlineSmall,
            color = TextPrimary,
            fontWeight = FontWeight.Bold
        )
        Spacer(modifier = Modifier.height(16.dp))
        TvLazyRow(
            contentPadding = PaddingValues(horizontal = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(Dimensions.CardSpacing)
        ) {
            items(titles) { title ->
                PosterCard(
                    movie = title,
                    onFocus = { },
                    onClick = { onMovieClick(title) }
                )
            }
        }
    }
}
