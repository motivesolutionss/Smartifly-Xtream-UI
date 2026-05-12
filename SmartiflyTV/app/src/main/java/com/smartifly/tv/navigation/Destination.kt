package com.smartifly.tv.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.ui.graphics.vector.ImageVector

enum class Destination(val title: String, val icon: ImageVector) {
    Home("Home", Icons.Default.Home),
    Movies("Movies", Icons.Default.Movie),
    Series("Series", Icons.Default.Tv),
    Live("Live TV", Icons.Default.LiveTv),
    Search("Search", Icons.Default.Search),
    Watchlist("Watchlist", Icons.Default.Favorite),
    Details("Details", Icons.Default.Info),
    Player("Player", Icons.Default.PlayArrow),
    Settings("Settings", Icons.Default.Settings)
}
