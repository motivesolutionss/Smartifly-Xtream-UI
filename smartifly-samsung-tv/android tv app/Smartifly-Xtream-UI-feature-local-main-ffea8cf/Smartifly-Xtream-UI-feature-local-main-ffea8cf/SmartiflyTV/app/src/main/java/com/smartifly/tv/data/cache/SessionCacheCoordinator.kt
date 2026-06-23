package com.smartifly.tv.data.cache

import com.smartifly.tv.data.image.ImageFailureMemory
import com.smartifly.tv.data.repository.SearchDataSource
import com.smartifly.tv.features.home.HomeFeedSnapshotCache

object SessionCacheCoordinator {
    fun clearSessionCaches(searchDataSource: SearchDataSource?) {
        HomeFeedSnapshotCache.clearAll()
        ImageFailureMemory.clearAll()
        searchDataSource?.clearCache()
    }
}
