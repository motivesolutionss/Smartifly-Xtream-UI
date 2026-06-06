package com.smartifly.tv.navigation

import org.junit.Assert.assertEquals
import org.junit.Test

class SmartiflyNavGraphProfileCacheTransitionTest {

    @Test
    fun `switching profile removes previous snapshot and keeps session caches`() {
        val removed = mutableListOf<String>()
        var cleared = 0

        val next = applyProfileCacheTransition(
            previousProfileId = "p1",
            currentProfileId = "p2",
            onRemoveSnapshot = { removed += it },
            onClearSessionCaches = { cleared++ }
        )

        assertEquals("p2", next)
        assertEquals(listOf("p1"), removed)
        assertEquals(0, cleared)
    }

    @Test
    fun `profile clearing removes previous snapshot and clears session caches`() {
        val removed = mutableListOf<String>()
        var cleared = 0

        val next = applyProfileCacheTransition(
            previousProfileId = "p1",
            currentProfileId = null,
            onRemoveSnapshot = { removed += it },
            onClearSessionCaches = { cleared++ }
        )

        assertEquals(null, next)
        assertEquals(listOf("p1"), removed)
        assertEquals(1, cleared)
    }

    @Test
    fun `cold null state only clears session caches`() {
        val removed = mutableListOf<String>()
        var cleared = 0

        val next = applyProfileCacheTransition(
            previousProfileId = null,
            currentProfileId = null,
            onRemoveSnapshot = { removed += it },
            onClearSessionCaches = { cleared++ }
        )

        assertEquals(null, next)
        assertEquals(emptyList<String>(), removed)
        assertEquals(1, cleared)
    }
}
