/**
 * KRONOS — Dockable Panel Controller
 * High-precision timer, Web Audio engine, split-flap animator,
 * and AE ExtendScript composition tagger.
 */

(function () {
  'use strict';

  const csInterface = (typeof CSInterface !== 'undefined') ? new CSInterface() : null;

  // --- 1. CONFIGURATION & STATE ---
  let config = window.KronosStorage ? window.KronosStorage.getPrefs() : {
    focusDurationMin: 25,
    shortBreakDurationMin: 5,
    longBreakDurationMin: 15,
    lapsPerCycle: 4,
    soundEffects: true,
    chimeEnd: true,
    softTick: false
  };

  let currentPhase = 'focus';
  let currentLap = 1;
  let isRunning = false;
  let totalSeconds = config.focusDurationMin * 60;
  let remainingSeconds = totalSeconds;
  let timerInterval = null;

  const COLOR_KEY_TO_VAR = {
    clockBg: '--theme-clock-bg',
    plateColor: '--theme-plate-color',
    fontColor: '--theme-font-color',
    pluginBg: '--theme-plugin-bg',
    accentColor: '--theme-accent-color'
  };

  function applyColorsToRoot(colors) {
    if (!colors) return;
    const targets = [
      document.documentElement,
      document.body,
      document.getElementById('kronos-dock-bar'),
      document.querySelector('.panel-root')
    ].filter(Boolean);

    Object.keys(COLOR_KEY_TO_VAR).forEach(key => {
      const val = colors[key];
      if (val) {
        const varName = COLOR_KEY_TO_VAR[key];
        targets.forEach(target => {
          target.style.setProperty(varName, val);
        });
      }
    });
  }

  function applyTheme(themeName, customColors) {
    const theme = themeName || (window.KronosStorage ? window.KronosStorage.getTheme() : (config.theme || 'charcoal'));
    config.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
    const dockBar = document.getElementById('kronos-dock-bar');
    if (dockBar) dockBar.setAttribute('data-theme', theme);

    const colors = customColors || (window.KronosStorage ? window.KronosStorage.getThemeColors(theme) : null);
    if (colors) {
      applyColorsToRoot(colors);
    }
  }

  window.applyTheme = applyTheme;

  // Listen for preference, theme, or session updates from floating window
  if (window.KronosStorage && window.KronosStorage.onSync) {
    window.KronosStorage.onSync(function (payload) {
      if (payload) {
        config = window.KronosStorage.getPrefs();
        if (payload.theme || payload.themeId || payload.type === 'theme' || payload.type === 'theme_color' || payload.type === 'theme_reset' || payload.colors) {
          const targetTheme = payload.themeId || payload.theme || config.theme;
          applyTheme(targetTheme, payload.colors);
        }
        if (!isRunning) {
          setPhase(currentPhase);
        } else {
          renderLapPips();
        }
      }
    });
  }

  // Active Disk Polling Watcher: guarantees instant sync across CEP extensions
  (function setupDiskWatcher() {
    if (typeof window.require !== 'function') return;
    try {
      const fs = window.require('fs');
      const prefsPath = "C:\\Users\\Admin\\AppData\\Local\\NeoGraphs\\Kronos\\preferences.json";
      let lastMtime = 0;
      if (fs.existsSync(prefsPath)) {
        lastMtime = fs.statSync(prefsPath).mtimeMs;
      }
      setInterval(function () {
        try {
          if (!fs.existsSync(prefsPath)) return;
          const stat = fs.statSync(prefsPath);
          if (stat.mtimeMs !== lastMtime) {
            lastMtime = stat.mtimeMs;
            if (window.KronosStorage) {
              config = window.KronosStorage.getPrefs();
              applyTheme(config.theme);
            }
          }
        } catch (e) { }
      }, 300);
    } catch (e) { }
  })();

  // --- 2. AUDIO SYNTHESIS ENGINE (Web Audio API) ---
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) audioCtx = new AudioContext();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playMechanicalClick(type = 'press') {
    if (!config.soundEffects) return;
    try {
      initAudio();
      if (!audioCtx) return;

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();

      filter.type = 'bandpass';
      filter.frequency.value = type === 'press' ? 1800 : 2400;
      filter.Q.value = 4.0;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(type === 'press' ? 320 : 540, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.035);

      gain.gain.setValueAtTime(0.35, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.035);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.04);
    } catch (e) { }
  }

  function playAcousticChime() {
    if (!config.chimeEnd) return;
    try {
      initAudio();
      if (!audioCtx) return;

      const freqs = [523.25, 659.25, 783.99, 1046.50];
      freqs.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;

        const startTime = audioCtx.currentTime + idx * 0.08;
        const duration = 1.2;

        gain.gain.setValueAtTime(0.15, startTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration + 0.1);
      });
    } catch (e) { }
  }

  function playTickSound() {
    if (!config.softTick || !isRunning) return;
    try {
      initAudio();
      if (!audioCtx) return;

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(1100, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.02, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.01);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.012);
    } catch (e) { }
  }

  // --- 3. DOM ELEMENTS ---
  const tileM1 = document.getElementById('tile-m1');
  const tileM2 = document.getElementById('tile-m2');
  const tileS1 = document.getElementById('tile-s1');
  const tileS2 = document.getElementById('tile-s2');

  const progressArc = document.getElementById('kronos-progress-arc');
  const toggleBtn = document.getElementById('kronos-toggle-btn');
  const playGlyph = toggleBtn.querySelector('.glyph-play');
  const pauseGlyph = toggleBtn.querySelector('.glyph-pause');
  const skipBtn = document.getElementById('kronos-skip-btn');
  const resetBtn = document.getElementById('kronos-reset-btn');
  const crownBtn = document.getElementById('kronos-crown-btn');
  const modeTabBtns = document.querySelectorAll('.mode-tab-btn');
  const lapPips = document.querySelectorAll('.lap-pip');
  const dockLapLabel = document.getElementById('dock-lap-label');

  const RING_CIRCUMFERENCE = 100.53; // 2πr, r=16 — keep in sync with .ring-arc in styles.css
  if (progressArc) {
    progressArc.style.strokeDasharray = `${RING_CIRCUMFERENCE}px`;
    progressArc.setAttribute('stroke-dasharray', `${RING_CIRCUMFERENCE}`);
  }

  let prevDigits = { m1: '', m2: '', s1: '', s2: '' };

  // --- 4. RENDER FUNCTIONS ---
  function updateTile(tileElem, newDigit, key, skipAnim = false) {
    if (!tileElem) return;
    const oldDigit = prevDigits[key];
    if (oldDigit === newDigit) return;

    const topGlyph = tileElem.querySelector('.flap-top .digit-glyph');
    const bottomGlyph = tileElem.querySelector('.flap-bottom .digit-glyph');

    // On initial setup or explicit non-animated render: update immediately without animation
    if (!oldDigit || skipAnim) {
      prevDigits[key] = newDigit;
      if (topGlyph) topGlyph.textContent = newDigit;
      if (bottomGlyph) bottomGlyph.textContent = newDigit;
      tileElem.querySelectorAll('.flap-leaf-anim').forEach(el => el.remove());
      return;
    }

    prevDigits[key] = newDigit;

    // Remove any lingering animation leaves from a rapid previous tick
    tileElem.querySelectorAll('.flap-leaf-anim').forEach(el => el.remove());

    // 1. Static top gets the new digit immediately (hidden under the folding leaf)
    if (topGlyph) topGlyph.textContent = newDigit;

    // 2. Upper folding leaf: displays old digit top, hinges downward
    const leafTop = document.createElement('div');
    leafTop.className = 'flap-leaf-anim flap-leaf-top';
    leafTop.innerHTML = `<span class="digit-glyph">${oldDigit}</span>`;

    // 3. Lower dropping leaf: displays new digit bottom, drops from 90deg to 0deg
    const leafBottom = document.createElement('div');
    leafBottom.className = 'flap-leaf-anim flap-leaf-bottom';
    leafBottom.innerHTML = `<span class="digit-glyph">${newDigit}</span>`;

    tileElem.appendChild(leafTop);
    tileElem.appendChild(leafBottom);

    // 4. On animation completion: update static bottom & remove leaves
    leafBottom.addEventListener('animationend', () => {
      if (bottomGlyph) bottomGlyph.textContent = newDigit;
      leafTop.remove();
      leafBottom.remove();
    }, { once: true });
  }

  function renderTimer(skipAnim = false) {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;

    const mStr = String(minutes).padStart(2, '0');
    const sStr = String(seconds).padStart(2, '0');

    updateTile(tileM1, mStr[0], 'm1', skipAnim);
    updateTile(tileM2, mStr[1], 'm2', skipAnim);
    updateTile(tileS1, sStr[0], 's1', skipAnim);
    updateTile(tileS2, sStr[1], 's2', skipAnim);

    const fraction = totalSeconds > 0 ? (totalSeconds - remainingSeconds) / totalSeconds : 0;
    const offset = (RING_CIRCUMFERENCE * (1 - fraction)).toFixed(2);
    if (progressArc) {
      progressArc.style.setProperty('stroke-dashoffset', `${offset}px`, 'important');
      progressArc.setAttribute('stroke-dashoffset', `${offset}`);
      progressArc.style.opacity = fraction > 0.001 ? '1' : '0';

      if (currentPhase === 'focus') {
        progressArc.style.setProperty('stroke', 'var(--theme-accent-color, #ea580c)', 'important');
      } else if (currentPhase === 'short_break') {
        progressArc.style.setProperty('stroke', 'var(--theme-font-color, #ffffff)', 'important');
      } else {
        progressArc.style.setProperty('stroke', 'var(--accent-teal, #14b8a6)', 'important');
      }
    }
  }

  function setPhase(phase) {
    currentPhase = phase;
    if (phase === 'focus') {
      totalSeconds = config.focusDurationMin * 60;
    } else if (phase === 'short_break') {
      totalSeconds = config.shortBreakDurationMin * 60;
    } else if (phase === 'long_break') {
      totalSeconds = config.longBreakDurationMin * 60;
    }

    modeTabBtns.forEach(btn => {
      if (btn.dataset.mode === phase) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    remainingSeconds = totalSeconds;
    renderLapPips();
    renderTimer(true);
  }

  function renderLapPips() {
    const pipsRow = document.querySelector('.lap-pips-row');
    const totalLaps = parseInt(config.lapsPerCycle, 10) || 4;
    if (currentLap > totalLaps) currentLap = 1;

    if (pipsRow) {
      const currentPips = pipsRow.querySelectorAll('.lap-pip');
      if (currentPips.length !== totalLaps) {
        pipsRow.innerHTML = '';
        for (let i = 1; i <= totalLaps; i++) {
          const pip = document.createElement('span');
          pip.className = 'lap-pip';
          pip.dataset.lap = i;
          pipsRow.appendChild(pip);
        }
      }
      const pips = pipsRow.querySelectorAll('.lap-pip');
      pips.forEach((pip, idx) => {
        const pipIndex = idx + 1;
        pip.className = 'lap-pip';
        if (pipIndex < currentLap) {
          pip.classList.add('completed');
        } else if (pipIndex === currentLap) {
          pip.classList.add('active');
        }
      });
    }

    if (dockLapLabel) {
      dockLapLabel.textContent = `LAP ${currentLap}/${totalLaps}`;
    }
  }

  function startTimer() {
    if (isRunning) return;
    initAudio();
    playMechanicalClick('press');
    isRunning = true;
    toggleBtn.classList.add('running');
    playGlyph.style.display = 'none';
    pauseGlyph.style.display = 'block';

    timerInterval = setInterval(() => {
      if (remainingSeconds > 0) {
        remainingSeconds--;
        renderTimer();
        playTickSound();
      } else {
        completeInterval();
      }
    }, 1000);
  }

  function pauseTimer() {
    if (!isRunning) return;
    playMechanicalClick('release');
    isRunning = false;
    toggleBtn.classList.remove('running');
    playGlyph.style.display = 'block';
    pauseGlyph.style.display = 'none';
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function resetCurrentTimer() {
    playMechanicalClick('release');
    pauseTimer();
    remainingSeconds = totalSeconds;
    renderTimer(true);
  }

  function getActiveAECompName(callback) {
    if (csInterface && csInterface.evalScript) {
      csInterface.evalScript("$.global.kronos.getActiveCompName()", function (res) {
        if (res && res !== 'undefined' && res !== 'null' && res.trim().length > 0) {
          callback(res.trim());
        } else {
          callback("");
        }
      });
    } else {
      callback("");
    }
  }

  function logCompletedSession(durationMin, phase, fallbackTitle) {
    getActiveAECompName(function (compName) {
      const title = compName ? `${compName} • Lap ${currentLap}` : fallbackTitle;
      const now = new Date();
      const dateFormatted = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const timeFormatted = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

      const newSession = {
        id: "sess-" + Date.now(),
        date: dateFormatted,
        startTime: timeFormatted,
        durationMin: durationMin,
        phase: phase,
        title: title,
        completed: true
      };

      if (window.KronosStorage) {
        window.KronosStorage.addSession(newSession);
      }
    });
  }

  function completeInterval() {
    pauseTimer();
    playAcousticChime();

    if (currentPhase === 'focus') {
      logCompletedSession(config.focusDurationMin, 'focus', `Focus Lap ${currentLap}`);

      const totalLaps = parseInt(config.lapsPerCycle, 10) || 4;
      if (currentLap >= totalLaps) {
        currentLap = 1;
      } else {
        currentLap++;
      }

      currentPhase = 'focus';
      totalSeconds = config.focusDurationMin * 60;
      remainingSeconds = totalSeconds;
      renderLapPips();
      renderTimer(true);
    } else {
      currentPhase = 'focus';
      totalSeconds = config.focusDurationMin * 60;
      remainingSeconds = totalSeconds;
      modeTabBtns.forEach(btn => {
        if (btn.dataset.mode === 'focus') btn.classList.add('active');
        else btn.classList.remove('active');
      });
      renderLapPips();
      renderTimer(true);
    }
  }

  function skipCurrentLap() {
    playMechanicalClick('release');
    pauseTimer();

    if (currentPhase === 'focus') {
      const elapsed = Math.max(1, Math.round((totalSeconds - remainingSeconds) / 60));
      logCompletedSession(elapsed, 'focus', `Focus Lap ${currentLap}`);

      const totalLaps = parseInt(config.lapsPerCycle, 10) || 4;
      if (currentLap >= totalLaps) {
        currentLap = 1;
      } else {
        currentLap++;
      }

      currentPhase = 'focus';
      totalSeconds = config.focusDurationMin * 60;
      remainingSeconds = totalSeconds;
      renderLapPips();
      renderTimer(true);
    } else {
      currentPhase = 'focus';
      totalSeconds = config.focusDurationMin * 60;
      remainingSeconds = totalSeconds;
      modeTabBtns.forEach(btn => {
        if (btn.dataset.mode === 'focus') btn.classList.add('active');
        else btn.classList.remove('active');
      });
      renderLapPips();
      renderTimer(true);
    }
  }

  function openSettingsWindow() {
    playMechanicalClick('press');
    try {
      if (window.__adobe_cep__) {
        window.__adobe_cep__.requestOpenExtension("neographs.kronos.settings", "");
      } else if (csInterface && csInterface.requestOpenExtension) {
        csInterface.requestOpenExtension("neographs.kronos.settings", "");
      } else {
        window.open("settings.html", "KronosSettings", "width=380,height=580");
      }
    } catch (e) {
      window.open("settings.html", "KronosSettings", "width=380,height=580");
    }
  }

  // --- 5. TOAST FEEDBACK (Silenced Per Design Requirement) ---
  function showToast(message) {
    // Zero toasts, zero tooltips
  }

  // --- 6. SETUP EVENT LISTENERS ---
  function setupEventListeners() {
    toggleBtn.addEventListener('click', () => {
      if (isRunning) pauseTimer();
      else startTimer();
    });

    skipBtn.addEventListener('click', skipCurrentLap);
    resetBtn.addEventListener('click', resetCurrentTimer);
    crownBtn.addEventListener('click', openSettingsWindow);

    modeTabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        playMechanicalClick('release');
        pauseTimer();
        setPhase(btn.dataset.mode);
      });
    });

    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (isRunning) pauseTimer();
        else startTimer();
      } else if (e.code === 'KeyR') {
        resetCurrentTimer();
      } else if (e.code === 'KeyS') {
        skipCurrentLap();
      }
    });
  }

  function init() {
    applyTheme();
    setPhase('focus');
    renderLapPips();
    setupEventListeners();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
