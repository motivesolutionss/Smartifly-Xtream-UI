package com.smartifly.tv.data.image

import com.smartifly.tv.data.hero.HeroImageResolver
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ImagePipelineContractTest {

    @Test
    fun `normalize supports protocol-relative urls`() {
        val normalized = HeroImageResolver.normalizeImageUrl("//cdn.example.com/poster.jpg")
        assertEquals("https://cdn.example.com/poster.jpg", normalized)
    }

    @Test
    fun `normalize resolves relative urls against portal base`() {
        HeroImageResolver.setPortalBaseUrl("http://portal.example.com:8080")
        val normalized = HeroImageResolver.normalizeImageUrl("/images/a.jpg")
        assertEquals("http://portal.example.com:8080/images/a.jpg", normalized)
    }

    @Test
    fun `normalize rejects non-http schemes`() {
        val normalized = HeroImageResolver.normalizeImageUrl("javascript:alert(1)")
        assertNull(normalized)
    }

    @Test
    fun `policy returns empty when all candidates invalid`() {
        HeroImageResolver.setPortalBaseUrl(null)
        val candidates = ImagePolicyEngine.resolveCandidates(
            "invalid-url",
            "ftp://cdn.example.com/a.jpg",
            "javascript:bad"
        )
        assertTrue(candidates.isEmpty())
    }

    @Test
    fun `policy keeps normalized and deduped candidate order by trust score`() {
        HeroImageResolver.setPortalBaseUrl("https://portal.example.com")
        val candidates = ImagePolicyEngine.resolveCandidates(
            "https://image.tmdb.org/t/p/w500/a.jpg",
            "/images/a.jpg",
            "https://image.tmdb.org/t/p/w500/a.jpg"
        )
        assertEquals(2, candidates.size)
        assertEquals("https://image.tmdb.org/t/p/w500/a.jpg", candidates.first())
        assertEquals("https://portal.example.com/images/a.jpg", candidates.last())
    }
}

