from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
import os, time

opts = Options()
opts.add_argument('--headless')
opts.add_argument('--window-size=900,700')
driver = webdriver.Chrome(options=opts)
url = 'file:///' + os.path.abspath('client/index.html').replace('\\', '/')
driver.get(url)

# HTML for Zones A & C
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
        <span class="lap-counter-label" id="dock-lap-label">LAP 1/4</span>
      </div>
    `;
  }

  var zoneRight = document.querySelector('.zone-right');
  if (zoneRight) {
    zoneRight.innerHTML = `
      <div class="gauge-button-capsule">
        <svg class="progress-ring-svg" width="44" height="44" viewBox="0 0 54 54">
          <circle class="ring-track" cx="27" cy="27" r="21.5" />
          <circle id="kronos-progress-arc" class="ring-arc" cx="27" cy="27" r="21.5" />
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
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="5 4 15 12 5 20 5 4"></polygon>
            <line x1="19" y1="5" x2="19" y2="19"></line>
          </svg>
        </button>
        <button id="kronos-reset-btn" class="micro-icon-btn" aria-label="Reset Timer" title="Reset Timer">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
            <path d="M3 3v5h5"></path>
          </svg>
        </button>
      </div>
    `;
  }
""")

# Complete Refined CSS matching all 3 user requirements
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

/* Inset Lap Section - Mapped to Font Color (Timer Digits / Active Focus) */
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
  background: var(--theme-font-color, #ffffff) !important;
  box-shadow: 0 0 5px var(--theme-font-color, #ffffff), inset 0 0.5px 1px #ffffff !important;
}
.lap-pip.completed { background: var(--text-muted, #787878) !important; opacity: 0.6 !important; }
.lap-counter-label {
  font-family: var(--font-mono, monospace) !important;
  font-size: 7px !important;
  font-weight: 700 !important;
  color: var(--theme-font-color, #ffffff) !important;
  letter-spacing: 0.06em !important;
  line-height: 1 !important;
}

/* ZONE C: Axial Plunger (Braun Action 03 Authentic)
   Dark recessed surrounding socket channel + Dead centered cylinder with no hover shift */
.gauge-button-capsule {
  position: relative !important;
  width: 42px !important;
  height: 42px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  background: var(--theme-clock-bg, #111215) !important;
  border-radius: 50% !important;
  box-shadow: inset 0 3px 6px rgba(0, 0, 0, 0.85), 0 1px 1px rgba(255, 255, 255, 0.1) !important;
  border: 1.5px solid rgba(255, 255, 255, 0.08) !important;
  box-sizing: border-box !important;
  margin: 0 !important;
}
.progress-ring-svg {
  position: absolute !important;
  top: -2px !important;
  left: -2px !important;
  width: 44px !important;
  height: 44px !important;
  transform: rotate(-90deg) !important;
  pointer-events: none !important;
}
.ring-track { fill: none !important; stroke: rgba(0, 0, 0, 0.35) !important; stroke-width: 2 !important; }
.ring-arc {
  fill: none !important;
  stroke: var(--theme-accent-color, #ea580c) !important;
  stroke-width: 2 !important;
  stroke-linecap: round !important;
  stroke-dasharray: 135.1 !important;
  stroke-dashoffset: 135.1 !important;
  filter: drop-shadow(0 0 2px var(--theme-accent-color, #ea580c)) !important;
  transition: stroke-dashoffset 180ms linear !important;
}

.axial-plunger-btn {
  width: 30px !important;
  height: 30px !important;
  border-radius: 50% !important;
  background: radial-gradient(circle at 50% 35%, rgba(255, 255, 255, 0.38) 0%, rgba(255, 255, 255, 0.05) 45%, transparent 60%), var(--theme-accent-color, #ea580c) !important;
  border: 1.5px solid rgba(255, 255, 255, 0.4) !important;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.6), inset 0 1.5px 2px rgba(255, 255, 255, 0.5), inset 0 -2px 3px rgba(0, 0, 0, 0.45) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  position: relative !important;
  cursor: pointer !important;
  padding: 0 !important;
  margin: auto !important;
  outline: none !important;
  box-sizing: border-box !important;
  transform: none !important;
  transition: filter 120ms ease, box-shadow 120ms ease, transform 120ms ease !important;
}

/* On hover: NO SHIFT! Perfectly dead center! Just clean luminous tactile enhancement */
.axial-plunger-btn:hover {
  transform: none !important;
  filter: brightness(1.08) !important;
  box-shadow: 0 5px 12px rgba(0, 0, 0, 0.65), inset 0 1.5px 2px rgba(255, 255, 255, 0.65), inset 0 -2px 3px rgba(0, 0, 0, 0.45) !important;
}

/* On active (click): Just plunges smoothly straight into socket */
.axial-plunger-btn:active {
  transform: scale(0.96) !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.8), inset 0 2.5px 4px rgba(0, 0, 0, 0.7) !important;
  filter: brightness(0.95) !important;
}

/* Finger-sculpted Concave Thumb Dish - 100% Dead Center */
.plunger-dish {
  width: 13px !important;
  height: 13px !important;
  border-radius: 50% !important;
  background: radial-gradient(circle at 50% 50%, rgba(0, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0.7) 100%), var(--theme-accent-color, #ea580c) !important;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.75), 0 1px 1px rgba(255, 255, 255, 0.35) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  margin: auto !important;
  position: relative !important;
}

.btn-face {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  margin: auto !important;
}

/* Crisp White Jewel Pip - 100% Dead Center */
.plunger-pip.glyph-play {
  width: 3.5px !important;
  height: 3.5px !important;
  border-radius: 50% !important;
  background: #ffffff !important;
  box-shadow: 0 0 5px #ffffff, inset 0 0.5px 1px #ffffff !important;
  display: block !important;
  margin: auto !important;
}

.plunger-bars.glyph-pause {
  display: none !important;
  gap: 2px !important;
  align-items: center !important;
  justify-content: center !important;
  margin: auto !important;
}

.p-bar {
  width: 2px !important;
  height: 5px !important;
  border-radius: 1px !important;
  background: #ffffff !important;
  box-shadow: 0 0 3px #ffffff !important;
}

/* MICRO ACTIONS: Recessed container with NO border, Keycaps with NO border, Ample Bottom Clearance */
.micro-actions {
  display: flex !important;
  gap: 3.5px !important;
  align-items: center !important;
  justify-content: center !important;
  background: var(--theme-clock-bg, #201f1e) !important;
  padding: 2px 4px !important;
  border-radius: 3.5px !important;
  border: none !important;
  outline: none !important;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.7), 0 1px 1px rgba(255, 255, 255, 0.08) !important;
  box-sizing: border-box !important;
  margin: 0 !important;
  height: 16px !important;
}

.micro-icon-btn {
  width: 18px !important;
  height: 12px !important;
  background: var(--theme-plate-color, #272625) !important;
  border: none !important;
  outline: none !important;
  border-radius: 2px !important;
  box-shadow: 0 1.5px 3px rgba(0, 0, 0, 0.45) !important;
  color: var(--theme-font-color, #f7f4ed) !important;
  cursor: pointer !important;
  padding: 0 !important;
  margin: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  transition: filter 120ms ease, transform 120ms ease !important;
}

.micro-icon-btn svg {
  display: block !important;
  pointer-events: none !important;
}

.micro-icon-btn:hover {
  filter: brightness(1.25) !important;
  transform: translateY(-0.5px) !important;
}

.micro-icon-btn:active {
  transform: translateY(0.5px) scale(0.96) !important;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.8) !important;
}
"""

driver.execute_script("""
  var s = document.createElement('style');
  s.innerHTML = arguments[0];
  document.head.appendChild(s);
""", test_css)

themes = ['braun-1972', 'charcoal', 'solar-ochre', 'neon-lilac']
theme_colors = {
  'braun-1972': {'clockBg': '#201f1e', 'plateColor': '#272625', 'fontColor': '#f7f4ed', 'pluginBg': '#ece6da', 'accentColor': '#ea580c'},
  'charcoal': {'clockBg': '#0d0d0f', 'plateColor': '#232326', 'fontColor': '#e2e2e5', 'pluginBg': '#141414', 'accentColor': '#d97706'},
  'solar-ochre': {'clockBg': '#111114', 'plateColor': '#f59f00', 'fontColor': '#121212', 'pluginBg': '#18181b', 'accentColor': '#f59f00'},
  'neon-lilac': {'clockBg': '#100c24', 'plateColor': '#2b2454', 'fontColor': '#f0ebff', 'pluginBg': '#120e24', 'accentColor': '#9b8bf4'}
}

# Also test progression active state (e.g. 50% filled ring arc!)
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
      // Set active pip to fontColor
      var activePip = document.querySelector('.lap-pip.active');
      if (activePip) {
        activePip.style.setProperty('background', c.fontColor, 'important');
        activePip.style.setProperty('box-shadow', '0 0 5px ' + c.fontColor, 'important');
      }
      var lapLbl = document.getElementById('dock-lap-label');
      if (lapLbl) {
        lapLbl.style.setProperty('color', c.fontColor, 'important');
      }
      // Test progression arc filled 40%
      var arc = document.getElementById('kronos-progress-arc');
      if (arc) {
        arc.style.setProperty('stroke-dashoffset', '80', 'important');
      }
    """, t, c)
    time.sleep(0.15)
    bar = driver.find_element(By.ID, 'kronos-dock-bar')
    bar.screenshot(f'scratch/perfect_refinements_{t}.png')
    
    # Calculate clearances
    micro = driver.find_element(By.CLASS_NAME, 'micro-actions')
    bar_rect = bar.rect
    micro_rect = micro.rect
    bottom_clearance = (bar_rect['y'] + bar_rect['height']) - (micro_rect['y'] + micro_rect['height'])
    print(f'{t}: micro-actions bottom clearance = {bottom_clearance:.1f}px')

driver.quit()
