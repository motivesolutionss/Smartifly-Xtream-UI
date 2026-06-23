package com.smartifly.tv.data.hero

import com.smartifly.tv.data.models.MovieMetadata

interface HomeHeroSelector {
    fun selectHomeHero(
        profileId: String,
        continueWatching: List<MovieMetadata>,
        movies: List<MovieMetadata>,
        series: List<MovieMetadata>
    ): MovieMetadata?
}
