package com.smartifly.tv.data.image

import com.smartifly.tv.data.hero.HeroImageResolver

/**
 * Global image policy for all UI surfaces.
 */
object ImagePolicyEngine {

    fun resolveFirstUsable(vararg rawCandidates: String?): String? {
        for (raw in rawCandidates) {
            val normalized = HeroImageResolver.normalizeImageUrl(raw) ?: continue
            if (!ImageFailureMemory.isBad(normalized)) return normalized
        }
        return null
    }
}

