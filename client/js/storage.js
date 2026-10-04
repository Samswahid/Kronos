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

  const DEFAULT_CONFIG = {
    focusDurationMin: 25,
    shortBreakDurationMin: 5,
    longBreakDurationMin: 15,
    lapsPerCycle: 4,
    soundEffects: true,
    chimeEnd: true,
    softTick: false,
    theme: 'charcoal',
    storagePath: KRONOS_DIR
  };

  const DEFAULT_SESSIONS = [
    {
      id: "sess-101",
      date: "Oct 5, 2026",
      startTime: "09:15 AM",
      durationMin: 25,
      phase: "focus",
      title: "Hero Title 3D Rigging & Extrusion",
      completed: true
    },
    {
      id: "sess-102",
      date: "Oct 5, 2026",
      startTime: "09:45 AM",
      durationMin: 25,
      phase: "focus",
      title: "Lower Thirds Keyframe Easing & Motion Blur",
      completed: true
    },
    {
      id: "sess-103",
      date: "Oct 5, 2026",
      startTime: "10:15 AM",
      durationMin: 25,
      phase: "focus",
      title: "Color Grade Adjustment Layers & Grain Match",
      completed: true
    }
  ];

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
      this.broadcastSync("theme", { theme: themeName });
      return themeName;
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
      try {
        if (window.__adobe_cep__) {
          const event = new CSEvent("com.neographs.kronos.sync", "APPLICATION");
          const payload = Object.assign({ type: type, timestamp: Date.now() }, typeof data === 'object' ? data : {});
          event.data = JSON.stringify(payload);
          new CSInterface().dispatchEvent(event);
        }
      } catch (e) {}
    },

    onSync: function (callback) {
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
      window.addEventListener('storage', function (e) {
        if (e.key === 'kronos_sessions' || e.key === 'kronos_config') {
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
