package com.smartifly.tv.data.onboarding

import com.smartifly.tv.BuildConfig
import com.smartifly.tv.data.SessionManager
import com.smartifly.tv.data.remote.SmartiflyApi
import com.smartifly.tv.data.remote.dto.QrRequest
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.net.URLEncoder
import java.util.concurrent.TimeUnit

class OnboardingRepository(
    private val api: SmartiflyApi,
    private val sessionManager: SessionManager
) {
    private data class AuthParseResult(
        val auth: Int,
        val message: String?
    )

    private companion object {
        // Canonical status codes expected from backend /v1/public/device/check.
        const val STATUS_ACTIVE = "ACTIVE"
        const val STATUS_PENDING = "PENDING"
        const val STATUS_NO_DEVICE = "NO_DEVICE"
        const val STATUS_CONTACTED = "CONTACTED"
        const val STATUS_EXPIRED = "EXPIRED"
        const val STATUS_BLOCKED = "BLOCKED"
        const val STATUS_BLACKLISTED = "BLACKLISTED"
        const val STATUS_DISABLED = "DISABLED"

        private val authHttpClient: OkHttpClient by lazy {
            OkHttpClient.Builder()
                .connectTimeout(15, TimeUnit.SECONDS)
                .readTimeout(15, TimeUnit.SECONDS)
                .writeTimeout(15, TimeUnit.SECONDS)
                .retryOnConnectionFailure(true)
                .build()
        }
    }
    
    suspend fun registerDevice(deviceId: String): DeviceRegistrationResult {
        return try {
            val request = mapOf(
                "deviceId" to deviceId,
                "mac" to "00:1A:79:${deviceId.takeLast(6)}",
                "brand" to android.os.Build.BRAND,
                "model" to android.os.Build.MODEL,
                "platform" to "ANDROID_TV",
                "appVersion" to "${BuildConfig.VERSION_NAME}-enterprise",
                "osVersion" to android.os.Build.VERSION.RELEASE
            )
            api.registerDevice(request)
            DeviceRegistrationResult.Success
        } catch (e: Exception) {
            DeviceRegistrationResult.Error(
                message = "Device registration failed: ${e.message ?: "Unknown error"}",
                retryable = true
            )
        }
    }

    suspend fun fetchActivationSession(deviceId: String): ActivationSessionResult {
        return try {
            val response = api.fetchActivationSession(
                QrRequest(
                    licenseKey = "TRIAL",
                    deviceId = deviceId,
                    mac = "00:1A:79:${deviceId.takeLast(6)}",
                    platform = "ANDROID_TV",
                    brand = android.os.Build.BRAND,
                    model = android.os.Build.MODEL,
                    osVersion = android.os.Build.VERSION.RELEASE,
                    appVersion = "${BuildConfig.VERSION_NAME}-enterprise"
                )
            )
            if (!response.success) {
                ActivationSessionResult.Error("Activation session could not be created", retryable = true)
            } else {
                ActivationSessionResult.Success(
                    DeviceActivationSession(
                        success = response.success,
                        qrCode = response.qrCode,
                        webLink = response.webLink,
                        token = response.token,
                        settingsCode = response.settingsCode,
                        expiresIn = response.expiresIn
                    )
                )
            }
        } catch (e: Exception) {
            ActivationSessionResult.Error(
                message = "Activation service unavailable: ${e.message ?: "Unknown error"}",
                retryable = true
            )
        }
    }

    suspend fun checkActivationStatusDetailed(deviceId: String): ActivationStatusResult {
        return try {
            val params = mapOf(
                "deviceId" to deviceId,
                "mac" to "00:1A:79:${deviceId.takeLast(6)}"
            )
            val response = api.checkDeviceStatus(params)
            
            if (response.state == "ACTIVE" && response.license != null) {
                val serverUrl = response.license.server?.url
                val user = response.license.xtreamUser
                val pass = response.license.xtreamPass
                
                if (serverUrl != null && user != null && pass != null) {
                    val boundUserId = response.license.userId
                    if (boundUserId == null) {
                        return ActivationStatusResult(
                            status = DeviceStatus.PENDING,
                            reason = "Activation incomplete: account binding missing",
                            source = ActivationStatusSource.REMOTE
                        )
                    }
                    // Enterprise Enhancement: Only save if we don't already have a valid session
                    // to prevent clobbering manual logins.
                    if (sessionManager.getXtreamCredentials() == null) {
                        sessionManager.saveActivation(
                            XtreamCredentials(serverUrl, user, pass)
                        )
                    }
                    sessionManager.setBoundUserId(boundUserId.toString())
                    return ActivationStatusResult(
                        status = DeviceStatus.ACTIVATED,
                        reason = response.reason ?: "Device is active",
                        source = ActivationStatusSource.REMOTE
                    )
                }
            }

            val statusCode = (response.statusCode ?: response.state).uppercase()
            val normalizedStatus = mapStatusCodeToDeviceStatus(statusCode)

            ActivationStatusResult(
                status = normalizedStatus,
                reason = response.reason ?: "No reason provided",
                source = ActivationStatusSource.REMOTE
            )
        } catch (e: Exception) {
            ActivationStatusResult(
                status = DeviceStatus.PENDING,
                reason = "Status check failed: ${e.message ?: "Unknown error"}",
                source = ActivationStatusSource.LOCAL_FALLBACK
            )
        }
    }

    private fun mapStatusCodeToDeviceStatus(statusCode: String): DeviceStatus {
        return when (statusCode) {
            STATUS_ACTIVE -> DeviceStatus.ACTIVATED
            STATUS_PENDING, STATUS_NO_DEVICE, STATUS_CONTACTED -> DeviceStatus.PENDING
            STATUS_EXPIRED -> DeviceStatus.EXPIRED
            STATUS_BLOCKED, STATUS_BLACKLISTED, STATUS_DISABLED -> DeviceStatus.BLOCKED
            else -> DeviceStatus.PENDING
        }
    }

    suspend fun checkActivationStatus(deviceId: String): DeviceStatus {
        return checkActivationStatusDetailed(deviceId).status
    }

    fun pollStatusDetailed(deviceId: String): Flow<ActivationStatusResult> = flow {
        while (true) {
            emit(checkActivationStatusDetailed(deviceId))
            delay(5000)
        }
    }

    fun pollStatus(deviceId: String): Flow<DeviceStatus> = flow {
        pollStatusDetailed(deviceId).collect { result ->
            emit(result.status)
        }
    }

    suspend fun loginWithXtream(credentials: XtreamCredentials): XtreamLoginResult {
        // High-Fidelity Manual Login with real Xtream UI Handshake
        return try {
            kotlinx.coroutines.withTimeout(15000) { // 15s High-Performance Timeout
                val normalizedBaseUrl = canonicalizePortalBaseUrl(credentials.baseUrl)
                val normalizedUsername = credentials.username.trim()
                    .replace(Regex("[\\u200B-\\u200D\\uFEFF]"), "")
                    .replace(Regex("\\s+"), "")
                val normalizedPassword = credentials.password.trim()
                    .replace(Regex("[\\u200B-\\u200D\\uFEFF]"), "")
                    .replace(Regex("\\s+"), "")

                val fullUrl = "$normalizedBaseUrl/player_api.php"
                android.util.Log.d(
                    "SmartiflyHandshake",
                    "FULL URL: $fullUrl?username=$normalizedUsername&password=*** (uLen=${normalizedUsername.length}, pLen=${normalizedPassword.length})"
                )
                
                val raw = executeAuthHandshake(
                    baseUrl = normalizedBaseUrl,
                    username = normalizedUsername,
                    password = normalizedPassword
                )
                val parsed = parseAuthResponse(raw)
                android.util.Log.d(
                    "SmartiflyHandshake",
                    "Parsed auth=${parsed.auth}, msgLen=${parsed.message?.length ?: 0}, rawLen=${raw.length}"
                )
                
                // Check if authentication was professionally successful (auth = 1)
                if (parsed.auth == 1) {
                    android.util.Log.d("SmartiflyHandshake", "Handshake SUCCESS for user: ${credentials.username}")
                    sessionManager.saveActivation(
                        XtreamCredentials(
                            baseUrl = normalizedBaseUrl,
                            username = normalizedUsername,
                            password = normalizedPassword,
                            operatorId = credentials.operatorId
                        )
                    )
                    // Manual Xtream login path may not have backend-bound numeric userId.
                    // Persist a local identity key so profile flow can stay functional.
                    sessionManager.setBoundUserId("local:$normalizedUsername@$normalizedBaseUrl")
                    XtreamLoginResult.Success
                } else {
                    val rawServerMsg = parsed.message ?: "No message from server"
                    val uiMessage = sanitizeServerMessage(rawServerMsg)
                    android.util.Log.w("SmartiflyHandshake", "Handshake REJECTED: Auth=${parsed.auth}, RawMsg=$rawServerMsg")
                    XtreamLoginResult.Error("Authentication rejected by Xtream server: $uiMessage", retryable = false)
                }
            }
        } catch (e: kotlinx.coroutines.TimeoutCancellationException) {
            android.util.Log.e("SmartiflyHandshake", "Handshake TIMEOUT after 15s")
            XtreamLoginResult.Error("Connection timeout while contacting Xtream server", retryable = true)
        } catch (e: Exception) {
            android.util.Log.e("SmartiflyHandshake", "Handshake CRITICAL ERROR: ${e::class.java.simpleName}: ${e.message}", e)
            XtreamLoginResult.Error(
                message = "Failed to connect to Xtream server: ${e.message ?: e::class.java.simpleName}",
                retryable = true
            )
        }
    }

    private suspend fun executeAuthHandshake(baseUrl: String, username: String, password: String): String = withContext(Dispatchers.IO) {
        val encodedUser = URLEncoder.encode(username, Charsets.UTF_8.name())
        val encodedPass = URLEncoder.encode(password, Charsets.UTF_8.name())
        val url = "$baseUrl/player_api.php?username=$encodedUser&password=$encodedPass"

        val request = Request.Builder()
            .url(url)
            .get()
            .header("Accept", "application/json,text/plain,*/*")
            .build()

        authHttpClient.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                throw IllegalStateException("HTTP ${response.code} ${response.message}")
            }

            val body = response.body ?: throw IllegalStateException("Empty response body")
            val bytes = body.bytes()
            if (bytes.isEmpty()) return@withContext ""

            val utf8 = bytes.toString(Charsets.UTF_8).trim()
            if (utf8.startsWith("{") || utf8.startsWith("[")) return@withContext utf8

            // Fallback for non-UTF legacy portal payloads.
            val latin1 = bytes.toString(Charsets.ISO_8859_1).trim()
            return@withContext if (latin1.startsWith("{") || latin1.startsWith("[")) latin1 else utf8
        }
    }

    private fun parseAuthResponse(raw: String): AuthParseResult {
        // Try strict JSON first.
        try {
            val root = com.google.gson.JsonParser.parseString(raw).asJsonObject
            val userInfo = root.getAsJsonObject("user_info")
            val auth = userInfo?.get("auth")?.asInt ?: root.get("auth")?.asInt ?: 0
            val message = userInfo?.get("message")?.takeIf { !it.isJsonNull }?.asString
            return AuthParseResult(auth = auth, message = message)
        } catch (_: Exception) {
            // Fallback for malformed payloads.
        }

        val auth = Regex("""["']?auth["']?\s*[:=]\s*([0-9]+)""", RegexOption.IGNORE_CASE)
            .find(raw)
            ?.groupValues
            ?.getOrNull(1)
            ?.toIntOrNull()
            ?: 0

        val message = Regex("""["']?message["']?\s*:\s*["']([^"']*)["']""", RegexOption.IGNORE_CASE)
            .find(raw)
            ?.groupValues
            ?.getOrNull(1)

        return AuthParseResult(auth = auth, message = message)
    }

    private fun canonicalizePortalBaseUrl(raw: String): String {
        var value = raw.trim().replace(Regex("[\\u200B-\\u200D\\uFEFF]"), "")
        if (!value.startsWith("http://", ignoreCase = true) && !value.startsWith("https://", ignoreCase = true)) {
            value = "http://$value"
        }

        val uri = try {
            java.net.URI(value)
        } catch (_: Exception) {
            return value.trimEnd('/')
        }

        val scheme = uri.scheme ?: "http"
        val host = uri.host ?: return value.trimEnd('/')
        val portPart = if (uri.port > 0) ":${uri.port}" else ""
        val rawPath = (uri.path ?: "").trim()
        val cleanedPath = rawPath
            .replace(Regex("/player_api\\.php/?$", RegexOption.IGNORE_CASE), "")
            .replace(Regex("/panel_api\\.php/?$", RegexOption.IGNORE_CASE), "")
            .replace(Regex("/get\\.php/?$", RegexOption.IGNORE_CASE), "")
            .trimEnd('/')

        return if (cleanedPath.isBlank()) {
            "$scheme://$host$portPart"
        } else {
            "$scheme://$host$portPart$cleanedPath"
        }
    }

    private fun sanitizeServerMessage(raw: String?): String {
        val fallback = "Authentication failed. Please verify username, password, and portal."
        val msg = raw?.trim().orEmpty()
        if (msg.isBlank()) return fallback

        // Keep readable ASCII/Unicode letters/digits/punctuation and normalize whitespace.
        val cleaned = msg
            .replace(Regex("[\\r\\n\\t]+"), " ")
            .replace(Regex("\\s{2,}"), " ")
            .filter { ch ->
                (ch.code in 32..126) || ch.isLetterOrDigit() || ch in setOf(' ', '.', ',', ':', ';', '-', '_', '!', '?', '@', '#', '$', '%', '&', '(', ')', '[', ']', '/')
            }
            .trim()

        // If text is mostly noise, show stable fallback.
        val noiseRatio = if (msg.isNotEmpty()) {
            1.0 - (cleaned.length.toDouble() / msg.length.toDouble())
        } else 1.0

        if (cleaned.length < 8 || noiseRatio > 0.45) return fallback
        return cleaned.take(240)
    }

    suspend fun validatePortalCode(code: String): PortalValidationResult {
        return try {
            val normalizedCode = code.trim().uppercase()
            val response = api.validatePortalCode(normalizedCode)
            if (response.success && response.portal != null) {
                val canonicalBaseUrl = canonicalizePortalBaseUrl(response.portal.baseUrl)
                android.util.Log.d(
                    "SmartiflyHandshake",
                    "Portal resolved: code=$normalizedCode, rawBaseUrl=${response.portal.baseUrl}, canonicalBaseUrl=$canonicalBaseUrl"
                )
                PortalValidationResult.Success(
                    PortalDetails(
                        portalCode = response.portal.portalCode,
                        baseUrl = canonicalBaseUrl,
                        name = response.portal.name ?: ""
                    )
                )
            } else {
                PortalValidationResult.Error(response.message ?: "Invalid or inactive Server Identity code", retryable = false)
            }
        } catch (e: Exception) {
            PortalValidationResult.Error(
                message = "Server identity validation failed: ${e.message ?: "Unknown error"}",
                retryable = true
            )
        }
    }

}
