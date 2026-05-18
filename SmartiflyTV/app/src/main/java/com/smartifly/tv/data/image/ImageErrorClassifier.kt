package com.smartifly.tv.data.image

object ImageErrorClassifier {
    enum class ErrorClass {
        RATE_LIMIT,
        TIMEOUT,
        TLS,
        DNS,
        HTTP_4XX,
        HTTP_5XX,
        CANCELLED,
        TRANSIENT_UNKNOWN,
        PERMANENT_UNKNOWN
    }

    data class Classification(
        val errorClass: ErrorClass,
        val temporaryTtlMs: Long? = null
    )

    fun classify(throwable: Throwable?): Classification {
        val message = throwable?.message.orEmpty()
        val lower = message.lowercase()

        if ("cancel" in lower) {
            return Classification(ErrorClass.CANCELLED, temporaryTtlMs = 10_000L)
        }
        if ("429" in lower || "too many requests" in lower || "rate limit" in lower) {
            return Classification(ErrorClass.RATE_LIMIT, temporaryTtlMs = 60_000L)
        }
        if ("timed out" in lower || "timeout" in lower) {
            return Classification(ErrorClass.TIMEOUT, temporaryTtlMs = 45_000L)
        }
        if ("unable to resolve host" in lower || "unknownhost" in lower || "dns" in lower) {
            return Classification(ErrorClass.DNS, temporaryTtlMs = 60_000L)
        }
        if ("ssl" in lower || "tls" in lower || "certificate" in lower || "trust relationship" in lower) {
            return Classification(ErrorClass.TLS, temporaryTtlMs = 5 * 60_000L)
        }
        val status = extractHttpStatus(lower)
        if (status != null) {
            if (status in 500..599) {
                return Classification(ErrorClass.HTTP_5XX, temporaryTtlMs = 60_000L)
            }
            if (status in 400..499) {
                return if (status == 404 || status == 410) {
                    Classification(ErrorClass.HTTP_4XX)
                } else {
                    Classification(ErrorClass.HTTP_4XX, temporaryTtlMs = 45_000L)
                }
            }
        }
        return if (lower.contains("reset") || lower.contains("refused") || lower.contains("interrupted")) {
            Classification(ErrorClass.TRANSIENT_UNKNOWN, temporaryTtlMs = 30_000L)
        } else {
            Classification(ErrorClass.PERMANENT_UNKNOWN)
        }
    }

    private fun extractHttpStatus(text: String): Int? {
        val patterns = listOf(
            Regex("""\((\d{3})\)"""),
            Regex("""\bstatus(?:\s*code)?[:=\s]+(\d{3})\b"""),
            Regex("""\bhttp\s*(\d{3})\b""")
        )
        for (pattern in patterns) {
            val status = pattern.find(text)?.groupValues?.getOrNull(1)?.toIntOrNull()
            if (status != null) return status
        }
        return null
    }
}
