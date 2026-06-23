package com.smartifly.tv.data.cloud

import com.smartifly.tv.data.models.UserProfile
import kotlinx.coroutines.tasks.await

class CloudProfileRepository {
    private val profilesCollection
        get() = FirebaseClient.userDoc?.collection("profiles")

    suspend fun uploadProfiles(profiles: List<UserProfile>) {
        val collection = profilesCollection ?: return
        profiles.forEach { profile ->
            collection.document(profile.id).set(profile).await()
        }
    }

    suspend fun fetchProfiles(): List<UserProfile> {
        val collection = profilesCollection ?: return emptyList()
        val snapshot = collection.get().await()
        return snapshot.toObjects(UserProfile::class.java)
    }
}
