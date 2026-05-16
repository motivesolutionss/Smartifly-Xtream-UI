// Runtime feature flags for player behavior.
// Keep iOS VLC disabled by default for safe rollout and easy rollback.
export const USE_IOS_VLC = true;
// Alternate iOS playback engine (AVPlayer-backed surface) for controlled rollout.
export const USE_IOS_ALT_ENGINE = true;

// Phase 0/1 rollout flags (keep disabled by default for safe activation).
export const ENABLE_PLAYER_TIMEOUT_FALLBACK_V1 = true;
export const ENABLE_PLAYER_STREAM_MEMORY_V1 = true;
export const ENABLE_PLAYER_AXIS_FALLBACK_V1 = true;
export const ENABLE_PLAYER_RERESOLVE_ON_RETRY_V1 = true;
export const ENABLE_PLAYER_MKV_STRICT_MODE_V1 = true;
export const ENABLE_PLAYER_IOS_LIVE_M3U8_VLC_FALLBACK_V1 = true;

// Browse image prefetch rollout.
// Toggle this off to instantly return to the old "render-only" behavior.
export const ENABLE_BROWSE_PROGRESSIVE_IMAGE_PREFETCH = false;

// Browse initial image warmup rollout.
// Prefetches only the first visible Browse chunk on open without enabling the
// more aggressive scroll-driven prefetch path.
export const ENABLE_BROWSE_INITIAL_CHUNK_PREFETCH_V1 = true;

// Browse stable first-paint rollout.
// Keeps the first prepared Browse dataset on screen while category maps are
// rebuilt in the background, reducing the visible blink on open.
export const ENABLE_BROWSE_STABLE_FIRST_PAINT_V1 = true;

// Browse gentle async refresh rollout.
// Preserves the current grid while background prep refreshes and avoids
// resetting the visible window unless the browse context actually changes.
export const ENABLE_BROWSE_GENTLE_ASYNC_REFRESH_V1 = true;

// Browse category modal warmup rollout.
// While the category picker is open, warm the first visible card chunk for the
// categories the user is viewing so switching categories feels more instant.
export const ENABLE_BROWSE_CATEGORY_MODAL_WARMUP_V1 = true;

// Browse HTTPS-first chunk rollout.
// Promotes items with stronger HTTPS image candidates into the first visible
// Browse chunk for All/category views while preserving the rest of the raw
// catalog order after that chunk.
export const ENABLE_BROWSE_HTTPS_FIRST_CHUNK_V1 = true;

// Browse first-chunk gate rollout.
// On initial Browse open, briefly waits for the promoted first chunk image
// batch to warm before showing the grid, then falls back after a short timeout.
export const ENABLE_BROWSE_FIRST_CHUNK_GATE_V1 = true;

// Browse category-switch gate rollout.
// Briefly warms the first visible chunk for the tapped category before
// switching the Browse grid, then falls back after a short timeout.
export const ENABLE_BROWSE_CATEGORY_SWITCH_GATE_V1 = true;

// Browse chunk persistence/tuning rollout.
// Reuses cached first-chunk warmup plans in memory and skips gates when those
// image batches are already warm enough on revisit.
export const ENABLE_BROWSE_CHUNK_PERSISTENCE_TUNING_V1 = true;

// Browse scroll look-ahead rollout.
// Warms only the next small Browse chunk during scrolling without enabling the
// older broader progressive prefetch behavior.
export const ENABLE_BROWSE_SCROLL_LOOKAHEAD_PREFETCH_V1 = true;

// Browse HTTPS verified-priority rollout.
// Orders Browse items using the shared image verification cache so verified
// HTTPS images rise first, then unknown HTTPS items, then weaker candidates.
export const ENABLE_BROWSE_HTTPS_VERIFIED_PRIORITY_V1 = true;

// Movie detail route enrichment rollout.
// Passes richer movie image fields into MovieDetail so it can resolve artwork
// immediately instead of waiting for getVodInfo().
export const ENABLE_MOVIE_DETAIL_ROUTE_IMAGE_ENRICHMENT_V1 = true;

// Movie detail art fallback rollout.
// Lets mobile MovieDetail use the same practical movie-art fallback chain TV
// already uses: true backdrop first, then movie_data art, then poster art.
export const ENABLE_MOVIE_DETAIL_ART_FALLBACK_V1 = true;

// Mobile FastImage resilience rollout.
// Adds TV-style retry and native Image fallback to the shared mobile image
// loader so flaky remote images have more than one chance to appear.
export const ENABLE_MOBILE_FASTIMAGE_RETRY_FALLBACK_V1 = true;

// Movie detail immediate art rollout.
// Shows the best available movie header art immediately on mobile instead of
// hiding it until FastImage reports a successful load.
export const ENABLE_MOVIE_DETAIL_SHOW_ART_IMMEDIATELY_V1 = true;

// Lean Home rails rollout.
// Keeps Home fast and predictable by removing heavier derived rails
// like "For You", "Live Now", and "Top Rated" while preserving
// continue watching, recents, and category rails.
export const ENABLE_HOME_LEAN_RAILS = false;

// Home image safety rollout.
// When enabled, Home renders only content that already has an HTTPS image
// resolved before any Home sections are built.
export const ENABLE_HOME_HTTPS_ONLY_IMAGES = true;

// Home rail backfill rollout.
// When enabled alongside HTTPS-only images, Home rails search a larger source
// pool so they can keep filling toward 15 cards after invalid items are skipped.
export const ENABLE_HOME_HTTPS_RAIL_BACKFILL = true;

// Home image verification rollout.
// Uses cached success/failure metadata plus background verification so
// broken HTTPS images gradually stop reappearing on Home.
export const ENABLE_HOME_IMAGE_VERIFICATION_V1 = true;

// Home-to-detail media prefetch rollout.
// When enabled, Home card detail prefetch also warms the exact detail-screen
// images so movie and series detail pages feel instant on open.
export const ENABLE_HOME_DETAIL_MEDIA_PREFETCH_V1 = true;

// Search suggested-row quality rollout.
// Keeps the Search landing suggestions focused on stronger image-safe items so
// the suggested rows avoid blank or weak cards before the user starts typing.
export const ENABLE_SEARCH_SUGGESTED_QUALITY_V1 = true;

// Search relevance ranking rollout.
// Reorders typed search results by title relevance while keeping the existing
// local cached search source and result limits intact.
export const ENABLE_SEARCH_RELEVANCE_RANKING_V1 = true;

// Search image tie-break rollout.
// Within the same typed-search relevance band, prefers stronger verified HTTPS
// artwork without letting image quality outrank relevance.
export const ENABLE_SEARCH_IMAGE_TIEBREAK_V1 = true;

// Search typed-grid rollout.
// Keeps the Search landing page as suggestion rows, but renders active typed
// results as a compact vertical grid for faster scanning.
export const ENABLE_SEARCH_TYPED_GRID_V1 = true;

// Search tokenized-match rollout.
// Improves multi-word search by matching query tokens across title tokens
// instead of requiring the raw full query substring to appear as-is.
export const ENABLE_SEARCH_TOKENIZED_MATCH_V1 = true;

// Search fuzzy-match rollout.
// Adds a bounded typo-tolerance fallback when direct and tokenized matching
// return too few results, without replacing the normal search path.
export const ENABLE_SEARCH_FUZZY_MATCH_V1 = true;

// Browse grouped-All rollout.
// Renders the default local "All" catalog as category-grouped sections so
// each category can surface stronger image items first while still keeping
// weaker items available later in the section.
export const ENABLE_BROWSE_GROUPED_ALL_V1 = false;

// Browse grouped-All verified-first rollout.
// Makes grouped "All" sections prioritize verified HTTPS artwork first,
// then HTTPS unknown items as backfill, pushing weaker/fallback-prone cards
// later inside each category section.
export const ENABLE_BROWSE_GROUPED_ALL_VERIFIED_FIRST_V1 = true;

// Browse hidden grouped-All rollout.
// Keeps category-wise sourcing for the default local "All" view, but renders
// it as one continuous grid without visible category titles/section chrome.
export const ENABLE_BROWSE_GROUPED_ALL_HIDDEN_SECTIONS_V1 = true;

// Browse grouped-All verified-window rollout.
// Tightens the first visible window of grouped "All" so verified HTTPS items
// lead, HTTPS unknown items backfill next, and weaker cards appear later.
export const ENABLE_BROWSE_GROUPED_ALL_VERIFIED_WINDOW_V1 = false;

// Browse grouped-All backfill tuning rollout.
// Applies per-type limits to how many weak cards can enter the first visible
// "All" window, keeping live/series cleaner while still allowing enough
// backfill when the strong pool is sparse.
export const ENABLE_BROWSE_GROUPED_ALL_BACKFILL_TUNING_V1 = false;

// Browse movie-All flat verified-window rollout.
// Keeps the Movies "All" view on a flat pool instead of grouped sourcing,
// while still applying the stricter verified-first early-window ranking.
export const ENABLE_BROWSE_MOVIES_ALL_FLAT_VERIFIED_V1 = false;

// Browse empty-state flash fix rollout.
// Prevents Browse from briefly showing "No items found" during the handoff
// between loading/preparation and the first real visible list window.
export const ENABLE_BROWSE_EMPTY_STATE_FLASH_FIX_V1 = false;

// Browse movie-All lazy builder rollout.
// Builds only a bounded category-sourced movie candidate pool for the initial
// visible window instead of walking the full movie catalog before first paint.
export const ENABLE_BROWSE_MOVIES_ALL_LAZY_BUILD_V1 = true;

// Browse movie-All bounded first-window rollout.
// Shrinks the upfront movie candidate pool to roughly one visible window plus
// a small look-ahead so Movies Browse opens faster and avoids heavy JS work.
export const ENABLE_BROWSE_MOVIES_ALL_BOUNDED_WINDOW_V1 = true;

// Browse movie-All post-paint expansion rollout.
// Expands the movie candidate pool only after the first settled result is on
// screen, so deeper Browse rows improve without blocking the initial open.
export const ENABLE_BROWSE_MOVIES_ALL_POST_PAINT_EXPANSION_V1 = false;

// Browse cached first-paint rollout.
// Uses already-cached local content for the initial Browse paint even when
// server paging is active, then lets paged results refine the screen after.
export const ENABLE_BROWSE_CACHED_FIRST_PAINT_V1 = false;

// Browse movies first-chunk verified rollout.
// Keeps the first visible movie window focused on verified HTTPS artwork first,
// then HTTPS unknown artwork, before allowing weaker movie cards to backfill.
export const ENABLE_BROWSE_MOVIES_FIRST_CHUNK_VERIFIED_V1 = false;

// Browse movies grouped-All verified rollout.
// Uses hidden category-wise sourcing only for Movies -> All so the first movie
// window can be built from verified/HTTPS-heavy category pools without changing
// live or series Browse behavior.
export const ENABLE_BROWSE_MOVIES_ALL_GROUPED_VERIFIED_V1 = true;

// Browse first-result gate rollout.
// Keeps Browse in a loading state until the first real result window is ready,
// or until an empty result is truly confirmed, preventing false empty flashes.
export const ENABLE_BROWSE_FIRST_RESULT_GATE_V1 = false;

// Browse hard body gate rollout.
// Holds the Browse body/header counts in loading mode until the first settled
// result window exists, instead of letting the empty state render mid-boot.
export const ENABLE_BROWSE_HARD_BODY_GATE_V1 = false;
