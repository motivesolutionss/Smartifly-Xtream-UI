# SmartiflyTV Release Gate Checklist

## 1. Environment Sanity
- [ ] Close Android Studio and any duplicate Gradle processes.
- [ ] Run `.\gradlew.bat --stop` from `SmartiflyTV`.
- [ ] Ensure no Gradle wrapper lock file is blocking test runs.
  - Path pattern: `%USERPROFILE%\.gradle\wrapper\dists\gradle-8.7-bin\**\gradle-8.7-bin.zip.lck`

## 2. Build Gates (Must Pass)
- [ ] Kotlin compile:
  - `.\gradlew.bat :app:compileDebugKotlin --console=plain`
- [ ] Unit tests:
  - `.\gradlew.bat :app:testDebugUnitTest --console=plain`
- [ ] Lint:
  - `.\gradlew.bat :app:lintDebug --console=plain`

## 3. Xtream Protocol Validation
- [ ] Login works with at least 2 distinct Xtream providers.
- [ ] `get_live_categories`, `get_vod_categories`, `get_series_categories` succeed.
- [ ] `get_live_streams`, `get_vod_streams`, `get_series` succeed.
- [ ] `get_vod_info` and `get_series_info` succeed.
- [ ] `get_short_epg` returns expected listings for at least one live channel.
- [ ] Live pagination behavior verified:
  - [ ] Provider with true paging.
  - [ ] Provider returning snapshot/full list ignoring page params.

## 4. Data & Cache Integrity
- [ ] Category cache isolated per provider/type.
- [ ] Stream cache isolated per provider/type/category.
- [ ] No cross-provider leakage after switching accounts/portals.
- [ ] Sync-state rows update on success and failure.
- [ ] No stuck loading state when sync fails and cache is empty.

## 5. Image Pipeline Validation
- [ ] Posters render on Movies rails.
- [ ] Backdrops render on Home Hero and Details.
- [ ] Live logos render in Live cards.
- [ ] Invalid image URLs fall back gracefully (no crashes).
- [ ] Relative/protocol-relative image URLs resolve correctly.
- [ ] Fallback art appears when all remote candidates fail.

## 6. Feature Flows
- [ ] Home screen loads rails and hero without regressions.
- [ ] Movies screen category switching and prefetch work.
- [ ] Series screen category switching and prefetch work.
- [ ] Live screen category switching, load-more, and EPG focus refresh work.
- [ ] Content Details loads metadata and similar content.
- [ ] Playback launches for live/movie/series with fallback URLs where applicable.

## 7. Migration & Upgrade
- [ ] Upgrade from previous app version without startup crash.
- [ ] Existing users can log in and fetch content post-migration.
- [ ] Cache repopulation works after migration.

## 8. Release Decision
- [ ] All build gates passed.
- [ ] Manual QA matrix passed for both providers.
- [ ] No critical/high severity defects open.
- [ ] Go/No-Go approved.

