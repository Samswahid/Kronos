from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
import os, time, json

opts = Options()
opts.add_argument('--headless')
opts.add_argument('--window-size=1200,900')
driver = webdriver.Chrome(options=opts)

# Test 1: client/index.html (CEP Panel interface)
cep_url = 'file:///' + os.path.abspath('client/index.html').replace('\\', '/')
driver.get(cep_url)
time.sleep(0.8)

themes = ['charcoal', 'neon-lilac', 'braun-1972', 'cyber-violet', 'kyoto-matcha', 'cobalt-runner', 'solar-ochre']
print("=== TESTING CLIENT/INDEX.HTML (CEP PANEL) ===")

for t in themes:
    driver.execute_script(f"""
        if (window.KronosStorage && window.KronosStorage.setTheme) {{
            window.KronosStorage.setTheme('{t}');
        }}
        if (typeof window.applyTheme === 'function') {{
            var colors = window.KronosStorage ? window.KronosStorage.THEME_DEFAULTS['{t}'] : null;
            window.applyTheme('{t}', colors);
        }} else {{
            document.body.setAttribute('data-theme', '{t}');
        }}
    """)
    time.sleep(0.2)
    
    btn = driver.find_element(By.ID, 'kronos-toggle-btn')
    capsule = driver.find_element(By.CLASS_NAME, 'gauge-button-capsule')
    
    # Capture stopped state
    btn_info = driver.execute_script("""
        var btn = document.getElementById('kronos-toggle-btn');
        var cs = window.getComputedStyle(btn);
        var face = btn.querySelector('.btn-face');
        var csFace = face ? window.getComputedStyle(face) : null;
        var playGlyph = btn.querySelector('.glyph-play');
        var pauseGlyph = btn.querySelector('.glyph-pause');
        return {
            boxShadow: cs.boxShadow,
            background: cs.background,
            playDisplay: playGlyph ? window.getComputedStyle(playGlyph).display : null,
            pauseDisplay: pauseGlyph ? window.getComputedStyle(pauseGlyph).display : null,
            faceShadow: csFace ? csFace.boxShadow : null
        };
    """)
    print(f"[{t}] Stopped State:")
    print(f"  Button BoxShadow: {btn_info['boxShadow']}")
    print(f"  Play Glyph: {btn_info['playDisplay']}, Pause Glyph: {btn_info['pauseDisplay']}")
    
    capsule.screenshot(f'scratch/knob_cep_{t}_stopped.png')
    
    # Click button to test running state
    btn.click()
    time.sleep(0.2)
    
    btn_running_info = driver.execute_script("""
        var btn = document.getElementById('kronos-toggle-btn');
        var cs = window.getComputedStyle(btn);
        var playGlyph = btn.querySelector('.glyph-play');
        var pauseGlyph = btn.querySelector('.glyph-pause');
        return {
            boxShadow: cs.boxShadow,
            playDisplay: playGlyph ? window.getComputedStyle(playGlyph).display : null,
            pauseDisplay: pauseGlyph ? window.getComputedStyle(pauseGlyph).display : null,
            isRunningClass: btn.classList.contains('running')
        };
    """)
    print(f"[{t}] Running State:")
    print(f"  Running class: {btn_running_info['isRunningClass']}")
    print(f"  Play Glyph: {btn_running_info['playDisplay']}, Pause Glyph: {btn_running_info['pauseDisplay']}")
    
    capsule.screenshot(f'scratch/knob_cep_{t}_running.png')
    
    # Click again to pause/reset
    btn.click()
    time.sleep(0.1)

# Also test root index.html
print("\n=== TESTING ROOT INDEX.HTML ===")
root_url = 'file:///' + os.path.abspath('index.html').replace('\\', '/')
driver.get(root_url)
time.sleep(0.8)

for t in themes:
    driver.execute_script(f"""
        if (typeof window.applyTheme === 'function') {{
            window.applyTheme('{t}');
        }} else {{
            document.body.setAttribute('data-theme', '{t}');
        }}
    """)
    time.sleep(0.2)
    capsule = driver.find_element(By.CLASS_NAME, 'gauge-button-capsule')
    capsule.screenshot(f'scratch/knob_root_{t}.png')
    print(f"[Root index.html] Captured {t}")

driver.quit()
print("\nVerification complete! All screenshots saved in scratch/.")
