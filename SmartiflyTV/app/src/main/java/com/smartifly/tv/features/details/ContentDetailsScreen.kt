package com.smartifly.tv.features.details

import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.tv.foundation.lazy.list.TvLazyColumn
import androidx.tv.foundation.lazy.list.TvLazyRow
import androidx.tv.foundation.lazy.list.items
import androidx.tv.material3.Button
import androidx.tv.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.Text
import coil.compose.AsyncImage
import com.smartifly.tv.data.repository.WatchlistRepository
import com.smartifly.tv.ui.components.content.PosterCard
import com.smartifly.tv.ui.theme.Dimensions
import com.smartifly.tv.ui.theme.PrimaryRed
import com.smartifly.tv.ui.theme.SmartiflyTheme
import com.smartifly.tv.ui.theme.TextPrimary
import com.smartifly.tv.ui.theme.TextSecondary
import kotlinx.coroutines.launch
import kotlinx.coroutines.delay
import com.smartifly.tv.ui.components.base.PreviewPlayer
import com.smartifly.tv.data.image.ImageFailureMemory
import com.smartifly.tv.data.image.ImagePolicyEngine
import com.smartifly.tv.data.image.ImageQualityMonitor

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun ContentDetailsScreen(
    contentId: String,
    contentType: String,
    categoryId: String? = null,
    profileId: String,
    repository: com.smartifly.tv.data.repository.XtreamRepository,
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
    details: com.smartifly.tv.data.models.ContentDetails,
    similarContent: List<com.smartifly.tv.data.models.MovieMetadata>,
    enrichedMetadata: Map<String, Any>?,
    profileId: String,
    isInWatchlist: Boolean,
    onPlayClick: (String) -> Unit,
    onWatchlistToggle: () -> Unit,
    @Suppress("UNUSED_PARAMETER") onBack: () -> Unit
) {
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

    Box(modifier = Modifier.fillMaxSize()) {
        AsyncImage(
            model = resolvedBackdrop,
            contentDescription = null,
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop,
            onError = {
                if (resolvedBackdrop.isNotBlank()) {
                    ImageFailureMemory.markBad(resolvedBackdrop)
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

        Box(modifier = Modifier.fillMaxSize().background(Brush.verticalGradient(colors = listOf(Color.Transparent, Color.Black.copy(alpha = 0.8f), Color.Black))))

        TvLazyColumn(modifier = Modifier.fillMaxSize(), contentPadding = PaddingValues(Dimensions.PaddingExtraLarge)) {
            item {
                Row(modifier = Modifier.fillMaxWidth()) {
                    AsyncImage(
                        model = resolvedPoster,
                        contentDescription = null,
                        modifier = Modifier.size(240.dp, 360.dp),
                        contentScale = ContentScale.Crop,
                        onError = {
                            if (resolvedPoster.isNotBlank()) {
                                ImageFailureMemory.markBad(resolvedPoster)
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
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            // Age Rating Badge
                            Box(
                                modifier = Modifier
                                    .background(Color.White.copy(alpha = 0.2f), shape = androidx.compose.foundation.shape.RoundedCornerShape(4.dp))
                                    .padding(horizontal = 8.dp, vertical = 2.dp)
                            ) {
                                Text(text = ageRating, style = MaterialTheme.typography.labelSmall, color = TextPrimary, fontWeight = FontWeight.Bold)
                            }
                            Spacer(modifier = Modifier.width(16.dp))
                            Text(text = details.releaseDate, color = TextSecondary)
                            Spacer(modifier = Modifier.width(16.dp))
                            Text(text = details.rating, color = TextSecondary)
                            Spacer(modifier = Modifier.width(16.dp))
                            Text(text = details.duration, color = TextSecondary)
                        }
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(text = tmdbOverview, style = MaterialTheme.typography.bodyLarge, color = TextSecondary, maxLines = 6)
                        Spacer(modifier = Modifier.height(32.dp))
                        Row {
                            Button(onClick = { onPlayClick(details.id) }, colors = ButtonDefaults.colors(containerColor = PrimaryRed)) {
                                Text("Play")
                            }
                            Spacer(modifier = Modifier.width(16.dp))
                            Button(
                                onClick = onWatchlistToggle,
                                colors = ButtonDefaults.colors(containerColor = if (isInWatchlist) PrimaryRed.copy(alpha = 0.3f) else Color.White.copy(alpha = 0.1f))
                            ) {
                                Text(if (isInWatchlist) "✓ In Watchlist" else "➕ Add to Watchlist")
                            }
                        }
                    }
                }
            }
            item { CastRow(castString = details.cast) }
            item { SimilarTitlesRow(titles = similarContent) }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun CastRow(castString: String) {
    if (castString.isEmpty()) return
    val cast = castString.split(",").map { it.trim() }
    
    Column(modifier = Modifier.padding(top = 32.dp)) {
        Text(text = "Cast", style = MaterialTheme.typography.headlineSmall, color = TextPrimary)
        Spacer(modifier = Modifier.height(16.dp))
        TvLazyRow {
            items(cast) { name ->
                Column(modifier = Modifier.padding(end = 16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Box(modifier = Modifier.size(80.dp).background(Color.Gray.copy(alpha = 0.2f), shape = androidx.compose.foundation.shape.CircleShape), contentAlignment = Alignment.Center) {
                        Text(text = name.take(1), style = MaterialTheme.typography.titleLarge, color = TextPrimary)
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(text = name, style = MaterialTheme.typography.labelMedium, color = TextPrimary, maxLines = 1)
                }
            }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun SimilarTitlesRow(titles: List<com.smartifly.tv.data.models.MovieMetadata>) {
    if (titles.isEmpty()) return
    
    Column(modifier = Modifier.padding(top = 32.dp)) {
        Text(text = "Similar Titles", style = MaterialTheme.typography.headlineSmall, color = TextPrimary)
        Spacer(modifier = Modifier.height(16.dp))
        TvLazyRow {
            items(titles) { title ->
                PosterCard(movie = title, onFocus = { }, onClick = { })
            }
        }
    }
}
