package com.smartifly.tv.feature.home.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.smartifly.tv.domain.model.CatalogItem
import com.smartifly.tv.domain.model.HomeRail
import com.smartifly.tv.ui.design.TvTokens
import com.smartifly.tv.ui.preview.PreviewFrame
import com.smartifly.tv.ui.preview.previewHomeRails

private val RailHeaderInset = 30.dp
private val RailTrailingInset = 80.dp
private val RailBottomGap = 2.dp
private val RailTitleGap = 10.dp

@Composable
fun HomeRailSection(
    rail: HomeRail,
    favoriteIds: Set<String>,
    entryFocusRequester: FocusRequester? = null,
    entryLeftFocusRequester: FocusRequester? = null,
    onItemClick: (CatalogItem) -> Unit,
    onItemToggleFavorite: (CatalogItem) -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = RailBottomGap),
        verticalArrangement = Arrangement.spacedBy(RailTitleGap)
    ) {
        Row(
            modifier = Modifier.padding(start = RailHeaderInset),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .width(26.dp)
                    .height(3.dp)
                    .background(
                        Brush.horizontalGradient(
                            colors = listOf(
                                TvTokens.Colors.Primary,
                                TvTokens.Colors.FocusCyan
                            )
                        ),
                        RoundedCornerShape(999.dp)
                    )
            )
            Text(
                text = rail.title,
                style = TvTokens.TvType.H4.copy(fontWeight = FontWeight.Bold),
                color = TvTokens.Colors.TextPrimary.copy(alpha = 0.96f)
            )
        }

        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(18.dp),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(
                start = RailHeaderInset,
                end = RailTrailingInset,
            ),
            modifier = Modifier.fillMaxWidth()
        ) {
            itemsIndexed(rail.items, key = { _, item -> item.id }) { index, item ->
                val isLive = item.type == "live"
                val width = if (isLive) 168 else 122
                val height = if (isLive) 96 else 182

                HomeContentCard(
                    item = item,
                    widthDp = width,
                    heightDp = height,
                    isFavorite = favoriteIds.contains(item.id),
                    focusRequester = if (index == 0) entryFocusRequester else null,
                    leftFocusRequester = if (index == 0) entryLeftFocusRequester else null,
                    onClick = { onItemClick(item) },
                    onLongClick = { onItemToggleFavorite(item) }
                )
            }
        }
    }
}

@Preview(showBackground = true, widthDp = 960, heightDp = 540)
@Composable
private fun HomeRailSectionPreview() {
    PreviewFrame {
        HomeRailSection(
            rail = previewHomeRails.first(),
            favoriteIds = setOf("live_101"),
            onItemClick = {},
            onItemToggleFavorite = {}
        )
    }
}
