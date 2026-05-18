plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("com.google.gms.google-services")
    id("com.google.firebase.crashlytics")
    id("com.google.devtools.ksp")
}

fun Project.apiBaseUrlFor(propertyName: String, fallback: String): String {
    val value = (findProperty(propertyName) as String?)?.trim()
    return if (!value.isNullOrBlank()) value else fallback
}

android {
    namespace = "com.smartifly.tv"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.smartifly.tv"
        minSdk = 26 // Android 8.0 (Oreo) for TV
        targetSdk = 34
        versionCode = 3
        versionName = "1.0.2"

        vectorDrawables {
            useSupportLibrary = true
        }

        ksp {
            arg("room.schemaLocation", "$projectDir/schemas")
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            val releaseApiBaseUrl = project.apiBaseUrlFor(
                "SMARTIFLY_API_BASE_URL_PROD",
                project.apiBaseUrlFor("SMARTIFLY_API_BASE_URL", "https://api.smartifly.tv/v1/")
            )
            buildConfigField("String", "API_BASE_URL", "\"$releaseApiBaseUrl\"")
            buildConfigField("boolean", "LIVE_DEBUG_TRACE", "false")
            buildConfigField("boolean", "STARTUP_WARMUP_V2", "true")
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
        debug {
            isDebuggable = true
            val debugApiBaseUrl = project.apiBaseUrlFor(
                "SMARTIFLY_API_BASE_URL_DEV",
                project.apiBaseUrlFor("SMARTIFLY_API_BASE_URL", "https://api.smartifly.tv/v1/")
            )
            buildConfigField("String", "API_BASE_URL", "\"$debugApiBaseUrl\"")
            val debugLiveTraceEnabled = (findProperty("SMARTIFLY_LIVE_DEBUG_TRACE") as String?)?.trim()?.toBooleanStrictOrNull() ?: false
            buildConfigField("boolean", "LIVE_DEBUG_TRACE", debugLiveTraceEnabled.toString())
            val debugWarmupV2Enabled = (findProperty("SMARTIFLY_STARTUP_WARMUP_V2") as String?)?.trim()?.toBooleanStrictOrNull() ?: true
            buildConfigField("boolean", "STARTUP_WARMUP_V2", debugWarmupV2Enabled.toString())
        }
        create("staging") {
            initWith(getByName("debug"))
            matchingFallbacks += listOf("debug")
            val stagingApiBaseUrl = project.apiBaseUrlFor(
                "SMARTIFLY_API_BASE_URL_STAGING",
                project.apiBaseUrlFor("SMARTIFLY_API_BASE_URL", "https://api.smartifly.tv/v1/")
            )
            buildConfigField("String", "API_BASE_URL", "\"$stagingApiBaseUrl\"")
            buildConfigField("boolean", "LIVE_DEBUG_TRACE", "false")
            buildConfigField("boolean", "STARTUP_WARMUP_V2", "true")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }
    kotlinOptions {
        jvmTarget = "1.8"
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }

}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2024.09.03")
    val tvFoundationVersion = "1.0.0-alpha10"
    val tvMaterialVersion = "1.0.0-alpha10"
    val media3Version = "1.6.1"
    val securityCryptoVersion = "1.1.0-beta01"
    implementation(composeBom)

    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.7.0")
    implementation("androidx.activity:activity-compose:1.8.2")
    
    // Jetpack Compose for TV
    implementation("androidx.tv:tv-foundation:$tvFoundationVersion")
    implementation("androidx.tv:tv-material:$tvMaterialVersion")

    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.navigation:navigation-compose:2.7.7")
    
    // Room Database - Enterprise Caching
    val roomVersion = "2.6.1"
    implementation("androidx.room:room-runtime:$roomVersion")
    implementation("androidx.room:room-ktx:$roomVersion")
    ksp("androidx.room:room-compiler:$roomVersion")
    
    // DataStore & Gson
    implementation("androidx.datastore:datastore:1.0.0")
    implementation("androidx.datastore:datastore-preferences:1.0.0")
    implementation("androidx.security:security-crypto:$securityCryptoVersion")
    implementation("com.google.code.gson:gson:2.10.1")

    // Retrofit
    implementation("com.squareup.retrofit2:retrofit:2.9.0")
    implementation("com.squareup.retrofit2:converter-gson:2.9.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")

    // Media3
    implementation("androidx.media3:media3-exoplayer:$media3Version")
    implementation("androidx.media3:media3-ui:$media3Version")
    implementation("androidx.media3:media3-common:$media3Version")
    implementation("androidx.media3:media3-session:$media3Version")

    // Firebase
    implementation(platform("com.google.firebase:firebase-bom:32.7.0"))
    implementation("com.google.firebase:firebase-firestore-ktx")
    implementation("com.google.firebase:firebase-auth-ktx")
    implementation("com.google.firebase:firebase-analytics-ktx")
    implementation("com.google.firebase:firebase-crashlytics-ktx")

    // Coil
    implementation("io.coil-kt:coil-compose:2.5.0")

    // Android TV Launcher Channels
    implementation("androidx.tvprovider:tvprovider:1.0.0")
    implementation("androidx.work:work-runtime-ktx:2.9.0")

    debugImplementation("androidx.compose.ui:ui-tooling")
    debugImplementation("androidx.compose.ui:ui-test-manifest")

    testImplementation("junit:junit:4.13.2")
    testImplementation("com.squareup.okhttp3:mockwebserver:4.12.0")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.8.1")
    testImplementation("org.mockito:mockito-core:5.14.2")
    testImplementation("org.mockito:mockito-inline:5.2.0")
}
