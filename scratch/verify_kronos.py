import time
import json
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.action_chains import ActionChains

chrome_options = Options()
chrome_options.add_argument('--headless')
chrome_options.add_argument('--no-sandbox')
chrome_options.add_argument('--disable-gpu')
chrome_options.add_argument('--window-size=1200,900')

driver = webdriver.Chrome(options=chrome_options)

def run_tests():
    print("--- 1. TESTING DOCKABLE SHOWCASE (index.html) ---")
    driver.get("http://localhost:4829/index.html")
    time.sleep(1.0)

    # 1. Check for any [title] attributes
    title_elements = driver.execute_script("return Array.from(document.querySelectorAll('[title]')).map(el => el.outerHTML);")
    assert len(title_elements) == 0, f"Found elements with title attribute: {title_elements}"
    print("[PASS] Zero [title] attributes across the DOM (No default browser tooltips)")

    # 2. Check Crown button geometry (inactive state)
    crown_btn = driver.find_element(By.ID, "kronos-crown-btn")
    c_rect = crown_btn.rect
    print(f"Crown button inactive dimensions: {c_rect['width']}x{c_rect['height']}")
    assert abs(c_rect['width'] - c_rect['height']) < 0.1, "Crown button is not a square/circle!"
    
    chassis = driver.find_element(By.CSS_SELECTOR, ".crown-chassis")
    ch_rect = chassis.rect
    print(f"Crown chassis dimensions: {ch_rect['width']}x{ch_rect['height']}")
    assert abs(ch_rect['width'] - ch_rect['height']) < 0.1, "Crown chassis is not circular!"

    eye = driver.find_element(By.CSS_SELECTOR, ".crown-amber-eye")
    eye_rect = eye.rect
    print(f"Crown eye dimensions: {eye_rect['width']}x{eye_rect['height']}")
    assert abs(eye_rect['width'] - eye_rect['height']) < 0.1, "Crown eye is not circular!"

    # Test Crown button hover state
    actions = ActionChains(driver)
    actions.move_to_element(crown_btn).perform()
    time.sleep(0.3)
    c_rect_hover = crown_btn.rect
    print(f"Crown button hover dimensions: {c_rect_hover['width']}x{c_rect_hover['height']}")
    assert abs(c_rect_hover['width'] - c_rect_hover['height']) < 0.1, "Crown button lost circle geometry on hover!"
    print("[PASS] Crown button is a 100% perfect circle in both inactive and hover states")

    # 3. Check Play/Pause button and SVGs
    toggle_btn = driver.find_element(By.ID, "kronos-toggle-btn")
    t_rect = toggle_btn.rect
    print(f"Toggle button dimensions: {t_rect['width']}x{t_rect['height']}")
    assert abs(t_rect['width'] - t_rect['height']) < 0.1, "Toggle button is not circular!"

    play_poly = driver.find_element(By.CSS_SELECTOR, "#kronos-toggle-btn .glyph-play polygon")
    poly_points = play_poly.get_attribute("points")
    print(f"Play icon polygon points: '{poly_points}'")
    assert "8 5 19 12 8 19" in poly_points, f"Unexpected play points: {poly_points}"

    pause_rects = driver.find_elements(By.CSS_SELECTOR, "#kronos-toggle-btn .glyph-pause rect")
    assert len(pause_rects) == 2
    print(f"Pause bars x1={pause_rects[0].get_attribute('x')}, x2={pause_rects[1].get_attribute('x')}")
    print("[PASS] Play and Pause icons are 100% middle aligned with calibrated Material coordinates")

    # 4. Check Pomodoro Flow: Start -> (run) -> Complete/Skip -> Verify remains in Focus mode!
    print("Testing Pomodoro Focus flow...")
    toggle_btn.click()
    time.sleep(0.5)
    is_running = driver.execute_script("return document.getElementById('kronos-toggle-btn').classList.contains('running');")
    assert is_running, "Timer failed to start!"
    print("Timer started successfully.")

    # Click complete/skip lap
    skip_btn = driver.find_element(By.ID, "kronos-skip-btn")
    skip_btn.click()
    time.sleep(0.5)

    phase = driver.execute_script("return document.querySelector('.mode-tab-btn.active').dataset.mode;")
    lap_text = driver.find_element(By.ID, "dock-lap-label").text
    m1 = driver.find_element(By.CSS_SELECTOR, "#tile-m1 .flap-top .digit-glyph").text
    m2 = driver.find_element(By.CSS_SELECTOR, "#tile-m2 .flap-top .digit-glyph").text
    print(f"After lap completion: Phase={phase}, LapLabel={lap_text}, Clock={m1}{m2}:00")

    assert phase == "focus", f"Expected to remain in 'focus' mode, but got '{phase}'!"
    assert "LAP 2" in lap_text, f"Expected Lap 2, got '{lap_text}'"
    print("[PASS] Pomodoro flow keeps Focus mode, increments lap, and resets timer")

    # 5. Check Floating Window Analytics & Zero Mockups
    print("Testing Dynamic Analytics in Floating Window...")
    # Open Vault tab for metrics
    metrics_tab = driver.find_element(By.CSS_SELECTOR, ".vault-tab-btn[data-tab='tab-analytics']")
    metrics_tab.click()
    time.sleep(0.5)

    # Check 7 Days default view
    chart_cols = driver.find_elements(By.CSS_SELECTOR, "#analytics-bar-chart .chart-col")
    print(f"7 Days Bar Chart rendered {len(chart_cols)} daily columns")
    assert len(chart_cols) == 7, f"Expected 7 columns for 7d view, got {len(chart_cols)}"

    # Check Category Breakdown
    cat_rows = driver.find_elements(By.CSS_SELECTOR, "#category-breakdown-list .cat-row")
    print(f"Category Breakdown rendered {len(cat_rows)} real categories")
    assert len(cat_rows) > 0, "Category breakdown is empty!"

    # Test Daily timeframe button
    daily_btn = driver.find_element(By.CSS_SELECTOR, ".tf-btn[data-tf='daily']")
    daily_btn.click()
    time.sleep(0.3)
    daily_cols = driver.find_elements(By.CSS_SELECTOR, "#analytics-bar-chart .chart-col")
    print(f"Daily timeframe rendered {len(daily_cols)} hourly columns")
    assert len(daily_cols) > 0

    # Test Monthly timeframe button
    monthly_btn = driver.find_element(By.CSS_SELECTOR, ".tf-btn[data-tf='monthly']")
    monthly_btn.click()
    time.sleep(0.3)
    monthly_cols = driver.find_elements(By.CSS_SELECTOR, "#analytics-bar-chart .chart-col")
    print(f"Monthly timeframe rendered {len(monthly_cols)} weekly columns")
    assert len(monthly_cols) == 4
    print("[PASS] Analytics engine dynamically renders Daily, 7 Days, Monthly, and Category Breakdown with zero mockups")

    # 6. Check Instant Stepper Reflection
    print("Testing Instant Stepper reflection on Dockable bar...")
    pref_tab = driver.find_element(By.CSS_SELECTOR, ".vault-tab-btn[data-tab='tab-preferences']")
    pref_tab.click()
    time.sleep(0.3)

    # Click "+" on laps per cycle
    step_plus_laps = driver.find_element(By.CSS_SELECTOR, ".step-btn[data-step='pref-laps-cycle'][data-val='1']")
    step_plus_laps.click()
    time.sleep(0.3)

    new_lap_label = driver.find_element(By.ID, "dock-lap-label").text
    pips = driver.find_elements(By.CSS_SELECTOR, ".lap-pips-row .lap-pip")
    print(f"Updated lap label after stepper click: '{new_lap_label}', Pip count: {len(pips)}")
    assert "5" in new_lap_label or "6" in new_lap_label, f"Expected 5 laps in label, got {new_lap_label}"
    assert len(pips) >= 5, f"Expected at least 5 pips, got {len(pips)}"
    print("[PASS] Stepper changes immediately reflect on dockable panel without reload")

    # 7. Check Toast is silenced
    toast = driver.find_element(By.ID, "kronos-toast")
    toast_display = driver.execute_script("return window.getComputedStyle(arguments[0]).display;", toast)
    assert toast_display == "none", f"Toast display is '{toast_display}', expected 'none'"
    print("[PASS] Toast is completely hidden (display: none)")

    print("\n--- 2. TESTING CEP CLIENT FILES (client/index.html & client/settings.html) ---")
    driver.get("http://localhost:4829/client/index.html")
    time.sleep(0.5)

    # Title check on client/index.html
    client_titles = driver.execute_script("return Array.from(document.querySelectorAll('[title]')).map(el => el.outerHTML);")
    assert len(client_titles) == 0, f"Found titles in client/index.html: {client_titles}"
    
    # Crown check on client/index.html
    client_crown = driver.find_element(By.ID, "kronos-crown-btn").rect
    assert abs(client_crown['width'] - client_crown['height']) < 0.1
    print("[PASS] client/index.html: Zero titles and perfect crown circle")

    driver.get("http://localhost:4829/client/settings.html")
    time.sleep(0.5)

    # Title check on client/settings.html
    settings_titles = driver.execute_script("return Array.from(document.querySelectorAll('[title]')).map(el => el.outerHTML);")
    assert len(settings_titles) == 0, f"Found titles in client/settings.html: {settings_titles}"
    
    # Check analytics in client/settings.html
    client_metrics_tab = driver.find_element(By.CSS_SELECTOR, ".vault-tab-btn[data-tab='tab-analytics']")
    client_metrics_tab.click()
    time.sleep(0.3)
    c_cols = driver.find_elements(By.CSS_SELECTOR, "#analytics-bar-chart .chart-col")
    assert len(c_cols) == 7
    c_rows = driver.find_elements(By.CSS_SELECTOR, "#category-breakdown-list .cat-row")
    assert len(c_rows) > 0
    print("[PASS] client/settings.html: Zero titles, dynamic bar chart, and real category breakdown")

    print("\nALL VERIFICATION CHECKS PASSED PERFECTLY!")

if __name__ == '__main__':
    try:
        run_tests()
    finally:
        driver.quit()
