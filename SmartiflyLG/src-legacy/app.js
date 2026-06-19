(function () {
  // --- LOCAL STORAGE KEYS ---
  var SESSION_KEY = 'smartifly-lg-session';
  var PROFILES_KEY = 'smartifly-lg-profiles';
  var SELECTED_PROFILE_KEY = 'smartifly-lg-selected-profile';
  var PORTAL_KEY = 'smartifly-lg-last-portal';

  // --- EPG STATE & TIMER ---
  var epgTimer = null;
  var hlsInstance = null;

  // --- STATE DEFINITION ---
  var state = {
    session: null,
    profiles: [],
    selectedProfile: null,
    categories: [],
    channels: [],
    selectedCategoryId: '',
    selectedCategoryName: '',
    focusedPanel: 'welcome', // 'welcome', 'login', 'profiles', 'catalog-sidebar', 'catalog-categories', 'catalog-channels', 'player'
    focusedIndex: 0, // Index of focused item inside current panel
    activeChannel: null,
    activeChannelQueue: [],
    activeChannelIndex: 0
  };

  // --- API CLIENT SETUP ---
  var API_BASE_URL = 'https://api.smartifly.co/v1';

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
    state.focusedPanel = 'login';
    state.focusedIndex = 0;
    
    // Autofill last portal code if available
    var lastPortal = localStorage.getItem(PORTAL_KEY);
    if (lastPortal) {
      document.getElementById('login-code').value = lastPortal;
    }
    
    document.getElementById('login-user').value = '';
    document.getElementById('login-pass').value = '';
    document.getElementById('login-status').textContent = '';
    
    showView('view-login');
    updateFocusUI();
  }

  function executeLogin() {
    var code = document.getElementById('login-code').value;
    var user = document.getElementById('login-user').value;
    var pass = document.getElementById('login-pass').value;
    var statusNode = document.getElementById('login-status');

    if (!code || !user || !pass) {
      statusNode.textContent = 'All fields are required';
      return;
    }

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
      avatar.className = 'profile-avatar';
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
    loadCatalog();
  }

  // --- CATALOG CONTROLLER ---
  function loadCatalog() {
    showView('view-catalog');
    state.focusedPanel = 'catalog-categories';
    state.focusedIndex = 0;
    
    var catNode = document.getElementById('categories-panel-list');
    catNode.innerHTML = '<div style="color:rgba(255,255,255,0.4); padding: 20px;">Loading categories...</div>';
    
    apiGetCategories(state.session.portalBaseUrl, state.session.username, state.session.userInfo.password, function (cats) {
      state.categories = cats;
      renderCategories();
      if (cats.length > 0) {
        selectCategory(cats[0].category_id);
      } else {
        var grid = document.getElementById('channels-grid-list');
        grid.innerHTML = '<div style="color:rgba(255,255,255,0.4); padding: 20px;">No categories found</div>';
        // Fallback focus to sidebar if no categories
        state.focusedPanel = 'catalog-sidebar';
        state.focusedIndex = 0;
        updateFocusUI();
      }
    }, function (err) {
      state.categories = [];
      catNode.innerHTML = '<div style="color:#ff3344; padding: 20px;">' + err + '</div>';
      var grid = document.getElementById('channels-grid-list');
      grid.innerHTML = '<div style="color:rgba(255,255,255,0.4); padding: 20px;">No channels loaded</div>';
      // Fallback focus to sidebar on error
      state.focusedPanel = 'catalog-sidebar';
      state.focusedIndex = 0;
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
    state.selectedCategoryId = categoryId;
    
    // Find category name
    for (var i = 0; i < state.categories.length; i++) {
      if (state.categories[i].category_id === categoryId) {
        state.selectedCategoryName = state.categories[i].category_name;
        break;
      }
    }
    
    document.getElementById('details-category-name').textContent = state.selectedCategoryName.toUpperCase();
    document.getElementById('details-channel-name').textContent = 'Loading Channels...';
    document.getElementById('details-epg-info').textContent = 'Please wait...';
    
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
    grid.innerHTML = '<div style="color:rgba(255,255,255,0.4); padding: 20px;">Loading channels...</div>';

    apiGetStreams(state.session.portalBaseUrl, state.session.username, state.session.userInfo.password, categoryId, function (streams) {
      state.channels = streams;
      renderChannels();
      updateFocusUI();
    }, function (err) {
      state.channels = [];
      grid.innerHTML = '<div style="color:#ff3344; padding: 20px;">' + err + '</div>';
      
      document.getElementById('details-channel-name').textContent = 'Error Loading Channels';
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
    var container = document.getElementById('channels-grid-list');
    container.innerHTML = '';

    if (state.channels.length === 0) {
      container.innerHTML = '<div style="color:rgba(255,255,255,0.4); padding: 20px;">No channels in this category</div>';
      
      document.getElementById('details-channel-name').textContent = 'No Channels';
      document.getElementById('details-epg-info').textContent = 'This category contains no channels.';
      return;
    }

    // Set default header details to the first channel in the loaded list
    var firstCh = state.channels[0];
    document.getElementById('details-category-name').textContent = state.selectedCategoryName.toUpperCase();
    document.getElementById('details-channel-name').textContent = firstCh.name;
    document.getElementById('details-epg-info').innerHTML = '<div style="color: rgba(255,255,255,0.4); font-size:14px;">Loading guide...</div>';
    
    if (epgTimer) {
      clearTimeout(epgTimer);
    }
    fetchEPGForChannel(firstCh);

    for (var i = 0; i < state.channels.length; i++) {
      var ch = state.channels[i];
      var card = document.createElement('div');
      card.className = 'channel-card focusable';
      card.setAttribute('tabindex', '-1');
      if (state.activeChannel && String(state.activeChannel.stream_id) === String(ch.stream_id)) {
        card.className += ' active';
      }
      card.setAttribute('data-id', ch.stream_id);
      card.setAttribute('data-index', i);
      card.setAttribute('data-name', ch.name);
      
      // LIVE badge in top-left
      var liveBadge = document.createElement('div');
      liveBadge.className = 'channel-live-badge';
      liveBadge.textContent = 'LIVE';
      card.appendChild(liveBadge);
      
      var logoWrap = document.createElement('div');
      logoWrap.className = 'channel-logo-container';
      
      if (ch.stream_icon) {
        var img = document.createElement('img');
        img.src = ch.stream_icon;
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
        playChannel(state.channels[idx]);
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

  function playChannel(channel) {
    state.activeChannel = channel;
    state.activeChannelQueue = state.channels;
    
    state.activeChannelIndex = 0;
    for (var i = 0; i < state.channels.length; i++) {
      if (state.channels[i].stream_id === channel.stream_id) {
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

  function closePlayer() {
    cleanupHls();
    var video = document.getElementById('player-video');
    try {
      video.pause();
      video.src = '';
    } catch (e) {}
    
    state.focusedPanel = 'catalog-channels';
    
    var cards = document.querySelectorAll('.channel-card');
    for (var i = 0; i < cards.length; i++) {
      var id = cards[i].getAttribute('data-id');
      if (state.activeChannel && String(id) === String(state.activeChannel.stream_id)) {
        cards[i].classList.add('active');
      } else {
        cards[i].classList.remove('active');
      }
    }
    
    showView('view-catalog');
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
    if (state.focusedPanel === 'catalog-sidebar') {
      return document.querySelector('.sidebar-menu').querySelectorAll('.focusable');
    }
    if (state.focusedPanel === 'catalog-categories') {
      return document.getElementById('categories-panel-list').querySelectorAll('.focusable');
    }
    if (state.focusedPanel === 'catalog-channels') {
      return document.getElementById('channels-grid-list').querySelectorAll('.focusable');
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
        
        // Dynamically update channels header details
        var currentCh = state.channels[state.focusedIndex];
        if (currentCh) {
          document.getElementById('details-category-name').textContent = state.selectedCategoryName.toUpperCase();
          document.getElementById('details-channel-name').textContent = currentCh.name;
          document.getElementById('details-epg-info').innerHTML = '<div style="color: rgba(255,255,255,0.4); font-size:14px;">Loading guide...</div>';
          
          if (epgTimer) {
            clearTimeout(epgTimer);
          }
          epgTimer = setTimeout(function () {
            fetchEPGForChannel(currentCh);
          }, 300);
        }
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

  // KEYBOARD OR TELEVISION REMOTE CONTROLLER HANDLER
  window.addEventListener('keydown', function (event) {
    var code = event.keyCode || event.which;
    var handled = false;

    // Handle back button separately across panels
    if (code === 8 || code === 461 || code === 27) { // Backspace, webOS Back, Escape
      if (state.focusedPanel === 'player') {
        closePlayer();
        handled = true;
      } else if (state.focusedPanel === 'login') {
        setupWelcomeView();
        handled = true;
      } else if (state.focusedPanel === 'profiles') {
        // Log out / return to login
        logoutUser();
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

    if (code === 38) { // ArrowUp
      if (items.length > 0) {
        if (state.focusedPanel === 'catalog-channels') {
          // 4-column grid: go up by 4 items
          if (state.focusedIndex >= 4) {
            state.focusedIndex -= 4;
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
    } else if (code === 40) { // ArrowDown
      if (items.length > 0) {
        if (state.focusedPanel === 'catalog-channels') {
          // 4-column grid: go down by 4 items
          if (state.focusedIndex + 4 < items.length) {
            state.focusedIndex += 4;
            handled = true;
          } else {
            // If we are not on the last row, let's go to the last item
            var currentRow = Math.floor(state.focusedIndex / 4);
            var totalRows = Math.ceil(items.length / 4);
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
      if (state.focusedPanel === 'catalog-channels') {
        // Grid left navigation
        if (items.length > 0 && state.focusedIndex % 4 > 0) {
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
        state.focusedIndex = 0; // default focus on 'Live TV'
        handled = true;
      } else if (state.focusedPanel === 'profiles') {
        // Left horizontal profile selection
        if (items.length > 0 && state.focusedIndex > 0) {
          state.focusedIndex--;
          handled = true;
        }
      }
    } else if (code === 39) { // ArrowRight
      if (state.focusedPanel === 'catalog-sidebar') {
        // Go to categories
        if (state.categories.length > 0) {
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
        if (items.length > 0 && state.focusedIndex % 4 < 3 && state.focusedIndex < items.length - 1) {
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
    setupWelcomeView();
  };

  document.getElementById('sidebar-live').onclick = function () {
    // Already in Live view, reload catalog
    loadCatalog();
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
