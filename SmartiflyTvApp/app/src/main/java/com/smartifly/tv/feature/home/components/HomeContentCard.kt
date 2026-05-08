package com.smartifly.tv.feature.home.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LiveTv
import androidx.compose.material.icons.filled.LocalMovies
import androidx.compose.material.icons.filled.Tv
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusProperties
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalInspectionMode
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.SubcomposeAsyncImage
import coil.compose.SubcomposeAsyncImageContent
import com.smartifly.tv.domain.model.CatalogItem
import com.smartifly.tv.ui.design.TvTokens
import com.smartifly.tv.ui.preview.PreviewFrame
import com.smartifly.tv.ui.preview.previewCatalogItems
import com.smartifly.tv.ui.styling.TvStyles

@Composable
@OptIn(ExperimentalFoundationApi::class)
fun HomeContentCard(
    item: CatalogItem,
    modifier: Modifier = Modifier,
    widthDp: Int = 200,
    heightDp: Int = 120,
    isFavorite: Boolean = false,
    requestInitialFocus: Boolean = false,
    focusRequester: FocusRequester? = null,
    leftFocusRequester: FocusRequester? = null,
    rightFocusRequester: FocusRequester? = null,
    upFocusRequester: FocusRequester? = null,
    downFocusRequester: FocusRequester? = null,
    onClick: () -> Unit,
    onLongClick: () -> Unit,
) {
    var focused by remember { mutableStateOf(false) }
    val internalFocusRequester = remember { FocusRequester() }
    val resolvedFocusRequester = focusRequester ?: internalFocusRequester
    var didRequestFocus by remember { mutableStateOf(false) }
    val isInPreview = LocalInspectionMode.current
    val scale by animateFloatAsState(targetValue = if (focused) TvStyles.Effects.cardFocusScale else 1f, label = "posterScale")

    LaunchedEffect(requestInitialFocus) {
        if (requestInitialFocus && !didRequestFocus && !isInPreview) {
            resolvedFocusRequester.requestFocus()
            didRequestFocus = true
        }
    }

    val isLive = item.type.equals("live", ignoreCase = true)
    val cardRadius = RoundedCornerShape(if (isLive) 12.dp else 8.dp)
    val borderColor = when {
        focused -> TvTokens.Colors.FocusCyan
        isFavorite -> TvTokens.Colors.AccentGold
        else -> TvTokens.Colors.SurfaceBorder
    }
    val qualityBadge = if (isLive) "LIVE" else "HD"
    val ratingLabel = item.rating
        ?.takeIf { !isLive && it > 0.0 }
        ?.let { "%.1f".format(it) }
    val contentAccent = TvStyles.contentTypeColor(item.type)
    val fallbackTitle = remember(item.title) { item.title.take(1).uppercase().ifBlank { "S" } }

    Box(
        modifier = modifier
            .width(widthDp.dp)
            .height(heightDp.dp),
        contentAlignment = Alignment.Center
    ) {
        if (focused) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .scale(1.16f)
                    .background(TvStyles.contentTypeGlow(item.type))
            )
        }

        Box(
            modifier = Modifier
                .fillMaxSize()
                .scale(scale)
                .shadow(
                    elevation = if (focused) 18.dp else 6.dp,
                    shape = cardRadius,
                    ambientColor = if (focused) contentAccent.copy(alpha = 0.35f) else Color.Black.copy(alpha = 0.22f),
                    spotColor = if (focused) contentAccent.copy(alpha = 0.35f) else Color.Black.copy(alpha = 0.22f)
                )
                .clip(cardRadius)
                .border(if (focused) 2.dp else 1.dp, borderColor, cardRadius)
                .background(TvTokens.Colors.CardBackground)
                .focusRequester(resolvedFocusRequester)
                .focusProperties {
                    leftFocusRequester?.let { left = it }
                    rightFocusRequester?.let { right = it }
                    upFocusRequester?.let { up = it }
                    downFocusRequester?.let { down = it }
                }
                .onFocusChanged { focused = it.isFocused }
                .focusable()
                .combinedClickable(
                    interactionSource = remember { MutableInteractionSource() },
                    indication = null,
                    onClick = onClick,
                    onLongClick = onLongClick
                )
        ) {
            CardMedia(
                item = item,
                isLive = isLive,
                fallbackTitle = fallbackTitle,
            )

            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(if (isLive) liveCardOverlay() else posterCardOverlay())
            )
            if (focused) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(
                                    contentAccent.copy(alpha = 0.14f),
                                    Color.Transparent,
                                    Color.Black.copy(alpha = 0.16f)
                                )
                            )
                        )
                )
            }

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 10.dp, vertical = 9.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                if (isFavorite) {
                    Box(
                        modifier = Modifier
                            .background(
                                Brush.horizontalGradient(
                                    colors = listOf(
                                        TvTokens.Colors.AccentGold,
                                        Color(0xFFFFE08A)
                                    )
                                ),
                                RoundedCornerShape(999.dp)
                            )
                            .padding(horizontal = 8.dp, vertical = 3.dp)
                    ) {
                        Text(
                            text = "MY LIST",
                            style = TvTokens.TvType.Badge.copy(fontSize = 8.sp, lineHeight = 9.sp, letterSpacing = 0.7.sp),
                            color = Color.Black,
                            fontWeight = FontWeight.Black
                        )
                    }
                } else {
                    SpacerBadge()
                }

                Box(
                    modifier = Modifier
                        .background(
                            if (isLive) {
                                Brush.horizontalGradient(
                                    colors = listOf(
                                        TvTokens.Colors.Live,
                                        TvTokens.Colors.PrimaryLight
                                    )
                                )
                            } else {
                                Brush.horizontalGradient(
                                    colors = listOf(
                                        Color.Black.copy(alpha = 0.86f),
                                        contentAccent.copy(alpha = 0.35f)
                                    )
                                )
                            },
                            RoundedCornerShape(999.dp)
                        )
                        .border(
                            width = 1.dp,
                            color = if (isLive) Color.Transparent else contentAccent.copy(alpha = 0.32f),
                            shape = RoundedCornerShape(999.dp)
                        )
                        .padding(horizontal = 8.dp, vertical = 3.dp)
                ) {
                    Text(
                        text = qualityBadge,
                        style = TvTokens.TvType.Badge.copy(fontSize = 8.sp, lineHeight = 9.sp, letterSpacing = 0.8.sp),
                        color = Color.White,
                        fontWeight = FontWeight.ExtraBold
                    )
                }
            }

            if (ratingLabel != null) {
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .padding(start = 10.dp, bottom = 38.dp)
                        .background(
                            Brush.horizontalGradient(
                                colors = listOf(
                                    Color.Black.copy(alpha = 0.84f),
                                    TvTokens.Colors.AccentGold.copy(alpha = 0.22f)
                                )
                            ),
                            RoundedCornerShape(999.dp)
                        )
                        .border(1.dp, TvTokens.Colors.AccentGold.copy(alpha = 0.28f), RoundedCornerShape(999.dp))
                        .padding(horizontal = 9.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = "IMDb $ratingLabel",
                        style = TvTokens.TvType.Badge.copy(fontSize = 9.sp, lineHeight = 10.sp),
                        color = TvTokens.Colors.AccentGold,
                        fontWeight = FontWeight.ExtraBold
                    )
                }
            }

            Column(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .fillMaxWidth()
                    .padding(horizontal = 11.dp, vertical = 10.dp),
                verticalArrangement = Arrangement.spacedBy(3.dp)
            ) {
                Text(
                    text = item.title,
                    style = TvTokens.TvType.LabelSmall.copy(
                        fontWeight = FontWeight.Bold, 
                        fontSize = 13.sp, 
                        lineHeight = 15.sp,
                        letterSpacing = 0.2.sp
                    ),
                    color = TvTokens.Colors.TextPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                if (!isLive && item.categoryName.isNotBlank()) {
                    Text(
                        text = item.categoryName,
                        style = TvTokens.TvType.CaptionSmall.copy(fontSize = 10.sp, lineHeight = 11.sp),
                        color = TvTokens.Colors.TextMuted,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        }
    }
}

@Composable
private fun SpacerBadge() {
    Box(modifier = Modifier.size(1.dp))
}

@Composable
private fun CardMedia(
    item: CatalogItem,
    isLive: Boolean,
    fallbackTitle: String,
) {
    if (item.imageUrl.isNotBlank()) {
        SubcomposeAsyncImage(
            model = item.imageUrl,
            contentDescription = item.title,
            contentScale = if (isLive) ContentScale.Fit else ContentScale.Crop,
            modifier = Modifier
                .fillMaxSize(),
            loading = {
                CardFallbackSurface(item = item, isLive = isLive, fallbackTitle = fallbackTitle)
            },
            error = {
                CardFallbackSurface(item = item, isLive = isLive, fallbackTitle = fallbackTitle)
            },
            success = {
                if (isLive) {
                    LiveCardFrame {
                        SubcomposeAsyncImageContent(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(horizontal = 16.dp, vertical = 12.dp)
                        )
                    }
                } else {
                    SubcomposeAsyncImageContent(
                        modifier = Modifier.fillMaxSize()
                    )
                }
            }
        )
    } else {
        CardFallbackSurface(item = item, isLive = isLive, fallbackTitle = fallbackTitle)
    }
}

@Composable
private fun CardFallbackSurface(
    item: CatalogItem,
    isLive: Boolean,
    fallbackTitle: String,
) {
    if (isLive) {
        LiveCardFrame {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 12.dp, vertical = 10.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Icon(
                    imageVector = Icons.Filled.LiveTv,
                    contentDescription = null,
                    tint = TvTokens.Colors.FocusCyan.copy(alpha = 0.86f),
                    modifier = Modifier.size(22.dp)
                )
                Text(
                    text = item.title,
                    style = TvTokens.TvType.LabelSmall.copy(fontWeight = FontWeight.ExtraBold, fontSize = 12.sp, lineHeight = 14.sp),
                    color = TvTokens.Colors.TextPrimary,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    textAlign = TextAlign.Center
                )
            }
        }
        return
    }

    val accent = TvStyles.contentTypeColor(item.type)
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.linearGradient(
                    colors = listOf(
                        Color(0xFF0A1420),
                        accent.copy(alpha = 0.32f),
                        Color(0xFF09111A),
                    )
                )
            )
    ) {
        Box(
            modifier = Modifier
                .align(Alignment.TopStart)
                .offset(x = (-14).dp, y = (-18).dp)
                .size(92.dp)
                .background(
                    Brush.radialGradient(
                        colors = listOf(accent.copy(alpha = 0.42f), Color.Transparent)
                    )
                )
        )
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(14.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Text(
                    text = fallbackTitle,
                    style = TvTokens.TvType.H2.copy(fontSize = 34.sp, lineHeight = 36.sp, fontWeight = FontWeight.Black),
                    color = Color.White.copy(alpha = 0.94f)
                )
                Icon(
                    imageVector = fallbackIconForType(item.type),
                    contentDescription = null,
                    tint = Color.White.copy(alpha = 0.34f),
                    modifier = Modifier.size(18.dp)
                )
            }
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    text = item.title,
                    style = TvTokens.TvType.LabelSmall.copy(fontWeight = FontWeight.Bold, fontSize = 13.sp, lineHeight = 15.sp),
                    color = Color.White,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                if (item.categoryName.isNotBlank()) {
                    Text(
                        text = item.categoryName,
                        style = TvTokens.TvType.CaptionSmall.copy(fontSize = 10.sp, lineHeight = 11.sp),
                        color = Color.White.copy(alpha = 0.7f),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        }
    }
}

@Composable
private fun LiveCardFrame(
    content: @Composable () -> Unit,
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.linearGradient(
                    colors = listOf(
                        Color(0xFF08111A),
                        Color(0xFF0C1824),
                        Color(0xFF09111A)
                    )
                )
            )
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.62f)
                .align(Alignment.Center)
                .padding(horizontal = 14.dp)
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color(0xFFF2F6FB).copy(alpha = 0.96f),
                            Color(0xFFE7EDF5).copy(alpha = 0.92f)
                        )
                    ),
                    RoundedCornerShape(12.dp)
                )
                .border(1.dp, Color.White.copy(alpha = 0.24f), RoundedCornerShape(12.dp))
        ) {
            content()
        }
        Box(
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(top = 10.dp, end = 12.dp)
                .size(52.dp)
                .background(
                    Brush.radialGradient(
                        colors = listOf(
                            TvTokens.Colors.Primary.copy(alpha = 0.24f),
                            Color.Transparent
                        )
                    )
                )
        )
    }
}

private fun liveCardOverlay(): Brush {
    return Brush.verticalGradient(
        colors = listOf(
            Color.Black.copy(alpha = 0.06f),
            Color.Transparent,
            Color.Transparent,
            Color.Black.copy(alpha = 0.52f)
        )
    )
}

private fun posterCardOverlay(): Brush {
    return Brush.verticalGradient(
        colors = listOf(
            Color.Black.copy(alpha = 0.28f),
            Color.Transparent,
            Color.Transparent,
            Color.Black.copy(alpha = 0.82f)
        )
    )
}

private fun fallbackIconForType(type: String): ImageVector {
    return when (type.lowercase()) {
        "series" -> Icons.Filled.Tv
        else -> Icons.Filled.LocalMovies
    }
}

@Preview(showBackground = true, widthDp = 960, heightDp = 540)
@Composable
private fun HomeContentCardPreview() {
    PreviewFrame {
        HomeContentCard(
            item = previewCatalogItems[1],
            isFavorite = true,
            requestInitialFocus = true,
            onClick = {},
            onLongClick = {}
        )
    }
}
