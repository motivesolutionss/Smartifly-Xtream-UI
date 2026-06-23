package com.smartifly.tv.data.models

data class AvatarItem(
    val id: String,
    val url: String
)

object AvatarLibrary {
    val avatars = listOf(
        AvatarItem("a1", "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"),
        AvatarItem("a2", "https://api.dicebear.com/7.x/avataaars/svg?seed=Aria"),
        AvatarItem("a3", "https://api.dicebear.com/7.x/avataaars/svg?seed=Jack"),
        AvatarItem("a4", "https://api.dicebear.com/7.x/avataaars/svg?seed=Luna"),
        AvatarItem("a5", "https://api.dicebear.com/7.x/avataaars/svg?seed=Milo"),
        AvatarItem("a6", "https://api.dicebear.com/7.x/bottts/svg?seed=Robo"),
        AvatarItem("a7", "https://api.dicebear.com/7.x/bottts/svg?seed=Spark"),
        AvatarItem("a8", "https://api.dicebear.com/7.x/bottts/svg?seed=Zippy"),
        AvatarItem("a9", "https://api.dicebear.com/7.x/pixel-art/svg?seed=Hero"),
        AvatarItem("a10", "https://api.dicebear.com/7.x/pixel-art/svg?seed=Quest")
    )
}
