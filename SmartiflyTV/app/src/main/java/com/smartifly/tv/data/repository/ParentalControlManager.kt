package com.smartifly.tv.data.repository

import com.smartifly.tv.data.remote.SmartiflyApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import java.io.IOException
import retrofit2.HttpException

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
        } catch (e: IOException) {
            android.util.Log.e("ParentalControl", "Failed to load config (network): ${e.message}")
        } catch (e: HttpException) {
            android.util.Log.e("ParentalControl", "Failed to load config (http ${e.code()})")
        } catch (e: RuntimeException) {
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
        } catch (_: IOException) {
            false
        } catch (_: HttpException) {
            false
        } catch (_: RuntimeException) {
            false
        }
    }

    fun lock() {
        _isUnlocked.value = false
    }
}
