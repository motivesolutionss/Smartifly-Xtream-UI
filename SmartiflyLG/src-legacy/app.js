(function () {
  function adjustViewportScale() {
    var w = window.innerWidth || document.documentElement.clientWidth || 1920;
    var h = window.innerHeight || document.documentElement.clientHeight || 1080;
    var scale = Math.min(w / 1920, h / 1080);
    document.documentElement.style.zoom = scale;
  }
  window.addEventListener('resize', adjustViewportScale);
  window.addEventListener('DOMContentLoaded', adjustViewportScale);
  window.addEventListener('load', adjustViewportScale);
  adjustViewportScale();

  // --- LOCAL STORAGE KEYS ---
  var SESSION_KEY = 'smartifly-lg-session';
  var PROFILES_KEY = 'smartifly-lg-profiles';
  var SELECTED_PROFILE_KEY = 'smartifly-lg-selected-profile';
  var PORTAL_KEY = 'smartifly-lg-last-portal';
  var FAVORITES_KEY = 'smartifly-lg-favorites';
  var HISTORY_KEY = 'smartifly-lg-history';
  var RESUME_KEY = 'smartifly-lg-resume';

  // --- EPG STATE & TIMER ---
  var epgTimer = null;
  var hlsInstance = null;
  var playerSubtitleLoadToken = 0;
  var profileKeyboardRows = []; // Cached rows for profile name keyboard navigation
  var playerOverlayTimer = null;
  var playerClockTimer = null;
  var isPlayerOverlayVisible = true;
  var PLAY_SVG = '<svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
  var PAUSE_SVG = '<svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';

  // --- STATE DEFINITION ---
  var state = {
    session: null,
    profiles: [],
    selectedProfile: null,
    searchQuery: '',
    searchResults: [],
    searchRails: [],
    searchCache: {},
    searchLoading: false,
    searchLoadingModes: {},
    searchKeyboardShifted: false,
    searchKeyboardRows: [],
    searchQueryDebounce: null,
    catalogMode: 'live',
    categories: [],
    channels: [],
    selectedCategoryId: '',
    selectedCategoryName: '',
    focusedPanel: 'welcome', // 'welcome', 'login-wizard', 'profiles', 'catalog-sidebar', 'catalog-categories', 'catalog-channels', 'player'
    focusedIndex: 0, // Index of focused item inside current panel
    activeChannel: null,
    activeChannelQueue: [],
    activeChannelIndex: 0,
    currentViewId: 'view-welcome',
    playerReturnViewId: 'view-catalog',
    playerReturnPanel: 'catalog-channels',
    playerReturnIndex: 0,
    playerMode: 'live',
    playerUiTitle: '',
    playerUiSubtitle: '',
    playerUiMeta: '',
    playerUiTopMeta: '',
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
    watchlistFilter: 'all',
    watchlistItems: [],
    watchHistory: [],
    resumeState: [],
    homeCatalogCache: {
      live: null,
      movies: null,
      series: null
    },
    homeSections: [],
    homeHeroEntry: null,
    homeLoading: false,
    homeLoadError: '',
    catalogScreen: 'home',
    wizardStepIndex: 0,
    wizardValues: { portal: '', username: '', password: '' },
    keyboardIsShifted: false,
    keyboardMode: 'letters',
    activationTimer: null,
    activationDeviceId: '',
    loginPending: false,
    loginRequestId: 0,
    loginResolvedPortal: null,
    profileModalCaller: 'settings',
    profileModal: {
      mode: null,
      targetId: null,
      focusIndex: 0,
      isKids: false,
      nameBuffer: '',
      keyboardIsShifted: false,
      keyboardMode: 'letters',
      pinBuffer: '',
      openerFocusIndex: 0,
      openerProfileId: null,
      openerFocusPanel: 'settings-profiles',
      keyboardReturnFocusIndex: 0,
      keyboardOpen: false
    },
    homeSections: [],
    homeLoading: false,
    homeHeroEntry: null,
    homeLoadError: '',
    homeCatalogCache: { live: null, movies: null, series: null },
    watchlistItems: [],
    watchlistFilter: 'all',
    settingsActiveTab: 'account',
    catalogScreen: 'home',
    detailItem: null,
    detailMode: null,
    favorites: {},
    watchHistory: [],
    channelsCache: {},       // keyed by mode+':'+categoryId
    channelsCacheCount: {},  // keyed by mode+':'+categoryId ? item count
    channelsBatchSize: 20,   // number of cards currently rendered in the DOM
    pinEntry: null,          // { profile, buffer } when PIN overlay is open
    currentPlayback: null,    // active movie/episode resume context
    playerSubtitleTracks: [],
    playerSubtitleIndex: -1,
    playerSubtitleObjectUrls: [],
    playerAspect: 'contain',  // active aspect ratio (contain, cover, fill)
    playerMuted: false,       // active mute preference (true, false)
    activeFocusedEl: null     // currently focused DOM element for O(1) focus management
  };

  var MAX_HOME_RAIL_ITEMS = 12;
  var MAX_SEARCH_RAIL_ITEMS = 12;
  var CATALOG_BATCH_SIZE = 20;      // cards rendered per batch
  var CATALOG_BATCH_PREFETCH = 5;   // expand when focus is within this many items of the rendered end
  var HOME_DEBUG_LOGS = true;
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

  function logHomeDebug(label, details) {
    if (!HOME_DEBUG_LOGS || typeof console === 'undefined' || !console.log) return;
    try {
      console.log('[HOME_DEBUG] ' + label, details || {});
    } catch (e) {
      try {
        console.log('[HOME_DEBUG] ' + label);
      } catch (ignore) {}
    }
  }

  function getHomeVerticalScrollNode() {
    return document.getElementById('home-panel') || document.getElementById('home-scroll');
  }

  function ensureHomeHeroPlayFocus() {
    var focusPlay = function () {
      if (state.catalogScreen === 'home' && state.homeHeroEntry) {
        focusHomeHero(0);
      }
    };

    focusPlay();
    setTimeout(focusPlay, 0);
    setTimeout(focusPlay, 60);
    setTimeout(focusPlay, 140);
  }

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

  function buildActivationMac(deviceId) {
    var normalized = deviceId.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    var last6 = normalized.slice(-6);
    while (last6.length < 6) {
      last6 = '0' + last6;
    }
    return '00:1A:79:' + last6;
  }

  function getActivationOsVersion() {
    var ua = (window.navigator && window.navigator.userAgent) || 'webos';
    return ua.slice(0, 50);
  }

  function apiRegisterDevice(deviceId, mac, onSuccess, onError) {
    var xhr = new XMLHttpRequest();
    var url = API_BASE_URL + '/public/device/register';
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.timeout = 15000;

    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        onSuccess();
      } else {
        onError('Registration failed: HTTP ' + xhr.status);
      }
    };
    xhr.onerror = function () { onError('Network error registering device'); };
    xhr.send(JSON.stringify({
      deviceId: deviceId,
      mac: mac,
      brand: 'LG',
      model: 'webOS Emulator',
      platform: 'WEBOS',
      appVersion: 'lg-webos',
      osVersion: getActivationOsVersion()
    }));
  }

  function apiFetchActivationSession(deviceId, mac, onSuccess, onError) {
    var xhr = new XMLHttpRequest();
    var url = API_BASE_URL + '/public/qr/generate';
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.timeout = 15000;

    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          var res = JSON.parse(xhr.responseText);
          if (res.success && res.webLink && res.token && res.settingsCode) {
            onSuccess(res);
          } else {
            onError(res.message || 'Activation session generation failed');
          }
        } catch (e) {
          onError('Invalid JSON response');
        }
      } else {
        onError('Session fetch failed: HTTP ' + xhr.status);
      }
    };
    xhr.onerror = function () { onError('Network error fetching session'); };
    xhr.send(JSON.stringify({
      licenseKey: 'TRIAL',
      deviceId: deviceId,
      mac: mac,
      platform: 'WEBOS',
      brand: 'LG',
      model: 'webOS Emulator',
      appVersion: 'lg-webos',
      osVersion: getActivationOsVersion()
    }));
  }

  function apiCheckDeviceActivation(deviceId, mac, onSuccess, onError) {
    var xhr = new XMLHttpRequest();
    var url = API_BASE_URL + '/public/device/check?deviceId=' + encodeURIComponent(deviceId) + '&mac=' + encodeURIComponent(mac);
    xhr.open('GET', url, true);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.timeout = 15000;

    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          var res = JSON.parse(xhr.responseText);
          if (res.state) {
            onSuccess(res);
          } else {
            onError(res.reason || 'Activation check failed');
          }
        } catch (e) {
          onError('Invalid status response');
        }
      } else {
        onError('Check status failed: HTTP ' + xhr.status);
      }
    };
    xhr.onerror = function () { onError('Network error checking status'); };
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
      sanitizeWatchHistory();
    } catch (e) {
      state.watchHistory = [];
    }
  }

  function loadResumeState() {
    try {
      var raw = localStorage.getItem(RESUME_KEY);
      state.resumeState = raw ? JSON.parse(raw) : [];
      sanitizeResumeState();
    } catch (e) {
      state.resumeState = [];
    }
  }

  function saveResumeState() {
    try {
      localStorage.setItem(RESUME_KEY, JSON.stringify(state.resumeState || []));
    } catch (e) {}
  }

  function sanitizeResumeState() {
    if (!state.resumeState || !state.resumeState.length) return;
    var deduped = [];
    for (var i = 0; i < state.resumeState.length; i++) {
      var entry = state.resumeState[i];
      if (!entry || !entry.id || !entry.mode) continue;
      if (entry.completed) continue;
      var key = [
        entry.portalCode || 'default',
        entry.profileId || 'default',
        entry.mode,
        String(entry.id)
      ].join('::');
      var found = false;
      for (var j = 0; j < deduped.length; j++) {
        var existing = deduped[j];
        var existingKey = [
          existing.portalCode || 'default',
          existing.profileId || 'default',
          existing.mode,
          String(existing.id)
        ].join('::');
        if (existingKey === key) {
          found = true;
          if (String(entry.playedAt || '') > String(existing.playedAt || '')) {
            deduped[j] = entry;
          }
          break;
        }
      }
      if (!found) {
        deduped.push(entry);
      }
    }
    deduped.sort(function (a, b) {
      return String(b.playedAt || '').localeCompare(String(a.playedAt || ''));
    });
    state.resumeState = deduped.slice(0, MAX_HOME_RAIL_ITEMS + 8);
  }

  function sanitizeWatchHistory() {
    if (!state.watchHistory || !state.watchHistory.length) return;
    var deduped = [];
    for (var i = 0; i < state.watchHistory.length; i++) {
      var item = state.watchHistory[i];
      if (!item) continue;
      var isDup = false;
      for (var j = 0; j < deduped.length; j++) {
        var existing = deduped[j];
        if (existing.mode === item.mode &&
            existing.portalCode === item.portalCode &&
            existing.profileId === item.profileId) {
          if (String(existing.id) === String(item.id)) {
            isDup = true;
            break;
          }
          if (item.mode === 'series' &&
              existing.name && item.name &&
              existing.name.toLowerCase().trim() === item.name.toLowerCase().trim()) {
            if (!existing.artwork && item.artwork) {
              existing.id = item.id;
              existing.artwork = item.artwork;
              existing.item = item.item;
            }
            isDup = true;
            break;
          }
        }
      }
      if (!isDup) {
        deduped.push(item);
      }
    }
    state.watchHistory = deduped;
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

  function getCurrentProfileScope() {
    return {
      portalCode: state.session && state.session.portalCode ? state.session.portalCode : 'default',
      profileId: state.selectedProfile && state.selectedProfile.id ? state.selectedProfile.id : 'default'
    };
  }

  function isResumeComplete(currentTime, duration) {
    var safeCurrent = Number(currentTime) || 0;
    var safeDuration = Number(duration) || 0;
    if (!isFinite(safeDuration) || safeDuration <= 0) return false;
    if (safeCurrent >= safeDuration) return true;
    var remaining = Math.max(0, safeDuration - safeCurrent);
    var percent = (safeCurrent / safeDuration) * 100;
    return percent >= 90 || remaining <= 60;
  }

  function getResumeProgressPercent(currentTime, duration) {
    var safeCurrent = Number(currentTime) || 0;
    var safeDuration = Number(duration) || 0;
    if (!isFinite(safeDuration) || safeDuration <= 0) return 0;
    return Math.round(Math.max(0, Math.min(100, (safeCurrent / safeDuration) * 100)));
  }

  function getResumeEntryMeta(entry) {
    if (!entry) return '';
    var parts = [];
    if (entry.mode === 'series') {
      if (entry.season != null && entry.episodeNum != null) {
        parts.push('S' + entry.season + ' E' + entry.episodeNum);
      } else if (entry.episodeTitle) {
        parts.push(entry.episodeTitle);
      }
    }
    var percent = Number(entry.progressPercent) || 0;
    if (percent > 0) {
      parts.push(percent + '% watched');
    }
    return parts.join(' • ');
  }

  function buildResumeFallbackItem(entry) {
    if (!entry) return null;
    if (entry.mode === 'series') {
      return entry.item || {
        series_id: entry.id,
        name: entry.name,
        cover: entry.artwork || ''
      };
    }
    return entry.item || {
      stream_id: entry.id,
      name: entry.name,
      stream_icon: entry.artwork || '',
      container_extension: 'mp4'
    };
  }

  function getCurrentProfileResumeEntries() {
    var scope = getCurrentProfileScope();
    var entries = [];
    for (var i = 0; i < state.resumeState.length; i++) {
      var entry = state.resumeState[i];
      if (!entry || entry.completed) continue;
      if (entry.portalCode === scope.portalCode && entry.profileId === scope.profileId) {
        entries.push(entry);
      }
      if (entries.length >= MAX_HOME_RAIL_ITEMS) break;
    }
    return entries;
  }

  function removeResumeEntry(mode, resumeId) {
    var scope = getCurrentProfileScope();
    var changed = false;
    var remaining = [];
    for (var i = 0; i < state.resumeState.length; i++) {
      var entry = state.resumeState[i];
      if (!entry) continue;
      if (entry.portalCode === scope.portalCode &&
          entry.profileId === scope.profileId &&
          entry.mode === mode &&
          String(entry.id) === String(resumeId)) {
        changed = true;
        continue;
      }
      remaining.push(entry);
    }
    if (changed) {
      state.resumeState = remaining;
      saveResumeState();
    }
  }

  function upsertResumeEntry(entry) {
    if (!entry || !entry.id || !entry.mode) return;
    var replaced = false;
    var next = [entry];
    for (var i = 0; i < state.resumeState.length; i++) {
      var existing = state.resumeState[i];
      if (!existing) continue;
      if (existing.portalCode === entry.portalCode &&
          existing.profileId === entry.profileId &&
          existing.mode === entry.mode &&
          String(existing.id) === String(entry.id)) {
        replaced = true;
        continue;
      }
      next.push(existing);
    }
    state.resumeState = next.slice(0, MAX_HOME_RAIL_ITEMS + 8);
    saveResumeState();
  }

  function buildResumeEntryFromPlayback(currentTime, duration) {
    var playback = state.currentPlayback;
    if (!playback) return null;
    var safeCurrent = Math.max(0, Number(currentTime) || 0);
    var safeDuration = Math.max(0, Number(duration) || 0);
    var scope = getCurrentProfileScope();
    var entry = {
      id: String(playback.resumeId),
      mode: playback.mode,
      portalCode: scope.portalCode,
      profileId: scope.profileId,
      name: playback.name,
      artwork: playback.artwork || '',
      item: playback.item || null,
      currentTime: safeCurrent,
      duration: safeDuration,
      progressPercent: getResumeProgressPercent(safeCurrent, safeDuration),
      playedAt: new Date().toISOString(),
      completed: false
    };

    if (playback.mode === 'series') {
      entry.episodeId = String(playback.episodeId || '');
      entry.episodeItem = playback.episodeItem || null;
      entry.episodeTitle = playback.episodeTitle || '';
      entry.season = playback.season;
      entry.episodeNum = playback.episodeNum;
    }

    return entry;
  }

  function persistCurrentPlaybackProgress(force, markComplete) {
    if (!state.currentPlayback || state.playerMode !== 'vod') return;
    var video = document.getElementById('player-video');
    if (!video) return;

    var duration = Number(video.duration);
    var currentTime = Number(video.currentTime);
    if ((!isFinite(duration) || duration <= 0 || !isFinite(currentTime) || currentTime < 0) && !markComplete) {
      return;
    }

    if (!force) {
      var rounded = Math.floor(currentTime || 0);
      if (rounded <= 0 || rounded - (state.currentPlayback.lastSavedSecond || 0) < 5) {
        return;
      }
      state.currentPlayback.lastSavedSecond = rounded;
    }

    if (markComplete || isResumeComplete(currentTime, duration)) {
      removeResumeEntry(state.currentPlayback.mode, state.currentPlayback.resumeId);
      return;
    }

    var entry = buildResumeEntryFromPlayback(currentTime, duration);
    if (entry) {
      upsertResumeEntry(entry);
    }
  }

  function applyPendingResumeSeek(video) {
    if (!video || !state.currentPlayback || state.currentPlayback.resumeApplied) return;
    var resumeAt = Number(state.currentPlayback.resumeAt || 0);
    var duration = Number(video.duration || 0);
    if (!isFinite(resumeAt) || resumeAt <= 0) {
      state.currentPlayback.resumeApplied = true;
      return;
    }
    if (isFinite(duration) && duration > 0) {
      resumeAt = Math.max(0, Math.min(resumeAt, Math.max(0, duration - 2)));
    }
    try {
      video.currentTime = resumeAt;
    } catch (e) {}
    state.currentPlayback.resumeApplied = true;
    updatePlayerProgressUi();
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
      if (existing.portalCode === entry.portalCode && existing.profileId === entry.profileId && existing.mode === entry.mode) {
        if (String(existing.id) === entry.id) {
          continue;
        }
        if (entry.mode === 'series' && existing.name && entry.name && existing.name.toLowerCase().trim() === entry.name.toLowerCase().trim()) {
          continue;
        }
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
    var SIDEBAR_MODE_INDEX = {
      'home': 0,
      'live': 1,
      'movies': 2,
      'series': 3,
      'search': 4,
      'watchlist': 5,
      'settings': 6
    };
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

    // Strip Season/Episode patterns (e.g. S01E01, S1E1, Season 1 Episode 1, etc.)
    cleaned = cleaned.replace(/\bS\d+\s*E\d+\b/gi, '');
    cleaned = cleaned.replace(/\b(?:season|sezon)\s*\d+\s*(?:episode|bölüm)\s*\d+\b/gi, '');

    // Strip dates in DD.MM.YYYY, DD-MM-YYYY, YYYY-MM-DD formats
    cleaned = cleaned.replace(/\b\d{2}[\.\-\/]\d{2}[\.\-\/]\d{4}\b/g, '');
    cleaned = cleaned.replace(/\b\d{4}[\.\-\/]\d{2}[\.\-\/]\d{2}\b/g, '');

    // Strip regional/junk keywords (e.g. Yeni Dizi, Yeni, Dizi)
    cleaned = cleaned.replace(/\b(?:Yeni\s+Dizi|Yeni|Dizi)\b/gi, '');

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
    cleaned = cleaned.replace(/\s*-\s*-\s*/g, ' - ');
    cleaned = cleaned.replace(/^[\s\-\.\_\/\\|:]+|[\s\-\.\_\/\\|:]+$/g, '');

    return cleaned.trim();
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

  function getLegacyArtworkUrl(url) {
    if (!url) return '';
    if (/^https:\/\//i.test(url)) {
      return url.replace(/^https:\/\//i, 'http://');
    }
    return url;
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
      poster.src = getLegacyArtworkUrl(artwork);
    } else {
      poster.style.display = 'none';
      poster.removeAttribute('src');
    }

    var activeBackdrop = detailInfo ? backdropArt : '';
    applyDetailBackdrop(activeBackdrop, detailInfo ? artwork : '');

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
        playSeriesEpisode(selectedEpisode, getCatalogItemName(state.detailItem), state.detailItem);
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
      img.src = getLegacyArtworkUrl(getCatalogItemArtwork(item, mode));
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

  function getSessionPassword() {
    if (state.session && state.session.userInfo && state.session.userInfo.password) {
      return String(state.session.userInfo.password);
    }
    if (state.session && state.session.password) {
      return String(state.session.password);
    }
    if (state.wizardValues && state.wizardValues.password) {
      return String(state.wizardValues.password);
    }
    return '';
  }

  function hasLoadedSearchCache(mode) {
    return !!(state.searchCache && Object.prototype.hasOwnProperty.call(state.searchCache, mode));
  }

  function hasPendingSearchLoads() {
    if (!state.searchLoadingModes) return false;
    for (var mode in state.searchLoadingModes) {
      if (Object.prototype.hasOwnProperty.call(state.searchLoadingModes, mode) && state.searchLoadingModes[mode]) {
        return true;
      }
    }
    return false;
  }

  function loadMissingSearchModes(onComplete) {
    var callback = typeof onComplete === 'function' ? onComplete : function () {};
    var modes = ['movies', 'series', 'live'];
    var missingModes = [];

    if (!state.searchCache) state.searchCache = {};
    if (!state.searchLoadingModes) state.searchLoadingModes = {};

    for (var i = 0; i < modes.length; i++) {
      if (!hasLoadedSearchCache(modes[i]) && !state.searchLoadingModes[modes[i]]) {
        missingModes.push(modes[i]);
      }
    }

    if (!missingModes.length) {
      callback([]);
      return false;
    }

    var password = getSessionPassword();
    if (!state.session || !state.session.portalBaseUrl || !state.session.username || !password) {
      for (var j = 0; j < missingModes.length; j++) {
        state.searchCache[missingModes[j]] = [];
      }
      callback(['credentials']);
      return false;
    }

    var pending = missingModes.length;
    var failedModes = [];

    function finalizeMode(mode, didFail, items) {
      state.searchLoadingModes[mode] = false;
      state.searchCache[mode] = didFail ? [] : (items || []);
      if (didFail) {
        failedModes.push(getContentTypeLabel(mode));
      }
      pending--;
      if (pending <= 0) {
        callback(failedModes);
      }
    }

    for (var k = 0; k < missingModes.length; k++) {
      (function (mode) {
        var config = getCatalogConfig(mode);
        state.searchLoadingModes[mode] = true;
        config.loadItems(state.session.portalBaseUrl, state.session.username, password, '', function (items) {
          finalizeMode(mode, false, items);
        }, function () {
          finalizeMode(mode, true, []);
        });
      })(missingModes[k]);
    }

    return true;
  }

  function filterSearchItems(items, query, mode) {
    var q = String(query || '').trim().toLowerCase();
    if (!q) return [];
    var terms = q.split(/\s+/).filter(Boolean);
    var results = [];
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var title = String(getCatalogItemName(item) || '').toLowerCase();
      var rawName = item && item.name ? String(item.name).toLowerCase() : '';
      var matches = true;
      for (var j = 0; j < terms.length; j++) {
        var term = terms[j];
        if (title.indexOf(term) === -1 && rawName.indexOf(term) === -1) {
          matches = false;
          break;
        }
      }
      if (matches) {
        results.push(item);
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
      var backdrop = '';
      if (typeof item.backdrop_path === 'string' && item.backdrop_path) {
        backdrop = item.backdrop_path;
      } else if (item.backdrop_path && item.backdrop_path.length) {
        backdrop = item.backdrop_path[0];
      }
      url = item.cover || backdrop || '';
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
    state.searchLoading = hasPendingSearchLoads();
    renderSearchResults();

    var startedLoading = loadMissingSearchModes(function (failedModes) {
      state.searchLoading = hasPendingSearchLoads();
      rebuildSearchRails();
      if (failedModes.length) {
        if (failedModes[0] === 'credentials') {
          setSearchSummary('Search could not load full results because session credentials are incomplete.');
        } else {
          setSearchSummary('Search loaded with partial results. Failed: ' + failedModes.join(', ') + '.');
        }
      }
      syncSearchFocusAfterRender();
    });

    state.searchLoading = startedLoading || hasPendingSearchLoads();

    if (!query) {
      renderSearchResults();
      syncSearchFocusAfterRender();
      return;
    }

    if (!state.searchLoading) {
      rebuildSearchRails();
      syncSearchFocusAfterRender();
    } else {
      renderSearchResults();
    }
  }

  function setSearchQueryValue(nextValue) {
    state.searchQuery = String(nextValue || '');
    updateSearchQueryDisplay();
    var scrollNode = document.getElementById('search-results-scroll');
    if (scrollNode) {
      scrollNode.scrollTop = 0;
    }
    if (!state.searchQuery.trim()) {
      executeSearch();
    }
  }

  function activateSearchKeyboardKey(row, col) {
    var rows = state.searchKeyboardRows.length ? state.searchKeyboardRows : getSearchKeyboardRows();
    var key = rows[row] && rows[row][col] ? rows[row][col] : null;
    var currentQuery = String(state.searchQuery || '');
    if (!key) return;

    if (key.action === 'char') {
      setSearchQueryValue(currentQuery + (key.value || key.label));
      return;
    }
    if (key.action === 'space') {
      setSearchQueryValue(currentQuery + ' ');
      return;
    }
    if (key.action === 'backspace') {
      setSearchQueryValue(currentQuery.slice(0, -1));
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
    if (key.action === 'search') {
      executeSearch();
      if (getSearchResultsCount() > 0) {
        var firstSection = findSearchRailInDirection(0, 1);
        if (firstSection >= 0) {
          focusSearchResult(firstSection, 0);
          return;
        }
      }
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
    setCatalogScreen('browse');
    showView('view-search');
    state.searchQuery = String(state.searchQuery || '');
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

  function clearCurrentProfileWatchHistory() {
    var portalCode = state.session && state.session.portalCode ? state.session.portalCode : 'default';
    var profileId = state.selectedProfile && state.selectedProfile.id ? state.selectedProfile.id : 'default';
    var remaining = [];

    for (var i = 0; i < state.watchHistory.length; i++) {
      var entry = state.watchHistory[i];
      if (!entry) continue;
      if (entry.portalCode === portalCode && entry.profileId === profileId) {
        continue;
      }
      remaining.push(entry);
    }

    state.watchHistory = remaining;
    saveWatchHistoryState();
  }

  function updateSettingsView() {
    renderSettingsTabs();
  }

  function openSettingsView() {
    setSidebarActiveById('sidebar-settings');
    showView('view-settings');
    state.focusedPanel = 'settings-tabs';
    state.focusedIndex = 0;
    state.settingsActiveTab = 'account';
    renderSettingsTabs();
    updateFocusUI();
  }

  function renderSettingsTabs() {
    var tabs = ['account', 'profiles', 'app', 'about'];
    for (var i = 0; i < tabs.length; i++) {
      var btn = document.getElementById('settings-tab-' + tabs[i]);
      var panel = document.getElementById('settings-panel-' + tabs[i]);
      if (btn && panel) {
        if (tabs[i] === state.settingsActiveTab) {
          btn.classList.add('active');
          panel.classList.add('active');
        } else {
          btn.classList.remove('active');
          panel.classList.remove('active');
        }
      }
    }

    var portalCode = state.session && state.session.portalCode ? state.session.portalCode : '-';
    var serverName = state.session && state.session.serverName ? state.session.serverName : '-';
    var username = state.session && state.session.username ? state.session.username : '-';

    var accountTitleEl = document.getElementById('settings-account-title');
    if (accountTitleEl) accountTitleEl.textContent = 'Signed in as ' + username;
    
    var accServerEl = document.getElementById('settings-account-server');
    if (accServerEl) accServerEl.textContent = serverName;
    
    var accPortalEl = document.getElementById('settings-account-portal');
    if (accPortalEl) accPortalEl.textContent = portalCode;

    var accLoginEl = document.getElementById('settings-account-logintime');
    if (accLoginEl) {
      var dateObj = new Date();
      accLoginEl.textContent = dateObj.toLocaleDateString() + ', ' + dateObj.toLocaleTimeString();
    }

    renderSettingsProfilesList();

    var appScopeEl = document.getElementById('settings-app-scope');
    if (appScopeEl) {
      var profileName = state.selectedProfile ? state.selectedProfile.name : 'primary';
      appScopeEl.textContent = portalCode.toUpperCase() + '::' + username + '::' + profileName;
    }

    var aboutProfileEl = document.getElementById('settings-about-profile');
    if (aboutProfileEl) {
      aboutProfileEl.textContent = state.selectedProfile ? state.selectedProfile.name : '-';
    }
  }

  function renderSettingsProfilesList() {
    var container = document.getElementById('settings-profiles-list');
    if (!container) return;
    container.innerHTML = '';

    if (!state.profiles || state.profiles.length === 0) {
      container.innerHTML = '<div style="color:rgba(255,255,255,0.4); padding:10px;">No profiles found</div>';
      return;
    }

    var avatarColors = ['color-red', 'color-blue', 'color-green', 'color-purple'];

    for (var i = 0; i < state.profiles.length; i++) {
      var profile = state.profiles[i];
      var isPrimary = (i === 0);
      var isActive  = state.selectedProfile && state.selectedProfile.id === profile.id;

      var card = document.createElement('div');
      card.className = 'focusable settings-profile-card' + (isActive ? ' active' : '');
      card.setAttribute('data-profile-id', profile.id);
      card.setAttribute('data-index', i);

      var avatar = document.createElement('div');
      var colorClass = avatarColors[i % avatarColors.length];
      avatar.className = 'profile-card-avatar ' + colorClass;
      var safeName = getSafeProfileName(profile, isPrimary ? 'Primary' : 'Profile');
      avatar.textContent = safeName.substring(0, 2).toUpperCase();
      card.appendChild(avatar);

      var details = document.createElement('div');
      details.className = 'profile-card-details';

      var nameEl = document.createElement('div');
      nameEl.className = 'profile-card-name';
      nameEl.textContent = safeName;
      details.appendChild(nameEl);

      var role = document.createElement('div');
      role.className = 'profile-card-role';
      role.textContent = isActive ? 'Active profile' : (isPrimary ? 'Primary profile' : (profile.isKids ? 'Kids profile' : 'Profile'));
      details.appendChild(role);

      card.appendChild(details);

      // Edit button on the right
      var editBtn = document.createElement('button');
      editBtn.className = 'focusable settings-profile-edit-btn';
      editBtn.textContent = 'Edit';
      editBtn.setAttribute('tabindex', '-1');
      card.appendChild(editBtn);

      // Clicking the card selects the profile
      (function (p, roleEl, profileIndex) {
        card.onclick = function (e) {
          if (e.target && e.target.classList.contains('settings-profile-edit-btn')) return;
          selectProfile(p);
          // Update active indicators
          var cards = container.querySelectorAll('.settings-profile-card');
          for (var ci = 0; ci < cards.length; ci++) {
            cards[ci].classList.remove('active');
            var r = cards[ci].querySelector('.profile-card-role');
            if (r && !r.textContent.includes('Active')) {
              var pid = cards[ci].getAttribute('data-profile-id');
              var idx = parseInt(cards[ci].getAttribute('data-index'), 10);
              r.textContent = idx === 0 ? 'Primary profile' : (state.profiles[idx] && state.profiles[idx].isKids ? 'Kids profile' : 'Profile');
            }
          }
          card.classList.add('active');
          roleEl.textContent = 'Active profile';
        };
        editBtn.onclick = function (e) {
          e.stopPropagation();
          state.profileModalCaller = 'settings';
          state.profileModal.openerFocusPanel = 'settings-profiles';
          state.profileModal.openerFocusIndex = profileIndex;
          state.profileModal.openerProfileId = p.id;
          openProfileFormModal(p);
        };
      })(profile, role, i);

      container.appendChild(card);
    }

    var addCard = document.createElement('div');
    addCard.className = 'focusable settings-profile-card card-add';
    addCard.textContent = '+ Add Profile';
    addCard.onclick = function () {
      state.profileModalCaller = 'settings';
      state.profileModal.openerFocusPanel = 'settings-profiles';
      state.profileModal.openerFocusIndex = state.profiles.length;
      state.profileModal.openerProfileId = null;
      openProfileFormModal(null);
    };
    container.appendChild(addCard);
  }

  // --- PROFILE FORM MODAL LOGIC ---

  function saveProfilesToStorage() {
    try {
      localStorage.setItem(PROFILES_KEY, JSON.stringify(state.profiles));
    } catch (e) {}
  }

  function blurProfileModalInputs() {
    var nameInput = document.getElementById('spm-name-input');
    if (nameInput && typeof nameInput.blur === 'function') {
      nameInput.blur();
    }
  }

  function getSafeProfileName(profile, fallbackLabel) {
    var rawName = profile ? String(profile.name || '') : '';
    rawName = rawName.replace(/null$/i, '').replace(/undefined$/i, '').trim();
    if (!rawName || rawName === 'null' || rawName === 'undefined') {
      return fallbackLabel || '';
    }
    return rawName;
  }

  function getProfilesScreenFocusIndex(profileId, fallbackIndex) {
    if (profileId) {
      for (var i = 0; i < state.profiles.length; i++) {
        if (state.profiles[i].id === profileId) {
          return i;
        }
      }
    }
    if (typeof fallbackIndex === 'number' && fallbackIndex >= 0) {
      return fallbackIndex;
    }
    return 0;
  }

  function getVisibleModalItems() {
    var modal = document.getElementById('settings-profile-modal');
    if (!modal) return [];
    var all = modal.querySelectorAll('.focusable');
    var visible = [];
    for (var i = 0; i < all.length; i++) {
      if (all[i].style.display !== 'none') {
        visible.push(all[i]);
      }
    }
    return visible;
  }

  function updateProfileModalFocus() {
    var modal = document.getElementById('settings-profile-modal');
    if (!modal) return;
    var items = getVisibleModalItems();
    // Clear all
    var all = modal.querySelectorAll('.focusable');
    for (var i = 0; i < all.length; i++) {
      all[i].classList.remove('is-focused');
    }
    // Apply to current visible item
    if (state.profileModal.focusIndex >= items.length) {
      state.profileModal.focusIndex = items.length - 1;
    }
    var target = items[state.profileModal.focusIndex];
    if (target) {
      target.classList.add('is-focused');
      // Only auto-focus buttons; let user press Enter to activate the input
      if (target.tagName !== 'INPUT') {
        target.focus();
      } else {
        blurProfileModalInputs();
      }
    }
  }

  function openProfileFormModal(profile) {
    var modal = document.getElementById('settings-profile-modal');
    if (!modal) return;
    var titleEl    = document.getElementById('spm-title');
    var nameInput  = document.getElementById('spm-name-input');
    var kidsBtn    = document.getElementById('spm-kids-btn');
    var deleteBtn  = document.getElementById('spm-delete-btn');

    blurProfileModalInputs();

    state.profileModal.mode       = profile ? 'edit' : 'add';
    state.profileModal.targetId   = profile ? profile.id : null;
    state.profileModal.isKids     = profile ? !!profile.isKids : false;
    state.profileModal.focusIndex = 0;
    state.profileModal.pinBuffer  = (profile && profile.pin) ? profile.pin : '';
    state.profileModal.keyboardOpen = false;
    state.profileModal.keyboardReturnFocusIndex = 0;

    // Sanitize name — guard against null, undefined, or the literal string "null"
    state.profileModal.nameBuffer = getSafeProfileName(profile, '');

    titleEl.textContent = profile ? 'Edit Profile' : 'Add Profile';
    nameInput.value     = state.profileModal.nameBuffer;

    kidsBtn.textContent = state.profileModal.isKids ? 'ON' : 'OFF';
    if (state.profileModal.isKids) {
      kidsBtn.classList.add('kids-on');
    } else {
      kidsBtn.classList.remove('kids-on');
    }

    var pinBtn = document.getElementById('spm-pin-btn');
    if (pinBtn) {
      pinBtn.textContent = state.profileModal.pinBuffer ? 'Change PIN' : 'Set PIN';
    }

    var canDelete = profile && profile.id !== 'primary';
    deleteBtn.style.display = canDelete ? '' : 'none';

    // Ensure keyboard overlay is always hidden when opening the form modal
    var overlay = document.getElementById('profile-name-keyboard-overlay');
    if (overlay) overlay.style.display = 'none';

    modal.style.display           = 'flex';
    state.focusedPanel             = 'settings-profile-modal';
    state.focusedIndex             = 0;
    state.profileModal.focusIndex  = 0;
    updateProfileModalFocus();
  }

  function closeProfileFormModal() {
    blurProfileModalInputs();
    var overlay = document.getElementById('profile-name-keyboard-overlay');
    if (overlay) overlay.style.display = 'none';
    state.profileModal.keyboardOpen = false;

    var modal = document.getElementById('settings-profile-modal');
    if (modal) modal.style.display = 'none';

    if (state.profileModalCaller === 'profiles') {
      setupProfilesView(
        getProfilesScreenFocusIndex(state.profileModal.openerProfileId, state.profileModal.openerFocusIndex),
        state.profileModal.openerFocusPanel || 'profiles'
      );
    } else {
      renderSettingsProfilesList();
      state.focusedPanel = 'settings-profiles';
      state.focusedIndex = getProfilesScreenFocusIndex(state.profileModal.openerProfileId, state.profileModal.openerFocusIndex);
      updateFocusUI();
    }
  }

  function saveProfileFromModal() {
    blurProfileModalInputs();
    var nameInput = document.getElementById('spm-name-input');
    var name = state.profileModal.nameBuffer.trim() || (nameInput ? nameInput.value.trim() : '');
    name = name.replace(/null$/i, '').replace(/undefined$/i, '').trim();
    if (!name || name === 'null' || name === 'undefined') return;
    var isKids     = state.profileModal.isKids;
    var avatarSeed = name.slice(0, 2).toUpperCase();

    if (state.profileModal.mode === 'add') {
      var newProfileId = 'p_' + Date.now();
      state.profiles.push({
        id: newProfileId,
        name: name,
        avatarSeed: avatarSeed,
        isKids: isKids,
        pin: state.profileModal.pinBuffer || ''
      });
      state.profileModal.openerProfileId = newProfileId;
      state.profileModal.openerFocusIndex = state.profiles.length - 1;
    } else {
      for (var j = 0; j < state.profiles.length; j++) {
        if (state.profiles[j].id === state.profileModal.targetId) {
          state.profiles[j].name      = name;
          state.profiles[j].avatarSeed = avatarSeed;
          state.profiles[j].isKids    = isKids;
          state.profiles[j].pin       = state.profileModal.pinBuffer || '';
          state.profileModal.openerProfileId = state.profiles[j].id;
          state.profileModal.openerFocusIndex = j;
          break;
        }
      }
    }

    saveProfilesToStorage();
    if (state.profileModalCaller === 'settings') {
        renderSettingsProfilesList();
    }
    closeProfileFormModal();
  }

  function deleteProfileFromModal() {
    if (!state.profileModal.targetId || state.profileModal.targetId === 'primary') return;
    var deletedIndex = getProfilesScreenFocusIndex(state.profileModal.targetId, state.profileModal.openerFocusIndex);
    state.profiles = state.profiles.filter(function (p) {
      return p.id !== state.profileModal.targetId;
    });
    state.profileModal.openerProfileId = null;
    state.profileModal.openerFocusIndex = Math.max(0, deletedIndex - 1);
    saveProfilesToStorage();
    if (state.profileModalCaller === 'settings') {
        renderSettingsProfilesList();
    }
    closeProfileFormModal();
  }

  // --- PROFILE NAME ON-SCREEN KEYBOARD ---

  function getProfileKeyboardRows(isShifted, kbMode) {
    var alphaRows = kbMode === 'symbols' ? KEYBOARD_SYMBOLS : KEYBOARD_ALPHA;
    return [
      alphaRows[0],
      alphaRows[1],
      alphaRows[2],
      alphaRows[3],
      ['Back', 'Space', '!#$', 'Done']
    ];
  }

  function getProfileKeyboardRowColFromIndex(index) {
    var idx = 0;
    for (var r = 0; r < profileKeyboardRows.length; r++) {
      for (var c = 0; c < profileKeyboardRows[r].length; c++) {
        if (idx === index) {
          return { row: r, col: c, rowLength: profileKeyboardRows[r].length };
        }
        idx++;
      }
    }
    return { row: 0, col: 0, rowLength: 1 };
  }

  function getProfileKeyboardIndexFromRowCol(row, col) {
    var idx = 0;
    for (var r = 0; r < profileKeyboardRows.length; r++) {
      if (r === row) return idx + col;
      idx += profileKeyboardRows[r].length;
    }
    return 0;
  }

  function renderProfileNameKeyboard() {
    profileKeyboardRows = getProfileKeyboardRows(
      state.profileModal.keyboardIsShifted,
      state.profileModal.keyboardMode
    );

    var preview = document.getElementById('pnk-preview');
    if (preview) preview.value = state.profileModal.nameBuffer || '';

    var container = document.getElementById('pnk-keyboard');
    if (!container) return;
    container.innerHTML = '';

    var flatIndex = 0;
    for (var r = 0; r < profileKeyboardRows.length; r++) {
      var rowEl = document.createElement('div');
      rowEl.className = 'keyboard-row';
      var rowData = profileKeyboardRows[r];
      for (var c = 0; c < rowData.length; c++) {
        var keyVal = rowData[c];
        var btnClass = 'key-btn focusable';
        if (keyVal === 'Shift') btnClass += ' key-shift';
        else if (keyVal === 'Space') btnClass += ' key-space';
        else if (keyVal === 'Backspace') btnClass += ' key-backspace';
        else if (keyVal === '!#$' || keyVal === 'ABC') btnClass += ' key-symbols';
        else if (keyVal === 'Back') btnClass += ' key-action-back';
        else if (keyVal === 'Done') btnClass += ' key-action-next';

        var keyBtn = document.createElement('div');
        keyBtn.className = btnClass;
        keyBtn.setAttribute('tabindex', '-1');
        keyBtn.setAttribute('data-index', flatIndex);
        keyBtn.setAttribute('data-key', keyVal);

        var displayVal = keyVal;
        if (state.profileModal.keyboardIsShifted && keyVal.length === 1 && keyVal >= 'a' && keyVal <= 'z') {
          displayVal = keyVal.toUpperCase();
        }
        if (keyVal === '!#$') displayVal = 'Sym';
        keyBtn.textContent = displayVal;

        (function(k) {
          keyBtn.onclick = function() { handleProfileNameKeyPress(k); };
        })(keyVal);

        rowEl.appendChild(keyBtn);
        flatIndex++;
      }
      container.appendChild(rowEl);
    }
  }

  function openProfileNameKeyboard() {
    blurProfileModalInputs();
    if (state.profileModal.keyboardOpen) return;

    // Use nameBuffer already set in state — never re-read from the input
    // which could contain stale browser-autocompleted or previously broken values
    state.profileModal.keyboardIsShifted = false;
    state.profileModal.keyboardMode = 'letters';
    state.profileModal.keyboardOpen = true;
    state.profileModal.keyboardReturnFocusIndex = state.profileModal.focusIndex;

    var overlay = document.getElementById('profile-name-keyboard-overlay');
    if (overlay) overlay.style.display = 'flex';

    renderProfileNameKeyboard();
    state.focusedPanel = 'profile-name-keyboard';
    state.focusedIndex = 0;
    updateFocusUI();
  }

  function closeProfileNameKeyboard(save) {
    blurProfileModalInputs();
    var overlay = document.getElementById('profile-name-keyboard-overlay');
    if (overlay) overlay.style.display = 'none';
    state.profileModal.keyboardOpen = false;

    if (save) {
      var nameInput = document.getElementById('spm-name-input');
      if (nameInput) nameInput.value = state.profileModal.nameBuffer.replace(/null$/i, '').replace(/undefined$/i, '').trim();
    }

    // Return focus to profile form modal.
    // Sync global focusedIndex so the keydown handler uses the same index
    // as the modal's own focus system — this is what was causing focus to die.
    state.focusedPanel = 'settings-profile-modal';
    state.profileModal.focusIndex = state.profileModal.keyboardReturnFocusIndex || 0;
    state.focusedIndex = state.profileModal.focusIndex;
    updateProfileModalFocus();
  }

  function handleProfileNameKeyPress(key) {
    var buf = state.profileModal.nameBuffer;

    if (key === 'Back') {
      closeProfileNameKeyboard(false);
    } else if (key === 'Done') {
      closeProfileNameKeyboard(true);
    } else if (key === 'Backspace') {
      if (buf.length > 0) {
        state.profileModal.nameBuffer = buf.slice(0, -1);
        renderProfileNameKeyboard();
      }
    } else if (key === 'Space') {
      state.profileModal.nameBuffer = buf + ' ';
      renderProfileNameKeyboard();
    } else if (key === 'Shift') {
      state.profileModal.keyboardIsShifted = !state.profileModal.keyboardIsShifted;
      renderProfileNameKeyboard();
      updateFocusUI();
    } else if (key === '!#$' || key === 'Symbols') {
      state.profileModal.keyboardMode = 'symbols';
      renderProfileNameKeyboard();
      updateFocusUI();
    } else if (key === 'ABC' || key === 'Letters') {
      state.profileModal.keyboardMode = 'letters';
      renderProfileNameKeyboard();
      updateFocusUI();
    } else {
      // Guard: key must be a non-null string to avoid 'buf + null' → "...null"
      if (key == null || typeof key !== 'string') return;
      var charToAdd = key;
      if (state.profileModal.keyboardIsShifted && key.length === 1 && key >= 'a' && key <= 'z') {
        charToAdd = key.toUpperCase();
      }
      if (buf.length < 24) {
        state.profileModal.nameBuffer = buf + charToAdd;
        renderProfileNameKeyboard();
      }
    }
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
    document.getElementById('home-panel').style.display = screen === 'home' ? 'flex' : 'none';
    document.getElementById('browse-panels').style.display = screen === 'browse' ? 'flex' : 'none';
  }

  function buildHomeEntry(mode, item, categoryName, meta, extras) {
    extras = extras || {};
    return {
      mode: mode,
      item: item,
      categoryName: categoryName || '',
      meta: meta || '',
      resumeEntry: extras.resumeEntry || null
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
    var resumeEntries = getCurrentProfileResumeEntries();
    var i;

    for (i = 0; i < resumeEntries.length && i < MAX_HOME_RAIL_ITEMS; i++) {
      var resumeEntry = resumeEntries[i];
      continueEntries.push(buildHomeEntry(
        resumeEntry.mode,
        buildResumeFallbackItem(resumeEntry),
        '',
        getResumeEntryMeta(resumeEntry),
        { resumeEntry: resumeEntry }
      ));
    }

    if (continueEntries.length) {
      sections.push({
        id: 'continue',
        title: 'Continue Watching',
        subtitle: 'Pick up where you left off.',
        entries: continueEntries
      });
    }

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

  function resumeHomeEntry(entry) {
    if (!entry || !entry.resumeEntry) return false;
    var resumeEntry = entry.resumeEntry;

    if (resumeEntry.mode === 'movies') {
      playMovie(entry.item || buildResumeFallbackItem(resumeEntry), null, resumeEntry);
      return true;
    }

    if (resumeEntry.mode === 'series') {
      if (resumeEntry.episodeItem) {
        playSeriesEpisode(
          resumeEntry.episodeItem,
          resumeEntry.name || getCatalogItemName(entry.item),
          entry.item || buildResumeFallbackItem(resumeEntry),
          resumeEntry
        );
        return true;
      }
      showContentDetail(entry.item || buildResumeFallbackItem(resumeEntry), 'series');
      return true;
    }

    return false;
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

  function homeHasEntries() {
    if (!state.homeSections || !state.homeSections.length) return false;
    for (var i = 0; i < state.homeSections.length; i++) {
      if (state.homeSections[i] && state.homeSections[i].entries && state.homeSections[i].entries.length) {
        return true;
      }
    }
    return false;
  }

  function isHomeHeroDetailsIntent() {
    var detailsBtn = document.getElementById('home-hero-btn-details');
    var activeEl = document.activeElement;

    return state.focusedPanel === 'home-hero' && (
      state.focusedIndex === 1 ||
      (detailsBtn && detailsBtn.classList.contains('focused')) ||
      activeEl === detailsBtn
    );
  }

  function playHomeHeroSeriesDirect(item, detailInfo) {
    if (!item || !state.session) return;

    var cacheKey = 'series_' + getCatalogItemId(item, 'series');

    function tryPlay(detail) {
      if (!detail) return false;
      var seasons = normalizeSeriesSeasons(detail);
      if (!seasons.length) return false;

      var episodes = getEpisodesForSeason(detail, seasons[0].key);
      if (!episodes.length) return false;

      playSeriesEpisode(episodes[0], getCatalogItemName(item), item);
      return true;
    }

    var resolvedDetail = detailInfo || homeHeroCache[cacheKey];
    if (tryPlay(resolvedDetail)) {
      return;
    }

    apiGetSeriesInfo(
      state.session.portalBaseUrl,
      state.session.username,
      state.session.userInfo.password,
      item.series_id,
      function (detail) {
        homeHeroCache[cacheKey] = detail;
        if (!tryPlay(detail)) {
          showContentDetail(item, 'series');
        }
      },
      function () {
        showContentDetail(item, 'series');
      }
    );
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
      if (state.homeLoading) {
        setHomeHeroText(overline, '');
        setHomeHeroText(typeBadge, '');
        setHomeHeroText(kicker, '');
        if (title) title.textContent = 'Loading content...';
        if (summary) summary.textContent = 'Please wait while your home content loads.';
        if (metaRow) metaRow.style.display = 'none';
        if (playBtn) playBtn.style.display = 'none';
        if (detailsBtn) detailsBtn.style.display = 'none';
        if (heroImage) {
          heroImage.style.backgroundImage = '';
          heroImage.style.opacity = '0';
        }
        return;
      }
      if (state.homeLoadError) {
        setHomeHeroText(overline, '');
        setHomeHeroText(typeBadge, '');
        setHomeHeroText(kicker, '');
        if (title) title.textContent = 'Unable to load content';
        if (summary) summary.textContent = state.homeLoadError;
        if (metaRow) metaRow.style.display = 'none';
        if (playBtn) playBtn.style.display = 'none';
        if (detailsBtn) detailsBtn.style.display = 'none';
        if (heroImage) {
          heroImage.style.backgroundImage = '';
          heroImage.style.opacity = '0';
        }
        return;
      }
      setHomeHeroText(overline, '');
      setHomeHeroText(typeBadge, '');
      setHomeHeroText(kicker, '');
      if (title) title.textContent = 'No Featured Content';
      if (summary) summary.textContent = 'Add some viewing history or load portal content to populate the home banner.';
      if (metaRow) metaRow.style.display = 'none';
      if (playBtn) playBtn.style.display = '';
      if (detailsBtn) detailsBtn.style.display = '';
      if (heroImage) {
        heroImage.style.backgroundImage = '';
        heroImage.style.opacity = '0';
      }
      return;
    }

    var typeLabel = getContentTypeLabel(entry.mode).toUpperCase();
    if (playBtn) playBtn.style.display = '';
    if (detailsBtn) detailsBtn.style.display = '';
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
        if (isHomeHeroDetailsIntent()) {
          showContentDetail(entry.item, entry.mode);
          return;
        }
        if (entry.mode === 'live') {
          playChannel(entry.item, [entry.item]);
        } else if (entry.mode === 'movies') {
          playMovie(entry.item, detailInfo);
        } else if (entry.mode === 'series') {
          playHomeHeroSeriesDirect(entry.item, detailInfo);
        }
      };
    }

    if (detailsBtn) {
      detailsBtn.onclick = function (e) {
        if (e) e.stopPropagation();
        showContentDetail(entry.item, entry.mode);
      };
    }

    var artwork = getLegacyArtworkUrl(getBackdropArtwork(entry.item, detailInfo, entry.mode));
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
    var homeScroll = getHomeVerticalScrollNode();
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
      heroEl.onclick = null;
    }
  }

  function renderHomeRails() {
    var container = document.getElementById('home-rails');
    var flatIndex = 0;
    container.innerHTML = '';

    if (state.homeLoading) {
      container.innerHTML = '<div class="home-empty">Loading content...</div>';
      return;
    }

    if (state.homeLoadError && !homeHasEntries()) {
      container.innerHTML = '<div class="home-empty">Unable to load content.</div>';
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
          artwork = getLegacyArtworkUrl(getBackdropArtwork(entry.item, null, entry.mode));
          cardClass = 'home-card home-card--landscape';
          imageClass = 'home-card__image';
        } else if (entry.mode === 'live') {
          artwork = getLegacyArtworkUrl(getCatalogItemArtwork(entry.item, entry.mode));
          cardClass = 'home-card home-card--live';
          imageClass = 'home-card__image home-card__image--contain';
        } else {
          artwork = getLegacyArtworkUrl(getCatalogItemArtwork(entry.item, entry.mode));
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
          if (selected.resumeEntry && resumeHomeEntry(selected)) {
            return;
          }
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
      done(false);
      return;
    }

    var config = getCatalogConfig(mode);
    config.loadCategories(state.session.portalBaseUrl, state.session.username, state.session.userInfo.password, function (cats) {
      var category = cats && cats.length ? cats[0] : null;
      if (!category) {
        state.homeCatalogCache[mode] = { categoryName: '', items: [] };
        done(false);
        return;
      }

      config.loadItems(state.session.portalBaseUrl, state.session.username, state.session.userInfo.password, category.category_id, function (items) {
        state.homeCatalogCache[mode] = {
          categoryName: category.category_name || '',
          items: (items || []).slice(0, MAX_HOME_RAIL_ITEMS)
        };
        done(false);
      }, function () {
        state.homeCatalogCache[mode] = { categoryName: category.category_name || '', items: [] };
        done(true);
      });
    }, function () {
      state.homeCatalogCache[mode] = { categoryName: '', items: [] };
      done(true);
    });
  }

  function loadHomeData(onComplete) {
    var remaining = 3;
    var hadError = false;
    state.homeLoading = true;
    state.homeLoadError = '';
    refreshHomeView();

    function finishOne(didFail) {
      if (didFail) {
        hadError = true;
      }
      remaining--;
      if (remaining <= 0) {
        state.homeLoading = false;
        refreshHomeView();
        state.homeLoadError = !homeHasEntries() && hadError ? 'Please check your network connection and try again.' : '';
        refreshHomeView();
        if (onComplete) onComplete();
      }
    }

    fetchHomeCatalogMode('live', finishOne);
    fetchHomeCatalogMode('movies', finishOne);
    fetchHomeCatalogMode('series', finishOne);
  }

  function openHomeView(forceReload) {
    if (!state.homeCatalogCache) {
      state.homeCatalogCache = { live: null, movies: null, series: null };
    }

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
        if (state.homeHeroEntry) {
          ensureHomeHeroPlayFocus();
        } else {
          state.focusedPanel = document.getElementById('home-rails').querySelectorAll('.focusable').length ? 'home-rails' : 'catalog-sidebar';
          state.focusedIndex = 0;
          updateFocusUI();
        }
      });
    } else {
      refreshHomeView();
    }

    if (state.homeHeroEntry) {
      ensureHomeHeroPlayFocus();
    } else {
      state.focusedPanel = document.getElementById('home-rails').querySelectorAll('.focusable').length ? 'home-rails' : 'catalog-sidebar';
      state.focusedIndex = 0;
      updateFocusUI();
    }
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
    state.currentViewId = viewId;
    var isCatalogSubView = (viewId === 'view-catalog' || viewId === 'view-search' || viewId === 'view-watchlist' || viewId === 'view-settings');
    var targetViewId = isCatalogSubView ? 'view-catalog' : viewId;

    var views = document.querySelectorAll('.view');
    for (var i = 0; i < views.length; i++) {
      views[i].classList.remove('active');
    }
    var activeView = document.getElementById(targetViewId);
    if (activeView) {
      activeView.classList.add('active');
    }

    if (isCatalogSubView) {
      var homePanel = document.getElementById('home-panel');
      var browsePanels = document.getElementById('browse-panels');
      var categoriesPanel = document.getElementById('categories-panel-list');
      var channelsPanel = document.querySelector('.channels-panel');
      var searchPanel = document.getElementById('search-content-panel');
      var watchlistPanel = document.getElementById('watchlist-content-panel');
      var settingsPanel = document.getElementById('settings-content-panel');

      if (homePanel) {
        homePanel.style.display = (viewId === 'view-catalog' && state.catalogScreen === 'home') ? 'block' : 'none';
      }
      if (browsePanels) {
        browsePanels.style.display = (viewId === 'view-catalog' && state.catalogScreen === 'home') ? 'none' : 'flex';
      }
      if (categoriesPanel) {
        categoriesPanel.style.display = (viewId === 'view-catalog') ? '' : 'none';
      }
      if (channelsPanel) {
        channelsPanel.style.display = (viewId === 'view-catalog') ? '' : 'none';
      }
      if (searchPanel) {
        searchPanel.style.display = (viewId === 'view-search') ? 'flex' : 'none';
      }
      if (watchlistPanel) {
        watchlistPanel.style.display = (viewId === 'view-watchlist') ? 'flex' : 'none';
      }
      if (settingsPanel) {
        settingsPanel.style.display = (viewId === 'view-settings') ? 'flex' : 'none';
      }
    }
  }

  // --- PREMIUM STEP-BY-STEP LOGIN WIZARD ---
  var WIZARD_STEPS = [
    {
      id: 'portal',
      eyebrow: 'STEP 01 - IDENTITY',
      title: 'Connect to your server',
      desc: 'Enter your unique Server Identity code to establish a secure handshake.',
      label: 'Server Identity',
      placeholder: 'e.g. SMARTIFLY-01'
    },
    {
      id: 'username',
      eyebrow: 'STEP 02 - ACCOUNT',
      title: 'Enter your username',
      desc: 'Use the Xtream username assigned to this subscription.',
      label: 'Username',
      placeholder: 'e.g. smartifly_user'
    },
    {
      id: 'password',
      eyebrow: 'STEP 03 - SECRET',
      title: 'Confirm your password',
      desc: 'Enter the account password, then continue to authenticate.',
      label: 'Password',
      placeholder: 'Enter password'
    }
  ];

  var KEYBOARD_ALPHA = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', '-'],
    ['Shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', '_', 'Backspace']
  ];

  var KEYBOARD_SYMBOLS = [
    ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')'],
    ['?', '/', '\\', ':', ';', '"', "'", '+', '=', '.'],
    [',', '[', ']', '{', '}', '|', '<', '>', '~', '-'],
    ['ABC', 'z', 'x', 'c', 'v', 'b', 'n', 'm', '_', 'Backspace']
  ];

  var QUICK_ROWS_CONFIG = {
    portal: [
      ['@gmail.com', '@yahoo.com', '@outlook.com'],
      ['!#$', '@', '.', '.com']
    ],
    username: [
      ['@gmail.com', '@yahoo.com', '@outlook.com'],
      ['!#$', '@', '.', '.com']
    ],
    password: [
      ['@gmail.com', '@yahoo.com', '@outlook.com'],
      ['!#$', '@', '.', '.com']
    ]
  };

  function getKeyboardRowsForStep(stepId, isShifted, keyboardMode) {
    var alphaRows = keyboardMode === 'symbols' ? KEYBOARD_SYMBOLS : KEYBOARD_ALPHA;
    var rows = [
      alphaRows[0],
      alphaRows[1],
      alphaRows[2],
      alphaRows[3]
    ];
    
    var quick = QUICK_ROWS_CONFIG[stepId] || [];
    for (var i = 0; i < quick.length; i++) {
      rows.push(quick[i]);
    }
    
    var nextLabel = (stepId === 'password') ? 'Connect' : 'Next';
    rows.push(['Back', 'Space', nextLabel]);
    
    return rows;
  }

  function renderLoginWizard() {
    var step = WIZARD_STEPS[state.wizardStepIndex];
    if (!step) return;

    // 1. Left pane texts
    document.getElementById('login-wizard-eyebrow').textContent = step.eyebrow;
    document.getElementById('login-wizard-title').textContent = step.title;
    document.getElementById('login-wizard-desc').textContent = step.desc;

    // 2. Right pane input preview
    var labelEl = document.getElementById('login-preview-label');
    var previewEl = document.getElementById('login-wizard-preview');
    if (labelEl && previewEl) {
      labelEl.textContent = step.label;
      previewEl.placeholder = step.placeholder;
      
      var val = state.wizardValues[step.id] || '';
      if (step.id === 'password') {
        previewEl.value = val.replace(/./g, '•');
      } else {
        previewEl.value = val;
      }
    }

    // 3. Embedded keyboard rendering
    var container = document.getElementById('login-wizard-keyboard');
    if (!container) return;
    container.innerHTML = '';

    var rows = getKeyboardRowsForStep(step.id, state.keyboardIsShifted, state.keyboardMode);
    var flatIndexCounter = 0;

    for (var r = 0; r < rows.length; r++) {
      var rowEl = document.createElement('div');
      rowEl.className = 'keyboard-row';
      
      var rowData = rows[r];
      for (var c = 0; c < rowData.length; c++) {
        var keyVal = rowData[c];
        var keyBtn = document.createElement('div');
        
        var btnClass = 'key-btn focusable';
        if (keyVal === 'Shift') btnClass += ' key-shift';
        else if (keyVal === 'Space') btnClass += ' key-space';
        else if (keyVal === 'Backspace') btnClass += ' key-backspace';
        else if (keyVal === 'ABC' || keyVal === 'Symbols' || keyVal === '!#$' || keyVal === 'Letters') btnClass += ' key-symbols';
        else if (keyVal.charAt(0) === '@' || keyVal === '.com' || keyVal === '.') btnClass += ' key-shortcut';
        else if (keyVal === 'Back') btnClass += ' key-action-back';
        else if (keyVal === 'Space') btnClass += ' key-action-space';
        else if (keyVal === 'Next' || keyVal === 'Connect') btnClass += ' key-action-next';
        
        keyBtn.className = btnClass;
        keyBtn.setAttribute('tabindex', '-1');
        keyBtn.setAttribute('data-index', flatIndexCounter);
        keyBtn.setAttribute('data-key', keyVal);
        
        var displayVal = keyVal;
        if (keyVal === '!#$') displayVal = 'Symbols';
        
        if (state.keyboardIsShifted && keyVal.length === 1 && keyVal >= 'a' && keyVal <= 'z') {
          displayVal = keyVal.toUpperCase();
        }
        keyBtn.textContent = displayVal;
        
        keyBtn.onclick = function() {
          handleWizardKeyPress(this.getAttribute('data-key'));
        };
        
        rowEl.appendChild(keyBtn);
        flatIndexCounter++;
      }
      container.appendChild(rowEl);
    }
  }

  function handleWizardKeyPress(key) {
    var step = WIZARD_STEPS[state.wizardStepIndex];
    if (!step) return;

    var currentVal = state.wizardValues[step.id] || '';

    if (key === 'Shift') {
      state.keyboardIsShifted = !state.keyboardIsShifted;
      renderLoginWizard();
      updateFocusUI();
    } else if (key === 'Symbols' || key === '!#$') {
      state.keyboardMode = 'symbols';
      renderLoginWizard();
      updateFocusUI();
    } else if (key === 'ABC' || key === 'Letters') {
      state.keyboardMode = 'letters';
      renderLoginWizard();
      updateFocusUI();
    } else if (key === 'Backspace') {
      if (currentVal.length > 0) {
        state.wizardValues[step.id] = currentVal.slice(0, -1);
        renderLoginWizard();
      }
    } else if (key === 'Space') {
      state.wizardValues[step.id] = currentVal + ' ';
      renderLoginWizard();
    } else if (key === 'Back') {
      if (state.wizardStepIndex > 0) {
        state.wizardStepIndex--;
        renderLoginWizard();
        updateFocusUI();
      } else {
        setupWelcomeView();
      }
    } else if (key === 'Next' || key === 'Connect') {
      var val = (state.wizardValues[step.id] || '').trim();
      if (!val) {
        document.getElementById('login-wizard-status').textContent = 'Field cannot be empty';
        return;
      }
      document.getElementById('login-wizard-status').textContent = '';

      if (state.wizardStepIndex === WIZARD_STEPS.length - 1) {
        executeLoginWizard();
      } else {
        state.wizardStepIndex++;
        renderLoginWizard();
        updateFocusUI();
      }
    } else {
      var charToAdd = key;
      if (state.keyboardIsShifted && key.length === 1 && key >= 'a' && key <= 'z') {
        charToAdd = key.toUpperCase();
      }
      state.wizardValues[step.id] = currentVal + charToAdd;
      
      if (step.id === 'portal') {
        state.wizardValues[step.id] = state.wizardValues[step.id].toUpperCase();
      }
      
      renderLoginWizard();
    }
  }

  function getWizardRowColFromIndex(index) {
    var step = WIZARD_STEPS[state.wizardStepIndex];
    var rows = getKeyboardRowsForStep(step.id, state.keyboardIsShifted, state.keyboardMode);
    
    var idx = 0;
    for (var r = 0; r < rows.length; r++) {
      var rowData = rows[r];
      if (index >= idx && index < idx + rowData.length) {
        return { row: r, col: index - idx, rowLength: rowData.length };
      }
      idx += rowData.length;
    }
    return { row: 0, col: 0, rowLength: 10 };
  }

  function getWizardIndexFromRowCol(row, col) {
    var step = WIZARD_STEPS[state.wizardStepIndex];
    var rows = getKeyboardRowsForStep(step.id, state.keyboardIsShifted, state.keyboardMode);
    
    if (row < 0) row = 0;
    if (row >= rows.length) row = rows.length - 1;
    
    var rowData = rows[row];
    if (col < 0) col = 0;
    if (col >= rowData.length) col = rowData.length - 1;
    
    var idx = 0;
    for (var r = 0; r < row; r++) {
      idx += rows[r].length;
    }
    return idx + col;
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
        var parsed = JSON.parse(savedProfiles);
        // Sanitize profile names — strip "null"/"undefined" that got stored previously
        if (Array.isArray(parsed)) {
          for (var pi = 0; pi < parsed.length; pi++) {
            var pName = String(parsed[pi].name || '').trim();
            // Fix exact bad values AND names that end with the word "null"/"undefined"
            if (!pName || pName === 'null' || pName === 'undefined' || /null$|undefined$/i.test(pName)) {
              parsed[pi].name = parsed[pi].id === 'kids' ? 'Kids' : 'Primary';
            }
            if (!parsed[pi].avatarSeed || parsed[pi].avatarSeed === 'nu' || parsed[pi].avatarSeed === 'nu' || /null|undefined/i.test(parsed[pi].avatarSeed)) {
              parsed[pi].avatarSeed = parsed[pi].name.slice(0, 2).toUpperCase();
            }
          }
        }
        state.profiles = parsed;
      }
    } catch (e) {
      console.error('Failed to load local storage state:', e);
    }

    loadFavoritesState();
    loadWatchHistoryState();
    loadResumeState();
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

    if (!window.__legacyResumeBeforeUnloadBound) {
      window.__legacyResumeBeforeUnloadBound = true;
      window.addEventListener('beforeunload', function () {
        persistCurrentPlaybackProgress(true, false);
      });
    }
    
    // Bind profile modal events
    var spmNameInput = document.getElementById('spm-name-input');
    if (spmNameInput) {
      spmNameInput.onfocus = function () {
        if (state.focusedPanel !== 'profile-name-keyboard') {
          blurProfileModalInputs();
        }
      };
      spmNameInput.onclick = function (event) {
        if (event && typeof event.preventDefault === 'function') {
          event.preventDefault();
        }
        blurProfileModalInputs();
        if (state.focusedPanel === 'settings-profile-modal' && !state.profileModal.keyboardOpen) {
          openProfileNameKeyboard();
        }
        return false;
      };
    }
    var spmKidsBtn = document.getElementById('spm-kids-btn');
    if (spmKidsBtn) {
      spmKidsBtn.onclick = function () {
        state.profileModal.isKids = !state.profileModal.isKids;
        spmKidsBtn.textContent = state.profileModal.isKids ? 'ON' : 'OFF';
        if (state.profileModal.isKids) {
          spmKidsBtn.classList.add('kids-on');
        } else {
          spmKidsBtn.classList.remove('kids-on');
        }
        // Keep indexes in sync but do NOT call updateProfileModalFocus / .focus() here —
        // re-focusing the button while the Enter event is still propagating on TV browsers
        // triggers a second click, immediately toggling the value back.
        state.focusedIndex = state.profileModal.focusIndex;
      };
    }
    var spmSaveBtn = document.getElementById('spm-save-btn');
    if (spmSaveBtn) {
      spmSaveBtn.onclick = function () {
        saveProfileFromModal();
      };
    }
    var spmPinBtn = document.getElementById('spm-pin-btn');
    if (spmPinBtn) {
      spmPinBtn.onclick = function () {
        openProfilePinKeyboard();
      };
    }
    var spmCancelBtn = document.getElementById('spm-cancel-btn');
    if (spmCancelBtn) {
      spmCancelBtn.onclick = function () {
        closeProfileFormModal();
      };
    }
    var spmDeleteBtn = document.getElementById('spm-delete-btn');
    if (spmDeleteBtn) {
      spmDeleteBtn.onclick = function () {
        deleteProfileFromModal();
      };
    }
    
    // Scroll lock to prevent cut-off of Hero when focused
    var homeScroll = getHomeVerticalScrollNode();
    if (homeScroll) {
      homeScroll.addEventListener('scroll', function () {
        logHomeDebug('listener:home-scroll:legacy-lock', {
          panel: state.focusedPanel,
          scrollTop: homeScroll.scrollTop
        });
        if (state.focusedPanel === 'home-hero' && homeScroll.scrollTop !== 0) {
          logHomeDebug('listener:home-scroll:legacy-lock-reset', {
            panel: state.focusedPanel,
            from: homeScroll.scrollTop,
            to: 0
          });
          homeScroll.scrollTop = 0;
        }
      });
    }
    
    // --- BUTTON CLICK BINDINGS (safe, DOM is guaranteed ready here) ---
    (function bindButtons() {
      function bind(id, fn) {
        var el = document.getElementById(id);
        if (el) el.onclick = fn;
      }
      bind('welcome-btn-signin',            function () { setupLoginView(); });
      bind('welcome-btn-create',            function () { setupActivationView(); });
      bind('activation-btn-cancel',         function () { cleanupActivation(); setupWelcomeView(); });
      bind('player-btn-toggle',             function () { togglePlayerPlayback(); });
      bind('player-btn-seek-backward',      function () { seekPlayerBy(-10); });
      bind('player-btn-seek-forward',       function () { seekPlayerBy(10); });
      bind('player-btn-back',               function () { closePlayer(); });
      bind('player-btn-settings',           function () { openPlayerSettings(); });
      bind('sidebar-home',                  function () { openHomeView(); });
      bind('sidebar-live',                  function () { loadCatalog('live'); });
      bind('sidebar-movies',                function () { loadCatalog('movies'); });
      bind('sidebar-series',                function () { loadCatalog('series'); });
      bind('sidebar-search',                function () { openSearchView(); });
      bind('sidebar-watchlist',             function () { openWatchlistView(); });
      bind('sidebar-settings',              function () { openSettingsView(); });
      bind('search-query-display',          function () { focusSearchKeyboard(0, 0); });
      bind('search-btn-back',               function () { returnToCatalogSidebar('search'); });
      bind('watchlist-filter-all',          function () { setWatchlistFilter('all'); });
      bind('watchlist-filter-movies',       function () { setWatchlistFilter('movies'); });
      bind('watchlist-filter-series',       function () { setWatchlistFilter('series'); });
      bind('detail-btn-play',               function () { playDetailPrimary(); });
      bind('detail-btn-favorite',           function () {
        if (!state.detailItem) return;
        toggleFavoriteItem(state.detailMode, state.detailItem);
        updateDetailFavoriteButton();
      });
      bind('detail-btn-back',               function () { closeContentDetail(); });
      bind('settings-btn-logout-new',       function () { logoutUser(); });
      bind('settings-btn-reload',           function () { window.location.reload(); });
      bind('settings-btn-clear-watchlist-new', function () {
        clearCurrentProfileFavorites();
        renderWatchlist();
        updateSettingsView();
        updateFocusUI();
        alert('Watchlist cleared!');
      });
      bind('settings-btn-clear-history',    function () {
        clearCurrentProfileWatchHistory();
        refreshHomeView();
        updateSettingsView();
        updateFocusUI();
      });
      bind('settings-btn-reset', function () {
        try {
          localStorage.removeItem(SESSION_KEY);
          localStorage.removeItem(PROFILES_KEY);
          localStorage.removeItem(SELECTED_PROFILE_KEY);
        } catch (e) {}
        window.location.reload();
      });
      bind('settings-btn-buildinfo', function () {
        alert('LG BUILD: Smartifly TV Legacy\nVERSION: v0.1.0\nSTATUS: Connected\nENGINE: LG webOS shell (Chrome 38 Compatibility Mode)');
      });

      var settingsTabs = ['account', 'profiles', 'app', 'about'];
      var viewPlayerNode = document.getElementById('view-player');
      if (viewPlayerNode) {
        viewPlayerNode.onmousemove = function () {
          if (state.focusedPanel === 'player') {
            showPlayerOverlay(true);
          }
        };
      }
      for (var ti = 0; ti < settingsTabs.length; ti++) {
        (function (tabName, index) {
          var btn = document.getElementById('settings-tab-' + tabName);
          if (btn) {
            btn.onclick = function () {
              state.focusedPanel = 'settings-tabs';
              state.focusedIndex = index;
              state.settingsActiveTab = tabName;
              renderSettingsTabs();
              updateFocusUI();
            };
          }
        })(settingsTabs[ti], ti);
      }
    })();

    // Guard static layout containers against unwanted browser-triggered auto-scrolls on focus
    window.addEventListener('scroll', function () {
      if (window.pageXOffset !== 0 || window.pageYOffset !== 0) {
        window.scrollTo(0, 0);
      }
    });

    var preventElementScroll = function (idOrEl) {
      var el = typeof idOrEl === 'string' ? document.getElementById(idOrEl) : idOrEl;
      if (el) {
        el.addEventListener('scroll', function () {
          if (el.scrollTop !== 0 || el.scrollLeft !== 0) {
            el.scrollTop = 0;
            el.scrollLeft = 0;
          }
        });
      }
    };
    preventElementScroll('view-catalog');
    preventElementScroll(document.querySelector('.catalog-container'));

    // Prevent home scroll from scrolling when home-hero is active
    var homeScrollNode = getHomeVerticalScrollNode();
    if (homeScrollNode) {
      homeScrollNode.addEventListener('scroll', function () {
        logHomeDebug('listener:home-scroll:init-lock', {
          panel: state.focusedPanel,
          scrollTop: homeScrollNode.scrollTop
        });
        if (state.focusedPanel === 'home-hero' && homeScrollNode.scrollTop !== 0) {
          logHomeDebug('listener:home-scroll:init-lock-reset', {
            panel: state.focusedPanel,
            from: homeScrollNode.scrollTop,
            to: 0
          });
          homeScrollNode.scrollTop = 0;
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
    state.focusedPanel = 'login-wizard';
    state.focusedIndex = 10; // Default focus to letter 'q' (index 10)
    state.wizardStepIndex = 0;
    
    // Autofill last portal code if available
    var lastPortal = localStorage.getItem(PORTAL_KEY);
    state.wizardValues = {
      portal: lastPortal || '',
      username: '',
      password: ''
    };
    
    state.keyboardIsShifted = false;
    state.keyboardMode = 'letters';

    var statusNode = document.getElementById('login-wizard-status');
    if (statusNode) {
      statusNode.textContent = '';
    }
    
    showView('view-login');
    renderLoginWizard();
    updateFocusUI();
  }

  function executeLoginWizard() {
    if (state.loginPending) {
      return;
    }

    var code = state.wizardValues.portal;
    var user = state.wizardValues.username;
    var pass = state.wizardValues.password;
    var statusNode = document.getElementById('login-wizard-status');

    if (!code || !user || !pass) {
      if (statusNode) {
        statusNode.textContent = 'All fields are required';
        statusNode.style.color = '#ff3344';
      }
      return;
    }

    state.loginRequestId = (state.loginRequestId || 0) + 1;
    var requestId = state.loginRequestId;

    setLoginPending(true);
    if (statusNode) {
      statusNode.textContent = 'Validating server identity...';
      statusNode.style.color = '#ffffff';
    }

    apiValidatePortalCode(code, function (portal) {
      if (requestId !== state.loginRequestId) {
        return;
      }

      if (statusNode) {
        statusNode.textContent = 'Connecting to ' + (portal.name || portal.portalCode || 'portal') + '...';
        statusNode.style.color = '#ffffff';
      }

      apiAuthenticate(portal.baseUrl, user, pass, function (authRes) {
        if (requestId !== state.loginRequestId) {
          return;
        }

        var session = {
          portalCode: portal.portalCode,
          portalBaseUrl: portal.baseUrl,
          serverName: portal.name,
          username: user,
          userInfo: authRes.user_info,
          serverInfo: authRes.server_info,
          authenticatedAt: new Date().toISOString()
        };

        // Create default profiles if missing
        var profiles = [
          { id: 'primary', name: user, avatarSeed: user.slice(0, 2).toUpperCase() },
          { id: 'kids', name: 'Kids', avatarSeed: 'KD', isKids: true }
        ];

        state.session = session;
        state.profiles = profiles;
        saveSessionState(session, profiles);
        setLoginPending(false);
        
        setupProfilesView();
      }, function (err) {
        if (requestId !== state.loginRequestId) {
          return;
        }
        setLoginPending(false);
        if (statusNode) {
          statusNode.textContent = err || 'Xtream login failed.';
          statusNode.style.color = '#ff3344';
        }
      });
    }, function (err) {
      if (requestId !== state.loginRequestId) {
        return;
      }
      setLoginPending(false);
      if (statusNode) {
        statusNode.textContent = err || 'Portal validation failed.';
        statusNode.style.color = '#ff3344';
      }
    });
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

        // Create default profiles — use values.user (not bare 'user' which is out of scope)
        var primaryName = (values.user && String(values.user).trim()) ? String(values.user).trim() : 'Primary';
        var profiles = [
          { id: 'primary', name: primaryName, avatarSeed: primaryName.slice(0, 2).toUpperCase() },
          { id: 'kids', name: 'Kids', avatarSeed: 'KD', isKids: true }
        ];

        state.session = session;
        state.profiles = profiles;
        saveSessionState(session, profiles);
        
        setupProfilesView();
      }, function (err) {
        setLoginStatus(err || 'Xtream login failed.', 'error');
      });
    }, function (err) {
      setLoginStatus(err || 'Server validation failed.', 'error');
    });
  }

  // --- ACTIVATION CONTROLLER ---
  function setupActivationView() {
    state.focusedPanel = 'activation';
    state.focusedIndex = 0;

    // Stop any previous timers
    cleanupActivation();

    // Retrieve or generate Device ID
    var DEVICE_ID_KEY = 'smartifly-lg-device-id';
    var deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      var chars = '0123456789ABCDEF';
      var suffix = '';
      for (var i = 0; i < 8; i++) {
        suffix += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      deviceId = 'SF-LG-' + suffix;
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    state.activationDeviceId = deviceId;

    // Render placeholders
    document.getElementById('activation-device-id').textContent = deviceId;
    document.getElementById('activation-code').textContent = '------';
    document.getElementById('activation-link').textContent = 'Generating activation link...';

    var dotNode = document.getElementById('activation-status-dot');
    var badgeNode = document.getElementById('activation-status-badge');
    var titleNode = document.getElementById('activation-status-title');
    var descNode = document.getElementById('activation-status-desc');

    if (dotNode) dotNode.className = 'status-dot';
    if (dotNode) dotNode.style.backgroundColor = '#e50914';
    if (badgeNode) {
      badgeNode.textContent = 'AWAITING BINDING';
      badgeNode.style.color = '#ff8088';
    }
    if (titleNode) titleNode.textContent = 'Preparing LG activation...';
    if (descNode) descNode.textContent = 'Activation pending';

    var qrPlaceholder = document.getElementById('activation-qr-placeholder');
    var qrImg = document.getElementById('activation-qr-img');
    if (qrPlaceholder) qrPlaceholder.style.display = 'block';
    if (qrImg) qrImg.style.display = 'none';

    showView('view-activation');
    updateFocusUI();

    var mac = buildActivationMac(deviceId);

    apiRegisterDevice(deviceId, mac, function() {
      apiFetchActivationSession(deviceId, mac, function(session) {
        if (state.focusedPanel !== 'activation') return;

        // Show code and link
        if (document.getElementById('activation-code')) {
          document.getElementById('activation-code').textContent = session.settingsCode || '--------';
        }
        if (document.getElementById('activation-link')) {
          document.getElementById('activation-link').textContent = session.webLink || '';
        }

        // Show QR
        if (session.qrCode && qrImg && qrPlaceholder) {
          qrImg.src = String(session.qrCode || '').replace(/^http:\/\//i, 'https://');
          qrImg.style.display = 'block';
          qrPlaceholder.style.display = 'none';
        }

        if (titleNode) titleNode.textContent = 'Waiting for account binding...';

        // Start polling
        state.activationTimer = setTimeout(function() {
          pollActivation(deviceId, mac);
        }, 5000);

      }, function(err) {
        showActivationError(err);
      });
    }, function(err) {
      showActivationError(err);
    });
  }

  function pollActivation(deviceId, mac) {
    if (state.focusedPanel !== 'activation') return;

    apiCheckDeviceActivation(deviceId, mac, function(res) {
      var normalized = (res.statusCode || res.state || '').toUpperCase();
      
      if (document.getElementById('activation-status-desc')) {
        document.getElementById('activation-status-desc').textContent = res.reason || 'Activation pending';
      }

      if (normalized === 'ACTIVE' || normalized === 'ACTIVATED') {
        if (res.license) {
          if (document.getElementById('activation-status-title')) {
            document.getElementById('activation-status-title').textContent = 'Activation approved. Syncing account...';
          }
          var dotNode = document.getElementById('activation-status-dot');
          var badgeNode = document.getElementById('activation-status-badge');
          
          if (dotNode) dotNode.style.backgroundColor = '#2de067'; // green dot
          if (badgeNode) {
            badgeNode.textContent = 'ACTIVATED';
            badgeNode.style.color = '#2de067';
          }

          completeLegacyDeviceActivation(res.license, deviceId);
        } else {
          showActivationError('Handoff error: activation approved but no license details.');
        }
        return;
      }

      if (normalized === 'BLOCKED' || normalized === 'BLACKLISTED' || normalized === 'DISABLED') {
        showActivationError(res.reason || 'This device has been blocked.');
        return;
      }

      if (normalized === 'EXPIRED') {
        showActivationError(res.reason || 'Activation session expired.');
        return;
      }

      // Continue polling
      state.activationTimer = setTimeout(function() {
        pollActivation(deviceId, mac);
      }, 5000);

    }, function(err) {
      showActivationError(err);
    });
  }

  function completeLegacyDeviceActivation(license, deviceId) {
    var serverUrl = license.server && license.server.url && license.server.url.trim();
    var serverName = (license.server && license.server.name && license.server.name.trim()) || 'Smartifly Server';
    var username = license.xtreamUser && license.xtreamUser.trim();
    var password = license.xtreamPass && license.xtreamPass.trim();

    if (!serverUrl || !username || !password) {
      showActivationError('Missing server credentials in license.');
      return;
    }

    apiAuthenticate(serverUrl, username, password, function(authRes) {
      var portalCode = serverName.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'LG-ACTIVATED';
      var session = {
        portalCode: portalCode,
        portalBaseUrl: serverUrl,
        serverName: serverName,
        username: username,
        userInfo: authRes.user_info,
        serverInfo: authRes.server_info,
        authenticatedAt: new Date().toISOString()
      };

      var profiles = [
        { id: 'primary', name: username, avatarSeed: username.slice(0, 2).toUpperCase() },
        { id: 'kids', name: 'Kids', avatarSeed: 'KD', isKids: true }
      ];

      state.session = session;
      state.profiles = profiles;
      saveSessionState(session, profiles);

      setupProfilesView();
    }, function(err) {
      showActivationError('Xtream login failed: ' + err);
    });
  }

  function showActivationError(message) {
    var dotNode = document.getElementById('activation-status-dot');
    var badgeNode = document.getElementById('activation-status-badge');
    var titleNode = document.getElementById('activation-status-title');
    var descNode = document.getElementById('activation-status-desc');

    if (titleNode) titleNode.textContent = 'Activation Attention';
    if (descNode) descNode.textContent = message;
    if (dotNode) dotNode.style.backgroundColor = '#ff5f6d'; // red/pink error
    if (badgeNode) {
      badgeNode.textContent = 'ACTIVATION ATTENTION';
      badgeNode.style.color = '#ffb0b6';
    }

    cleanupActivation();
  }

  function cleanupActivation() {
    if (state.activationTimer) {
      clearTimeout(state.activationTimer);
      state.activationTimer = null;
    }
  }

  // --- PROFILES CONTROLLER ---
  function setProfilesStatus(message) {
    var statusNode = document.getElementById('profiles-screen-status');
    if (statusNode) {
      statusNode.textContent = message || '';
    }
  }

  function setupProfilesView(focusIndex, focusPanel) {
    state.focusedPanel = focusPanel || 'profiles';
    state.focusedIndex = typeof focusIndex === 'number' ? focusIndex : 0;

    var container = document.getElementById('profiles-list-container');
    container.innerHTML = '';

    // Render one slot per profile (card + edit button)
    for (var i = 0; i < state.profiles.length; i++) {
      var profile = state.profiles[i];

      var slot = document.createElement('div');
      slot.className = 'profile-slot';

      // --- Select card ---
      var card = document.createElement('div');
      card.className = 'profile-card focusable';
      card.setAttribute('tabindex', '-1');
      card.setAttribute('data-id', profile.id);
      card.setAttribute('data-index', i);

      var avatar = document.createElement('div');
      avatar.className = 'profile-avatar' + (profile.isKids ? ' kids' : '');
      var safeAvatarSeed = (profile.avatarSeed && profile.avatarSeed !== 'null')
        ? profile.avatarSeed
        : (profile.name && profile.name !== 'null' ? profile.name.slice(0, 2).toUpperCase() : 'P?');
      avatar.textContent = safeAvatarSeed;

      var name = document.createElement('div');
      name.className = 'profile-name';
      var safeProfileName = getSafeProfileName(profile, profile.isKids ? 'Kids' : 'Primary');
      name.textContent = safeProfileName;

      card.appendChild(avatar);
      card.appendChild(name);

      // Lock icon for PIN-protected profiles
      if (profile.pin) {
        var lockIcon = document.createElement('div');
        lockIcon.className = 'profile-lock-icon';
        lockIcon.textContent = '\uD83D\uDD12'; // 🔒
        card.appendChild(lockIcon);
      }

      (function (p) {
        card.onclick = function () { selectProfile(p); };
      })(profile);

      slot.appendChild(card);

      // --- Edit button ---
      var editBtn = document.createElement('div');
      editBtn.className = 'profile-edit-btn focusable';
      editBtn.setAttribute('tabindex', '-1');
      editBtn.setAttribute('data-index', i);
      editBtn.textContent = '\u270E Edit';

      (function (p, profileIndex) {
        editBtn.onclick = function () {
          state.profileModalCaller = 'profiles';
          state.profileModal.openerFocusPanel = 'profiles-edit';
          state.profileModal.openerFocusIndex = profileIndex;
          state.profileModal.openerProfileId = p.id;
          openProfileFormModal(p);
        };
      })(profile, i);

      slot.appendChild(editBtn);
      container.appendChild(slot);
    }

    // --- + Add Profile card ---
    var addSlot = document.createElement('div');
    addSlot.className = 'profile-slot';

    var addCard = document.createElement('div');
    addCard.className = 'profile-card focusable card-add';
    addCard.setAttribute('tabindex', '-1');
    addCard.setAttribute('data-index', state.profiles.length);
    addCard.textContent = '+ Add Profile';
    addCard.onclick = function () {
      state.profileModalCaller = 'profiles';
      state.profileModal.openerFocusPanel = 'profiles';
      state.profileModal.openerFocusIndex = state.profiles.length;
      state.profileModal.openerProfileId = null;
      openProfileFormModal(null);
    };

    addSlot.appendChild(addCard);
    container.appendChild(addSlot);

    var profileItems = container.querySelectorAll(state.focusedPanel === 'profiles-edit' ? '.profile-edit-btn.focusable' : '.profile-card.focusable');
    if (profileItems.length === 0) {
      state.focusedPanel = 'profiles';
      state.focusedIndex = 0;
    } else if (state.focusedIndex >= profileItems.length) {
      state.focusedIndex = profileItems.length - 1;
    }

    showView('view-profiles');
    updateFocusUI();
  }



  function selectProfile(profile) {
    if (profile && profile.pin) {
      openPinEntry(profile);
    } else {
      state.selectedProfile = profile;
      saveSelectedProfile(profile);
      openHomeView(true);
    }
  }

  // --- PIN ENTRY SYSTEM ---
  var pinEntryRows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['Back', '0', 'Done']
  ];

  function openPinEntry(profile) {
    state.pinEntry = { profile: profile, buffer: '' };
    var overlay = document.getElementById('pin-entry-overlay');
    if (overlay) overlay.style.display = 'flex';
    var errorEl = document.getElementById('pin-entry-error');
    if (errorEl) { errorEl.textContent = ''; errorEl.style.display = 'none'; }
    renderPinKeyboard();
    state.focusedPanel = 'pin-entry-keyboard';
    state.focusedIndex = 0;
    updateFocusUI();
  }

  function closePinEntry() {
    state.pinEntry = null;
    var overlay = document.getElementById('pin-entry-overlay');
    if (overlay) overlay.style.display = 'none';
    // Return to profile selection
    state.focusedPanel = 'profiles';
    state.focusedIndex = 0;
    updateFocusUI();
  }

  function renderPinKeyboard() {
    updatePinDots();
    var container = document.getElementById('pin-keyboard');
    if (!container) return;
    container.innerHTML = '';
    var flatIndex = 0;
    for (var r = 0; r < pinEntryRows.length; r++) {
      var rowEl = document.createElement('div');
      rowEl.className = 'pin-key-row';
      var rowData = pinEntryRows[r];
      for (var c = 0; c < rowData.length; c++) {
        var keyVal = rowData[c];
        var btn = document.createElement('div');
        btn.className = 'pin-key focusable';
        if (keyVal === 'Back') btn.className += ' pin-key--back';
        if (keyVal === 'Done') btn.className += ' pin-key--done';
        btn.setAttribute('tabindex', '-1');
        btn.setAttribute('data-key', keyVal);
        btn.setAttribute('data-index', flatIndex);
        btn.textContent = keyVal;
        (function (k) {
          btn.onclick = function () { handlePinKeyPress(k); };
        })(keyVal);
        rowEl.appendChild(btn);
        flatIndex++;
      }
      container.appendChild(rowEl);
    }
  }

  function updatePinDots() {
    var buf = (state.pinEntry && state.pinEntry.buffer) ? state.pinEntry.buffer : '';
    for (var i = 1; i <= 4; i++) {
      var dot = document.getElementById('pin-dot-' + i);
      if (dot) {
        dot.classList.toggle('filled', i <= buf.length);
      }
    }
  }

  function handlePinKeyPress(key) {
    if (!state.pinEntry) return;
    if (key === 'Back') {
      closePinEntry();
      return;
    }
    if (key === 'Done') {
      var entered = state.pinEntry.buffer;
      var expected = state.pinEntry.profile.pin;
      if (entered === expected) {
        var profile = state.pinEntry.profile;
        state.pinEntry = null;
        var overlay = document.getElementById('pin-entry-overlay');
        if (overlay) overlay.style.display = 'none';
        state.selectedProfile = profile;
        saveSelectedProfile(profile);
        openHomeView(true);
      } else {
        var errorEl = document.getElementById('pin-entry-error');
        if (errorEl) { errorEl.textContent = 'Incorrect PIN. Try again.'; errorEl.style.display = 'block'; }
        state.pinEntry.buffer = '';
        updatePinDots();
        state.focusedIndex = 0;
        updateFocusUI();
      }
      return;
    }
    if (key === 'Backspace') {
      if (state.pinEntry.buffer.length > 0) {
        state.pinEntry.buffer = state.pinEntry.buffer.slice(0, -1);
        updatePinDots();
      }
      return;
    }
    // digit key
    if (state.pinEntry.buffer.length < 4) {
      state.pinEntry.buffer += key;
      updatePinDots();
      // Auto-submit when 4 digits entered
      if (state.pinEntry.buffer.length === 4) {
        handlePinKeyPress('Done');
      }
    }
  }

  // PIN numpad row/col helpers (3-column grid)
  function getPinKeyRowColFromIndex(index) {
    var r = Math.floor(index / 3);
    var c = index % 3;
    return { row: r, col: c };
  }

  function getPinKeyIndexFromRowCol(row, col) {
    return row * 3 + col;
  }

  // --- PIN NUMPAD in profile modal (Set/Change PIN) ---
  function openProfilePinKeyboard() {
    // Save the current PIN so we can restore it if the user cancels,
    // then clear the buffer so they always start entering a fresh PIN.
    state.profileModal._pinBeforeEdit = state.profileModal.pinBuffer || '';
    state.profileModal.pinBuffer = '';

    // Update overlay title: "Change PIN" if profile already has one, "Set PIN" otherwise
    var titleEl = document.getElementById('ppk-title');
    if (titleEl) {
      titleEl.textContent = state.profileModal._pinBeforeEdit ? 'Change Profile PIN' : 'Set Profile PIN';
    }
    var subEl = document.getElementById('ppk-subtitle');
    if (subEl) {
      subEl.textContent = state.profileModal._pinBeforeEdit
        ? 'Enter a new 4-digit PIN'
        : 'Enter a 4-digit PIN for this profile';
    }

    var overlay = document.getElementById('profile-pin-keyboard-overlay');
    if (overlay) overlay.style.display = 'flex';
    renderProfilePinKeyboard();
    state.focusedPanel = 'profile-pin-keyboard';
    state.focusedIndex = 0;
    updateFocusUI();
  }

  function closeProfilePinKeyboard(save) {
    var overlay = document.getElementById('profile-pin-keyboard-overlay');
    if (overlay) overlay.style.display = 'none';
    if (!save) {
      // User cancelled — restore the PIN that was set before opening
      state.profileModal.pinBuffer = state.profileModal._pinBeforeEdit || '';
    }
    state.profileModal._pinBeforeEdit = '';
    // Update the button label to reflect the current pinBuffer
    var pinBtn = document.getElementById('spm-pin-btn');
    if (pinBtn) {
      pinBtn.textContent = state.profileModal.pinBuffer ? 'Change PIN' : 'Set PIN';
    }
    state.focusedPanel = 'settings-profile-modal';
    state.profileModal.focusIndex = 0;
    state.focusedIndex = 0;
    updateProfileModalFocus();
  }

  function renderProfilePinKeyboard() {
    updateProfilePinDots();
    var container = document.getElementById('ppk-keyboard');
    if (!container) return;
    container.innerHTML = '';
    var rows = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['Back', '0', 'Done']
    ];
    var flatIndex = 0;
    for (var r = 0; r < rows.length; r++) {
      var rowEl = document.createElement('div');
      rowEl.className = 'pin-key-row';
      for (var c = 0; c < rows[r].length; c++) {
        var keyVal = rows[r][c];
        var btn = document.createElement('div');
        btn.className = 'pin-key focusable';
        if (keyVal === 'Back') btn.className += ' pin-key--back';
        if (keyVal === 'Done') btn.className += ' pin-key--done';
        btn.setAttribute('tabindex', '-1');
        btn.setAttribute('data-key', keyVal);
        btn.setAttribute('data-index', flatIndex);
        btn.textContent = keyVal;
        (function (k) {
          btn.onclick = function () { handleProfilePinKeyPress(k); };
        })(keyVal);
        rowEl.appendChild(btn);
        flatIndex++;
      }
      container.appendChild(rowEl);
    }
  }

  function updateProfilePinDots() {
    var buf = state.profileModal.pinBuffer || '';
    for (var i = 1; i <= 4; i++) {
      var dot = document.getElementById('ppk-dot-' + i);
      if (dot) dot.classList.toggle('filled', i <= buf.length);
    }
    // Update the PIN button label in the modal
    var pinBtn = document.getElementById('spm-pin-btn');
    if (pinBtn) {
      pinBtn.textContent = buf ? 'Change PIN' : 'Set PIN';
    }
  }

  function handleProfilePinKeyPress(key) {
    if (key === 'Back') {
      closeProfilePinKeyboard(false);
      return;
    }
    if (key === 'Done') {
      closeProfilePinKeyboard(true);
      return;
    }
    if (key === 'Backspace') {
      if (state.profileModal.pinBuffer.length > 0) {
        state.profileModal.pinBuffer = state.profileModal.pinBuffer.slice(0, -1);
        renderProfilePinKeyboard();
      }
      return;
    }
    // digit
    if (state.profileModal.pinBuffer.length < 4) {
      state.profileModal.pinBuffer += key;
      renderProfilePinKeyboard();
    }
  }

  // --- CATALOG CONTROLLER ---
  function loadCatalog(mode) {
    if (mode) {
      state.catalogMode = mode;
    }

    setCatalogScreen('browse');
    var config = getCatalogConfig();
    showView('view-catalog');
    state.focusedPanel = 'catalog-sidebar';
    state.focusedIndex = getSidebarFocusIndex(state.catalogMode);
    state.categories = [];
    state.channels = [];
    state.selectedCategoryId = '';
    state.selectedCategoryName = '';
    state.channelsBatchSize = CATALOG_BATCH_SIZE;
    // Clear cache for this mode when switching to it fresh
    state.channelsCache = {};
    state.channelsCacheCount = {};
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

      // Show count badge if we have a cached count for this category
      var cacheKey = state.catalogMode + ':' + cat.category_id;
      var cachedCount = state.channelsCacheCount[cacheKey];
      if (cachedCount != null) {
        item.innerHTML = escapeHtml(cat.category_name) +
          ' <span class="category-count">' + cachedCount + '</span>';
      } else {
        item.textContent = cat.category_name;
      }

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
    state.channelsBatchSize = CATALOG_BATCH_SIZE; // reset batch on category change

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

    var cacheKey = state.catalogMode + ':' + categoryId;
    var grid = document.getElementById('channels-grid-list');

    // Serve from cache if available
    if (state.channelsCache[cacheKey]) {
      state.channels = state.channelsCache[cacheKey];
      renderChannels();
      updateFocusUI();
      return;
    }

    grid.innerHTML = '<div style="color:rgba(255,255,255,0.4); padding: 20px;">' + config.loadingItemsText + '</div>';

    config.loadItems(state.session.portalBaseUrl, state.session.username, state.session.userInfo.password, categoryId, function (streams) {
      state.channels = streams;
      // Store in cache and record count
      state.channelsCache[cacheKey] = streams;
      state.channelsCacheCount[cacheKey] = streams.length;
      // Update category label in sidebar to show count
      updateCategoryCountLabel(categoryId, streams.length);
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

  // Update the count badge on a single category item in the sidebar without re-rendering all categories
  function updateCategoryCountLabel(categoryId, count) {
    var item = document.querySelector('.category-item[data-id="' + categoryId + '"]');
    if (!item) return;
    var name = '';
    for (var i = 0; i < state.categories.length; i++) {
      if (state.categories[i].category_id === categoryId) {
        name = state.categories[i].category_name;
        break;
      }
    }
    item.innerHTML = escapeHtml(name) + ' <span class="category-count">' + count + '</span>';
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
      if (epgTimer) { clearTimeout(epgTimer); }
      fetchEPGForChannel(firstCh);
    } else {
      renderCatalogDetails(firstCh);
    }

    // Only render up to the current batch size — keeps DOM small on legacy hardware
    var renderCount = Math.min(state.channelsBatchSize, state.channels.length);
    for (var i = 0; i < renderCount; i++) {
      container.appendChild(buildChannelCard(state.channels[i], i));
    }
  }

  // Append the next batch of cards to the existing grid without clearing it
  function appendChannelBatch() {
    var container = document.getElementById('channels-grid-list');
    if (!container) return;
    var prevCount = state.channelsBatchSize;
    state.channelsBatchSize = Math.min(state.channelsBatchSize + CATALOG_BATCH_SIZE, state.channels.length);
    for (var i = prevCount; i < state.channelsBatchSize; i++) {
      container.appendChild(buildChannelCard(state.channels[i], i));
    }
  }

  // Build a single channel/movie/series card DOM element
  function buildChannelCard(ch, i) {
    var config = getCatalogConfig();
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

    var liveBadge = document.createElement('div');
    liveBadge.className = 'channel-live-badge';
    liveBadge.textContent = config.badgeLabel;
    card.appendChild(liveBadge);

    var logoWrap = document.createElement('div');
    logoWrap.className = 'channel-logo-container';

    if (getCatalogItemArtwork(ch)) {
      var img = document.createElement('img');
      img.src = getLegacyArtworkUrl(getCatalogItemArtwork(ch));
      img.onerror = function () {
        this.style.display = 'none';
        this.parentNode.textContent = this.parentNode.parentNode.getAttribute('data-name');
      };
      logoWrap.appendChild(img);
    } else {
      logoWrap.textContent = ch.name;
    }

    card.appendChild(logoWrap);

    card.onclick = function () {
      var idx = parseInt(this.getAttribute('data-index'), 10);
      if (state.catalogMode === 'live') {
        playChannel(state.channels[idx]);
      } else {
        showContentDetail(state.channels[idx], state.catalogMode);
      }
    };

    return card;
  }

  // --- PLAYER CONTROLLER ---
  function cleanupHls() {
    cleanupPlayerSubtitleTracks();
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
        setPlayerHeadline('Playback Error');
        setPlayerMeta('Stream format unsupported');
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
      setPlayerHeadline('Playback Error');
      setPlayerMeta('Stream format unsupported');
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

  function formatPlayerTime(totalSeconds) {
    var value = Math.max(0, Math.floor(Number(totalSeconds) || 0));
    var hours = Math.floor(value / 3600);
    var minutes = Math.floor((value % 3600) / 60);
    var seconds = value % 60;

    if (hours > 0) {
      return (hours < 10 ? '0' : '') + hours + ':' + (minutes < 10 ? '0' : '') + minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
    }

    return (minutes < 10 ? '0' : '') + minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
  }

  function setPlayerStatusLabel(message) {
    var node = document.getElementById('player-status-label');
    if (node) {
      node.textContent = message || 'Buffering Stream...';
    }
  }

  function setPlayerHeadline(title) {
    var liveNode = document.getElementById('player-channel-name');
    var vodNode = document.getElementById('player-vod-title');
    if (liveNode) liveNode.textContent = title || 'Loading Stream...';
    if (vodNode) vodNode.textContent = title || 'Loading Title...';
    state.playerUiTitle = title || '';
  }

  function setPlayerSubtitle(text) {
    var node = document.getElementById('player-vod-subtitle');
    if (node) {
      node.textContent = text || '';
      node.style.display = text ? 'block' : 'none';
    }
    state.playerUiSubtitle = text || '';
  }

  function setPlayerMeta(text) {
    var liveNode = document.getElementById('player-live-meta');
    var vodNode = document.getElementById('player-vod-meta');
    if (liveNode) liveNode.textContent = text || '';
    if (vodNode) vodNode.textContent = text || '';
    state.playerUiMeta = text || '';
  }

  function setPlayerTopMeta(text) {
    var node = document.getElementById('player-top-meta');
    if (node) {
      node.textContent = text || '';
      node.style.display = text ? 'block' : 'none';
    }
    state.playerUiTopMeta = text || '';
  }

  function updateSubtitleLabel(text) {
    var label = text || 'Off';
    setPlayerStatusLabel('Subtitles: ' + label);
  }

  function inferLegacySubtitleFormat(url, explicitFormat) {
    var normalizedFormat = safeTrim(explicitFormat).toLowerCase();
    if (normalizedFormat === 'vtt' || normalizedFormat === 'webvtt') return 'vtt';
    if (normalizedFormat === 'srt') return 'srt';

    var cleanUrl = safeTrim(url).split('?')[0].toLowerCase();
    if (cleanUrl.slice(-4) === '.vtt') return 'vtt';
    if (cleanUrl.slice(-4) === '.srt') return 'srt';
    return 'unknown';
  }

  function toAbsoluteLegacySubtitleUrl(baseUrl, rawUrl) {
    var trimmed = safeTrim(rawUrl);
    if (!trimmed) return '';
    if (/^(data|blob):/i.test(trimmed) || /^https?:\/\//i.test(trimmed)) return trimmed;

    try {
      return new URL(trimmed, normalizeBaseUrl(baseUrl) + '/').toString();
    } catch (e) {
      return trimmed;
    }
  }

  function readLegacySubtitleCollection(value) {
    if (!value) return [];
    if (Object.prototype.toString.call(value) === '[object Array]') return value;

    if (typeof value === 'string') {
      var trimmed = value.trim();
      if (!trimmed) return [];
      if (
        (trimmed.charAt(0) === '[' && trimmed.charAt(trimmed.length - 1) === ']') ||
        (trimmed.charAt(0) === '{' && trimmed.charAt(trimmed.length - 1) === '}')
      ) {
        try {
          return readLegacySubtitleCollection(JSON.parse(trimmed));
        } catch (e) {
          return [trimmed];
        }
      }
      return [trimmed];
    }

    if (typeof value === 'object') {
      var keys = Object.keys(value);
      var list = [];
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var entry = value[key];
        if (entry && typeof entry === 'object' && Object.prototype.toString.call(entry) !== '[object Array]') {
          entry.id = entry.id || key;
          list.push(entry);
        } else {
          list.push({ id: key, url: entry });
        }
      }
      return list;
    }

    return [];
  }

  function normalizeLegacySubtitleTracks(baseUrl, payload, fallback) {
    var root = payload && typeof payload === 'object' ? payload : {};
    var info = root.info && typeof root.info === 'object' ? root.info : {};
    var movieData = root.movie_data && typeof root.movie_data === 'object' ? root.movie_data : {};
    var sources = []
      .concat(readLegacySubtitleCollection(root.subtitles))
      .concat(readLegacySubtitleCollection(root.subtitle))
      .concat(readLegacySubtitleCollection(root.subtitle_tracks))
      .concat(readLegacySubtitleCollection(root.subtitleTracks))
      .concat(readLegacySubtitleCollection(info.subtitles))
      .concat(readLegacySubtitleCollection(info.subtitle))
      .concat(readLegacySubtitleCollection(info.subtitle_tracks))
      .concat(readLegacySubtitleCollection(info.subtitleTracks))
      .concat(readLegacySubtitleCollection(movieData.subtitles))
      .concat(readLegacySubtitleCollection(movieData.subtitle))
      .concat(readLegacySubtitleCollection(movieData.subtitle_tracks))
      .concat(readLegacySubtitleCollection(movieData.subtitleTracks));

    var normalized = [];
    var seen = {};

    for (var i = 0; i < sources.length; i++) {
      var item = sources[i];
      var track = null;

      if (typeof item === 'string') {
        var stringUrl = toAbsoluteLegacySubtitleUrl(baseUrl, item);
        if (!stringUrl) continue;
        track = {
          id: 'subtitle-' + i,
          label: 'Subtitle ' + (i + 1),
          language: '',
          url: stringUrl,
          format: inferLegacySubtitleFormat(stringUrl, '')
        };
      } else if (item && typeof item === 'object') {
        var url = toAbsoluteLegacySubtitleUrl(
          baseUrl,
          safeTrim(item.url) ||
            safeTrim(item.file) ||
            safeTrim(item.path) ||
            safeTrim(item.src) ||
            safeTrim(item.location) ||
            safeTrim(item.download)
        );
        if (!url) continue;
        var language =
          safeTrim(item.lang) ||
          safeTrim(item.language) ||
          safeTrim(item.code) ||
          safeTrim(item.iso) ||
          '';
        track = {
          id: safeTrim(item.id) || 'subtitle-' + i,
          label: safeTrim(item.label) || safeTrim(item.title) || safeTrim(item.name) || language.toUpperCase() || 'Subtitle ' + (i + 1),
          language: language,
          url: url,
          format: inferLegacySubtitleFormat(url, safeTrim(item.format) || safeTrim(item.ext) || safeTrim(item.type))
        };
      }

      if (!track) continue;

      var dedupeKey = track.url + '::' + track.language + '::' + track.label;
      if (seen[dedupeKey]) continue;
      seen[dedupeKey] = true;
      normalized.push(track);
    }

    return normalized.length ? normalized : (fallback || []);
  }

  function convertLegacySrtToVtt(text) {
    var body = safeTrim(text).replace(/\r+/g, '');
    if (!body) return 'WEBVTT\n\n';

    return 'WEBVTT\n\n' + body.replace(
      /(\d{2}:\d{2}:\d{2}[,.]\d{1,3}|\d{1,2}:\d{2}[,.]\d{1,3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{1,3}|\d{1,2}:\d{2}[,.]\d{1,3})/g,
      function (_, start, end) {
        return start.replace(/,/g, '.').replace(/^(\d{2}:\d{2}[.]\d{1,3})$/, '00:$1') + ' --> ' +
          end.replace(/,/g, '.').replace(/^(\d{2}:\d{2}[.]\d{1,3})$/, '00:$1');
      }
    ) + '\n';
  }

  function cleanupPlayerSubtitleTracks() {
    playerSubtitleLoadToken++;
    var video = document.getElementById('player-video');
    if (video) {
      var nodes = video.querySelectorAll('track[data-smartifly-external-subtitle="true"]');
      for (var i = 0; i < nodes.length; i++) {
        nodes[i].parentNode && nodes[i].parentNode.removeChild(nodes[i]);
      }
    }

    if (state.playerSubtitleObjectUrls && state.playerSubtitleObjectUrls.length) {
      for (var j = 0; j < state.playerSubtitleObjectUrls.length; j++) {
        try {
          URL.revokeObjectURL(state.playerSubtitleObjectUrls[j]);
        } catch (e) {}
      }
    }

    state.playerSubtitleObjectUrls = [];
    state.playerSubtitleTracks = [];
    state.playerSubtitleIndex = -1;
  }

  function appendLegacySubtitleTrackNode(video, track, resolvedUrl) {
    if (!video || !track || !resolvedUrl) return;
    var node = document.createElement('track');
    node.kind = 'subtitles';
    node.label = track.label || 'Subtitle';
    node.srclang = track.language || '';
    node.src = resolvedUrl;
    node.default = false;
    node.setAttribute('data-smartifly-external-subtitle', 'true');
    video.appendChild(node);
  }

  function fetchLegacySubtitleText(url, onSuccess, onError) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.timeout = 15000;
    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        onSuccess(xhr.responseText || '');
      } else {
        onError('HTTP ' + xhr.status);
      }
    };
    xhr.onerror = function () { onError('Network error'); };
    xhr.ontimeout = function () { onError('Timeout'); };
    xhr.send();
  }

  function preparePlayerSubtitles(video, subtitleTracks) {
    cleanupPlayerSubtitleTracks();
    if (!video || !subtitleTracks || !subtitleTracks.length) {
      return;
    }

    state.playerSubtitleTracks = subtitleTracks.slice();
    var loadToken = playerSubtitleLoadToken;

    for (var i = 0; i < subtitleTracks.length; i++) {
      (function (track) {
        if (track.format === 'srt') {
          fetchLegacySubtitleText(track.url, function (text) {
            if (loadToken !== playerSubtitleLoadToken) return;
            try {
              var blobUrl = URL.createObjectURL(new Blob([convertLegacySrtToVtt(text)], { type: 'text/vtt' }));
              state.playerSubtitleObjectUrls.push(blobUrl);
              appendLegacySubtitleTrackNode(video, track, blobUrl);
            } catch (e) {
              console.warn('[Legacy Player] Failed to build subtitle blob', e);
            }
          }, function (reason) {
            console.warn('[Legacy Player] Failed to load subtitle track', { url: track.url, reason: reason });
          });
          return;
        }

        appendLegacySubtitleTrackNode(video, track, track.url);
      })(subtitleTracks[i]);
    }
  }

  function applyPlayerSubtitleTrack(index) {
    var video = document.getElementById('player-video');
    if (!video || !video.textTracks) {
      updateSubtitleLabel('Off');
      return;
    }

    var tracks = video.textTracks;
    if (!tracks.length) {
      state.playerSubtitleIndex = -1;
      setPlayerStatusLabel('No subtitles available');
      document.getElementById('player-status-container').style.display = 'flex';
      return;
    }

    if (index < 0 || index >= tracks.length) {
      for (var i = 0; i < tracks.length; i++) {
        tracks[i].mode = 'disabled';
      }
      state.playerSubtitleIndex = -1;
      updateSubtitleLabel('Off');
      document.getElementById('player-status-container').style.display = 'flex';
      return;
    }

    for (var j = 0; j < tracks.length; j++) {
      tracks[j].mode = j === index ? 'showing' : 'disabled';
    }

    state.playerSubtitleIndex = index;
    var label = tracks[index].label || tracks[index].language || ('Track ' + (index + 1));
    updateSubtitleLabel(label);
    document.getElementById('player-status-container').style.display = 'flex';
  }

  function cyclePlayerSubtitles() {
    var video = document.getElementById('player-video');
    if (!video || !video.textTracks || !video.textTracks.length) {
      setPlayerStatusLabel('No subtitles available');
      document.getElementById('player-status-container').style.display = 'flex';
      return;
    }

    var nextIndex = state.playerSubtitleIndex + 1;
    if (nextIndex >= video.textTracks.length) {
      nextIndex = -1;
    }

    applyPlayerSubtitleTrack(nextIndex);
  }

  function resetPlayerProgressUi() {
    var currentNode = document.getElementById('player-current-time');
    var durationNode = document.getElementById('player-duration-time');
    var fillNode = document.getElementById('player-progress-fill');
    if (currentNode) currentNode.textContent = '00:00';
    if (durationNode) durationNode.textContent = '00:00';
    if (fillNode) fillNode.style.width = '0%';
  }

  function updatePlayerProgressUi() {
    if (state.playerMode !== 'vod') {
      resetPlayerProgressUi();
      return;
    }

    if (!isPlayerOverlayVisible) return;

    var video = document.getElementById('player-video');
    if (!video) return;

    var duration = Number(video.duration);
    var current = Number(video.currentTime);
    var currentNode = document.getElementById('player-current-time');
    var durationNode = document.getElementById('player-duration-time');
    var fillNode = document.getElementById('player-progress-fill');

    if (currentNode) currentNode.textContent = formatPlayerTime(current);
    if (durationNode) durationNode.textContent = isFinite(duration) && duration > 0 ? formatPlayerTime(duration) : '00:00';
    if (fillNode) {
      var percent = isFinite(duration) && duration > 0 ? Math.max(0, Math.min(100, (current / duration) * 100)) : 0;
      fillNode.style.width = percent + '%';
    }
  }

  function showPlayerOverlay(resetTimer) {
    var overlayNode = document.getElementById('player-overlay');
    if (overlayNode) {
      overlayNode.classList.remove('player-overlay--hidden');
    }
    isPlayerOverlayVisible = true;
    updatePlayerProgressUi();

    if (playerOverlayTimer) {
      clearTimeout(playerOverlayTimer);
      playerOverlayTimer = null;
    }

    if (resetTimer) {
      playerOverlayTimer = setTimeout(function () {
        hidePlayerOverlay();
      }, 5000); // 5s auto-hide
    }
  }

  function hidePlayerOverlay() {
    var overlayNode = document.getElementById('player-overlay');
    if (overlayNode) {
      overlayNode.classList.add('player-overlay--hidden');
    }
    isPlayerOverlayVisible = false;

    if (playerOverlayTimer) {
      clearTimeout(playerOverlayTimer);
      playerOverlayTimer = null;
    }
  }

  function updatePlayerClock() {
    var clockNode = document.getElementById('player-clock');
    if (!clockNode) return;
    var d = new Date();
    var hours = d.getHours();
    var minutes = d.getMinutes();
    var ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    var minStr = minutes < 10 ? '0' + minutes : minutes;
    var hourStr = hours < 10 ? '0' + hours : hours;
    clockNode.textContent = hourStr + ':' + minStr + ' ' + ampm;
  }

  function fetchPlayerEpg(channel) {
    var nowNode = document.getElementById('player-epg-now-title');
    var timeNode = document.getElementById('player-epg-now-time');
    var fillNode = document.getElementById('player-epg-progress-fill');
    var nextNode = document.getElementById('player-epg-next-title');

    if (!nowNode || !nextNode) return;

    nowNode.textContent = 'Live Broadcast';
    timeNode.textContent = '';
    fillNode.style.width = '0%';
    nextNode.textContent = 'Schedule unavailable';

    if (!state.session || !channel) return;

    apiGetShortEpg(state.session.portalBaseUrl, state.session.username, state.session.userInfo.password, channel.stream_id, function (listings) {
      if (!listings || listings.length === 0) return;

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

      if (currentProgram) {
        var currentTitle = decodeXtreamBase64(currentProgram.title) || 'Live Broadcast';
        var startVal = parseInt(currentProgram.start_timestamp || 0, 10) * 1000;
        var stopVal = parseInt(currentProgram.stop_timestamp || 0, 10) * 1000;

        nowNode.textContent = currentTitle;

        if (startVal && stopVal) {
          timeNode.textContent = formatTime(startVal) + ' - ' + formatTime(stopVal);
          var duration = stopVal - startVal;
          if (duration > 0) {
            var progressPercent = Math.min(100, Math.max(0, ((nowMs - startVal) / duration) * 100));
            fillNode.style.width = Math.round(progressPercent) + '%';
          }
        }
      }

      if (nextProgram) {
        var nextTitle = decodeXtreamBase64(nextProgram.title) || 'Next Program';
        var nextStart = parseInt(nextProgram.start_timestamp || 0, 10) * 1000;
        if (nextStart) {
          nextNode.textContent = nextTitle + ' (' + formatTime(nextStart) + ')';
        } else {
          nextNode.textContent = nextTitle;
        }
      }
    }, function (err) {
      console.log('[Legacy Player] EPG fetch failed:', err);
    });
  }

  function setPlayerHint(text) {
    return text;
  }

  function updatePlayerActionButtons() {
    var toggleButton = document.getElementById('player-btn-toggle');
    var seekBackButton = document.getElementById('player-btn-seek-backward');
    var seekForwardButton = document.getElementById('player-btn-seek-forward');
    var trailerEmbed = document.getElementById('player-trailer-embed');
    var video = document.getElementById('player-video');
    var isEmbedVisible = !!(trailerEmbed && trailerEmbed.style.display === 'block');
    var isVodMode = state.playerMode === 'vod';

    if (seekBackButton) {
      seekBackButton.style.display = isVodMode ? 'inline-flex' : 'none';
      seekBackButton.disabled = isEmbedVisible;
    }

    if (seekForwardButton) {
      seekForwardButton.style.display = isVodMode ? 'inline-flex' : 'none';
      seekForwardButton.disabled = isEmbedVisible;
    }

    if (isEmbedVisible) {
      toggleButton.innerHTML = PLAY_SVG;
      toggleButton.disabled = true;
      return;
    }

    toggleButton.disabled = false;
    toggleButton.innerHTML = video && !video.paused ? PAUSE_SVG : PLAY_SVG;
  }

  function setPlayerMode(mode, contentType) {
    var viewNode = document.getElementById('view-player');
    var overlayNode = document.getElementById('player-overlay');
    var kickerNode = document.getElementById('player-kicker');

    state.playerMode = mode === 'live' ? 'live' : 'vod';

    if (viewNode) {
      viewNode.classList.remove('player-view--live', 'player-view--vod');
      viewNode.classList.add(state.playerMode === 'live' ? 'player-view--live' : 'player-view--vod');
    }

    if (overlayNode) {
      overlayNode.classList.remove('player-overlay--live', 'player-overlay--vod');
      overlayNode.classList.add(state.playerMode === 'live' ? 'player-overlay--live' : 'player-overlay--vod');
    }

    if (kickerNode) {
      if (contentType) {
        kickerNode.textContent = contentType;
      } else {
        kickerNode.textContent = state.playerMode === 'live' ? 'LIVE TV' : 'PLAYBACK';
      }
    }

    setPlayerHint(state.playerMode === 'live'
      ? 'Use ↑/↓ to switch channels • Back to exit'
      : 'OK play/pause • ←/→ seek • Back to exit');

    if (state.playerMode !== 'vod') {
      resetPlayerProgressUi();
    }

    updatePlayerActionButtons();
  }

  function configurePlayerUi(mode, title, subtitle, meta, topMeta, contentType) {
    setPlayerMode(mode, contentType);
    setPlayerHeadline(title);
    setPlayerSubtitle(subtitle || '');
    setPlayerMeta(meta || '');
    setPlayerTopMeta(topMeta || '');
    updatePlayerProgressUi();

    // Set default remote focus to Play/Pause button
    state.focusedPanel = 'player';
    state.focusedIndex = mode === 'live' ? 1 : 2;
    updateFocusUI();

    // Reset/start clock ticker
    updatePlayerClock();
    if (playerClockTimer) {
      clearInterval(playerClockTimer);
    }
    playerClockTimer = setInterval(updatePlayerClock, 10000);

    // Wake up the overlay
    showPlayerOverlay(true);

    // Fetch EPG for live TV
    if (mode === 'live' && state.activeChannel) {
      fetchPlayerEpg(state.activeChannel);
    }
  }

  function bindPlayerUiEvents(video) {
    if (!video || video.__legacyPlayerUiBound) return;
    video.__legacyPlayerUiBound = true;

    video.addEventListener('timeupdate', function () {
      updatePlayerProgressUi();
      persistCurrentPlaybackProgress(false, false);
    });
    video.addEventListener('loadedmetadata', function () {
      applyPendingResumeSeek(video);
      updatePlayerProgressUi();
      updatePlayerActionButtons();
      persistCurrentPlaybackProgress(true, false);
    });
    video.addEventListener('durationchange', function () {
      applyPendingResumeSeek(video);
      updatePlayerProgressUi();
    });
    video.addEventListener('seeked', function () {
      updatePlayerProgressUi();
      persistCurrentPlaybackProgress(true, false);
    });
    video.addEventListener('ended', function () {
      updatePlayerProgressUi();
      updatePlayerActionButtons();
      persistCurrentPlaybackProgress(true, true);
    });
    video.addEventListener('play', function () {
      updatePlayerActionButtons();
      persistCurrentPlaybackProgress(true, false);
    });
    video.addEventListener('pause', function () {
      updatePlayerActionButtons();
      persistCurrentPlaybackProgress(true, false);
    });
  }

  function togglePlayerPlayback() {
    var trailerEmbed = document.getElementById('player-trailer-embed');
    if (trailerEmbed && trailerEmbed.style.display === 'block') return;

    var video = document.getElementById('player-video');
    if (!video) return;

    try {
      if (video.paused) {
        video.play();
        setPlayerStatusLabel('Playing');
      } else {
        video.pause();
        setPlayerStatusLabel('Paused');
      }
      updatePlayerActionButtons();
    } catch (e) {}
  }

  function seekPlayerBy(deltaSeconds) {
    if (state.playerMode === 'live') return;
    var trailerEmbed = document.getElementById('player-trailer-embed');
    if (trailerEmbed && trailerEmbed.style.display === 'block') return;

    var video = document.getElementById('player-video');
    if (!video) return;

    var duration = Number(video.duration);
    if (!isFinite(duration) || duration <= 0) return;

    try {
      var nextTime = Math.max(0, Math.min(duration, Number(video.currentTime || 0) + deltaSeconds));
      video.currentTime = nextTime;
      updatePlayerProgressUi();
      setPlayerStatusLabel((deltaSeconds >= 0 ? 'Forward ' : 'Rewind ') + Math.abs(deltaSeconds) + 's');
      document.getElementById('player-status-container').style.display = 'flex';
      setTimeout(function () {
        if (!video.paused) {
          document.getElementById('player-status-container').style.display = 'none';
        }
      }, 800);
    } catch (e) {}
  }

  /* --- ASPECT RATIO & MUTE CONTROL HELPER METHODS --- */
  function applyPlayerAspect(mode) {
    var video = document.getElementById('player-video');
    if (video) {
      video.style.objectFit = mode;
    }
  }

  function cyclePlayerAspect() {
    var modes = ['contain', 'cover', 'fill'];
    var currentIdx = modes.indexOf(state.playerAspect || 'contain');
    var nextIdx = (currentIdx + 1) % modes.length;
    var nextMode = modes[nextIdx];
    state.playerAspect = nextMode;
    applyPlayerAspect(nextMode);
    showPlayerOverlay(true);
    if (state.focusedPanel === 'player-settings') {
      renderPlayerSettings();
    }
  }

  function updateMuteUI(isMuted) {
    // Safeguard function
  }

  function togglePlayerMute() {
    var video = document.getElementById('player-video');
    if (!video) return;
    video.muted = !video.muted;
    state.playerMuted = video.muted;
    showPlayerOverlay(true);
    if (state.focusedPanel === 'player-settings') {
      renderPlayerSettings();
    }
  }

  function updateSubtitleLabel(text) {
    // Safeguard function
  }

  /* --- PLAYER SETTINGS PANEL OVERLAY --- */
  var settingsCategories = [
    { id: 'subtitles', label: 'Subtitles' },
    { id: 'aspect', label: 'Aspect Ratio' },
    { id: 'mute', label: 'Mute' },
    { id: 'close', label: 'Close Settings' }
  ];

  function getPlayerSubtitleTracks() {
    var video = document.getElementById('player-video');
    if (!video) return [];
    var list = [{ id: -1, label: 'Off' }];
    if (typeof hlsInstance !== 'undefined' && hlsInstance && hlsInstance.subtitleTracks && hlsInstance.subtitleTracks.length > 0) {
      for (var i = 0; i < hlsInstance.subtitleTracks.length; i++) {
        var track = hlsInstance.subtitleTracks[i];
        list.push({
          id: i,
          label: track.name || track.lang || 'Track ' + (i + 1)
        });
      }
      return list;
    }
    var tracks = [];
    for (var j = 0; j < video.textTracks.length; j++) {
      var t = video.textTracks[j];
      if (t.kind === 'subtitles' || t.kind === 'captions') {
        tracks.push(t);
      }
    }
    for (var k = 0; k < tracks.length; k++) {
      list.push({
        id: k,
        label: tracks[k].label || tracks[k].language || 'Track ' + (k + 1)
      });
    }
    return list;
  }

  function setPlayerSubtitleTrack(trackId) {
    var video = document.getElementById('player-video');
    if (!video) return;
    if (typeof hlsInstance !== 'undefined' && hlsInstance && hlsInstance.subtitleTracks && hlsInstance.subtitleTracks.length > 0) {
      hlsInstance.subtitleTrack = trackId;
      return;
    }
    var tracks = [];
    for (var j = 0; j < video.textTracks.length; j++) {
      var t = video.textTracks[j];
      if (t.kind === 'subtitles' || t.kind === 'captions') {
        tracks.push(t);
      }
    }
    for (var k = 0; k < tracks.length; k++) {
      tracks[k].mode = (k === trackId) ? 'showing' : 'disabled';
    }
  }

  function getActiveSubtitleTrackId() {
    var video = document.getElementById('player-video');
    if (!video) return -1;
    if (typeof hlsInstance !== 'undefined' && hlsInstance && hlsInstance.subtitleTracks && hlsInstance.subtitleTracks.length > 0) {
      return hlsInstance.subtitleTrack;
    }
    var tracks = [];
    for (var j = 0; j < video.textTracks.length; j++) {
      var t = video.textTracks[j];
      if (t.kind === 'subtitles' || t.kind === 'captions') {
        tracks.push(t);
      }
    }
    for (var k = 0; k < tracks.length; k++) {
      if (tracks[k].mode === 'showing') {
        return k;
      }
    }
    return -1;
  }

  function setPlayerAspect(aspect) {
    state.playerAspect = aspect;
    var video = document.getElementById('player-video');
    if (video) {
      video.style.objectFit = aspect;
    }
  }

  function setPlayerMuted(muted) {
    state.playerMuted = muted;
    var video = document.getElementById('player-video');
    if (video) {
      video.muted = muted;
    }
  }

  function renderPlayerSettings() {
    var categoriesContainer = document.getElementById('settings-categories-list');
    var optionsContainer = document.getElementById('settings-options-list');
    if (!categoriesContainer || !optionsContainer) return;

    var categoriesHtml = '';
    for (var i = 0; i < settingsCategories.length; i++) {
      var cat = settingsCategories[i];
      var isFocused = state.settingsFocusSection === 'categories' && state.settingsFocusIndex === i;
      var isActive = state.settingsCategory === cat.id;
      var className = 'settings-item';
      if (isActive) className += ' active';
      if (isFocused) className += ' focused';
      categoriesHtml += '<div class="' + className + '" data-cat-id="' + cat.id + '" data-index="' + i + '">' + escapeHtml(cat.label) + '</div>';
    }
    categoriesContainer.innerHTML = categoriesHtml;

    var optionsHtml = '';
    var options = [];
    var activeOptionId = null;

    if (state.settingsCategory === 'subtitles') {
      options = getPlayerSubtitleTracks();
      activeOptionId = getActiveSubtitleTrackId();
    } else if (state.settingsCategory === 'aspect') {
      options = [
        { id: 'contain', label: 'Fit (Contain)' },
        { id: 'cover', label: 'Zoom (Cover)' },
        { id: 'fill', label: 'Stretch (Fill)' }
      ];
      activeOptionId = state.playerAspect;
    } else if (state.settingsCategory === 'mute') {
      options = [
        { id: 'unmuted', label: 'Sound On' },
        { id: 'muted', label: 'Muted' }
      ];
      activeOptionId = state.playerMuted ? 'muted' : 'unmuted';
    }

    for (var j = 0; j < options.length; j++) {
      var opt = options[j];
      var isOptFocused = state.settingsFocusSection === 'options' && state.settingsFocusIndex === j;
      var isOptActive = String(opt.id) === String(activeOptionId);
      var optClassName = 'settings-item';
      if (isOptActive) optClassName += ' active';
      if (isOptFocused) optClassName += ' focused';
      var label = opt.label;
      if (isOptActive) {
        label += ' ✓';
      }
      optionsHtml += '<div class="' + optClassName + '" data-opt-id="' + opt.id + '" data-index="' + j + '">' + escapeHtml(label) + '</div>';
    }
    optionsContainer.innerHTML = optionsHtml;
  }

  function openPlayerSettings() {
    var overlay = document.getElementById('player-settings-overlay');
    if (overlay) {
      overlay.style.display = 'flex';
    }
    state.settingsReturnPanel = state.focusedPanel;
    state.settingsReturnIndex = state.focusedIndex;
    state.focusedPanel = 'player-settings';
    state.settingsFocusSection = 'categories';
    state.settingsCategory = 'subtitles';
    state.settingsFocusIndex = 0;
    renderPlayerSettings();
    updateFocusUI();
  }

  function closePlayerSettings() {
    var overlay = document.getElementById('player-settings-overlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
    state.focusedPanel = state.settingsReturnPanel || 'player';
    state.focusedIndex = state.settingsReturnIndex || 4; // Index of settings button
    updateFocusUI();
  }

  function handlePlayerSettingsNavigation(code) {
    var handled = false;
    if (state.settingsFocusSection === 'categories') {
      if (code === 38) { // Up
        if (state.settingsFocusIndex > 0) {
          state.settingsFocusIndex--;
          state.settingsCategory = settingsCategories[state.settingsFocusIndex].id;
          renderPlayerSettings();
        }
        handled = true;
      } else if (code === 40) { // Down
        if (state.settingsFocusIndex < settingsCategories.length - 1) {
          state.settingsFocusIndex++;
          state.settingsCategory = settingsCategories[state.settingsFocusIndex].id;
          renderPlayerSettings();
        }
        handled = true;
      } else if (code === 39 || code === 13) { // Right or OK
        if (state.settingsCategory === 'close') {
          closePlayerSettings();
        } else {
          state.settingsFocusSection = 'options';
          state.settingsFocusIndex = 0;
          renderPlayerSettings();
        }
        handled = true;
      } else if (code === 37 || code === 461 || code === 27 || code === 8) { // Left or Back
        closePlayerSettings();
        handled = true;
      }
    } else if (state.settingsFocusSection === 'options') {
      var options = [];
      if (state.settingsCategory === 'subtitles') {
        options = getPlayerSubtitleTracks();
      } else if (state.settingsCategory === 'aspect') {
        options = [
          { id: 'contain', label: 'Fit (Contain)' },
          { id: 'cover', label: 'Zoom (Cover)' },
          { id: 'fill', label: 'Stretch (Fill)' }
        ];
      } else if (state.settingsCategory === 'mute') {
        options = [
          { id: 'unmuted', label: 'Sound On' },
          { id: 'muted', label: 'Muted' }
        ];
      }
      if (code === 38) { // Up
        if (state.settingsFocusIndex > 0) {
          state.settingsFocusIndex--;
          renderPlayerSettings();
        }
        handled = true;
      } else if (code === 40) { // Down
        if (state.settingsFocusIndex < options.length - 1) {
          state.settingsFocusIndex++;
          renderPlayerSettings();
        }
        handled = true;
      } else if (code === 37 || code === 461 || code === 27 || code === 8) { // Left or Back
        state.settingsFocusSection = 'categories';
        for (var i = 0; i < settingsCategories.length; i++) {
          if (settingsCategories[i].id === state.settingsCategory) {
            state.settingsFocusIndex = i;
            break;
          }
        }
        renderPlayerSettings();
        handled = true;
      } else if (code === 13) { // OK
        var selectedOpt = options[state.settingsFocusIndex];
        if (selectedOpt) {
          if (state.settingsCategory === 'subtitles') {
            setPlayerSubtitleTrack(selectedOpt.id);
          } else if (state.settingsCategory === 'aspect') {
            setPlayerAspect(selectedOpt.id);
          } else if (state.settingsCategory === 'mute') {
            setPlayerMuted(selectedOpt.id === 'muted');
          }
          renderPlayerSettings();
        }
        handled = true;
      }
    }
    return handled;
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
      bindPlayerUiEvents(video);
      // Apply player preferences
      video.style.objectFit = state.playerAspect || 'contain';
      video.muted = !!state.playerMuted;
      updateMuteUI(video.muted);
      updateSubtitleLabel('Off');
    }

    resetPlayerProgressUi();
    setPlayerTopMeta('');
    updatePlayerActionButtons();
  }

  function showPlayerEmbed(embedUrl, title) {
    cleanupHls();
    rememberPlayerReturnState();
    state.currentPlayback = null;
    state.activeChannel = null;
    state.activeChannelQueue = [];
    state.activeChannelIndex = 0;
    state.focusedPanel = 'player';
    showView('view-player');

    var video = document.getElementById('player-video');
    var trailerEmbed = document.getElementById('player-trailer-embed');
    var status = document.getElementById('player-status-container');

    if (video) {
      try {
        video.pause();
        video.removeAttribute('src');
        video.load();
      } catch (e) {}
      video.style.display = 'none';
    }

    configurePlayerUi('vod', title || 'Trailer', 'Embedded trailer playback', 'Trailer', 'YouTube embed', 'TRAILER');
    setPlayerStatusLabel('Loading trailer...');
    if (status) {
      status.style.display = 'flex';
    }

    if (trailerEmbed) {
      trailerEmbed.style.display = 'block';
      trailerEmbed.onload = function () {
        document.getElementById('player-status-container').style.display = 'none';
      };
      trailerEmbed.src = embedUrl;
    }

    updatePlayerActionButtons();
  }

  function playStream(streamId) {
    cleanupHls();
    resetPlayerSurface();
    state.currentPlayback = null;

    var video = document.getElementById('player-video');
    bindPlayerUiEvents(video);

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
          setPlayerHeadline('Playback Error');
          setPlayerMeta('Live stream format not supported');
          document.getElementById('player-status-container').style.display = 'none';
        };
        // Start TS fallback timeout
        nativeStartupTimeout = setTimeout(function() {
          if (!nativeStarted) {
            console.error('[Legacy Player] TS fallback also timed out.');
            setPlayerHeadline('Playback Error');
            setPlayerMeta('Live stream unavailable');
            document.getElementById('player-status-container').style.display = 'none';
          }
        }, 20000);

        setPlayerStatusLabel('Trying TS fallback...');
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
        enableWorker: true,
        autoStartLoad: false,
        maxBufferLength: 10,
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
    
    configurePlayerUi(
      'live',
      channel.name || 'Live Channel',
      '',
      'Channel ' + (state.activeChannelIndex + 1) + ' of ' + activeQueue.length,
      (state.session && state.session.serverName ? state.session.serverName : 'Smartifly Live') + ' • Live',
      'LIVE TV'
    );
    setPlayerStatusLabel('Buffering live channel...');
    document.getElementById('player-status-container').style.display = 'flex';
    
    playStream(channel.stream_id);
  }

  function playMovie(movie, detailInfo, resumeEntry) {
    cleanupHls();
    resetPlayerSurface();
    rememberPlayerReturnState();
    updateWatchHistory('movies', movie, 'Movie');
    state.currentPlayback = {
      mode: 'movies',
      resumeId: String(getCatalogItemId(movie, 'movies')),
      name: getCatalogItemName(movie),
      artwork: getCatalogItemArtwork(movie, 'movies'),
      item: movie,
      resumeAt: resumeEntry ? Number(resumeEntry.currentTime || 0) : 0,
      resumeApplied: false,
      lastSavedSecond: 0
    };
    state.activeChannel = null;
    state.activeChannelQueue = [];
    state.activeChannelIndex = 0;
    state.focusedPanel = 'player';
    showView('view-player');

    configurePlayerUi(
      'vod',
      movie.name || 'Loading Movie...',
      '',
      buildDetailMetaLine('movies', movie, detailInfo) || 'Movie',
      'Movie Playback',
      'MOVIE'
    );
    setPlayerStatusLabel('Loading movie...');
    document.getElementById('player-status-container').style.display = 'flex';

    var video = document.getElementById('player-video');
    bindPlayerUiEvents(video);
    while (video.firstChild) {
      video.removeChild(video.firstChild);
    }
    video.removeAttribute('src');
    try { video.load(); } catch (e) {}

    var cleanBaseUrl = normalizeBaseUrl(state.session.portalBaseUrl)
      .replace(/^(https?:\/\/)[^@\/]+@/, '$1');
    var movieData = detailInfo && detailInfo.movie_data ? detailInfo.movie_data : {};
    var movieSubtitleTracks = normalizeLegacySubtitleTracks(cleanBaseUrl, detailInfo, []);
    var extension = movie.container_extension || movieData.container_extension || 'mp4';
    var movieUrl = cleanBaseUrl + '/movie/' +
      encodeURIComponent(state.session.username) + '/' +
      encodeURIComponent(state.session.userInfo.password) + '/' +
      movie.stream_id + '.' + extension;

    preparePlayerSubtitles(video, movieSubtitleTracks);

    video.onwaiting = function() {
      setPlayerStatusLabel('Buffering movie...');
      document.getElementById('player-status-container').style.display = 'flex';
    };
    video.onplaying = function() {
      document.getElementById('player-status-container').style.display = 'none';
      updatePlayerProgressUi();
    };
    video.onerror = function() {
      setPlayerHeadline('Playback Error');
      setPlayerMeta('Movie stream unavailable');
      document.getElementById('player-status-container').style.display = 'none';
    };

    video.src = movieUrl;
    video.load();
    video.play();
  }

  function playSeriesEpisode(episode, seriesTitle, seriesItem, resumeEntry) {
    if (!episode) return;

    cleanupHls();
    resetPlayerSurface();
    rememberPlayerReturnState();
    var sItem = seriesItem || state.detailItem;
    if (!sItem) {
      sItem = {
        series_id: getEpisodeId(episode),
        name: seriesTitle || getEpisodeTitle(episode, 0),
        cover: ''
      };
    }
    updateWatchHistory('series', sItem, getEpisodeTitle(episode, 0));
    state.currentPlayback = {
      mode: 'series',
      resumeId: String(getCatalogItemId(sItem, 'series')),
      name: getCatalogItemName(sItem),
      artwork: getCatalogItemArtwork(sItem, 'series'),
      item: sItem,
      episodeId: String(getEpisodeId(episode)),
      episodeItem: episode,
      episodeTitle: getEpisodeTitle(episode, 0),
      season: episode.season || (episode.info && episode.info.season) || null,
      episodeNum: episode.episode_num || (episode.info && episode.info.episode_num) || null,
      resumeAt: resumeEntry ? Number(resumeEntry.currentTime || 0) : 0,
      resumeApplied: false,
      lastSavedSecond: 0
    };
    state.activeChannel = null;
    state.activeChannelQueue = [];
    state.activeChannelIndex = 0;
    state.focusedPanel = 'player';
    showView('view-player');

    var episodeTitle = getEpisodeTitle(episode, 0);
    configurePlayerUi(
      'vod',
      seriesTitle || episodeTitle,
      seriesTitle ? episodeTitle : '',
      ((episode.season || (episode.info && episode.info.season)) ? 'Season ' + (episode.season || episode.info.season) + ' • ' : '') + ((episode.episode_num || (episode.info && episode.info.episode_num)) ? 'Episode ' + (episode.episode_num || episode.info.episode_num) : 'Series Episode'),
      'Series Playback',
      'SERIES'
    );
    setPlayerStatusLabel('Loading episode...');
    document.getElementById('player-status-container').style.display = 'flex';

    var video = document.getElementById('player-video');
    bindPlayerUiEvents(video);
    while (video.firstChild) {
      video.removeChild(video.firstChild);
    }
    video.removeAttribute('src');
    try { video.load(); } catch (e) {}

    var cleanBaseUrl = normalizeBaseUrl(state.session.portalBaseUrl)
      .replace(/^(https?:\/\/)[^@\/]+@/, '$1');
    var episodeSubtitleTracks = normalizeLegacySubtitleTracks(cleanBaseUrl, episode, normalizeLegacySubtitleTracks(cleanBaseUrl, state.detailInfo, []));
    var extension = episode.container_extension || (episode.info && episode.info.container_extension) || 'mp4';
    var episodeUrl = cleanBaseUrl + '/series/' +
      encodeURIComponent(state.session.username) + '/' +
      encodeURIComponent(state.session.userInfo.password) + '/' +
      getEpisodeId(episode) + '.' + extension;

    preparePlayerSubtitles(video, episodeSubtitleTracks);

    video.onwaiting = function() {
      setPlayerStatusLabel('Buffering episode...');
      document.getElementById('player-status-container').style.display = 'flex';
    };
    video.onplaying = function() {
      document.getElementById('player-status-container').style.display = 'none';
      updatePlayerProgressUi();
    };
    video.onerror = function() {
      setPlayerHeadline('Playback Error');
      setPlayerMeta('Episode stream unavailable');
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
    state.currentPlayback = null;
    state.activeChannel = null;
    state.activeChannelQueue = [];
    state.activeChannelIndex = 0;
    state.focusedPanel = 'player';
    showView('view-player');

    configurePlayerUi(
      'vod',
      seriesTitle || 'Series',
      'Trailer',
      'Trailer',
      'Preview Playback',
      'TRAILER'
    );
    setPlayerStatusLabel('Loading trailer...');
    document.getElementById('player-status-container').style.display = 'flex';

    var video = document.getElementById('player-video');
    bindPlayerUiEvents(video);
    while (video.firstChild) {
      video.removeChild(video.firstChild);
    }
    video.removeAttribute('src');
    try { video.load(); } catch (loadErr) {}

    video.onwaiting = function() {
      setPlayerStatusLabel('Buffering trailer...');
      document.getElementById('player-status-container').style.display = 'flex';
    };
    video.onplaying = function() {
      document.getElementById('player-status-container').style.display = 'none';
      updatePlayerProgressUi();
    };
    video.onerror = function() {
      setPlayerHeadline('Playback Error');
      setPlayerMeta('Trailer unavailable');
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
          playSeriesEpisode(state.detailEpisodes[0], getCatalogItemName(state.detailItem), state.detailItem);
        }
      }
      return;
    }

    playMovie(state.detailItem, state.detailInfo);
  }

  function closePlayer() {
    persistCurrentPlaybackProgress(true, false);
    if (playerOverlayTimer) {
      clearTimeout(playerOverlayTimer);
      playerOverlayTimer = null;
    }
    if (playerClockTimer) {
      clearInterval(playerClockTimer);
      playerClockTimer = null;
    }
    hidePlayerOverlay();

    cleanupHls();
    resetPlayerSurface();
    var video = document.getElementById('player-video');
    try {
      video.pause();
      video.src = '';
    } catch (e) {}
    state.currentPlayback = null;

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
    
    configurePlayerUi(
      'live',
      state.activeChannel.name || 'Live Channel',
      '',
      'Channel ' + (state.activeChannelIndex + 1) + ' of ' + state.activeChannelQueue.length,
      (state.session && state.session.serverName ? state.session.serverName : 'Smartifly Live') + ' • Live',
      'LIVE TV'
    );
    setPlayerStatusLabel('Switching channel...');
    document.getElementById('player-status-container').style.display = 'flex';
    
    playStream(state.activeChannel.stream_id);
  }

  // --- SPATIAL NAVIGATION FOCUS MANAGER ---
  function getFocusableElements() {
    if (state.focusedPanel === 'welcome') {
      return document.getElementById('view-welcome').querySelectorAll('.focusable');
    }
    if (state.focusedPanel === 'login' || state.focusedPanel === 'login-wizard') {
      return document.getElementById('view-login').querySelectorAll('.focusable');
    }
    if (state.focusedPanel === 'profiles') {
      return document.getElementById('profiles-list-container').querySelectorAll('.profile-card.focusable');
    }
    if (state.focusedPanel === 'profiles-edit') {
      return document.getElementById('profiles-list-container').querySelectorAll('.profile-edit-btn.focusable');
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
    if (state.focusedPanel === 'keyboard') {
      return document.getElementById('keyboard-keys-grid').querySelectorAll('.focusable');
    }
    if (state.focusedPanel === 'activation') {
      return document.getElementById('view-activation').querySelectorAll('.focusable');
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
    if (state.focusedPanel === 'settings-tabs') {
      return document.getElementById('settings-tabs-list').querySelectorAll('.focusable');
    }
    if (state.focusedPanel === 'settings-account') {
      return document.getElementById('settings-panel-account').querySelectorAll('.focusable');
    }
    if (state.focusedPanel === 'settings-profiles') {
      return document.getElementById('settings-profiles-list').querySelectorAll('.focusable');
    }
    if (state.focusedPanel === 'settings-app') {
      return document.getElementById('settings-panel-app').querySelectorAll('.focusable');
    }
    if (state.focusedPanel === 'settings-about') {
      return document.getElementById('settings-panel-about').querySelectorAll('.focusable');
    }
    if (state.focusedPanel === 'settings-profile-modal') {
      var spmModal = document.getElementById('settings-profile-modal');
      return spmModal ? spmModal.querySelectorAll('.focusable') : [];
    }
    if (state.focusedPanel === 'profile-name-keyboard') {
      var pnkEl = document.getElementById('pnk-keyboard');
      return pnkEl ? pnkEl.querySelectorAll('.focusable') : [];
    }
    if (state.focusedPanel === 'pin-entry-keyboard') {
      var pinEl = document.getElementById('pin-keyboard');
      return pinEl ? pinEl.querySelectorAll('.focusable') : [];
    }
    if (state.focusedPanel === 'profile-pin-keyboard') {
      var ppkEl = document.getElementById('ppk-keyboard');
      return ppkEl ? ppkEl.querySelectorAll('.focusable') : [];
    }
    if (state.focusedPanel === 'player') {
      var list = [];
      var backBtn = document.getElementById('player-btn-back');
      var prevBtn = document.getElementById('player-btn-seek-backward');
      var toggleBtn = document.getElementById('player-btn-toggle');
      var nextBtn = document.getElementById('player-btn-seek-forward');
      var settingsBtn = document.getElementById('player-btn-settings');
      if (backBtn) list.push(backBtn);
      if (prevBtn && prevBtn.style.display !== 'none') list.push(prevBtn);
      if (toggleBtn) list.push(toggleBtn);
      if (nextBtn && nextBtn.style.display !== 'none') list.push(nextBtn);
      if (settingsBtn && settingsBtn.style.display !== 'none') list.push(settingsBtn);
      return list;
    }
    return [];
  }

  function updateFocusUI() {
    // Clear previously focused element in O(1)
    if (state.activeFocusedEl) {
      try {
        state.activeFocusedEl.classList.remove('focused');
      } catch (e) {}
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
      state.activeFocusedEl = focusedEl;
      if (focusedEl.tagName !== 'INPUT') {
        focusedEl.focus();
        if (!isHomePanel(state.focusedPanel)) {
          if (window.pageXOffset !== 0 || window.pageYOffset !== 0) {
            window.scrollTo(0, 0);
          }
          if (document.body && document.body.scrollTop !== 0) {
            document.body.scrollTop = 0;
          }
          if (document.documentElement && document.documentElement.scrollTop !== 0) {
            document.documentElement.scrollTop = 0;
          }
          
          // Reset scroll on non-scrollable parent views to fix TV browser focus shift bugs
          var viewCatalog = document.getElementById('view-catalog');
          if (viewCatalog && (viewCatalog.scrollTop !== 0 || viewCatalog.scrollLeft !== 0)) {
            viewCatalog.scrollTop = 0;
            viewCatalog.scrollLeft = 0;
          }
          var catalogContainer = document.querySelector('.catalog-container');
          if (catalogContainer && (catalogContainer.scrollTop !== 0 || catalogContainer.scrollLeft !== 0)) {
            catalogContainer.scrollTop = 0;
            catalogContainer.scrollLeft = 0;
          }
          var homePanel = document.getElementById('home-panel');
          if (homePanel && (homePanel.scrollTop !== 0 || homePanel.scrollLeft !== 0)) {
            homePanel.scrollTop = 0;
            homePanel.scrollLeft = 0;
          }
        }
      }
      
      // Auto-scroll views for catalog scroll containers
      if (state.focusedPanel === 'catalog-categories') {
        scrollIntoViewIfNeeded(document.getElementById('categories-panel-list'), focusedEl);
      } else if (state.focusedPanel === 'home-hero') {
        var homeScroll = getHomeVerticalScrollNode();
        if (homeScroll) {
          var resetHeroScroll = function () {
            if (state.focusedPanel !== 'home-hero') {
              logHomeDebug('home-hero:reset-skipped', {
                panel: state.focusedPanel,
                scrollTop: homeScroll.scrollTop
              });
              return;
            }
            logHomeDebug('home-hero:reset-run', {
              panel: state.focusedPanel,
              scrollTopBefore: homeScroll.scrollTop
            });
            if (homeScroll.scrollTop !== 0) {
              homeScroll.scrollTop = 0;
            }
            logHomeDebug('home-hero:reset-after', {
              panel: state.focusedPanel,
              scrollTopAfter: homeScroll.scrollTop
            });
            triggerRepaint(homeScroll);
            triggerRepaint(document.getElementById('home-rails'));
          };
          resetHeroScroll();
          setTimeout(resetHeroScroll, 0);
          setTimeout(resetHeroScroll, 50);
          setTimeout(resetHeroScroll, 100);
          setTimeout(resetHeroScroll, 200);
        }
      } else if (state.focusedPanel === 'home-rails') {
        var homeScrollNode = getHomeVerticalScrollNode();
        var homeRailNode = focusedEl.parentNode && focusedEl.parentNode.parentNode ? focusedEl.parentNode.parentNode : focusedEl;
        var homeRailTrackNode = focusedEl.parentNode;
        if (homeScrollNode) {
          var syncHomeRailScroll = function () {
            logHomeDebug('home-rails:sync-start', {
              focusedIndex: state.focusedIndex,
              panel: state.focusedPanel,
              homeScrollTop: homeScrollNode.scrollTop,
              railOffsetTop: homeRailNode && typeof homeRailNode.offsetTop === 'number' ? homeRailNode.offsetTop : null,
              cardOffsetTop: typeof focusedEl.offsetTop === 'number' ? focusedEl.offsetTop : null,
              cardOffsetLeft: typeof focusedEl.offsetLeft === 'number' ? focusedEl.offsetLeft : null,
              trackScrollLeft: homeRailTrackNode && typeof homeRailTrackNode.scrollLeft === 'number' ? homeRailTrackNode.scrollLeft : null
            });
            scrollHomeRailIntoView(homeScrollNode, focusedEl);
            scrollVerticalIntoViewByRect(homeScrollNode, focusedEl, 120, 80);
            scrollIntoViewIfNeeded(homeScrollNode, homeRailNode);
            scrollHorizontalIntoViewIfNeeded(homeRailTrackNode, focusedEl);
            logHomeDebug('home-rails:sync-end', {
              focusedIndex: state.focusedIndex,
              panel: state.focusedPanel,
              homeScrollTop: homeScrollNode.scrollTop,
              trackScrollLeft: homeRailTrackNode && typeof homeRailTrackNode.scrollLeft === 'number' ? homeRailTrackNode.scrollLeft : null
            });
            triggerRepaint(homeScrollNode);
            triggerRepaint(homeRailTrackNode);
            triggerRepaint(document.getElementById('home-rails'));
          };
          syncHomeRailScroll();
          setTimeout(syncHomeRailScroll, 0);
          setTimeout(syncHomeRailScroll, 40);
          setTimeout(syncHomeRailScroll, 100);
          setTimeout(syncHomeRailScroll, 200);
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

  function triggerRepaint(element) {
    if (!element) return;
    logHomeDebug('triggerRepaint', {
      id: element.id || '',
      className: element.className || '',
      scrollTop: typeof element.scrollTop === 'number' ? element.scrollTop : null,
      scrollLeft: typeof element.scrollLeft === 'number' ? element.scrollLeft : null
    });
    var originalTransform = element.style.webkitTransform || element.style.transform;
    element.style.webkitTransform = 'translateZ(0px)';
    element.style.transform = 'translateZ(0px)';
    if (window.requestAnimationFrame) {
      window.requestAnimationFrame(function() {
        element.style.webkitTransform = originalTransform || '';
        element.style.transform = originalTransform || '';
      });
    } else {
      setTimeout(function() {
        element.style.webkitTransform = originalTransform || '';
        element.style.transform = originalTransform || '';
      }, 10);
    }
  }

  function scrollVerticalIntoViewByRect(container, element, topPadding, bottomPadding) {
    if (!container || !element || !container.getBoundingClientRect || !element.getBoundingClientRect) return;

    var initialTop = container.scrollTop;
    var containerRect = container.getBoundingClientRect();
    var elementRect = element.getBoundingClientRect();
    var safeTopPadding = typeof topPadding === 'number' ? topPadding : 0;
    var safeBottomPadding = typeof bottomPadding === 'number' ? bottomPadding : 0;
    var nextTop = initialTop;

    if (elementRect.top < containerRect.top + safeTopPadding) {
      nextTop += elementRect.top - (containerRect.top + safeTopPadding);
    } else if (elementRect.bottom > containerRect.bottom - safeBottomPadding) {
      nextTop += elementRect.bottom - (containerRect.bottom - safeBottomPadding);
    }

    if (nextTop < 0) {
      nextTop = 0;
    }

    if (nextTop !== initialTop) {
      logHomeDebug('scrollVerticalIntoViewByRect', {
        containerId: container.id || '',
        from: initialTop,
        to: nextTop,
        elementTop: elementRect.top,
        elementBottom: elementRect.bottom,
        containerTop: containerRect.top,
        containerBottom: containerRect.bottom,
        topPadding: safeTopPadding,
        bottomPadding: safeBottomPadding
      });
      container.scrollTop = nextTop;
      triggerRepaint(container);
    }
  }

  function scrollHomeRailIntoView(container, focusedEl) {
    if (!container || !focusedEl) return;

    var railNode = focusedEl.parentNode && focusedEl.parentNode.parentNode ? focusedEl.parentNode.parentNode : null;
    if (!railNode) return;

    var targetTop = railNode.offsetTop - 24;
    if (targetTop < 0) {
      targetTop = 0;
    }

    if (container.scrollTop !== targetTop) {
      logHomeDebug('scrollHomeRailIntoView', {
        containerId: container.id || '',
        from: container.scrollTop,
        to: targetTop,
        railOffsetTop: railNode.offsetTop,
        focusedIndex: state.focusedIndex
      });
      container.scrollTop = targetTop;
      triggerRepaint(container);
    }
  }

  function scrollIntoViewIfNeeded(container, element) {
    if (!container || !element) return;
    var initialTop = container.scrollTop;
    var initialLeft = container.scrollLeft;

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

    if (container.scrollTop !== initialTop || container.scrollLeft !== initialLeft) {
      logHomeDebug('scrollIntoViewIfNeeded', {
        containerId: container.id || '',
        className: container.className || '',
        fromTop: initialTop,
        toTop: container.scrollTop,
        fromLeft: initialLeft,
        toLeft: container.scrollLeft,
        elemTop: elemTop,
        elemBottom: elemBottom,
        elemLeft: elemLeft,
        elemRight: elemRight
      });
      triggerRepaint(container);
    }
  }

  function scrollHorizontalIntoViewIfNeeded(container, element) {
    if (!container || !element) return;
    var initialLeft = container.scrollLeft;

    var containerLeft = container.scrollLeft;
    var containerRight = containerLeft + container.clientWidth;
    var elemLeft = element.offsetLeft;
    var elemRight = elemLeft + element.offsetWidth;

    if (elemLeft < containerLeft) {
      container.scrollLeft = elemLeft;
    } else if (elemRight > containerRight) {
      container.scrollLeft = elemRight - container.clientWidth;
    }

    if (container.scrollLeft !== initialLeft) {
      logHomeDebug('scrollHorizontalIntoViewIfNeeded', {
        className: container.className || '',
        fromLeft: initialLeft,
        toLeft: container.scrollLeft,
        elemLeft: elemLeft,
        elemRight: elemRight,
        containerLeft: containerLeft,
        containerRight: containerRight
      });
      triggerRepaint(container);
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
        logHomeDebug('handleHomeNavigation:hero-down', {
          fromPanel: state.focusedPanel,
          nextPanel: 'home-rails',
          nextIndex: 0
        });
        state.focusedPanel = 'home-rails';
        state.focusedIndex = 0;
        updateFocusUI();
        return true;
      }
      if (code === 38) { // ArrowUp
        return true; // Consume at top
      }
      if (code === 13) { // Enter / OK
        if (state.homeHeroEntry) {
          var playHeroButton = document.getElementById('home-hero-btn-play');
          var detailsHeroButton = document.getElementById('home-hero-btn-details');
          var activeHeroElement = document.activeElement;
          var activeHeroId = activeHeroElement && activeHeroElement.id ? activeHeroElement.id : '';
          var detailsIsFocused = !!(
            (detailsHeroButton && detailsHeroButton.classList.contains('focused')) ||
            activeHeroId === 'home-hero-btn-details' ||
            items[state.focusedIndex] === detailsHeroButton
          );
          var playIsFocused = !!(
            (playHeroButton && playHeroButton.classList.contains('focused')) ||
            activeHeroId === 'home-hero-btn-play' ||
            items[state.focusedIndex] === playHeroButton
          );

          if (detailsIsFocused) {
            showContentDetail(state.homeHeroEntry.item, state.homeHeroEntry.mode);
            return true;
          }

          if (playIsFocused || state.focusedIndex === 0) {
            if (state.homeHeroEntry.mode === 'live') {
              playChannel(state.homeHeroEntry.item, [state.homeHeroEntry.item]);
            } else if (state.homeHeroEntry.mode === 'movies') {
              var movieCacheKey = state.homeHeroEntry.mode + '_' + getCatalogItemId(state.homeHeroEntry.item, state.homeHeroEntry.mode);
              playMovie(state.homeHeroEntry.item, homeHeroCache[movieCacheKey]);
            } else if (state.homeHeroEntry.mode === 'series') {
              playHomeHeroSeriesDirect(state.homeHeroEntry.item, homeHeroCache['series_' + getCatalogItemId(state.homeHeroEntry.item, 'series')]);
            } else {
              showContentDetail(state.homeHeroEntry.item, state.homeHeroEntry.mode);
            }
          } else {
            showContentDetail(state.homeHeroEntry.item, state.homeHeroEntry.mode);
          }
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

  function isSettingsPanel(panel) {
    return panel === 'settings-tabs' || panel === 'settings-account' || panel === 'settings-profiles' || panel === 'settings-app' || panel === 'settings-about';
  }

  function handleDetailNavigation(code, items) {
    var handled = false;

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

  function handleSettingsNavigation(code, items) {
    var handled = false;
    var tabs = ['account', 'profiles', 'app', 'about'];

    if (state.focusedPanel === 'settings-tabs') {
      if (code === 38) { // ArrowUp
        if (state.focusedIndex > 0) {
          state.focusedIndex--;
          state.settingsActiveTab = tabs[state.focusedIndex];
          renderSettingsTabs();
          updateFocusUI();
          handled = true;
        }
      } else if (code === 40) { // ArrowDown
        if (state.focusedIndex < items.length - 1) {
          state.focusedIndex++;
          state.settingsActiveTab = tabs[state.focusedIndex];
          renderSettingsTabs();
          updateFocusUI();
          handled = true;
        }
      } else if (code === 37) { // ArrowLeft
        state.focusedPanel = 'catalog-sidebar';
        state.focusedIndex = 6; // Settings sidebar item index
        updateFocusUI();
        handled = true;
      } else if (code === 39) { // ArrowRight
        var targetPanel = 'settings-' + state.settingsActiveTab;
        var contentPanelEl = document.getElementById('settings-panel-' + state.settingsActiveTab);
        var contentItems = contentPanelEl ? contentPanelEl.querySelectorAll('.focusable') : [];
        if (contentItems.length > 0) {
          state.focusedPanel = targetPanel;
          state.focusedIndex = 0;
          updateFocusUI();
          handled = true;
        }
      }
    } else {
      // Right side content panels: account, profiles, app, about
      if (code === 37) { // ArrowLeft
        if (state.focusedPanel === 'settings-app' && state.focusedIndex > 0) {
          state.focusedIndex--;
          updateFocusUI();
          handled = true;
        } else {
          var activeTabIdx = tabs.indexOf(state.settingsActiveTab);
          state.focusedPanel = 'settings-tabs';
          state.focusedIndex = activeTabIdx >= 0 ? activeTabIdx : 0;
          updateFocusUI();
          handled = true;
        }
      } else if (code === 39) { // ArrowRight
        if (state.focusedPanel === 'settings-app' && state.focusedIndex < items.length - 1) {
          state.focusedIndex++;
          updateFocusUI();
          handled = true;
        }
      } else if (code === 38) { // ArrowUp
        if (state.focusedPanel !== 'settings-app' && state.focusedIndex > 0) {
          state.focusedIndex--;
          updateFocusUI();
          handled = true;
        }
      } else if (code === 40) { // ArrowDown
        if (state.focusedPanel !== 'settings-app' && state.focusedIndex < items.length - 1) {
          state.focusedIndex++;
          updateFocusUI();
          handled = true;
        }
      }
    }

    return handled;
  }

  function handleSearchNavigation(code, items) {
    var handled = false;
    var totalResults = getSearchResultsCount();

    if (state.focusedPanel === 'search-header') {
      if (code === 37) {
        if (state.focusedIndex > 0) {
          state.focusedIndex--;
          handled = true;
        } else {
          state.focusedPanel = 'catalog-sidebar';
          state.focusedIndex = 4; // Search index is 4
          handled = true;
        }
      } else if (code === 39) {
        if (totalResults > 0) {
          var firstRailFromHeaderRight = findSearchRailInDirection(0, 1);
          if (firstRailFromHeaderRight >= 0) {
            focusSearchResult(firstRailFromHeaderRight, 0);
          }
        } else {
          focusSearchKeyboard(0, 0);
        }
        handled = true;
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
    var gridColumns = 6;

    if (state.focusedPanel === 'watchlist-controls') {
      if (code === 37) {
        if (state.focusedIndex > 0) {
          state.focusedIndex--;
          handled = true;
        } else {
          state.focusedPanel = 'catalog-sidebar';
          state.focusedIndex = 5; // Watchlist index is 5
          handled = true;
        }
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
        } else {
          state.focusedPanel = 'catalog-sidebar';
          state.focusedIndex = 5; // Watchlist index is 5
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
    if (state.loginPending) {
      event.preventDefault();
      return;
    }
    var code = event.keyCode || event.which;
    var handled = false;

    // Handle back button separately across panels
    if (code === 8 || code === 461 || code === 27) { // Backspace, webOS Back, Escape
      if (state.focusedPanel === 'login-wizard') {
        if (code === 8) {
          // PC backspace: delete character in wizard keyboard
          handleWizardKeyPress('Backspace');
        } else {
          // webOS back/Escape: go back a step or return to welcome
          handleWizardKeyPress('Back');
        }
        handled = true;
      } else if (state.focusedPanel === 'player-settings') {
        closePlayerSettings();
        handled = true;
      } else if (state.focusedPanel === 'player') {
        closePlayer();
        handled = true;
      } else if (state.focusedPanel === 'settings-profile-modal') {
        closeProfileFormModal();
        handled = true;
      } else if (state.focusedPanel === 'profile-name-keyboard') {
        closeProfileNameKeyboard(false);
        handled = true;
      } else if (state.focusedPanel === 'pin-entry-keyboard') {
        closePinEntry();
        handled = true;
      } else if (state.focusedPanel === 'profile-pin-keyboard') {
        closeProfilePinKeyboard(false);
        handled = true;
      } else if (state.focusedPanel === 'login') {
        setupWelcomeView();
        handled = true;
      } else if (state.focusedPanel === 'activation') {
        cleanupActivation();
        setupWelcomeView();
        handled = true;
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
      } else if (state.focusedPanel === 'profiles-edit') {
        // Back from edit buttons row — go up to profile cards row
        state.focusedPanel = 'profiles';
        updateFocusUI();
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

    if (state.focusedPanel === 'player-settings') {
      handled = handlePlayerSettingsNavigation(code);
      if (handled) {
        event.preventDefault();
        return;
      }
    }

    if (state.focusedPanel === 'player') {
      if (!isPlayerOverlayVisible) {
        showPlayerOverlay(true);
        event.preventDefault();
        return;
      }

      showPlayerOverlay(true);

      if (code === 405 || code === 406 || code === 65) { // Yellow, Blue or 'A' key
        cyclePlayerAspect();
        handled = true;
      } else if (code === 404 || code === 83) { // Green or 'S' key
        cyclePlayerSubtitles();
        handled = true;
      } else if (code === 403 || code === 77) { // Red or 'M' key
        togglePlayerMute();
        handled = true;
      }

      if (state.playerMode === 'live') {
        // Up/Down changes channels in full-screen player
        if (code === 38) { // ArrowUp
          switchPlaybackChannel(-1);
          handled = true;
        } else if (code === 40) { // ArrowDown
          switchPlaybackChannel(1);
          handled = true;
        }
      }
      
      if (handled) {
        event.preventDefault();
        return;
      }
    }

    if (isSearchPanel(state.focusedPanel) && event.key && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      setSearchQueryValue(String(state.searchQuery || '') + event.key);
      event.preventDefault();
      return;
    }

    var items = getFocusableElements();
    var gridColumns = getCatalogGridColumnCount();

    if (state.focusedPanel === 'settings-profile-modal') {
      if (code === 38) { // ArrowUp
        if (state.profileModal.focusIndex > 0) {
          state.profileModal.focusIndex--;
          state.focusedIndex = state.profileModal.focusIndex; // keep in sync
          updateProfileModalFocus();
        }
        handled = true;
      } else if (code === 40) { // ArrowDown
        var visibleItems = getVisibleModalItems();
        if (state.profileModal.focusIndex < visibleItems.length - 1) {
          state.profileModal.focusIndex++;
          state.focusedIndex = state.profileModal.focusIndex; // keep in sync
          updateProfileModalFocus();
        }
        handled = true;
      } else if (code === 13) { // Enter Key
        var visibleItems = getVisibleModalItems();
        var activeEl = visibleItems[state.profileModal.focusIndex];
        if (activeEl) {
          if (activeEl.id === 'spm-name-input') {
            openProfileNameKeyboard();
            event.preventDefault();
            return;
          }
          activeEl.click();
          // Do NOT call updateFocusUI after modal click — calling .focus() on the
          // button while the Enter keydown is still propagating causes TV browsers
          // to fire a second native click, toggling the button back immediately.
          event.preventDefault();
          return;
        }
        handled = true;
      }
    } else if (isDetailPanel(state.focusedPanel)) {
      handled = handleDetailNavigation(code, items);
    } else if (isHomePanel(state.focusedPanel)) {
      handled = handleHomeNavigation(code, items);
    } else if (isSearchPanel(state.focusedPanel)) {
      handled = handleSearchNavigation(code, items);
    } else if (isWatchlistPanel(state.focusedPanel)) {
      handled = handleWatchlistNavigation(code, items);
    } else if (isSettingsPanel(state.focusedPanel)) {
      handled = handleSettingsNavigation(code, items);
    }

    if (!handled && code === 38) { // ArrowUp
      if (items.length > 0) {
        if (state.focusedPanel === 'login-wizard') {
          var pos = getWizardRowColFromIndex(state.focusedIndex);
          var step = WIZARD_STEPS[state.wizardStepIndex];
          var rows = getKeyboardRowsForStep(step.id, state.keyboardIsShifted, state.keyboardMode);
          if (pos.row > 0) {
            var targetRow = pos.row - 1;
            var targetRowLength = rows[targetRow].length;
            var targetCol = Math.round((pos.col / (pos.rowLength - 1 || 1)) * (targetRowLength - 1));
            state.focusedIndex = getWizardIndexFromRowCol(targetRow, targetCol);
            handled = true;
          }
        } else if (state.focusedPanel === 'profile-name-keyboard') {
          var pPos = getProfileKeyboardRowColFromIndex(state.focusedIndex);
          if (pPos.row > 0) {
            var targetRow = pPos.row - 1;
            var targetRowLength = profileKeyboardRows[targetRow].length;
            var targetCol = Math.round((pPos.col / (pPos.rowLength - 1 || 1)) * (targetRowLength - 1));
            state.focusedIndex = getProfileKeyboardIndexFromRowCol(targetRow, targetCol);
            handled = true;
          }
        } else if (state.focusedPanel === 'pin-entry-keyboard' || state.focusedPanel === 'profile-pin-keyboard') {
          var pPin = getPinKeyRowColFromIndex(state.focusedIndex);
          if (pPin.row > 0) {
            state.focusedIndex = getPinKeyIndexFromRowCol(pPin.row - 1, pPin.col);
            handled = true;
          }
        } else if (state.focusedPanel === 'profiles-edit') {
          // Up from edit buttons row → move focus back to profile cards row
          state.focusedPanel = 'profiles';
          handled = true;
        } else if (state.focusedPanel === 'catalog-channels') {
          // grid: go up by the correct number of columns for the current mode
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
        if (state.focusedPanel === 'login-wizard') {
          var pos = getWizardRowColFromIndex(state.focusedIndex);
          var step = WIZARD_STEPS[state.wizardStepIndex];
          var rows = getKeyboardRowsForStep(step.id, state.keyboardIsShifted, state.keyboardMode);
          if (pos.row < rows.length - 1) {
            var targetRow = pos.row + 1;
            var targetRowLength = rows[targetRow].length;
            var targetCol = Math.round((pos.col / (pos.rowLength - 1 || 1)) * (targetRowLength - 1));
            state.focusedIndex = getWizardIndexFromRowCol(targetRow, targetCol);
            handled = true;
          }
        } else if (state.focusedPanel === 'profile-name-keyboard') {
          var pPos = getProfileKeyboardRowColFromIndex(state.focusedIndex);
          if (pPos.row < profileKeyboardRows.length - 1) {
            var targetRow = pPos.row + 1;
            var targetRowLength = profileKeyboardRows[targetRow].length;
            var targetCol = Math.round((pPos.col / (pPos.rowLength - 1 || 1)) * (targetRowLength - 1));
            state.focusedIndex = getProfileKeyboardIndexFromRowCol(targetRow, targetCol);
            handled = true;
          }
        } else if (state.focusedPanel === 'pin-entry-keyboard' || state.focusedPanel === 'profile-pin-keyboard') {
          var pPin = getPinKeyRowColFromIndex(state.focusedIndex);
          if (pPin.row < 3) {
            state.focusedIndex = getPinKeyIndexFromRowCol(pPin.row + 1, pPin.col);
            handled = true;
          }
        } else if (state.focusedPanel === 'profiles') {
          // Down from profile cards row → move focus to edit buttons row
          var editBtns = document.getElementById('profiles-list-container').querySelectorAll('.profile-edit-btn.focusable');
          if (editBtns.length > 0) {
            state.focusedPanel = 'profiles-edit';
            // Clamp index to number of edit buttons (no edit btn for Add Profile slot)
            if (state.focusedIndex >= editBtns.length) {
              state.focusedIndex = editBtns.length - 1;
            }
            handled = true;
          }
        } else if (state.focusedPanel === 'catalog-channels') {
          // grid: go down by the correct number of columns for the current mode
          if (state.focusedIndex + gridColumns < items.length) {
            state.focusedIndex += gridColumns;
            // Expand batch if focus is within CATALOG_BATCH_PREFETCH items of the rendered end
            if (state.focusedIndex >= state.channelsBatchSize - CATALOG_BATCH_PREFETCH &&
                state.channelsBatchSize < state.channels.length) {
              appendChannelBatch();
            }
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
    } else if (code === 37) { // ArrowLeft
      if (state.focusedPanel === 'settings-actions') {
        state.focusedPanel = 'catalog-sidebar';
        state.focusedIndex = 5; // Settings sidebar item index
        handled = true;
      } else if (state.focusedPanel === 'login-wizard') {
        var pos = getWizardRowColFromIndex(state.focusedIndex);
        if (pos.col > 0) {
          state.focusedIndex = getWizardIndexFromRowCol(pos.row, pos.col - 1);
          handled = true;
        }
      } else if (state.focusedPanel === 'profile-name-keyboard') {
        var pPos = getProfileKeyboardRowColFromIndex(state.focusedIndex);
        if (pPos.col > 0) {
          state.focusedIndex = getProfileKeyboardIndexFromRowCol(pPos.row, pPos.col - 1);
          handled = true;
        }
      } else if (state.focusedPanel === 'pin-entry-keyboard' || state.focusedPanel === 'profile-pin-keyboard') {
        var pPin = getPinKeyRowColFromIndex(state.focusedIndex);
        if (pPin.col > 0) {
          state.focusedIndex = getPinKeyIndexFromRowCol(pPin.row, pPin.col - 1);
          handled = true;
        }
      } else if (state.focusedPanel === 'catalog-channels') {
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
      } else if (state.focusedPanel === 'profiles-edit') {
        // Left horizontal edit button navigation
        if (items.length > 0 && state.focusedIndex > 0) {
          state.focusedIndex--;
          handled = true;
        }
      } else if (state.focusedPanel === 'player') {
        if (items.length > 0 && state.focusedIndex > 0) {
          state.focusedIndex--;
          handled = true;
        }
      }
    } else if (code === 39) { // ArrowRight
      if (state.focusedPanel === 'login-wizard') {
        var pos = getWizardRowColFromIndex(state.focusedIndex);
        if (pos.col < pos.rowLength - 1) {
          state.focusedIndex = getWizardIndexFromRowCol(pos.row, pos.col + 1);
          handled = true;
        }
      } else if (state.focusedPanel === 'profile-name-keyboard') {
        var pPos = getProfileKeyboardRowColFromIndex(state.focusedIndex);
        if (pPos.col < pPos.rowLength - 1) {
          state.focusedIndex = getProfileKeyboardIndexFromRowCol(pPos.row, pPos.col + 1);
          handled = true;
        }
      } else if (state.focusedPanel === 'pin-entry-keyboard' || state.focusedPanel === 'profile-pin-keyboard') {
        var pPin = getPinKeyRowColFromIndex(state.focusedIndex);
        if (pPin.col < 2) {
          state.focusedIndex = getPinKeyIndexFromRowCol(pPin.row, pPin.col + 1);
          handled = true;
        }
      } else if (state.focusedPanel === 'catalog-sidebar') {
        if (state.catalogScreen === 'home' && state.focusedIndex === getSidebarFocusIndex('home')) {
          if (state.homeHeroEntry) {
            focusHomeHero(0);
          } else if (document.getElementById('home-rails').querySelectorAll('.focusable').length > 0) {
            state.focusedPanel = 'home-rails';
            state.focusedIndex = 0;
            updateFocusUI();
          } else {
            openHomeView();
          }
          handled = true;
        } else if (state.focusedIndex === getSidebarFocusIndex('home')) {
          openHomeView();
          handled = true;
        } else if (state.focusedIndex === getSidebarFocusIndex('search')) {
          openSearchView();
          handled = true;
        } else if (state.focusedIndex === getSidebarFocusIndex('watchlist')) {
          openWatchlistView();
          handled = true;
        } else if (state.focusedIndex === getSidebarFocusIndex('settings')) {
          openSettingsView();
          handled = true;
        } else if (state.focusedIndex >= getSidebarFocusIndex('live') && state.focusedIndex <= getSidebarFocusIndex('series')) {
          var modes = ['live', 'movies', 'series'];
          var targetMode = modes[state.focusedIndex - getSidebarFocusIndex('live')];
          if (state.catalogMode !== targetMode) {
            loadCatalog(targetMode);
          } else {
            // Same mode but may be coming from search/watchlist/settings,
            // so always ensure the catalog panel is visible.
            showView('view-catalog');
            if (state.categories && state.categories.length > 0) {
              state.focusedPanel = 'catalog-categories';
              state.focusedIndex = getActiveCategoryIndex();
            } else {
              // Keep focus on the sidebar while catalog data is still loading,
              // empty, or failed so D-pad navigation never gets trapped.
              state.focusedPanel = 'catalog-sidebar';
              state.focusedIndex = getSidebarFocusIndex(targetMode);
            }
            updateFocusUI();
          }
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
          // Expand batch if focus is within CATALOG_BATCH_PREFETCH items of the rendered end
          if (state.focusedIndex >= state.channelsBatchSize - CATALOG_BATCH_PREFETCH &&
              state.channelsBatchSize < state.channels.length) {
            appendChannelBatch();
          }
          handled = true;
        }
      } else if (state.focusedPanel === 'profiles') {
        // Right profile selection
        if (items.length > 0 && state.focusedIndex < items.length - 1) {
          state.focusedIndex++;
          handled = true;
        }
      } else if (state.focusedPanel === 'profiles-edit') {
        // Right horizontal edit button navigation
        if (items.length > 0 && state.focusedIndex < items.length - 1) {
          state.focusedIndex++;
          handled = true;
        }
      } else if (state.focusedPanel === 'player') {
        if (items.length > 0 && state.focusedIndex < items.length - 1) {
          state.focusedIndex++;
          handled = true;
        }
      }

    } else if (!handled && code === 13) { // Enter Key
      if (items.length > 0) {
        var activeEl = items[state.focusedIndex];
        if (activeEl) {
          if (state.focusedPanel === 'profile-name-keyboard') {
            handleProfileNameKeyPress(activeEl.getAttribute('data-key'));
          } else if (state.focusedPanel === 'pin-entry-keyboard') {
            handlePinKeyPress(activeEl.getAttribute('data-key'));
          } else if (state.focusedPanel === 'profile-pin-keyboard') {
            handleProfilePinKeyPress(activeEl.getAttribute('data-key'));
          } else {
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

  // Button bindings are registered inside init() to guarantee the DOM is ready.

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
    state.searchLoadingModes = {};
    if (state.searchQueryDebounce) {
      clearTimeout(state.searchQueryDebounce);
      state.searchQueryDebounce = null;
    }
    state.searchCache = {};
    state.watchlistItems = [];
    state.homeCatalogCache = { live: null, movies: null, series: null };
    state.homeSections = [];
    state.homeHeroEntry = null;
    state.channelsCache = {};
    state.channelsCacheCount = {};
    state.channelsBatchSize = CATALOG_BATCH_SIZE;
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
