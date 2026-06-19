(function () {
  // --- LOCAL STORAGE KEYS ---
  var SESSION_KEY = 'smartifly-lg-session';
  var PROFILES_KEY = 'smartifly-lg-profiles';
  var SELECTED_PROFILE_KEY = 'smartifly-lg-selected-profile';
  var PORTAL_KEY = 'smartifly-lg-last-portal';
  var FAVORITES_KEY = 'smartifly-lg-favorites';

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
<<<<<<< HEAD
    focusedPanel: 'welcome', // 'welcome', 'login', 'profiles', 'catalog-sidebar', 'catalog-categories', 'catalog-channels', 'detail-actions', 'detail-seasons', 'detail-episodes', 'search-controls', 'search-results', 'watchlist-controls', 'watchlist-results', 'settings-actions', 'player'
=======
    focusedPanel: 'welcome', // 'welcome', 'login-wizard', 'profiles', 'catalog-sidebar', 'catalog-categories', 'catalog-channels', 'player'
>>>>>>> 86abab6 (ui change)
    focusedIndex: 0, // Index of focused item inside current panel
    activeChannel: null,
    activeChannelQueue: [],
    activeChannelIndex: 0,
<<<<<<< HEAD
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
    searchMode: 'movies',
    searchQuery: '',
    searchResults: [],
    searchCache: {},
    watchlistFilter: 'all',
    watchlistItems: []
  };

  var SIDEBAR_MODE_INDEX = {
    live: 0,
    movies: 1,
    series: 2,
    search: 3,
    watchlist: 4,
    settings: 5,
    profile: 6,
    logout: 7
=======
    wizardStepIndex: 0,
    wizardValues: { portal: '', username: '', password: '' },
    keyboardIsShifted: false,
    keyboardMode: 'letters',
    activationTimer: null,
    activationDeviceId: ''
>>>>>>> 86abab6 (ui change)
  };

  // --- API CLIENT SETUP ---
  var API_BASE_URL = "http://10.20.30.30:5000/v1";

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

<<<<<<< HEAD
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
=======
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
>>>>>>> 86abab6 (ui change)

    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          var res = JSON.parse(xhr.responseText);
<<<<<<< HEAD
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
=======
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
>>>>>>> 86abab6 (ui change)

    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          var res = JSON.parse(xhr.responseText);
<<<<<<< HEAD
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
=======
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
>>>>>>> 86abab6 (ui change)
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

  function saveFavoritesState() {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(state.favorites || {}));
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

  function getBackdropArtwork(item, detailInfo, mode) {
    if (detailInfo && detailInfo.info) {
      if (Array.isArray(detailInfo.info.backdrop_path) && detailInfo.info.backdrop_path.length > 0) {
        return detailInfo.info.backdrop_path[0];
      }
      if (detailInfo.info.cover_big) return detailInfo.info.cover_big;
      if (detailInfo.info.movie_image) return detailInfo.info.movie_image;
    }
    return getCatalogItemArtwork(item, mode);
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
        seasonLookup[key] = {
          key: key,
          label: seasonEntry.name || ('Season ' + key),
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
          label: 'Season ' + seasonKey,
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
    var sidebarIds = ['sidebar-live', 'sidebar-movies', 'sidebar-series', 'sidebar-search', 'sidebar-watchlist', 'sidebar-settings'];

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

  function getCatalogItemName(item) {
    return item && item.name ? item.name : 'Untitled';
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
    var backdrop = document.getElementById('content-detail-backdrop');
    var artwork = getCatalogItemArtwork(item, mode);
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

    if (backdropArt) {
      backdrop.style.backgroundImage =
        'linear-gradient(90deg, rgba(7, 9, 15, 0.96) 0%, rgba(7, 9, 15, 0.9) 34%, rgba(7, 9, 15, 0.7) 55%, rgba(7, 9, 15, 0.92) 100%), ' +
        'linear-gradient(180deg, rgba(7, 9, 15, 0.15) 0%, rgba(7, 9, 15, 0.82) 100%), ' +
        'url("' + String(backdropArt).replace(/"/g, '%22') + '")';
    } else {
      backdrop.style.backgroundImage =
        'linear-gradient(90deg, rgba(7, 9, 15, 0.96) 0%, rgba(7, 9, 15, 0.9) 34%, rgba(7, 9, 15, 0.7) 55%, rgba(7, 9, 15, 0.92) 100%), ' +
        'linear-gradient(180deg, rgba(7, 9, 15, 0.15) 0%, rgba(7, 9, 15, 0.82) 100%)';
    }

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

  function renderDetailEpisodes() {
    var container = document.getElementById('detail-episodes');
    container.innerHTML = '';

    if (!state.detailEpisodes.length) {
      container.innerHTML = '<div class="content-detail-empty">No episodes available for this season.</div>';
      return;
    }

    for (var i = 0; i < state.detailEpisodes.length; i++) {
      var episode = state.detailEpisodes[i];
      var button = document.createElement('button');
      button.className = 'focusable content-detail-episode-card';
      button.setAttribute('tabindex', '-1');
      button.setAttribute('data-index', i);

      var summary = stripHtml((episode.info && episode.info.plot) || episode.plot || '');
      if (summary.length > 180) summary = summary.slice(0, 180) + '...';

      var html = '<div class="content-detail-episode-label">EPISODE</div>';
      html += '<div class="content-detail-episode-title">' + escapeHtml(getEpisodeTitle(episode, i)) + '</div>';
      if (getEpisodeMeta(episode)) {
        html += '<div class="content-detail-episode-meta">' + escapeHtml(getEpisodeMeta(episode)) + '</div>';
      }
      if (summary) {
        html += '<div class="content-detail-episode-summary">' + escapeHtml(summary) + '</div>';
      }
      button.innerHTML = html;

      button.onclick = function () {
        var idx = parseInt(this.getAttribute('data-index'), 10);
        playSeriesEpisode(state.detailEpisodes[idx], getCatalogItemName(state.detailItem));
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
    state.detailInfo = detailInfo || null;
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

  function applySearchModeButtonState() {
    var ids = ['search-mode-live', 'search-mode-movies', 'search-mode-series'];
    for (var i = 0; i < ids.length; i++) {
      var el = document.getElementById(ids[i]);
      if (!el) continue;
      el.classList.remove('active');
    }
    var activeEl = document.getElementById('search-mode-' + state.searchMode);
    if (activeEl) activeEl.classList.add('active');
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
      item && item.genre ? item.genre : '',
      getCatalogItemSummary(item, mode)
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

  function renderSearchResults() {
    var container = document.getElementById('search-results-grid');
    var summary = document.getElementById('search-summary');
    container.innerHTML = '';

    if (!state.searchQuery) {
      summary.textContent = 'Choose a content type, enter a title, and search the portal catalog.';
      container.innerHTML = '<div class="utility-empty">Enter a search term to begin.</div>';
      return;
    }

    if (!state.searchResults.length) {
      summary.textContent = 'No ' + getContentTypeLabel(state.searchMode).toLowerCase() + ' results matched "' + state.searchQuery + '".';
      container.innerHTML = '<div class="utility-empty">No results found. Try a shorter title or switch content type.</div>';
      return;
    }

    summary.textContent = state.searchResults.length + ' result' + (state.searchResults.length === 1 ? '' : 's') + ' in ' + getContentTypeLabel(state.searchMode) + ' for "' + state.searchQuery + '".';

    for (var i = 0; i < state.searchResults.length; i++) {
      container.appendChild(createMediaCard(state.searchResults[i], state.searchMode, i, function (idx) {
        if (state.searchMode === 'live') {
          playChannel(state.searchResults[idx], state.searchResults);
        } else {
          showContentDetail(state.searchResults[idx], state.searchMode);
        }
      }));
    }
  }

  function executeSearch() {
    var queryInput = document.getElementById('search-query-input');
    var query = queryInput ? queryInput.value.trim() : '';
    var config = getCatalogConfig(state.searchMode);
    var container = document.getElementById('search-results-grid');

    state.searchQuery = query;
    state.searchResults = [];
    state.focusedPanel = 'search-controls';
    state.focusedIndex = 0;
    applySearchModeButtonState();

    if (!query) {
      renderSearchResults();
      updateFocusUI();
      return;
    }

    container.innerHTML = '<div class="utility-empty">Searching ' + config.sectionLabel.toLowerCase() + '...</div>';
    document.getElementById('search-summary').textContent = 'Scanning the full ' + config.sectionLabel.toLowerCase() + ' catalog for "' + query + '".';

    function applyResults(items) {
      state.searchCache[state.searchMode] = items;
      state.searchResults = filterSearchItems(items, query, state.searchMode);
      renderSearchResults();
      updateFocusUI();
    }

    if (state.searchCache[state.searchMode]) {
      applyResults(state.searchCache[state.searchMode]);
      return;
    }

    config.loadItems(state.session.portalBaseUrl, state.session.username, state.session.userInfo.password, '', function (items) {
      applyResults(items || []);
    }, function (err) {
      container.innerHTML = '<div class="utility-empty">' + escapeHtml(err || 'Search failed') + '</div>';
      document.getElementById('search-summary').textContent = 'Search failed for ' + config.sectionLabel.toLowerCase() + '.';
      updateFocusUI();
    });
  }

  function openSearchView() {
    setSidebarActiveById('sidebar-search');
    showView('view-search');
    state.focusedPanel = 'search-controls';
    state.focusedIndex = 0;
    document.getElementById('search-query-input').value = state.searchQuery || '';
    applySearchModeButtonState();
    renderSearchResults();
    updateFocusUI();
  }

  function setSearchMode(mode) {
    state.searchMode = mode;
    applySearchModeButtonState();
    if (state.searchQuery) {
      executeSearch();
    } else {
      renderSearchResults();
      updateFocusUI();
    }
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
    showView('view-catalog');
    state.focusedPanel = 'catalog-sidebar';
    state.focusedIndex = getSidebarFocusIndex(sidebarKey || state.catalogMode);
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
        state.profiles = JSON.parse(savedProfiles);
      }
    } catch (e) {
      console.error('Failed to load local storage state:', e);
    }

    loadFavoritesState();
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
    
    // Check if session exists
    if (state.session) {
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
        loadCatalog();
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
    var code = state.wizardValues.portal;
    var user = state.wizardValues.username;
    var pass = state.wizardValues.password;
    var statusNode = document.getElementById('login-wizard-status');

    statusNode.textContent = 'Validating server code...';
    statusNode.style.color = '#fff';

    apiValidatePortalCode(code, function (portal) {
      statusNode.textContent = 'Connecting to ' + portal.name + '...';
      apiAuthenticate(portal.baseUrl, user, pass, function (authRes) {
        statusNode.textContent = 'Authenticated. Setting up...';
        statusNode.style.color = '#ffaa00';
        
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
        
        setupProfilesView();
      }, function (err) {
        statusNode.textContent = err;
        statusNode.style.color = '#ff3344';
      });
    }, function (err) {
      statusNode.textContent = err;
      statusNode.style.color = '#ff3344';
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
          qrImg.src = session.qrCode;
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
  function setupProfilesView() {
    state.focusedPanel = 'profiles';
    state.focusedIndex = 0;
    
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
      avatar.className = 'profile-avatar' + (profile.isKids ? ' kids' : '');
      avatar.textContent = profile.avatarSeed;
      
      var name = document.createElement('div');
      name.className = 'profile-name';
      name.textContent = profile.name;
      
      card.appendChild(avatar);
      card.appendChild(name);
      
      card.onclick = function (e) {
        var idx = parseInt(this.getAttribute('data-index'), 10);
        selectProfile(state.profiles[idx]);
      };
      
      container.appendChild(card);
    }

    showView('view-profiles');
    updateFocusUI();
  }

  function selectProfile(profile) {
    state.selectedProfile = profile;
    saveSelectedProfile(profile);
    loadCatalog(state.catalogMode);
  }

  // --- CATALOG CONTROLLER ---
  function loadCatalog(mode) {
    if (mode) {
      state.catalogMode = mode;
    }

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

  function playStream(streamId) {
    cleanupHls();

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
    rememberPlayerReturnState();
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
    rememberPlayerReturnState();
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

  function playDetailPrimary() {
    if (!state.detailItem) return;

    if (state.detailMode === 'series') {
      if (!state.detailEpisodes.length && state.detailSeasons.length) {
        state.detailEpisodes = getEpisodesForSeason(state.detailInfo, state.detailSeasons[state.detailSelectedSeasonIndex].key);
      }
      if (state.detailEpisodes.length) {
        playSeriesEpisode(state.detailEpisodes[0], getCatalogItemName(state.detailItem));
      }
      return;
    }

    playMovie(state.detailItem, state.detailInfo);
  }

  function closePlayer() {
    cleanupHls();
    var video = document.getElementById('player-video');
    try {
      video.pause();
      video.src = '';
    } catch (e) {}

    state.focusedPanel = state.playerReturnPanel || 'catalog-channels';
    state.focusedIndex = state.playerReturnIndex || 0;

    if ((state.playerReturnViewId || 'view-catalog') === 'view-catalog') {
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
    if (state.focusedPanel === 'login' || state.focusedPanel === 'login-wizard') {
      return document.getElementById('view-login').querySelectorAll('.focusable');
    }
    if (state.focusedPanel === 'profiles') {
      return document.getElementById('profiles-list-container').querySelectorAll('.focusable');
    }
    if (state.focusedPanel === 'catalog-sidebar') {
      return document.querySelector('.sidebar-menu').querySelectorAll('.focusable');
    }
    if (state.focusedPanel === 'catalog-categories') {
      return document.getElementById('categories-panel-list').querySelectorAll('.focusable');
    }
    if (state.focusedPanel === 'catalog-channels') {
      return document.getElementById('channels-grid-list').querySelectorAll('.focusable');
    }
<<<<<<< HEAD
    if (state.focusedPanel === 'detail-actions') {
      return document.getElementById('detail-actions').querySelectorAll('.focusable');
    }
    if (state.focusedPanel === 'detail-seasons') {
      return document.getElementById('detail-seasons').querySelectorAll('.focusable');
    }
    if (state.focusedPanel === 'detail-episodes') {
      return document.getElementById('detail-episodes').querySelectorAll('.focusable');
    }
    if (state.focusedPanel === 'search-controls') {
      return document.getElementById('search-controls').querySelectorAll('.focusable');
    }
    if (state.focusedPanel === 'search-results') {
      return document.getElementById('search-results-grid').querySelectorAll('.focusable');
    }
    if (state.focusedPanel === 'watchlist-controls') {
      return document.getElementById('watchlist-controls').querySelectorAll('.focusable');
    }
    if (state.focusedPanel === 'watchlist-results') {
      return document.getElementById('watchlist-results-grid').querySelectorAll('.focusable');
    }
    if (state.focusedPanel === 'settings-actions') {
      return document.getElementById('settings-actions').querySelectorAll('.focusable');
=======
    if (state.focusedPanel === 'keyboard') {
      return document.getElementById('keyboard-keys-grid').querySelectorAll('.focusable');
    }
    if (state.focusedPanel === 'activation') {
      return document.getElementById('view-activation').querySelectorAll('.focusable');
>>>>>>> 86abab6 (ui change)
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
      }
      
      // Auto-scroll views for catalog scroll containers
      if (state.focusedPanel === 'catalog-categories') {
        scrollIntoViewIfNeeded(document.getElementById('categories-panel-list'), focusedEl);
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
        scrollIntoViewIfNeeded(document.getElementById('search-results-scroll'), focusedEl);
      } else if (state.focusedPanel === 'watchlist-results') {
        scrollIntoViewIfNeeded(document.getElementById('watchlist-results-scroll'), focusedEl);
      }
    }
  }

  function scrollIntoViewIfNeeded(container, element) {
    var containerTop = container.scrollTop;
    var containerBottom = containerTop + container.clientHeight;
    var elemTop = element.offsetTop;
    var elemBottom = elemTop + element.clientHeight;

    if (elemTop < containerTop) {
      container.scrollTop = elemTop;
    } else if (elemBottom > containerBottom) {
      container.scrollTop = elemBottom - container.clientHeight;
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
    return panel === 'search-controls' || panel === 'search-results';
  }

  function isWatchlistPanel(panel) {
    return panel === 'watchlist-controls' || panel === 'watchlist-results';
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
      if (code === 38) {
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
      } else if (code === 40 && state.focusedIndex < items.length - 1) {
        state.focusedIndex++;
        handled = true;
      } else if (code === 37) {
        if (hasDetailSeasons()) {
          state.focusedPanel = 'detail-seasons';
          state.focusedIndex = state.detailSelectedSeasonIndex;
        } else {
          state.focusedPanel = 'detail-actions';
          state.focusedIndex = 0;
        }
        handled = true;
      }
      return handled;
    }

    return handled;
  }

  function handleSearchNavigation(code, items) {
    var handled = false;
    var gridColumns = getModeGridColumnCount(state.searchMode);

    if (state.focusedPanel === 'search-controls') {
      if (code === 37 && state.focusedIndex > 0) {
        state.focusedIndex--;
        handled = true;
      } else if (code === 39 && state.focusedIndex < items.length - 1) {
        state.focusedIndex++;
        handled = true;
      } else if (code === 40 && state.searchResults.length > 0) {
        state.focusedPanel = 'search-results';
        state.focusedIndex = 0;
        handled = true;
      }
      return handled;
    }

    if (state.focusedPanel === 'search-results') {
      if (code === 38) {
        if (state.focusedIndex >= gridColumns) {
          state.focusedIndex -= gridColumns;
        } else {
          state.focusedPanel = 'search-controls';
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
      if (state.focusedPanel === 'login-wizard') {
        if (code === 8) {
          // PC backspace: delete character in wizard keyboard
          handleWizardKeyPress('Backspace');
        } else {
          // webOS back/Escape: go back a step or return to welcome
          handleWizardKeyPress('Back');
        }
        handled = true;
      } else if (state.focusedPanel === 'player') {
        closePlayer();
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
      } else if (state.focusedPanel === 'settings-actions') {
        returnToCatalogSidebar('settings');
        handled = true;
      } else if (state.focusedPanel === 'catalog-categories' || state.focusedPanel === 'catalog-channels' || state.focusedPanel === 'catalog-sidebar') {
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

    var items = getFocusableElements();
    var gridColumns = getCatalogGridColumnCount();

    if (isDetailPanel(state.focusedPanel)) {
      handled = handleDetailNavigation(code, items);
    } else if (isSearchPanel(state.focusedPanel)) {
      handled = handleSearchNavigation(code, items);
    } else if (isWatchlistPanel(state.focusedPanel)) {
      handled = handleWatchlistNavigation(code, items);
    }

    if (!handled && code === 38) { // ArrowUp
      if (items.length > 0) {
<<<<<<< HEAD
        if (state.focusedPanel === 'catalog-channels') {
          // Grid navigation: move one row up
          if (state.focusedIndex >= gridColumns) {
            state.focusedIndex -= gridColumns;
=======
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
        } else if (state.focusedPanel === 'catalog-channels') {
          // 4-column grid: go up by 4 items
          if (state.focusedIndex >= 4) {
            state.focusedIndex -= 4;
>>>>>>> 86abab6 (ui change)
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
<<<<<<< HEAD
        if (state.focusedPanel === 'catalog-channels') {
          // Grid navigation: move one row down
          if (state.focusedIndex + gridColumns < items.length) {
            state.focusedIndex += gridColumns;
=======
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
        } else if (state.focusedPanel === 'catalog-channels') {
          // 4-column grid: go down by 4 items
          if (state.focusedIndex + 4 < items.length) {
            state.focusedIndex += 4;
>>>>>>> 86abab6 (ui change)
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
<<<<<<< HEAD
    } else if (!handled && code === 37) { // ArrowLeft
      if (state.focusedPanel === 'catalog-channels') {
=======
    } else if (code === 37) { // ArrowLeft
      if (state.focusedPanel === 'login-wizard') {
        var pos = getWizardRowColFromIndex(state.focusedIndex);
        if (pos.col > 0) {
          state.focusedIndex = getWizardIndexFromRowCol(pos.row, pos.col - 1);
          handled = true;
        }
      } else if (state.focusedPanel === 'catalog-channels') {
>>>>>>> 86abab6 (ui change)
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
      }
<<<<<<< HEAD
    } else if (!handled && code === 39) { // ArrowRight
      if (state.focusedPanel === 'catalog-sidebar') {
=======
    } else if (code === 39) { // ArrowRight
      if (state.focusedPanel === 'login-wizard') {
        var pos = getWizardRowColFromIndex(state.focusedIndex);
        if (pos.col < pos.rowLength - 1) {
          state.focusedIndex = getWizardIndexFromRowCol(pos.row, pos.col + 1);
          handled = true;
        }
      } else if (state.focusedPanel === 'catalog-sidebar') {
>>>>>>> 86abab6 (ui change)
        // Go to categories
        if (state.categories.length > 0 && state.focusedIndex <= 2) {
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
      }
    } else if (code === 13) { // Enter Key
      if (items.length > 0) {
        var activeEl = items[state.focusedIndex];
        if (activeEl) {
          activeEl.click();
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

  document.getElementById('welcome-btn-create').onclick = function () {
    setupActivationView();
  };

  document.getElementById('activation-btn-cancel').onclick = function () {
    cleanupActivation();
    setupWelcomeView();
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

  document.getElementById('search-btn-submit').onclick = function () {
    executeSearch();
  };

  document.getElementById('search-mode-live').onclick = function () {
    setSearchMode('live');
  };

  document.getElementById('search-mode-movies').onclick = function () {
    setSearchMode('movies');
  };

  document.getElementById('search-mode-series').onclick = function () {
    setSearchMode('series');
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
    state.searchMode = 'movies';
    state.searchQuery = '';
    state.searchResults = [];
    state.searchCache = {};
    state.watchlistItems = [];
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
