package com.smartifly.tv.data.models

data class AvatarItem(
    val id: String,
    val url: String,
    val category: String // "Kids" or "Adults"
)

object AvatarLibrary {
    val avatars = listOf(
        // Adults Set
        AvatarItem("a1", "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix", "Adults"),
        AvatarItem("a2", "https://api.dicebear.com/7.x/avataaars/svg?seed=Aria", "Adults"),
        AvatarItem("a3", "https://api.dicebear.com/7.x/avataaars/svg?seed=Jack", "Adults"),
        AvatarItem("a4", "https://api.dicebear.com/7.x/avataaars/svg?seed=Luna", "Adults"),
        AvatarItem("a5", "https://api.dicebear.com/7.x/avataaars/svg?seed=Milo", "Adults"),
        
        // Kids Set
        AvatarItem("k1", "https://api.dicebear.com/7.x/bottts/svg?seed=Robo", "Kids"),
        AvatarItem("k2", "https://api.dicebear.com/7.x/bottts/svg?seed=Spark", "Kids"),
        AvatarItem("k3", "https://api.dicebear.com/7.x/bottts/svg?seed=Zippy", "Kids"),
        AvatarItem("k4", "https://api.dicebear.com/7.x/pixel-art/svg?seed=Hero", "Kids"),
        AvatarItem("k5", "https://api.dicebear.com/7.x/pixel-art/svg?seed=Quest", "Kids")
    )

    fun getByCategory(category: String) = avatars.filter { it.category == category }
}
