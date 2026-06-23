package com.smartifly.tv.data.repository

import com.smartifly.tv.data.local.entities.SyncStateEntity
import com.smartifly.tv.data.remote.NetworkResult
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class XtreamRepositoryCachePolicyTest {

    @Test
    fun `recent failure should skip sync inside cooldown`() {
        val now = 1_000_000L
        val state = SyncStateEntity(
            providerKey = "p",
            domain = "STREAM",
            type = "LIVE",
            categoryId = "1",
            lastAttemptAtMs = now - 10_000L,
            lastSuccessAtMs = 0L,
            itemCount = 0,
            lastError = "timeout"
        )

        assertTrue(XtreamRepository.shouldSkipSyncForRecentFailure(state, now))
        assertFalse(XtreamRepository.shouldSkipSyncForRecentFailure(state, now + XtreamRepository.SYNC_FAILURE_COOLDOWN_MS + 1))
    }

    @Test
    fun `empty response preserve policy allows first two streaks only`() {
        val previous = SyncStateEntity(
            providerKey = "p",
            domain = "STREAM",
            type = "VOD",
            categoryId = "1",
            lastAttemptAtMs = 100L,
            lastSuccessAtMs = 50L,
            itemCount = 15,
            lastError = null
        )
        assertTrue(XtreamRepository.shouldPreserveCacheOnEmptyResponse(previous))

        val streakTwo = previous.copy(lastError = "empty_response_preserved_cache:count=1")
        assertTrue(XtreamRepository.shouldPreserveCacheOnEmptyResponse(streakTwo))

        val streakThree = previous.copy(lastError = "empty_response_preserved_cache:count=2")
        assertFalse(XtreamRepository.shouldPreserveCacheOnEmptyResponse(streakThree))
    }

    @Test
    fun `cooldown cache miss returns error result`() {
        val result = XtreamRepository.cooldownCacheMissResult<Any>()
        assertTrue(result is NetworkResult.Error)
        result as NetworkResult.Error
        assertEquals("Sync cooldown active and no cached data available", result.exception?.message)
        assertNotNull(result.message)
    }
}
