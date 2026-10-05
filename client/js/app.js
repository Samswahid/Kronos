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
  let activeSessionTitle = null;
  let activeSessionTags = [];

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
      if (!payload) return;
      config = window.KronosStorage.getPrefs();

      if (payload.type === 'resume_session') {
        pauseTimer();
        currentPhase = payload.phase || 'focus';
        const dur = Math.min(90, Math.max(1, parseInt(payload.durationMin, 10) || config.focusDurationMin || 25));
        totalSeconds = dur * 60;
        remainingSeconds = totalSeconds;
        activeSessionTitle = payload.title || null;
        activeSessionTags = Array.isArray(payload.tags) ? payload.tags.slice() : [];
        modeTabBtns.forEach(btn => {
          if (btn.dataset.mode === currentPhase) btn.classList.add('active');
          else btn.classList.remove('active');
        });
        renderLapPips();
        renderTimer(true);
        startTimer();
        persistActiveState();
      } else if (payload.type === 'audio_profile' || payload.profile) {
        if (config) config.audioProfile = payload.profile || config.audioProfile;
        playMechanicalClick('press');
      } else if (payload.theme || payload.themeId || payload.type === 'theme' || payload.type === 'theme_color' || payload.type === 'theme_reset' || payload.colors) {
        const targetTheme = payload.themeId || payload.theme || config.theme;
        applyTheme(targetTheme, payload.colors);
      } else {
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

  function getVolumeMultiplier() {
    const vol = (config && typeof config.volume === 'number') ? config.volume : 80;
    return Math.max(0, Math.min(1, vol / 100));
  }

  function getAudioProfile() {
    return (config && config.audioProfile) ? config.audioProfile : 'mechanical';
  }

  function playMechanicalClick(type = 'press') {
    if (!config.soundEffects) return;
    try {
      initAudio();
      if (!audioCtx) return;

      const profile = getAudioProfile();
      const vMul = getVolumeMultiplier();
      if (vMul <= 0) return;

      const now = audioCtx.currentTime;

      if (profile === 'braun_thud') {
        // Dieter Rams 1972 Damped Tactile Switch Thud
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const filter = audioCtx.createBiquadFilter();

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(type === 'press' ? 420 : 520, now);
        filter.Q.value = 1.2;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(type === 'press' ? 170 : 220, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.04);

        gain.gain.setValueAtTime(0.45 * vMul, now);
        gain.gain.exponentialRampToValueAtTime(0.001 * vMul, now + 0.04);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(now);
        osc.stop(now + 0.045);
      } else if (profile === 'vintage_bell') {
        // Studio Brass Desk Bell Tap
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(type === 'press' ? 1480 : 1760, now);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(type === 'press' ? 2960 : 3520, now);

        gain.gain.setValueAtTime(0.22 * vMul, now);
        gain.gain.exponentialRampToValueAtTime(0.0001 * vMul, now + 0.07);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(audioCtx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.075);
        osc2.stop(now + 0.075);
      } else if (profile === 'digital_quartz') {
        // Precision Quartz Watch Pip
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(type === 'press' ? 2400 : 3200, now);

        gain.gain.setValueAtTime(0.12 * vMul, now);
        gain.gain.exponentialRampToValueAtTime(0.001 * vMul, now + 0.015);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(now);
        osc.stop(now + 0.018);
      } else if (profile === 'zen_gong') {
        // Singing Bowl / Wooden Temple Block Strike
        const osc = audioCtx.createOscillator();
        const harmonic = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(type === 'press' ? 432 : 540, now);
        harmonic.type = 'sine';
        harmonic.frequency.setValueAtTime(type === 'press' ? 864 : 1080, now);

        gain.gain.setValueAtTime(0.28 * vMul, now);
        gain.gain.exponentialRampToValueAtTime(0.001 * vMul, now + 0.06);

        osc.connect(gain);
        harmonic.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(now);
        harmonic.start(now);
        osc.stop(now + 0.065);
        harmonic.stop(now + 0.065);
      } else {
        // Default: Tactile Mechanical Switch Click
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const filter = audioCtx.createBiquadFilter();

        filter.type = 'bandpass';
        filter.frequency.value = type === 'press' ? 1800 : 2400;
        filter.Q.value = 4.0;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(type === 'press' ? 320 : 540, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.035);

        gain.gain.setValueAtTime(0.35 * vMul, now);
        gain.gain.exponentialRampToValueAtTime(0.001 * vMul, now + 0.035);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(now);
        osc.stop(now + 0.04);
      }
    } catch (e) { }
  }

  function playAcousticChime() {
    if (!config.chimeEnd) return;
    try {
      initAudio();
      if (!audioCtx) return;

      const profile = getAudioProfile();
      const vMul = getVolumeMultiplier();
      if (vMul <= 0) return;

      const now = audioCtx.currentTime;

      if (profile === 'braun_thud') {
        // Warm Braun ET66 Dual Harmonic Chime (A4 - C#5)
        const tones = [440.0, 554.37];
        tones.forEach((freq, idx) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          const filter = audioCtx.createBiquadFilter();

          filter.type = 'lowpass';
          filter.frequency.value = 1400;

          osc.type = 'sine';
          osc.frequency.value = freq;

          const start = now + idx * 0.12;
          const dur = 1.4;

          gain.gain.setValueAtTime(0.24 * vMul, start);
          gain.gain.exponentialRampToValueAtTime(0.0001 * vMul, start + dur);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(audioCtx.destination);

          osc.start(start);
          osc.stop(start + dur + 0.1);
        });
      } else if (profile === 'vintage_bell') {
        // Resonant Studio Brass Bell with Harmonics
        const partials = [
          { f: 880.0, g: 0.22, d: 2.2 },
          { f: 1760.0, g: 0.14, d: 1.8 },
          { f: 2640.0, g: 0.08, d: 1.2 }
        ];
        partials.forEach(p => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.value = p.f;

          gain.gain.setValueAtTime(p.g * vMul, now);
          gain.gain.exponentialRampToValueAtTime(0.0001 * vMul, now + p.d);

          osc.connect(gain);
          gain.connect(audioCtx.destination);

          osc.start(now);
          osc.stop(now + p.d + 0.1);
        });
      } else if (profile === 'digital_quartz') {
        // Iconic Double Quartz Chrono Pulse
        [0.0, 0.13].forEach(offset => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'square';
          osc.frequency.value = 2048;

          const start = now + offset;
          gain.gain.setValueAtTime(0.14 * vMul, start);
          gain.gain.exponentialRampToValueAtTime(0.0001 * vMul, start + 0.08);

          osc.connect(gain);
          gain.connect(audioCtx.destination);

          osc.start(start);
          osc.stop(start + 0.085);
        });
      } else if (profile === 'zen_gong') {
        // Deep Resonant Tibetan Singing Bowl / Gong
        const partials = [
          { f: 216.0, g: 0.30, d: 3.2 },
          { f: 432.0, g: 0.18, d: 2.8 },
          { f: 648.0, g: 0.09, d: 2.0 }
        ];
        partials.forEach(p => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.value = p.f;

          gain.gain.setValueAtTime(0.0001, now);
          gain.gain.linearRampToValueAtTime(p.g * vMul, now + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.0001 * vMul, now + p.d);

          osc.connect(gain);
          gain.connect(audioCtx.destination);

          osc.start(now);
          osc.stop(now + p.d + 0.1);
        });
      } else {
        // Default: 4-tone Ascending Industrial Arpeggio
        const freqs = [523.25, 659.25, 783.99, 1046.50];
        freqs.forEach((freq, idx) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;

          const startTime = now + idx * 0.08;
          const duration = 1.2;

          gain.gain.setValueAtTime(0.18 * vMul, startTime);
          gain.gain.exponentialRampToValueAtTime(0.0001 * vMul, startTime + duration);

          osc.connect(gain);
          gain.connect(audioCtx.destination);

          osc.start(startTime);
          osc.stop(startTime + duration + 0.1);
        });
      }
    } catch (e) { }
  }

  function playTickSound() {
    if (!config.softTick || !isRunning) return;
    try {
      initAudio();
      if (!audioCtx) return;

      const profile = getAudioProfile();
      const vMul = getVolumeMultiplier();
      if (vMul <= 0) return;

      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      if (profile === 'braun_thud') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, now);
        gain.gain.setValueAtTime(0.03 * vMul, now);
        gain.gain.exponentialRampToValueAtTime(0.0001 * vMul, now + 0.016);
      } else if (profile === 'vintage_bell') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1760, now);
        gain.gain.setValueAtTime(0.015 * vMul, now);
        gain.gain.exponentialRampToValueAtTime(0.0001 * vMul, now + 0.014);
      } else if (profile === 'digital_quartz') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(2048, now);
        gain.gain.setValueAtTime(0.012 * vMul, now);
        gain.gain.exponentialRampToValueAtTime(0.0001 * vMul, now + 0.008);
      } else if (profile === 'zen_gong') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        gain.gain.setValueAtTime(0.02 * vMul, now);
        gain.gain.exponentialRampToValueAtTime(0.0001 * vMul, now + 0.02);
      } else {
        osc.type = 'square';
        osc.frequency.setValueAtTime(1100, now);
        gain.gain.setValueAtTime(0.02 * vMul, now);
        gain.gain.exponentialRampToValueAtTime(0.0001 * vMul, now + 0.01);
      }

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.022);
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
    persistActiveState();
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

  function persistActiveState() {
    if (!window.KronosStorage) return;
    try {
      window.KronosStorage.saveActiveState({
        remainingSeconds: remainingSeconds,
        totalSeconds: totalSeconds,
        currentPhase: currentPhase,
        currentLap: currentLap,
        isRunning: isRunning,
        activeSessionTitle: activeSessionTitle,
        activeSessionTags: activeSessionTags,
        lastTimestamp: Date.now()
      });
    } catch (e) {}
  }

  function recoverActiveState() {
    if (!window.KronosStorage) return false;
    try {
      const saved = window.KronosStorage.getActiveState();
      if (!saved) return false;

      if (typeof saved.remainingSeconds === 'number' && saved.remainingSeconds > 0) {
        currentPhase = saved.currentPhase || 'focus';
        currentLap = Math.min(5, Math.max(1, saved.currentLap || 1));
        totalSeconds = saved.totalSeconds || (config.focusDurationMin * 60);
        remainingSeconds = Math.min(totalSeconds, Math.max(0, saved.remainingSeconds));
        activeSessionTitle = saved.activeSessionTitle || null;
        activeSessionTags = Array.isArray(saved.activeSessionTags) ? saved.activeSessionTags : [];

        modeTabBtns.forEach(btn => {
          if (btn.dataset.mode === currentPhase) btn.classList.add('active');
          else btn.classList.remove('active');
        });

        renderLapPips();
        renderTimer(true);
        // Safely start paused so user has full control
        isRunning = false;
        toggleBtn.classList.remove('running');
        playGlyph.style.display = 'block';
        pauseGlyph.style.display = 'none';
        return true;
      }
    } catch (e) {
      console.warn("[Kronos] State recovery error:", e);
    }
    return false;
  }

  function startTimer() {
    if (isRunning) return;
    initAudio();
    playMechanicalClick('press');
    isRunning = true;
    toggleBtn.classList.add('running');
    playGlyph.style.display = 'none';
    pauseGlyph.style.display = 'block';
    persistActiveState();

    timerInterval = setInterval(() => {
      if (remainingSeconds > 0) {
        remainingSeconds--;
        renderTimer();
        playTickSound();
        persistActiveState();
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
    persistActiveState();
  }

  function resetCurrentTimer(e) {
    playMechanicalClick('release');
    pauseTimer();
    remainingSeconds = totalSeconds;
    if (e && (e.ctrlKey || e.metaKey)) {
      currentLap = 1;
      renderLapPips();
    }
    renderTimer(true);
    persistActiveState();
  }

  function getAEProjectName(callback) {
    let resolved = false;
    const safeCallback = function (name) {
      if (resolved) return;
      resolved = true;
      callback(name);
    };

    const timer = setTimeout(function () {
      safeCallback("Untitled Project");
    }, 400);

    if (csInterface && csInterface.evalScript) {
      try {
        csInterface.evalScript("$.global.kronos.getProjectName()", function (res) {
          clearTimeout(timer);
          if (res && res !== 'undefined' && res !== 'null' && res.trim().length > 0) {
            safeCallback(res.trim());
          } else {
            safeCallback("Untitled Project");
          }
        });
      } catch (err) {
        clearTimeout(timer);
        safeCallback("Untitled Project");
      }
    } else {
      clearTimeout(timer);
      safeCallback("Untitled Project");
    }
  }

  function logCompletedSession(durationMin, phase, sessionLap) {
    const recordedLap = (typeof sessionLap === 'number') ? sessionLap : currentLap;
    const customTitle = activeSessionTitle;
    const customTags = (activeSessionTags && activeSessionTags.length > 0) ? activeSessionTags.slice() : [];

    getAEProjectName(function (projectName) {
      const proj = projectName || "Untitled Project";
      const title = customTitle || `${proj} • Lap ${recordedLap}`;
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
        tags: customTags,
        completed: true
      };

      if (window.KronosStorage) {
        window.KronosStorage.addSession(newSession);
      }
      activeSessionTitle = null;
      activeSessionTags = [];
      persistActiveState();
    });
  }

  function completeInterval() {
    pauseTimer();
    playAcousticChime();

    if (currentPhase === 'focus') {
      const finishedLap = currentLap;
      logCompletedSession(config.focusDurationMin, 'focus', finishedLap);

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
      persistActiveState();
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
      persistActiveState();
    }
  }

  function skipCurrentLap() {
    playMechanicalClick('release');
    pauseTimer();

    if (currentPhase === 'focus') {
      const elapsed = Math.max(1, Math.round((totalSeconds - remainingSeconds) / 60));
      const finishedLap = currentLap;
      logCompletedSession(elapsed, 'focus', finishedLap);

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
      persistActiveState();
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
      persistActiveState();
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
    const recovered = recoverActiveState();
    if (!recovered) {
      setPhase('focus');
    }
    renderLapPips();
    setupEventListeners();

    // Persist state on page unload
    window.addEventListener('beforeunload', persistActiveState);

    // Suppress all browser default tooltips
    document.addEventListener('mouseover', function (e) {
      if (e.target && e.target.hasAttribute && e.target.hasAttribute('title')) {
        e.target.removeAttribute('title');
      }
    }, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
