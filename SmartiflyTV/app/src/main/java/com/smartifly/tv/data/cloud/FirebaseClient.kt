package com.smartifly.tv.data.cloud

import com.google.firebase.FirebaseApp
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ktx.firestore
import com.google.firebase.ktx.Firebase

object FirebaseClient {
    private fun isFirebaseInitialized(): Boolean = runCatching {
        FirebaseApp.getInstance()
        true
    }.getOrDefault(false)

    val db: FirebaseFirestore? by lazy {
        if (isFirebaseInitialized()) runCatching { Firebase.firestore }.getOrNull() else null
    }
    
    // In a real app, you'd use Firebase Auth to get a unique userId
    const val USER_ID = "test_user_123" 
    
    val userDoc = db?.collection("users")?.document(USER_ID)
}
