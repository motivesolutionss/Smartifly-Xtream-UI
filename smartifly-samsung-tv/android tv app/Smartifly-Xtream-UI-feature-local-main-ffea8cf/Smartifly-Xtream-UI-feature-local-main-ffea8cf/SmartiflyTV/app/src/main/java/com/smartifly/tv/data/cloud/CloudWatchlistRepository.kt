package com.smartifly.tv.data.cloud

import com.smartifly.tv.data.models.MovieMetadata
import kotlinx.coroutines.tasks.await

class CloudWatchlistRepository {
    private fun getWatchlistCollection(profileId: String) = 
        FirebaseClient.userDoc?.collection("profiles")?.document(profileId)?.collection("watchlist")

    suspend fun addToCloudWatchlist(profileId: String, movie: MovieMetadata) {
        val collection = getWatchlistCollection(profileId) ?: return
        collection.document(movie.id).set(movie).await()
    }

    suspend fun removeFromCloudWatchlist(profileId: String, movieId: String) {
        val collection = getWatchlistCollection(profileId) ?: return
        collection.document(movieId).delete().await()
    }

    suspend fun fetchCloudWatchlist(profileId: String): List<MovieMetadata> {
        val collection = getWatchlistCollection(profileId) ?: return emptyList()
        val snapshot = collection.get().await()
        return snapshot.toObjects(MovieMetadata::class.java)
    }
}
