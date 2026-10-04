from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.action_chains import ActionChains
import os, time

opts = Options()
opts.add_argument('--headless')
opts.add_argument('--window-size=900,700')
driver = webdriver.Chrome(options=opts)
url = 'file:///' + os.path.abspath('client/index.html').replace('\\', '/')
driver.get(url)
time.sleep(0.5)

# Verify hover position on play button does NOT shift
btn = driver.find_element(By.ID, 'kronos-toggle-btn')
rect_before = btn.rect

actions = ActionChains(driver)
actions.move_to_element(btn).perform()
time.sleep(0.1)

rect_hover = btn.rect
dx = abs(rect_hover['x'] - rect_before['x'])
dy = abs(rect_hover['y'] - rect_before['y'])
dw = abs(rect_hover['width'] - rect_before['width'])
dh = abs(rect_hover['height'] - rect_before['height'])

print(f"Play Button Hover Shift Test:")
print(f"  dx = {dx:.2f}px, dy = {dy:.2f}px, dw = {dw:.2f}px, dh = {dh:.2f}px")
assert dx == 0 and dy == 0 and dw == 0 and dh == 0, "ERROR: Play button shifted or wiggled on hover!"
print("  => PASSED: Zero shift on hover! Perfectly dead-center.")

# Reset mouse
actions.move_by_offset(-200, -200).perform()
time.sleep(0.1)

# Now test across themes with progression visible (e.g., 45% elapsed)
themes = ['braun-1972', 'charcoal', 'solar-ochre', 'neon-lilac', 'cyber-violet', 'kyoto-matcha', 'cobalt-runner']

# Set progress to 45%
CIRCUMFERENCE = 135.09
fraction = 0.45
offset = CIRCUMFERENCE * (1 - fraction)

for t in themes:
    driver.execute_script("""
      var t = arguments[0];
      var offset = arguments[1];
      if (typeof applyTheme === 'function') {
        applyTheme(t);
      } else {
        document.documentElement.setAttribute('data-theme', t);
        document.body.setAttribute('data-theme', t);
      }
      var arc = document.getElementById('kronos-progress-arc');
      if (arc) {
        arc.style.strokeDashoffset = offset + 'px';
      }
    """, t, offset)
    time.sleep(0.2)
    
    bar = driver.find_element(By.ID, 'kronos-dock-bar')
    bar.screenshot(f'scratch/final_refinement_{t}.png')
    
    micro = driver.find_element(By.CLASS_NAME, 'micro-actions')
    bar_rect = bar.rect
    micro_rect = micro.rect
    bottom_clearance = (bar_rect['y'] + bar_rect['height']) - (micro_rect['y'] + micro_rect['height'])
    print(f'{t}: bottom clearance = {bottom_clearance:.1f}px (Saved to scratch/final_refinement_{t}.png)')

driver.quit()
print("All verification screenshots successfully generated.")
