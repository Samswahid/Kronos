const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Mock localStorage and window
const localStorageMock = (function () {
  let store = {};
  return {
    getItem: function (key) { return store[key] || null; },
    setItem: function (key, value) { store[key] = value.toString(); },
    clear: function () { store = {}; }
  };
})();

global.window = {
  localStorage: localStorageMock,
  dispatchEvent: () => {}
};
global.localStorage = localStorageMock;

// Evaluate storage.js logic
const storageCode = fs.readFileSync('client/js/storage.js', 'utf8');
eval(storageCode);

const KronosStorage = global.window.KronosStorage;
assert(KronosStorage, 'KronosStorage should be defined on window');

console.log('Testing Default Colors retrieval...');
const charcoalDefault = KronosStorage.getThemeColors('charcoal');
assert.strictEqual(charcoalDefault.clockBg, '#0d0d0f');
assert.strictEqual(charcoalDefault.plateColor, '#232326');
assert.strictEqual(charcoalDefault.fontColor, '#e2e2e5');
assert.strictEqual(charcoalDefault.pluginBg, '#141414');
assert.strictEqual(charcoalDefault.accentColor, '#d97706');
console.log('PASS: Charcoal defaults correct:', charcoalDefault);

console.log('Testing Setting Custom Color...');
KronosStorage.setThemeColor('charcoal', 'accentColor', '#ff00aa');
const modified = KronosStorage.getThemeColors('charcoal');
assert.strictEqual(modified.accentColor, '#ff00aa');
assert.strictEqual(modified.clockBg, '#0d0d0f'); // others intact
console.log('PASS: Custom color successfully set and merged:', modified);

console.log('Testing Persistence in getPrefs...');
const prefs = KronosStorage.getPrefs();
assert(prefs.themeCustomColors && prefs.themeCustomColors['charcoal'], 'Custom colors should be saved in prefs');
assert.strictEqual(prefs.themeCustomColors['charcoal']['accentColor'], '#ff00aa');
console.log('PASS: Custom color persisted in preferences.');

console.log('Testing Reset Button functionality...');
const resetColors = KronosStorage.resetThemeColors('charcoal');
assert.strictEqual(resetColors.accentColor, '#d97706');
const afterReset = KronosStorage.getThemeColors('charcoal');
assert.strictEqual(afterReset.accentColor, '#d97706');
const prefsAfterReset = KronosStorage.getPrefs();
assert(!prefsAfterReset.themeCustomColors['charcoal'], 'Charcoal custom colors should be wiped from prefs');
console.log('PASS: Reset restored factory default color successfully.');

console.log('ALL STORAGE ENGINE TESTS PASSED PERFECTLY!');
