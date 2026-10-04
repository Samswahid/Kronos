/**
 * KRONOS — Material Charcoal Industrial Focus Chronometer
 * Adobe After Effects CEP Extension Logic & Floating Modeless Vault Controller
 */

(function () {
  'use strict';

  // --- 1. DEFAULT CONFIGURATION & STATE ---
  const DEFAULT_CONFIG = {
    focusDurationMin: 25,
    shortBreakDurationMin: 5,
    longBreakDurationMin: 15,
    lapsPerCycle: 4,
    soundEffects: true,
    chimeEnd: true,
    softTick: false,
    theme: 'charcoal',
    storagePath: "C:\\Users\\Admin\\AppData\\Local\\NeoGraphs\\Kronos"
  };

  const THEME_NAMES = {
    'charcoal': 'Charcoal Flap',
    'neon-lilac': 'Neon Lilac',
    'braun-1972': 'Braun 1972',
    'cyber-violet': 'Cyber Violet',
    'kyoto-matcha': 'Kyoto Matcha',
    'cobalt-runner': 'Cobalt Runner',
    'solar-ochre': 'Solar Ochre'
  };

  let config = Object.assign({}, DEFAULT_CONFIG);

  // Phases: 'focus' | 'short_break' | 'long_break'
  let currentPhase = 'focus';
  let currentLap = 1;
  let isRunning = false;
  let totalSeconds = config.focusDurationMin * 60;
  let remainingSeconds = totalSeconds;
  let timerInterval = null;

  function applyTheme(themeId) {
    const activeTheme = themeId || config.theme || 'charcoal';
    config.theme = activeTheme;
    document.body.setAttribute('data-theme', activeTheme);

    const dockBar = document.getElementById('kronos-dock-bar');
    if (dockBar) dockBar.setAttribute('data-theme', activeTheme);

    const vaultWin = document.getElementById('floating-vault-modal');
    if (vaultWin) vaultWin.setAttribute('data-theme', activeTheme);

    const hudBadge = document.querySelector('.hud-badge');
    if (hudBadge) hudBadge.textContent = (THEME_NAMES[activeTheme] || activeTheme).toUpperCase();

    const tag = document.getElementById('current-theme-name-tag');
    if (tag) tag.textContent = THEME_NAMES[activeTheme] || activeTheme;

    document.querySelectorAll('.theme-card').forEach(card => {
      if (card.dataset.themeId === activeTheme) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });

    try {
      localStorage.setItem('kronos_config', JSON.stringify(config));
    } catch (e) {}
  }

  // Initial Sample Sessions (Material Charcoal AE Motion Workflow)
  let sessions = [
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

  // Try loading from localStorage if previously stored
  try {
    const savedConfig = localStorage.getItem('kronos_config');
    if (savedConfig) config = Object.assign(config, JSON.parse(savedConfig));

    const savedSessions = localStorage.getItem('kronos_sessions');
    if (savedSessions) sessions = JSON.parse(savedSessions);
  } catch (e) {
    console.warn("Storage access restricted or empty:", e);
  }

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
    } catch (e) {}
  }

  function playAcousticChime() {
    if (!config.chimeEnd) return;
    try {
      initAudio();
      if (!audioCtx) return;

      const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5 - E5 - G5 - C6 vintage bell triad
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
    } catch (e) {}
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
    } catch (e) {}
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

  // Vault Modeless Window Elements
  const vaultModal = document.getElementById('floating-vault-modal');
  const vaultCloseBtn = document.getElementById('vault-close-btn');
  const hudVaultBtn = document.getElementById('hud-quick-vault-btn');
  const sessionContainer = document.getElementById('session-cards-container');
  const sessionCountBadge = document.getElementById('session-count-badge');
  const headerFocusTime = document.getElementById('header-focus-time');
  const metricTodayTime = document.getElementById('metric-today-time');
  const metricTodayLaps = document.getElementById('metric-today-laps');
  const metricStreak = document.getElementById('metric-streak');
  const btnExportCsv = document.getElementById('btn-export-csv');
  const btnExportJson = document.getElementById('btn-export-json');
  const btnCopySummary = document.getElementById('btn-copy-summary');
  const btnQuickAdd = document.getElementById('btn-quick-add-session');
  const btnClearAll = document.getElementById('btn-clear-all');
  const btnSavePrefs = document.getElementById('btn-save-prefs');
  const saveStatus = document.getElementById('save-status-indicator');

  // SVG Circumference for 22px radius circle = 2 * pi * 22 ~= 138.23
  const RING_CIRCUMFERENCE = 138.23;
  progressArc.style.strokeDasharray = `${RING_CIRCUMFERENCE}`;

  // Track previous digits to trigger split-flap animations only on changed digits
  let prevDigits = { m1: '', m2: '', s1: '', s2: '' };

  // --- 4. TIMER & SPLIT-FLAP RENDER FUNCTIONS ---
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

    // Update Circular Ring Gauge
    const fraction = totalSeconds > 0 ? (totalSeconds - remainingSeconds) / totalSeconds : 0;
    const offset = RING_CIRCUMFERENCE * (1 - fraction);
    progressArc.style.strokeDashoffset = `${offset}`;

    // Update Ring Color based on phase in Material Charcoal
    if (currentPhase === 'focus') {
      progressArc.style.stroke = 'var(--accent-amber)';
    } else if (currentPhase === 'short_break') {
      progressArc.style.stroke = 'var(--text-body)';
    } else {
      progressArc.style.stroke = 'var(--accent-teal)';
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

    // Update 3-Way Mode Switcher UI
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

  function completeInterval() {
    pauseTimer();
    playAcousticChime();

    if (currentPhase === 'focus') {
      logNewSession(config.focusDurationMin, 'focus', `Focus Lap ${currentLap}`);

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
      logNewSession(elapsed, 'focus', `Focus Lap ${currentLap}`);

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

  // --- 5. SESSION MANAGEMENT & LOGGING ---
  function logNewSession(durationMin, phase = 'focus', defaultTitle = 'Focus Session') {
    const now = new Date();
    const dateFormatted = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timeFormatted = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const newSession = {
      id: "sess-" + Date.now(),
      date: dateFormatted,
      startTime: timeFormatted,
      durationMin: durationMin,
      phase: phase,
      title: defaultTitle,
      completed: true
    };

    sessions.unshift(newSession);
    saveSessions();
    renderSessionList();
    updateMetrics();
  }

  function saveSessions() {
    try {
      localStorage.setItem('kronos_sessions', JSON.stringify(sessions));
    } catch (e) {}
  }

  function saveConfiguration() {
    try {
      localStorage.setItem('kronos_config', JSON.stringify(config));
    } catch (e) {}
  }

  let activeTimeframe = '7d';

  function parseSessionDate(dateStr) {
    if (!dateStr) return new Date();
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  function isSameDay(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  }

  function updateMetrics() {
    const now = new Date();
    const todaySessions = sessions.filter(s => {
      if (s.phase !== 'focus') return false;
      const sDate = parseSessionDate(s.date);
      return isSameDay(sDate, now);
    });

    const focusSessions = sessions.filter(s => s.phase === 'focus');
    const todayMinutes = todaySessions.reduce((acc, s) => acc + (s.durationMin || 0), 0);
    const hours = Math.floor(todayMinutes / 60);
    const mins = todayMinutes % 60;
    const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

    if (headerFocusTime) headerFocusTime.textContent = timeStr;
    if (metricTodayTime) metricTodayTime.textContent = timeStr;
    if (metricTodayLaps) metricTodayLaps.textContent = `${todaySessions.length} Lap${todaySessions.length === 1 ? '' : 's'}`;
    if (sessionCountBadge) sessionCountBadge.textContent = `${sessions.length}`;

    // Streak Calculation
    let streakDays = 0;
    const dayMap = {};
    focusSessions.forEach(s => {
      const dayKey = parseSessionDate(s.date).toDateString();
      dayMap[dayKey] = (dayMap[dayKey] || 0) + 1;
    });

    const checkDate = new Date();
    if (!dayMap[checkDate.toDateString()]) {
      checkDate.setDate(checkDate.getDate() - 1);
    }
    while (dayMap[checkDate.toDateString()]) {
      streakDays++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    if (metricStreak) {
      metricStreak.textContent = `${streakDays} Day${streakDays === 1 ? '' : 's'}`;
    }

    renderAnalytics();
  }

  function renderAnalytics() {
    const barChartContainer = document.getElementById('analytics-bar-chart');
    const categoryContainer = document.getElementById('category-breakdown-list');
    const chartTitle = document.getElementById('analytics-chart-title');
    const chartSub = document.getElementById('analytics-chart-sub');
    if (!barChartContainer || !categoryContainer) return;

    if (activeTimeframe === 'daily') {
      if (chartTitle) chartTitle.textContent = "HOURLY FOCUS VELOCITY";
      if (chartSub) chartSub.textContent = "Today's Distribution";
    } else if (activeTimeframe === '7d') {
      if (chartTitle) chartTitle.textContent = "WEEKLY FOCUS VELOCITY";
      if (chartSub) chartSub.textContent = "Last 7 Days";
    } else {
      if (chartTitle) chartTitle.textContent = "MONTHLY FOCUS VELOCITY";
      if (chartSub) chartSub.textContent = "4-Week Cycle";
    }

    barChartContainer.innerHTML = '';
    const now = new Date();

    if (activeTimeframe === 'daily') {
      const slots = [
        { label: '8A', startH: 8, endH: 10, mins: 0 },
        { label: '10A', startH: 10, endH: 12, mins: 0 },
        { label: '12P', startH: 12, endH: 14, mins: 0 },
        { label: '2P', startH: 14, endH: 16, mins: 0 },
        { label: '4P', startH: 16, endH: 18, mins: 0 },
        { label: '6P', startH: 18, endH: 20, mins: 0 },
        { label: '8P', startH: 20, endH: 24, mins: 0 }
      ];

      sessions.filter(s => s.phase === 'focus' && isSameDay(parseSessionDate(s.date), now)).forEach(s => {
        let hour = 9;
        if (s.startTime) {
          const match = s.startTime.match(/(\d+):(\d+)\s*(AM|PM)?/i);
          if (match) {
            let h = parseInt(match[1], 10);
            const isPM = match[3] && match[3].toUpperCase() === 'PM';
            const isAM = match[3] && match[3].toUpperCase() === 'AM';
            if (isPM && h < 12) h += 12;
            if (isAM && h === 12) h = 0;
            hour = h;
          }
        }
        const targetSlot = slots.find(sl => hour >= sl.startH && hour < sl.endH) || slots[slots.length - 1];
        targetSlot.mins += (s.durationMin || 0);
      });

      const maxMins = Math.max(30, ...slots.map(sl => sl.mins));

      slots.forEach(slot => {
        const col = document.createElement('div');
        col.className = 'chart-col';
        const pct = Math.max(slot.mins > 0 ? 8 : 2, Math.round((slot.mins / maxMins) * 100));
        col.innerHTML = `
          <span class="chart-val">${slot.mins > 0 ? slot.mins + 'm' : ''}</span>
          <div class="chart-bar-wrap">
            <div class="chart-bar ${slot.mins > 0 ? 'active' : ''}" style="height: ${pct}%;"></div>
          </div>
          <span class="col-day">${slot.label}</span>
        `;
        barChartContainer.appendChild(col);
      });

    } else if (activeTimeframe === '7d') {
      const days = [];
      const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        days.push({
          date: d,
          label: dayNames[d.getDay()],
          isToday: i === 0,
          mins: 0
        });
      }

      sessions.filter(s => s.phase === 'focus').forEach(s => {
        const sDate = parseSessionDate(s.date);
        days.forEach(day => {
          if (isSameDay(sDate, day.date)) {
            day.mins += (s.durationMin || 0);
          }
        });
      });

      const maxMins = Math.max(30, ...days.map(d => d.mins));

      days.forEach(day => {
        const col = document.createElement('div');
        col.className = 'chart-col' + (day.isToday ? ' current' : '');
        const pct = Math.max(day.mins > 0 ? 8 : 2, Math.round((day.mins / maxMins) * 100));
        col.innerHTML = `
          <span class="chart-val">${day.mins > 0 ? day.mins + 'm' : ''}</span>
          <div class="chart-bar-wrap">
            <div class="chart-bar ${day.mins > 0 ? 'active' : ''} ${day.isToday ? 'current' : ''}" style="height: ${pct}%;"></div>
          </div>
          <span class="col-day">${day.label}</span>
        `;
        barChartContainer.appendChild(col);
      });

    } else {
      const weeks = [
        { label: 'W1', mins: 0, daysAgoStart: 28, daysAgoEnd: 21 },
        { label: 'W2', mins: 0, daysAgoStart: 21, daysAgoEnd: 14 },
        { label: 'W3', mins: 0, daysAgoStart: 14, daysAgoEnd: 7 },
        { label: 'W4', mins: 0, daysAgoStart: 7, daysAgoEnd: 0, current: true }
      ];

      sessions.filter(s => s.phase === 'focus').forEach(s => {
        const sDate = parseSessionDate(s.date);
        const diffDays = Math.floor((now.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24));
        weeks.forEach(w => {
          if (diffDays >= w.daysAgoEnd && diffDays < w.daysAgoStart) {
            w.mins += (s.durationMin || 0);
          }
        });
      });

      const maxMins = Math.max(60, ...weeks.map(w => w.mins));

      weeks.forEach(w => {
        const col = document.createElement('div');
        col.className = 'chart-col' + (w.current ? ' current' : '');
        const pct = Math.max(w.mins > 0 ? 8 : 2, Math.round((w.mins / maxMins) * 100));
        const valText = w.mins >= 60 ? `${(w.mins / 60).toFixed(1)}h` : (w.mins > 0 ? `${w.mins}m` : '');
        col.innerHTML = `
          <span class="chart-val">${valText}</span>
          <div class="chart-bar-wrap">
            <div class="chart-bar ${w.mins > 0 ? 'active' : ''} ${w.current ? 'current' : ''}" style="height: ${pct}%;"></div>
          </div>
          <span class="col-day">${w.label}</span>
        `;
        barChartContainer.appendChild(col);
      });
    }

    // Dynamic Category Breakdown
    categoryContainer.innerHTML = '';
    const categories = {};
    let totalFocusMins = 0;

    sessions.filter(s => s.phase === 'focus').forEach(s => {
      let rawTitle = s.title || 'General Focus';
      let catName = rawTitle.split('•')[0].trim();
      if (!catName) catName = 'General Focus';
      const dur = s.durationMin || 0;
      totalFocusMins += dur;

      if (!categories[catName]) {
        categories[catName] = { name: catName, minutes: 0, count: 0 };
      }
      categories[catName].minutes += dur;
      categories[catName].count += 1;
    });

    const catList = Object.values(categories).sort((a, b) => b.minutes - a.minutes);

    if (catList.length === 0) {
      categoryContainer.innerHTML = `
        <div style="text-align: center; padding: 18px 8px; color: var(--text-muted); font-size: 10px;">
          No focus sessions recorded yet.<br>Complete a focus lap to generate real breakdown.
        </div>
      `;
      return;
    }

    catList.forEach(cat => {
      const pct = totalFocusMins > 0 ? Math.round((cat.minutes / totalFocusMins) * 100) : 0;
      const formattedTime = cat.minutes >= 60 ?
        `${Math.floor(cat.minutes / 60)}h ${cat.minutes % 60}m` :
        `${cat.minutes}m`;

      const row = document.createElement('div');
      row.className = 'cat-row';
      row.innerHTML = `
        <div class="cat-header">
          <span class="cat-title">${escapeHtml(cat.name)}</span>
          <div class="cat-meta">
            <span class="cat-time">${formattedTime}</span>
            <span class="cat-pct">${pct}%</span>
          </div>
        </div>
        <div class="cat-track">
          <div class="cat-fill" style="width: ${pct}%;"></div>
        </div>
      `;
      categoryContainer.appendChild(row);
    });
  }

  function renderSessionList() {
    if (!sessionContainer) return;
    sessionContainer.innerHTML = '';

    if (sessions.length === 0) {
      sessionContainer.innerHTML = `
        <div style="text-align: center; padding: 36px 12px; color: var(--text-dim); font-size: 10.5px;">
          No recorded sessions.<br>Start the timer or click <strong>+ Manual</strong> to add.
        </div>
      `;
      return;
    }

    sessions.forEach(session => {
      const card = document.createElement('div');
      card.className = 'session-card';
      card.dataset.id = session.id;

      const isFocus = session.phase === 'focus';
      const badgeClass = isFocus ? 'focus' : 'break';
      const badgeText = `${session.durationMin}M • ${isFocus ? 'FOCUS' : 'BREAK'}`;

      card.innerHTML = `
        <div class="card-top-row">
          <span class="card-timestamp">${session.date} • ${session.startTime}</span>
          <span class="card-duration-badge ${badgeClass}">${badgeText}</span>
        </div>
        <div class="card-title-row">
          <input type="text" class="session-title-input" value="${escapeHtml(session.title)}" placeholder="Add session title..." aria-label="Session Title">
          <button class="card-delete-btn" aria-label="Remove session">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      `;

      // Inline Title Change Listener
      const titleInput = card.querySelector('.session-title-input');
      titleInput.addEventListener('change', (e) => {
        session.title = e.target.value.trim() || 'Untitled Session';
        saveSessions();
        showToast("Title updated");
      });

      // Delete Listener (Muted Material Charcoal)
      const delBtn = card.querySelector('.card-delete-btn');
      delBtn.addEventListener('click', () => {
        sessions = sessions.filter(s => s.id !== session.id);
        saveSessions();
        renderSessionList();
        updateMetrics();
        showToast("Session removed");
      });

      sessionContainer.appendChild(card);
    });
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, function(m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }

  // --- 6. EXPORT UTILITIES ---
  function exportCSV() {
    if (sessions.length === 0) {
      showToast("No sessions to export");
      return;
    }

    const headers = ["ID", "Date", "Start Time", "Duration (Minutes)", "Phase", "Task Title"];
    const rows = sessions.map(s => [
      `"${s.id}"`,
      `"${s.date}"`,
      `"${s.startTime}"`,
      s.durationMin,
      `"${s.phase}"`,
      `"${(s.title || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Kronos_Sessions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Exported CSV");
  }

  function exportJSON() {
    if (sessions.length === 0) {
      showToast("No sessions to export");
      return;
    }

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sessions, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    link.setAttribute("download", `Kronos_Backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Exported JSON backup");
  }

  function copySummaryToClipboard() {
    const focusSessions = sessions.filter(s => s.phase === 'focus');
    const totalMinutes = focusSessions.reduce((acc, s) => acc + (s.durationMin || 0), 0);
    const hours = (totalMinutes / 60).toFixed(1);

    let summary = `KRONOS FOCUS LOG SUMMARY\n`;
    summary += `Total Focus Time: ${hours} hrs (${totalMinutes} mins)\n`;
    summary += `Completed Sessions: ${focusSessions.length}\n\n`;
    summary += `Session Breakdown:\n`;

    focusSessions.forEach((s, idx) => {
      summary += `${idx + 1}. [${s.date} ${s.startTime}] ${s.durationMin}m — ${s.title || 'Focus'}\n`;
    });

    navigator.clipboard.writeText(summary).then(() => {
      showToast("Summary copied to clipboard");
    }).catch(() => {
      showToast("Unable to copy to clipboard");
    });
  }

  // --- 7. TOAST FEEDBACK (Silenced Per Design Requirement) ---
  function showToast(message) {
    // Zero toasts, zero tooltips
  }

  // --- 8. FLOATING WINDOW INTERACTION & DRAG ---
  function openVaultWindow() {
    playMechanicalClick('press');
    vaultModal.style.display = 'flex';
    vaultModal.style.opacity = '1';
    vaultModal.style.transform = 'translateY(0)';
    renderSessionList();
    updateMetrics();
  }

  function closeVaultWindow() {
    playMechanicalClick('release');
    if (document.body.getAttribute('data-active-view') === 'modal-preview') {
      showToast("Modal view active");
      return;
    }
    vaultModal.style.opacity = '0';
    vaultModal.style.transform = 'translateY(10px)';
    setTimeout(() => {
      vaultModal.style.display = 'none';
    }, 160);
  }

  function toggleVaultWindow() {
    if (vaultModal.style.display === 'none' || getComputedStyle(vaultModal).display === 'none') {
      openVaultWindow();
    } else {
      closeVaultWindow();
    }
  }

  // Drag support for the title bar of the floating window
  (function initDraggableVault() {
    const handle = document.getElementById('vault-drag-handle');
    let isDragging = false;
    let startX = 0, startY = 0;
    let initialLeft = 0, initialTop = 0;

    handle.addEventListener('mousedown', (e) => {
      if (e.target.closest('.vault-window-controls')) return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = vaultModal.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;
      document.body.style.userSelect = 'none';
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      vaultModal.style.position = 'fixed';
      vaultModal.style.left = `${initialLeft + dx}px`;
      vaultModal.style.top = `${initialTop + dy}px`;
      vaultModal.style.margin = '0';
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
      document.body.style.userSelect = '';
    });
  })();

  // --- 9. EVENT LISTENERS SETUP ---
  function setupEventListeners() {
    // Dockable Controls
    toggleBtn.addEventListener('click', () => {
      if (isRunning) pauseTimer();
      else startTimer();
    });

    skipBtn.addEventListener('click', skipCurrentLap);
    resetBtn.addEventListener('click', resetCurrentTimer);
    crownBtn.addEventListener('click', toggleVaultWindow);

    // 3-Way Mode Switcher
    modeTabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        playMechanicalClick('release');
        pauseTimer();
        const mode = btn.dataset.mode;
        setPhase(mode);
      });
    });

    // Vault Window Controls
    vaultCloseBtn.addEventListener('click', closeVaultWindow);
    hudVaultBtn.addEventListener('click', toggleVaultWindow);

    // Vault Navigation Tabs
    const vaultTabs = document.querySelectorAll('.vault-tab-btn');
    vaultTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        playMechanicalClick('press');
        vaultTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const targetTab = tab.dataset.tab;
        document.querySelectorAll('.vault-tab-content').forEach(content => {
          content.classList.remove('active');
        });
        const activeContent = document.getElementById(targetTab);
        if (activeContent) activeContent.classList.add('active');

        if (targetTab === 'tab-analytics') {
          renderAnalytics();
        }
      });
    });

    // Timeframe Buttons in Analytics
    document.querySelectorAll('.tf-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeTimeframe = btn.dataset.tf || '7d';
        renderAnalytics();
      });
    });

    // Sessions Toolbar Actions
    btnQuickAdd.addEventListener('click', () => {
      playMechanicalClick('press');
      logNewSession(config.focusDurationMin, 'focus', 'Custom Focus Lap');
    });

    let clearConfirmTimer = null;
    btnClearAll.addEventListener('click', () => {
      if (btnClearAll.dataset.confirming === 'true') {
        clearTimeout(clearConfirmTimer);
        delete btnClearAll.dataset.confirming;
        btnClearAll.textContent = 'Clear All';
        sessions = [];
        saveSessions();
        renderSessionList();
        updateMetrics();
      } else {
        btnClearAll.dataset.confirming = 'true';
        btnClearAll.textContent = 'Sure?';
        clearConfirmTimer = setTimeout(() => {
          delete btnClearAll.dataset.confirming;
          btnClearAll.textContent = 'Clear All';
        }, 3000);
      }
    });

    // Export Buttons
    btnExportCsv.addEventListener('click', exportCSV);
    btnExportJson.addEventListener('click', exportJSON);
    btnCopySummary.addEventListener('click', copySummaryToClipboard);

    // HUD Top View Switcher
    const hudTabs = document.querySelectorAll('.hud-tab');
    hudTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        hudTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const viewMode = tab.dataset.view;
        document.body.setAttribute('data-active-view', viewMode);

        if (viewMode === 'modal-preview') {
          openVaultWindow();
        } else if (viewMode === 'isolated-preview') {
          closeVaultWindow();
        } else if (viewMode === 'docked-preview' || viewMode === 'split-showcase') {
          vaultModal.style.position = 'relative';
          vaultModal.style.left = 'auto';
          vaultModal.style.top = 'auto';
          vaultModal.style.margin = '0';
          vaultModal.style.display = 'flex';
          vaultModal.style.opacity = '1';
        }
      });
    });

    // HUD Audio FX Toggle
    const hudSoundBtn = document.getElementById('hud-sound-toggle');
    hudSoundBtn.addEventListener('click', () => {
      config.soundEffects = !config.soundEffects;
      config.chimeEnd = config.soundEffects;
      hudSoundBtn.querySelector('span').textContent = `Audio: ${config.soundEffects ? 'ON' : 'OFF'}`;
      hudSoundBtn.style.opacity = config.soundEffects ? '1' : '0.6';
      saveConfiguration();
    });

    function liveSyncPrefs() {
      config.focusDurationMin = parseInt(document.getElementById('pref-focus-dur').value, 10) || 25;
      config.shortBreakDurationMin = parseInt(document.getElementById('pref-short-break').value, 10) || 5;
      config.longBreakDurationMin = parseInt(document.getElementById('pref-long-break').value, 10) || 15;
      config.lapsPerCycle = parseInt(document.getElementById('pref-laps-cycle').value, 10) || 4;
      config.soundEffects = document.getElementById('pref-sound-effects').checked;
      config.chimeEnd = document.getElementById('pref-chime-end').checked;
      config.softTick = document.getElementById('pref-soft-tick').checked;

      saveConfiguration();
      if (!isRunning) {
        setPhase(currentPhase);
      }
      renderLapPips();
    }

    // Preferences Steppers & Toggles (Instant Reflection)
    document.querySelectorAll('.step-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        playMechanicalClick('press');
        const targetInput = document.getElementById(btn.dataset.step);
        if (targetInput) {
          let val = parseInt(targetInput.value, 10) + parseInt(btn.dataset.val, 10);
          val = Math.max(parseInt(targetInput.min, 10), Math.min(parseInt(targetInput.max, 10), val));
          targetInput.value = val;
          liveSyncPrefs();
        }
      });
    });

    ['pref-focus-dur', 'pref-short-break', 'pref-long-break', 'pref-laps-cycle'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', liveSyncPrefs);
    });

    ['pref-sound-effects', 'pref-chime-end', 'pref-soft-tick'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', liveSyncPrefs);
    });

    btnSavePrefs.addEventListener('click', () => {
      playMechanicalClick('press');
      liveSyncPrefs();
      saveStatus.textContent = "✓ Saved";
      setTimeout(() => { saveStatus.textContent = ""; }, 2200);
    });

    // Theme Card Click Selection
    document.querySelectorAll('.theme-card').forEach(card => {
      card.addEventListener('click', () => {
        playMechanicalClick('press');
        const themeId = card.dataset.themeId;
        if (!themeId) return;
        applyTheme(themeId);
        showToast("Theme: " + (THEME_NAMES[themeId] || themeId));
      });
    });

    // Keyboard Shortcuts (Space for Play/Pause, Esc for Close)
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
      } else if (e.code === 'Escape') {
        closeVaultWindow();
      }
    });
  }

  // --- 10. INITIALIZATION ---
  function init() {
    applyTheme(config.theme || 'charcoal');
    setPhase('focus');
    renderLapPips();
    renderSessionList();
    updateMetrics();
    setupEventListeners();

    // Sync Preferences form values with config
    document.getElementById('pref-focus-dur').value = config.focusDurationMin;
    document.getElementById('pref-short-break').value = config.shortBreakDurationMin;
    document.getElementById('pref-long-break').value = config.longBreakDurationMin;
    document.getElementById('pref-laps-cycle').value = config.lapsPerCycle;
    document.getElementById('pref-sound-effects').checked = config.soundEffects;
    document.getElementById('pref-chime-end').checked = config.chimeEnd;
    document.getElementById('pref-soft-tick').checked = config.softTick;
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
