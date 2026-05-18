package com.smartifly.tv.data.remote

import com.smartifly.tv.data.remote.dto.ProviderHealthEventDto
import com.smartifly.tv.data.remote.dto.ProviderHealthIngestRequest
import com.smartifly.tv.data.remote.dto.QrRequest
import kotlinx.coroutines.runBlocking
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

class SmartiflyApiContractTest {
    private lateinit var server: MockWebServer
    private lateinit var api: SmartiflyApi

    @Before
    fun setUp() {
        server = MockWebServer()
        api = Retrofit.Builder()
            .baseUrl(server.url("/v1/"))
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(SmartiflyApi::class.java)
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    @Test
    fun `fetchActivationSession posts correct payload and parses response`() = runBlocking {
        server.enqueue(
            MockResponse().setResponseCode(200).setBody(
                """
                {
                  "success": true,
                  "qrCode": "data:image/png;base64,abc",
                  "webLink": "https://smartifly.tv/activate",
                  "token": "tok_123",
                  "settingsCode": "AB12CD34",
                  "expiresIn": "300"
                }
                """.trimIndent()
            )
        )

        val response = api.fetchActivationSession(
            QrRequest(deviceId = "dev-01", mac = "aa:bb:cc:dd:ee:ff")
        )

        val request = server.takeRequest()
        assertEquals("/v1/public/qr/generate", request.path)
        assertEquals("POST", request.method)
        assertTrue(request.body.readUtf8().contains("\"deviceId\":\"dev-01\""))
        assertTrue(response.success)
        assertEquals("tok_123", response.token)
        assertEquals("AB12CD34", response.settingsCode)
    }

    @Test
    fun `checkDeviceStatus sends query map and parses active license`() = runBlocking {
        server.enqueue(
            MockResponse().setResponseCode(200).setBody(
                """
                {
                  "valid": true,
                  "state": "ACTIVE",
                  "reason": "OK",
                  "license": {
                    "id": 10,
                    "plan": "MONTHLY",
                    "xtreamUser": "user1",
                    "xtreamPass": "pass1",
                    "server": {"name":"Main","url":"http://example:8080"}
                  }
                }
                """.trimIndent()
            )
        )

        val response = api.checkDeviceStatus(
            mapOf("deviceId" to "dev-22", "mac" to "11:22:33:44:55:66")
        )

        val request = server.takeRequest()
        assertTrue(request.path!!.startsWith("/v1/public/device/check?"))
        assertTrue(request.path!!.contains("deviceId=dev-22"))
        assertTrue(request.path!!.contains("mac=11%3A22%3A33%3A44%3A55%3A66"))
        assertEquals("ACTIVE", response.state)
        assertEquals("user1", response.license?.xtreamUser)
        assertEquals("http://example:8080", response.license?.server?.url)
    }

    @Test
    fun `validatePortalCode encodes query and parses portal`() = runBlocking {
        server.enqueue(
            MockResponse().setResponseCode(200).setBody(
                """
                {
                  "success": true,
                  "portal": {
                    "portalCode": "STAR-001",
                    "baseUrl": "http://premiumtvs.space:8080",
                    "name": "Starshare"
                  }
                }
                """.trimIndent()
            )
        )

        val response = api.validatePortalCode("STAR-001")
        val request = server.takeRequest()

        assertEquals("/v1/public/portal/validate?code=STAR-001", request.path)
        assertTrue(response.success)
        assertEquals("http://premiumtvs.space:8080", response.portal?.baseUrl)
    }

    @Test
    fun `ingestProviderHealth posts schema version and events`() = runBlocking {
        server.enqueue(
            MockResponse().setResponseCode(200).setBody(
                """
                {"success": true, "accepted": 1, "rejected": 0}
                """.trimIndent()
            )
        )

        val event = ProviderHealthEventDto(
            eventId = "e-1",
            deviceId = "d-1",
            portalIdentity = "SMARTIFLY-01",
            portalBaseUrl = "http://example:8080",
            host = "images.example.com",
            eventType = "IMAGE_FAILURE",
            context = "LIVE_CARD",
            occurredAt = "2026-05-13T10:00:00Z",
            appVersion = "1.0.0"
        )

        val response = api.ingestProviderHealth(
            ProviderHealthIngestRequest(events = listOf(event))
        )

        val request = server.takeRequest()
        val body = request.body.readUtf8()
        assertEquals("/v1/public/telemetry/provider-health", request.path)
        assertTrue(body.contains("\"schemaVersion\":1"))
        assertTrue(body.contains("\"eventType\":\"IMAGE_FAILURE\""))
        assertTrue(response.success)
        assertEquals(1, response.accepted)
        assertEquals(0, response.rejected)
    }
}
