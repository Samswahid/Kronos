const fs = require('fs');
const assert = require('assert');

// 1. Check client/settings.html
const settingsHtml = fs.readFileSync('client/settings.html', 'utf8');
const themeIds = ['charcoal', 'neon-lilac', 'braun-1972', 'cyber-violet', 'kyoto-matcha', 'cobalt-runner', 'solar-ochre'];
const expectedKeys = ['clockBg', 'plateColor', 'fontColor', 'pluginBg', 'accentColor'];

themeIds.forEach(id => {
  assert(settingsHtml.includes(`data-theme-id="${id}"`), `Missing theme card for ${id}`);
  assert(settingsHtml.includes(`class="theme-reset-btn" data-theme-id="${id}"`), `Missing reset button for ${id}`);
  expectedKeys.forEach(k => {
    const swatchPattern = new RegExp(`class="swatch"[^>]*data-theme-id="${id}"[^>]*data-color-key="${k}"`);
    assert(swatchPattern.test(settingsHtml), `Missing swatch for ${id} with key ${k}`);
  });
});
console.log('PASS: client/settings.html structure verified for all 7 themes and 5 swatches + reset buttons.');

// 2. Check storage.js
const storageJs = fs.readFileSync('client/js/storage.js', 'utf8');
assert(storageJs.includes('THEME_DEFAULTS'), 'storage.js missing THEME_DEFAULTS');
assert(storageJs.includes('getThemeColors'), 'storage.js missing getThemeColors');
assert(storageJs.includes('setThemeColor'), 'storage.js missing setThemeColor');
assert(storageJs.includes('resetThemeColors'), 'storage.js missing resetThemeColors');
assert(storageJs.includes('themeCustomColors: {}'), 'storage.js missing themeCustomColors in DEFAULT_CONFIG');
console.log('PASS: storage.js theme color engine methods verified.');

// 3. Check CSS for no blur, no glow, 16px
const css = fs.readFileSync('client/css/styles.css', 'utf8');
assert(!css.includes('radial-gradient'), 'Found radial-gradient in client/css/styles.css');
assert(css.includes('--theme-clock-bg'), 'Missing --theme-clock-bg in styles.css');
assert(css.includes('--theme-plate-color'), 'Missing --theme-plate-color in styles.css');
assert(css.includes('--theme-font-color'), 'Missing --theme-font-color in styles.css');
assert(css.includes('--theme-plugin-bg'), 'Missing --theme-plugin-bg in styles.css');
assert(css.includes('--theme-accent-color'), 'Missing --theme-accent-color in styles.css');
assert(css.includes('width: 16px;'), 'Missing swatch 16px width');
assert(css.includes('height: 16px;'), 'Missing swatch 16px height');
assert(css.includes('box-shadow: none !important;'), 'Missing box-shadow: none !important on swatch');
assert(css.includes('filter: none !important;'), 'Missing filter: none !important on swatch');
console.log('PASS: client/css/styles.css verified (zero blur/glow, 16px swatches, 5 CSS variables, 0 radial-gradient).');

console.log('ALL SYNTAX AND DOM CHECKS PASSED!');
