package com.smartifly.tv.data.repository

import com.smartifly.tv.data.remote.models.XtreamMovie
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.Assert.assertEquals
import org.junit.Test

class XtreamStreamingListParserTest {

    @Test
    fun `parse respects max cap for top-level array`() {
        val json = """
            [
              {"name":"Movie 1","stream_id":1,"category_id":"10"},
              {"name":"Movie 2","stream_id":2,"category_id":"10"},
              {"name":"Movie 3","stream_id":3,"category_id":"10"}
            ]
        """.trimIndent()
        val body = json.toResponseBody("application/json".toMediaType())

        val parsed = XtreamStreamingListParser.parse(
            rawBody = body,
            clazz = XtreamMovie::class.java,
            maxItems = 2
        )

        assertEquals(2, parsed.size)
        assertEquals("Movie 1", parsed[0].name)
        assertEquals("Movie 2", parsed[1].name)
    }

    @Test
    fun `parse supports wrapped array keys`() {
        val json = """
            {"vod_streams":[
              {"name":"Movie A","stream_id":11,"category_id":"20"},
              {"name":"Movie B","stream_id":12,"category_id":"20"}
            ]}
        """.trimIndent()
        val body = json.toResponseBody("application/json".toMediaType())

        val parsed = XtreamStreamingListParser.parse(
            rawBody = body,
            clazz = XtreamMovie::class.java,
            possibleKeys = listOf("vod_streams"),
            maxItems = 10
        )

        assertEquals(2, parsed.size)
        assertEquals("Movie A", parsed[0].name)
        assertEquals("Movie B", parsed[1].name)
    }
}

