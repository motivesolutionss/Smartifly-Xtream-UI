package com.smartifly.tv.data.remote

import okhttp3.Interceptor
import okhttp3.Response
import okhttp3.ResponseBody.Companion.toResponseBody

/**
 * OkHttp Interceptor that detects truncated JSON responses from Xtream UI servers
 * and attempts to repair them by appending missing structural brackets.
 *
 * Ported from the React Native implementation in shared/src/api/xtream/client.ts.
 */
class XtreamResponseRepairInterceptor : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val response = chain.proceed(chain.request())

        if (!response.isSuccessful) return response

        val rawBody = response.body?.string() ?: return response
        val contentType = response.body?.contentType()
        val trimmed = rawBody.trim()

        // Fast path: already well-formed and parseable
        if (isStructurallyComplete(trimmed) && isValidJson(trimmed)) {
            return response.newBuilder()
                .body(rawBody.toResponseBody(contentType))
                .build()
        }

        // Attempt escape-sequence sanitization for malformed providers.
        val sanitized = sanitizeInvalidEscapes(trimmed)
        if (sanitized != trimmed && isValidJson(sanitized)) {
            android.util.Log.i("SmartiflyData", "Sanitized invalid JSON escapes (${trimmed.length} chars)")
            return response.newBuilder()
                .body(sanitized.toResponseBody(contentType))
                .build()
        }

        // Attempt repair
        val repaired = attemptRepair(sanitized)

        return if (repaired != null) {
            android.util.Log.i("SmartiflyData", "Repaired truncated JSON (${rawBody.length} -> ${repaired.length} chars)")
            response.newBuilder()
                .body(repaired.toResponseBody(contentType))
                .build()
        } else {
            val syntheticAuth = buildSyntheticAuthResponse(trimmed)
            if (syntheticAuth != null) {
                android.util.Log.w("SmartiflyData", "Using synthetic auth JSON fallback for malformed Xtream response.")
                return response.newBuilder()
                    .body(syntheticAuth.toResponseBody(contentType))
                    .build()
            }

            // Handle plain string responses (common for error messages in some Xtream versions)
            if (!trimmed.startsWith("{") && !trimmed.startsWith("[") && trimmed.isNotEmpty()) {
                android.util.Log.w("SmartiflyData", "Server returned plain string instead of JSON. Wrapping in error object.")
                val wrappedError = """
                    {
                        "user_info": {
                            "auth": 0,
                            "message": "$trimmed",
                            "username": "unknown",
                            "password": ""
                        },
                        "server_info": {}
                    }
                """.trimIndent()
                return response.newBuilder()
                    .body(wrappedError.toResponseBody(contentType))
                    .build()
            }
            
            // Return original — downstream parser will report the real error
            response.newBuilder()
                .body(rawBody.toResponseBody(contentType))
                .build()
        }
    }

    /**
     * Quick structural check: does the JSON open and close with matching brackets?
     */
    private fun isStructurallyComplete(json: String): Boolean {
        if (json.isEmpty()) return true
        return (json.startsWith("[") && json.endsWith("]")) ||
               (json.startsWith("{") && json.endsWith("}"))
    }

    /**
     * Tries a series of common repair suffixes and validates each candidate
     * by actually parsing it with Gson's streaming parser.
     */
    private fun attemptRepair(raw: String): String? {
        if (raw.isEmpty()) return null

        val suffixes = if (raw.startsWith("[")) {
            listOf("]", "}]", "\"}]", "null}]", "\"\"}]")
        } else if (raw.startsWith("{")) {
            listOf("}", "\"}", "\"\"}","null}", "\"\"}")
        } else {
            return null
        }

        for (suffix in suffixes) {
            val candidate = raw + suffix
            if (isValidJson(candidate)) return candidate
        }

        return null
    }

    /**
     * Validates JSON by attempting a full parse with Gson's JsonParser.
     * Returns true only if parsing succeeds without exceptions.
     */
    private fun isValidJson(json: String): Boolean {
        return try {
            com.google.gson.JsonParser.parseString(json)
            true
        } catch (_: Exception) {
            false
        }
    }

    /**
     * Fixes invalid backslash escape sequences inside JSON string literals.
     * Example: "Invalid \x escape" -> "Invalid \\x escape"
     */
    private fun sanitizeInvalidEscapes(json: String): String {
        if (json.isEmpty()) return json
        val sb = StringBuilder(json.length + 8)
        var inString = false
        var i = 0

        while (i < json.length) {
            val ch = json[i]

            if (ch == '"') {
                val escaped = i > 0 && json[i - 1] == '\\'
                if (!escaped) inString = !inString
                sb.append(ch)
                i++
                continue
            }

            if (inString && ch == '\\') {
                val next = if (i + 1 < json.length) json[i + 1] else null
                val validSimple = next != null && (next == '"' || next == '\\' || next == '/' || next == 'b' || next == 'f' || next == 'n' || next == 'r' || next == 't')
                val validUnicode = if (next == 'u' && i + 5 < json.length) {
                    json.substring(i + 2, i + 6).all { it.isDigit() || it.lowercaseChar() in 'a'..'f' }
                } else {
                    false
                }

                if (!validSimple && !validUnicode) {
                    // Keep the literal backslash character by escaping it.
                    sb.append("\\\\")
                    i++
                    continue
                }
            }

            sb.append(ch)
            i++
        }

        return sb.toString()
    }

    /**
     * Last-resort fallback for severely malformed auth payloads.
     * Extracts auth signal and key credentials from raw text and builds valid JSON.
     */
    private fun buildSyntheticAuthResponse(raw: String): String? {
        if (!raw.contains("user_info", ignoreCase = true) && !raw.contains("auth", ignoreCase = true)) return null

        val auth = Regex("""["']?auth["']?\s*[:=]\s*([0-9]+)""", RegexOption.IGNORE_CASE)
            .find(raw)
            ?.groupValues
            ?.getOrNull(1)
            ?.toIntOrNull()
            ?: return null

        val username = Regex("""["']?username["']?\s*:\s*["']([^"']*)["']""", RegexOption.IGNORE_CASE)
            .find(raw)
            ?.groupValues
            ?.getOrNull(1)
            ?: "unknown"

        val password = Regex("""["']?password["']?\s*:\s*["']([^"']*)["']""", RegexOption.IGNORE_CASE)
            .find(raw)
            ?.groupValues
            ?.getOrNull(1)
            ?: ""

        val message = if (auth == 1) "Authenticated" else "Authentication rejected"

        return """
            {
              "user_info": {
                "auth": $auth,
                "username": "${escapeJsonString(username)}",
                "password": "${escapeJsonString(password)}",
                "message": "$message"
              },
              "server_info": {}
            }
        """.trimIndent()
    }

    private fun escapeJsonString(value: String): String {
        return buildString(value.length + 8) {
            value.forEach { c ->
                when (c) {
                    '\\' -> append("\\\\")
                    '"' -> append("\\\"")
                    '\n' -> append("\\n")
                    '\r' -> append("\\r")
                    '\t' -> append("\\t")
                    else -> append(c)
                }
            }
        }
    }
}
