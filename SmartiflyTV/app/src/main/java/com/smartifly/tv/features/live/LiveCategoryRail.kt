package com.smartifly.tv.features.live

import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.tv.foundation.lazy.list.TvLazyColumn
import androidx.tv.foundation.lazy.list.items
import androidx.tv.material3.ClickableSurfaceDefaults
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.Surface
import androidx.tv.material3.Text
import com.smartifly.tv.data.models.MediaCategory
import com.smartifly.tv.ui.theme.Dimensions
import com.smartifly.tv.ui.theme.PrimaryRed
import com.smartifly.tv.ui.theme.TextSecondary

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun LiveCategoryRail(
    categories: List<MediaCategory>,
    selectedCategoryId: String,
    onCategorySelected: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    TvLazyColumn(
        modifier = modifier.fillMaxHeight().width(220.dp),
        contentPadding = PaddingValues(Dimensions.PaddingMedium)
    ) {
        items(categories, key = { it.id }) { category ->
            val isSelected = category.id == selectedCategoryId
            Surface(
                onClick = { onCategorySelected(category.id) },
                colors = ClickableSurfaceDefaults.colors(
                    containerColor = if (isSelected) Color.White.copy(alpha = 0.1f) else Color.Transparent,
                    focusedContainerColor = Color.White,
                    focusedContentColor = Color.Black,
                    contentColor = if (isSelected) PrimaryRed else TextSecondary
                ),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp)
            ) {
                Text(
                    text = category.name,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                    style = MaterialTheme.typography.labelLarge
                )
            }
        }
    }
}

