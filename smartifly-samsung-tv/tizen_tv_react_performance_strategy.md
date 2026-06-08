# Tizen TV React App Performance Strategy

This document is a practical performance checklist for a **React-based Samsung Tizen TV app**, especially for apps with IPTV, live TV, movies, series, EPG, player screens, remote navigation, and large media catalogs.

The main performance goals for a Tizen TV app are:

```txt
startup speed
smooth remote navigation
low memory usage
stable video playback
fast screen switching
avoiding unnecessary re-renders
```

---

## 1. Core Performance Mindset

For Tizen TV, optimize for:

```txt
less JavaScript at startup
less work per remote click
fewer DOM nodes
smaller images
clean video/player memory management
careful API and cache strategy
```

Breaking large pages into smaller components helps **code quality** and can make optimization easier, but it does **not automatically improve runtime performance**.

The real performance gains come from:

```txt
code splitting
lazy loading
memoization
virtualization
image optimization
API caching
player cleanup
state isolation
DOM reduction
```

---

## 2. File Splitting vs Code Splitting

### File Splitting

File splitting means breaking one large file into smaller files.

Example:

```txt
MoviesPage.jsx
MovieRow.jsx
MovieCard.jsx
MovieDetailsModal.jsx
```

This helps with:

| Benefit | Impact |
|---|---|
| Readability | High |
| Maintenance | High |
| Debugging | High |
| Reuse | High |
| Runtime performance | Not automatic |

### Code Splitting

Code splitting means loading code **only when needed**.

This can improve performance because the app does not load every feature at startup.

Example:

```jsx
import { lazy, Suspense } from "react";

const MoviesPage = lazy(() => import("./features/movies/pages/MoviesPage"));
const LiveTvPage = lazy(() => import("./features/live-tv/pages/LiveTvPage"));
const SettingsPage = lazy(() => import("./features/settings/pages/SettingsPage"));

function AppRoutes() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      {/* routes here */}
    </Suspense>
  );
}
```

Use code splitting for:

```txt
Movies page
Series page
Live TV page
Player page
Settings page
Search page
Profile page
EPG page
```

Do **not** lazy-load tiny components like:

```txt
Button
Text
Small icon
Simple label
```

---

## 3. Recommended Feature Structure

Use feature-based structure for medium and large apps.

Example:

```txt
src/
├── features/
│   ├── live-tv/
│   │   ├── pages/
│   │   │   └── LiveTvPage.jsx
│   │   ├── components/
│   │   │   ├── ChannelList.jsx
│   │   │   ├── ChannelCard.jsx
│   │   │   ├── PlayerView.jsx
│   │   │   └── ProgramInfo.jsx
│   │   ├── hooks/
│   │   │   ├── useChannels.js
│   │   │   ├── useChannelFocus.js
│   │   │   └── usePlayerControls.js
│   │   └── services/
│   │       └── liveTvApi.js
│   │
│   ├── movies/
│   │   ├── pages/
│   │   │   └── MoviesPage.jsx
│   │   ├── components/
│   │   │   ├── MovieRow.jsx
│   │   │   ├── MovieCard.jsx
│   │   │   └── MovieDetailsModal.jsx
│   │   ├── hooks/
│   │   │   ├── useMovies.js
│   │   │   └── useMovieFocus.js
│   │   └── services/
│   │       └── moviesApi.js
```

Good splitting helps isolate:

```txt
focus logic
API logic
player logic
list rendering
card rendering
modal logic
search logic
EPG logic
```

---

## 4. App Startup Performance

Startup speed is very important on TV.

### Strategies

| Strategy | What it means |
|---|---|
| Reduce initial bundle size | Do not load the whole app at startup |
| Lazy-load pages | Load screens only when user opens them |
| Avoid heavy startup API calls | Do not fetch everything immediately |
| Show lightweight splash/loading screen | Avoid blank screen |
| Delay non-critical work | Load secondary data after first render |
| Remove unused libraries | Every KB matters on TV |
| Minify production build | Use optimized production build |
| Compress assets | Images, fonts, JSON, icons |
| Avoid huge config files at startup | Split large channel/movie data |

### Recommended startup flow

```txt
1. Load app shell
2. Show splash/loading UI
3. Fetch user profile and essential settings
4. Load home page basics
5. Delay heavy content loading
6. Lazy-load other major screens
```

### Avoid

```txt
fetching all movies at startup
fetching all series at startup
fetching full EPG at startup
loading player code before needed
loading settings/search/profile before needed
```

---

## 5. React Rendering Performance

Unnecessary React re-renders can make remote navigation feel slow.

### Strategies

| Strategy | Use when |
|---|---|
| React.memo | Cards, rows, list items |
| useMemo | Expensive calculated values |
| useCallback | Passing callbacks to memoized children |
| Keep state close to where it is used | Avoid re-rendering the whole page |
| Avoid global state for tiny UI changes | Focus index should not update the whole app |
| Split heavy UI into isolated components | Player, list, menu, modal |
| Avoid inline object/array props | They cause child props to look new |
| Avoid unnecessary context updates | Context can re-render many consumers |

### Example: memoized card

```jsx
import { memo } from "react";

const MovieCard = memo(function MovieCard({ movie, isFocused }) {
  return (
    <div className={isFocused ? "focused" : ""}>
      <img src={movie.poster} />
      <p>{movie.title}</p>
    </div>
  );
});

export default MovieCard;
```

Good places for `React.memo`:

```txt
MovieCard
ChannelCard
EpisodeCard
CategoryRow
MenuItem
GridItem
ProgramCell
```

Do not use `React.memo` everywhere blindly. Use it where re-renders are actually expensive.

---

## 6. Focus and Remote-Control Performance

This is one of the most important TV-specific areas.

Every arrow key press should feel instant.

### Strategies

| Strategy | What to do |
|---|---|
| Keep focus state small | Store only focused row/index/id |
| Avoid re-rendering full screen on focus move | Only update previous and next focused item |
| Use CSS class for focus styling | Avoid heavy JS styling |
| Debounce/throttle rapid key events | Prevent input flooding |
| Avoid expensive calculations on keydown | Precompute navigation maps if needed |
| Keep remote handlers stable | Avoid recreating handlers unnecessarily |
| Do not fetch data on every focus change | Fetch on enter/details open, not arrow move |
| Avoid playing preview video on every focus | Delay preview until focus is stable |

### Bad pattern

```jsx
function MoviesPage() {
  const [focusedIndex, setFocusedIndex] = useState(0);

  return movies.map((movie, index) => (
    <MovieCard
      movie={movie}
      isFocused={focusedIndex === index}
    />
  ));
}
```

This can re-render many cards on every key press.

### Better principle

```txt
Only previous focused item and new focused item should visually update.
Large lists should not fully re-render on every arrow press.
```

### Remote key handling rules

```txt
keydown logic should be lightweight
avoid API calls during arrow movement
avoid filtering/sorting during arrow movement
avoid console.log inside key handlers
avoid updating global app state on every arrow press
```

---

## 7. Long List and Grid Performance

TV apps often have:

```txt
hundreds of channels
thousands of movies
many series
many episodes
large EPG rows
```

Rendering everything at once is expensive.

### Strategies

| Strategy | What it means |
|---|---|
| Virtualize long lists | Render only visible items |
| Paginate data | Load more when needed |
| Window rows/categories | Do not render all rows at once |
| Avoid huge nested grids | Especially movies/series home screens |
| Use skeleton loaders carefully | Too many skeletons also cost performance |
| Recycle item components if possible | Useful for very large TV grids |
| Limit DOM nodes | DOM size matters on TV |

### Example principle

```txt
Instead of rendering 1000 movie cards:
render 20 visible cards + small buffer
```

This can make a huge difference on Samsung TV hardware.

---

## 8. Image Optimization

Images can destroy TV app performance if not handled carefully.

### Strategies

| Strategy | What to do |
|---|---|
| Use correct image sizes | Do not load 4K posters for small cards |
| Compress posters and thumbnails | Reduce memory and loading time |
| Lazy-load images | Load when near visible area |
| Use placeholders | Avoid layout jumps |
| Cache images | Avoid repeated downloads |
| Avoid too many animated images | GIFs can be expensive |
| Use CDN resizing if available | Request exact width/height |
| Clean up unused image references | Prevent memory pressure |

### Recommended image usage

```txt
Card poster: thumbnail size
Details page: medium/large poster
Hero banner: wide optimized banner
Player background: compressed background
```

Avoid using the same huge image everywhere.

---

## 9. Video Player Performance

For IPTV-style apps, video performance is critical.

### Strategies

| Strategy | What to do |
|---|---|
| Keep player isolated | Player state should not re-render whole page |
| Cleanup player on unmount | Stop stream and release resources |
| Avoid multiple video instances | Only one active player |
| Do not keep hidden players alive | Remove unused player views |
| Avoid unnecessary overlays during playback | Heavy overlays can cause dropped frames |
| Reduce frequent player state updates | Progress updates can be throttled |
| Handle buffering cleanly | Avoid repeated retries too fast |
| Use proper stream formats | HLS/DASH compatibility matters |
| Pause/stop playback when app hidden | Use Page Visibility behavior |

### Player cleanup rule

```txt
When leaving player screen:
stop stream
remove event listeners
clear timers
release video references
reset player state if needed
```

### Avoid

```txt
keeping player mounted in hidden screens
running multiple video elements
updating React state every 100ms for progress
rendering heavy overlays during playback
```

---

## 10. API and Network Performance

For IPTV, movies, series, EPG, and account data, network design matters a lot.

### Strategies

| Strategy | What to do |
|---|---|
| Avoid fetching everything at startup | Fetch home essentials first |
| Cache API responses | Especially categories, channels, movies |
| Use pagination | For movies, series, episodes |
| Use request cancellation | Cancel old search/details requests |
| Debounce search | Do not call API on every key instantly |
| Retry carefully | Use exponential backoff |
| Avoid duplicate requests | Deduplicate same endpoint calls |
| Store stable data locally | Categories, settings, user preferences |
| Preload next likely screen | But only when safe |
| Timeout slow requests | Do not hang UI forever |

### Recommended API loading flow

```txt
Startup:
fetch profile + app settings + home essentials only

After startup:
fetch categories/channels/movies in controlled background tasks

When opening details:
fetch selected item details

When opening EPG:
fetch current time window only
```

---

## 11. State Management Performance

Bad state structure can make the full app re-render too often.

### Strategies

| Strategy | What to do |
|---|---|
| Keep local state local | Do not put everything in Redux/Zustand/Context |
| Use global state only for shared data | Auth, user, settings, player, cached data |
| Avoid one giant context | It can re-render many components |
| Split contexts/stores by domain | AuthStore, PlayerStore, SettingsStore |
| Use selectors | Components subscribe only to needed data |
| Do not store derived data unnecessarily | Calculate or memoize it |
| Normalize large data | Store by id instead of duplicated arrays |
| Avoid updating huge arrays | Update only changed item |

### Good store split

```txt
auth store
player store
settings store
content cache store
network/error store
focus/navigation local state
```

### Bad pattern

```txt
One AppContext holding everything:
user
movies
channels
focusIndex
playerState
settings
loading
errors
```

This can cause too many re-renders.

---

## 12. CSS and Animation Performance

TV devices can struggle with heavy visual effects.

### Strategies

| Strategy | What to do |
|---|---|
| Prefer transform and opacity | Better for animations |
| Avoid animating width/height/top/left | Causes layout recalculation |
| Keep transitions short | TV UI should feel fast |
| Avoid heavy shadows and blur | Expensive on lower-end TVs |
| Avoid large fixed backgrounds | Can consume memory |
| Avoid too many simultaneous animations | Especially on home screen |
| Use CSS classes for focus | Better than JS style updates |
| Reduce layout nesting | Simpler DOM = smoother UI |

### Good focus style

```css
.card.focused {
  transform: scale(1.08);
}
```

### Be careful with

```css
filter: blur(...)
box-shadow: huge shadows
backdrop-filter
large gradients
large fixed background images
```

---

## 13. DOM Performance

Large DOM trees are expensive on TV.

### Strategies

| Strategy | What to do |
|---|---|
| Keep DOM small | Do not render hidden huge screens |
| Unmount unused modals/pages | Do not keep everything alive |
| Avoid deeply nested layouts | Simpler layout is faster |
| Batch DOM updates naturally through React | Avoid manual DOM manipulation |
| Avoid frequent layout reads | getBoundingClientRect in loops is costly |
| Avoid forced reflow | Do not read layout immediately after writing styles |
| Use CSS focus classes | Avoid manually updating many DOM nodes |

### Rule

```txt
A page with 500 cards in DOM may feel slow.
A page with 30 visible cards feels much better.
```

---

## 14. JavaScript Optimization

JavaScript work should be light, especially during startup and remote key movement.

### Strategies

| Strategy | What to do |
|---|---|
| Remove console.log in production | Logs slow down TV apps |
| Avoid heavy loops on UI thread | Especially during navigation |
| Use efficient data structures | Maps/objects for lookup |
| Cache repeated calculations | Do not recalculate every render |
| Avoid parsing huge JSON repeatedly | Parse once, cache result |
| Avoid blocking startup | Delay heavy work |
| Use Web Workers for heavy tasks | Search/filter/index large data |
| Avoid memory allocations inside hot paths | Keydown handlers should be light |

### Bad repeated lookup

```jsx
const selectedMovie = movies.find((movie) => movie.id === selectedId);
```

If this happens repeatedly on a huge list, use a lookup map.

### Better

```jsx
const moviesById = useMemo(() => {
  return Object.fromEntries(movies.map((movie) => [movie.id, movie]));
}, [movies]);
```

---

## 15. Search Performance

Search can be heavy on TV, especially with remote typing.

### Strategies

| Strategy | What to do |
|---|---|
| Debounce input | Wait before searching |
| Keep minimum search length | Example: 2 or 3 characters |
| Cancel previous requests | Avoid race conditions |
| Search server-side for big catalogs | Do not filter 20k items on TV |
| Use Web Worker for local search | Keep UI responsive |
| Cache recent searches | Avoid repeat work |
| Limit results | Show top 20/50 first |

### Recommended search flow

```txt
User types input
wait 300ms
cancel old request
perform search once
show limited result set
load more if needed
```

---

## 16. EPG Performance

Electronic Program Guide can be very heavy.

### Strategies

| Strategy | What to do |
|---|---|
| Do not load full EPG at startup | Load current window first |
| Load time ranges | Example: now + next few hours |
| Virtualize channel rows | Only visible channels |
| Virtualize horizontal timeline | Only visible time slots |
| Cache EPG per channel/date | Avoid repeated fetch |
| Avoid full EPG re-render every minute | Update current marker only |
| Use lightweight program cells | Avoid heavy nested content |
| Preload nearby rows | Smooth remote scrolling |

### Bad EPG pattern

```txt
Load 7 days EPG for 1000 channels at startup
```

### Better EPG pattern

```txt
Load current channel group + current time window first
```

---

## 17. Memory Management

Memory pressure is a major issue on TVs.

### Strategies

| Strategy | What to do |
|---|---|
| Cleanup timers | clearInterval, clearTimeout |
| Cleanup event listeners | Remove remote/key handlers |
| Cleanup player resources | Stop stream, release video refs |
| Cleanup subscriptions | WebSocket, API streams, stores |
| Avoid keeping old pages in memory | Unmount heavy screens |
| Avoid storing huge duplicated arrays | Normalize data |
| Avoid base64 images | Use URLs instead |
| Remove hidden heavy components | Especially video/player/modals |
| Clear caches with limits | Do not cache unlimited movies/posters |

### Event listener cleanup example

```jsx
useEffect(() => {
  function handleKeyDown(event) {
    // remote logic
  }

  window.addEventListener("keydown", handleKeyDown);

  return () => {
    window.removeEventListener("keydown", handleKeyDown);
  };
}, []);
```

---

## 18. Build Optimization

For production Tizen builds, make sure the app is built correctly.

### Strategies

| Strategy | What to do |
|---|---|
| Use production build | Never ship dev build |
| Minify JS/CSS | Reduce size |
| Remove source maps if not needed | Smaller package |
| Tree-shake unused code | Remove dead imports |
| Analyze bundle size | Find heavy libraries |
| Use manual chunks carefully | Split vendor/player/features |
| Avoid huge UI libraries | They increase bundle size |
| Prefer lightweight utilities | Import only what you need |

### Build checklist

```txt
run production build
check bundle size
remove unused dependencies
remove production console logs
test build on real TV
```

---

## 19. Library Selection

TV apps should be careful with dependencies.

### Avoid vs Prefer

| Avoid | Prefer |
|---|---|
| Huge UI libraries | Custom TV-focused components |
| Heavy date libraries for simple formatting | Small utilities |
| Heavy animation libraries | CSS transitions |
| Large icon packs imported fully | Import selected icons |
| Big carousel libraries | Custom lightweight rows |
| Complex state libraries for small apps | Simple state + focused store |

Before adding a library, ask:

```txt
Will this increase startup time?
Does it work well on Samsung TV browser?
Can we build this simpler ourselves?
Is this dependency really needed?
```

---

## 20. Routing Performance

### Strategies

| Strategy | What to do |
|---|---|
| Lazy-load route pages | Big win |
| Keep route transitions simple | Avoid heavy animations |
| Avoid mounting all routes at once | Only render active route |
| Preload important next route | Example: preload player before opening |
| Keep layout stable | Header/sidebar should not re-render unnecessarily |

### Good route split

```txt
Auth routes
Home route
Live TV route
Movies route
Series route
Settings route
Player route
Search route
```

---

## 21. Error Handling and Retry Performance

API resilience must be efficient.

### Strategies

| Strategy | What to do |
|---|---|
| Use exponential backoff | Avoid hammering API |
| Limit retry attempts | Do not retry forever |
| Show cached data when offline | Better UX |
| Distinguish timeout vs auth vs server error | Better recovery |
| Cancel retry when screen unmounts | Avoid memory leaks |
| Avoid retry storms | One failing endpoint should not freeze app |
| Centralize API errors | Easier and safer |

### Retry example

```txt
retry after:
500ms
1000ms
2000ms

then stop and show error
```

---

## 22. Caching Strategy

Caching improves speed but can hurt memory if uncontrolled.

### What to cache

| Data | Cache? |
|---|---|
| User profile | Yes |
| App settings | Yes |
| Categories | Yes |
| Channel list | Yes |
| Movie list pages | Yes, with limit |
| Posters/images | Browser/CDN cache |
| Full EPG for all channels | Be careful |
| Video streams | Usually no |
| Search results | Short-term only |

### Cache rules

```txt
Cache useful data.
Limit cache size.
Clear stale data.
Do not duplicate huge datasets.
Prefer IDs and normalized data.
```

---

## 23. App Lifecycle Handling

TV apps can be paused, hidden, resumed, or backgrounded.

### Strategies

| Event | What to do |
|---|---|
| App hidden | Pause video, stop timers, reduce work |
| App visible again | Resume carefully, refresh needed data |
| Network lost | Show offline/retry state |
| Network restored | Revalidate data |
| User exits player | Stop stream and cleanup |
| User logs out | Clear sensitive cache |

### Lifecycle rule

```txt
When app is hidden:
pause video if needed
stop polling
reduce timers
avoid background rendering
```

---

## 24. Testing on Real TV Hardware

Emulator or Chrome performance is not enough.

### Strategies

| Strategy | Why |
|---|---|
| Test on real Samsung TVs | Real hardware is slower/different |
| Test older models | Older TVs expose performance issues |
| Test with large accounts | 1000+ channels/movies |
| Test slow network | IPTV apps must handle it |
| Test long sessions | Memory leaks appear after time |
| Test rapid remote presses | Focus bugs/performance issues |
| Test video switching repeatedly | Player leaks show up here |
| Test app relaunch | Startup performance matters |

### Important rule

```txt
A feature that feels fine in Chrome may feel slow on Tizen TV.
```

---

## 25. Logging and Monitoring

### Strategies

| Strategy | What to do |
|---|---|
| Remove logs in production | Especially inside render/key handlers |
| Log performance marks in dev | Startup, route load, API timing |
| Track memory-like symptoms | Freezes, reloads, black screens |
| Track player errors | Buffering, failed streams |
| Track API latency | Slow endpoints hurt UX |
| Track screen load times | Home, Live TV, Movies, Player |
| Add lightweight error reporting | Avoid heavy SDKs if possible |

### Avoid in production

```jsx
console.log("focused index", focusedIndex);
```

Especially inside remote movement handlers.

---

## 26. Smart TV UX Performance

Performance is also about how fast the app **feels**.

### Strategies

| Strategy | Why |
|---|---|
| Show immediate focus movement | User feels control |
| Use skeletons/loading states | Avoid blank screen |
| Keep animations short | TV UI should be responsive |
| Avoid blocking overlays | They make app feel frozen |
| Give clear retry buttons | Better than endless spinner |
| Keep player controls simple | Heavy controls can lag |
| Use predictable navigation | Reduces user frustration |

A TV app must feel smooth with:

```txt
up
down
left
right
enter
back
```

---

## 27. Priority Order for Our Tizen TV App

If we want the biggest real-world gains, prioritize like this:

| Priority | Strategy |
|---:|---|
| 1 | Reduce startup bundle and lazy-load big screens |
| 2 | Optimize remote focus movement |
| 3 | Virtualize long lists/grids |
| 4 | Optimize images/posters/logos |
| 5 | Isolate video player state and cleanup properly |
| 6 | Reduce unnecessary React re-renders |
| 7 | Cache API data carefully |
| 8 | Remove production logs and heavy debug code |
| 9 | Optimize EPG loading/windowing |
| 10 | Test repeatedly on real Samsung TV hardware |

---

## 28. AI Agent Implementation Checklist

Use this section as direct instructions for an AI coding agent.

### Startup

```txt
- Audit initial bundle size.
- Add lazy loading for major route pages.
- Remove unnecessary startup API calls.
- Delay non-critical data fetching.
- Ensure app shows lightweight startup UI.
- Remove unused dependencies.
```

### React Rendering

```txt
- Identify components that re-render during remote navigation.
- Memoize heavy cards, rows, and grid items.
- Move state closer to where it is used.
- Avoid using global context for fast-changing focus state.
- Replace repeated expensive calculations with useMemo.
- Stabilize callbacks passed to memoized children.
```

### Remote Focus

```txt
- Audit keydown handlers.
- Remove heavy logic from arrow key movement.
- Avoid API calls on focus movement.
- Ensure only previous and next focused items update visually.
- Use CSS classes for focus styles.
- Throttle or guard rapid key input if needed.
```

### Lists and Grids

```txt
- Find screens rendering hundreds of cards/items.
- Add virtualization or windowing.
- Paginate large datasets.
- Limit DOM nodes.
- Avoid rendering hidden rows/categories.
```

### Images

```txt
- Replace oversized images with correct thumbnail sizes.
- Add lazy loading for posters/logos where appropriate.
- Use placeholders for loading images.
- Avoid huge background images.
- Ensure image cache does not grow without limit.
```

### Video Player

```txt
- Isolate player from page state.
- Ensure only one active video instance exists.
- Stop stream when leaving player screen.
- Remove player event listeners on unmount.
- Throttle progress updates.
- Pause or stop playback when app is hidden.
```

### API

```txt
- Add request cancellation for search/details screens.
- Add debounce for search input.
- Use pagination for movies, series, channels, and EPG.
- Add exponential backoff retries with limits.
- Deduplicate duplicate requests.
- Cache stable data carefully.
```

### EPG

```txt
- Do not load full EPG at startup.
- Load current visible time window first.
- Virtualize channel rows.
- Virtualize horizontal timeline if needed.
- Cache EPG by channel/date/time window.
- Avoid full EPG re-render every minute.
```

### Memory

```txt
- Cleanup all timers.
- Cleanup all key/event listeners.
- Cleanup subscriptions.
- Unmount hidden heavy screens.
- Limit cache sizes.
- Avoid duplicated large arrays.
- Avoid base64 images.
```

### Build

```txt
- Ensure production build is used.
- Minify JavaScript and CSS.
- Remove production source maps if not needed.
- Analyze bundle size.
- Remove unused libraries.
- Split vendor/player/feature chunks if beneficial.
```

### Testing

```txt
- Test on real Samsung TV hardware.
- Test on older TV models.
- Test large accounts.
- Test slow network.
- Test long sessions.
- Test rapid remote key presses.
- Test repeated video switching.
- Test app relaunch/startup speed.
```

---

## 29. Final Compact Checklist

```txt
Startup:
- lazy-load screens
- reduce bundle size
- delay non-critical work
- show lightweight loading UI

React:
- memoize heavy cards/rows
- keep state local
- avoid unnecessary context updates
- avoid full-page re-renders

TV focus:
- optimize remote key handling
- update only focused items
- avoid API calls on every focus
- throttle rapid key input

Lists:
- virtualize long lists
- paginate large data
- limit DOM nodes

Images:
- resize/compress posters
- lazy-load images
- cache thumbnails
- avoid huge backgrounds

Video:
- isolate player
- cleanup on unmount
- throttle progress updates
- pause/stop when hidden

API:
- cache useful data
- retry with backoff
- cancel old requests
- debounce search

Memory:
- cleanup timers/listeners
- clear unused caches
- avoid duplicated huge arrays
- unmount hidden heavy screens

Build:
- production build
- minify
- tree-shake
- analyze bundle
- avoid heavy libraries

Testing:
- test on real Samsung TV
- test older models
- test large accounts
- test long sessions
- test slow network
```

---

## Final Principle

For a React Tizen TV app, performance comes from:

```txt
loading less
rendering less
re-rendering less
keeping DOM small
keeping memory clean
making remote focus instant
keeping video playback isolated and stable
```
