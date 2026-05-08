package com.smartifly.tv.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalInspectionMode
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.smartifly.tv.interop.FocusDebugLogger
import com.smartifly.tv.ui.design.TvTokens
import com.smartifly.tv.ui.preview.PreviewFrame

@Composable
fun FocusablePosterRail(
    title: String,
    items: List<String>,
    contentPadding: PaddingValues = PaddingValues(0.dp),
) {
    val firstItemFocusRequester = remember { FocusRequester() }
    val isInPreview = LocalInspectionMode.current

    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium,
            color = TvTokens.Colors.TextPrimary
        )

        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            contentPadding = contentPadding
        ) {
            itemsIndexed(items) { index, item ->
                FocusablePosterCard(
                    title = item,
                    modifier = if (index == 0) Modifier.focusRequester(firstItemFocusRequester) else Modifier
                )
            }
        }
    }

    // Makes first item immediately reachable by D-pad when screen opens.
    LaunchedEffect(Unit) {
        if (!isInPreview) {
            firstItemFocusRequester.requestFocus()
        }
    }
}

@Composable
private fun FocusablePosterCard(
    title: String,
    modifier: Modifier = Modifier,
) {
    var isFocused by remember { mutableStateOf(false) }

    Box(
        modifier = modifier
            .width(230.dp)
            .height(130.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(if (isFocused) TvTokens.Colors.FocusCyan else TvTokens.Colors.SurfaceMuted)
            .onFocusChanged { state ->
                isFocused = state.isFocused
                FocusDebugLogger.logFocus("Poster:$title", state.isFocused)
            }
            .focusable()
            .clickable(enabled = true) {}
            .background(if (isFocused) TvTokens.Colors.FocusCyan else TvTokens.Colors.SurfaceMuted),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = title,
            style = MaterialTheme.typography.bodyLarge,
            color = TvTokens.Colors.TextPrimary,
            textAlign = TextAlign.Center
        )
    }
}

@Preview(showBackground = true, widthDp = 960, heightDp = 540)
@Composable
private fun FocusablePosterRailPreview() {
    PreviewFrame {
        FocusablePosterRail(
            title = "Continue Watching",
            items = listOf("Skyline Pursuit", "Signal Point", "World News", "After Orbit")
        )
    }
}
