# AGENTS.md

## Project Overview

You are working on an enterprise-grade **Samsung Smart TV app** for **Xtream/Xtreme UI IPTV, VOD, and Series servers**.

The app must be built as a **Samsung Tizen Web Application**. It is **not** an Android app.

The first version of the app must be **fully independent**. It should connect directly to Xtream/Xtreme UI-compatible servers using:

- Server URL
- Username
- Password

Later, after the app is complete, stable, and tested, the direct Xtream data source will be replaced with a custom backend. The frontend architecture must support that future migration without requiring a rewrite of screens, hooks, focus logic, or player UI.

Do **not** build a backend right now.

---

## Core Goal

Build a Samsung Smart TV app that can:

- Connect directly to Xtream/Xtreme UI servers
- Validate user credentials
- Fetch Live TV, VOD, Series, and EPG data
- Display content in a TV-friendly interface
- Play streams using **Samsung AVPlay**
- Handle unstable servers, slow networks, empty data, and malformed responses
- Store local playlists, favorites, settings, and history
- Be easily switched later from direct Xtream mode to backend mode

---

## Target Platform

The target platform is:

```txt
Samsung Smart TV
Tizen OS
Tizen Web Application
```

Use:

```txt
Tizen Studio
Samsung TV Extension
Samsung Certificate Extension
Samsung TV Emulator
Real Samsung TV testing
```

Do **not** use:

```txt
Android Studio emulator
Android TV architecture
Android-native code
```

Samsung Smart TV apps should be treated as Tizen Web Applications, not Android apps.

---

## Recommended Frontend Stack

Use:

```txt
React
TypeScript
Vite
TanStack Query
Zustand
Samsung AVPlay
Custom TV focus/navigation system
CSS Modules or SCSS
```

Optional only when justified:

```txt
Framer Motion
Tailwind CSS
```

Avoid heavy libraries that can hurt Samsung TV performance.

---

## Architecture Philosophy

The app must be:

```txt
Independent now.
Backend-ready always.
```

The UI must never directly call Xtream APIs.

Use this layered architecture:

```txt
React Screens
  ↓
Hooks
  ↓
Repositories / Services
  ↓
Service Interfaces
  ↓
Xtream Service Implementation
  ↓
Xtream Client
```

Later, the app should switch to:

```txt
React Screens
  ↓
Hooks
  ↓
Repositories / Services
  ↓
Service Interfaces
  ↓
Backend Service Implementation
  ↓
Backend Client
```

The UI, hooks, focus logic, and player UI should not need to change.

---

## Required Folder Structure

Use this folder structure:

```txt
src/
├── api/                         # Low-level HTTP clients only
│   ├── httpClient.ts
│   ├── fetchWithTimeout.ts
│   └── retry.ts
│
├── assets/                      # Images, fonts, icons
│
├── components/                  # Reusable UI components
│   ├── ui/                      # Button, Card, Typography, Loader
│   ├── common/                  # Header, Sidebar, EmptyState, ErrorView, PlayerOverlay
│   └── tv/                      # Focusable, SpatialGrid, KeyHandler, FocusBoundary
│
├── features/                    # Screens + feature-specific logic
│   ├── auth/                    # Add playlist, login, account validation
│   ├── home/                    # Home screen, rails, dashboard
│   ├── live-tv/                 # Live categories, channel list
│   ├── vod/                     # Movies, movie details
│   ├── series/                  # Series, seasons, episodes
│   ├── search/                  # Search across live, VOD, series
│   ├── player/                  # Player screen and player UI
│   └── settings/                # Account and app settings
│
├── hooks/                       # Global reusable hooks only
│
├── playback/                    # Samsung AVPlay logic
│   ├── avplayAdapter.ts
│   ├── playerController.ts
│   ├── playerState.ts
│   └── playbackErrors.ts
│
├── providers/                   # App-wide providers
│   ├── QueryProvider.tsx
│   ├── FocusProvider.tsx
│   └── AppProviders.tsx
│
├── services/                    # Main abstraction layer
│   ├── interfaces/              # Service contracts
│   │   ├── contentService.ts
│   │   ├── accountService.ts
│   │   ├── playbackService.ts
│   │   └── userDataService.ts
│   │
│   ├── xtream/                  # Current independent implementation
│   │   ├── xtreamClient.ts
│   │   ├── xtreamTypes.ts
│   │   ├── xtreamMapper.ts
│   │   ├── xtreamUrlBuilder.ts
│   │   └── xtreamErrors.ts
│   │
│   ├── backend/                 # Future backend implementation
│   │   ├── backendClient.ts
│   │   ├── backendMapper.ts
│   │   └── backendServices.ts
│   │
│   └── index.ts                 # Factory/export active service
│
├── storage/                     # Local persistence wrapper
│   ├── localStorageService.ts
│   ├── playlistStorage.ts
│   ├── favoritesStorage.ts
│   └── recentlyWatchedStorage.ts
│
├── store/                       # Zustand global state
│   ├── authStore.ts
│   ├── playerStore.ts
│   ├── settingsStore.ts
│   └── focusStore.ts
│
├── styles/                      # Global CSS, design tokens, keyframes
│
├── types/                       # App-level TypeScript models
│   ├── appModels.ts
│   ├── errors.ts
│   └── navigation.ts
│
└── utils/                       # Pure helper functions
    ├── normalizeServerUrl.ts
    ├── formatTime.ts
    ├── imageFallback.ts
    └── logger.ts
```

---

## Folder Rules

### `api/`

`api/` is only for low-level HTTP helpers.

Allowed examples:

```txt
httpClient.ts
fetchWithTimeout.ts
retry.ts
```

Do **not** put Xtream business methods inside `api/`.

Bad:

```txt
api/getLiveStreams.ts
api/getVodCategories.ts
api/getSeriesInfo.ts
```

Those belong in:

```txt
services/xtream/
```

### `services/`

`services/` is the main abstraction layer.

It must contain:

```txt
services/interfaces/
services/xtream/
services/backend/
```

`services/interfaces/` contains contracts that both Xtream and backend implementations must follow.

`services/xtream/` contains the current direct Xtream implementation.

`services/backend/` is reserved for the future backend implementation.

### `playback/`

`playback/` contains Samsung AVPlay logic only.

Do not put low-level AVPlay calls directly inside React components.

Use:

```txt
playback/avplayAdapter.ts
playback/playerController.ts
playback/playerState.ts
playback/playbackErrors.ts
```

### `features/player/`

`features/player/` contains the player screen and player UI.

It may use `playback/playerController.ts`, but it should not directly call `webapi.avplay`.

### `storage/`

`storage/` handles persistence.

Store these through storage services:

- Playlists
- Credentials
- Selected playlist
- Favorites
- Recently watched
- Continue watching
- App settings
- Last watched channel

Do not call `localStorage` directly throughout the app.

### `store/`

`store/` handles runtime global state with Zustand.

Examples:

```txt
authStore.ts
playerStore.ts
settingsStore.ts
focusStore.ts
```

Do not use Zustand as a replacement for all server-state caching. Use TanStack Query for server data.

### `hooks/`

Only global reusable hooks should go in `hooks/`.

Examples:

```txt
useDebouncedValue.ts
useNetworkStatus.ts
usePrevious.ts
```

Feature-specific hooks should stay inside their feature folder.

Example:

```txt
features/live-tv/hooks/useLiveStreams.ts
```

### `utils/`

`utils/` contains pure helper functions only.

Examples:

```txt
normalizeServerUrl.ts
formatTime.ts
imageFallback.ts
logger.ts
```

Do not put business workflows in `utils/`.

---

## App-Level Data Models

The app screens must only use app-level models.

Do **not** expose raw Xtream response fields to screens.

Create models like:

```ts
export type AppCategory = {
  id: string;
  name: string;
  type: "live" | "vod" | "series";
};

export type AppChannel = {
  id: string;
  title: string;
  logoUrl?: string;
  categoryId?: string;
  streamType: "live";
};

export type AppMovie = {
  id: string;
  title: string;
  posterUrl?: string;
  categoryId?: string;
  extension?: string;
};

export type AppMovieDetails = AppMovie & {
  description?: string;
  rating?: string;
  releaseDate?: string;
  duration?: string;
  genre?: string;
  backdropUrl?: string;
};

export type AppSeries = {
  id: string;
  title: string;
  posterUrl?: string;
  categoryId?: string;
};

export type AppSeriesDetails = {
  id: string;
  title: string;
  posterUrl?: string;
  description?: string;
  rating?: string;
  genre?: string;
  seasons: AppSeason[];
};

export type AppSeason = {
  seasonNumber: number;
  episodes: AppEpisode[];
};

export type AppEpisode = {
  id: string;
  title: string;
  seasonNumber?: number;
  episodeNumber?: number;
  extension?: string;
  description?: string;
  duration?: string;
  posterUrl?: string;
};

export type AppEpgItem = {
  id?: string;
  title: string;
  description?: string;
  start: string;
  end: string;
};
```

Raw Xtream fields such as these must only exist inside Xtream types and mappers:

```txt
stream_id
stream_icon
category_id
container_extension
series_id
cover
plot
rating
episode_num
```

---

## Service Interface Requirements

Create interfaces based on what the app needs, not what Xtream returns.

Example:

```ts
import {
  AppCategory,
  AppChannel,
  AppMovie,
  AppMovieDetails,
  AppSeries,
  AppSeriesDetails,
  AppEpgItem,
} from "../../types/appModels";

export interface ContentService {
  getLiveCategories(): Promise<AppCategory[]>;
  getLiveStreams(categoryId?: string): Promise<AppChannel[]>;

  getVodCategories(): Promise<AppCategory[]>;
  getVodStreams(categoryId?: string): Promise<AppMovie[]>;
  getVodInfo(vodId: string): Promise<AppMovieDetails>;

  getSeriesCategories(): Promise<AppCategory[]>;
  getSeries(categoryId?: string): Promise<AppSeries[]>;
  getSeriesInfo(seriesId: string): Promise<AppSeriesDetails>;

  getShortEpg(streamId: string): Promise<AppEpgItem[]>;
}
```

Create additional interfaces:

```txt
AccountService
PlaybackService
UserDataService
```

`XtreamContentService` must implement `ContentService` now.

`BackendContentService` must be able to implement the same interface later.

---

## Xtream API Requirements

Implement support for common Xtream-compatible endpoints.

### Account Info

```txt
GET /player_api.php?username=USER&password=PASSWORD
```

### Live Categories

```txt
GET /player_api.php?username=USER&password=PASSWORD&action=get_live_categories
```

### Live Streams

```txt
GET /player_api.php?username=USER&password=PASSWORD&action=get_live_streams
```

### Live Streams by Category

```txt
GET /player_api.php?username=USER&password=PASSWORD&action=get_live_streams&category_id=ID
```

### VOD Categories

```txt
GET /player_api.php?username=USER&password=PASSWORD&action=get_vod_categories
```

### VOD Streams

```txt
GET /player_api.php?username=USER&password=PASSWORD&action=get_vod_streams
```

### VOD Streams by Category

```txt
GET /player_api.php?username=USER&password=PASSWORD&action=get_vod_streams&category_id=ID
```

### VOD Info

```txt
GET /player_api.php?username=USER&password=PASSWORD&action=get_vod_info&vod_id=ID
```

### Series Categories

```txt
GET /player_api.php?username=USER&password=PASSWORD&action=get_series_categories
```

### Series List

```txt
GET /player_api.php?username=USER&password=PASSWORD&action=get_series
```

### Series by Category

```txt
GET /player_api.php?username=USER&password=PASSWORD&action=get_series&category_id=ID
```

### Series Info

```txt
GET /player_api.php?username=USER&password=PASSWORD&action=get_series_info&series_id=ID
```

### Short EPG

```txt
GET /player_api.php?username=USER&password=PASSWORD&action=get_short_epg&stream_id=ID
```

### XMLTV EPG

```txt
GET /xmltv.php?username=USER&password=PASSWORD
```

Avoid loading full XMLTV EPG at startup because it can be very large.

---

## Playback URL Generation

Create a dedicated Xtream URL builder.

### Live TV URL

```txt
SERVER/live/USERNAME/PASSWORD/STREAM_ID.ts
```

Also support:

```txt
SERVER/live/USERNAME/PASSWORD/STREAM_ID.m3u8
```

### VOD URL

```txt
SERVER/movie/USERNAME/PASSWORD/VOD_ID.EXTENSION
```

### Series Episode URL

```txt
SERVER/series/USERNAME/PASSWORD/EPISODE_ID.EXTENSION
```

Do not hardcode only one extension.

Rules:

- Use `container_extension` when available
- Default live extension can be `ts`
- Default VOD/series extension can be `mp4` if missing
- Keep playback URL generation inside `xtreamUrlBuilder.ts`
- Later, backend mode may return signed playback URLs instead

---

## Connection Flow

The first app milestone must include a working **Add Playlist / Login** screen.

The user enters:

```txt
Server URL
Username
Password
```

The app should:

1. Normalize the server URL.
2. Call `player_api.php`.
3. Validate the response.
4. Check `user_info.auth === 1`.
5. Check `user_info.status === "Active"`.
6. Fetch live categories.
7. Fetch live streams.
8. Save playlist locally if valid.
9. Show meaningful errors if invalid.

---

## Error Handling

Handle these errors:

```txt
Invalid server URL
Server unreachable
Timeout
Invalid username or password
Account expired
Account disabled/banned
Empty content
Invalid JSON/malformed response
Playback failed
Unknown error
```

Do not show raw technical errors to users.

Use user-friendly error messages such as:

```txt
Unable to connect to the server.
Please check your server URL and try again.
```

```txt
Invalid username or password.
Please check your playlist details.
```

```txt
Your account appears to be expired.
Please contact your provider.
```

Keep technical details in logs.

Use a central error mapper.

Example app error type:

```ts
export type AppErrorCode =
  | "INVALID_SERVER_URL"
  | "SERVER_UNREACHABLE"
  | "TIMEOUT"
  | "INVALID_CREDENTIALS"
  | "ACCOUNT_EXPIRED"
  | "ACCOUNT_DISABLED"
  | "EMPTY_CONTENT"
  | "INVALID_RESPONSE"
  | "PLAYBACK_FAILED"
  | "UNKNOWN";
```

---

## Local Storage Requirements

Since the app is independent in Phase 1, store these locally:

```txt
playlists
server URL
username
password
selected playlist
favorites
recently watched
continue watching
app settings
last watched channel
```

Use a storage service wrapper.

Do not call `localStorage` directly outside storage services.

Example files:

```txt
storage/localStorageService.ts
storage/playlistStorage.ts
storage/favoritesStorage.ts
storage/recentlyWatchedStorage.ts
```

---

## Data Fetching Rules

Use TanStack Query for:

- Caching
- Retries
- Loading states
- Error states
- Stale time
- Avoiding duplicate requests

Suggested cache rules:

| Data | Suggested Cache |
|---|---:|
| Account info | 5–15 minutes |
| Live categories | 30–60 minutes |
| Live streams | 10–30 minutes |
| VOD categories | 1–6 hours |
| VOD list | 30–120 minutes |
| Series categories | 1–6 hours |
| Series list | 30–120 minutes |
| VOD details | 6–24 hours |
| Short EPG | 5–15 minutes |

Avoid loading full XMLTV EPG at startup.

---

## Network Reliability

Implement:

```txt
fetchWithTimeout
retry helper
central error mapper
request logging
```

Use a 10–15 second timeout for API requests.

Safe retry rules:

| Request Type | Retry Rule |
|---|---:|
| Account login | Retry once |
| Categories | Retry twice |
| Stream lists | Retry twice |
| VOD/Series info | Retry twice |
| EPG | Retry once |
| Playback | Handle through AVPlay error handling |

Do not retry endlessly.

Do not freeze the UI while waiting.

---

## TV UX Requirements

This is a TV app, not a normal website.

Implement remote-control navigation:

```txt
Up
Down
Left
Right
Enter
Back/Return
Play/Pause
Rewind
Fast Forward
```

Create a proper focus system with:

- Current focused element
- Focus groups
- Horizontal rails
- Vertical lists/grids
- Modal focus trap
- Restore focus when returning to a screen
- Back button behavior
- Scroll focused item into view
- Prevention against lost focus

Do not rely only on:

```txt
Mouse
Touch
Browser tab navigation
```

---

## UI Requirements

Use a 10-foot TV interface.

The UI should include:

- Large text
- Clear focus states
- Big cards
- Strong contrast
- Smooth but lightweight transitions
- Skeleton loading
- Empty states
- Broken image fallback
- Retry buttons
- Simple navigation
- Fast access to playback

Avoid:

- Tiny text
- Mouse-only hover behavior
- Too many nested menus
- Heavy animations
- Overloaded screens
- Large unoptimized images
- Huge DOM lists without virtualization

---

## Core Screens

### Phase 1

```txt
Splash
Add Playlist / Login
Connection Test
Home
Live TV Categories
Live Channel List
Player
Settings
```

### Phase 2

```txt
VOD Categories
VOD List
Movie Details
VOD Player
Series Categories
Series List
Series Details
Seasons/Episodes
Episode Player
```

### Phase 3

```txt
Search
Favorites
Recently Watched
Continue Watching
EPG
Multiple Playlists
Parental Lock if needed
```

---

## Playback Requirements

Use **Samsung AVPlay** as the main playback engine.

Do not use normal HTML `<video>` as the main Samsung TV playback solution.

Create:

```txt
playback/avplayAdapter.ts
playback/playerController.ts
playback/playerState.ts
playback/playbackErrors.ts
```

Player states:

```txt
IDLE
LOADING
READY
PLAYING
PAUSED
BUFFERING
SEEKING
ENDED
ERROR
RELEASING
```

Basic AVPlay flow:

1. Stop and close previous player if any.
2. Open stream URL.
3. Set display rectangle.
4. Prepare async.
5. Play.
6. Listen for buffering, errors, and completion.
7. Stop and close on exit.
8. Clear listeners.
9. Reset state.

The player must handle:

- Loading
- Buffering
- Playback failed
- Back button exit
- Channel switching
- Stream unavailable
- Proper resource release

Never call `webapi.avplay` randomly from React components.

Only call Samsung AVPlay through the playback adapter/controller.

---

## Development Milestones

### Milestone 1: Foundation

Build:

```txt
Project setup
Folder structure
TypeScript app models
Service interfaces
Xtream client
Xtream URL builder
Xtream mappers
URL normalization
fetchWithTimeout
retry helper
error mapper
local storage service
connection test
local playlist storage
account validation
```

### Milestone 2: Live TV

Build:

```txt
Live categories
Live streams
Channel list
Live playback URL builder
AVPlay live playback
Player error states
```

### Milestone 3: TV UX

Build:

```txt
Focus engine
Remote navigation
Back behavior
Loading skeletons
Retry states
Empty states
Broken image fallback
```

### Milestone 4: VOD

Build:

```txt
VOD categories
VOD listing
VOD details
VOD playback
```

### Milestone 5: Series

Build:

```txt
Series categories
Series listing
Series details
Seasons
Episodes
Episode playback
```

### Milestone 6: User Features

Build:

```txt
Search
Favorites
Recently watched
Continue watching
Multiple playlists
Settings
```

### Milestone 7: Hardening

Build/test:

```txt
Performance optimization
Memory leak checks
Network failure handling
Real Samsung TV testing
Tizen packaging/signing
Samsung certification preparation
```

---

## Future Backend Migration

Later, the app should support:

```txt
BackendContentService implements ContentService
BackendAccountService implements AccountService
BackendPlaybackService implements PlaybackService
BackendUserDataService implements UserDataService
```

The app should be able to switch between:

```txt
DATA_SOURCE_MODE=xtream
```

and:

```txt
DATA_SOURCE_MODE=backend
```

The UI should not change.

The backend mode may eventually provide:

- Auth/session handling
- User profiles
- Favorites sync
- Continue watching sync
- Entitlements
- Signed playback URLs
- Remote config
- App announcements
- Analytics
- Search indexing
- EPG processing

Do not build these backend features now. Only prepare the frontend architecture for them.

---

## Non-Negotiable Rules

Do not build a backend now.

Do not use Android architecture.

Do not use Android Studio emulator.

Do not let React screens call Xtream endpoints directly.

Do not store business logic in UI components.

Do not hardcode only one stream extension.

Do not load full EPG at startup.

Do not use HTML video as the main Samsung TV playback solution.

Do not mix Samsung AVPlay logic into React components.

Do not put Xtream business logic inside `api/`.

Do not combine VOD and Series into one feature folder.

Do not call `localStorage` directly outside storage services.

Do not make the app a quick prototype.

Build it cleanly as an independent but backend-ready app.

---

## First Task for Coding Agents

Start by creating:

```txt
Project architecture
Folder structure
TypeScript app models
Service interfaces
Xtream client
Xtream URL builder
Xtream mappers
fetchWithTimeout
retry helper
error mapper
local storage service
basic Add Playlist / Connection Test flow
```

After that, implement:

```txt
Live TV fetching
Live channel listing
Live playback URL generation
Samsung AVPlay playback
```

Do this before implementing:

```txt
VOD
Series
EPG
Favorites
Search
Recently watched
Continue watching
```

The first goal is to make **Live TV fetching and playback bulletproof**.
