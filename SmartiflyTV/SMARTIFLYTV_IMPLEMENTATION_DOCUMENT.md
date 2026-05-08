# SmartiflyTV Implementation Document

Last updated: 2026-05-06
Project root: `E:\Smartifly Xtream UI\SmartiflyTV`

## 1. What This App Is
SmartiflyTV is a native Android TV application built with Kotlin and Jetpack Compose for TV.

Implemented product areas:
- device onboarding and activation flow
- profile selection and profile-aware filtering
- home, movies, series, live TV (with EPG), search, watchlist, settings
- player with Media3/ExoPlayer, PiP, skip intro, settings/track overlays, progress sync
- Android TV launcher channel + Watch Next integration
- Firebase integrations for telemetry/crash and cloud repositories

## 2. Tech Stack Implemented
- Kotlin
- Jetpack Compose + Compose Material3 + AndroidX TV Foundation/Material
- Retrofit + Gson
- DataStore + SharedPreferences
- Media3 ExoPlayer + PlayerView
- Coil
- WorkManager
- Android TV Provider APIs
- Firebase Auth/Firestore/Analytics/Crashlytics

## 3. Build Variants and API URL Wiring Implemented
- `debug` -> `SMARTIFLY_API_BASE_URL_DEV`
- `staging` -> `SMARTIFLY_API_BASE_URL_STAGING`
- `release` -> `SMARTIFLY_API_BASE_URL_PROD`
- fallback chain in all variants: `SMARTIFLY_API_BASE_URL` then `https://api.smartifly.tv/v1/`

Configured in:
- `app/build.gradle.kts`
- `gradle.properties`
- `app/src/main/java/com/smartifly/tv/data/remote/ApiClient.kt`

## 4. Platform/App Capabilities Implemented
- internet access
- EPG read/write permissions
- leanback launcher category
- PiP activity support
- deep links (`smartifly://video/...`)
- launcher/watch-next publishing

## 5. Navigation and Runtime Flow Implemented
- Entry: `MainActivity`
- Root graph: `SmartiflyNavGraph`
- Destination enum includes:
  - Home, Movies, Series, Live, Search, Watchlist, Details, Player, Settings
- Runtime gates:
  - onboarding status gate
  - blocked device gate
  - profile selection gate
- Main shell:
  - sidebar-driven destination switching
  - deep-link player handoff

## 6. Feature Modules Implemented
- onboarding
- profiles
- home
- movies
- series
- live + epg
- search
- details
- watchlist
- settings

## 7. Playback Stack Implemented
- stream resolution repository
- exoplayer setup helper
- controls overlay
- settings overlay
- skip-intro overlay
- up-next overlay component
- track selection manager
- watch progress save
- telemetry playback events
- PiP manager + action handler

## 8. Data and Domain Layer Implemented
- API interface endpoints:
  - home, movies, series, search, content/{id}, live/categories, live/channels, stream/{id}
- DTOs + mapper + repositories
- domain models:
  - movie metadata
  - episode metadata
  - channel metadata
  - user profile

## 9. Performance/Device Adaptation Implemented
- low-end mode manager
- device capability detector
- performance config
- image preloader
- row prefetch manager
- memory trim handler
- app initializer

## 10. TV Launcher + Watch Next Implemented
- channel create/update
- program publish/update
- watch-next progress row updates
- periodic + one-shot sync worker hooks

## 11. UI System Implemented
- theme files for color/type/dimensions/theme
- reusable TV-focused base and content components
- sidebar nav
- search keyboard
- shimmer/loading primitives

## 12. Build Verification Status
Verified in this workspace:
- `:app:compileDebugKotlin` success
- `:app:assembleDebug` success
- `:app:compileReleaseKotlin` success
- `:app:compileStagingKotlin` success
- `:app:assembleStaging` success

## 13. Complete File Inventory
- app\build.gradle.kts
- app\google-services.json
- app\proguard-rules.pro
- app\src\main\AndroidManifest.xml
- app\src\main\java\com\smartifly\tv\analytics\TelemetryManager.kt
- app\src\main\java\com\smartifly\tv\data\cloud\CloudProfileRepository.kt
- app\src\main\java\com\smartifly\tv\data\cloud\CloudResumeRepository.kt
- app\src\main\java\com\smartifly\tv\data\cloud\CloudWatchlistRepository.kt
- app\src\main\java\com\smartifly\tv\data\cloud\FirebaseClient.kt
- app\src\main\java\com\smartifly\tv\data\epg\EpgRepository.kt
- app\src\main\java\com\smartifly\tv\data\epg\EpgSearchRepository.kt
- app\src\main\java\com\smartifly\tv\data\epg\XmlTvParser.kt
- app\src\main\java\com\smartifly\tv\data\mapper\ContentMapper.kt
- app\src\main\java\com\smartifly\tv\data\models\ChannelMetadata.kt
- app\src\main\java\com\smartifly\tv\data\models\EpisodeMetadata.kt
- app\src\main\java\com\smartifly\tv\data\models\MovieMetadata.kt
- app\src\main\java\com\smartifly\tv\data\models\UserProfile.kt
- app\src\main\java\com\smartifly\tv\data\onboarding\ActivationStateManager.kt
- app\src\main\java\com\smartifly\tv\data\onboarding\OnboardingModels.kt
- app\src\main\java\com\smartifly\tv\data\onboarding\OnboardingRepository.kt
- app\src\main\java\com\smartifly\tv\data\onboarding\RemoteDeviceControlManager.kt
- app\src\main\java\com\smartifly\tv\data\remote\ApiClient.kt
- app\src\main\java\com\smartifly\tv\data\remote\dto\ContentDetailsDto.kt
- app\src\main\java\com\smartifly\tv\data\remote\dto\ContentDto.kt
- app\src\main\java\com\smartifly\tv\data\remote\dto\LiveTvDto.kt
- app\src\main\java\com\smartifly\tv\data\remote\dto\StreamDto.kt
- app\src\main\java\com\smartifly\tv\data\remote\SmartiflyApi.kt
- app\src\main\java\com\smartifly\tv\data\repository\ContentRepository.kt
- app\src\main\java\com\smartifly\tv\data\repository\LiveTvRepository.kt
- app\src\main\java\com\smartifly\tv\data\repository\ProfileRepository.kt
- app\src\main\java\com\smartifly\tv\data\repository\RecommendationRepository.kt
- app\src\main\java\com\smartifly\tv\data\repository\SearchRepository.kt
- app\src\main\java\com\smartifly\tv\data\repository\StreamRepository.kt
- app\src\main\java\com\smartifly\tv\data\repository\WatchlistRepository.kt
- app\src\main\java\com\smartifly\tv\data\ResumeWatchingRepository.kt
- app\src\main\java\com\smartifly\tv\data\SettingsManager.kt
- app\src\main\java\com\smartifly\tv\features\details\ContentDetailsScreen.kt
- app\src\main\java\com\smartifly\tv\features\details\ContentDetailsUiState.kt
- app\src\main\java\com\smartifly\tv\features\details\ContentDetailsViewModel.kt
- app\src\main\java\com\smartifly\tv\features\home\HomeScreen.kt
- app\src\main\java\com\smartifly\tv\features\home\HomeUiState.kt
- app\src\main\java\com\smartifly\tv\features\home\HomeViewModel.kt
- app\src\main\java\com\smartifly\tv\features\live\epg\EpgGridScreen.kt
- app\src\main\java\com\smartifly\tv\features\live\epg\EpgProgram.kt
- app\src\main\java\com\smartifly\tv\features\live\epg\EpgProgramCell.kt
- app\src\main\java\com\smartifly\tv\features\live\epg\EpgViewModel.kt
- app\src\main\java\com\smartifly\tv\features\live\LiveCategoryRail.kt
- app\src\main\java\com\smartifly\tv\features\live\LiveChannelGrid.kt
- app\src\main\java\com\smartifly\tv\features\live\LiveProgramInfo.kt
- app\src\main\java\com\smartifly\tv\features\live\LiveScreen.kt
- app\src\main\java\com\smartifly\tv\features\live\LiveUiState.kt
- app\src\main\java\com\smartifly\tv\features\live\LiveViewModel.kt
- app\src\main\java\com\smartifly\tv\features\movies\MoviesScreen.kt
- app\src\main\java\com\smartifly\tv\features\movies\MoviesUiState.kt
- app\src\main\java\com\smartifly\tv\features\movies\MoviesViewModel.kt
- app\src\main\java\com\smartifly\tv\features\onboarding\DeviceActivationScreen.kt
- app\src\main\java\com\smartifly\tv\features\onboarding\OnboardingViewModel.kt
- app\src\main\java\com\smartifly\tv\features\onboarding\WelcomeScreen.kt
- app\src\main\java\com\smartifly\tv\features\profiles\ContentRestrictionManager.kt
- app\src\main\java\com\smartifly\tv\features\profiles\ProfileSelectionScreen.kt
- app\src\main\java\com\smartifly\tv\features\profiles\ProfilesUiState.kt
- app\src\main\java\com\smartifly\tv\features\profiles\ProfilesViewModel.kt
- app\src\main\java\com\smartifly\tv\features\search\EpgResultCard.kt
- app\src\main\java\com\smartifly\tv\features\search\SearchScreen.kt
- app\src\main\java\com\smartifly\tv\features\search\SearchUiState.kt
- app\src\main\java\com\smartifly\tv\features\search\SearchViewModel.kt
- app\src\main\java\com\smartifly\tv\features\series\SeasonEpisodeRow.kt
- app\src\main\java\com\smartifly\tv\features\series\SeriesScreen.kt
- app\src\main\java\com\smartifly\tv\features\series\SeriesUiState.kt
- app\src\main\java\com\smartifly\tv\features\series\SeriesViewModel.kt
- app\src\main\java\com\smartifly\tv\features\settings\SettingsScreen.kt
- app\src\main\java\com\smartifly\tv\features\watchlist\WatchlistScreen.kt
- app\src\main\java\com\smartifly\tv\features\watchlist\WatchlistUiState.kt
- app\src\main\java\com\smartifly\tv\features\watchlist\WatchlistViewModel.kt
- app\src\main\java\com\smartifly\tv\MainActivity.kt
- app\src\main\java\com\smartifly\tv\navigation\Destination.kt
- app\src\main\java\com\smartifly\tv\navigation\SmartiflyNavGraph.kt
- app\src\main\java\com\smartifly\tv\performance\AppInitializer.kt
- app\src\main\java\com\smartifly\tv\performance\ImagePreloader.kt
- app\src\main\java\com\smartifly\tv\performance\lowend\DeviceCapabilityDetector.kt
- app\src\main\java\com\smartifly\tv\performance\lowend\LowEndModeManager.kt
- app\src\main\java\com\smartifly\tv\performance\lowend\PerformanceConfig.kt
- app\src\main\java\com\smartifly\tv\performance\MemoryTrimHandler.kt
- app\src\main\java\com\smartifly\tv\performance\RowPrefetchManager.kt
- app\src\main\java\com\smartifly\tv\player\drm\DrmConfig.kt
- app\src\main\java\com\smartifly\tv\player\ExoPlayerHelper.kt
- app\src\main\java\com\smartifly\tv\player\pip\PipActionHandler.kt
- app\src\main\java\com\smartifly\tv\player\pip\PipManager.kt
- app\src\main\java\com\smartifly\tv\player\PlayerControls.kt
- app\src\main\java\com\smartifly\tv\player\PlayerScreen.kt
- app\src\main\java\com\smartifly\tv\player\PlayerSettingsOverlay.kt
- app\src\main\java\com\smartifly\tv\player\SkipIntroOverlay.kt
- app\src\main\java\com\smartifly\tv\player\TrackSelectionManager.kt
- app\src\main\java\com\smartifly\tv\player\UpNextOverlay.kt
- app\src\main\java\com\smartifly\tv\player\WatchProgressManager.kt
- app\src\main\java\com\smartifly\tv\tvlauncher\ChannelManager.kt
- app\src\main\java\com\smartifly\tv\tvlauncher\TvLauncherSyncWorker.kt
- app\src\main\java\com\smartifly\tv\ui\components\base\BaseFocusableCard.kt
- app\src\main\java\com\smartifly\tv\ui\components\base\ContentDetailsPanel.kt
- app\src\main\java\com\smartifly\tv\ui\components\base\PosterGrid.kt
- app\src\main\java\com\smartifly\tv\ui\components\base\ShimmerComponents.kt
- app\src\main\java\com\smartifly\tv\ui\components\base\SideCategoryRail.kt
- app\src\main\java\com\smartifly\tv\ui\components\content\ContinueWatchingCard.kt
- app\src\main\java\com\smartifly\tv\ui\components\content\HeroBanner.kt
- app\src\main\java\com\smartifly\tv\ui\components\content\LiveChannelCard.kt
- app\src\main\java\com\smartifly\tv\ui\components\content\PosterCard.kt
- app\src\main\java\com\smartifly\tv\ui\components\navigation\SidebarNav.kt
- app\src\main\java\com\smartifly\tv\ui\components\rows\PosterRow.kt
- app\src\main\java\com\smartifly\tv\ui\components\search\SearchKeyboard.kt
- app\src\main\java\com\smartifly\tv\ui\theme\Color.kt
- app\src\main\java\com\smartifly\tv\ui\theme\Dimensions.kt
- app\src\main\java\com\smartifly\tv\ui\theme\Theme.kt
- app\src\main\java\com\smartifly\tv\ui\theme\Type.kt
- app\src\main\res\drawable\ic_launcher_background.xml
- app\src\main\res\drawable\tv_banner.xml
- app\src\main\res\values\strings.xml
- app\src\main\res\values\themes.xml
- build.gradle.kts
- build_error.log
- gradle.properties
- gradle\wrapper\gradle-wrapper.jar
- gradle\wrapper\gradle-wrapper.properties
- gradlew
- gradlew.bat
- settings.gradle.kts
- SMARTIFLYTV_IMPLEMENTATION_DOCUMENT.md
