package com.smartifly.tv.data.image

import com.smartifly.tv.data.hero.HeroImageResolver

/**
 * Global image policy for all UI surfaces.
 */
object ImagePolicyEngine {

    private fun rankUsable(candidates: List<String>): List<String> {
        return candidates
            .asSequence()
            .filterNot { ImageFailureMemory.isHostBad(it) }
            .filterNot { ImageFailureMemory.isBad(it) }
            .sortedByDescending { ImageHostPolicy.score(it) }
            .toList()
    }

    fun resolveCandidates(vararg rawCandidates: String?): List<String> {
        val normalized = rawCandidates
            .mapNotNull { HeroImageResolver.normalizeImageUrl(it) }
            .distinct()
        if (normalized.isEmpty()) return emptyList()

        val highTrust = normalized.filterNot { ImageHostPolicy.isLowTrust(it) }
        if (highTrust.isEmpty()) {
            return rankUsable(normalized)
        }

        val rankedHighTrust = rankUsable(highTrust)
        if (rankedHighTrust.isNotEmpty()) return rankedHighTrust

        // If all high-trust hosts are currently suppressed, allow low-trust fallback.
        return rankUsable(normalized)
    }

    fun resolveFirstUsable(vararg rawCandidates: String?): String? {
        return resolveCandidates(*rawCandidates).firstOrNull()
    }
}
