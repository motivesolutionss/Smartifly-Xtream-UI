package com.smartifly.tv.data.repository

import com.google.gson.Gson
import com.smartifly.tv.data.local.AppPreferencesDataSource
import com.smartifly.tv.data.remote.BackendApiService
import com.smartifly.tv.data.remote.XtreamAuthResponseDto
import com.smartifly.tv.data.remote.authAsIntOrNull
import com.smartifly.tv.data.remote.buildXtreamPlayerApiUrl
import com.smartifly.tv.data.remote.toDomain
import com.smartifly.tv.domain.model.AuthLoginException
import com.smartifly.tv.domain.model.AuthTimeoutException
import com.smartifly.tv.domain.model.AuthSession
import com.smartifly.tv.domain.model.InvalidCredentialsAuthException
import com.smartifly.tv.domain.model.MalformedXtreamResponseAuthException
import com.smartifly.tv.domain.model.Portal
import com.smartifly.tv.domain.model.PortalHealth
import com.smartifly.tv.domain.model.PortalHealthStatus
import com.smartifly.tv.domain.model.SavedAccount
import com.smartifly.tv.domain.model.ServiceUnavailableAuthException
import com.smartifly.tv.domain.repository.AuthRepository
import com.smartifly.tv.domain.repository.MasterControlRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withContext
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.IOException
import java.net.ConnectException
import java.net.SocketTimeoutException
import java.net.UnknownHostException

class DefaultAuthRepository(
    private val backendApi: BackendApiService,
    private val xtreamHttpClient: OkHttpClient,
    private val gson: Gson,
    private val preferences: AppPreferencesDataSource,
    private val masterControlRepository: MasterControlRepository,
) : AuthRepository {

    private companion object {
        const val MAX_PORTALS = 5
        const val PORTAL_PROBE_TIMEOUT_MS = 10_000L
    }

    override val sessionFlow: Flow<AuthSession?> = preferences.sessionFlow
    override val cachedPortalsFlow: Flow<List<Portal>> = preferences.portalsFlow
    override val selectedPortalIdFlow: Flow<String?> = preferences.selectedPortalIdFlow
    override val savedAccountsFlow: Flow<List<SavedAccount>> = preferences.savedAccountsFlow
    private val portalProbeClient = xtreamHttpClient.newBuilder()
        .callTimeout(PORTAL_PROBE_TIMEOUT_MS, java.util.concurrent.TimeUnit.MILLISECONDS)
        .connectTimeout(PORTAL_PROBE_TIMEOUT_MS, java.util.concurrent.TimeUnit.MILLISECONDS)
        .readTimeout(PORTAL_PROBE_TIMEOUT_MS, java.util.concurrent.TimeUnit.MILLISECONDS)
        .writeTimeout(PORTAL_PROBE_TIMEOUT_MS, java.util.concurrent.TimeUnit.MILLISECONDS)
        .build()

    override suspend fun fetchPortals(forceRefresh: Boolean): List<Portal> {
        return runCatching {
            backendApi.getPortals()
                .mapIndexedNotNull { index, dto -> dto.toDomain(index) }
                .filter { portal ->
                    val endpoint = portal.url.trim().toHttpUrlOrNull()
                    endpoint != null && (endpoint.scheme == "http" || endpoint.scheme == "https")
                }
                .sortedWith(compareByDescending<Portal> { it.isPrimary }.thenBy { it.name.lowercase() })
                .take(MAX_PORTALS)
        }.getOrElse { emptyList() }
            .also { remote ->
                if (remote.isNotEmpty()) {
                    preferences.savePortals(remote)
                    val selectedPortalId = selectedPortalIdFlow.first()
                    if (selectedPortalId == null || remote.none { it.id == selectedPortalId }) {
                        preferences.saveSelectedPortalId(remote.first().id)
                    }
                }
            }
            .ifEmpty {
                if (forceRefresh) emptyList() else cachedPortalsFlow.first()
            }
    }

    override suspend fun probePortalHealth(portal: Portal): PortalHealth {
        return withContext(Dispatchers.IO) {
            runCatching {
                val endpoint = buildXtreamPlayerApiUrl(portal.url)
                    ?: error("Invalid portal URL")
                val request = Request.Builder().url(endpoint).get().build()
                val startedAt = System.currentTimeMillis()
                portalProbeClient.newCall(request).execute().use { response ->
                    val latency = (System.currentTimeMillis() - startedAt).coerceAtLeast(1L)
                    val status = when {
                        response.isSuccessful -> PortalHealthStatus.ONLINE
                        response.code == 401 || response.code == 403 -> PortalHealthStatus.ONLINE // Credentials issue, but server is UP
                        response.code == 404 -> PortalHealthStatus.ONLINE // API endpoint exists but maybe empty GET
                        else -> PortalHealthStatus.OFFLINE
                    }
                    PortalHealth(status = status, latencyMs = latency)
                }
            }.getOrElse {
                PortalHealth(status = PortalHealthStatus.OFFLINE)
            }
        }
    }

    override suspend fun login(portal: Portal, username: String, password: String): Result<AuthSession> {
        return withContext(Dispatchers.IO) {
            runCatching {
                val rawServerUrl = portal.url.trim().trimEnd('/')
                require(rawServerUrl.isNotBlank()) { "Invalid portal URL" }

                val cleanUsername = username.trim()
                // Keep password exact for auth parity with React Native implementation.
                val cleanPassword = password
                val playerApiUrl = buildXtreamPlayerApiUrl(rawServerUrl)
                    ?: error("Invalid portal URL")

                var lastError: Throwable? = null
                repeat(2) { attempt ->
                    try {
                        val httpUrl = playerApiUrl.newBuilder()
                            .query(null)
                            .fragment(null)
                            .addQueryParameter("username", cleanUsername)
                            .addQueryParameter("password", cleanPassword)
                            .build()

                        val request = Request.Builder().url(httpUrl).get().build()
                        val response = xtreamHttpClient.newCall(request).execute()

                        response.use { result ->
                            if (!result.isSuccessful) {
                                throw result.code.toAuthFailure()
                            }

                            val rawBody = result.body?.string().orEmpty()
                            val auth = parseAuthResponse(rawBody)
                            val userInfo = auth.userInfo ?: throw MalformedXtreamResponseAuthException()

                            if (userInfo.authAsIntOrNull() != 1) {
                                throw InvalidCredentialsAuthException()
                            }

                            val session = AuthSession(
                                serverUrl = rawServerUrl,
                                portalId = portal.id,
                                portalName = portal.name,
                                username = cleanUsername,
                                password = cleanPassword,
                                expDate = userInfo.expDate,
                                maxConnections = userInfo.maxConnections?.toIntOrNull() ?: 1,
                                activeConnections = userInfo.activeCons?.toIntOrNull() ?: 0,
                            )

                            preferences.saveSelectedPortalId(portal.id)
                            persistSavedAccount(
                                portal = portal,
                                session = session,
                            )
                            preferences.saveSession(session)
                            runCatching {
                                masterControlRepository.reportLogin(
                                    serverUrl = rawServerUrl,
                                    username = cleanUsername,
                                    password = cleanPassword,
                                )
                            }
                            return@runCatching session
                        }
                    } catch (error: Throwable) {
                        val classifiedError = error.toAuthFailure()
                        lastError = classifiedError
                        val shouldRetry = attempt == 0 && classifiedError.isRetryableTransportFailure()
                        if (shouldRetry) {
                            delay(200)
                        } else {
                            throw classifiedError
                        }
                    }
                }

                throw lastError ?: IllegalStateException("Authentication failed")
            }
        }
    }

    override suspend fun checkLicense(deviceId: String): Result<Unit> {
        return withContext(Dispatchers.IO) {
            runCatching {
                val access = masterControlRepository.verifyStartupAccess()
                if (!access.isAllowed) {
                    error(access.message ?: "This device is not authorized.")
                }
                Unit
            }
        }
    }

    override suspend fun setSelectedPortal(portalId: String) {
        preferences.saveSelectedPortalId(portalId)
    }

    override suspend fun switchAccount(accountId: String): Result<AuthSession> {
        val account = savedAccountsFlow.first().firstOrNull { it.id == accountId }
            ?: return Result.failure(IllegalArgumentException("Saved account not found."))
        preferences.saveSelectedPortalId(account.portal.id)
        return login(
            portal = account.portal,
            username = account.username,
            password = account.password,
        )
    }

    override suspend fun removeAccount(accountId: String) {
        val updated = savedAccountsFlow.first().filterNot { it.id == accountId }
        preferences.saveSavedAccounts(updated)
    }

    override suspend fun logout() {
        preferences.clearSession()
    }

    private fun parseAuthResponse(rawBody: String): XtreamAuthResponseDto {
        val payload = rawBody.removePrefix("\uFEFF").trim()
        if (payload.isBlank()) {
            throw MalformedXtreamResponseAuthException()
        }

        runCatching {
            return gson.fromJson(payload, XtreamAuthResponseDto::class.java)
        }

        if (payload.startsWith("{")) {
            val repairAttempts = listOf(
                payload + "}",
                payload + "\"}",
                payload + "\"}}",
            )
            repairAttempts.forEach { candidate ->
                runCatching {
                    return gson.fromJson(candidate, XtreamAuthResponseDto::class.java)
                }
            }
        }

        throw MalformedXtreamResponseAuthException()
    }

    private fun Int.toAuthFailure(): Throwable {
        return when (this) {
            401, 403 -> InvalidCredentialsAuthException()
            408 -> AuthTimeoutException()
            else -> ServiceUnavailableAuthException()
        }
    }

    private fun Throwable.toAuthFailure(): Throwable {
        return when (this) {
            is InvalidCredentialsAuthException,
            is ServiceUnavailableAuthException,
            is AuthTimeoutException,
            is MalformedXtreamResponseAuthException -> this
            is SocketTimeoutException -> AuthTimeoutException()
            is ConnectException,
            is UnknownHostException,
            is IOException -> ServiceUnavailableAuthException(retryableTransport = true)
            else -> this
        }
    }

    private fun Throwable.isRetryableTransportFailure(): Boolean {
        return (this as? AuthLoginException)?.retryableTransport == true
    }

    private suspend fun persistSavedAccount(
        portal: Portal,
        session: AuthSession,
    ) {
        val accountId = "${portal.id}_${session.username}"
        val existing = savedAccountsFlow.first()
        val withoutCurrent = existing.filterNot { it.id == accountId }
        val updated = listOf(
            SavedAccount(
                id = accountId,
                username = session.username,
                password = session.password,
                portal = portal,
                expDate = session.expDate,
                maxConnections = session.maxConnections,
                activeConnections = session.activeConnections,
                lastActive = System.currentTimeMillis(),
            )
        ) + withoutCurrent
        preferences.saveSavedAccounts(updated.take(10))
    }
}
