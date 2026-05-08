package com.smartifly.tv.feature.profile

import com.smartifly.tv.domain.model.UserProfile

data class ProfileState(
    val profiles: List<UserProfile> = emptyList(),
    val activeProfileId: String? = null,
)

