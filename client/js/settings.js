/**
 * KRONOS — Modeless Session Vault, Preferences & Dynamic Analytics Engine
 * Aligned with Citadel / Splice AE Modeless extension architecture.
 * Real data computed live from KronosStorage • Zero mockups • Zero toasts.
 */

(function () {
  'use strict';

  const csInterface = (typeof CSInterface !== 'undefined') ? new CSInterface() : null;

  // --- 1. DOM REFERENCES ---
  const sessionContainer = document.getElementById('session-cards-container');
  const sessionCountBadge = document.getElementById('session-count-badge');
  const headerFocusTime = document.getElementById('header-focus-time');
  const metricTodayTime = document.getElementById('metric-today-time');
  const metricTodayLaps = document.getElementById('metric-today-laps');
  const metricStreak = document.getElementById('metric-streak');
  const btnExportCsv = document.getElementById('btn-export-csv');
  const btnExportJson = document.getElementById('btn-export-json');
  const btnImportJson = document.getElementById('btn-import-json');
  const inputImportJson = document.getElementById('input-import-json');
  const btnCopySummary = document.getElementById('btn-copy-summary');
  const btnQuickAdd = document.getElementById('btn-quick-add-session');
  const btnClearAll = document.getElementById('btn-clear-all');
  const btnSavePrefs = document.getElementById('btn-save-prefs');
  const saveStatus = document.getElementById('save-status-indicator');
  const vaultCloseBtn = document.getElementById('vault-close-btn');

  // Analytics References
  const chartTitle = document.getElementById('analytics-chart-title');
  const chartSub = document.getElementById('analytics-chart-sub');
  const barChartContainer = document.getElementById('analytics-bar-chart');
  const categoryContainer = document.getElementById('category-breakdown-list');

  // Preferences Inputs
  const inputFocus = document.getElementById('pref-focus-dur');
  const inputShort = document.getElementById('pref-short-break');
  const inputLong = document.getElementById('pref-long-break');
  const inputLaps = document.getElementById('pref-laps-cycle');
  const inputVolume = document.getElementById('pref-volume');
  const volumeVal = document.getElementById('pref-volume-val');
  const selectAudioProfile = document.getElementById('pref-audio-profile');
  const toggleSound = document.getElementById('pref-sound-effects');
  const toggleChime = document.getElementById('pref-chime-end');
  const toggleTick = document.getElementById('pref-soft-tick');

  // --- 2. DATA LOAD & STATE ---
  let sessions = [];
  let config = {};
  let activeTimeframe = '7d'; // 'daily' | '7d' | 'monthly'

  const THEME_NAMES = {
    'charcoal': 'Charcoal Flap',
    'neon-lilac': 'Neon Lilac',
    'braun-1972': 'Braun 1972',
    'cyber-violet': 'Cyber Violet',
    'kyoto-matcha': 'Kyoto Matcha',
    'cobalt-runner': 'Cobalt Runner',
    'solar-ochre': 'Solar Ochre'
  };

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
      document.querySelector('.vault-window-root')
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

  function syncThemeUI(themeId) {
    const activeTheme = themeId || (window.KronosStorage ? window.KronosStorage.getTheme() : 'charcoal');
    document.documentElement.setAttribute('data-theme', activeTheme);
    document.body.setAttribute('data-theme', activeTheme);
    const rootEl = document.querySelector('.vault-window-root');
    if (rootEl) rootEl.setAttribute('data-theme', activeTheme);

    const tag = document.getElementById('current-theme-name-tag');
    if (tag) tag.textContent = THEME_NAMES[activeTheme] || activeTheme;

    // Apply active theme 5 colors to CSS custom properties
    if (window.KronosStorage) {
      const activeColors = window.KronosStorage.getThemeColors(activeTheme);
      applyColorsToRoot(activeColors);
    }

    // Synchronize all cards, swatches, and active states
    document.querySelectorAll('.theme-card').forEach(card => {
      const cardThemeId = card.dataset.themeId;
      if (cardThemeId === activeTheme) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }

      if (window.KronosStorage && cardThemeId) {
        const themeColors = window.KronosStorage.getThemeColors(cardThemeId);
        card.querySelectorAll('.swatch').forEach(swatch => {
          const key = swatch.dataset.colorKey;
          if (key && themeColors[key]) {
            swatch.style.background = themeColors[key];
            const inp = swatch.querySelector('.swatch-color-picker');
            if (inp) inp.value = themeColors[key];
          }
        });
      }
    });
  }

  function reloadData() {
    if (window.KronosStorage) {
      sessions = window.KronosStorage.getSessions();
      config = window.KronosStorage.getPrefs();
    }
    renderSessionList();
    updateMetrics();
    renderAnalytics();
    syncPrefsForm();
    syncThemeUI(config.theme || (window.KronosStorage ? window.KronosStorage.getTheme() : 'charcoal'));
  }

  // Helper: Date parsing
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

  // --- 3. METRICS & STREAK COMPUTATION ---
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
    // If no session today yet, allow streak from yesterday to be counted
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
  }

  // --- 4. DYNAMIC ANALYTICS ENGINE (ZERO MOCKUPS) ---
  function renderAnalytics() {
    if (!barChartContainer || !categoryContainer) return;

    // 1. Update Section Headers
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

    // 2. Render Velocity Bar Chart
    barChartContainer.innerHTML = '';
    const now = new Date();

    if (activeTimeframe === 'daily') {
      // 6 two-hour daytime blocks: 8A-10A, 10A-12P, 12P-2P, 2P-4P, 4P-6P, 6P-8P, 8P+
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
          <span class="chart-val">${slot.mins > 0 ? slot.mins : ''}</span>
          <div class="chart-bar-wrap">
            <div class="chart-bar ${slot.mins > 0 ? 'active' : ''}" style="height: ${pct}%;"></div>
          </div>
          <span class="col-day">${slot.label}</span>
        `;
        barChartContainer.appendChild(col);
      });

    } else if (activeTimeframe === '7d') {
      // Last 7 calendar days
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
          <span class="chart-val">${day.mins > 0 ? day.mins : ''}</span>
          <div class="chart-bar-wrap">
            <div class="chart-bar ${day.mins > 0 ? 'active' : ''} ${day.isToday ? 'current' : ''}" style="height: ${pct}%;"></div>
          </div>
          <span class="col-day">${day.label}</span>
        `;
        barChartContainer.appendChild(col);
      });

    } else {
      // Monthly: 4 weekly buckets
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
        col.innerHTML = `
          <span class="chart-val">${w.mins > 0 ? w.mins : ''}</span>
          <div class="chart-bar-wrap">
            <div class="chart-bar ${w.mins > 0 ? 'active' : ''} ${w.current ? 'current' : ''}" style="height: ${pct}%;"></div>
          </div>
          <span class="col-day">${w.label}</span>
        `;
        barChartContainer.appendChild(col);
      });
    }

    // 3. Render Real Category Breakdown (Integrating Session Tags)
    categoryContainer.innerHTML = '';
    const categories = {};
    let totalFocusMins = 0;

    sessions.filter(s => s.phase === 'focus').forEach(s => {
      let catNames = [];
      if (Array.isArray(s.tags) && s.tags.length > 0) {
        catNames = s.tags;
      } else {
        let rawTitle = s.title || 'General Focus';
        let cName = rawTitle.split('•')[0].trim();
        catNames = [cName || 'General Focus'];
      }
      const dur = s.durationMin || 0;
      totalFocusMins += dur;

      catNames.forEach(catName => {
        if (!categories[catName]) {
          categories[catName] = { name: catName, minutes: 0, count: 0 };
        }
        categories[catName].minutes += Math.round(dur / catNames.length);
        categories[catName].count += 1;
      });
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

  // --- 5. SESSION CARDS RENDER ---
  function renderSessionList() {
    if (!sessionContainer) return;
    sessionContainer.innerHTML = '';

    if (sessions.length === 0) {
      sessionContainer.innerHTML = `
        <div style="text-align: center; padding: 40px 12px; color: var(--text-dim); font-size: 10.5px;">
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
      const tags = Array.isArray(session.tags) ? session.tags : [];

      card.innerHTML = `
        <div class="card-top-row">
          <span class="card-timestamp">${session.date} • ${session.startTime}</span>
          <div class="card-duration-edit ${badgeClass}">
            <input type="number" class="session-duration-input" value="${session.durationMin || 25}" min="1" max="90" aria-label="Edit duration minutes">
            <span class="card-duration-unit">M • ${isFocus ? 'FOCUS' : 'BREAK'}</span>
          </div>
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
        <div class="card-tags-row">
          <div class="tags-scroll-strip">
            ${tags.map((tag, idx) => `
              <span class="tag-chip" data-idx="${idx}">
                <input type="text" class="tag-name-edit" value="${escapeHtml(tag)}" maxlength="24">
                <button class="tag-del-btn" aria-label="Delete tag">&times;</button>
              </span>
            `).join('')}
            <button class="add-tag-btn">+ Tag</button>
          </div>
          <button class="card-resume-btn" aria-label="Resume session in Focus Bar">
            <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            Resume
          </button>
        </div>
      `;

      // 1. Duration input edit
      const durInput = card.querySelector('.session-duration-input');
      durInput.addEventListener('change', (e) => {
        const val = Math.min(90, Math.max(1, parseInt(e.target.value, 10) || 25));
        durInput.value = val;
        session.durationMin = val;
        if (window.KronosStorage) {
          window.KronosStorage.updateDuration(session.id, val);
        }
        updateMetrics();
        renderAnalytics();
      });

      // 2. Title edit
      const titleInput = card.querySelector('.session-title-input');
      titleInput.addEventListener('change', (e) => {
        const newTitle = e.target.value.trim() || 'Untitled Session';
        session.title = newTitle;
        if (window.KronosStorage) {
          window.KronosStorage.updateTitle(session.id, newTitle);
        }
        renderAnalytics();
      });

      // 3. Delete session
      const delBtn = card.querySelector('.card-delete-btn');
      delBtn.addEventListener('click', () => {
        if (window.KronosStorage) {
          sessions = window.KronosStorage.deleteSession(session.id);
        }
        renderSessionList();
        updateMetrics();
        renderAnalytics();
      });

      // 4. Tags: Edit existing tag
      card.querySelectorAll('.tag-name-edit').forEach((input, tIdx) => {
        input.addEventListener('change', (e) => {
          const newTag = e.target.value.trim();
          if (newTag) {
            tags[tIdx] = newTag;
          } else {
            tags.splice(tIdx, 1);
          }
          session.tags = tags;
          if (window.KronosStorage) {
            window.KronosStorage.updateTags(session.id, tags);
          }
          renderSessionList();
          renderAnalytics();
        });
      });

      // 5. Tags: Delete tag
      card.querySelectorAll('.tag-del-btn').forEach((btn, tIdx) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          tags.splice(tIdx, 1);
          session.tags = tags;
          if (window.KronosStorage) {
            window.KronosStorage.updateTags(session.id, tags);
          }
          renderSessionList();
          renderAnalytics();
        });
      });

      // 6. Tags: Add new tag button
      const addTagBtn = card.querySelector('.add-tag-btn');
      addTagBtn.addEventListener('click', () => {
        addTagBtn.style.display = 'none';
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'tag-inline-input';
        input.placeholder = 'Tag...';
        input.maxLength = 20;
        addTagBtn.parentNode.insertBefore(input, addTagBtn);
        input.focus();

        const commitTag = () => {
          const val = input.value.trim();
          if (val && !tags.includes(val)) {
            tags.push(val);
            session.tags = tags;
            if (window.KronosStorage) {
              window.KronosStorage.updateTags(session.id, tags);
            }
          }
          renderSessionList();
          renderAnalytics();
        };

        input.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter') commitTag();
          else if (ev.key === 'Escape') {
            input.remove();
            addTagBtn.style.display = '';
          }
        });
        input.addEventListener('blur', commitTag);
      });

      // 7. Resume Session in Dockable Panel
      const resumeBtn = card.querySelector('.card-resume-btn');
      resumeBtn.addEventListener('click', () => {
        if (window.KronosStorage) {
          window.KronosStorage.broadcastSync("resume_session", {
            id: session.id,
            title: session.title,
            phase: session.phase || 'focus',
            durationMin: session.durationMin || 25,
            tags: session.tags || []
          });
        }
        try {
          if (window.__adobe_cep__) {
            window.__adobe_cep__.requestOpenExtension("neographs.kronos.panel", "");
          } else if (csInterface && csInterface.requestOpenExtension) {
            csInterface.requestOpenExtension("neographs.kronos.panel", "");
          }
        } catch (e) {}
      });

      sessionContainer.appendChild(card);
    });
  }

  function syncPrefsForm() {
    if (inputFocus) inputFocus.value = config.focusDurationMin || 25;
    if (inputShort) inputShort.value = config.shortBreakDurationMin || 50;
    if (inputLong) inputLong.value = config.longBreakDurationMin || 90;
    if (inputLaps) inputLaps.value = Math.min(5, config.lapsPerCycle || 4);
    const vol = (config && typeof config.volume === 'number') ? config.volume : 80;
    if (inputVolume) inputVolume.value = vol;
    if (volumeVal) volumeVal.textContent = vol + '%';
    if (selectAudioProfile) selectAudioProfile.value = config.audioProfile || 'mechanical';
    if (toggleSound) toggleSound.checked = !!config.soundEffects;
    if (toggleChime) toggleChime.checked = !!config.chimeEnd;
    if (toggleTick) toggleTick.checked = !!config.softTick;
  }

  function getFormPrefs() {
    return {
      focusDurationMin: Math.min(90, Math.max(1, parseInt(inputFocus.value, 10) || 25)),
      shortBreakDurationMin: Math.min(90, Math.max(1, parseInt(inputShort.value, 10) || 50)),
      longBreakDurationMin: Math.min(90, Math.max(1, parseInt(inputLong.value, 10) || 90)),
      lapsPerCycle: Math.min(5, Math.max(1, parseInt(inputLaps.value, 10) || 4)),
      volume: inputVolume ? parseInt(inputVolume.value, 10) : ((config && config.volume) ?? 80),
      audioProfile: selectAudioProfile ? selectAudioProfile.value : (config.audioProfile || 'mechanical'),
      soundEffects: toggleSound ? toggleSound.checked : true,
      chimeEnd: toggleChime ? toggleChime.checked : true,
      softTick: toggleTick ? toggleTick.checked : false,
      theme: (window.KronosStorage ? window.KronosStorage.getTheme() : config.theme) || 'charcoal'
    };
  }

  function autoSavePrefs() {
    const updated = getFormPrefs();
    if (window.KronosStorage) {
      config = window.KronosStorage.savePrefs(updated);
    }
    if (saveStatus) {
      saveStatus.textContent = "✓ Synced";
      setTimeout(() => { if (saveStatus) saveStatus.textContent = ""; }, 1500);
    }
  }

  function escapeHtml(str) {
    return (str || '').replace(/[&<>"']/g, function(m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }

  // --- 6. EXPORT CAPABILITIES ---
  function exportCSV() {
    if (sessions.length === 0) return;

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
  }

  function exportJSON() {
    if (sessions.length === 0) return;

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sessions, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    link.setAttribute("download", `Kronos_Backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

    navigator.clipboard.writeText(summary);
  }

  // --- 7. TOAST FEEDBACK (Silenced Per Design Requirement) ---
  function showToast(message) {
    // Zero toasts, zero tooltips
  }

  // --- 8. EVENT LISTENERS ---
  function setupEventListeners() {
    // Window Close
    if (vaultCloseBtn) {
      vaultCloseBtn.addEventListener('click', () => {
        if (csInterface && csInterface.closeExtension) {
          csInterface.closeExtension();
        } else {
          window.close();
        }
      });
    }

    // Tabs Switcher
    const vaultTabs = document.querySelectorAll('.vault-tab-btn');
    vaultTabs.forEach(tab => {
      tab.addEventListener('click', () => {
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

    // Toolbar Actions
    if (btnQuickAdd) {
      btnQuickAdd.addEventListener('click', () => {
        const now = new Date();
        const dateFormatted = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const timeFormatted = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        const newSession = {
          id: "sess-" + Date.now(),
          date: dateFormatted,
          startTime: timeFormatted,
          durationMin: config.focusDurationMin || 25,
          phase: 'focus',
          title: 'Custom Focus Lap',
          completed: true
        };

        if (window.KronosStorage) {
          sessions = window.KronosStorage.addSession(newSession);
        }
        renderSessionList();
        updateMetrics();
        renderAnalytics();
      });
    }

    let clearConfirmTimer = null;
    if (btnClearAll) {
      btnClearAll.addEventListener('click', () => {
        if (btnClearAll.dataset.confirming === 'true') {
          clearTimeout(clearConfirmTimer);
          delete btnClearAll.dataset.confirming;
          btnClearAll.textContent = 'Clear';
          if (window.KronosStorage) {
            sessions = window.KronosStorage.clearSessions();
          }
          renderSessionList();
          updateMetrics();
          renderAnalytics();
        } else {
          btnClearAll.dataset.confirming = 'true';
          btnClearAll.textContent = 'Sure?';
          clearConfirmTimer = setTimeout(() => {
            delete btnClearAll.dataset.confirming;
            btnClearAll.textContent = 'Clear';
          }, 3000);
        }
      });
    }

    // Export Actions
    if (btnExportCsv) btnExportCsv.addEventListener('click', exportCSV);
    if (btnExportJson) btnExportJson.addEventListener('click', exportJSON);
    if (btnCopySummary) btnCopySummary.addEventListener('click', copySummaryToClipboard);

    // Instant Reflection: Steppers Auto-Save and Broadcast
    document.querySelectorAll('.step-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetInput = document.getElementById(btn.dataset.step);
        if (targetInput) {
          let val = parseInt(targetInput.value, 10) + parseInt(btn.dataset.val, 10);
          val = Math.max(parseInt(targetInput.min, 10), Math.min(parseInt(targetInput.max, 10), val));
          targetInput.value = val;
          autoSavePrefs();
        }
      });
    });

    // Inputs Auto-Save on change
    [inputFocus, inputShort, inputLong, inputLaps].forEach(input => {
      if (input) {
        input.addEventListener('change', autoSavePrefs);
      }
    });

    // Toggles Auto-Save on change
    [toggleSound, toggleChime, toggleTick].forEach(toggle => {
      if (toggle) {
        toggle.addEventListener('change', autoSavePrefs);
      }
    });

    // Volume Slider Auto-Save and readout
    if (inputVolume) {
      inputVolume.addEventListener('input', (e) => {
        if (volumeVal) volumeVal.textContent = e.target.value + '%';
      });
      inputVolume.addEventListener('change', autoSavePrefs);
    }

    // Explicit Apply Button also triggers save
    if (btnSavePrefs) {
      btnSavePrefs.addEventListener('click', autoSavePrefs);
    }

    // Theme Card Click Selection
    document.querySelectorAll('.theme-card').forEach(card => {
      card.addEventListener('click', (e) => {
        // Ignore clicks originated from swatches or reset buttons
        if (e.target.closest('.swatch') || e.target.closest('.theme-reset-btn')) return;
        const themeId = card.dataset.themeId;
        if (!themeId) return;
        if (window.KronosStorage) {
          window.KronosStorage.setTheme(themeId);
        }
        syncThemeUI(themeId);
      });
    });

    // Swatch Color Pickers (5 sections per theme)
    document.querySelectorAll('.theme-card .swatch').forEach(swatch => {
      const card = swatch.closest('.theme-card');
      const themeId = swatch.dataset.themeId || (card ? card.dataset.themeId : null);
      const colorKey = swatch.dataset.colorKey;
      const input = swatch.querySelector('.swatch-color-picker');
      if (!input || !themeId || !colorKey) return;

      swatch.addEventListener('click', (e) => {
        e.stopPropagation();
      });

      function commitColor(hex) {
        swatch.style.background = hex;
        if (window.KronosStorage) {
          window.KronosStorage.setThemeColor(themeId, colorKey, hex);
        }
        const currentActiveTheme = window.KronosStorage ? window.KronosStorage.getTheme() : 'charcoal';
        if (themeId === currentActiveTheme) {
          syncThemeUI(themeId);
        }
      }

      // Live spectrum drag + immediate commit to disk and sync bus
      input.addEventListener('input', (e) => {
        e.stopPropagation();
        commitColor(e.target.value);
      });

      // Committed change: save to KronosStorage and broadcast sync
      input.addEventListener('change', (e) => {
        e.stopPropagation();
        commitColor(e.target.value);
      });
    });

    // "Sync to Panel" Manual Triggers
    function handleSyncToPanel(btnEl) {
      if (!window.KronosStorage) return;
      const currentActiveTheme = window.KronosStorage.getTheme();
      const currentColors = window.KronosStorage.getThemeColors(currentActiveTheme);
      window.KronosStorage.savePrefs(window.KronosStorage.getPrefs());
      window.KronosStorage.broadcastSync("theme", { theme: currentActiveTheme, colors: currentColors });
      window.KronosStorage.broadcastSync("theme_color", { themeId: currentActiveTheme, colors: currentColors });

      if (btnEl) {
        btnEl.classList.add('synced');
        const span = btnEl.querySelector('span') || btnEl;
        const prevText = span.textContent;
        span.textContent = 'Synced ✓';
        setTimeout(() => {
          btnEl.classList.remove('synced');
          span.textContent = prevText || 'Sync';
        }, 1200);
      }
    }

    const titleSyncBtn = document.getElementById('vault-sync-btn');
    if (titleSyncBtn) {
      titleSyncBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleSyncToPanel(titleSyncBtn);
      });
    }

    const themeSyncBtn = document.getElementById('btn-sync-theme-to-dock');
    if (themeSyncBtn) {
      themeSyncBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleSyncToPanel(themeSyncBtn);
      });
    }

    // Theme Palette Reset Buttons
    document.querySelectorAll('.theme-reset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const themeId = btn.dataset.themeId;
        if (!themeId || !window.KronosStorage) return;
        const resetColors = window.KronosStorage.resetThemeColors(themeId);

        const card = btn.closest('.theme-card');
        if (card) {
          card.querySelectorAll('.swatch').forEach(swatch => {
            const key = swatch.dataset.colorKey;
            if (key && resetColors[key]) {
              swatch.style.background = resetColors[key];
              const inp = swatch.querySelector('.swatch-color-picker');
              if (inp) inp.value = resetColors[key];
            }
          });
        }

        const currentActiveTheme = window.KronosStorage ? window.KronosStorage.getTheme() : 'charcoal';
        if (themeId === currentActiveTheme) {
          syncThemeUI(themeId);
        }
      });
    });

    // JSON Session Backup & Restore
    if (btnImportJson && inputImportJson) {
      btnImportJson.addEventListener('click', () => {
        inputImportJson.click();
      });

      inputImportJson.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (evt) {
          try {
            const parsed = JSON.parse(evt.target.result);
            if (Array.isArray(parsed) && window.KronosStorage) {
              const added = window.KronosStorage.importSessions(parsed);
              sessions = window.KronosStorage.getSessions();
              renderSessionList();
              updateMetrics();
              renderAnalytics();
              if (saveStatus) {
                saveStatus.textContent = `✓ Restored ${added} sessions`;
                setTimeout(() => { if (saveStatus) saveStatus.textContent = ""; }, 2500);
              }
            } else {
              alert("Invalid JSON format. Expected an array of Kronos sessions.");
            }
          } catch (err) {
            alert("Error parsing backup JSON file: " + err.message);
          }
          inputImportJson.value = '';
        };
        reader.readAsText(file);
      });
    }

    // Audio Profile Selector change
    if (selectAudioProfile) {
      selectAudioProfile.addEventListener('change', () => {
        autoSavePrefs();
        if (window.KronosStorage) {
          window.KronosStorage.broadcastSync("audio_profile", { profile: selectAudioProfile.value });
        }
      });
    }

    // Esc Key closes window
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (csInterface && csInterface.closeExtension) {
          csInterface.closeExtension();
        } else {
          window.close();
        }
      }
    });

    // Suppress all browser default tooltips
    document.addEventListener('mouseover', function (e) {
      if (e.target && e.target.hasAttribute && e.target.hasAttribute('title')) {
        e.target.removeAttribute('title');
      }
    }, true);

    // Active Disk Polling Watcher: guarantees zero missed sessions when floating window is open
    (function setupSessionsDiskWatcher() {
      if (typeof window.require !== 'function') return;
      try {
        const fs = window.require('fs');
        const sessionsPath = "C:\\Users\\Admin\\AppData\\Local\\NeoGraphs\\Kronos\\sessions.json";
        let lastMtime = 0;
        if (fs.existsSync(sessionsPath)) {
          lastMtime = fs.statSync(sessionsPath).mtimeMs;
        }
        setInterval(function () {
          try {
            if (!fs.existsSync(sessionsPath)) return;
            const stat = fs.statSync(sessionsPath);
            if (stat.mtimeMs !== lastMtime) {
              lastMtime = stat.mtimeMs;
              if (window.KronosStorage) {
                sessions = window.KronosStorage.getSessions();
                renderSessionList();
                updateMetrics();
                renderAnalytics();
              }
            }
          } catch (e) {}
        }, 250);
      } catch (e) {}
    })();

    // Storage Sync from other windows
    if (window.KronosStorage && window.KronosStorage.onSync) {
      window.KronosStorage.onSync(function (payload) {
        if (payload && (payload.theme || payload.themeId || payload.type === 'theme' || payload.type === 'theme_color' || payload.type === 'theme_reset')) {
          syncThemeUI(payload.themeId || payload.theme);
        }
        if (window.KronosStorage) {
          sessions = window.KronosStorage.getSessions();
          config = window.KronosStorage.getPrefs();
        }
        renderSessionList();
        updateMetrics();
        renderAnalytics();
      });
    }
  }

  function init() {
    reloadData();
    setupEventListeners();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
