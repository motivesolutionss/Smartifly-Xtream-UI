package com.smartifly.tv.util

import android.util.Base64

/**
 * Enterprise-grade Base64 Utility for Xtream API data decoding.
 */
object Base64Util {
    fun decode(input: String): String {
        return try {
            val data = Base64.decode(input, Base64.DEFAULT)
            String(data, Charsets.UTF_8)
        } catch (e: Exception) {
            input
        }
    }
}
