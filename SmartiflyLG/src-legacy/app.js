(function () {
  // --- LOCAL STORAGE KEYS ---
  var SESSION_KEY = 'smartifly-lg-session';
  var PROFILES_KEY = 'smartifly-lg-profiles';
  var SELECTED_PROFILE_KEY = 'smartifly-lg-selected-profile';
  var PORTAL_KEY = 'smartifly-lg-last-portal';
  var FAVORITES_KEY = 'smartifly-lg-favorites';
  var HISTORY_KEY = 'smartifly-lg-history';

  // --- EPG STATE & TIMER ---
  var epgTimer = null;
  var hlsInstance = null;

  // --- STATE DEFINITION ---
  var state = {
    session: null,
    profiles: [],
    selectedProfile: null,
    catalogMode: 'live',
    categories: [],
    channels: [],
    selectedCategoryId: '',
    selectedCategoryName: '',
    focusedPanel: 'welcome', // 'welcome', 'login', 'profiles', 'profile-form', 'catalog-sidebar', 'home-rails', 'catalog-categories', 'catalog-channels', 'detail-actions', 'detail-seasons', 'detail-episodes', 'search-header', 'search-keyboard', 'search-results', 'watchlist-controls', 'watchlist-results', 'settings-actions', 'player'
    focusedIndex: 0, // Index of focused item inside current panel
    activeChannel: null,
    activeChannelQueue: [],
    activeChannelIndex: 0,
    currentViewId: 'view-welcome',
    playerReturnViewId: 'view-catalog',
    playerReturnPanel: 'catalog-channels',
    playerReturnIndex: 0,
    detailItem: null,
    detailMode: '',
    detailSourceIndex: 0,
    detailReturnViewId: 'view-catalog',
    detailReturnPanel: 'catalog-channels',
    detailReturnIndex: 0,
    detailInfo: null,
    detailSeasons: [],
    detailSelectedSeasonIndex: 0,
    detailEpisodes: [],
    favorites: {},
    searchQuery: '',
    searchResults: [],
    searchCache: {},
    searchRails: [],
    searchLoading: false,
    searchKeyboardShifted: false,
    searchKeyboardRows: [],
    searchQueryDebounce: null,
    watchlistFilter: 'all',
    watchlistItems: [],
    watchHistory: [],
    homeCatalogCache: {
      live: null,
      movies: null,
      series: null
    },
    homeSections: [],
    homeHeroEntry: null,
    homeLoading: false,
    catalogScreen: 'home',
    loginPending: false,
    loginRequestId: 0,
    loginResolvedPortal: null,
    profileFormDraft: {
      name: '',
      avatarSeed: '',
      isKids: false
    }
  };

  var SIDEBAR_MODE_INDEX = {
    home: 0,
    live: 1,
    movies: 2,
    series: 3,
    search: 4,
    watchlist: 5,
    settings: 6,
    profile: 7,
    logout: 8
  };

  var MAX_HOME_RAIL_ITEMS = 12;
  var MAX_SEARCH_RAIL_ITEMS = 12;
  var SEARCH_KEYBOARD_LAYOUT = [
    ['1', '2', '3', '4', '5'],
    ['6', '7', '8', '9', '0'],
    ['a', 'b', 'c', 'd', 'e'],
    ['f', 'g', 'h', 'i', 'j'],
    ['k', 'l', 'm', 'n', 'o'],
    ['p', 'q', 'r', 's', 't'],
    ['u', 'v', 'w', 'x', 'y'],
    ['z', '-', '.', 'shift', 'backspace'],
    ['clear', 'space', 'search']
  ];

  // --- API CLIENT SETUP ---
  var API_BASE_URL = 'https://api.smartifly.co/v1';

  function createDefaultProfiles(username) {
    var cleanUsername = String(username || '').trim();
    var primaryName = cleanUsername.length > 0 ? cleanUsername : 'Primary';

    return [
      {
        id: 'primary',
        name: primaryName,
        avatarSeed: primaryName.slice(0, 2).toUpperCase()
      },
      {
        id: 'kids',
        name: 'Kids',
        avatarSeed: 'KD',
        isKids: true
      }
    ];
  }

  function buildProfileId() {
    return 'profile-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  function sanitizeProfileInitials(value) {
    return String(value || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 2);
  }

  function deriveProfileInitials(name) {
    var clean = String(name || '').trim();
    if (!clean) return '';

    var parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return sanitizeProfileInitials(parts[0].charAt(0) + parts[1].charAt(0));
    }

    return sanitizeProfileInitials(clean.slice(0, 2));
  }

  function normalizeBaseUrl(url) {
    if (!url) return '';
    var clean = url.trim().replace(/\/+$/, '');
    if (!/^https?:\/\//i.test(clean)) {
      clean = 'http://' + clean;
    }
    return clean;
  }

  function apiValidatePortalCode(code, onSuccess, onError) {
    var xhr = new XMLHttpRequest();
    var url = API_BASE_URL + '/public/portal/validate?code=' + encodeURIComponent(code.trim().toUpperCase());
    xhr.open('GET', url, true);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.timeout = 15000;
    
    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          var res = JSON.parse(xhr.responseText);
          if (res.success && res.portal) {
            onSuccess(res.portal);
          } else {
            onError(res.message || 'Validation failed');
          }
        } catch (e) {
          onError('Invalid API response');
        }
      } else {
        onError('Server error: HTTP ' + xhr.status);
      }
    };
    xhr.onerror = function () { onError('Network connection failed'); };
    xhr.ontimeout = function () { onError('Request timed out'); };
    xhr.send();
  }

  function apiAuthenticate(portalBaseUrl, username, password, onSuccess, onError) {
    var xhr = new XMLHttpRequest();
    var cleanUrl = normalizeBaseUrl(portalBaseUrl) + '/player_api.php?username=' + encodeURIComponent(username) + '&password=' + encodeURIComponent(password);
    xhr.open('GET', cleanUrl, true);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.timeout = 15000;

    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          var res = JSON.parse(xhr.responseText);
          if (res.user_info && res.user_info.auth === 1) {
            onSuccess(res);
          } else {
            onError((res.user_info && res.user_info.message) || 'Invalid credentials');
          }
        } catch (e) {
          onError('Invalid portal API response');
        }
      } else {
        onError('Portal server error: HTTP ' + xhr.status);
      }
    };
    xhr.onerror = function () { onError('Portal network connection failed'); };
    xhr.ontimeout = function () { onError('Portal request timed out'); };
    xhr.send();
  }

  function apiGetCategories(portalBaseUrl, username, password, onSuccess, onError) {
    var xhr = new XMLHttpRequest();
    var url = normalizeBaseUrl(portalBaseUrl) + '/player_api.php?username=' + encodeURIComponent(username) + '&password=' + encodeURIComponent(password) + '&action=get_live_categories';
    xhr.open('GET', url, true);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.timeout = 20000;

    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          var res = JSON.parse(xhr.responseText);
          var list = [];
          if (Array.isArray(res)) {
            list = res;
          } else if (res && Array.isArray(res.categories)) {
            list = res.categories;
          } else if (res && Array.isArray(res.live_categories)) {
            list = res.live_categories;
          }
          onSuccess(list);
        } catch (e) {
          onError('Failed to parse categories');
        }
      } else {
        onError('HTTP ' + xhr.status + ' loading categories');
      }
    };
    xhr.onerror = function () { onError('Network error loading categories'); };
    xhr.send();
  }

  function apiGetStreams(portalBaseUrl, username, password, categoryId, onSuccess, onError) {
    var xhr = new XMLHttpRequest();
    var url = normalizeBaseUrl(portalBaseUrl) + '/player_api.php?username=' + encodeURIComponent(username) + '&password=' + encodeURIComponent(password) + '&action=get_live_streams';
    if (categoryId) {
      url += '&category_id=' + encodeURIComponent(categoryId);
    }
    xhr.open('GET', url, true);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.timeout = 30000;

    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          var res = JSON.parse(xhr.responseText);
          var list = [];
          if (Array.isArray(res)) {
            list = res;
          } else if (res && Array.isArray(res.live_streams)) {
            list = res.live_streams;
          } else if (res && Array.isArray(res.streams)) {
            list = res.streams;
          }
          onSuccess(list);
        } catch (e) {
          onError('Failed to parse streams');
        }
      } else {
        onError('HTTP ' + xhr.status + ' loading channels');
      }
    };
    xhr.onerror = function () { onError('Network error loading channels'); };
    xhr.send();
  }

  function apiGetShortEpg(portalBaseUrl, username, password, streamId, onSuccess, onError) {
    var xhr = new XMLHttpRequest();
    var url = normalizeBaseUrl(portalBaseUrl) + '/player_api.php?username=' + encodeURIComponent(username) + '&password=' + encodeURIComponent(password) + '&action=get_short_epg&stream_id=' + streamId + '&limit=5';
    xhr.open('GET', url, true);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.timeout = 10000;

    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          var res = JSON.parse(xhr.responseText);
          var list = [];
          if (res && Array.isArray(res.epg_listings)) {
            list = res.epg_listings;
          }
          onSuccess(list);
        } catch (e) {
          onError('Failed to parse EPG');
        }
      } else {
        onError('HTTP ' + xhr.status);
      }
    };
    xhr.onerror = function () { onError('Network error'); };
    xhr.send();
  }

  function apiGetVodCategories(portalBaseUrl, username, password, onSuccess, onError) {
    var xhr = new XMLHttpRequest();
    var url = normalizeBaseUrl(portalBaseUrl) + '/player_api.php?username=' + encodeURIComponent(username) + '&password=' + encodeURIComponent(password) + '&action=get_vod_categories';
    xhr.open('GET', url, true);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.timeout = 20000;

    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          var res = JSON.parse(xhr.responseText);
          var list = [];
          if (Array.isArray(res)) {
            list = res;
          } else if (res && Array.isArray(res.categories)) {
            list = res.categories;
          } else if (res && Array.isArray(res.vod_categories)) {
            list = res.vod_categories;
          }
          onSuccess(list);
        } catch (e) {
          onError('Failed to parse movie categories');
        }
      } else {
        onError('HTTP ' + xhr.status + ' loading movie categories');
      }
    };
    xhr.onerror = function () { onError('Network error loading movie categories'); };
    xhr.send();
  }

  function apiGetVodStreams(portalBaseUrl, username, password, categoryId, onSuccess, onError) {
    var xhr = new XMLHttpRequest();
    var url = normalizeBaseUrl(portalBaseUrl) + '/player_api.php?username=' + encodeURIComponent(username) + '&password=' + encodeURIComponent(password) + '&action=get_vod_streams';
    if (categoryId) {
      url += '&category_id=' + encodeURIComponent(categoryId);
    }
    xhr.open('GET', url, true);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.timeout = 30000;

    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          var res = JSON.parse(xhr.responseText);
          var list = [];
          if (Array.isArray(res)) {
            list = res;
          } else if (res && Array.isArray(res.vod_streams)) {
            list = res.vod_streams;
          } else if (res && Array.isArray(res.movies)) {
            list = res.movies;
          } else if (res && Array.isArray(res.vod)) {
            list = res.vod;
          }
          onSuccess(list);
        } catch (e) {
          onError('Failed to parse movies');
        }
      } else {
        onError('HTTP ' + xhr.status + ' loading movies');
      }
    };
    xhr.onerror = function () { onError('Network error loading movies'); };
    xhr.send();
  }

  function apiGetSeriesCategories(portalBaseUrl, username, password, onSuccess, onError) {
    var xhr = new XMLHttpRequest();
    var url = normalizeBaseUrl(portalBaseUrl) + '/player_api.php?username=' + encodeURIComponent(username) + '&password=' + encodeURIComponent(password) + '&action=get_series_categories';
    xhr.open('GET', url, true);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.timeout = 20000;

    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          var res = JSON.parse(xhr.responseText);
          var list = [];
          if (Array.isArray(res)) {
            list = res;
          } else if (res && Array.isArray(res.categories)) {
            list = res.categories;
          } else if (res && Array.isArray(res.series_categories)) {
            list = res.series_categories;
          }
          onSuccess(list);
        } catch (e) {
          onError('Failed to parse series categories');
        }
      } else {
        onError('HTTP ' + xhr.status + ' loading series categories');
      }
    };
    xhr.onerror = function () { onError('Network error loading series categories'); };
    xhr.send();
  }

  function apiGetSeries(portalBaseUrl, username, password, categoryId, onSuccess, onError) {
    var xhr = new XMLHttpRequest();
    var url = normalizeBaseUrl(portalBaseUrl) + '/player_api.php?username=' + encodeURIComponent(username) + '&password=' + encodeURIComponent(password) + '&action=get_series';
    if (categoryId) {
      url += '&category_id=' + encodeURIComponent(categoryId);
    }
    xhr.open('GET', url, true);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.timeout = 30000;

    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          var res = JSON.parse(xhr.responseText);
          var list = [];
          if (Array.isArray(res)) {
            list = res;
          } else if (res && Array.isArray(res.series)) {
            list = res.series;
          } else if (res && Array.isArray(res.series_list)) {
            list = res.series_list;
          }
          onSuccess(list);
        } catch (e) {
          onError('Failed to parse series');
        }
      } else {
        onError('HTTP ' + xhr.status + ' loading series');
      }
    };
    xhr.onerror = function () { onError('Network error loading series'); };
    xhr.send();
  }

  function apiGetVodInfo(portalBaseUrl, username, password, vodId, onSuccess, onError) {
    var xhr = new XMLHttpRequest();
    var url = normalizeBaseUrl(portalBaseUrl) + '/player_api.php?username=' + encodeURIComponent(username) + '&password=' + encodeURIComponent(password) + '&action=get_vod_info&vod_id=' + encodeURIComponent(vodId);
    xhr.open('GET', url, true);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.timeout = 30000;

    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          onSuccess(JSON.parse(xhr.responseText));
        } catch (e) {
          onError('Failed to parse movie details');
        }
      } else {
        onError('HTTP ' + xhr.status + ' loading movie details');
      }
    };
    xhr.onerror = function () { onError('Network error loading movie details'); };
    xhr.send();
  }

  function apiGetSeriesInfo(portalBaseUrl, username, password, seriesId, onSuccess, onError) {
    var xhr = new XMLHttpRequest();
    var url = normalizeBaseUrl(portalBaseUrl) + '/player_api.php?username=' + encodeURIComponent(username) + '&password=' + encodeURIComponent(password) + '&action=get_series_info&series_id=' + encodeURIComponent(seriesId);
    xhr.open('GET', url, true);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.timeout = 30000;

    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          onSuccess(JSON.parse(xhr.responseText));
        } catch (e) {
          onError('Failed to parse series details');
        }
      } else {
        onError('HTTP ' + xhr.status + ' loading series details');
      }
    };
    xhr.onerror = function () { onError('Network error loading series details'); };
    xhr.send();
  }

  function decodeXtreamBase64(str) {
    if (!str) return '';
    try {
      return decodeURIComponent(escape(window.atob(str)));
    } catch (e) {
      try {
        return window.atob(str);
      } catch (err) {
        return str;
      }
    }
  }

  function formatTime(timestampMs) {
    if (!timestampMs) return '';
    var date = new Date(timestampMs);
    var hrs = date.getHours();
    var mins = date.getMinutes();
    if (hrs < 10) hrs = '0' + hrs;
    if (mins < 10) mins = '0' + mins;
    return hrs + ':' + mins;
  }

  function escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function stripHtml(text) {
    if (!text) return '';
    return String(text).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function getFavoritesBucketKey(mode) {
    var portalCode = state.session && state.session.portalCode ? state.session.portalCode : 'default';
    var profileId = state.selectedProfile && state.selectedProfile.id ? state.selectedProfile.id : 'default';
    return portalCode + '::' + profileId + '::' + mode;
  }

  function loadFavoritesState() {
    try {
      var raw = localStorage.getItem(FAVORITES_KEY);
      state.favorites = raw ? JSON.parse(raw) : {};
    } catch (e) {
      state.favorites = {};
    }
  }

  function loadWatchHistoryState() {
    try {
      var raw = localStorage.getItem(HISTORY_KEY);
      state.watchHistory = raw ? JSON.parse(raw) : [];
    } catch (e) {
      state.watchHistory = [];
    }
  }

  function saveFavoritesState() {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(state.favorites || {}));
    } catch (e) {}
  }

  function saveWatchHistoryState() {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(state.watchHistory || []));
    } catch (e) {}
  }

  function isFavoriteItem(mode, itemId) {
    var bucket = state.favorites[getFavoritesBucketKey(mode)] || {};
    return !!bucket[String(itemId)];
  }

  function toggleFavoriteItem(mode, item) {
    var itemId = getCatalogItemId(item, mode);
    var bucketKey = getFavoritesBucketKey(mode);
    var bucket = state.favorites[bucketKey] || {};
    var stringId = String(itemId);

    if (bucket[stringId]) {
      delete bucket[stringId];
    } else {
      bucket[stringId] = {
        id: stringId,
        mode: mode,
        name: getCatalogItemName(item),
        artwork: getCatalogItemArtwork(item, mode),
        item: item,
        categoryName: state.selectedCategoryName,
        savedAt: new Date().toISOString()
      };
    }

    state.favorites[bucketKey] = bucket;
    saveFavoritesState();
  }

  function getContentTypeLabel(mode) {
    if (mode === 'series') return 'Series';
    if (mode === 'live') return 'Live TV';
    return 'Movie';
  }

  function updateWatchHistory(mode, item, extra) {
    if (!item) return;

    var entry = {
      id: String(getCatalogItemId(item, mode)),
      mode: mode,
      portalCode: state.session && state.session.portalCode ? state.session.portalCode : 'default',
      profileId: state.selectedProfile && state.selectedProfile.id ? state.selectedProfile.id : 'default',
      name: getCatalogItemName(item),
      artwork: getCatalogItemArtwork(item, mode),
      item: item,
      playedAt: new Date().toISOString(),
      meta: extra || ''
    };
    var deduped = [];
    var i;

    deduped.push(entry);
    for (i = 0; i < state.watchHistory.length; i++) {
      var existing = state.watchHistory[i];
      if (!existing) continue;
      if (String(existing.id) === entry.id && existing.mode === entry.mode && existing.portalCode === entry.portalCode && existing.profileId === entry.profileId) {
        continue;
      }
      deduped.push(existing);
      if (deduped.length >= MAX_HOME_RAIL_ITEMS + 3) break;
    }

    state.watchHistory = deduped;
    saveWatchHistoryState();
  }

  function getCurrentProfileHistoryEntries() {
    var portalCode = state.session && state.session.portalCode ? state.session.portalCode : 'default';
    var profileId = state.selectedProfile && state.selectedProfile.id ? state.selectedProfile.id : 'default';
    var entries = [];

    for (var i = 0; i < state.watchHistory.length; i++) {
      var entry = state.watchHistory[i];
      if (!entry) continue;
      if (entry.portalCode === portalCode && entry.profileId === profileId) {
        entries.push(entry);
      }
      if (entries.length >= MAX_HOME_RAIL_ITEMS) break;
    }
    return entries;
  }

  function isValidImageUrl(url) {
    if (!url) return false;
    var s = String(url).trim().toLowerCase();
    return s !== '' && s !== 'null' && s !== 'undefined' && s !== 'none';
  }

  function normalizeLegacyImageUrl(url) {
    if (!isValidImageUrl(url)) return '';
    return String(url).trim().replace(/^https:\/\/image\.tmdb\.org/i, 'http://image.tmdb.org');
  }

  function pickLegacyImageValue(value) {
    if (!value) return '';

    if (Array.isArray(value)) {
      for (var i = 0; i < value.length; i++) {
        var arrUrl = normalizeLegacyImageUrl(value[i]);
        if (arrUrl) return arrUrl;
      }
      return '';
    }

    if (typeof value === 'string') {
      var raw = value.trim();
      if (!raw) return '';

      if ((raw.charAt(0) === '[' && raw.charAt(raw.length - 1) === ']') || (raw.charAt(0) === '"' && raw.charAt(raw.length - 1) === '"')) {
        try {
          return pickLegacyImageValue(JSON.parse(raw));
        } catch (e) {}
      }

      return normalizeLegacyImageUrl(raw);
    }

    return '';
  }

  function getDetailPosterArtwork(item, detailInfo, mode) {
    if (detailInfo && detailInfo.info) {
      var infoPoster = pickLegacyImageValue(detailInfo.info.movie_image) ||
        pickLegacyImageValue(detailInfo.info.cover) ||
        pickLegacyImageValue(detailInfo.info.cover_big);
      if (infoPoster) return infoPoster;
    }
    if (item) {
      var itemPoster = pickLegacyImageValue(item.movie_image) ||
        pickLegacyImageValue(item.cover) ||
        pickLegacyImageValue(item.cover_big);
      if (itemPoster) return itemPoster;
    }
    return pickLegacyImageValue(getCatalogItemArtwork(item, mode));
  }

  function getBackdropArtwork(item, detailInfo, mode) {
    if (detailInfo && detailInfo.info) {
      var infoBackdrop = pickLegacyImageValue(detailInfo.info.backdrop_path) ||
        pickLegacyImageValue(detailInfo.info.backdrop);
      if (infoBackdrop) return infoBackdrop;
    }
    if (item) {
      var itemBackdrop = pickLegacyImageValue(item.backdrop_path) ||
        pickLegacyImageValue(item.backdrop);
      if (itemBackdrop) return itemBackdrop;
    }
    return getDetailPosterArtwork(item, detailInfo, mode);
  }

  function escapeCssUrl(url) {
    return String(url).replace(/"/g, '%22');
  }

  function safeTrim(value) {
    return value == null ? '' : String(value).trim();
  }

  function getDetailTrailerUrl(item, detailInfo) {
    var info = detailInfo && detailInfo.info ? detailInfo.info : {};
    return safeTrim(info.youtube_trailer || (item && item.youtube_trailer) || '');
  }

  function getYouTubeVideoId(urlOrId) {
    var trimmed = safeTrim(urlOrId);
    if (!trimmed) return null;
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

    var ytRegexes = [
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i,
      /embed\/([^"&?\/\s]{11})/i
    ];

    for (var i = 0; i < ytRegexes.length; i++) {
      var match = trimmed.match(ytRegexes[i]);
      if (match && match[1]) return match[1];
    }

    return null;
  }

  function getYouTubeEmbedUrl(urlOrId) {
    var youtubeId = getYouTubeVideoId(urlOrId);
    if (!youtubeId) return null;
    return 'https://www.youtube.com/embed/' + youtubeId + '?autoplay=1&rel=0&playsinline=1';
  }

  function buildTrailerEntries(item, detailInfo) {
    var trailerUrl = getDetailTrailerUrl(item, detailInfo);
    if (!trailerUrl) return [];

    var backdrop = getBackdropArtwork(item, detailInfo, 'series');
    var poster = getDetailPosterArtwork(item, detailInfo, 'series');

    return [{
      id: 'trailer-' + (item && item.series_id ? item.series_id : 'detail'),
      stream_id: 'trailer',
      title: 'Official Trailer',
      episode_num: 'Trailer',
      container_extension: 'mp4',
      __isTrailer: true,
      __trailerUrl: trailerUrl,
      info: {
        duration: 'Trailer',
        movie_image: backdrop || poster || '',
        plot: 'Watch the trailer.'
      }
    }];
  }

  function applyDetailBackdrop(backdropArt, fallbackArt) {
    var detailView = document.querySelector('#view-content-detail .content-detail-view');
    var backdrop = document.getElementById('content-detail-backdrop');
    var backdropImage = document.getElementById('content-detail-backdrop-image');
    var primary = normalizeLegacyImageUrl(backdropArt);
    var fallback = normalizeLegacyImageUrl(fallbackArt);
    var activeUrl = primary || fallback;

    if (detailView) {
      detailView.style.backgroundImage = 'none';
    }

    if (!backdrop) return;

    backdrop.style.backgroundImage = activeUrl ? 'url("' + escapeCssUrl(activeUrl) + '")' : 'none';
    backdrop.style.backgroundPosition = 'center';
    backdrop.style.backgroundSize = 'cover';
    backdrop.style.backgroundRepeat = 'no-repeat';
    backdrop.style.backgroundAttachment = 'scroll';

    if (backdropImage) {
      backdropImage.onload = null;
      backdropImage.onerror = null;
      backdropImage.style.opacity = '0';
      backdropImage.style.display = 'none';
      backdropImage.removeAttribute('src');
    }
  }

  function normalizeSeriesSeasons(detailInfo) {
    var seasons = [];
    var seasonLookup = {};
    var i;

    if (detailInfo && Array.isArray(detailInfo.seasons)) {
      for (i = 0; i < detailInfo.seasons.length; i++) {
        var seasonEntry = detailInfo.seasons[i] || {};
        var rawSeasonNo = seasonEntry.season_number != null ? seasonEntry.season_number : seasonEntry.season;
        var key = String(rawSeasonNo != null ? rawSeasonNo : (i + 1));
        var seasonLabel = seasonEntry.name || ('Season ' + key);
        if (/special/i.test(seasonLabel) || key === '0') {
          seasonLabel = 'Trailer';
        }
        seasonLookup[key] = {
          key: key,
          label: seasonLabel,
          seasonNumber: rawSeasonNo != null ? rawSeasonNo : (i + 1)
        };
      }
    }

    var episodesMap = detailInfo && detailInfo.episodes ? detailInfo.episodes : {};
    for (var seasonKey in episodesMap) {
      if (!episodesMap.hasOwnProperty(seasonKey)) continue;
      if (!seasonLookup[seasonKey]) {
        seasonLookup[seasonKey] = {
          key: String(seasonKey),
          label: seasonKey === '0' ? 'Trailer' : ('Season ' + seasonKey),
          seasonNumber: parseInt(seasonKey, 10) || seasonKey
        };
      }
    }

    for (var key in seasonLookup) {
      if (seasonLookup.hasOwnProperty(key)) {
        seasons.push(seasonLookup[key]);
      }
    }

    seasons.sort(function (a, b) {
      var aNum = parseInt(a.seasonNumber, 10);
      var bNum = parseInt(b.seasonNumber, 10);
      if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
      return String(a.label).localeCompare(String(b.label));
    });

    return seasons;
  }

  function getEpisodesForSeason(detailInfo, seasonKey) {
    var map = detailInfo && detailInfo.episodes ? detailInfo.episodes : {};
    var list = map && map[seasonKey] ? map[seasonKey] : [];
    if ((seasonKey === '0' || seasonKey === 'trailer') && (!Array.isArray(list) || !list.length)) {
      list = buildTrailerEntries(state.detailItem, detailInfo);
    }
    return Array.isArray(list) ? list : [];
  }

  function getEpisodeId(episode) {
    return episode && (episode.id || episode.stream_id || episode.episode_id || (episode.info && episode.info.movie_id)) || '';
  }

  function getEpisodeTitle(episode, index) {
    if (!episode) return 'Episode';
    return episode.title || episode.name || ('Episode ' + (index + 1));
  }

  function getEpisodeMeta(episode) {
    var bits = [];
    if (!episode) return '';
    if (episode.__isTrailer) return 'Trailer';
    if (episode.episode_num != null) bits.push('Episode ' + episode.episode_num);
    if (episode.info && episode.info.duration) bits.push(episode.info.duration);
    if (episode.info && episode.info.release_date) bits.push(episode.info.release_date);
    return bits.join(' • ');
  }

  function getCatalogConfig(mode) {
    var activeMode = mode || state.catalogMode;

    if (activeMode === 'movies') {
      return {
        sidebarId: 'sidebar-movies',
        sectionLabel: 'Movies',
        badgeLabel: 'MOVIE',
        loadingCategoriesText: 'Loading movie categories...',
        loadingItemsText: 'Loading movies...',
        loadingTitleText: 'Loading Movies...',
        loadingDetailText: 'Please wait...',
        emptyItemsText: 'No movies in this category',
        emptyDetailText: 'This category contains no movies.',
        errorTitleText: 'Error Loading Movies',
        loadCategories: apiGetVodCategories,
        loadItems: apiGetVodStreams
      };
    }

    if (activeMode === 'series') {
      return {
        sidebarId: 'sidebar-series',
        sectionLabel: 'Series',
        badgeLabel: 'SERIES',
        loadingCategoriesText: 'Loading series categories...',
        loadingItemsText: 'Loading series...',
        loadingTitleText: 'Loading Series...',
        loadingDetailText: 'Please wait...',
        emptyItemsText: 'No series in this category',
        emptyDetailText: 'This category contains no series.',
        errorTitleText: 'Error Loading Series',
        loadCategories: apiGetSeriesCategories,
        loadItems: apiGetSeries
      };
    }

    return {
      sidebarId: 'sidebar-live',
      sectionLabel: 'Live TV',
      badgeLabel: 'LIVE',
      loadingCategoriesText: 'Loading categories...',
      loadingItemsText: 'Loading channels...',
      loadingTitleText: 'Loading Channels...',
      loadingDetailText: 'Please wait...',
      emptyItemsText: 'No channels in this category',
      emptyDetailText: 'This category contains no channels.',
      errorTitleText: 'Error Loading Channels',
      loadCategories: apiGetCategories,
      loadItems: apiGetStreams
    };
  }

  function getCatalogGridColumnCount() {
    return state.catalogMode === 'live' ? 4 : 5;
  }

  function setSidebarActiveById(sidebarId) {
    var sidebarIds = ['sidebar-home', 'sidebar-live', 'sidebar-movies', 'sidebar-series', 'sidebar-search', 'sidebar-watchlist', 'sidebar-settings'];

    for (var i = 0; i < sidebarIds.length; i++) {
      var item = document.getElementById(sidebarIds[i]);
      if (!item) continue;

      if (sidebarIds[i] === sidebarId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    }
  }

  function getSidebarFocusIndex(mode) {
    var activeMode = mode || state.catalogMode;
    return SIDEBAR_MODE_INDEX.hasOwnProperty(activeMode) ? SIDEBAR_MODE_INDEX[activeMode] : 0;
  }

  function setSidebarActiveItem(mode) {
    var activeConfig = getCatalogConfig(mode);
    setSidebarActiveById(activeConfig.sidebarId);
  }

  function getCatalogItemId(item, mode) {
    var activeMode = mode || state.catalogMode;
    if (!item) return '';
    return activeMode === 'series' ? item.series_id : item.stream_id;
  }

  function cleanContentTitle(title, item) {
    if (!title) return '';
    var cleaned = String(title);

    // Extract year suffix (e.g. (2010), [2010], or just 2010)
    var yearMatch = cleaned.match(/(?:[ \-\(_\[]|\b)(19\d{2}|20\d{2})(?:\b|[\)\]_]|$)/);
    if (yearMatch) {
      var year = yearMatch[1];
      if (item && !item.releaseDate && !item.releasedate) {
        item.releaseDate = year;
      }
    }

    // Remove year suffixes from the end of the title
    cleaned = cleaned.replace(/(?:\s*[\-\(_\[]|\s+)(19\d{2}|20\d{2})(?:\s*[\)\]]|\s*)$/gi, '');

    // Common junk tags to strip
    var junkRegex = /\b(?:1080p?|720p?|2160p|4k|uhd|fhd|sd|3d|hevc|x265|x264|h264|h265|bluray|bdrip|webrip|web-?dl|dvdrip|hdtv|dd5\.1|5\.1|dual|multi|dublaj|dubbed|subbed|altyazılı|alt|hd|fhd)\b/gi;
    cleaned = cleaned.replace(junkRegex, '');

    // Remove specific language tags like -TR-, -EN-, -TR-EN-
    cleaned = cleaned.replace(/[-_]?(?:TR|EN|TR[-_]EN|EN[-_]TR)[-_]?/gi, '');

    // Clean up empty parentheses/brackets
    cleaned = cleaned.replace(/\(\s*\)|\[\s*\]|\{\s*\}/g, '');

    // Clean up trailing and leading separators and whitespace
    cleaned = cleaned.replace(/^[\s\-\.\_\/\\|:]+|[\s\-\.\_\/\\|:]+$/g, '');
    cleaned = cleaned.replace(/\s+/g, ' ');
    cleaned = cleaned.replace(/\s*-\s*-\s*/g, ' - ');
    cleaned = cleaned.replace(/^[\s\-\.\_\/\\|:]+|[\s\-\.\_\/\\|:]+$/g, '');

    return cleaned;
  }

  function getCatalogItemName(item) {
    if (!item || !item.name) return 'Untitled';
    return cleanContentTitle(item.name, item);
  }

  function getCatalogItemArtwork(item, mode) {
    var activeMode = mode || state.catalogMode;
    if (!item) return '';
    if (activeMode === 'series') {
      return item.cover || '';
    }
    return item.stream_icon || '';
  }

  function getCatalogItemSummary(item, mode) {
    var activeMode = mode || state.catalogMode;
    if (!item) return '';
    if (item.plot) return item.plot;
    if (item.genre) return item.genre;
    return activeMode === 'series'
      ? 'Browse episodes inside this series.'
      : 'Select a title to explore this section.';
  }

  function getCatalogItemMeta(item, mode) {
    var activeMode = mode || state.catalogMode;
    var bits = [];

    if (item && item.genre) bits.push(item.genre);
    if (item && item.rating) bits.push('Rating ' + item.rating);
    if (item && item.releaseDate) bits.push(item.releaseDate);
    if (item && item.last_modified && activeMode === 'series') bits.push('Updated ' + item.last_modified);

    return bits.join(' • ');
  }

  function renderCatalogDetails(item) {
    var detailsCategory = document.getElementById('details-category-name');
    var detailsTitle = document.getElementById('details-channel-name');
    var detailsCopy = document.getElementById('details-epg-info');
    var meta = getCatalogItemMeta(item);
    var summary = getCatalogItemSummary(item);

    detailsCategory.textContent = state.selectedCategoryName.toUpperCase();
    detailsTitle.textContent = getCatalogItemName(item);

    var html = '<div class="catalog-detail-copy">';
    if (meta) {
      html += '<div class="catalog-detail-meta">' + escapeHtml(meta) + '</div>';
    }
    html += '<div class="catalog-detail-body">' + escapeHtml(summary.length > 260 ? summary.slice(0, 260) + '...' : summary) + '</div>';
    html += '</div>';
    detailsCopy.innerHTML = html;
  }

  function buildDetailMetaLine(mode, item, detailInfo) {
    var info = detailInfo && detailInfo.info ? detailInfo.info : {};
    var movieData = detailInfo && detailInfo.movie_data ? detailInfo.movie_data : {};
    var bits = [];

    if (info.genre || item.genre) bits.push(info.genre || item.genre);
    if (info.rating || item.rating) bits.push('Rating ' + (info.rating || item.rating));
    if (info.releaseDate || info.releasedate || info.release_date || movieData.releasedate || item.releaseDate) {
      bits.push(info.releaseDate || info.releasedate || info.release_date || movieData.releasedate || item.releaseDate);
    }
    if (info.duration || movieData.duration) bits.push(info.duration || movieData.duration);
    if (mode === 'series' && info.last_modified) bits.push('Updated ' + info.last_modified);

    return bits.join(' • ');
  }

  function buildDetailSummary(mode, item, detailInfo) {
    var info = detailInfo && detailInfo.info ? detailInfo.info : {};
    var summary = stripHtml(info.plot || item.plot || item.description || '');

    if (!summary) {
      summary = mode === 'series'
        ? 'Open a season to browse episodes and start playback.'
        : 'Open this title to start playback or save it to favorites.';
    }

    return summary;
  }

  function updateDetailFavoriteButton() {
    var button = document.getElementById('detail-btn-favorite');
    if (!button || !state.detailItem) return;
    button.textContent = isFavoriteItem(state.detailMode, getCatalogItemId(state.detailItem, state.detailMode))
      ? 'Remove Favorite'
      : 'Add to Favorites';
  }

  function renderDetailActionCopy(mode, item, detailInfo) {
    var typeLabel = document.getElementById('detail-type-label');
    var title = document.getElementById('detail-main-title');
    var meta = document.getElementById('detail-main-meta');
    var summary = document.getElementById('detail-main-summary');
    var poster = document.getElementById('detail-poster-image');
    var artwork = getDetailPosterArtwork(item, detailInfo, mode);
    var backdropArt = getBackdropArtwork(item, detailInfo, mode);

    typeLabel.textContent = getContentTypeLabel(mode).toUpperCase();
    title.textContent = getCatalogItemName(item);
    meta.textContent = buildDetailMetaLine(mode, item, detailInfo) || (mode === 'series' ? 'Series' : 'Movie');
    summary.textContent = buildDetailSummary(mode, item, detailInfo);

    if (artwork) {
      poster.style.display = 'block';
      poster.src = artwork;
    } else {
      poster.style.display = 'none';
      poster.removeAttribute('src');
    }

    applyDetailBackdrop(backdropArt, artwork);

    updateDetailFavoriteButton();
  }

  function renderDetailSeasons() {
    var container = document.getElementById('detail-seasons');
    container.innerHTML = '';

    for (var i = 0; i < state.detailSeasons.length; i++) {
      var season = state.detailSeasons[i];
      var button = document.createElement('button');
      button.className = 'focusable content-detail-season-chip';
      if (i === state.detailSelectedSeasonIndex) {
        button.className += ' active';
      }
      button.setAttribute('tabindex', '-1');
      button.setAttribute('data-index', i);
      button.textContent = season.label;
      button.onclick = function () {
        var idx = parseInt(this.getAttribute('data-index'), 10);
        selectDetailSeason(idx, true);
      };
      container.appendChild(button);
    }
  }

  function parseEpisodeTitleInfo(title, index, seriesName) {
    var cleanTitle = title || '';
    if (seriesName) {
      var prefix = seriesName + ' - ';
      if (cleanTitle.indexOf(prefix) === 0) {
        cleanTitle = cleanTitle.substring(prefix.length);
      } else if (cleanTitle.indexOf(seriesName) === 0) {
        cleanTitle = cleanTitle.substring(seriesName.length).replace(/^[ \-\:\.]+/g, '');
      }
    }
    var code = '';
    var name = cleanTitle;
    var matchSE = cleanTitle.match(/(S\d+E\d+)/i);
    if (matchSE) {
      code = matchSE[1].toUpperCase();
      name = cleanTitle.replace(matchSE[1], '').replace(/^[ \-\:\.]+|[ \-\:\.]+$/g, '');
    } else {
      var matchE = cleanTitle.match(/(E\d+)/i);
      if (matchE) {
        code = matchE[1].toUpperCase();
        name = cleanTitle.replace(matchE[1], '').replace(/^[ \-\:\.]+|[ \-\:\.]+$/g, '');
      } else {
        var matchX = cleanTitle.match(/(\d+x\d+)/i);
        if (matchX) {
          code = matchX[1];
          name = cleanTitle.replace(matchX[1], '').replace(/^[ \-\:\.]+|[ \-\:\.]+$/g, '');
        }
      }
    }
    if (!name.trim()) {
      name = 'Episode ' + (index + 1);
    }
    return {
      code: code,
      name: name
    };
  }

  function renderDetailEpisodes() {
    var container = document.getElementById('detail-episodes');
    container.innerHTML = '';

    if (!state.detailEpisodes.length) {
      container.innerHTML = '<div class="content-detail-empty">No episodes available for this season.</div>';
      return;
    }

    var backdropArt = getBackdropArtwork(state.detailItem, state.detailInfo, state.detailMode);
    var seriesName = getCatalogItemName(state.detailItem);

    for (var i = 0; i < state.detailEpisodes.length; i++) {
      var episode = state.detailEpisodes[i];
      var button = document.createElement('button');
      button.className = 'focusable content-detail-episode-card';
      button.setAttribute('tabindex', '-1');
      button.setAttribute('data-index', i);

      // Extract image path (still image first, then backdrop fallback)
      var imgUrl = '';
      if (isValidImageUrl(episode.still)) {
        imgUrl = normalizeLegacyImageUrl(episode.still);
      } else if (isValidImageUrl(episode.still_path)) {
        imgUrl = normalizeLegacyImageUrl(episode.still_path);
      } else if (episode.info && isValidImageUrl(episode.info.still_path)) {
        imgUrl = normalizeLegacyImageUrl(episode.info.still_path);
      } else if (episode.info && isValidImageUrl(episode.info.movie_image)) {
        imgUrl = normalizeLegacyImageUrl(episode.info.movie_image);
      } else if (isValidImageUrl(backdropArt)) {
        imgUrl = normalizeLegacyImageUrl(backdropArt);
      }

      // Parse title info to strip series prefix and obtain clean code and name
      var titleInfo = parseEpisodeTitleInfo(episode.title || episode.name, i, seriesName);
      var epCode = episode.__isTrailer ? 'TRAILER' : (titleInfo.code || ('EP ' + (episode.episode_num || (i + 1))));
      var epName = episode.__isTrailer ? (safeTrim(episode.title || episode.name) || 'Official Trailer') : titleInfo.name;

      var html = '<div class="episode-card-image-wrap">';
      if (imgUrl) {
        // Use background-image on a div to cover/fit perfectly in Chrome 38 without object-fit stretching.
        // Include a hidden img tag with onerror to handle image loading failures.
        html += '<div class="episode-card-image" style="background-image: url(\'' + String(imgUrl).replace(/'/g, '\\\'') + '\');">';
        html += '  <img src="' + imgUrl + '" style="display:none;" onerror="this.parentNode.style.backgroundImage=\'url(./assets/fallback_image.jpeg)\'; this.onerror=null;" />';
        html += '</div>';
      } else {
        html += '<div class="episode-card-image-placeholder"></div>';
      }
      html += '  <div class="episode-card-badge">' + escapeHtml(epCode) + '</div>';
      html += '</div>';
      html += '<div class="episode-card-content">';
      html += '  <div class="episode-card-title">' + escapeHtml(epName) + '</div>';
      
      var metaText = getEpisodeMeta(episode);
      if (metaText) {
        metaText = metaText.replace(/^Episode \d+ • /i, '');
        // Remove duplicate episode code from metadata line if present
        metaText = metaText.replace(new RegExp('^' + epCode + '\\s*•?\\s*', 'i'), '');
        html += '  <div class="episode-card-meta">' + escapeHtml(metaText) + '</div>';
      }
      html += '</div>';

      button.innerHTML = html;

      button.onclick = function () {
        var idx = parseInt(this.getAttribute('data-index'), 10);
        var selectedEpisode = state.detailEpisodes[idx];
        if (selectedEpisode && selectedEpisode.__isTrailer) {
          playDetailTrailer(selectedEpisode, getCatalogItemName(state.detailItem));
          return;
        }
        playSeriesEpisode(selectedEpisode, getCatalogItemName(state.detailItem));
      };

      container.appendChild(button);
    }
  }

  function selectDetailSeason(index, moveFocus) {
    if (index < 0 || index >= state.detailSeasons.length) return;
    state.detailSelectedSeasonIndex = index;
    var season = state.detailSeasons[index];
    state.detailEpisodes = getEpisodesForSeason(state.detailInfo, season.key);
    renderDetailSeasons();
    renderDetailEpisodes();

    if (moveFocus) {
      state.focusedPanel = 'detail-seasons';
      state.focusedIndex = index;
      updateFocusUI();
    }
  }

  function renderSeriesSection(detailInfo) {
    var section = document.getElementById('detail-series-section');

    state.detailSeasons = normalizeSeriesSeasons(detailInfo);
    if (getDetailTrailerUrl(state.detailItem, detailInfo)) {
      var hasTrailerSeason = false;
      for (var i = 0; i < state.detailSeasons.length; i++) {
        if (state.detailSeasons[i].key === '0' || state.detailSeasons[i].key === 'trailer' || state.detailSeasons[i].label === 'Trailer') {
          hasTrailerSeason = true;
          break;
        }
      }
      if (!hasTrailerSeason) {
        state.detailSeasons.unshift({
          key: 'trailer',
          label: 'Trailer',
          seasonNumber: -1
        });
      }
    }
    state.detailSelectedSeasonIndex = 0;
    state.detailEpisodes = [];

    if (!state.detailSeasons.length) {
      section.style.display = 'none';
      return;
    }

    section.style.display = 'flex';
    selectDetailSeason(0, false);
  }

  function renderContentDetail(item, mode, detailInfo) {
    var detailView = document.querySelector('#view-content-detail .content-detail-view');
    state.detailInfo = detailInfo || null;

    if (detailView) {
      detailView.classList.remove('detail-mode-movie');
      detailView.classList.remove('detail-mode-series');
      detailView.classList.add(mode === 'series' ? 'detail-mode-series' : 'detail-mode-movie');
    }

    renderDetailActionCopy(mode, item, detailInfo);

    if (mode === 'series') {
      renderSeriesSection(detailInfo);
    } else {
      document.getElementById('detail-series-section').style.display = 'none';
      state.detailSeasons = [];
      state.detailEpisodes = [];
      state.detailSelectedSeasonIndex = 0;
    }
  }

  function showContentDetail(item, mode) {
    var detailMode = mode || state.catalogMode;
    var itemId = detailMode === 'series' ? item.series_id : item.stream_id;

    state.detailItem = item;
    state.detailMode = detailMode;
    state.detailSourceIndex = state.focusedIndex;
    state.detailReturnViewId = state.currentViewId || 'view-catalog';
    state.detailReturnPanel = state.focusedPanel || 'catalog-channels';
    state.detailReturnIndex = state.focusedIndex || 0;
    state.detailInfo = null;
    state.detailSeasons = [];
    state.detailEpisodes = [];
    state.detailSelectedSeasonIndex = 0;
    state.focusedPanel = 'detail-actions';
    state.focusedIndex = 0;

    renderContentDetail(item, detailMode, null);
    document.getElementById('detail-main-meta').textContent = 'Loading details...';
    document.getElementById('detail-main-summary').textContent = 'Please wait while Smartifly loads the full content details.';
    document.getElementById('detail-series-section').style.display = 'none';

    showView('view-content-detail');
    updateFocusUI();

    function onDetailLoaded(detailInfo) {
      if (!state.detailItem) return;
      var activeId = detailMode === 'series' ? state.detailItem.series_id : state.detailItem.stream_id;
      if (String(activeId) !== String(itemId)) return;
      renderContentDetail(item, detailMode, detailInfo);
      updateFocusUI();
    }

    function onDetailError(err) {
      if (!state.detailItem) return;
      var activeId = detailMode === 'series' ? state.detailItem.series_id : state.detailItem.stream_id;
      if (String(activeId) !== String(itemId)) return;
      document.getElementById('detail-main-meta').textContent = 'Details unavailable';
      document.getElementById('detail-main-summary').textContent = err || 'Unable to load this content right now.';
      document.getElementById('detail-series-section').style.display = 'none';
      updateFocusUI();
    }

    if (detailMode === 'series') {
      apiGetSeriesInfo(state.session.portalBaseUrl, state.session.username, state.session.userInfo.password, item.series_id, onDetailLoaded, onDetailError);
    } else {
      apiGetVodInfo(state.session.portalBaseUrl, state.session.username, state.session.userInfo.password, item.stream_id, onDetailLoaded, onDetailError);
    }
  }

  function closeContentDetail() {
    state.detailItem = null;
    state.detailInfo = null;
    state.detailSeasons = [];
    state.detailEpisodes = [];
    if ((state.detailReturnViewId || 'view-catalog') === 'view-watchlist') {
      renderWatchlist();
    } else if ((state.detailReturnViewId || 'view-catalog') === 'view-catalog' && state.detailReturnPanel === 'home-rails') {
      refreshHomeView();
    }
    state.focusedPanel = state.detailReturnPanel || 'catalog-channels';
    state.focusedIndex = state.detailReturnIndex || 0;
    showView(state.detailReturnViewId || 'view-catalog');
    updateFocusUI();
  }

  function getModeGridColumnCount(mode) {
    return mode === 'live' ? 4 : 5;
  }

  function createMediaCard(item, mode, index, onActivate) {
    var config = getCatalogConfig(mode);
    var card = document.createElement('div');
    card.className = 'channel-card focusable';
    card.setAttribute('tabindex', '-1');

    if (mode !== 'live') {
      card.className += ' channel-card--poster';
    }
    if (mode === 'live' && state.activeChannel && String(state.activeChannel.stream_id) === String(item.stream_id)) {
      card.className += ' active';
    }

    card.setAttribute('data-id', getCatalogItemId(item, mode));
    card.setAttribute('data-index', index);
    card.setAttribute('data-name', getCatalogItemName(item));

    var badge = document.createElement('div');
    badge.className = 'channel-live-badge';
    badge.textContent = config.badgeLabel;
    card.appendChild(badge);

    var logoWrap = document.createElement('div');
    logoWrap.className = 'channel-logo-container';

    if (getCatalogItemArtwork(item, mode)) {
      var img = document.createElement('img');
      img.src = getCatalogItemArtwork(item, mode);
      img.onerror = function() {
        this.style.display = 'none';
        this.parentNode.textContent = this.parentNode.parentNode.getAttribute('data-name');
      };
      logoWrap.appendChild(img);
    } else {
      logoWrap.textContent = getCatalogItemName(item);
    }

    card.appendChild(logoWrap);
    card.onclick = function () { onActivate(index); };
    return card;
  }

  function setWatchlistFilterButtonsActive() {
    var ids = ['watchlist-filter-all', 'watchlist-filter-movies', 'watchlist-filter-series'];
    for (var i = 0; i < ids.length; i++) {
      var el = document.getElementById(ids[i]);
      if (!el) continue;
      el.classList.remove('active');
    }
    var activeEl = document.getElementById('watchlist-filter-' + state.watchlistFilter);
    if (activeEl) activeEl.classList.add('active');
  }

  function getFilterableSearchText(item, mode) {
    var bits = [
      getCatalogItemName(item),
      item && item.name ? String(item.name) : '',
      item && item.genre ? item.genre : '',
      getCatalogItemSummary(item, mode),
      item && item.category_id ? String(item.category_id) : '',
      item && item.releaseDate ? String(item.releaseDate) : '',
      item && item.releasedate ? String(item.releasedate) : '',
      item && item.rating ? String(item.rating) : '',
      item && item.rating_5based ? String(item.rating_5based) : '',
      item && item.added ? String(item.added) : '',
      item && item.last_modified ? String(item.last_modified) : ''
    ];
    return bits.join(' ').toLowerCase();
  }

  function filterSearchItems(items, query, mode) {
    var q = String(query || '').trim().toLowerCase();
    if (!q) return [];
    var results = [];
    for (var i = 0; i < items.length; i++) {
      if (getFilterableSearchText(items[i], mode).indexOf(q) !== -1) {
        results.push(items[i]);
      }
    }
    return results;
  }

  function getSearchKeyboardRows() {
    var shifted = !!state.searchKeyboardShifted;
    var rows = [];

    for (var i = 0; i < SEARCH_KEYBOARD_LAYOUT.length; i++) {
      var rawRow = SEARCH_KEYBOARD_LAYOUT[i];
      var row = [];

      for (var j = 0; j < rawRow.length; j++) {
        var value = rawRow[j];
        if (value === 'shift') {
          row.push({ action: 'shift', label: shifted ? 'LOWER' : 'UPPER', span: 1, accent: false });
        } else if (value === 'backspace') {
          row.push({ action: 'backspace', label: 'DEL', span: 1, accent: false });
        } else if (value === 'clear') {
          row.push({ action: 'clear', label: 'CLEAR', span: 1, accent: false });
        } else if (value === 'space') {
          row.push({ action: 'space', label: 'SPACE', span: 2, accent: false });
        } else if (value === 'search') {
          row.push({ action: 'search', label: 'SEARCH', span: 2, accent: true });
        } else {
          row.push({
            action: 'char',
            label: shifted ? String(value).toUpperCase() : String(value),
            value: shifted ? String(value).toUpperCase() : String(value),
            span: 1,
            accent: false
          });
        }
      }

      rows.push(row);
    }

    state.searchKeyboardRows = rows;
    return rows;
  }

  function getSearchKeyboardFlatIndex(row, col) {
    var rows = state.searchKeyboardRows.length ? state.searchKeyboardRows : getSearchKeyboardRows();
    var index = 0;
    for (var i = 0; i < rows.length; i++) {
      if (i === row) {
        return index + Math.max(0, Math.min(col, rows[i].length - 1));
      }
      index += rows[i].length;
    }
    return 0;
  }

  function getSearchKeyboardPosition(flatIndex) {
    var rows = state.searchKeyboardRows.length ? state.searchKeyboardRows : getSearchKeyboardRows();
    var index = 0;
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      if (flatIndex < index + row.length) {
        return { row: i, col: flatIndex - index };
      }
      index += row.length;
    }
    return { row: 0, col: 0 };
  }

  function getSearchCardArtwork(item, mode) {
    var url = '';
    if (!item) return '';

    if (mode === 'movies') {
      url = item.stream_icon || item.backdrop_path || item.direct_source || '';
    } else if (mode === 'series') {
      if (typeof item.backdrop_path === 'string' && item.backdrop_path) {
        url = item.backdrop_path;
      } else if (item.backdrop_path && item.backdrop_path.length) {
        url = item.backdrop_path[0];
      }
      url = url || item.cover || '';
    } else {
      url = item.stream_icon || item.direct_source || '';
    }

    return normalizeLegacyImageUrl(url);
  }

  function getSearchCardMeta(item, mode) {
    var bits = [];
    if (mode !== 'live') {
      var rDate = item.releaseDate || item.releasedate;
      if (!rDate && item.name) {
        var yearMatch = String(item.name).match(/(?:[ \-\(_\[]|\b)(19\d{2}|20\d{2})(?:\b|[\)\]_]|$)/);
        if (yearMatch) {
          rDate = yearMatch[1];
        }
      }

      if (rDate) {
        bits.push(String(rDate).split('-')[0]);
      } else if (item.added) {
        var addedStr = String(item.added);
        if (/^\d+$/.test(addedStr)) {
          var val = parseInt(addedStr, 10);
          var date;
          if (addedStr.length === 10) {
            date = new Date(val * 1000);
          } else if (addedStr.length === 13) {
            date = new Date(val);
          }
          if (date && !isNaN(date.getTime())) {
            bits.push(String(date.getFullYear()));
          } else {
            bits.push(addedStr.split('-')[0]);
          }
        } else {
          bits.push(addedStr.split('-')[0]);
        }
      }
      if (item.rating_5based || item.rating) {
        bits.push('Rating ' + (item.rating_5based || item.rating));
      }
    } else if (item.category_id) {
      bits.push('Category ' + item.category_id);
    }

    return bits;
  }

  function buildSearchSuggestionRails() {
    var rails = [];
    var preferredIds = ['movies', 'series', 'live'];

    for (var i = 0; i < preferredIds.length; i++) {
      var railId = preferredIds[i];
      var section = null;
      for (var j = 0; j < state.homeSections.length; j++) {
        if (state.homeSections[j].id === railId) {
          section = state.homeSections[j];
          break;
        }
      }

      if (!section || !section.entries || !section.entries.length) {
        continue;
      }

      var items = [];
      for (var k = 0; k < section.entries.length && k < MAX_SEARCH_RAIL_ITEMS; k++) {
        items.push({
          mode: section.entries[k].mode,
          item: section.entries[k].item
        });
      }

      rails.push({
        id: railId,
        label: section.title,
        items: items
      });
    }

    return rails;
  }

  function buildSearchResultRails(query) {
    var q = String(query || '').trim();
    if (!q) {
      return buildSearchSuggestionRails();
    }

    var movieResults = filterSearchItems(state.searchCache.movies || [], q, 'movies').slice(0, MAX_SEARCH_RAIL_ITEMS);
    var seriesResults = filterSearchItems(state.searchCache.series || [], q, 'series').slice(0, MAX_SEARCH_RAIL_ITEMS);
    var liveResults = filterSearchItems(state.searchCache.live || [], q, 'live').slice(0, MAX_SEARCH_RAIL_ITEMS);

    return [
      {
        id: 'movies',
        label: 'Movies',
        items: movieResults.map(function (item) { return { mode: 'movies', item: item }; })
      },
      {
        id: 'series',
        label: 'Series',
        items: seriesResults.map(function (item) { return { mode: 'series', item: item }; })
      },
      {
        id: 'live',
        label: 'Live Channels',
        items: liveResults.map(function (item) { return { mode: 'live', item: item }; })
      }
    ];
  }

  function updateSearchQueryDisplay() {
    var node = document.getElementById('search-query-display');
    if (!node) return;
    node.textContent = state.searchQuery || 'Type a title, genre, or year';
  }

  function renderSearchKeyboard() {
    var container = document.getElementById('search-keyboard');
    var rows = getSearchKeyboardRows();
    var html = '';

    for (var i = 0; i < rows.length; i++) {
      html += '<div class="legacy-search-keyboard-row">';
      for (var j = 0; j < rows[i].length; j++) {
        var key = rows[i][j];
        var classes = 'focusable legacy-search-key';
        if (key.accent) classes += ' legacy-search-key--accent';
        if (key.span > 1) classes += ' legacy-search-key--span-' + key.span;
        html += '<button type="button" tabindex="-1" class="' + classes + '" data-row="' + i + '" data-col="' + j + '">' + escapeHtml(key.label) + '</button>';
      }
      html += '</div>';
    }

    container.innerHTML = html;

    var buttons = container.querySelectorAll('.legacy-search-key');
    for (var idx = 0; idx < buttons.length; idx++) {
      buttons[idx].onclick = function () {
        var row = parseInt(this.getAttribute('data-row'), 10) || 0;
        var col = parseInt(this.getAttribute('data-col'), 10) || 0;
        activateSearchKeyboardKey(row, col);
      };
    }
  }

  function getSearchResultsCount() {
    var total = 0;
    for (var i = 0; i < state.searchRails.length; i++) {
      total += state.searchRails[i].items.length;
    }
    return total;
  }

  function findSearchRailInDirection(startIndex, direction) {
    var index = startIndex;
    while (index >= 0 && index < state.searchRails.length) {
      if (state.searchRails[index] && state.searchRails[index].items && state.searchRails[index].items.length) {
        return index;
      }
      index += direction;
    }
    return -1;
  }

  function focusSearchHeader(index) {
    state.focusedPanel = 'search-header';
    state.focusedIndex = Math.max(0, Math.min(index, 1));
    updateFocusUI();
  }

  function focusSearchKeyboard(row, col) {
    state.focusedPanel = 'search-keyboard';
    state.focusedIndex = getSearchKeyboardFlatIndex(row, col);
    updateFocusUI();
  }

  function getSearchRailFlatIndex(sectionIndex, cardIndex) {
    var flat = 0;
    for (var i = 0; i < state.searchRails.length; i++) {
      if (i === sectionIndex) {
        return flat + Math.max(0, Math.min(cardIndex, state.searchRails[i].items.length - 1));
      }
      flat += state.searchRails[i].items.length;
    }
    return 0;
  }

  function focusSearchResult(sectionIndex, cardIndex) {
    if (!state.searchRails[sectionIndex] || !state.searchRails[sectionIndex].items.length) {
      return;
    }
    state.focusedPanel = 'search-results';
    state.focusedIndex = getSearchRailFlatIndex(sectionIndex, cardIndex);
    updateFocusUI();
  }

  function setSearchSummary(message) {
    var node = document.getElementById('search-summary');
    if (node) {
      node.textContent = message || '';
    }
  }

  function renderSearchResults() {
    var container = document.getElementById('search-results-rails');
    var query = String(state.searchQuery || '').trim();
    var html = '';

    if (state.searchLoading && query) {
      setSearchSummary('Scanning movies, series, and live channels for "' + query + '"...');
    } else if (!query) {
      setSearchSummary(state.searchRails.length ? 'Suggested rails from your current Smartifly session.' : 'Start typing to search across your portal catalog.');
    } else {
      var totalResults = getSearchResultsCount();
      if (!totalResults) {
        setSearchSummary('No results matched "' + query + '".');
      } else {
        setSearchSummary(totalResults + ' result' + (totalResults === 1 ? '' : 's') + ' found for "' + query + '".');
      }
    }

    if (state.searchLoading && query && !state.searchRails.length) {
      container.innerHTML = '<div class="legacy-search-empty">Loading the searchable catalog. Results will populate automatically.</div>';
      return;
    }

    if (!state.searchRails.length) {
      container.innerHTML = '<div class="legacy-search-empty">' + (query ? 'No results found. Try a different title, year, or genre keyword.' : 'Search suggestions will appear here once home content is available.') + '</div>';
      return;
    }

    for (var i = 0; i < state.searchRails.length; i++) {
      var rail = state.searchRails[i];
      html += '<section class="legacy-search-rail" data-section-index="' + i + '">';
      html += '<div class="legacy-search-rail-label">' + escapeHtml(rail.label) + '</div>';

      if (!rail.items.length) {
        html += '<div class="legacy-search-empty">No ' + escapeHtml(rail.label.toLowerCase()) + ' match.</div>';
      } else {
        html += '<div class="legacy-search-rail-track">';
        for (var j = 0; j < rail.items.length; j++) {
          var entry = rail.items[j];
          var mode = entry.mode;
          var item = entry.item;
          var isLive = mode === 'live';
          var cardClass = 'focusable legacy-search-card ' + (isLive ? 'legacy-search-card--live' : 'legacy-search-card--poster');
          var art = getSearchCardArtwork(item, mode);
          html += '<button type="button" tabindex="-1" class="' + cardClass + '" data-section-index="' + i + '" data-card-index="' + j + '" data-mode="' + mode + '" data-id="' + escapeHtml(String(getCatalogItemId(item, mode))) + '">';
          html += '<div class="legacy-search-card-shell">';
          html += '<div class="legacy-search-card-badge">' + escapeHtml(getContentTypeLabel(mode).toUpperCase()) + '</div>';
          if (art) {
            html += '<div class="legacy-search-card-art" style="background-image:url(\'' + String(art).replace(/'/g, '\\\'') + '\');"></div>';
          } else {
            html += '<div class="legacy-search-card-fallback">' + escapeHtml(getCatalogItemName(item)) + '</div>';
          }
          html += '</div>';
          html += '<div class="legacy-search-card-copy">';
          html += '<div class="legacy-search-card-title">' + escapeHtml(getCatalogItemName(item)) + '</div>';
          html += '</div>';
          html += '</button>';
        }
        html += '</div>';
      }
      html += '</section>';
    }

    container.innerHTML = html;

    var cards = container.querySelectorAll('.legacy-search-card');
    for (var c = 0; c < cards.length; c++) {
      cards[c].onclick = function () {
        var sectionIndex = parseInt(this.getAttribute('data-section-index'), 10) || 0;
        var cardIndex = parseInt(this.getAttribute('data-card-index'), 10) || 0;
        activateSearchResult(sectionIndex, cardIndex);
      };
    }
  }

  function rebuildSearchRails() {
    state.searchRails = buildSearchResultRails(state.searchQuery);
    state.searchResults = [];
    for (var i = 0; i < state.searchRails.length; i++) {
      for (var j = 0; j < state.searchRails[i].items.length; j++) {
        state.searchResults.push(state.searchRails[i].items[j]);
      }
    }
    renderSearchResults();
  }

  function syncSearchFocusAfterRender() {
    if (state.focusedPanel === 'search-results' && !getSearchResultsCount()) {
      focusSearchHeader(0);
      return;
    }

    updateFocusUI();
  }

  function executeSearch() {
    var query = String(state.searchQuery || '').trim();
    rebuildSearchRails();

    if (!query) {
      state.searchLoading = false;
      renderSearchResults();
      syncSearchFocusAfterRender();
      return;
    }

    var missingModes = [];
    var modes = ['movies', 'series', 'live'];
    for (var i = 0; i < modes.length; i++) {
      if (!state.searchCache[modes[i]]) {
        missingModes.push(modes[i]);
      }
    }

    if (!missingModes.length) {
      state.searchLoading = false;
      rebuildSearchRails();
      syncSearchFocusAfterRender();
      return;
    }

    state.searchLoading = true;
    renderSearchResults();

    var pending = missingModes.length;
    var failedModes = [];

    function finalizeSearchLoad() {
      pending--;
      if (pending > 0) return;
      state.searchLoading = false;
      rebuildSearchRails();
      if (failedModes.length) {
        setSearchSummary('Search loaded with partial results. Failed: ' + failedModes.join(', ') + '.');
      }
      syncSearchFocusAfterRender();
    }

    for (var j = 0; j < missingModes.length; j++) {
      (function (mode) {
        var config = getCatalogConfig(mode);
        config.loadItems(state.session.portalBaseUrl, state.session.username, state.session.userInfo.password, '', function (items) {
          state.searchCache[mode] = items || [];
          finalizeSearchLoad();
        }, function () {
          state.searchCache[mode] = [];
          failedModes.push(getContentTypeLabel(mode));
          finalizeSearchLoad();
        });
      })(missingModes[j]);
    }
  }

  function scheduleSearchExecution() {
    if (state.searchQueryDebounce) {
      clearTimeout(state.searchQueryDebounce);
    }
    state.searchQueryDebounce = setTimeout(function () {
      executeSearch();
    }, 220);
  }

  function setSearchQueryValue(nextValue) {
    state.searchQuery = String(nextValue || '');
    updateSearchQueryDisplay();
    var scrollNode = document.getElementById('search-results-scroll');
    if (scrollNode) {
      scrollNode.scrollTop = 0;
    }
    scheduleSearchExecution();
  }

  function activateSearchKeyboardKey(row, col) {
    var rows = state.searchKeyboardRows.length ? state.searchKeyboardRows : getSearchKeyboardRows();
    var key = rows[row] && rows[row][col] ? rows[row][col] : null;
    if (!key) return;

    if (key.action === 'char') {
      setSearchQueryValue(state.searchQuery + (key.value || key.label));
      return;
    }
    if (key.action === 'space') {
      setSearchQueryValue(state.searchQuery + ' ');
      return;
    }
    if (key.action === 'backspace') {
      setSearchQueryValue(state.searchQuery.slice(0, -1));
      return;
    }
    if (key.action === 'clear') {
      setSearchQueryValue('');
      return;
    }
    if (key.action === 'shift') {
      state.searchKeyboardShifted = !state.searchKeyboardShifted;
      renderSearchKeyboard();
      focusSearchKeyboard(row, col);
      return;
    }

    if (getSearchResultsCount() > 0) {
      var firstSection = findSearchRailInDirection(0, 1);
      if (firstSection >= 0) {
        focusSearchResult(firstSection, 0);
      }
    }
  }

  function activateSearchResult(sectionIndex, cardIndex) {
    var rail = state.searchRails[sectionIndex];
    if (!rail || !rail.items[cardIndex]) return;
    var entry = rail.items[cardIndex];
    if (entry.mode === 'live') {
      var liveQueue = rail.items.map(function (it) { return it.item; });
      playChannel(entry.item, liveQueue);
    } else {
      showContentDetail(entry.item, entry.mode);
    }
  }

  function openSearchView() {
    setSidebarActiveById('sidebar-search');
    showView('view-search');
    state.searchKeyboardShifted = false;
    renderSearchKeyboard();
    updateSearchQueryDisplay();
    state.focusedPanel = 'search-header';
    state.focusedIndex = 0;
    executeSearch();
    updateFocusUI();
  }

  function getCurrentProfileFavoritesPrefix() {
    var portalCode = state.session && state.session.portalCode ? state.session.portalCode : 'default';
    var profileId = state.selectedProfile && state.selectedProfile.id ? state.selectedProfile.id : 'default';
    return portalCode + '::' + profileId + '::';
  }

  function buildFavoriteFallbackItem(entry) {
    if (entry.mode === 'series') {
      return {
        series_id: entry.id,
        name: entry.name,
        cover: entry.artwork || ''
      };
    }
    return {
      stream_id: entry.id,
      name: entry.name,
      stream_icon: entry.artwork || '',
      container_extension: 'mp4'
    };
  }

  function collectWatchlistItems(filterMode) {
    var prefix = getCurrentProfileFavoritesPrefix();
    var results = [];

    for (var key in state.favorites) {
      if (!state.favorites.hasOwnProperty(key)) continue;
      if (key.indexOf(prefix) !== 0) continue;

      var bucket = state.favorites[key];
      for (var itemKey in bucket) {
        if (!bucket.hasOwnProperty(itemKey)) continue;
        var entry = bucket[itemKey];
        if (filterMode && filterMode !== 'all' && entry.mode !== filterMode) continue;
        results.push({
          id: entry.id,
          mode: entry.mode,
          savedAt: entry.savedAt,
          categoryName: entry.categoryName || '',
          item: entry.item || buildFavoriteFallbackItem(entry)
        });
      }
    }

    results.sort(function (a, b) {
      return String(b.savedAt || '').localeCompare(String(a.savedAt || ''));
    });
    return results;
  }

  function renderWatchlist() {
    var container = document.getElementById('watchlist-results-grid');
    var summary = document.getElementById('watchlist-summary');
    container.innerHTML = '';

    setWatchlistFilterButtonsActive();
    state.watchlistItems = collectWatchlistItems(state.watchlistFilter);

    if (!state.watchlistItems.length) {
      summary.textContent = 'No saved titles for this profile yet.';
      container.innerHTML = '<div class="utility-empty">Use the favorite button on a movie or series to save it here.</div>';
      return;
    }

    summary.textContent = state.watchlistItems.length + ' saved title' + (state.watchlistItems.length === 1 ? '' : 's') + ' in your watchlist.';

    for (var i = 0; i < state.watchlistItems.length; i++) {
      (function (idx) {
        var entry = state.watchlistItems[idx];
        container.appendChild(createMediaCard(entry.item, entry.mode, idx, function () {
          showContentDetail(entry.item, entry.mode);
        }));
      })(i);
    }
  }

  function openWatchlistView() {
    setSidebarActiveById('sidebar-watchlist');
    showView('view-watchlist');
    state.focusedPanel = 'watchlist-controls';
    state.focusedIndex = 0;
    renderWatchlist();
    updateFocusUI();
  }

  function setWatchlistFilter(filter) {
    state.watchlistFilter = filter;
    renderWatchlist();
    updateFocusUI();
  }

  function clearCurrentProfileFavorites() {
    var prefix = getCurrentProfileFavoritesPrefix();
    for (var key in state.favorites) {
      if (!state.favorites.hasOwnProperty(key)) continue;
      if (key.indexOf(prefix) === 0) {
        delete state.favorites[key];
      }
    }
    saveFavoritesState();
  }

  function updateSettingsView() {
    document.getElementById('settings-portal-code').textContent = state.session && state.session.portalCode ? state.session.portalCode : '-';
    document.getElementById('settings-server-name').textContent = state.session && state.session.serverName ? state.session.serverName : '-';
    document.getElementById('settings-username').textContent = state.session && state.session.username ? state.session.username : '-';
    document.getElementById('settings-profile').textContent = state.selectedProfile ? ('Profile: ' + state.selectedProfile.name) : 'No active profile';

    var count = collectWatchlistItems('all').length;
    document.getElementById('settings-watchlist-count').textContent = count + ' saved';
  }

  function openSettingsView() {
    setSidebarActiveById('sidebar-settings');
    showView('view-settings');
    state.focusedPanel = 'settings-actions';
    state.focusedIndex = 0;
    updateSettingsView();
    updateFocusUI();
  }

  function returnToCatalogSidebar(sidebarKey) {
    setCatalogScreen(sidebarKey === 'home' ? 'home' : 'browse');
    if (sidebarKey === 'home') {
      refreshHomeView();
    }
    showView('view-catalog');
    state.focusedPanel = 'catalog-sidebar';
    state.focusedIndex = getSidebarFocusIndex(sidebarKey || state.catalogMode);
    updateFocusUI();
  }

  function setCatalogScreen(screen) {
    state.catalogScreen = screen;
    document.getElementById('home-panel').style.display = screen === 'home' ? 'block' : 'none';
    document.getElementById('browse-panels').style.display = screen === 'browse' ? 'flex' : 'none';
  }

  function buildHomeEntry(mode, item, categoryName, meta) {
    return {
      mode: mode,
      item: item,
      categoryName: categoryName || '',
      meta: meta || ''
    };
  }

  function getHomeEntryMeta(entry) {
    if (!entry) return '';
    var bits = [getContentTypeLabel(entry.mode)];
    if (entry.categoryName) bits.push(entry.categoryName);
    if (entry.meta) bits.push(entry.meta);
    return bits.join(' • ');
  }

  function pickHeroEntry(sections) {
    var candidates = [];
    var i, j;

    for (i = 0; i < sections.length; i++) {
      if (sections[i].id !== 'trending') continue;
      for (j = 0; j < sections[i].entries.length; j++) {
        candidates.push(sections[i].entries[j]);
      }
    }

    if (!candidates.length) return null;

    var bestEntry = null;
    var bestScore = -1;

    for (var k = 0; k < candidates.length; k++) {
      var entry = candidates[k];
      var item = entry.item;
      if (!item) continue;

      var score = 0;

      // Prefer Movie/Series over Live TV for the hero banner
      if (entry.mode !== 'live') {
        score += 10;
      }

      // Check for valid backdrop artwork
      var backdrop = item.backdrop_path || item.backdrop;
      if (backdrop && String(backdrop).toLowerCase() !== 'null' && String(backdrop).toLowerCase() !== 'undefined' && String(backdrop).trim() !== '') {
        score += 20;
      }

      // Check for valid plot description
      var plot = item.plot;
      if (plot && String(plot).toLowerCase() !== 'null' && String(plot).toLowerCase() !== 'undefined' && String(plot).trim() !== '') {
        score += 10;
      }

      // Check for rating
      var rating = item.rating || item.rating_5star;
      if (rating && String(rating).toLowerCase() !== 'null' && String(rating).trim() !== '') {
        score += 2;
      }

      // Check for release date or year
      var year = item.releaseDate || item.year;
      if (year && String(year).toLowerCase() !== 'null' && String(year).trim() !== '') {
        score += 2;
      }

      if (score > bestScore) {
        bestScore = score;
        bestEntry = entry;
      }
    }

    return bestEntry || candidates[0];
  }

  function dedupeHomeEntries(entries) {
    var seen = {};
    var result = [];
    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      if (!entry || !entry.item) continue;
      var key = entry.mode + '::' + getCatalogItemId(entry.item, entry.mode);
      if (seen[key]) continue;
      seen[key] = true;
      result.push(entry);
      if (result.length >= MAX_HOME_RAIL_ITEMS) break;
    }
    return result;
  }

  function buildTrendingEntries() {
    var entries = [];
    var movieCache = state.homeCatalogCache.movies;
    var seriesCache = state.homeCatalogCache.series;
    var history = getCurrentProfileHistoryEntries();
    var i;

    for (i = 0; i < history.length; i++) {
      var historyEntry = history[i];
      if (!historyEntry || historyEntry.mode === 'live') continue;
      var source = historyEntry.mode === 'series' ? seriesCache : movieCache;
      if (source && source.items) {
        for (var j = 0; j < source.items.length && j < 4; j++) {
          entries.push(buildHomeEntry(historyEntry.mode, source.items[j], source.categoryName, 'Because you watched ' + historyEntry.name));
        }
      }
    }

    if (movieCache && movieCache.items) {
      for (i = 0; i < movieCache.items.length && i < 8; i++) {
        entries.push(buildHomeEntry('movies', movieCache.items[i], movieCache.categoryName, 'Trending movie pick'));
      }
    }
    if (seriesCache && seriesCache.items) {
      for (i = 0; i < seriesCache.items.length && i < 8; i++) {
        entries.push(buildHomeEntry('series', seriesCache.items[i], seriesCache.categoryName, 'Trending series pick'));
      }
    }

    return dedupeHomeEntries(entries);
  }

  function buildHomeSections() {
    var sections = [];
    var continueEntries = [];
    var history = getCurrentProfileHistoryEntries();
    var i;

    for (i = 0; i < history.length && i < MAX_HOME_RAIL_ITEMS; i++) {
      var historyEntry = history[i];
      continueEntries.push(buildHomeEntry(historyEntry.mode, historyEntry.item || buildFavoriteFallbackItem(historyEntry), '', 'Recently played'));
    }

    sections.push({
      id: 'continue',
      title: 'Continue Watching',
      subtitle: continueEntries.length ? 'Pick up where you left off.' : 'Start something to build this rail.',
      entries: continueEntries
    });

    sections.push({
      id: 'trending',
      title: 'Trending For You',
      subtitle: 'A lightweight mix based on your recent viewing.',
      entries: buildTrendingEntries()
    });

    sections.push({
      id: 'live',
      title: 'Live TV Channels',
      subtitle: state.homeCatalogCache.live && state.homeCatalogCache.live.categoryName ? state.homeCatalogCache.live.categoryName : 'Top live channels',
      entries: state.homeCatalogCache.live && state.homeCatalogCache.live.items ? state.homeCatalogCache.live.items.slice(0, MAX_HOME_RAIL_ITEMS).map(function (item) {
        return buildHomeEntry('live', item, state.homeCatalogCache.live.categoryName, 'Live now');
      }) : []
    });

    sections.push({
      id: 'movies',
      title: 'Movies',
      subtitle: state.homeCatalogCache.movies && state.homeCatalogCache.movies.categoryName ? state.homeCatalogCache.movies.categoryName : 'Featured movies',
      entries: state.homeCatalogCache.movies && state.homeCatalogCache.movies.items ? state.homeCatalogCache.movies.items.slice(0, MAX_HOME_RAIL_ITEMS).map(function (item) {
        return buildHomeEntry('movies', item, state.homeCatalogCache.movies.categoryName, 'Featured movie');
      }) : []
    });

    sections.push({
      id: 'series',
      title: 'Series',
      subtitle: state.homeCatalogCache.series && state.homeCatalogCache.series.categoryName ? state.homeCatalogCache.series.categoryName : 'Featured series',
      entries: state.homeCatalogCache.series && state.homeCatalogCache.series.items ? state.homeCatalogCache.series.items.slice(0, MAX_HOME_RAIL_ITEMS).map(function (item) {
        return buildHomeEntry('series', item, state.homeCatalogCache.series.categoryName, 'Featured series');
      }) : []
    });

    state.homeSections = sections;
    state.homeHeroEntry = pickHeroEntry(sections);
  }

  var homeHeroTimer = null;
  var homeHeroCache = {};

  function getHomeEntryMetaWithDetail(entry, detailInfo) {
    if (!entry) return '';
    var activeMode = entry.mode;
    var item = entry.item;
    var info = detailInfo && detailInfo.info ? detailInfo.info : {};
    var movieData = detailInfo && detailInfo.movie_data ? detailInfo.movie_data : {};
    var bits = [getContentTypeLabel(activeMode)];

    if (info.genre || item.genre) bits.push(info.genre || item.genre);
    if (info.rating || item.rating) bits.push('Rating ' + (info.rating || item.rating));
    if (info.releaseDate || info.releasedate || info.release_date || movieData.releasedate || item.releaseDate) {
      bits.push(info.releaseDate || info.releasedate || info.release_date || movieData.releasedate || item.releaseDate);
    }
    if (info.duration || movieData.duration) bits.push(info.duration || movieData.duration);

    return bits.join(' • ');
  }

  function getCatalogItemSummaryWithDetail(item, detailInfo, mode) {
    var activeMode = mode || state.catalogMode;
    var info = detailInfo && detailInfo.info ? detailInfo.info : {};
    var summary = stripHtml(info.plot || item.plot || item.description || '');

    if (!summary) {
      summary = activeMode === 'series'
        ? 'Browse seasons and episodes inside this series.'
        : 'Select this title to explore or start playback.';
    }

    return summary;
  }

  function getPrimaryGenreText(item, detailInfo) {
    var info = detailInfo && detailInfo.info ? detailInfo.info : {};
    var raw = safeTrim(info.genre || (item && item.genre) || '');
    if (!raw) return '';
    return raw.split(',')[0].trim();
  }

  function getHeroReleaseText(item, detailInfo) {
    var info = detailInfo && detailInfo.info ? detailInfo.info : {};
    var movieData = detailInfo && detailInfo.movie_data ? detailInfo.movie_data : {};
    return safeTrim(
      info.releaseDate ||
      info.releasedate ||
      info.release_date ||
      movieData.releasedate ||
      (item && (item.releaseDate || item.releasedate || item.release_date)) ||
      ''
    );
  }

  function getHeroRatingText(item, detailInfo) {
    var info = detailInfo && detailInfo.info ? detailInfo.info : {};
    return safeTrim((info.rating || (item && item.rating) || ''));
  }

  function setHomeHeroText(el, value) {
    if (!el) return;
    var text = safeTrim(value);
    el.textContent = text;
    el.style.display = text ? '' : 'none';
  }

  function updateHomeHero(entry, detailInfo) {
    var heroImage = document.getElementById('home-hero-image');
    var overline = document.getElementById('home-hero-overline');
    var typeBadge = document.getElementById('home-hero-type-badge');
    var title = document.getElementById('home-hero-title');
    var summary = document.getElementById('home-hero-summary');
    var kicker = document.getElementById('home-hero-kicker');
    var ratingPill = document.getElementById('home-hero-rating-pill');
    var datePill = document.getElementById('home-hero-date-pill');
    var genrePill = document.getElementById('home-hero-genre-pill');
    var metaRow = document.getElementById('home-hero-meta-row');
    var playBtn = document.getElementById('home-hero-btn-play');
    var detailsBtn = document.getElementById('home-hero-btn-details');

    if (!entry) {
      entry = state.homeHeroEntry;
    }

    if (!entry) {
      setHomeHeroText(overline, '');
      setHomeHeroText(typeBadge, '');
      setHomeHeroText(kicker, '');
      if (title) title.textContent = 'No Featured Content';
      if (summary) summary.textContent = 'Add some viewing history or load portal content to populate the home banner.';
      if (metaRow) metaRow.style.display = 'none';
      if (heroImage) {
        heroImage.style.backgroundImage = '';
        heroImage.style.opacity = '0';
      }
      return;
    }

    var typeLabel = getContentTypeLabel(entry.mode).toUpperCase();
    var categoryLabel = safeTrim(entry.categoryName);
    var genreLabel = getPrimaryGenreText(entry.item, detailInfo);
    var overlineText = categoryLabel || genreLabel || typeLabel;
    var kickerText = '';

    if (genreLabel && categoryLabel && genreLabel.toLowerCase() !== categoryLabel.toLowerCase()) {
      kickerText = genreLabel.toUpperCase();
    } else if (!categoryLabel && genreLabel && genreLabel.toUpperCase() !== typeLabel) {
      kickerText = genreLabel.toUpperCase();
    }

    setHomeHeroText(overline, overlineText);
    setHomeHeroText(typeBadge, typeLabel);
    setHomeHeroText(kicker, kickerText);
    if (title) title.textContent = getCatalogItemName(entry.item);
    
    if (detailInfo) {
      if (summary) summary.textContent = getCatalogItemSummaryWithDetail(entry.item, detailInfo, entry.mode);
    } else {
      if (summary) summary.textContent = getCatalogItemSummary(entry.item, entry.mode);
    }

    // Pills metadata
    if (metaRow) {
      var ratingVal = getHeroRatingText(entry.item, detailInfo);
      var dateVal = getHeroReleaseText(entry.item, detailInfo);
      var genrePillVal = genreLabel || categoryLabel;
      var hasMeta = !!(ratingVal || dateVal || genrePillVal);

      if (!hasMeta) {
        metaRow.style.display = 'none';
      } else {
        metaRow.style.display = 'flex';
        setHomeHeroText(ratingPill, ratingVal);
        setHomeHeroText(datePill, dateVal);
        setHomeHeroText(genrePill, genrePillVal);
      }
    }

    // Bind actions
    if (playBtn) {
      playBtn.onclick = function (e) {
        if (e) e.stopPropagation();
        if (entry.mode === 'live') {
          playChannel(entry.item, [entry.item]);
        } else if (entry.mode === 'movies') {
          playMovie(entry.item, detailInfo);
        } else if (entry.mode === 'series') {
          var detail = detailInfo || homeHeroCache[entry.mode + '_' + getCatalogItemId(entry.item, entry.mode)];
          if (detail) {
            var seasons = normalizeSeriesSeasons(detail);
            if (seasons.length) {
              var episodes = getEpisodesForSeason(detail, seasons[0].key);
              if (episodes.length) {
                playSeriesEpisode(episodes[0], getCatalogItemName(entry.item));
                return;
              }
            }
          }
          showContentDetail(entry.item, entry.mode);
        }
      };
    }

    if (detailsBtn) {
      detailsBtn.onclick = function (e) {
        if (e) e.stopPropagation();
        showContentDetail(entry.item, entry.mode);
      };
    }

    var artwork = getBackdropArtwork(entry.item, detailInfo, entry.mode);
    if (heroImage) {
      if (artwork) {
        heroImage.style.backgroundImage = 'url("' + String(artwork).replace(/"/g, '%22') + '")';
        heroImage.style.opacity = '1';
      } else {
        heroImage.style.backgroundImage = '';
        heroImage.style.opacity = '0';
      }
    }
  }

  function triggerHomeHeroUpdate(entry) {
    if (homeHeroTimer) {
      clearTimeout(homeHeroTimer);
      homeHeroTimer = null;
    }

    if (!entry) {
      updateHomeHero(null, null);
      return;
    }

    updateHomeHero(entry, null);

    if (entry.mode === 'live') {
      return;
    }

    var streamId = getCatalogItemId(entry.item, entry.mode);
    var cacheKey = entry.mode + '_' + streamId;

    if (homeHeroCache[cacheKey]) {
      updateHomeHero(entry, homeHeroCache[cacheKey]);
      return;
    }

    homeHeroTimer = setTimeout(function () {
      if (entry.mode === 'movies') {
        apiGetVodInfo(state.session.portalBaseUrl, state.session.username, state.session.userInfo.password, streamId, function (detail) {
          homeHeroCache[cacheKey] = detail;
          var current = getCurrentlyFocusedHomeEntry();
          if (current && getCatalogItemId(current.item, current.mode) === streamId) {
            updateHomeHero(current, detail);
          } else if (!current && state.homeHeroEntry && getCatalogItemId(state.homeHeroEntry.item, state.homeHeroEntry.mode) === streamId) {
            updateHomeHero(state.homeHeroEntry, detail);
          }
        }, function () {});
      } else if (entry.mode === 'series') {
        apiGetSeriesInfo(state.session.portalBaseUrl, state.session.username, state.session.userInfo.password, streamId, function (detail) {
          homeHeroCache[cacheKey] = detail;
          var current = getCurrentlyFocusedHomeEntry();
          if (current && getCatalogItemId(current.item, current.mode) === streamId) {
            updateHomeHero(current, detail);
          } else if (!current && state.homeHeroEntry && getCatalogItemId(state.homeHeroEntry.item, state.homeHeroEntry.mode) === streamId) {
            updateHomeHero(state.homeHeroEntry, detail);
          }
        }, function () {});
      }
    }, 350);
  }

  function getCurrentlyFocusedHomeEntry() {
    if (state.focusedPanel !== 'home-rails') return null;
    var currentFocusables = getFocusableElements();
    var focusedEl = currentFocusables[state.focusedIndex];
    if (focusedEl && focusedEl.classList.contains('home-card')) {
      var idx = parseInt(focusedEl.getAttribute('data-index'), 10);
      return getHomeEntryByFlatIndex(idx);
    }
    return null;
  }

  function focusHomeHero(buttonIndex) {
    var homeScroll = document.getElementById('home-scroll');
    if (homeScroll) {
      homeScroll.scrollTop = 0;
      setTimeout(function () {
        homeScroll.scrollTop = 0;
      }, 0);
      setTimeout(function () {
        homeScroll.scrollTop = 0;
      }, 50);
    }
    state.focusedPanel = 'home-hero';
    state.focusedIndex = buttonIndex != null ? buttonIndex : 0;
    updateFocusUI();
  }

  function renderHomeHero() {
    triggerHomeHeroUpdate(state.homeHeroEntry);
    var heroEl = document.getElementById('home-hero');
    if (heroEl) {
      heroEl.onclick = function () {
        if (state.homeHeroEntry) {
          if (state.homeHeroEntry.mode === 'live') {
            playChannel(state.homeHeroEntry.item, [state.homeHeroEntry.item]);
          } else {
            showContentDetail(state.homeHeroEntry.item, state.homeHeroEntry.mode);
          }
        }
      };
    }
  }

  function renderHomeRails() {
    var container = document.getElementById('home-rails');
    var flatIndex = 0;
    container.innerHTML = '';

    if (state.homeLoading && !state.homeSections.length) {
      container.innerHTML = '<div class="home-empty">Loading your home rails...</div>';
      return;
    }

    for (var i = 0; i < state.homeSections.length; i++) {
      var section = state.homeSections[i];
      var rail = document.createElement('div');
      rail.className = 'home-rail';
      rail.setAttribute('data-rail-index', i);

      var header = document.createElement('div');
      header.className = 'home-rail-header';
      header.innerHTML = '<div class="home-rail-title">' + escapeHtml(section.title) + '</div><div class="home-rail-subtitle">' + escapeHtml(section.subtitle) + '</div>';
      rail.appendChild(header);

      if (!section.entries.length) {
        var empty = document.createElement('div');
        empty.className = 'home-empty';
        empty.textContent = section.id === 'continue' ? 'Nothing to resume yet.' : 'No content available right now.';
        rail.appendChild(empty);
        container.appendChild(rail);
        continue;
      }

      var track = document.createElement('div');
      track.className = 'home-rail-track';
      track.setAttribute('data-rail-track-index', i);

      for (var j = 0; j < section.entries.length; j++) {
        var entry = section.entries[j];
        var button = document.createElement('button');
        
        var artwork, cardClass, imageClass;
        if (section.id === 'continue') {
          artwork = getBackdropArtwork(entry.item, null, entry.mode);
          cardClass = 'home-card home-card--landscape';
          imageClass = 'home-card__image';
        } else if (entry.mode === 'live') {
          artwork = getCatalogItemArtwork(entry.item, entry.mode);
          cardClass = 'home-card home-card--live';
          imageClass = 'home-card__image home-card__image--contain';
        } else {
          artwork = getCatalogItemArtwork(entry.item, entry.mode);
          cardClass = 'home-card home-card--poster';
          imageClass = 'home-card__image';
        }

        button.className = 'focusable ' + cardClass;
        button.setAttribute('tabindex', '-1');
        button.setAttribute('data-index', flatIndex);
        button.setAttribute('data-rail-index', i);
        button.setAttribute('data-card-index', j);
        button.setAttribute('data-mode', entry.mode);

        var html = '';
        html += '<div class="home-card__image-container">';
        html += '  <div class="home-card__badge home-card__badge--' + entry.mode + '">' + escapeHtml(getContentTypeLabel(entry.mode).toUpperCase()) + '</div>';
        if (artwork) {
          html += '  <div class="' + imageClass + '" style="background-image:url(\'' + String(artwork).replace(/'/g, '%27') + '\')"></div>';
        } else {
          html += '  <div class="' + imageClass + '"><div class="home-card__fallback">' + escapeHtml(getCatalogItemName(entry.item)) + '</div></div>';
        }
        html += '</div>';
        html += '<div class="home-card__info">';
        html += '  <div class="home-card__title">' + escapeHtml(getCatalogItemName(entry.item)) + '</div>';
        html += '  <div class="home-card__meta">' + escapeHtml(getHomeEntryMeta(entry)) + '</div>';
        html += '</div>';
        button.innerHTML = html;
        button.onclick = function () {
          var idx = parseInt(this.getAttribute('data-index'), 10);
          var selected = getHomeEntryByFlatIndex(idx);
          if (!selected) return;
          if (selected.mode === 'live') {
            playChannel(selected.item, state.homeSections[parseInt(this.getAttribute('data-rail-index'), 10)].entries.map(function (it) { return it.item; }));
          } else {
            showContentDetail(selected.item, selected.mode);
          }
        };
        track.appendChild(button);
        flatIndex++;
      }

      rail.appendChild(track);
      container.appendChild(rail);
    }
  }

  function getHomeEntryByFlatIndex(flatIndex) {
    var count = 0;
    for (var i = 0; i < state.homeSections.length; i++) {
      var section = state.homeSections[i];
      for (var j = 0; j < section.entries.length; j++) {
        if (count === flatIndex) return section.entries[j];
        count++;
      }
    }
    return null;
  }

  function getHomeFlatIndex(railIndex, cardIndex) {
    var count = 0;
    for (var i = 0; i < state.homeSections.length; i++) {
      var section = state.homeSections[i];
      for (var j = 0; j < section.entries.length; j++) {
        if (i === railIndex && j === cardIndex) return count;
        count++;
      }
    }
    return 0;
  }

  function refreshHomeView() {
    buildHomeSections();
    renderHomeHero();
    renderHomeRails();
  }

  function fetchHomeCatalogMode(mode, done) {
    if (state.homeCatalogCache[mode]) {
      done();
      return;
    }

    var config = getCatalogConfig(mode);
    config.loadCategories(state.session.portalBaseUrl, state.session.username, state.session.userInfo.password, function (cats) {
      var category = cats && cats.length ? cats[0] : null;
      if (!category) {
        state.homeCatalogCache[mode] = { categoryName: '', items: [] };
        done();
        return;
      }

      config.loadItems(state.session.portalBaseUrl, state.session.username, state.session.userInfo.password, category.category_id, function (items) {
        state.homeCatalogCache[mode] = {
          categoryName: category.category_name || '',
          items: (items || []).slice(0, MAX_HOME_RAIL_ITEMS)
        };
        done();
      }, function () {
        state.homeCatalogCache[mode] = { categoryName: category.category_name || '', items: [] };
        done();
      });
    }, function () {
      state.homeCatalogCache[mode] = { categoryName: '', items: [] };
      done();
    });
  }

  function loadHomeData(onComplete) {
    var remaining = 3;
    state.homeLoading = true;
    refreshHomeView();

    function finishOne() {
      remaining--;
      if (remaining <= 0) {
        state.homeLoading = false;
        refreshHomeView();
        if (onComplete) onComplete();
      }
    }

    fetchHomeCatalogMode('live', finishOne);
    fetchHomeCatalogMode('movies', finishOne);
    fetchHomeCatalogMode('series', finishOne);
  }

  function openHomeView(forceReload) {
    if (forceReload) {
      state.homeCatalogCache.live = null;
      state.homeCatalogCache.movies = null;
      state.homeCatalogCache.series = null;
    }

    setCatalogScreen('home');
    showView('view-catalog');
    setSidebarActiveById('sidebar-home');

    if (forceReload || !state.homeCatalogCache.live || !state.homeCatalogCache.movies || !state.homeCatalogCache.series) {
      loadHomeData(function () {
        state.focusedPanel = document.getElementById('home-rails').querySelectorAll('.focusable').length ? 'home-rails' : 'catalog-sidebar';
        state.focusedIndex = 0;
        updateFocusUI();
      });
    } else {
      refreshHomeView();
    }

    state.focusedPanel = document.getElementById('home-rails').querySelectorAll('.focusable').length ? 'home-rails' : 'catalog-sidebar';
    state.focusedIndex = 0;
    updateFocusUI();
  }

  function fetchEPGForChannel(channel) {
    var streamId = channel.stream_id;
    apiGetShortEpg(state.session.portalBaseUrl, state.session.username, state.session.userInfo.password, streamId, function (listings) {
      var activeHeaderCh = null;
      if (state.focusedPanel === 'catalog-channels') {
        activeHeaderCh = state.channels[state.focusedIndex];
      } else {
        activeHeaderCh = state.channels[0];
      }
      
      if (!activeHeaderCh || String(activeHeaderCh.stream_id) !== String(streamId)) {
        return;
      }
      
      renderEPG(listings, channel);
    }, function (err) {
      var activeHeaderCh = null;
      if (state.focusedPanel === 'catalog-channels') {
        activeHeaderCh = state.channels[state.focusedIndex];
      } else {
        activeHeaderCh = state.channels[0];
      }
      
      if (!activeHeaderCh || String(activeHeaderCh.stream_id) !== String(streamId)) {
        return;
      }
      document.getElementById('details-epg-info').textContent = 'Guide unavailable for this channel';
    });
  }

  function renderEPG(listings, channel) {
    var container = document.getElementById('details-epg-info');
    container.innerHTML = '';
    
    if (!listings || listings.length === 0) {
      container.textContent = 'Guide unavailable for this channel';
      return;
    }
    
    var nowMs = Date.now();
    var currentProgram = null;
    var nextProgram = null;
    
    for (var i = 0; i < listings.length; i++) {
      var item = listings[i];
      var startTimestamp = parseInt(item.start_timestamp || 0, 10) * 1000;
      var stopTimestamp = parseInt(item.stop_timestamp || 0, 10) * 1000;
      
      if (nowMs >= startTimestamp && nowMs <= stopTimestamp) {
        currentProgram = item;
      } else if (startTimestamp > nowMs && !nextProgram) {
        nextProgram = item;
      }
    }
    
    if (!currentProgram && listings.length > 0) {
      currentProgram = listings[0];
    }
    
    if (!currentProgram) {
      container.textContent = 'Guide unavailable for this channel';
      return;
    }
    
    var currentTitle = decodeXtreamBase64(currentProgram.title) || 'Live Broadcast';
    var currentDesc = decodeXtreamBase64(currentProgram.description) || '';
    var startVal = parseInt(currentProgram.start_timestamp || 0, 10) * 1000;
    var stopVal = parseInt(currentProgram.stop_timestamp || 0, 10) * 1000;
    
    var timeStr = '';
    var progressPercent = 0;
    if (startVal && stopVal) {
      timeStr = formatTime(startVal) + ' - ' + formatTime(stopVal);
      var duration = stopVal - startVal;
      if (duration > 0) {
        progressPercent = Math.min(100, Math.max(0, ((nowMs - startVal) / duration) * 100));
      }
    }
    
    var html = '<div class="epg-container">';
    html += '  <div class="epg-current-title">' + escapeHtml(currentTitle) + '</div>';
    html += '  <div class="epg-meta">';
    if (timeStr) {
      html += '    <span class="epg-time">' + timeStr + '</span>';
    }
    if (currentDesc) {
      var truncatedDesc = currentDesc.length > 120 ? currentDesc.slice(0, 120) + '...' : currentDesc;
      html += '    <span class="epg-desc">' + escapeHtml(truncatedDesc) + '</span>';
    }
    html += '  </div>';
    
    if (startVal && stopVal) {
      html += '  <div class="epg-progress-bar">';
      html += '    <div class="epg-progress-fill" style="width: ' + Math.round(progressPercent) + '%;"></div>';
      html += '  </div>';
    }
    
    if (nextProgram) {
      var nextTitle = decodeXtreamBase64(nextProgram.title) || 'Next Program';
      var nextStart = parseInt(nextProgram.start_timestamp || 0, 10) * 1000;
      html += '  <div class="epg-next">Next: ' + escapeHtml(nextTitle);
      if (nextStart) {
        html += ' (' + formatTime(nextStart) + ')';
      }
      html += '  </div>';
    } else {
      html += '  <div class="epg-next">Next: Schedule unavailable</div>';
    }
    
    html += '</div>';
    container.innerHTML = html;
  }

  // --- VIEWS ROUTING ---
  function showView(viewId) {
    var views = document.querySelectorAll('.view');
    for (var i = 0; i < views.length; i++) {
      views[i].classList.remove('active');
    }
    var activeView = document.getElementById(viewId);
    if (activeView) {
      activeView.classList.add('active');
    }
    state.currentViewId = viewId;
  }

  // --- STORAGE HELPERS ---
  function loadLocalState() {
    try {
      var savedSession = localStorage.getItem(SESSION_KEY);
      if (savedSession) {
        state.session = JSON.parse(savedSession);
      }
      var savedProfiles = localStorage.getItem(PROFILES_KEY);
      if (savedProfiles) {
        state.profiles = JSON.parse(savedProfiles);
      }
    } catch (e) {
      console.error('Failed to load local storage state:', e);
    }

    loadFavoritesState();
    loadWatchHistoryState();
  }

  function saveSessionState(session, profiles) {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
      localStorage.setItem(PORTAL_KEY, session.portalCode);
    } catch (e) {
      console.error(e);
    }
  }

  function saveSelectedProfile(profile) {
    try {
      localStorage.setItem(SELECTED_PROFILE_KEY, profile ? profile.id : '');
    } catch (e) {
      console.error(e);
    }
  }

  // --- INITIAL BOOT ---
  function init() {
    loadLocalState();
    
    // Scroll lock to prevent cut-off of Hero when focused
    var homeScroll = document.getElementById('home-scroll');
    if (homeScroll) {
      homeScroll.addEventListener('scroll', function () {
        if (state.focusedPanel === 'home-hero' && homeScroll.scrollTop !== 0) {
          homeScroll.scrollTop = 0;
        }
      });
    }
    
    // Check if session exists
    if (state.session) {
      if (!Array.isArray(state.profiles) || state.profiles.length === 0) {
        state.profiles = createDefaultProfiles(state.session.username);
        saveSessionState(state.session, state.profiles);
      }

      // Load saved profile if any
      var savedProfileId = localStorage.getItem(SELECTED_PROFILE_KEY);
      if (savedProfileId && state.profiles) {
        for (var i = 0; i < state.profiles.length; i++) {
          if (state.profiles[i].id === savedProfileId) {
            state.selectedProfile = state.profiles[i];
            break;
          }
        }
      }
      
      if (state.selectedProfile) {
        openHomeView();
      } else {
        setupProfilesView();
      }
    } else {
      setupWelcomeView();
    }
  }

  // --- WELCOME CONTROLLER ---
  function setupWelcomeView() {
    state.focusedPanel = 'welcome';
    state.focusedIndex = 0;
    showView('view-welcome');
    updateFocusUI();
  }

  // --- LOGIN CONTROLLER ---
  function setupLoginView() {
    state.focusedPanel = 'login';
    state.focusedIndex = 0;
    state.loginPending = false;
    state.loginRequestId = 0;
    state.loginResolvedPortal = null;
    
    // Autofill last portal code if available
    var lastPortal = localStorage.getItem(PORTAL_KEY);
    if (lastPortal) {
      document.getElementById('login-code').value = lastPortal;
    }
    
    document.getElementById('login-user').value = '';
    document.getElementById('login-pass').value = '';
    clearLoginErrors();
    setLoginResolvedPortal(null);
    setLoginStatus('Enter your portal identity and Xtream credentials.', 'idle');
    setLoginPending(false);
    
    showView('view-login');
    updateFocusUI();
  }

  function clearLoginErrors() {
    var fieldIds = ['code', 'user', 'pass'];
    for (var i = 0; i < fieldIds.length; i++) {
      var fieldId = fieldIds[i];
      var inputNode = document.getElementById('login-' + fieldId);
      var errorNode = document.getElementById('login-error-' + fieldId);
      if (inputNode) {
        inputNode.classList.remove('input-error');
      }
      if (errorNode) {
        errorNode.textContent = '';
      }
    }
  }

  function setLoginFieldError(fieldId, message) {
    var inputNode = document.getElementById('login-' + fieldId);
    var errorNode = document.getElementById('login-error-' + fieldId);
    if (inputNode) {
      inputNode.classList.add('input-error');
    }
    if (errorNode) {
      errorNode.textContent = message || '';
    }
  }

  function setLoginStatus(message, tone) {
    var statusNode = document.getElementById('login-status');
    if (!statusNode) return;

    statusNode.textContent = message || '';
    statusNode.className = 'status-text status-text--' + (tone || 'idle');
  }

  function setLoginResolvedPortal(portal) {
    state.loginResolvedPortal = portal || null;

    var nameNode = document.getElementById('login-server-name');
    var urlNode = document.getElementById('login-server-url');
    if (!nameNode || !urlNode) return;

    if (!portal) {
      nameNode.textContent = 'Waiting for validation';
      urlNode.textContent = 'Enter a portal code and continue to resolve the target server.';
      return;
    }

    nameNode.textContent = portal.name || portal.portalCode || 'Resolved portal';
    urlNode.textContent = normalizeBaseUrl(portal.baseUrl || '');
  }

  function setLoginPending(isPending) {
    state.loginPending = !!isPending;

    var submitBtn = document.getElementById('login-btn-submit');
    var backBtn = document.getElementById('login-btn-back');
    var inputIds = ['login-code', 'login-user', 'login-pass'];

    if (submitBtn) {
      submitBtn.disabled = !!isPending;
      submitBtn.textContent = isPending ? 'Connecting...' : 'Connect Portal';
    }
    if (backBtn) {
      backBtn.disabled = !!isPending;
    }

    for (var i = 0; i < inputIds.length; i++) {
      var inputNode = document.getElementById(inputIds[i]);
      if (inputNode) {
        inputNode.disabled = !!isPending;
      }
    }
  }

  function getLoginFormValues() {
    return {
      code: String(document.getElementById('login-code').value || '').trim().toUpperCase(),
      user: String(document.getElementById('login-user').value || '').trim(),
      pass: String(document.getElementById('login-pass').value || '').trim()
    };
  }

  function validateLoginForm(values) {
    var hasError = false;

    if (!values.code) {
      setLoginFieldError('code', 'Server identity code is required.');
      hasError = true;
    }
    if (!values.user) {
      setLoginFieldError('user', 'Username is required.');
      hasError = true;
    }
    if (!values.pass) {
      setLoginFieldError('pass', 'Password is required.');
      hasError = true;
    }

    if (hasError) {
      setLoginStatus('Complete the required fields before continuing.', 'error');
    }

    return !hasError;
  }

  function executeLogin() {
    if (state.loginPending) {
      return;
    }

    var values = getLoginFormValues();
    clearLoginErrors();
    setLoginResolvedPortal(null);

    if (!validateLoginForm(values)) {
      return;
    }

    state.loginRequestId += 1;
    var requestId = state.loginRequestId;

    setLoginPending(true);
    setLoginStatus('Validating server identity...', 'info');

    apiValidatePortalCode(values.code, function (portal) {
      if (requestId !== state.loginRequestId) {
        return;
      }

      setLoginResolvedPortal(portal);
      setLoginStatus('Connecting to ' + (portal.name || portal.portalCode || 'portal') + '...', 'info');

      apiAuthenticate(portal.baseUrl, values.user, values.pass, function (authRes) {
        if (requestId !== state.loginRequestId) {
          return;
        }

        var session = {
          portalCode: portal.portalCode,
          portalBaseUrl: portal.baseUrl,
          serverName: portal.name,
          username: values.user,
          userInfo: authRes.user_info,
          serverInfo: authRes.server_info,
          authenticatedAt: new Date().toISOString()
        };
        var profiles = createDefaultProfiles(values.user);

        state.session = session;
        state.profiles = profiles;
        state.selectedProfile = null;
        saveSessionState(session, profiles);
        saveSelectedProfile(null);
        setLoginStatus('Authenticated. Loading profile selection...', 'success');
        setLoginPending(false);

        setupProfilesView();
      }, function (err) {
        if (requestId !== state.loginRequestId) {
          return;
        }

        setLoginPending(false);
        setLoginStatus(err || 'Xtream login failed.', 'error');
      });
    }, function (err) {
      if (requestId !== state.loginRequestId) {
        return;
      }

      setLoginPending(false);
      setLoginStatus(err || 'Portal validation failed.', 'error');
    });
  }

  // --- PROFILES CONTROLLER ---
  function setProfilesStatus(message) {
    var statusNode = document.getElementById('profiles-screen-status');
    if (statusNode) {
      statusNode.textContent = message || '';
    }
  }

  function setupProfilesView(focusIndex) {
    state.focusedPanel = 'profiles';
    state.focusedIndex = typeof focusIndex === 'number' ? focusIndex : 0;
    
    var container = document.getElementById('profiles-list-container');
    container.innerHTML = '';

    for (var i = 0; i < state.profiles.length; i++) {
      var profile = state.profiles[i];
      
      var card = document.createElement('div');
      card.className = 'profile-card focusable';
      card.setAttribute('tabindex', '-1');
      card.setAttribute('data-id', profile.id);
      card.setAttribute('data-index', i);
      
      var avatar = document.createElement('div');
      avatar.className = 'profile-avatar' + (profile.isKids ? ' profile-avatar--kids' : '');
      avatar.textContent = profile.avatarSeed;
      
      var name = document.createElement('div');
      name.className = 'profile-name';
      name.textContent = profile.name;

      var meta = document.createElement('div');
      meta.className = 'profile-card-meta';
      meta.textContent = profile.isKids ? 'Kids profile' : 'Local profile';
      
      card.appendChild(avatar);
      card.appendChild(name);
      card.appendChild(meta);
      
      card.onclick = function (e) {
        var idx = parseInt(this.getAttribute('data-index'), 10);
        selectProfile(state.profiles[idx]);
      };
      
      container.appendChild(card);
    }

    var addCard = document.createElement('div');
    addCard.className = 'profile-card profile-card--add focusable';
    addCard.setAttribute('tabindex', '-1');
    addCard.setAttribute('data-index', state.profiles.length);

    var addAvatar = document.createElement('div');
    addAvatar.className = 'profile-avatar profile-avatar--add';
    addAvatar.textContent = '+';

    var addName = document.createElement('div');
    addName.className = 'profile-name';
    addName.textContent = 'Add Profile';

    var addMeta = document.createElement('div');
    addMeta.className = 'profile-card-meta';
    addMeta.textContent = 'Create another local viewer profile';

    addCard.appendChild(addAvatar);
    addCard.appendChild(addName);
    addCard.appendChild(addMeta);
    addCard.onclick = function () {
      openProfileFormModal();
    };
    container.appendChild(addCard);

    closeProfileFormModal(true);
    setProfilesStatus('Select a profile to continue or add another viewer.');

    showView('view-profiles');
    updateFocusUI();
  }

  function clearProfileFormErrors() {
    var nameNode = document.getElementById('profile-form-name');
    var avatarNode = document.getElementById('profile-form-avatar');
    var nameErrorNode = document.getElementById('profile-form-name-error');
    var avatarErrorNode = document.getElementById('profile-form-avatar-error');

    if (nameNode) nameNode.classList.remove('input-error');
    if (avatarNode) avatarNode.classList.remove('input-error');
    if (nameErrorNode) nameErrorNode.textContent = '';
    if (avatarErrorNode) avatarErrorNode.textContent = '';
  }

  function setProfileFormFieldError(fieldId, message) {
    var inputNode = document.getElementById('profile-form-' + fieldId);
    var errorNode = document.getElementById('profile-form-' + fieldId + '-error');
    if (inputNode) {
      inputNode.classList.add('input-error');
    }
    if (errorNode) {
      errorNode.textContent = message || '';
    }
  }

  function setProfileFormStatus(message, tone) {
    var statusNode = document.getElementById('profile-form-status');
    if (!statusNode) return;
    statusNode.textContent = message || '';
    statusNode.className = 'status-text status-text--' + (tone || 'idle');
  }

  function syncProfileFormToggle() {
    var toggleNode = document.getElementById('profile-form-kids');
    if (!toggleNode) return;

    toggleNode.textContent = 'Kids Mode: ' + (state.profileFormDraft.isKids ? 'On' : 'Off');
    if (state.profileFormDraft.isKids) {
      toggleNode.classList.add('profile-form-toggle--active');
    } else {
      toggleNode.classList.remove('profile-form-toggle--active');
    }
  }

  function openProfileFormModal() {
    state.profileFormDraft = {
      name: '',
      avatarSeed: '',
      isKids: false
    };

    document.getElementById('profile-form-name').value = '';
    document.getElementById('profile-form-avatar').value = '';
    clearProfileFormErrors();
    syncProfileFormToggle();
    setProfileFormStatus('Create up to 6 local profiles for this account.', 'idle');

    document.getElementById('profile-form-modal').classList.remove('hidden');
    state.focusedPanel = 'profile-form';
    state.focusedIndex = 0;
    updateFocusUI();
  }

  function closeProfileFormModal(keepProfilePanel) {
    document.getElementById('profile-form-modal').classList.add('hidden');
    clearProfileFormErrors();
    setProfileFormStatus('Create up to 6 local profiles for this account.', 'idle');

    if (!keepProfilePanel) {
      state.focusedPanel = 'profiles';
      state.focusedIndex = state.profiles.length;
      updateFocusUI();
    }
  }

  function saveNewProfile() {
    var draftName = String(document.getElementById('profile-form-name').value || '').trim();
    var draftAvatar = sanitizeProfileInitials(document.getElementById('profile-form-avatar').value || '');

    clearProfileFormErrors();

    if (!draftName) {
      setProfileFormFieldError('name', 'Profile name is required.');
      setProfileFormStatus('Add a profile name before saving.', 'error');
      return;
    }

    if (draftName.length < 2) {
      setProfileFormFieldError('name', 'Profile name must be at least 2 characters.');
      setProfileFormStatus('Profile name is too short.', 'error');
      return;
    }

    if (state.profiles.length >= 6) {
      setProfileFormStatus('A maximum of 6 local profiles is supported on this device.', 'error');
      return;
    }

    for (var i = 0; i < state.profiles.length; i++) {
      if (state.profiles[i].name.toLowerCase() === draftName.toLowerCase()) {
        setProfileFormFieldError('name', 'A profile with this name already exists.');
        setProfileFormStatus('Use a different profile name.', 'error');
        return;
      }
    }

    if (!draftAvatar) {
      draftAvatar = deriveProfileInitials(draftName);
    }

    if (!draftAvatar) {
      setProfileFormFieldError('avatar', 'Enter initials or use a clearer profile name.');
      setProfileFormStatus('Initials could not be derived from the profile name.', 'error');
      return;
    }

    var newProfile = {
      id: buildProfileId(),
      name: draftName,
      avatarSeed: draftAvatar,
      isKids: !!state.profileFormDraft.isKids
    };

    state.profiles.push(newProfile);
    saveSessionState(state.session, state.profiles);
    closeProfileFormModal(true);
    setupProfilesView(state.profiles.length - 1);
    setProfilesStatus('Profile "' + newProfile.name + '" added successfully.');
  }

  function selectProfile(profile) {
    state.selectedProfile = profile;
    saveSelectedProfile(profile);
    openHomeView(true);
  }

  // --- CATALOG CONTROLLER ---
  function loadCatalog(mode) {
    if (mode) {
      state.catalogMode = mode;
    }

    setCatalogScreen('browse');
    var config = getCatalogConfig();
    showView('view-catalog');
    state.focusedPanel = 'catalog-categories';
    state.focusedIndex = 0;
    state.categories = [];
    state.channels = [];
    state.selectedCategoryId = '';
    state.selectedCategoryName = '';
    setSidebarActiveItem();
    
    var catNode = document.getElementById('categories-panel-list');
    catNode.innerHTML = '<div style="color:rgba(255,255,255,0.4); padding: 20px;">' + config.loadingCategoriesText + '</div>';
    document.getElementById('details-category-name').textContent = config.sectionLabel.toUpperCase();
    document.getElementById('details-channel-name').textContent = config.loadingTitleText;
    document.getElementById('details-epg-info').textContent = config.loadingDetailText;
    
    config.loadCategories(state.session.portalBaseUrl, state.session.username, state.session.userInfo.password, function (cats) {
      state.categories = cats;
      renderCategories();
      if (cats.length > 0) {
        selectCategory(cats[0].category_id);
      } else {
        var grid = document.getElementById('channels-grid-list');
        grid.innerHTML = '<div style="color:rgba(255,255,255,0.4); padding: 20px;">No categories found</div>';
        // Fallback focus to sidebar if no categories
        state.focusedPanel = 'catalog-sidebar';
        state.focusedIndex = getSidebarFocusIndex();
        updateFocusUI();
      }
    }, function (err) {
      state.categories = [];
      catNode.innerHTML = '<div style="color:#ff3344; padding: 20px;">' + err + '</div>';
      var grid = document.getElementById('channels-grid-list');
      grid.innerHTML = '<div style="color:rgba(255,255,255,0.4); padding: 20px;">No content loaded</div>';
      // Fallback focus to sidebar on error
      state.focusedPanel = 'catalog-sidebar';
      state.focusedIndex = getSidebarFocusIndex();
      updateFocusUI();
    });
  }

  function renderCategories() {
    var container = document.getElementById('categories-panel-list');
    container.innerHTML = '';

    for (var i = 0; i < state.categories.length; i++) {
      var cat = state.categories[i];
      var item = document.createElement('div');
      item.className = 'category-item focusable';
      item.setAttribute('tabindex', '-1');
      item.setAttribute('data-id', cat.category_id);
      item.setAttribute('data-index', i);
      item.textContent = cat.category_name;
      
      if (cat.category_id === state.selectedCategoryId) {
        item.classList.add('active');
      }
      
      item.onclick = function () {
        var id = this.getAttribute('data-id');
        var idx = parseInt(this.getAttribute('data-index'), 10);
        state.focusedPanel = 'catalog-categories';
        state.focusedIndex = idx;
        selectCategory(id);
        updateFocusUI();
      };
      
      container.appendChild(item);
    }
  }

  function selectCategory(categoryId) {
    var config = getCatalogConfig();
    state.selectedCategoryId = categoryId;
    
    // Find category name
    for (var i = 0; i < state.categories.length; i++) {
      if (state.categories[i].category_id === categoryId) {
        state.selectedCategoryName = state.categories[i].category_name;
        break;
      }
    }
    
    document.getElementById('details-category-name').textContent = state.selectedCategoryName.toUpperCase();
    document.getElementById('details-channel-name').textContent = config.loadingTitleText;
    document.getElementById('details-epg-info').textContent = config.loadingDetailText;
    
    // Toggle active classes on DOM
    var items = document.querySelectorAll('.category-item');
    for (var j = 0; j < items.length; j++) {
      if (items[j].getAttribute('data-id') === categoryId) {
        items[j].classList.add('active');
      } else {
        items[j].classList.remove('active');
      }
    }

    var grid = document.getElementById('channels-grid-list');
    grid.innerHTML = '<div style="color:rgba(255,255,255,0.4); padding: 20px;">' + config.loadingItemsText + '</div>';

    config.loadItems(state.session.portalBaseUrl, state.session.username, state.session.userInfo.password, categoryId, function (streams) {
      state.channels = streams;
      renderChannels();
      updateFocusUI();
    }, function (err) {
      state.channels = [];
      grid.innerHTML = '<div style="color:#ff3344; padding: 20px;">' + err + '</div>';
      
      document.getElementById('details-channel-name').textContent = config.errorTitleText;
      document.getElementById('details-epg-info').textContent = err;
      
      // Fallback focus to category panel or category item if channel loading fails
      if (state.focusedPanel === 'catalog-channels') {
        state.focusedPanel = 'catalog-categories';
        state.focusedIndex = getActiveCategoryIndex();
      }
      updateFocusUI();
    });
  }

  function renderChannels() {
    var config = getCatalogConfig();
    var container = document.getElementById('channels-grid-list');
    container.innerHTML = '';

    if (state.channels.length === 0) {
      container.innerHTML = '<div style="color:rgba(255,255,255,0.4); padding: 20px;">' + config.emptyItemsText + '</div>';
      
      document.getElementById('details-channel-name').textContent = 'No ' + config.sectionLabel;
      document.getElementById('details-epg-info').textContent = config.emptyDetailText;
      return;
    }

    // Set default header details to the first item in the loaded list
    var firstCh = state.channels[0];
    document.getElementById('details-category-name').textContent = state.selectedCategoryName.toUpperCase();
    document.getElementById('details-channel-name').textContent = getCatalogItemName(firstCh);

    if (state.catalogMode === 'live') {
      document.getElementById('details-epg-info').innerHTML = '<div style="color: rgba(255,255,255,0.4); font-size:14px;">Loading guide...</div>';
      
      if (epgTimer) {
        clearTimeout(epgTimer);
      }
      fetchEPGForChannel(firstCh);
    } else {
      renderCatalogDetails(firstCh);
    }

    for (var i = 0; i < state.channels.length; i++) {
      var ch = state.channels[i];
      var card = document.createElement('div');
      card.className = 'channel-card focusable';
      card.setAttribute('tabindex', '-1');
      if (state.catalogMode !== 'live') {
        card.className += ' channel-card--poster';
      }
      if (state.catalogMode === 'live' && state.activeChannel && String(state.activeChannel.stream_id) === String(ch.stream_id)) {
        card.className += ' active';
      }
      card.setAttribute('data-id', getCatalogItemId(ch));
      card.setAttribute('data-index', i);
      card.setAttribute('data-name', getCatalogItemName(ch));
      
      // Content type badge in top-left
      var liveBadge = document.createElement('div');
      liveBadge.className = 'channel-live-badge';
      liveBadge.textContent = config.badgeLabel;
      card.appendChild(liveBadge);
      
      var logoWrap = document.createElement('div');
      logoWrap.className = 'channel-logo-container';
      
      if (getCatalogItemArtwork(ch)) {
        var img = document.createElement('img');
        img.src = getCatalogItemArtwork(ch);
        img.onerror = function() {
          this.style.display = 'none';
          this.parentNode.textContent = this.parentNode.parentNode.getAttribute('data-name');
        };
        logoWrap.appendChild(img);
      } else {
        logoWrap.textContent = ch.name;
      }
      
      card.appendChild(logoWrap);
      
      card.onclick = function() {
        var idx = parseInt(this.getAttribute('data-index'), 10);
        if (state.catalogMode === 'live') {
          playChannel(state.channels[idx]);
        } else {
          showContentDetail(state.channels[idx], state.catalogMode);
        }
      };
      
      container.appendChild(card);
    }
  }

  // --- PLAYER CONTROLLER ---
  function cleanupHls() {
    if (hlsInstance) {
      try {
        hlsInstance.destroy();
      } catch (e) {
        console.error('[Legacy Player] Error destroying Hls instance:', e);
      }
      hlsInstance = null;
    }
  }

  function fallbackToNative(tsUrl, m3u8Url) {
    cleanupHls();
    var video = document.getElementById('player-video');
    console.log('[Legacy Player] Falling back to native TS:', tsUrl);
    
    video.onerror = function() {
      console.error('[Legacy Player] Native TS playback failed, trying native m3u8...');
      video.onerror = function() {
        console.error('[Legacy Player] All native playback attempts failed.');
        document.getElementById('player-channel-name').textContent = 'Playback Error: Stream format unsupported';
      };
      video.src = m3u8Url;
      video.load();
      video.play();
    };
    
    video.src = tsUrl;
    video.load();
    video.play();
  }

  function fallbackToNativeTSOnly(tsUrl) {
    cleanupHls();
    var video = document.getElementById('player-video');
    
    video.onerror = function() {
      console.error('[Legacy Player] Native TS playback failed.');
      document.getElementById('player-channel-name').textContent = 'Playback Error: Stream format unsupported';
    };
    
    video.src = tsUrl;
    video.load();
    video.play();
  }

  function rememberPlayerReturnState() {
    state.playerReturnViewId = state.currentViewId || 'view-catalog';
    state.playerReturnPanel = state.focusedPanel || 'catalog-channels';
    state.playerReturnIndex = state.focusedIndex || 0;
  }

  function resetPlayerSurface() {
    var video = document.getElementById('player-video');
    var trailerEmbed = document.getElementById('player-trailer-embed');

    if (trailerEmbed) {
      trailerEmbed.style.display = 'none';
      trailerEmbed.removeAttribute('src');
    }

    if (video) {
      video.style.display = 'block';
    }
  }

  function showPlayerEmbed(embedUrl, title) {
    cleanupHls();
    rememberPlayerReturnState();
    state.activeChannel = null;
    state.activeChannelQueue = [];
    state.activeChannelIndex = 0;
    state.focusedPanel = 'player';
    showView('view-player');

    var video = document.getElementById('player-video');
    var trailerEmbed = document.getElementById('player-trailer-embed');
    var status = document.getElementById('player-status-container');
    var playerTitle = document.getElementById('player-channel-name');

    if (video) {
      try {
        video.pause();
        video.removeAttribute('src');
        video.load();
      } catch (e) {}
      video.style.display = 'none';
    }

    if (playerTitle) {
      playerTitle.textContent = title || 'Trailer';
    }
    if (status) {
      status.style.display = 'none';
    }

    if (trailerEmbed) {
      trailerEmbed.style.display = 'block';
      trailerEmbed.src = embedUrl;
    }
  }

  function playStream(streamId) {
    cleanupHls();
    resetPlayerSurface();

    var video = document.getElementById('player-video');

    // Clear any previous sources
    while (video.firstChild) {
      video.removeChild(video.firstChild);
    }
    video.removeAttribute('src');
    try { video.load(); } catch (e) {}

    // Strip embedded userinfo credentials (e.g. http://user@host:port -> http://host:port)
    var cleanBaseUrl = normalizeBaseUrl(state.session.portalBaseUrl)
      .replace(/^(https?:\/\/)[^@\/]+@/, '$1');

    var m3u8Url = cleanBaseUrl + '/live/' +
      encodeURIComponent(state.session.username) + '/' +
      encodeURIComponent(state.session.userInfo.password) + '/' +
      streamId + '.m3u8';

    var tsUrl = cleanBaseUrl + '/live/' +
      encodeURIComponent(state.session.username) + '/' +
      encodeURIComponent(state.session.userInfo.password) + '/' +
      streamId + '.ts';

    console.log('[Legacy Player] m3u8 URL:', m3u8Url);

    video.onwaiting = function() {
      document.getElementById('player-status-container').style.display = 'flex';
    };
    video.onplaying = function() {
      document.getElementById('player-status-container').style.display = 'none';
    };

    // Detect webOS device (same logic as src/utils/legacyBrowser.ts `isWebOSDevice`)
    // On webOS: Chrome 38's MSE (MediaSource Extensions) is broken/limited.
    // The React app also skips hls.js on webOS — it forces engine='native' so that
    // webOS's built-in GStreamer media pipeline handles HLS. We do the same here.
    var ua = (navigator.userAgent || '').toLowerCase();
    var isWebOS = /webos|web0s|smarttv/i.test(ua) ||
      (typeof window.PalmSystem !== 'undefined');

    if (isWebOS) {
      // ---- webOS NATIVE HLS PATH ----
      // Mirrors src/features/player/PlayerScreen.tsx native engine path (lines 3512-3535).
      // Key attributes from React app's video JSX (PlayerScreen.tsx line 4988-4990):
      //   playsInline, preload="auto" — critical for webOS GStreamer pipeline to buffer immediately.
      // Without preload="auto", the pipeline fires `playing` but never advances currentTime.
      console.log('[Legacy Player] webOS detected — using native HLS (no hls.js)');

      // Set critical attributes matching React app's <video playsInline preload="auto"> JSX
      video.setAttribute('preload', 'auto');
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');

      var nativeStartupTimeout = null;
      var nativeStarted = false;

      function setupFirstFrameTracking() {
        video.ontimeupdate = function() {
          if (video.currentTime > 0 && !nativeStarted) {
            nativeStarted = true;
            clearTimeout(nativeStartupTimeout);
            console.log('[Legacy Player] webOS native — first frame at', video.currentTime);
            document.getElementById('player-status-container').style.display = 'none';
          }
        };
      }

      function nativeFallbackToTs() {
        if (nativeStarted) return;
        nativeStarted = true;
        clearTimeout(nativeStartupTimeout);
        video.ontimeupdate = null;
        video.onplaying = null;
        video.onwaiting = null;
        video.onerror = null;
        console.warn('[Legacy Player] webOS native HLS stalled — falling back to .ts');
        video.removeAttribute('src');
        try { video.load(); } catch (e) {}

        // Reset nativeStarted for the TS fallback's own tracking
        nativeStarted = false;
        setupFirstFrameTracking();

        video.onerror = function() {
          video.ontimeupdate = null;
          clearTimeout(nativeStartupTimeout);
          console.error('[Legacy Player] TS fallback also failed.');
          document.getElementById('player-channel-name').textContent = 'Playback Error — stream not supported';
          document.getElementById('player-status-container').style.display = 'none';
        };
        // Start TS fallback timeout
        nativeStartupTimeout = setTimeout(function() {
          if (!nativeStarted) {
            console.error('[Legacy Player] TS fallback also timed out.');
            document.getElementById('player-channel-name').textContent = 'Playback Error — stream unavailable';
            document.getElementById('player-status-container').style.display = 'none';
          }
        }, 20000);

        document.getElementById('player-status-container').style.display = 'flex';
        video.volume = 1;
        video.muted = false;
        video.src = tsUrl;
        video.load();
        video.play();
      }

      // 1. Set audio state before play (matches React app's applyVideoAudioState)
      video.volume = 1;
      video.muted = false;

      // 2. Track first frame via timeupdate — NOT via `playing` event.
      //    On webOS Chrome 38, `playing` fires immediately on play() even before
      //    any frame is decoded. timeupdate with currentTime > 0 is the real signal.
      setupFirstFrameTracking();

      // 3. onplaying: log only, don't hide spinner
      video.onplaying = function() {
        console.log('[Legacy Player] webOS native playing (waiting for first frame via timeupdate)');
      };

      video.onwaiting = function() {
        if (nativeStarted) {
          document.getElementById('player-status-container').style.display = 'flex';
        }
      };

      // 4. 15s timeout → .ts fallback if GStreamer pipeline stalls
      nativeStartupTimeout = setTimeout(function() {
        if (!nativeStarted) {
          console.warn('[Legacy Player] webOS native HLS 15s timeout — falling back to .ts');
          nativeFallbackToTs();
        }
      }, 15000);

      video.onerror = function() {
        var errCode = video.error ? video.error.code : 'unknown';
        console.error('[Legacy Player] webOS native m3u8 error code=' + errCode);
        nativeFallbackToTs();
      };

      video.src = m3u8Url;
      video.load();
      video.play();


    } else if (typeof Hls !== 'undefined' && Hls.isSupported()) {
      // ---- NON-webOS LEGACY BROWSER (desktop Chrome 38): hls.js path ----
      // Mirrors src/features/player/playbackEngine.ts chrome38CompatMode branch
      console.log('[Legacy Player] Desktop Chrome 38 — using hls.js for streamId:', streamId);

      hlsInstance = new Hls({
        enableWorker: false,
        autoStartLoad: false,
        maxBufferLength: 30,
        liveSyncDurationCount: 3,
        manifestLoadingTimeOut: 10000,
        levelLoadingTimeOut: 10000,
        fragLoadingTimeOut: 15000,
        manifestLoadingMaxRetry: 4,
        manifestLoadingRetryDelay: 1500,
        levelLoadingMaxRetry: 4,
        levelLoadingRetryDelay: 1500,
        fragLoadingMaxRetry: 4,
        fragLoadingRetryDelay: 1500
      });

      hlsInstance.on(Hls.Events.MEDIA_ATTACHED, function () {
        console.log('[Legacy Player] Hls.js media attached — loading source');
        hlsInstance.loadSource(m3u8Url);
        hlsInstance.startLoad(-1);
      });

      hlsInstance.on(Hls.Events.MANIFEST_PARSED, function () {
        console.log('[Legacy Player] Hls.js manifest parsed — calling play');
        video.play();
      });

      var hlsFatalCount = 0;
      hlsInstance.on(Hls.Events.ERROR, function (event, data) {
        console.warn('[Legacy Player] Hls.js error: type=' + data.type + ' details=' + data.details + ' fatal=' + data.fatal);
        if (!data.fatal) return;
        hlsFatalCount++;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR && hlsFatalCount <= 3) {
          var retryHls = hlsInstance;
          setTimeout(function () { if (retryHls) retryHls.startLoad(); }, 2000);
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR && hlsFatalCount <= 2) {
          if (hlsInstance) hlsInstance.recoverMediaError();
        } else {
          fallbackToNative(tsUrl, m3u8Url);
        }
      });

      video.onerror = null;
      hlsInstance.attachMedia(video);

    } else {
      // ---- LAST RESORT: plain native video ----
      console.log('[Legacy Player] Hls.js not available — native video fallback');
      video.onerror = function() {
        fallbackToNative(tsUrl, m3u8Url);
      };
      video.src = m3u8Url;
      video.load();
      video.play();
    }
  }

  function playChannel(channel, queue) {
    var activeQueue = queue || state.channels;
    rememberPlayerReturnState();
    updateWatchHistory('live', channel, 'Live channel');
    state.activeChannel = channel;
    state.activeChannelQueue = activeQueue;
    
    state.activeChannelIndex = 0;
    for (var i = 0; i < activeQueue.length; i++) {
      if (activeQueue[i].stream_id === channel.stream_id) {
        state.activeChannelIndex = i;
        break;
      }
    }

    state.focusedPanel = 'player';
    showView('view-player');
    
    document.getElementById('player-channel-name').textContent = channel.name;
    document.getElementById('player-status-container').style.display = 'flex';
    
    playStream(channel.stream_id);
  }

  function playMovie(movie, detailInfo) {
    cleanupHls();
    resetPlayerSurface();
    rememberPlayerReturnState();
    updateWatchHistory('movies', movie, 'Movie');
    state.activeChannel = null;
    state.activeChannelQueue = [];
    state.activeChannelIndex = 0;
    state.focusedPanel = 'player';
    showView('view-player');

    document.getElementById('player-channel-name').textContent = movie.name || 'Loading Movie...';
    document.getElementById('player-status-container').style.display = 'flex';

    var video = document.getElementById('player-video');
    while (video.firstChild) {
      video.removeChild(video.firstChild);
    }
    video.removeAttribute('src');
    try { video.load(); } catch (e) {}

    var cleanBaseUrl = normalizeBaseUrl(state.session.portalBaseUrl)
      .replace(/^(https?:\/\/)[^@\/]+@/, '$1');
    var movieData = detailInfo && detailInfo.movie_data ? detailInfo.movie_data : {};
    var extension = movie.container_extension || movieData.container_extension || 'mp4';
    var movieUrl = cleanBaseUrl + '/movie/' +
      encodeURIComponent(state.session.username) + '/' +
      encodeURIComponent(state.session.userInfo.password) + '/' +
      movie.stream_id + '.' + extension;

    video.onwaiting = function() {
      document.getElementById('player-status-container').style.display = 'flex';
    };
    video.onplaying = function() {
      document.getElementById('player-status-container').style.display = 'none';
    };
    video.onerror = function() {
      document.getElementById('player-channel-name').textContent = 'Playback Error: Movie stream unavailable';
      document.getElementById('player-status-container').style.display = 'none';
    };

    video.src = movieUrl;
    video.load();
    video.play();
  }

  function playSeriesEpisode(episode, seriesTitle) {
    if (!episode) return;

    cleanupHls();
    resetPlayerSurface();
    rememberPlayerReturnState();
    updateWatchHistory('series', state.detailItem || {
      series_id: getEpisodeId(episode),
      name: seriesTitle || getEpisodeTitle(episode, 0),
      cover: ''
    }, getEpisodeTitle(episode, 0));
    state.activeChannel = null;
    state.activeChannelQueue = [];
    state.activeChannelIndex = 0;
    state.focusedPanel = 'player';
    showView('view-player');

    var episodeTitle = getEpisodeTitle(episode, 0);
    document.getElementById('player-channel-name').textContent = seriesTitle ? (seriesTitle + ' - ' + episodeTitle) : episodeTitle;
    document.getElementById('player-status-container').style.display = 'flex';

    var video = document.getElementById('player-video');
    while (video.firstChild) {
      video.removeChild(video.firstChild);
    }
    video.removeAttribute('src');
    try { video.load(); } catch (e) {}

    var cleanBaseUrl = normalizeBaseUrl(state.session.portalBaseUrl)
      .replace(/^(https?:\/\/)[^@\/]+@/, '$1');
    var extension = episode.container_extension || (episode.info && episode.info.container_extension) || 'mp4';
    var episodeUrl = cleanBaseUrl + '/series/' +
      encodeURIComponent(state.session.username) + '/' +
      encodeURIComponent(state.session.userInfo.password) + '/' +
      getEpisodeId(episode) + '.' + extension;

    video.onwaiting = function() {
      document.getElementById('player-status-container').style.display = 'flex';
    };
    video.onplaying = function() {
      document.getElementById('player-status-container').style.display = 'none';
    };
    video.onerror = function() {
      document.getElementById('player-channel-name').textContent = 'Playback Error: Episode stream unavailable';
      document.getElementById('player-status-container').style.display = 'none';
    };

    video.src = episodeUrl;
    video.load();
    video.play();
  }

  function playDetailTrailer(episode, seriesTitle) {
    var trailerUrl = safeTrim((episode && episode.__trailerUrl) || getDetailTrailerUrl(state.detailItem, state.detailInfo));
    if (!trailerUrl) return;

    var youtubeEmbedUrl = getYouTubeEmbedUrl(trailerUrl);
    if (youtubeEmbedUrl) {
      showPlayerEmbed(youtubeEmbedUrl, (seriesTitle || 'Series') + ' - Trailer');
      return;
    }

    cleanupHls();
    resetPlayerSurface();
    rememberPlayerReturnState();
    state.activeChannel = null;
    state.activeChannelQueue = [];
    state.activeChannelIndex = 0;
    state.focusedPanel = 'player';
    showView('view-player');

    document.getElementById('player-channel-name').textContent = (seriesTitle || 'Series') + ' - Trailer';
    document.getElementById('player-status-container').style.display = 'flex';

    var video = document.getElementById('player-video');
    while (video.firstChild) {
      video.removeChild(video.firstChild);
    }
    video.removeAttribute('src');
    try { video.load(); } catch (loadErr) {}

    video.onwaiting = function() {
      document.getElementById('player-status-container').style.display = 'flex';
    };
    video.onplaying = function() {
      document.getElementById('player-status-container').style.display = 'none';
    };
    video.onerror = function() {
      document.getElementById('player-channel-name').textContent = 'Playback Error: Trailer unavailable';
      document.getElementById('player-status-container').style.display = 'none';
    };

    video.src = trailerUrl;
    video.load();
    video.play();
  }

  function playDetailPrimary() {
    if (!state.detailItem) return;

    if (state.detailMode === 'series') {
      if (!state.detailEpisodes.length && state.detailSeasons.length) {
        state.detailEpisodes = getEpisodesForSeason(state.detailInfo, state.detailSeasons[state.detailSelectedSeasonIndex].key);
      }
      if (state.detailEpisodes.length) {
        if (state.detailEpisodes[0].__isTrailer) {
          playDetailTrailer(state.detailEpisodes[0], getCatalogItemName(state.detailItem));
        } else {
          playSeriesEpisode(state.detailEpisodes[0], getCatalogItemName(state.detailItem));
        }
      }
      return;
    }

    playMovie(state.detailItem, state.detailInfo);
  }

  function closePlayer() {
    cleanupHls();
    resetPlayerSurface();
    var video = document.getElementById('player-video');
    try {
      video.pause();
      video.src = '';
    } catch (e) {}

    state.focusedPanel = state.playerReturnPanel || 'catalog-channels';
    state.focusedIndex = state.playerReturnIndex || 0;

    if ((state.playerReturnViewId || 'view-catalog') === 'view-catalog') {
      if (state.playerReturnPanel === 'home-rails') {
        refreshHomeView();
      }
      var cards = document.querySelectorAll('.channel-card');
      for (var i = 0; i < cards.length; i++) {
        var id = cards[i].getAttribute('data-id');
        if (state.activeChannel && String(id) === String(state.activeChannel.stream_id)) {
          cards[i].classList.add('active');
        } else {
          cards[i].classList.remove('active');
        }
      }
    }

    showView(state.playerReturnViewId || 'view-catalog');
    updateFocusUI();
  }

  function switchPlaybackChannel(delta) {
    if (state.activeChannelQueue.length === 0) return;
    
    var nextIdx = (state.activeChannelIndex + delta + state.activeChannelQueue.length) % state.activeChannelQueue.length;
    state.activeChannelIndex = nextIdx;
    state.activeChannel = state.activeChannelQueue[nextIdx];
    
    state.focusedIndex = nextIdx;
    
    document.getElementById('player-channel-name').textContent = state.activeChannel.name;
    document.getElementById('player-status-container').style.display = 'flex';
    
    playStream(state.activeChannel.stream_id);
  }

  // --- SPATIAL NAVIGATION FOCUS MANAGER ---
  function getFocusableElements() {
    if (state.focusedPanel === 'welcome') {
      return document.getElementById('view-welcome').querySelectorAll('.focusable');
    }
    if (state.focusedPanel === 'login') {
      return document.getElementById('view-login').querySelectorAll('.focusable');
    }
    if (state.focusedPanel === 'profiles') {
      return document.getElementById('profiles-list-container').querySelectorAll('.focusable');
    }
    if (state.focusedPanel === 'profile-form') {
      return document.getElementById('profile-form-modal').querySelectorAll('.focusable');
    }
    if (state.focusedPanel === 'catalog-sidebar') {
      return document.querySelector('.sidebar-menu').querySelectorAll('.focusable');
    }
    if (state.focusedPanel === 'home-rails') {
      return document.getElementById('home-rails').querySelectorAll('.focusable');
    }
    if (state.focusedPanel === 'home-hero') {
      var playBtn = document.getElementById('home-hero-btn-play');
      var detailsBtn = document.getElementById('home-hero-btn-details');
      var list = [];
      if (playBtn) list.push(playBtn);
      if (detailsBtn) list.push(detailsBtn);
      return list;
    }
    if (state.focusedPanel === 'catalog-categories') {
      return document.getElementById('categories-panel-list').querySelectorAll('.focusable');
    }
    if (state.focusedPanel === 'catalog-channels') {
      return document.getElementById('channels-grid-list').querySelectorAll('.focusable');
    }
    if (state.focusedPanel === 'detail-actions') {
      return document.getElementById('detail-actions').querySelectorAll('.focusable');
    }
    if (state.focusedPanel === 'detail-seasons') {
      return document.getElementById('detail-seasons').querySelectorAll('.focusable');
    }
    if (state.focusedPanel === 'detail-episodes') {
      return document.getElementById('detail-episodes').querySelectorAll('.focusable');
    }
    if (state.focusedPanel === 'search-header') {
      return document.getElementById('search-header-controls').querySelectorAll('.focusable');
    }
    if (state.focusedPanel === 'search-back') {
      return [document.getElementById('search-btn-back')];
    }
    if (state.focusedPanel === 'search-keyboard') {
      return document.getElementById('search-keyboard').querySelectorAll('.focusable');
    }
    if (state.focusedPanel === 'search-results') {
      return document.getElementById('search-results-rails').querySelectorAll('.focusable');
    }
    if (state.focusedPanel === 'watchlist-controls') {
      return document.getElementById('watchlist-controls').querySelectorAll('.focusable');
    }
    if (state.focusedPanel === 'watchlist-results') {
      return document.getElementById('watchlist-results-grid').querySelectorAll('.focusable');
    }
    if (state.focusedPanel === 'settings-actions') {
      return document.getElementById('settings-actions').querySelectorAll('.focusable');
    }
    return [];
  }

  function updateFocusUI() {
    // Clear all focused items
    var list = document.querySelectorAll('.focusable');
    for (var i = 0; i < list.length; i++) {
      list[i].classList.remove('focused');
      // For profiles view visual styles
      list[i].classList.remove('focused');
    }

    var currentFocusables = getFocusableElements();
    if (currentFocusables.length === 0) return;

    // Boundary safety checks
    if (state.focusedIndex >= currentFocusables.length) {
      state.focusedIndex = currentFocusables.length - 1;
    }
    if (state.focusedIndex < 0) {
      state.focusedIndex = 0;
    }

    var focusedEl = currentFocusables[state.focusedIndex];
    if (focusedEl) {
      focusedEl.classList.add('focused');
      if (focusedEl.tagName !== 'INPUT') {
        focusedEl.focus();
        if (!isHomePanel(state.focusedPanel)) {
          var resetWindowScroll = function () {
            window.scrollTo(0, 0);
            if (document.body) document.body.scrollTop = 0;
            if (document.documentElement) document.documentElement.scrollTop = 0;
            
            // Reset scroll on non-scrollable parent views to fix TV browser focus shift bugs
            var viewCatalog = document.getElementById('view-catalog');
            if (viewCatalog) { viewCatalog.scrollTop = 0; viewCatalog.scrollLeft = 0; }
            var catalogContainer = document.querySelector('.catalog-container');
            if (catalogContainer) { catalogContainer.scrollTop = 0; catalogContainer.scrollLeft = 0; }
            var homePanel = document.getElementById('home-panel');
            if (homePanel) { homePanel.scrollTop = 0; homePanel.scrollLeft = 0; }
          };
          resetWindowScroll();
          setTimeout(resetWindowScroll, 0);
          setTimeout(resetWindowScroll, 50);
          setTimeout(resetWindowScroll, 150);
        }
      }
      
      // Auto-scroll views for catalog scroll containers
      if (state.focusedPanel === 'catalog-categories') {
        scrollIntoViewIfNeeded(document.getElementById('categories-panel-list'), focusedEl);
      } else if (state.focusedPanel === 'home-hero') {
        var homeScroll = document.getElementById('home-scroll');
        if (homeScroll) {
          var resetHeroScroll = function () {
            homeScroll.scrollTop = 0;
          };
          resetHeroScroll();
          setTimeout(resetHeroScroll, 0);
          setTimeout(resetHeroScroll, 50);
          setTimeout(resetHeroScroll, 100);
          setTimeout(resetHeroScroll, 200);
          setTimeout(resetHeroScroll, 400);
        }
      } else if (state.focusedPanel === 'home-rails') {
        var homeScrollNode = document.getElementById('home-scroll');
        var homeRailNode = focusedEl.parentNode && focusedEl.parentNode.parentNode ? focusedEl.parentNode.parentNode : focusedEl;
        if (homeScrollNode) {
          var syncHomeRailScroll = function () {
            scrollIntoViewIfNeeded(homeScrollNode, homeRailNode);
            scrollHorizontalIntoViewIfNeeded(focusedEl.parentNode, focusedEl);
          };
          syncHomeRailScroll();
          setTimeout(syncHomeRailScroll, 0);
          setTimeout(syncHomeRailScroll, 40);
        }
      } else if (state.focusedPanel === 'catalog-channels') {
        scrollIntoViewIfNeeded(document.querySelector('.channels-scroll'), focusedEl);
        
        // Dynamically update catalog header details
        var currentCh = state.channels[state.focusedIndex];
        if (currentCh) {
          document.getElementById('details-category-name').textContent = state.selectedCategoryName.toUpperCase();
          document.getElementById('details-channel-name').textContent = getCatalogItemName(currentCh);

          if (state.catalogMode === 'live') {
            document.getElementById('details-epg-info').innerHTML = '<div style="color: rgba(255,255,255,0.4); font-size:14px;">Loading guide...</div>';
            
            if (epgTimer) {
              clearTimeout(epgTimer);
            }
            epgTimer = setTimeout(function () {
              fetchEPGForChannel(currentCh);
            }, 300);
          } else {
            renderCatalogDetails(currentCh);
          }
        }
      } else if (state.focusedPanel === 'detail-episodes') {
        scrollIntoViewIfNeeded(document.getElementById('detail-episodes-scroll'), focusedEl);
      } else if (state.focusedPanel === 'search-results') {
        var resultsScroll = document.getElementById('search-results-scroll');
        var railSection = focusedEl.parentNode && focusedEl.parentNode.parentNode && focusedEl.parentNode.parentNode.classList && focusedEl.parentNode.parentNode.classList.contains('legacy-search-rail')
          ? focusedEl.parentNode.parentNode
          : focusedEl;
        scrollIntoViewIfNeeded(resultsScroll, railSection);
        scrollHorizontalIntoViewIfNeeded(focusedEl.parentNode, focusedEl);
      } else if (state.focusedPanel === 'watchlist-results') {
        scrollIntoViewIfNeeded(document.getElementById('watchlist-results-scroll'), focusedEl);
      }
    }
  }

  function scrollIntoViewIfNeeded(container, element) {
    // Vertical scroll logic
    var containerTop = container.scrollTop;
    var containerBottom = containerTop + container.clientHeight;
    var elemTop = element.offsetTop;
    var elemBottom = elemTop + element.clientHeight;

    if (elemTop < containerTop) {
      container.scrollTop = elemTop;
    } else if (elemBottom > containerBottom) {
      container.scrollTop = elemBottom - container.clientHeight;
    }

    // Horizontal scroll logic
    var containerLeft = container.scrollLeft;
    var containerRight = containerLeft + container.clientWidth;
    var elemLeft = element.offsetLeft;
    var elemRight = elemLeft + element.clientWidth;

    if (elemLeft < containerLeft) {
      container.scrollLeft = elemLeft;
    } else if (elemRight > containerRight) {
      container.scrollLeft = elemRight - container.clientWidth;
    }
  }

  function scrollHorizontalIntoViewIfNeeded(container, element) {
    if (!container || !element) return;
    var containerLeft = container.scrollLeft;
    var containerRight = containerLeft + container.clientWidth;
    var elemLeft = element.offsetLeft;
    var elemRight = elemLeft + element.offsetWidth;

    if (elemLeft < containerLeft) {
      container.scrollLeft = elemLeft;
    } else if (elemRight > containerRight) {
      container.scrollLeft = elemRight - container.clientWidth;
    }
  }

  function hasDetailSeasons() {
    return state.detailMode === 'series' && state.detailSeasons.length > 0;
  }

  function hasDetailEpisodes() {
    return state.detailMode === 'series' && state.detailEpisodes.length > 0;
  }

  function isDetailPanel(panel) {
    return panel === 'detail-actions' || panel === 'detail-seasons' || panel === 'detail-episodes';
  }

  function isSearchPanel(panel) {
    return panel === 'search-header' || panel === 'search-keyboard' || panel === 'search-results' || panel === 'search-back';
  }

  function isWatchlistPanel(panel) {
    return panel === 'watchlist-controls' || panel === 'watchlist-results';
  }

  function isHomePanel(panel) {
    return panel === 'home-rails' || panel === 'home-hero';
  }

  function handleHomeNavigation(code, items) {
    if (state.focusedPanel === 'home-hero') {
      if (code === 37) { // ArrowLeft
        if (state.focusedIndex > 0) {
          state.focusedIndex--;
          updateFocusUI();
        } else {
          state.focusedPanel = 'catalog-sidebar';
          state.focusedIndex = getSidebarFocusIndex('home');
          updateFocusUI();
        }
        return true;
      }
      if (code === 39) { // ArrowRight
        if (state.focusedIndex < items.length - 1) {
          state.focusedIndex++;
          updateFocusUI();
        }
        return true;
      }
      if (code === 40) { // ArrowDown
        state.focusedPanel = 'home-rails';
        state.focusedIndex = 0;
        updateFocusUI();
        return true;
      }
      if (code === 38) { // ArrowUp
        return true; // Consume at top
      }
      if (code === 13) { // Enter / OK
        var activeBtn = items[state.focusedIndex];
        if (activeBtn) {
          activeBtn.click();
        }
        return true;
      }
      return false;
    }

    if (!items.length) return false;

    var activeEl = items[state.focusedIndex];
    if (!activeEl) return false;

    var railIndex = parseInt(activeEl.getAttribute('data-rail-index'), 10) || 0;
    var cardIndex = parseInt(activeEl.getAttribute('data-card-index'), 10) || 0;

    if (code === 37) {
      if (cardIndex > 0) {
        state.focusedIndex = getHomeFlatIndex(railIndex, cardIndex - 1);
      } else {
        state.focusedPanel = 'catalog-sidebar';
        state.focusedIndex = getSidebarFocusIndex('home');
      }
      return true;
    }

    if (code === 39) {
      if (cardIndex < state.homeSections[railIndex].entries.length - 1) {
        state.focusedIndex = getHomeFlatIndex(railIndex, cardIndex + 1);
      }
      return true;
    }

    if (code === 38) {
      if (railIndex > 0) {
        var prevRail = railIndex - 1;
        while (prevRail >= 0 && !state.homeSections[prevRail].entries.length) {
          prevRail--;
        }
        if (prevRail >= 0) {
          state.focusedIndex = getHomeFlatIndex(prevRail, Math.min(cardIndex, state.homeSections[prevRail].entries.length - 1));
        } else {
          focusHomeHero(0);
        }
      } else {
        focusHomeHero(0);
      }
      return true;
    }

    if (code === 40) {
      if (railIndex < state.homeSections.length - 1) {
        var nextRail = railIndex + 1;
        while (nextRail < state.homeSections.length && !state.homeSections[nextRail].entries.length) {
          nextRail++;
        }
        if (nextRail < state.homeSections.length) {
          state.focusedIndex = getHomeFlatIndex(nextRail, Math.min(cardIndex, state.homeSections[nextRail].entries.length - 1));
        }
      }
      return true;
    }

    return false;
  }

  function handleDetailNavigation(code, items) {
    var handled = false;

    console.log('[D-Pad] handleDetailNavigation - code:', code, 'panel:', state.focusedPanel, 'index:', state.focusedIndex, 'items.length:', items ? items.length : 0);

    if (state.focusedPanel === 'detail-actions') {
      if (code === 37 && state.focusedIndex > 0) {
        state.focusedIndex--;
        handled = true;
      } else if (code === 39 && state.focusedIndex < items.length - 1) {
        state.focusedIndex++;
        handled = true;
      } else if (code === 40) {
        if (hasDetailSeasons()) {
          state.focusedPanel = 'detail-seasons';
          state.focusedIndex = state.detailSelectedSeasonIndex;
          handled = true;
        } else if (hasDetailEpisodes()) {
          state.focusedPanel = 'detail-episodes';
          state.focusedIndex = 0;
          handled = true;
        }
      }
      return handled;
    }

    if (state.focusedPanel === 'detail-seasons') {
      if (code === 37 && state.focusedIndex > 0) {
        state.focusedIndex--;
        selectDetailSeason(state.focusedIndex, false);
        handled = true;
      } else if (code === 39 && state.focusedIndex < items.length - 1) {
        state.focusedIndex++;
        selectDetailSeason(state.focusedIndex, false);
        handled = true;
      } else if (code === 38) {
        state.focusedPanel = 'detail-actions';
        state.focusedIndex = 0;
        handled = true;
      } else if (code === 40) {
        var hasEp = hasDetailEpisodes();
        console.log('[D-Pad] Seasons down key pressed. hasDetailEpisodes:', hasEp, 'detailEpisodes:', state.detailEpisodes ? state.detailEpisodes.length : 0, 'detailMode:', state.detailMode);
        if (hasEp) {
          state.focusedPanel = 'detail-episodes';
          state.focusedIndex = 0;
          handled = true;
        }
      }
      return handled;
    }

    if (state.focusedPanel === 'detail-episodes') {
      if (code === 37) { // ArrowLeft
        if (state.focusedIndex > 0) {
          state.focusedIndex--;
        } else if (hasDetailSeasons()) {
          state.focusedPanel = 'detail-seasons';
          state.focusedIndex = state.detailSelectedSeasonIndex;
        } else {
          state.focusedPanel = 'detail-actions';
          state.focusedIndex = 0;
        }
        handled = true;
      } else if (code === 39) { // ArrowRight
        if (state.focusedIndex < items.length - 1) {
          state.focusedIndex++;
        }
        handled = true;
      } else if (code === 38) { // ArrowUp
        if (hasDetailSeasons()) {
          state.focusedPanel = 'detail-seasons';
          state.focusedIndex = state.detailSelectedSeasonIndex;
        } else {
          state.focusedPanel = 'detail-actions';
          state.focusedIndex = 0;
        }
        handled = true;
      } else if (code === 40) { // ArrowDown
        handled = true; // Consume ArrowDown
      }
      return handled;
    }

    return handled;
  }

  function handleSearchNavigation(code, items) {
    var handled = false;
    var totalResults = getSearchResultsCount();

    if (state.focusedPanel === 'search-header') {
      if (code === 37) {
        state.focusedPanel = 'catalog-sidebar';
        state.focusedIndex = getSidebarFocusIndex('search');
        updateFocusUI();
        handled = true;
      } else if (code === 39) {
        if (totalResults > 0) {
          var firstSection = findSearchRailInDirection(0, 1);
          if (firstSection >= 0) {
            focusSearchResult(firstSection, 0);
            handled = true;
          }
        }
      } else if (code === 40) {
        focusSearchKeyboard(0, 0);
        handled = true;
      }
      return handled;
    }

    if (state.focusedPanel === 'search-keyboard') {
      var position = getSearchKeyboardPosition(state.focusedIndex);
      var rows = state.searchKeyboardRows.length ? state.searchKeyboardRows : getSearchKeyboardRows();
      var row = position.row;
      var col = position.col;
      var currentRow = rows[row] || [];

      if (code === 37) {
        if (col === 0) {
          state.focusedPanel = 'catalog-sidebar';
          state.focusedIndex = getSidebarFocusIndex('search');
          updateFocusUI();
        } else {
          focusSearchKeyboard(row, col - 1);
        }
        handled = true;
      } else if (code === 39) {
        if (col >= currentRow.length - 1) {
          var firstRail = findSearchRailInDirection(0, 1);
          if (firstRail >= 0) {
            focusSearchResult(firstRail, 0);
          }
        } else {
          focusSearchKeyboard(row, col + 1);
        }
        handled = true;
      } else if (code === 38) {
        if (row === 0) {
          focusSearchHeader(0);
        } else {
          var upCol = Math.min(col, rows[row - 1].length - 1);
          focusSearchKeyboard(row - 1, upCol);
        }
        handled = true;
      } else if (code === 40) {
        if (row >= rows.length - 1) {
          state.focusedPanel = 'search-back';
          state.focusedIndex = 0;
          updateFocusUI();
        } else {
          var downCol = Math.min(col, rows[row + 1].length - 1);
          focusSearchKeyboard(row + 1, downCol);
        }
        handled = true;
      }
      return handled;
    }

    if (state.focusedPanel === 'search-back') {
      if (code === 37) {
        state.focusedPanel = 'catalog-sidebar';
        state.focusedIndex = getSidebarFocusIndex('search');
        updateFocusUI();
        handled = true;
      } else if (code === 39) {
        if (totalResults > 0) {
          var firstRail = findSearchRailInDirection(0, 1);
          if (firstRail >= 0) {
            focusSearchResult(firstRail, 0);
            handled = true;
          }
        }
      } else if (code === 38) {
        focusSearchKeyboard(8, 1);
        handled = true;
      } else if (code === 40) {
        handled = true;
      }
      return handled;
    }

    if (state.focusedPanel === 'search-results') {
      var activeEl = items[state.focusedIndex];
      if (!activeEl) return false;

      var sectionIndex = parseInt(activeEl.getAttribute('data-section-index'), 10) || 0;
      var cardIndex = parseInt(activeEl.getAttribute('data-card-index'), 10) || 0;
      var rail = state.searchRails[sectionIndex];
      if (!rail) return false;

      if (code === 37) {
        if (cardIndex === 0) {
          var targetKeyboardRows = state.searchKeyboardRows.length ? state.searchKeyboardRows.length : getSearchKeyboardRows().length;
          if (sectionIndex >= targetKeyboardRows) {
            state.focusedPanel = 'search-back';
            state.focusedIndex = 0;
            updateFocusUI();
          } else {
            var targetRow = Math.min(sectionIndex, targetKeyboardRows - 1);
            var targetCols = state.searchKeyboardRows[targetRow].length;
            focusSearchKeyboard(targetRow, targetCols - 1);
          }
        } else {
          focusSearchResult(sectionIndex, cardIndex - 1);
        }
        handled = true;
      } else if (code === 39) {
        if (cardIndex < rail.items.length - 1) {
          focusSearchResult(sectionIndex, cardIndex + 1);
          handled = true;
        }
      } else if (code === 38) {
        var prevSection = findSearchRailInDirection(sectionIndex - 1, -1);
        if (prevSection >= 0) {
          focusSearchResult(prevSection, Math.min(cardIndex, state.searchRails[prevSection].items.length - 1));
        } else {
          focusSearchHeader(0);
        }
        handled = true;
      } else if (code === 40) {
        var followingSection = findSearchRailInDirection(sectionIndex + 1, 1);
        if (followingSection >= 0) {
          focusSearchResult(followingSection, Math.min(cardIndex, state.searchRails[followingSection].items.length - 1));
        }
        handled = true;
      }
    }

    return handled;
  }

  function handleWatchlistNavigation(code, items) {
    var handled = false;
    var gridColumns = 5;

    if (state.focusedPanel === 'watchlist-controls') {
      if (code === 37 && state.focusedIndex > 0) {
        state.focusedIndex--;
        handled = true;
      } else if (code === 39 && state.focusedIndex < items.length - 1) {
        state.focusedIndex++;
        handled = true;
      } else if (code === 40 && state.watchlistItems.length > 0) {
        state.focusedPanel = 'watchlist-results';
        state.focusedIndex = 0;
        handled = true;
      }
      return handled;
    }

    if (state.focusedPanel === 'watchlist-results') {
      if (code === 38) {
        if (state.focusedIndex >= gridColumns) {
          state.focusedIndex -= gridColumns;
        } else {
          state.focusedPanel = 'watchlist-controls';
          state.focusedIndex = 0;
        }
        handled = true;
      } else if (code === 40) {
        if (state.focusedIndex + gridColumns < items.length) {
          state.focusedIndex += gridColumns;
          handled = true;
        }
      } else if (code === 37) {
        if (state.focusedIndex % gridColumns > 0) {
          state.focusedIndex--;
        }
        handled = true;
      } else if (code === 39) {
        if (state.focusedIndex % gridColumns < gridColumns - 1 && state.focusedIndex < items.length - 1) {
          state.focusedIndex++;
        }
        handled = true;
      }
    }

    return handled;
  }

  // KEYBOARD OR TELEVISION REMOTE CONTROLLER HANDLER
  window.addEventListener('keydown', function (event) {
    var code = event.keyCode || event.which;
    var handled = false;

    // Handle back button separately across panels
    if (code === 8 || code === 461 || code === 27) { // Backspace, webOS Back, Escape
      if (state.focusedPanel === 'player') {
        closePlayer();
        handled = true;
      } else if (state.focusedPanel === 'profile-form') {
        closeProfileFormModal(false);
        handled = true;
      } else if (state.focusedPanel === 'login') {
        if (!state.loginPending) {
          setupWelcomeView();
          handled = true;
        }
      } else if (state.focusedPanel === 'profiles') {
        // Log out / return to login
        logoutUser();
        handled = true;
      } else if (isDetailPanel(state.focusedPanel)) {
        closeContentDetail();
        handled = true;
      } else if (isSearchPanel(state.focusedPanel)) {
        returnToCatalogSidebar('search');
        handled = true;
      } else if (isWatchlistPanel(state.focusedPanel)) {
        returnToCatalogSidebar('watchlist');
        handled = true;
      } else if (state.focusedPanel === 'settings-actions') {
        returnToCatalogSidebar('settings');
        handled = true;
      } else if (state.focusedPanel === 'catalog-categories' || state.focusedPanel === 'catalog-channels' || state.focusedPanel === 'catalog-sidebar' || state.focusedPanel === 'home-rails') {
        // Go back to profile selection
        setupProfilesView();
        handled = true;
      }
      
      if (handled) {
        event.preventDefault();
        return;
      }
    }

    if (state.focusedPanel === 'player') {
      // Up/Down changes channels in full-screen player
      if (code === 38) { // ArrowUp
        switchPlaybackChannel(-1);
        handled = true;
      } else if (code === 40) { // ArrowDown
        switchPlaybackChannel(1);
        handled = true;
      }
      
      if (handled) {
        event.preventDefault();
      }
      return;
    }

    if (isSearchPanel(state.focusedPanel) && event.key && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      setSearchQueryValue(state.searchQuery + event.key);
      event.preventDefault();
      return;
    }

    var items = getFocusableElements();
    var gridColumns = getCatalogGridColumnCount();

    if (isDetailPanel(state.focusedPanel)) {
      handled = handleDetailNavigation(code, items);
    } else if (isHomePanel(state.focusedPanel)) {
      handled = handleHomeNavigation(code, items);
    } else if (isSearchPanel(state.focusedPanel)) {
      handled = handleSearchNavigation(code, items);
    } else if (isWatchlistPanel(state.focusedPanel)) {
      handled = handleWatchlistNavigation(code, items);
    }

    if (!handled && code === 38) { // ArrowUp
      if (items.length > 0) {
        if (state.focusedPanel === 'catalog-channels') {
          // Grid navigation: move one row up
          if (state.focusedIndex >= gridColumns) {
            state.focusedIndex -= gridColumns;
            handled = true;
          }
        } else {
          // Vertical lists (sidebar, categories, login form)
          if (state.focusedIndex > 0) {
            state.focusedIndex--;
            handled = true;
          }
        }
      }
    } else if (!handled && code === 40) { // ArrowDown
      if (items.length > 0) {
        if (state.focusedPanel === 'catalog-channels') {
          // Grid navigation: move one row down
          if (state.focusedIndex + gridColumns < items.length) {
            state.focusedIndex += gridColumns;
            handled = true;
          } else {
            // If we are not on the last row, let's go to the last item
            var currentRow = Math.floor(state.focusedIndex / gridColumns);
            var totalRows = Math.ceil(items.length / gridColumns);
            if (currentRow < totalRows - 1) {
              state.focusedIndex = items.length - 1;
              handled = true;
            }
          }
        } else {
          // Vertical lists
          if (state.focusedIndex < items.length - 1) {
            state.focusedIndex++;
            handled = true;
          }
        }
      }
    } else if (!handled && code === 37) { // ArrowLeft
      if (state.focusedPanel === 'catalog-channels') {
        // Grid left navigation
        if (items.length > 0 && state.focusedIndex % gridColumns > 0) {
          state.focusedIndex--;
          handled = true;
        } else {
          // Go to categories list
          state.focusedPanel = 'catalog-categories';
          state.focusedIndex = getActiveCategoryIndex();
          handled = true;
        }
      } else if (state.focusedPanel === 'catalog-categories') {
        // Go to sidebar
        state.focusedPanel = 'catalog-sidebar';
        state.focusedIndex = getSidebarFocusIndex();
        handled = true;
      } else if (state.focusedPanel === 'profiles') {
        // Left horizontal profile selection
        if (items.length > 0 && state.focusedIndex > 0) {
          state.focusedIndex--;
          handled = true;
        }
      } else if (state.focusedPanel === 'profile-form') {
        if (items.length > 0 && state.focusedIndex > 0) {
          state.focusedIndex--;
          handled = true;
        }
      }
    } else if (!handled && code === 39) { // ArrowRight
      if (state.focusedPanel === 'catalog-sidebar') {
        if (state.catalogScreen === 'home') {
          if (state.focusedIndex === getSidebarFocusIndex('home')) {
            if (state.homeHeroEntry) {
              focusHomeHero(0);
              handled = true;
            } else if (document.getElementById('home-rails').querySelectorAll('.focusable').length > 0) {
              state.focusedPanel = 'home-rails';
              state.focusedIndex = 0;
              updateFocusUI();
              handled = true;
            }
          }
        } else if (state.categories.length > 0 && state.focusedIndex <= getSidebarFocusIndex('series')) {
          state.focusedPanel = 'catalog-categories';
          state.focusedIndex = getActiveCategoryIndex();
          handled = true;
        }
      } else if (state.focusedPanel === 'catalog-categories') {
        // Go to channels grid
        if (state.channels.length > 0) {
          state.focusedPanel = 'catalog-channels';
          state.focusedIndex = 0;
          handled = true;
        }
      } else if (state.focusedPanel === 'catalog-channels') {
        // Grid right navigation
        if (items.length > 0 && state.focusedIndex % gridColumns < gridColumns - 1 && state.focusedIndex < items.length - 1) {
          state.focusedIndex++;
          handled = true;
        }
      } else if (state.focusedPanel === 'profiles') {
        // Right profile selection
        if (items.length > 0 && state.focusedIndex < items.length - 1) {
          state.focusedIndex++;
          handled = true;
        }
      } else if (state.focusedPanel === 'profile-form') {
        if (items.length > 0 && state.focusedIndex < items.length - 1) {
          state.focusedIndex++;
          handled = true;
        }
      }
    } else if (code === 13) { // Enter Key
      if (items.length > 0) {
        var activeEl = items[state.focusedIndex];
        if (activeEl) {
          if (activeEl.tagName === 'INPUT') {
            activeEl.focus();
          } else {
            // Simulate click
            activeEl.click();
          }
          handled = true;
        }
      }
    }

    if (handled) {
      event.preventDefault();
      updateFocusUI();
    }
  });

  function getActiveCategoryIndex() {
    for (var i = 0; i < state.categories.length; i++) {
      if (state.categories[i].category_id === state.selectedCategoryId) {
        return i;
      }
    }
    return 0;
  }

  // --- BUTTON CLICKS ACTIONS BINDINGS ---
  document.getElementById('welcome-btn-signin').onclick = function () {
    setupLoginView();
  };

  document.getElementById('login-btn-submit').onclick = function () {
    executeLogin();
  };

  document.getElementById('login-btn-back').onclick = function () {
    if (!state.loginPending) {
      setupWelcomeView();
    }
  };

  document.getElementById('login-code').oninput = function () {
    this.value = String(this.value || '').toUpperCase();
    this.classList.remove('input-error');
    document.getElementById('login-error-code').textContent = '';
    setLoginResolvedPortal(null);
    if (!state.loginPending) {
      setLoginStatus('Server identity updated. Reconnect to validate the portal.', 'idle');
    }
  };

  document.getElementById('login-user').oninput = function () {
    this.classList.remove('input-error');
    document.getElementById('login-error-user').textContent = '';
    if (!state.loginPending) {
      setLoginStatus('Username updated.', 'idle');
    }
  };

  document.getElementById('login-pass').oninput = function () {
    this.classList.remove('input-error');
    document.getElementById('login-error-pass').textContent = '';
    if (!state.loginPending) {
      setLoginStatus('Password updated.', 'idle');
    }
  };

  document.getElementById('profile-form-kids').onclick = function () {
    state.profileFormDraft.isKids = !state.profileFormDraft.isKids;
    syncProfileFormToggle();
    setProfileFormStatus(state.profileFormDraft.isKids ? 'Kids mode enabled for this profile.' : 'Kids mode disabled for this profile.', 'info');
  };

  document.getElementById('profile-form-name').oninput = function () {
    this.classList.remove('input-error');
    document.getElementById('profile-form-name-error').textContent = '';
    state.profileFormDraft.name = String(this.value || '');

    var avatarNode = document.getElementById('profile-form-avatar');
    if (!String(avatarNode.value || '').trim()) {
      avatarNode.value = deriveProfileInitials(state.profileFormDraft.name);
    }
  };

  document.getElementById('profile-form-avatar').oninput = function () {
    this.value = sanitizeProfileInitials(this.value || '');
    this.classList.remove('input-error');
    document.getElementById('profile-form-avatar-error').textContent = '';
    state.profileFormDraft.avatarSeed = this.value;
  };

  document.getElementById('profile-form-save').onclick = function () {
    saveNewProfile();
  };

  document.getElementById('profile-form-cancel').onclick = function () {
    closeProfileFormModal(false);
  };

  document.getElementById('sidebar-home').onclick = function () {
    openHomeView();
  };

  document.getElementById('sidebar-live').onclick = function () {
    loadCatalog('live');
  };

  document.getElementById('sidebar-movies').onclick = function () {
    loadCatalog('movies');
  };

  document.getElementById('sidebar-series').onclick = function () {
    loadCatalog('series');
  };

  document.getElementById('sidebar-search').onclick = function () {
    openSearchView();
  };

  document.getElementById('sidebar-watchlist').onclick = function () {
    openWatchlistView();
  };

  document.getElementById('sidebar-settings').onclick = function () {
    openSettingsView();
  };

  document.getElementById('search-query-display').onclick = function () {
    focusSearchKeyboard(0, 0);
  };

  document.getElementById('search-btn-back').onclick = function () {
    returnToCatalogSidebar('search');
  };

  document.getElementById('watchlist-filter-all').onclick = function () {
    setWatchlistFilter('all');
  };

  document.getElementById('watchlist-filter-movies').onclick = function () {
    setWatchlistFilter('movies');
  };

  document.getElementById('watchlist-filter-series').onclick = function () {
    setWatchlistFilter('series');
  };

  document.getElementById('watchlist-btn-back').onclick = function () {
    returnToCatalogSidebar('watchlist');
  };

  document.getElementById('detail-btn-play').onclick = function () {
    playDetailPrimary();
  };

  document.getElementById('detail-btn-favorite').onclick = function () {
    if (!state.detailItem) return;
    toggleFavoriteItem(state.detailMode, state.detailItem);
    updateDetailFavoriteButton();
  };

  document.getElementById('detail-btn-back').onclick = function () {
    closeContentDetail();
  };

  document.getElementById('settings-btn-switch-profile').onclick = function () {
    setupProfilesView();
  };

  document.getElementById('settings-btn-clear-watchlist').onclick = function () {
    clearCurrentProfileFavorites();
    renderWatchlist();
    updateSettingsView();
    updateFocusUI();
  };

  document.getElementById('settings-btn-logout').onclick = function () {
    logoutUser();
  };

  document.getElementById('settings-btn-back').onclick = function () {
    returnToCatalogSidebar('settings');
  };

  document.getElementById('sidebar-profile').onclick = function () {
    setupProfilesView();
  };

  document.getElementById('sidebar-logout').onclick = function () {
    logoutUser();
  };

  function logoutUser() {
    try {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(PROFILES_KEY);
      localStorage.removeItem(SELECTED_PROFILE_KEY);
    } catch (e) {}
    state.session = null;
    state.profiles = [];
    state.selectedProfile = null;
    state.searchQuery = '';
    state.searchResults = [];
    state.searchRails = [];
    state.searchLoading = false;
    state.searchKeyboardShifted = false;
    state.searchKeyboardRows = [];
    if (state.searchQueryDebounce) {
      clearTimeout(state.searchQueryDebounce);
      state.searchQueryDebounce = null;
    }
    state.searchCache = {};
    state.watchlistItems = [];
    state.homeCatalogCache = { live: null, movies: null, series: null };
    state.homeSections = [];
    state.homeHeroEntry = null;
    state.catalogScreen = 'home';
    setupWelcomeView();
  }

  // Boot the app safely checking readyState to prevent missing the load event
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
  } else {
    window.onload = function () {
      init();
    };
  }
})();
