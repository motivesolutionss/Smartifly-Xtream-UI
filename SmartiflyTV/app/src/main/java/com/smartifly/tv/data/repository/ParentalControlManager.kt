package com.smartifly.tv.data.repository

import com.smartifly.tv.data.remote.SmartiflyApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

class ParentalControlManager(private val api: SmartiflyApi) {
    
    private val _isUnlocked = MutableStateFlow(false)
    val isUnlocked: StateFlow<Boolean> = _isUnlocked

    private var lockedCategories = listOf<String>()
    private var isConfigLoaded = false
    private var userId: String? = null

    fun setUserId(id: String?) {
        userId = id?.takeIf { it.isNotBlank() }
        isConfigLoaded = false
    }

    suspend fun loadConfig() {
        if (isConfigLoaded) return
        val currentUserId = userId ?: return
        try {
            val response = api.getParentalConfig(currentUserId)
            @Suppress("UNCHECKED_CAST")
            lockedCategories = (response["lockedCategories"] as? List<String>) ?: emptyList()
            isConfigLoaded = true
        } catch (e: Exception) {
            android.util.Log.e("ParentalControl", "Failed to load config: ${e.message}")
        }
    }

    fun isCategoryLocked(categoryName: String): Boolean {
        return lockedCategories.any { categoryName.contains(it, ignoreCase = true) }
    }

    suspend fun validatePin(pin: String): Boolean {
        val currentUserId = userId ?: return false
        return try {
            val response = api.validateParentalPin(mapOf("pin" to pin, "userId" to currentUserId))
            val success = response["success"] as? Boolean ?: false
            if (success) {
                _isUnlocked.value = true
            }
            success
        } catch (e: Exception) {
            false
        }
    }

    fun lock() {
        _isUnlocked.value = false
    }
}
