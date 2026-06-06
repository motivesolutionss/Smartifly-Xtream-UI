package com.smartifly.tv.data.cache

import android.content.ComponentCallbacks2
import com.smartifly.tv.performance.RuntimeDownshiftManager
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Test

class RuntimeDownshiftPolicyTest {

    @After
    fun tearDown() {
        RuntimeDownshiftManager.resetForTests()
    }

    @Test
    fun `stream sync cap scales down on low memory pressure`() {
        RuntimeDownshiftManager.onMemoryPressure(ComponentCallbacks2.TRIM_MEMORY_RUNNING_LOW)
        assertEquals(225, CacheBudgetPolicy.streamSyncMaxItemsPerCategory())
    }

    @Test
    fun `stream sync cap scales down more on critical memory pressure`() {
        RuntimeDownshiftManager.onMemoryPressure(ComponentCallbacks2.TRIM_MEMORY_RUNNING_CRITICAL)
        assertEquals(150, CacheBudgetPolicy.streamSyncMaxItemsPerCategory())
    }

    @Test
    fun `home fetch items respect minimum after downshift`() {
        RuntimeDownshiftManager.onMemoryPressure(ComponentCallbacks2.TRIM_MEMORY_RUNNING_CRITICAL)
        assertEquals(12, CacheBudgetPolicy.adjustedHomeFetchItems(18))
    }
}
