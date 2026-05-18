package com.smartifly.tv.data.repository

import com.google.gson.JsonParser
import com.smartifly.tv.data.remote.models.XtreamLiveStream
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class LiveTvRepositoryTest {
    @Test
    fun `parser prefers explicit possible keys before generic keys`() {
        val raw = JsonParser.parseString(
            """
            {
              "streams": [{"name":"Wrong","stream_id":999,"category_id":"1"}],
              "live_streams": [{"name":"Right","stream_id":111,"category_id":"1"}]
            }
            """.trimIndent()
        )

        val parsed = XtreamListParser.parse(
            raw,
            XtreamLiveStream::class.java,
            possibleKeys = listOf("live_streams", "streams")
        )

        assertEquals(1, parsed.size)
        assertEquals(111, parsed.first().streamId)
    }

    @Test
    fun `parser ignores mixed numeric and non numeric object keys`() {
        val raw = JsonParser.parseString(
            """
            {
              "0":{"name":"A","stream_id":10,"category_id":"1"},
              "meta":{"count":1}
            }
            """.trimIndent()
        )

        val parsed = XtreamListParser.parse(raw, XtreamLiveStream::class.java)

        assertTrue(parsed.isEmpty())
    }

    @Test
    fun `parser keeps valid rows when some items are malformed`() {
        val raw = JsonParser.parseString(
            """
            [
              {"name":"Valid","stream_id":77,"category_id":"9"},
              "invalid-row",
              {"name":"Valid2","stream_id":78,"category_id":"9"}
            ]
            """.trimIndent()
        )

        val parsed = XtreamListParser.parse(raw, XtreamLiveStream::class.java)

        assertEquals(2, parsed.size)
        assertEquals(listOf(77, 78), parsed.map { it.streamId })
    }

    @Test
    fun `parser handles null payload`() {
        val parsed = XtreamListParser.parse<XtreamLiveStream>(null, XtreamLiveStream::class.java)
        assertTrue(parsed.isEmpty())
    }
}
