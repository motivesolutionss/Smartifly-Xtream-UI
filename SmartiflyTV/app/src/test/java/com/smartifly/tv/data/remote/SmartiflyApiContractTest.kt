package com.smartifly.tv.data.remote

import kotlinx.coroutines.test.runTest
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import retrofit2.HttpException
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

class SmartiflyApiContractTest {
    private lateinit var server: MockWebServer
    private lateinit var api: SmartiflyApi

    @Before
    fun setUp() {
        server = MockWebServer()
        server.start()

        api = Retrofit.Builder()
            .baseUrl(server.url("/"))
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(SmartiflyApi::class.java)
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    @Test
    fun `getHomeData parses hero and sections`() = runTest {
        server.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setBody(
                    """
                    {
                      "hero": {
                        "id": "m1",
                        "title": "Hero Title",
                        "description": "Hero Description",
                        "year": "2025",
                        "rating": "PG-13",
                        "duration": "120m",
                        "poster_url": "https://cdn.example.com/p1.jpg",
                        "backdrop_url": "https://cdn.example.com/b1.jpg",
                        "stream_url": "https://stream.example.com/m1.m3u8"
                      },
                      "sections": [
                        {
                          "title": "Trending",
                          "items": [
                            {
                              "id": "m2",
                              "title": "Movie 2",
                              "description": "Desc",
                              "year": "2024",
                              "rating": "R",
                              "duration": "110m",
                              "poster_url": "https://cdn.example.com/p2.jpg",
                              "backdrop_url": "https://cdn.example.com/b2.jpg",
                              "stream_url": null
                            }
                          ]
                        }
                      ]
                    }
                    """.trimIndent()
                )
        )

        val result = api.getHomeData()

        assertEquals("m1", result.hero.id)
        assertEquals("Hero Title", result.hero.title)
        assertEquals(1, result.sections.size)
        assertEquals("Trending", result.sections.first().title)

        val request = server.takeRequest()
        assertEquals("/home", request.path)
    }

    @Test
    fun `search endpoint maps query parameter`() = runTest {
        server.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setBody(
                    """
                    [
                      {
                        "id": "s1",
                        "title": "Search Result",
                        "description": "Desc",
                        "year": "2023",
                        "rating": "PG",
                        "duration": "90m",
                        "poster_url": "https://cdn.example.com/ps.jpg",
                        "backdrop_url": "https://cdn.example.com/bs.jpg",
                        "stream_url": "https://stream.example.com/s1.mpd"
                      }
                    ]
                    """.trimIndent()
                )
        )

        val result = api.search("batman")

        assertEquals(1, result.size)
        assertEquals("s1", result.first().id)

        val request = server.takeRequest()
        assertTrue(request.path?.startsWith("/search?") == true)
        assertTrue(request.path?.contains("q=batman") == true)
    }

    @Test(expected = HttpException::class)
    fun `movies endpoint throws HttpException on 500`() = runTest {
        server.enqueue(
            MockResponse()
                .setResponseCode(500)
                .setBody("{\"error\":\"server down\"}")
        )

        api.getMovies()
    }
}
