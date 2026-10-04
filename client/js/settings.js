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

  function syncThemeUI(themeId) {
    const activeTheme = themeId || (window.KronosStorage ? window.KronosStorage.getTheme() : 'charcoal');
    document.body.setAttribute('data-theme', activeTheme);
    const rootEl = document.querySelector('.vault-window-root');
    if (rootEl) rootEl.setAttribute('data-theme', activeTheme);

    const tag = document.getElementById('current-theme-name-tag');
    if (tag) tag.textContent = THEME_NAMES[activeTheme] || activeTheme;

    document.querySelectorAll('.theme-card').forEach(card => {
      if (card.dataset.themeId === activeTheme) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
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
          <span class="chart-val">${slot.mins > 0 ? slot.mins + 'm' : ''}</span>
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
          <span class="chart-val">${day.mins > 0 ? day.mins + 'm' : ''}</span>
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

    // 3. Render Real Category Breakdown
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

      const titleInput = card.querySelector('.session-title-input');
      titleInput.addEventListener('change', (e) => {
        const newTitle = e.target.value.trim() || 'Untitled Session';
        if (window.KronosStorage) {
          window.KronosStorage.updateTitle(session.id, newTitle);
        }
        renderAnalytics();
      });

      const delBtn = card.querySelector('.card-delete-btn');
      delBtn.addEventListener('click', () => {
        if (window.KronosStorage) {
          sessions = window.KronosStorage.deleteSession(session.id);
        }
        renderSessionList();
        updateMetrics();
        renderAnalytics();
      });

      sessionContainer.appendChild(card);
    });
  }

  function syncPrefsForm() {
    if (inputFocus) inputFocus.value = config.focusDurationMin || 25;
    if (inputShort) inputShort.value = config.shortBreakDurationMin || 5;
    if (inputLong) inputLong.value = config.longBreakDurationMin || 15;
    if (inputLaps) inputLaps.value = config.lapsPerCycle || 4;
    if (toggleSound) toggleSound.checked = !!config.soundEffects;
    if (toggleChime) toggleChime.checked = !!config.chimeEnd;
    if (toggleTick) toggleTick.checked = !!config.softTick;
  }

  function getFormPrefs() {
    return {
      focusDurationMin: parseInt(inputFocus.value, 10) || 25,
      shortBreakDurationMin: parseInt(inputShort.value, 10) || 5,
      longBreakDurationMin: parseInt(inputLong.value, 10) || 15,
      lapsPerCycle: parseInt(inputLaps.value, 10) || 4,
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

    // Explicit Apply Button also triggers save
    if (btnSavePrefs) {
      btnSavePrefs.addEventListener('click', autoSavePrefs);
    }

    // Theme Card Click Selection
    document.querySelectorAll('.theme-card').forEach(card => {
      card.addEventListener('click', () => {
        const themeId = card.dataset.themeId;
        if (!themeId) return;
        if (window.KronosStorage) {
          window.KronosStorage.setTheme(themeId);
        }
        syncThemeUI(themeId);
      });
    });

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

    // Storage Sync from other windows
    if (window.KronosStorage && window.KronosStorage.onSync) {
      window.KronosStorage.onSync(function (payload) {
        if (payload && (payload.theme || payload.type === 'theme')) {
          syncThemeUI(payload.theme);
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
