package com.smartifly.tv.data.cloud

import com.smartifly.tv.data.WatchProgress
import kotlinx.coroutines.tasks.await

class CloudResumeRepository {
    private fun getHistoryCollection(profileId: String) = 
        FirebaseClient.userDoc?.collection("profiles")?.document(profileId)?.collection("history")

    suspend fun saveToCloud(profileId: String, progress: WatchProgress) {
        val collection = getHistoryCollection(profileId) ?: return
        collection.document(progress.contentId).set(progress).await()
    }

    suspend fun fetchFromCloud(profileId: String): List<WatchProgress> {
        val collection = getHistoryCollection(profileId) ?: return emptyList()
        val snapshot = collection.get().await()
        return snapshot.toObjects(WatchProgress::class.java)
    }
}
