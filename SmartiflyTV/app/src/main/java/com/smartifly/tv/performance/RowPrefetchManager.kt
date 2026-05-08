package com.smartifly.tv.performance

import com.smartifly.tv.data.models.MovieMetadata

class RowPrefetchManager(private val preloader: ImagePreloader) {
    
    fun onCardFocused(
        currentIndex: Int,
        items: List<MovieMetadata>,
        prefetchCount: Int = 5
    ) {
        // Preload current backdrop
        preloader.preload(items[currentIndex].backdropUrl)
        
        // Preload next N posters
        val nextItems = items.drop(currentIndex + 1).take(prefetchCount)
        preloader.preloadBatch(nextItems.map { it.posterUrl })
        
        // Preload previous 2 posters (for back scrolling)
        val prevItems = items.take(currentIndex).takeLast(2)
        preloader.preloadBatch(prevItems.map { it.posterUrl })
    }
}
