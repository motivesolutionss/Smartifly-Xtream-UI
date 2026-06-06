package com.smartifly.tv.ui.components.base

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.tv.foundation.lazy.list.TvLazyRow
import androidx.tv.foundation.lazy.list.items
import androidx.tv.material3.Button
import androidx.tv.material3.ButtonDefaults
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Text
import com.smartifly.tv.data.models.MediaCategory
import com.smartifly.tv.ui.theme.Dimensions
import com.smartifly.tv.ui.theme.PrimaryRed

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun TopCategoryChips(
    categories: List<SideRailCategoryItem>,
    selectedCategoryId: String,
    onCategorySelected: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    TvLazyRow(
        modifier = modifier
            .fillMaxWidth()
            .background(Color.White.copy(alpha = 0.03f), RoundedCornerShape(16.dp))
            .border(1.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(16.dp))
            .padding(vertical = 6.dp),
        contentPadding = PaddingValues(horizontal = Dimensions.ContentGutter),
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        items(categories, key = { it.id }) { category ->
            val isSelected = category.id == selectedCategoryId
            Button(
                onClick = { onCategorySelected(category.id) },
                shape = ButtonDefaults.shape(RoundedCornerShape(18.dp)),
                colors = ButtonDefaults.colors(
                    containerColor = if (isSelected) Color.White else Color.Transparent,
                    focusedContainerColor = Color.White,
                    focusedContentColor = Color.Black,
                    contentColor = if (isSelected) Color.Black else Color.White.copy(alpha = 0.88f)
                )
            ) {
                Text(
                    text = category.title,
                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium
                )
            }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun TopCategoryChipsLive(
    categories: List<MediaCategory>,
    selectedCategoryId: String,
    onCategorySelected: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    TvLazyRow(
        modifier = modifier
            .fillMaxWidth()
            .background(Color.White.copy(alpha = 0.03f), RoundedCornerShape(16.dp))
            .border(1.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(16.dp))
            .padding(vertical = 6.dp),
        contentPadding = PaddingValues(horizontal = Dimensions.ContentGutter),
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        items(categories, key = { it.id }) { category ->
            val isSelected = category.id == selectedCategoryId
            Button(
                onClick = { onCategorySelected(category.id) },
                shape = ButtonDefaults.shape(RoundedCornerShape(18.dp)),
                colors = ButtonDefaults.colors(
                    containerColor = if (isSelected) Color.White else Color.Transparent,
                    focusedContainerColor = Color.White,
                    focusedContentColor = Color.Black,
                    contentColor = if (isSelected) PrimaryRed else Color.White.copy(alpha = 0.88f)
                )
            ) {
                Text(
                    text = category.name,
                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium
                )
            }
        }
    }
}
