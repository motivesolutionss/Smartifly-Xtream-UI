# SmartiflyTV Production ProGuard Rules

# Media3 / ExoPlayer
-keep class androidx.media3.common.** { *; }
-keep class androidx.media3.exoplayer.** { *; }
-keep class androidx.media3.ui.** { *; }
-keep class androidx.media3.datasource.** { *; }

# Firebase
-keep class com.google.firebase.** { *; }

# Retrofit / Gson
-keep class com.smartifly.tv.data.remote.dto.** { *; }
-keepattributes Signature, InnerClasses, EnclosingMethod
-dontwarn retrofit2.**
-keep class retrofit2.** { *; }
-keep class okhttp3.** { *; }

# Jetpack Compose / Material3
-keep class androidx.compose.** { *; }
-keep class androidx.tv.material3.** { *; }

# Data Serialization
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}

# Keep our models
-keep class com.smartifly.tv.data.models.** { *; }
