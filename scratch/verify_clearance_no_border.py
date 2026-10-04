from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
import os
import time

opts = Options()
opts.add_argument('--headless')
opts.add_argument('--window-size=900,700')
driver = webdriver.Chrome(options=opts)
url = 'file:///' + os.path.abspath('client/index.html').replace('\\', '/')
driver.get(url)

# Set HTML structure for Zone A and Zone C
driver.execute_script("""
  var zoneLeft = document.querySelector('.zone-left');
  if (zoneLeft) {
    zoneLeft.innerHTML = `
      <button id="kronos-crown-btn" class="squircle-modular-trigger" aria-label="Open Session Vault" title="Open Session Vault">
        <span class="squircle-bolt tl"></span>
        <span class="squircle-bolt tr"></span>
        <span class="squircle-bolt bl"></span>
        <span class="squircle-bolt br"></span>
        <div class="squircle-core-knob">
          <span class="squircle-notch"></span>
        </div>
      </button>
      <div class="lap-segment-channel" aria-label="Pomodoro cycle progress">
        <div class="lap-pips-row">
          <span class="lap-pip active" data-lap="1"></span>
          <span class="lap-pip" data-lap="2"></span>
          <span class="lap-pip" data-lap="3"></span>
          <span class="lap-pip" data-lap="4"></span>
        </div>
        <span class="lap-counter-label" id="dock-lap-label">01/04</span>
      </div>
    `;
  }

  var zoneRight = document.querySelector('.zone-right');
  if (zoneRight) {
    zoneRight.innerHTML = `
      <div class="gauge-button-capsule">
        <svg class="progress-ring-svg" width="42" height="42" viewBox="0 0 54 54">
          <circle class="ring-track" cx="27" cy="27" r="22" />
          <circle id="kronos-progress-arc" class="ring-arc" cx="27" cy="27" r="22" />
        </svg>
        <button id="kronos-toggle-btn" class="axial-plunger-btn play-pause-trigger" aria-label="Start or Pause Timer" title="Start or Pause Timer">
          <div class="plunger-dish">
            <span class="btn-face">
              <span class="plunger-pip glyph-play"></span>
              <span class="plunger-bars glyph-pause" style="display: none;">
                <span class="p-bar"></span>
                <span class="p-bar"></span>
              </span>
            </span>
          </div>
        </button>
      </div>
      <div class="micro-actions">
        <button id="kronos-skip-btn" class="micro-icon-btn" aria-label="Complete or Skip Lap" title="Skip Lap">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="5 4 15 12 5 20 5 4"></polygon>
            <line x1="19" y1="5" x2="19" y2="19"></line>
          </svg>
        </button>
        <button id="kronos-reset-btn" class="micro-icon-btn" aria-label="Reset Timer" title="Reset Timer">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
            <path d="M3 3v5h5"></path>
          </svg>
        </button>
      </div>
    `;
  }
""")

# Test CSS without any border or background on micro buttons, with ample clearance
test_css = """
.kronos-bar {
  height: 74px !important;
  box-sizing: border-box !important;
  padding: 4px 6px !important;
}

.zone-left {
  gap: 3px !important;
  justify-content: center !important;
  align-items: center !important;
}

.zone-right {
  gap: 3px !important;
  justify-content: center !important;
  align-items: center !important;
}

/* ZONE A: Modular Squircle Rotary */
.squircle-modular-trigger {
  width: 32px !important;
  height: 32px !important;
  border-radius: 7px !important;
  background: var(--theme-accent-color, #ea580c) !important;
  border: 1px solid rgba(0, 0, 0, 0.25) !important;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.45), 0 1px 2px rgba(0, 0, 0, 0.35), inset 0 1.5px 1.5px rgba(255, 255, 255, 0.55), inset 0 -1.5px 2px rgba(0, 0, 0, 0.35) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  position: relative !important;
  cursor: pointer !important;
  padding: 0 !important;
  margin: 0 !important;
  outline: none !important;
  flex-shrink: 0 !important;
  box-sizing: border-box !important;
  transition: transform 140ms cubic-bezier(0.2, 0.9, 0.3, 1.2), box-shadow 140ms ease !important;
}
.squircle-modular-trigger:hover {
  transform: translateY(-0.5px) !important;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.55), inset 0 1.5px 1.5px rgba(255, 255, 255, 0.65) !important;
}
.squircle-modular-trigger:active {
  transform: translateY(1.5px) scale(0.96) !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.6), inset 0 2px 3px rgba(0, 0, 0, 0.5) !important;
}
.squircle-bolt {
  position: absolute !important;
  width: 3px !important;
  height: 3px !important;
  border-radius: 50% !important;
  background: rgba(0, 0, 0, 0.5) !important;
  box-shadow: inset 0 0.5px 1px rgba(0, 0, 0, 0.8), 0 0.5px 0.5px rgba(255, 255, 255, 0.4) !important;
  pointer-events: none !important;
}
.squircle-bolt.tl { top: 3.5px !important; left: 3.5px !important; }
.squircle-bolt.tr { top: 3.5px !important; right: 3.5px !important; }
.squircle-bolt.bl { bottom: 3.5px !important; left: 3.5px !important; }
.squircle-bolt.br { bottom: 3.5px !important; right: 3.5px !important; }

.squircle-core-knob {
  width: 20px !important;
  height: 20px !important;
  border-radius: 50% !important;
  background: radial-gradient(circle at 45% 40%, rgba(255, 255, 255, 0.18) 0%, transparent 60%), var(--theme-plate-color, #272625) !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.55), inset 0 1px 1px rgba(255, 255, 255, 0.25), inset 0 -1px 1px rgba(0, 0, 0, 0.5) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  position: relative !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  margin: auto !important;
  transform-origin: 50% 50% !important;
  transition: transform 160ms cubic-bezier(0.2, 0.9, 0.3, 1.2) !important;
}
.squircle-modular-trigger:hover .squircle-core-knob { transform: rotate(25deg) !important; }
.squircle-notch {
  position: absolute !important;
  top: 2px !important;
  left: 50%;
  width: 2px !important;
  height: 4.5px !important;
  background: var(--theme-font-color, #ffffff) !important;
  border-radius: 1px !important;
  transform: translateX(-50%) !important;
  box-shadow: 0 0 3px var(--theme-font-color, #ffffff) !important;
}

/* Inset Lap Section */
.lap-segment-channel {
  background: var(--theme-clock-bg, #201f1e) !important;
  border: none !important;
  border-radius: 3.5px !important;
  padding: 2.5px 5px !important;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.7), 0 1px 1px rgba(255, 255, 255, 0.08) !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  gap: 2px !important;
  box-sizing: border-box !important;
}
.lap-pips-row { display: flex !important; gap: 3px !important; align-items: center !important; }
.lap-pip {
  width: 4px !important;
  height: 4px !important;
  border-radius: 50% !important;
  background: rgba(255, 255, 255, 0.15) !important;
  box-shadow: inset 0 0.5px 1px rgba(0, 0, 0, 0.8) !important;
  border: none !important;
  transition: all 120ms ease !important;
}
.lap-pip.active {
  background: var(--theme-accent-color, #ea580c) !important;
  box-shadow: 0 0 5px var(--theme-accent-color, #ea580c) !important;
}
.lap-pip.completed { background: var(--text-muted, #787878) !important; opacity: 0.8 !important; }
.lap-counter-label {
  font-family: var(--font-mono, monospace) !important;
  font-size: 7px !important;
  font-weight: 700 !important;
  color: var(--theme-font-color, #f7f4ed) !important;
  letter-spacing: 0.06em !important;
  line-height: 1 !important;
}

/* ZONE C: Axial Plunger Button & Gauge Capsule */
.gauge-button-capsule {
  position: relative !important;
  width: 40px !important;
  height: 40px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  background: var(--theme-clock-bg, #201f1e) !important;
  border-radius: 50% !important;
  box-shadow: inset 0 2.5px 5px rgba(0, 0, 0, 0.7), 0 1px 1px rgba(255, 255, 255, 0.08) !important;
  border: none !important;
  box-sizing: border-box !important;
  margin: 0 !important;
}
.progress-ring-svg {
  position: absolute !important;
  top: -1px !important;
  left: -1px !important;
  width: 42px !important;
  height: 42px !important;
  transform: rotate(-90deg) !important;
  pointer-events: none !important;
}
.ring-track { fill: none !important; stroke: rgba(255, 255, 255, 0.06) !important; stroke-width: 2.5 !important; }
.ring-arc {
  fill: none !important;
  stroke: var(--theme-accent-color, #ea580c) !important;
  stroke-width: 2.5 !important;
  stroke-linecap: round !important;
  stroke-dasharray: 138.2 !important;
  stroke-dashoffset: 0 !important;
  filter: drop-shadow(0 0 2px var(--theme-accent-color, #ea580c)) !important;
}
.axial-plunger-btn {
  width: 30px !important;
  height: 30px !important;
  border-radius: 50% !important;
  background: radial-gradient(circle at 45% 40%, rgba(255, 255, 255, 0.32) 0%, transparent 60%), var(--theme-accent-color, #ea580c) !important;
  border: 1.5px solid rgba(255, 255, 255, 0.4) !important;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.5), 0 1px 2px rgba(0, 0, 0, 0.35), inset 0 1.5px 2px rgba(255, 255, 255, 0.5), inset 0 -2px 3px rgba(0, 0, 0, 0.4) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  position: relative !important;
  cursor: pointer !important;
  padding: 0 !important;
  margin: 0 !important;
  outline: none !important;
  box-sizing: border-box !important;
  transition: transform 120ms ease, box-shadow 120ms ease, filter 120ms ease !important;
}
.axial-plunger-btn:hover {
  transform: translateY(-1px) scale(1.02) !important;
  box-shadow: 0 5px 12px rgba(0, 0, 0, 0.6), inset 0 2px 2px rgba(255, 255, 255, 0.6) !important;
}
.axial-plunger-btn:active {
  transform: translateY(1.5px) scale(0.95) !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.8), inset 0 2px 4px rgba(0, 0, 0, 0.7) !important;
}
.plunger-dish {
  width: 13px !important;
  height: 13px !important;
  border-radius: 50% !important;
  background: radial-gradient(circle at 60% 60%, rgba(0, 0, 0, 0.35) 0%, rgba(0, 0, 0, 0.7) 100%), var(--theme-plate-color, #272625) !important;
  box-shadow: inset 0 1.5px 3px rgba(0, 0, 0, 0.65), 0 1px 1px rgba(255, 255, 255, 0.25) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}
.btn-face { display: flex !important; align-items: center !important; justify-content: center !important; }
.plunger-pip.glyph-play {
  width: 3.5px !important;
  height: 3.5px !important;
  border-radius: 50% !important;
  background: var(--theme-font-color, #ffffff) !important;
  box-shadow: 0 0 3px var(--theme-font-color, #ffffff), inset 0 0.5px 1px #ffffff !important;
  display: block !important;
}
.plunger-bars.glyph-pause { display: none !important; gap: 2px !important; }
.p-bar {
  width: 2px !important;
  height: 6px !important;
  border-radius: 1px !important;
  background: var(--theme-font-color, #ffffff) !important;
  box-shadow: 0 0 3px var(--theme-font-color, #ffffff) !important;
}

/* MICRO ACTIONS: ZERO BACKGROUND, ZERO BORDER, ZERO HIGHLIGHT LINES */
.micro-actions {
  display: flex !important;
  gap: 8px !important;
  align-items: center !important;
  justify-content: center !important;
  background: transparent !important;
  padding: 0 !important;
  border-radius: 0 !important;
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
  box-sizing: border-box !important;
  margin: 0 !important;
  height: 14px !important;
}

.micro-icon-btn {
  width: 16px !important;
  height: 14px !important;
  background: transparent !important;
  border: none !important;
  outline: none !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  color: var(--text-muted, #7a756d) !important;
  opacity: 0.8 !important;
  cursor: pointer !important;
  padding: 0 !important;
  margin: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  transition: opacity 120ms ease, color 120ms ease, transform 120ms ease !important;
}
.micro-icon-btn svg {
  display: block !important;
  pointer-events: none !important;
}
.micro-icon-btn:hover {
  opacity: 1 !important;
  color: var(--theme-accent-color, #ea580c) !important;
  background: transparent !important;
  box-shadow: none !important;
  border: none !important;
  transform: translateY(-0.5px) !important;
}
.micro-icon-btn:active {
  transform: scale(0.9) !important;
  opacity: 0.7 !important;
  background: transparent !important;
  box-shadow: none !important;
  border: none !important;
}
"""

driver.execute_script("""
  var s = document.createElement('style');
  s.innerHTML = arguments[0];
  document.head.appendChild(s);
""", test_css)

themes = ['braun-1972', 'charcoal', 'neon-lilac', 'solar-ochre']
theme_colors = {
  'braun-1972': {'clockBg': '#201f1e', 'plateColor': '#272625', 'fontColor': '#f7f4ed', 'pluginBg': '#ece6da', 'accentColor': '#ea580c'},
  'charcoal': {'clockBg': '#0d0d0f', 'plateColor': '#232326', 'fontColor': '#e2e2e5', 'pluginBg': '#141414', 'accentColor': '#d97706'},
  'neon-lilac': {'clockBg': '#100c24', 'plateColor': '#2b2454', 'fontColor': '#f0ebff', 'pluginBg': '#120e24', 'accentColor': '#9b8bf4'},
  'solar-ochre': {'clockBg': '#111114', 'plateColor': '#f59f00', 'fontColor': '#121212', 'pluginBg': '#18181b', 'accentColor': '#f59f00'}
}

for t in themes:
    c = theme_colors[t]
    driver.execute_script("""
      var t = arguments[0];
      var c = arguments[1];
      document.documentElement.setAttribute('data-theme', t);
      document.body.setAttribute('data-theme', t);
      var bar = document.getElementById('kronos-dock-bar');
      if (bar) {
        bar.setAttribute('data-theme', t);
        bar.style.setProperty('--theme-clock-bg', c.clockBg);
        bar.style.setProperty('--theme-plate-color', c.plateColor);
        bar.style.setProperty('--theme-font-color', c.fontColor);
        bar.style.setProperty('--theme-plugin-bg', c.pluginBg);
        bar.style.setProperty('--theme-accent-color', c.accentColor);
      }
    """, t, c)
    time.sleep(0.1)
    bar = driver.find_element(By.ID, 'kronos-dock-bar')
    bar.screenshot(f'scratch/clean_noborder_{t}.png')
    
    # Calculate clearances
    micro = driver.find_element(By.CLASS_NAME, 'micro-actions')
    bar_rect = bar.rect
    micro_rect = micro.rect
    bottom_clearance = (bar_rect['y'] + bar_rect['height']) - (micro_rect['y'] + micro_rect['height'])
    print(f'{t}: micro-actions bottom clearance = {bottom_clearance:.1f}px')

driver.quit()
