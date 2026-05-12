package com.smartifly.tv.features.home

import com.smartifly.tv.performance.lowend.DeviceTier

data class HomeRailPolicy(
    val totalRailsCap: Int,
    val movieCategoryRails: Int,
    val seriesCategoryRails: Int,
    val smartRowsCap: Int,
    val itemsPerRail: Int,
    val trendingItems: Int,
    val liveItems: Int,
    val newReleaseItems: Int,
    val fetchMovieCategories: Int,
    val fetchSeriesCategories: Int,
    val fetchLiveCategories: Int,
    val fetchItemsPerCategory: Int
)

object HomeRailPolicyResolver {
    fun resolve(
        tier: DeviceTier,
        estimatedCatalogSize: Int
    ): HomeRailPolicy {
        val base = when (tier) {
            DeviceTier.LOW -> HomeRailPolicy(
                totalRailsCap = 6,
                movieCategoryRails = 1,
                seriesCategoryRails = 1,
                smartRowsCap = 1,
                itemsPerRail = 12,
                trendingItems = 12,
                liveItems = 10,
                newReleaseItems = 12,
                fetchMovieCategories = 2,
                fetchSeriesCategories = 2,
                fetchLiveCategories = 1,
                fetchItemsPerCategory = 24
            )
            DeviceTier.MEDIUM -> HomeRailPolicy(
                totalRailsCap = 9,
                movieCategoryRails = 2,
                seriesCategoryRails = 2,
                smartRowsCap = 2,
                itemsPerRail = 16,
                trendingItems = 16,
                liveItems = 12,
                newReleaseItems = 16,
                fetchMovieCategories = 3,
                fetchSeriesCategories = 3,
                fetchLiveCategories = 2,
                fetchItemsPerCategory = 32
            )
            DeviceTier.HIGH -> HomeRailPolicy(
                totalRailsCap = 12,
                movieCategoryRails = 3,
                seriesCategoryRails = 3,
                smartRowsCap = 3,
                itemsPerRail = 20,
                trendingItems = 20,
                liveItems = 15,
                newReleaseItems = 20,
                fetchMovieCategories = 4,
                fetchSeriesCategories = 4,
                fetchLiveCategories = 2,
                fetchItemsPerCategory = 40
            )
        }

        return when {
            estimatedCatalogSize <= 500 -> base.copy(
                totalRailsCap = (base.totalRailsCap - 2).coerceAtLeast(4),
                movieCategoryRails = 1,
                seriesCategoryRails = 1,
                smartRowsCap = 1
            )
            estimatedCatalogSize <= 5000 -> base
            estimatedCatalogSize <= 20000 -> base.copy(
                totalRailsCap = (base.totalRailsCap + 1).coerceAtMost(12)
            )
            else -> base.copy(
                totalRailsCap = (base.totalRailsCap + 2).coerceAtMost(14),
                movieCategoryRails = (base.movieCategoryRails + 1).coerceAtMost(4),
                seriesCategoryRails = (base.seriesCategoryRails + 1).coerceAtMost(4)
            )
        }
    }
}

