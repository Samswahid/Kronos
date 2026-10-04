/**
 * KRONOS — Unified Storage & Sync Engine
 * Handles persistent storage via Node.js fs (C:\Users\Admin\AppData\Local\NeoGraphs\Kronos)
 * with graceful localStorage fallback, plus CEP cross-window event synchronization.
 */

(function (window) {
  'use strict';

  const KRONOS_DIR = "C:\\Users\\Admin\\AppData\\Local\\NeoGraphs\\Kronos";
  const PREFS_FILE = KRONOS_DIR + "\\preferences.json";
  const SESSIONS_FILE = KRONOS_DIR + "\\sessions.json";

  const THEME_DEFAULTS = {
    'charcoal': {
      clockBg: '#0d0d0f',
      plateColor: '#232326',
      fontColor: '#e2e2e5',
      pluginBg: '#141414',
      accentColor: '#d97706'
    },
    'neon-lilac': {
      clockBg: '#100c24',
      plateColor: '#2b2454',
      fontColor: '#f0ebff',
      pluginBg: '#120e24',
      accentColor: '#9b8bf4'
    },
    'braun-1972': {
      clockBg: '#201f1e',
      plateColor: '#272625',
      fontColor: '#f7f4ed',
      pluginBg: '#ece6da',
      accentColor: '#ea580c'
    },
    'cyber-violet': {
      clockBg: '#08080b',
      plateColor: '#161622',
      fontColor: '#a89eff',
      pluginBg: '#09090c',
      accentColor: '#7969ef'
    },
    'kyoto-matcha': {
      clockBg: '#18201c',
      plateColor: '#2b4238',
      fontColor: '#ede2cf',
      pluginBg: '#1f2421',
      accentColor: '#c29b62'
    },
    'cobalt-runner': {
      clockBg: '#0e131a',
      plateColor: '#1c7ed6',
      fontColor: '#ffffff',
      pluginBg: '#11161d',
      accentColor: '#ff6b18'
    },
    'solar-ochre': {
      clockBg: '#111114',
      plateColor: '#f59f00',
      fontColor: '#121212',
      pluginBg: '#18181b',
      accentColor: '#fa5252'
    }
  };

  const DEFAULT_CONFIG = {
    focusDurationMin: 25,
    shortBreakDurationMin: 5,
    longBreakDurationMin: 15,
    lapsPerCycle: 4,
    soundEffects: true,
    chimeEnd: true,
    softTick: false,
    theme: 'charcoal',
    themeCustomColors: {},
    storagePath: KRONOS_DIR
  };

  const DEFAULT_SESSIONS = [];

  let fs = null;
  let path = null;

  try {
    if (typeof window.require === 'function') {
      fs = window.require('fs');
      path = window.require('path');
    }
  } catch (e) {
    // Standard browser fallback
  }

  function ensureDirectory() {
    if (!fs) return;
    try {
      if (!fs.existsSync(KRONOS_DIR)) {
        fs.mkdirSync(KRONOS_DIR, { recursive: true });
      }
    } catch (e) {
      console.warn("[Kronos] Could not create directory:", e);
    }
  }

  const KronosStorage = {
    getPrefs: function () {
      if (fs) {
        try {
          ensureDirectory();
          if (fs.existsSync(PREFS_FILE)) {
            const raw = fs.readFileSync(PREFS_FILE, 'utf8');
            return Object.assign({}, DEFAULT_CONFIG, JSON.parse(raw));
          }
        } catch (e) {
          console.warn("[Kronos] Error reading prefs file:", e);
        }
      }
      try {
        const raw = localStorage.getItem('kronos_config');
        if (raw) return Object.assign({}, DEFAULT_CONFIG, JSON.parse(raw));
      } catch (e) {}
      return Object.assign({}, DEFAULT_CONFIG);
    },

    getTheme: function () {
      const prefs = this.getPrefs();
      return prefs.theme || 'charcoal';
    },

    setTheme: function (themeName) {
      const prefs = this.getPrefs();
      prefs.theme = themeName;
      this.savePrefs(prefs);
      this.broadcastSync("theme", { theme: themeName, colors: this.getThemeColors(themeName) });
      return themeName;
    },

    THEME_DEFAULTS: THEME_DEFAULTS,

    getThemeColors: function (themeName) {
      const themeId = themeName || this.getTheme();
      const defaults = THEME_DEFAULTS[themeId] || THEME_DEFAULTS['charcoal'];
      const prefs = this.getPrefs();
      const customMap = prefs.themeCustomColors || {};
      const custom = customMap[themeId] || {};
      return Object.assign({}, defaults, custom);
    },

    setThemeColor: function (themeId, colorKey, hexColor) {
      const prefs = this.getPrefs();
      if (!prefs.themeCustomColors) prefs.themeCustomColors = {};
      if (!prefs.themeCustomColors[themeId]) prefs.themeCustomColors[themeId] = {};
      prefs.themeCustomColors[themeId][colorKey] = hexColor;
      this.savePrefs(prefs);
      const effective = this.getThemeColors(themeId);
      this.broadcastSync("theme_color", { themeId: themeId, colorKey: colorKey, color: hexColor, colors: effective });
      return effective;
    },

    resetThemeColors: function (themeId) {
      const prefs = this.getPrefs();
      if (prefs.themeCustomColors && prefs.themeCustomColors[themeId]) {
        delete prefs.themeCustomColors[themeId];
        this.savePrefs(prefs);
      }
      const resetColors = Object.assign({}, THEME_DEFAULTS[themeId] || THEME_DEFAULTS['charcoal']);
      this.broadcastSync("theme_reset", { themeId: themeId, colors: resetColors });
      return resetColors;
    },

    getAllThemeColors: function () {
      const result = {};
      Object.keys(THEME_DEFAULTS).forEach(id => {
        result[id] = this.getThemeColors(id);
      });
      return result;
    },

    savePrefs: function (prefs) {
      const merged = Object.assign({}, DEFAULT_CONFIG, prefs);
      if (fs) {
        try {
          ensureDirectory();
          fs.writeFileSync(PREFS_FILE, JSON.stringify(merged, null, 2), 'utf8');
        } catch (e) {
          console.warn("[Kronos] Error writing prefs file:", e);
        }
      }
      try {
        localStorage.setItem('kronos_config', JSON.stringify(merged));
      } catch (e) {}
      this.broadcastSync("prefs", merged);
      return merged;
    },

    getSessions: function () {
      if (fs) {
        try {
          ensureDirectory();
          if (fs.existsSync(SESSIONS_FILE)) {
            const raw = fs.readFileSync(SESSIONS_FILE, 'utf8');
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed;
          }
        } catch (e) {
          console.warn("[Kronos] Error reading sessions file:", e);
        }
      }
      try {
        const raw = localStorage.getItem('kronos_sessions');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch (e) {}
      return DEFAULT_SESSIONS.slice();
    },

    saveSessions: function (sessionsList) {
      if (fs) {
        try {
          ensureDirectory();
          fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessionsList, null, 2), 'utf8');
        } catch (e) {
          console.warn("[Kronos] Error writing sessions file:", e);
        }
      }
      try {
        localStorage.setItem('kronos_sessions', JSON.stringify(sessionsList));
      } catch (e) {}
      this.broadcastSync("sessions", sessionsList);
      return sessionsList;
    },

    addSession: function (sessionObj) {
      const list = this.getSessions();
      list.unshift(sessionObj);
      this.saveSessions(list);
      return list;
    },

    deleteSession: function (sessionId) {
      let list = this.getSessions();
      list = list.filter(s => s.id !== sessionId);
      this.saveSessions(list);
      return list;
    },

    updateTitle: function (sessionId, newTitle) {
      const list = this.getSessions();
      const target = list.find(s => s.id === sessionId);
      if (target) {
        target.title = newTitle;
        this.saveSessions(list);
      }
      return list;
    },

    clearSessions: function () {
      this.saveSessions([]);
      return [];
    },

    broadcastSync: function (type, data) {
      const payload = Object.assign({ type: type, timestamp: Date.now() }, typeof data === 'object' ? data : {});
      const jsonStr = JSON.stringify(payload);

      // 1. BroadcastChannel (Instant sub-ms inter-window communication in modern Chromium/CEF)
      try {
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel('kronos_sync_bus');
          bc.postMessage(payload);
          bc.close();
        }
      } catch (e) {}

      // 2. Adobe CEP native CSEvent
      try {
        if (window.__adobe_cep__ && typeof CSEvent !== 'undefined') {
          const event = new CSEvent("com.neographs.kronos.sync", "APPLICATION");
          event.data = jsonStr;
          new CSInterface().dispatchEvent(event);
        }
      } catch (e) {}

      // 3. localStorage pulse
      try {
        localStorage.setItem('kronos_sync_pulse', jsonStr);
      } catch (e) {}
    },

    onSync: function (callback) {
      if (typeof callback !== 'function') return;

      // 1. BroadcastChannel Listener
      try {
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel('kronos_sync_bus');
          bc.onmessage = function (event) {
            if (event && event.data) {
              callback(event.data);
            }
          };
        }
      } catch (e) {}

      // 2. Adobe CEP Native Listener
      try {
        if (window.__adobe_cep__) {
          new CSInterface().addEventListener("com.neographs.kronos.sync", function (event) {
            try {
              const payload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
              callback(payload);
            } catch (err) {
              callback({});
            }
          });
        }
      } catch (e) {}

      // 3. localStorage Storage Listener
      window.addEventListener('storage', function (e) {
        if (e.key === 'kronos_sync_pulse' && e.newValue) {
          try {
            callback(JSON.parse(e.newValue));
          } catch(err) {}
        } else if (e.key === 'kronos_sessions' || e.key === 'kronos_config') {
          try {
            const parsed = JSON.parse(e.newValue);
            callback(Object.assign({ type: e.key === 'kronos_config' ? 'prefs' : 'sessions' }, parsed));
          } catch(err) {
            callback({ type: e.key });
          }
        }
      });
    }
  };

  window.KronosStorage = KronosStorage;
})(window);
