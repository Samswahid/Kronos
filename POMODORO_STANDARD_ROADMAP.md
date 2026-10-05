# Kronos — Standard Pomodoro Architectural Roadmap: Top 10 High-Impact Features

A targeted, industry-standard roadmap transforming **Kronos** from a visual chronometer into a professional focus & work-journal engine tailored for motion designers and Adobe After Effects artists.

---

## 1. Standardized Editable Manual Session Logging
### Problem & Standard
In industry tools (Toggl, Pomofocus, Focus To-Do), manual entry lets artists log retrospectively if they worked without starting the timer or forgot to press start. Currently, Kronos only allows editing session titles, with duration hardcoded to default.

### Specification
Allow inline editing of duration (`[ 25 ] min`) directly on existing session cards, plus a mini "+ Manual" entry modal allowing custom duration (1–90 min), phase (`focus` / `deep` / `flow`), and title.

```javascript
// client/js/settings.js — Inline Duration Update Handler
durationInput.addEventListener('change', (e) => {
  const newMins = Math.min(90, Math.max(1, parseInt(e.target.value, 10) || 25));
  if (window.KronosStorage) {
    window.KronosStorage.updateDuration(session.id, newMins);
  }
  renderSessionList();
  updateMetrics();
  renderAnalytics();
});
```

---

## 2. AE Comp & Project Auto-Tagging
### Problem & Standard
Creative artists frequently switch between multiple compositions (`Main_Comp_v03`, `Social_Cut_1080x1920`). Standard tools link time to tasks.

### Specification
Kronos already reads the AE project name. Extend `getAEProjectName` in `host.jsx` to return both `projectName` and `activeCompName`. Auto-tag logged sessions with `Project • Comp Name • Lap X`.

```jsx
// host/host.jsx
$._kronos_getActiveContext = function() {
  var proj = app.project && app.project.file ? app.project.file.name.replace(/\%20/g, ' ') : 'Untitled Project';
  var comp = app.project && app.project.activeItem && (app.project.activeItem instanceof CompItem)
    ? app.project.activeItem.name
    : 'No Active Comp';
  return JSON.stringify({ project: proj, comp: comp });
};
```

---

## 3. Daily Lap Target & Visual Ring Completion
### Problem & Standard
Every Pomodoro standard (Pomofocus, Forest) includes a daily goal (e.g., "Target: 8 Laps"). Reaching this target triggers completion celebration and drives user retention.

### Specification
Add a configurable "Daily Focus Target" (default: 4 laps, min: 1, max: 12) in Preferences. In the Vault header and dockable bar, render a miniature target gauge (`3/4 Laps ★`).

```javascript
// client/js/settings.js — Daily Goal Progress
function renderDailyGoalProgress() {
  const todayLaps = calculateTodayLaps(sessions);
  const targetLaps = config.dailyLapGoal || 4;
  const isGoalReached = todayLaps >= targetLaps;
  goalIndicator.textContent = `${todayLaps}/${targetLaps} LAPS ${isGoalReached ? '★ GOAL MET' : ''}`;
}
```

---

## 4. Overtime / Flow-State Overflow Tracker
### Problem & Standard
When deep in animation keyframing, a jarring timer cutoff breaks flow. Standard apps (like *Session* on macOS) enter "Overtime mode" (+01:23, +01:24...) instead of stopping dead.

### Specification
When remaining seconds reach `00:00`, instead of halting, if `config.allowOvertime` is enabled, the split-flap pulses an amber accent ring and counts upward (+01:00, +02:00) until the user taps complete, capturing the full extended duration (capped at 90 min).

```javascript
// client/js/app.js — Overtime Flow Count
if (remainingSeconds <= 0) {
  if (config.allowOvertime && isRunning) {
    overtimeSeconds++;
    renderOvertimeFlap(overtimeSeconds);
  } else {
    completeInterval();
  }
}
```

---

## 5. Quick Task Category Badges (`Animation`, `VFX`, `Render`, `Admin`)
### Problem & Standard
Motion designers perform distinct types of work: keyframing, asset prep, client revisions, rendering. Categorization allows high-value analytics.

### Specification
Add 4 quick category pills to session cards and manual entry: `[ANIM]`, `[DESIGN]`, `[VFX]`, `[RENDER]`. Clicking a tag filters the category breakdown chart instantly.

```html
<!-- Category Selector Strip inside Session Card -->
<div class="session-category-strip">
  <button class="cat-pill active" data-cat="anim">ANIM</button>
  <button class="cat-pill" data-cat="design">DESIGN</button>
  <button class="cat-pill" data-cat="vfx">VFX</button>
  <button class="cat-pill" data-cat="render">RENDER</button>
</div>
```

---

## 6. One-Click AE Timeline Marker Export
### Problem & Standard
Freelancers and studio artists need proof-of-work and timeline milestone notes for client billing.

### Specification
Add a button in the Session Vault: **"Add Timeline Markers"**. Kronos executes an ExtendScript call placing timeline markers on the active composition at the current time with the logged session title and duration.

```jsx
// host/host.jsx — Add Comp Timeline Marker
$._kronos_addCompMarker = function(sessionTitle, durationMin) {
  var comp = app.project.activeItem;
  if (comp && comp instanceof CompItem) {
    var marker = new MarkerValue(sessionTitle + " (" + durationMin + "m)");
    marker.duration = durationMin * 60;
    comp.markerProperty.setValueAtTime(comp.time, marker);
    return "true";
  }
  return "false";
};
```

---

## 7. Auto-Start Next Phase & Smart Break Reminder
### Problem & Standard
Standard Pomodoro systems provide toggles for "Auto-start breaks" and "Auto-start focus" so users don't have to manually press start between laps.

### Specification
In Preferences under **Automation**:
- `Auto-start Next Lap`: (default: false)
- `Break Prompt Sound`: Chimes 30 seconds before interval completion as an acoustic heads-up.

```javascript
// client/js/app.js — Auto Progression
if (config.autoStartNext) {
  setTimeout(() => {
    startTimer();
  }, 1000);
}
```

---

## 8. Compact Mini-Filter & Session Search
### Problem & Standard
As artists log dozens of sessions across weeks, browsing becomes sluggish without instant search or quick date-range filtering.

### Specification
Add a micro search input above the session list in Tab 1 (`Search sessions / comps...`) with live regex search, plus quick date filters (`All`, `Today`, `This Week`).

```javascript
// client/js/settings.js — Instant Session Filter
function filterSessions(query, filterDate) {
  return sessions.filter(s => {
    const matchesQuery = s.title.toLowerCase().includes(query.toLowerCase());
    const matchesDate = filterDate === 'all' || isSessionWithinDate(s, filterDate);
    return matchesQuery && matchesDate;
  });
}
```

---

## 9. Audio Profile Selector (Analog Mechanical / Vintage Bell / Digital Quartz / Mute)
### Problem & Standard
Audio preference varies widely: some users want loud mechanical typewriter clicks, others want a soft subtle bell, while open-office animators want absolute mute or headphone-safe chimes.

### Specification
Add an audio profile dropdown alongside the Volume Slider in settings:
- **Mechanical Switch** (current triangle transient click)
- **Braun Analog Clock** (warm 80Hz wood-thud tick)
- **Zen Bell** (singing bowl harmonic decay)

```javascript
// client/js/app.js — Audio Profile Synthesis
function playEngineSound(profile, volume) {
  if (profile === 'braun_thud') {
    synthWoodThud(volume);
  } else if (profile === 'zen_bell') {
    synthHarmonicBell(volume);
  } else {
    playMechanicalClick('press');
  }
}
```

---

## 10. Direct CSV / JSON Session Backup & Restore
### Problem & Standard
Current export is one-way (export CSV/JSON). If an artist moves to a new machine or reinstalls After Effects, they need to restore their historical streak and focus records.

### Specification
Add an **"Import History"** button in Tab 3 / Tab 1. Accepts a standard Kronos JSON file and validates schema before merging without duplicates.

```javascript
// client/js/storage.js — Merge External History
function importSessionsJSON(rawJsonString) {
  try {
    const imported = JSON.parse(rawJsonString);
    if (!Array.isArray(imported)) return false;
    const existingIds = new Set(sessions.map(s => s.id));
    const merged = [...sessions, ...imported.filter(s => !existingIds.has(s.id))];
    saveSessions(merged);
    return true;
  } catch (e) {
    return false;
  }
}
```

---

### Implementation Sequencing Recommendation

| Phase | Features | Expected Effort | Impact |
|---|---|---|---|
| **Phase 1: Session Standardization** | #1 (Editable Duration), #8 (Search/Filter), #5 (Categories) | ~1-2 hours | High (Solves everyday logging friction) |
| **Phase 2: AE Context Deepening** | #2 (Comp Auto-Tagging), #6 (Timeline Marker Export) | ~1 hour | High (Unique differentiator for motion designers) |
| **Phase 3: Flow & Audio Refinement** | #3 (Daily Goal Target), #4 (Overtime Tracking), #9 (Audio Profiles) | ~1-2 hours | High (Feels like a $30 premium utility) |
| **Phase 4: Persistence & Sync** | #7 (Auto-Start Progression), #10 (JSON History Import) | ~1 hour | Medium |
