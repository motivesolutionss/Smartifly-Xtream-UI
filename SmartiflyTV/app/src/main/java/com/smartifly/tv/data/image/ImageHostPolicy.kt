package com.smartifly.tv.data.image

import android.content.Context
import java.net.URI
import java.util.concurrent.atomic.AtomicBoolean

object ImageHostPolicy {
    private const val PREF_FILE = "image_policy_prefs"
    private const val PREF_LOW_TRUST_CSV = "low_trust_hosts_csv"
    private val initialized = AtomicBoolean(false)

    // Defaults: repeatedly observed with unstable/missing poster responses.
    private val defaultLowTrustHosts = setOf(
        "starshare.live",
        "webhop.live"
    )
    @Volatile
    private var configuredLowTrustHosts: Set<String> = defaultLowTrustHosts

    fun initialize(context: Context) {
        if (initialized.getAndSet(true)) return
        val prefs = context.getSharedPreferences(PREF_FILE, Context.MODE_PRIVATE)
        val csv = prefs.getString(PREF_LOW_TRUST_CSV, null).orEmpty()
        if (csv.isNotBlank()) {
            configuredLowTrustHosts = parseCsv(csv)
            android.util.Log.i(
                "SmartiflyImage",
                "host_policy_loaded source=prefs low_trust_hosts=${configuredLowTrustHosts.joinToString(",")}"
            )
        } else {
            configuredLowTrustHosts = defaultLowTrustHosts
            android.util.Log.i(
                "SmartiflyImage",
                "host_policy_loaded source=default low_trust_hosts=${configuredLowTrustHosts.joinToString(",")}"
            )
        }
    }

    fun overrideLowTrustHosts(context: Context, csv: String) {
        val parsed = parseCsv(csv)
        configuredLowTrustHosts = if (parsed.isEmpty()) defaultLowTrustHosts else parsed
        context.getSharedPreferences(PREF_FILE, Context.MODE_PRIVATE)
            .edit()
            .putString(PREF_LOW_TRUST_CSV, configuredLowTrustHosts.joinToString(","))
            .apply()
        android.util.Log.i(
            "SmartiflyImage",
            "host_policy_override low_trust_hosts=${configuredLowTrustHosts.joinToString(",")}"
        )
    }

    fun isLowTrust(url: String): Boolean {
        val host = runCatching { URI(url).host?.lowercase() }.getOrNull() ?: return false
        return configuredLowTrustHosts.any { host == it || host.endsWith(".$it") }
    }

    fun score(url: String): Int {
        val lower = url.lowercase()
        var score = 0
        if (lower.startsWith("https://")) score += 20
        if ("image.tmdb.org" in lower) score += 30
        if (isLowTrust(url)) score -= 40
        if (ImageFailureMemory.isHostBad(url)) score -= 100
        if (ImageFailureMemory.isBad(url)) score -= 50
        score += ImageQualityMonitor.runtimeScoreAdjustment(url)
        return score
    }

    private fun parseCsv(csv: String): Set<String> {
        return csv.split(',')
            .map { it.trim().lowercase() }
            .filter { it.isNotBlank() }
            .toSet()
    }
}
