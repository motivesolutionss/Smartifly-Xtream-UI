package com.smartifly.tv.data.image

import android.content.Context
import android.provider.Settings
import com.smartifly.tv.BuildConfig
import com.smartifly.tv.data.SessionManager
import com.smartifly.tv.data.remote.ApiClient
import com.smartifly.tv.data.remote.dto.ProviderHealthEventDto
import com.smartifly.tv.data.remote.dto.ProviderHealthIngestRequest
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.cancel
import java.io.IOException
import java.net.URI
import java.time.Instant
import java.util.UUID
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger

object ProviderHealthTelemetry {
    private const val MAX_QUEUE = 1000
    private const val FLUSH_BATCH_SIZE = 30
    private const val FLUSH_INTERVAL_MS = 60_000L
    private const val MAX_BACKOFF_MS = 120_000L

    private val queue = ConcurrentLinkedQueue<ProviderHealthEventDto>()
    private val queueCount = AtomicInteger(0)
    private val started = AtomicBoolean(false)
    private val flushInFlight = AtomicBoolean(false)
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var flushJob: Job? = null

    @Volatile
    private var appContext: Context? = null

    @Volatile
    private var backoffMs = 30_000L

    fun initialize(context: Context) {
        appContext = context.applicationContext
        if (!started.compareAndSet(false, true)) return

        flushJob = scope.launch {
            while (isActive) {
                delay(FLUSH_INTERVAL_MS)
                flushNow()
            }
        }
    }

    fun shutdown() {
        started.set(false)
        flushJob?.cancel()
        flushJob = null
        scope.cancel()
    }

    fun recordEvent(
        eventType: String,
        context: String,
        imageUrl: String?,
        hostOverride: String? = null,
        profileId: String? = null,
        contentType: String? = null,
        contentId: String? = null,
        metadata: Map<String, Any?>? = null
    ) {
        val contextRef = appContext ?: return
        val host = hostOverride?.takeIf { it.isNotBlank() } ?: imageUrl?.let { safeHostOf(it) } ?: return
        scope.launch {
            val session = SessionManager(contextRef)
            val credentials = runCatching { session.getXtreamCredentials() }.getOrNull()
            val portalIdentity = credentials?.operatorId?.takeIf { it.isNotBlank() } ?: "UNKNOWN"
            val portalBaseUrl = credentials?.baseUrl?.takeIf { it.isNotBlank() } ?: "UNKNOWN"
            val deviceId = Settings.Secure.getString(contextRef.contentResolver, Settings.Secure.ANDROID_ID) ?: "unknown"

            val event = ProviderHealthEventDto(
                eventId = UUID.randomUUID().toString(),
                deviceId = deviceId,
                profileId = profileId,
                portalIdentity = portalIdentity,
                portalBaseUrl = portalBaseUrl,
                host = host,
                eventType = eventType,
                context = context,
                contentType = contentType,
                contentId = contentId,
                metadata = metadata,
                occurredAt = Instant.now().toString(),
                appVersion = BuildConfig.VERSION_NAME,
                platform = "ANDROID_TV"
            )

            queue.offer(event)
            val currentCount = queueCount.incrementAndGet()
            if (currentCount > MAX_QUEUE) {
                while (queueCount.get() > MAX_QUEUE) {
                    queue.poll() ?: break
                    queueCount.decrementAndGet()
                }
            }

            if (queueCount.get() >= FLUSH_BATCH_SIZE) {
                flushNow()
            }
        }
    }

    private suspend fun flushNow() {
        if (appContext == null) return
        if (!flushInFlight.compareAndSet(false, true)) return

        var batch = emptyList<ProviderHealthEventDto>()
        try {
            if (queueCount.get() <= 0) return

            val nextBatch = ArrayList<ProviderHealthEventDto>(FLUSH_BATCH_SIZE)
            while (nextBatch.size < FLUSH_BATCH_SIZE) {
                val item = queue.poll() ?: break
                nextBatch.add(item)
                queueCount.decrementAndGet()
            }
            if (nextBatch.isEmpty()) return
            batch = nextBatch

            val response = ApiClient.api.ingestProviderHealth(ProviderHealthIngestRequest(events = batch))
            if (response.success) {
                backoffMs = 30_000L
                return
            }

            batch.forEach {
                queue.offer(it)
                queueCount.incrementAndGet()
            }
            delay(backoffMs)
            backoffMs = (backoffMs * 2).coerceAtMost(MAX_BACKOFF_MS)
        } catch (_: IOException) {
            if (batch.isNotEmpty()) {
                batch.forEach {
                    queue.offer(it)
                    queueCount.incrementAndGet()
                }
            }
            delay(backoffMs)
            backoffMs = (backoffMs * 2).coerceAtMost(MAX_BACKOFF_MS)
        } catch (_: RuntimeException) {
            if (batch.isNotEmpty()) {
                batch.forEach {
                    queue.offer(it)
                    queueCount.incrementAndGet()
                }
            }
            delay(backoffMs)
            backoffMs = (backoffMs * 2).coerceAtMost(MAX_BACKOFF_MS)
        } finally {
            flushInFlight.set(false)
        }
    }

    private fun safeHostOf(url: String): String? {
        return try {
            URI(url).host?.lowercase()
        } catch (_: Exception) {
            null
        }
    }
}
