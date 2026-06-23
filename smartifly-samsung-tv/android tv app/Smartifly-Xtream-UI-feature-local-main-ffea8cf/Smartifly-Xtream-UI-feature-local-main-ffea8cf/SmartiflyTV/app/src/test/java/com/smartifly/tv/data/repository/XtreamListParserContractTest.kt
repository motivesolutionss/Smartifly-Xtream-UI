package com.smartifly.tv.data.repository

import com.google.gson.JsonParser
import com.smartifly.tv.data.remote.models.XtreamLiveStream
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class XtreamListParserContractTest {

    @Test
    fun `parses direct json array`() {
        val raw = JsonParser.parseString(
            """
            [
              {"name":"Channel 1","stream_id":101,"category_id":"10"},
              {"name":"Channel 2","stream_id":102,"category_id":"10"}
            ]
            """.trimIndent()
        )

        val parsed = XtreamListParser.parse(raw, XtreamLiveStream::class.java)

        assertEquals(2, parsed.size)
        assertEquals(101, parsed[0].streamId)
        assertEquals("Channel 2", parsed[1].name)
    }

    @Test
    fun `parses wrapped array from preferred keys`() {
        val raw = JsonParser.parseString(
            """
            {"live_streams":[{"name":"News HD","stream_id":201,"category_id":"20"}]}
            """.trimIndent()
        )

        val parsed = XtreamListParser.parse(
            raw,
            XtreamLiveStream::class.java,
            possibleKeys = listOf("live_streams", "channels", "streams")
        )

        assertEquals(1, parsed.size)
        assertEquals(201, parsed.first().streamId)
    }

    @Test
    fun `parses numeric keyed object format`() {
        val raw = JsonParser.parseString(
            """
            {
              "1":{"name":"Sports 2","stream_id":302,"category_id":"30"},
              "0":{"name":"Sports 1","stream_id":301,"category_id":"30"}
            }
            """.trimIndent()
        )

        val parsed = XtreamListParser.parse(raw, XtreamLiveStream::class.java)

        assertEquals(2, parsed.size)
        assertEquals(301, parsed[0].streamId)
        assertEquals(302, parsed[1].streamId)
    }

    @Test
    fun `returns empty for auth envelope response`() {
        val raw = JsonParser.parseString(
            """
            {
              "user_info":{"auth":1},
              "server_info":{"url":"example.com"}
            }
            """.trimIndent()
        )

        val parsed = XtreamListParser.parse(raw, XtreamLiveStream::class.java)
        assertTrue(parsed.isEmpty())
    }

    @Test
    fun `returns empty for auth zero response`() {
        val raw = JsonParser.parseString("""{"auth":0,"message":"denied"}""")
        val parsed = XtreamListParser.parse(raw, XtreamLiveStream::class.java)
        assertTrue(parsed.isEmpty())
    }

    @Test
    fun `returns empty for error objects`() {
        val raw = JsonParser.parseString("""{"error":"bad gateway"}""")
        val parsed = XtreamListParser.parse(raw, XtreamLiveStream::class.java)
        assertTrue(parsed.isEmpty())
    }

    @Test
    fun `parses snapshot and paged wrapper shapes`() {
        val snapshot = JsonParser.parseString(
            """
            {"data":[{"name":"A","stream_id":401,"category_id":"40"},{"name":"B","stream_id":402,"category_id":"40"}]}
            """.trimIndent()
        )
        val paged = JsonParser.parseString(
            """
            {"page":2,"limit":120,"has_more":true,"data":[{"name":"C","stream_id":403,"category_id":"40"}]}
            """.trimIndent()
        )

        val snapshotParsed = XtreamListParser.parse(snapshot, XtreamLiveStream::class.java)
        val pagedParsed = XtreamListParser.parse(paged, XtreamLiveStream::class.java)

        assertEquals(2, snapshotParsed.size)
        assertEquals(1, pagedParsed.size)
        assertEquals(403, pagedParsed.first().streamId)
    }

    @Test
    fun `returns empty for non object non array payload`() {
        val raw = JsonParser.parseString("\"service unavailable\"")
        val parsed = XtreamListParser.parse(raw, XtreamLiveStream::class.java)
        assertTrue(parsed.isEmpty())
    }
}
