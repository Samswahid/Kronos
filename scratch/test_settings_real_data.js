const fs = require('fs');
const assert = require('assert');
const { JSDOM } = require('jsdom');

// Load HTML
const html = fs.readFileSync('client/settings.html', 'utf8');

// Load user's real prefs and sessions
const prefsPath = "C:\\Users\\Admin\\AppData\\Local\\NeoGraphs\\Kronos\\preferences.json";
const sessionsPath = "C:\\Users\\Admin\\AppData\\Local\\NeoGraphs\\Kronos\\sessions.json";
const realPrefs = JSON.parse(fs.readFileSync(prefsPath, 'utf8'));
const realSessions = JSON.parse(fs.readFileSync(sessionsPath, 'utf8'));

const dom = new JSDOM(html, {
  runScripts: "dangerously",
  resources: "usable",
  url: "file:///C:/Users/Admin/AppData/Roaming/Adobe/CEP/extensions/neographs.kronos.cep/client/settings.html"
});

const { window } = dom;
const { document } = window;

// Provide Node fs / path to simulate CEP environment
window.require = function(mod) {
  if (mod === 'fs') {
    return {
      existsSync: (p) => fs.existsSync(p),
      readFileSync: (p, enc) => fs.readFileSync(p, enc),
      writeFileSync: (p, data, enc) => fs.writeFileSync(p, data, enc),
      mkdirSync: () => {}
    };
  }
  if (mod === 'path') return require('path');
  return null;
};

// Run storage.js
const storageCode = fs.readFileSync('client/js/storage.js', 'utf8');
window.eval(storageCode);

// Run settings.js
const settingsCode = fs.readFileSync('client/js/settings.js', 'utf8');
window.eval(settingsCode);

console.log('--- VALIDATING INITIAL RENDER WITH REAL DATA ---');
const themeAttr = document.body.getAttribute('data-theme');
console.log('Body theme:', themeAttr);
assert.strictEqual(themeAttr, 'kyoto-matcha', 'Body should have data-theme="kyoto-matcha"');

const docThemeAttr = document.documentElement.getAttribute('data-theme');
console.log('DocumentElement theme:', docThemeAttr);
assert.strictEqual(docThemeAttr, 'kyoto-matcha', 'Html should have data-theme="kyoto-matcha"');

const countBadge = document.getElementById('session-count-badge').textContent;
console.log('Session count badge:', countBadge);
assert.strictEqual(countBadge, '2', 'Session badge should be 2');

const cards = document.querySelectorAll('#session-cards-container .session-card');
console.log('Rendered session cards count:', cards.length);
assert.strictEqual(cards.length, 2, 'Should render exactly 2 session cards');

// Validate card titles
const titles = Array.from(cards).map(c => c.querySelector('.session-title-input').value);
console.log('Rendered card titles:', titles);
assert.deepStrictEqual(titles, ['Comp 1 • Lap 2', 'Comp 1 • Lap 2']);

// Validate metrics
const todayTime = document.getElementById('metric-today-time').textContent;
console.log('Today focus time:', todayTime);
assert.strictEqual(todayTime, '2m');

const todayLaps = document.getElementById('metric-today-laps').textContent;
console.log('Today laps:', todayLaps);
assert.strictEqual(todayLaps, '2 Laps');

// Test Tab Switching interaction
console.log('Testing Tab Switching...');
const themesTabBtn = document.querySelector('.vault-tab-btn[data-tab="tab-themes"]');
assert(themesTabBtn, 'Themes tab button should exist');
themesTabBtn.click();

const themesContent = document.getElementById('tab-themes');
assert(themesContent.classList.contains('active'), 'Themes tab content should be active after click');
const sessionsContent = document.getElementById('tab-sessions');
assert(!sessionsContent.classList.contains('active'), 'Sessions tab content should NOT be active');
console.log('PASS: Tab switching functions correctly without errors.');

console.log('ALL REAL DATA & FUNCTIONALITY VERIFICATIONS PASSED!');
