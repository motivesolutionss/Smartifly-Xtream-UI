package com.smartifly.tv.features.profiles

object AvatarLibrary {
    val adultAvatars = listOf(
        "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
        "https://api.dicebear.com/7.x/avataaars/svg?seed=Aria",
        "https://api.dicebear.com/7.x/avataaars/svg?seed=Jasper",
        "https://api.dicebear.com/7.x/avataaars/svg?seed=Luna",
        "https://api.dicebear.com/7.x/avataaars/svg?seed=Milo"
    )

    val kidsAvatars = listOf(
        "https://api.dicebear.com/7.x/bottts/svg?seed=B1",
        "https://api.dicebear.com/7.x/bottts/svg?seed=B2",
        "https://api.dicebear.com/7.x/bottts/svg?seed=B3",
        "https://api.dicebear.com/7.x/bottts/svg?seed=B4",
        "https://api.dicebear.com/7.x/bottts/svg?seed=B5"
    )
    
    fun getAll(isKids: Boolean) = if (isKids) kidsAvatars else adultAvatars
}
