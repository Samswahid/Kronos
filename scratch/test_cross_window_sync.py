import time
import json
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

def main():
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--window-size=1200,800")
    driver = webdriver.Chrome(options=options)
    
    try:
        # Window 1: Dockable Panel
        driver.get("http://localhost:4829/client/index.html")
        panel_window = driver.current_window_handle
        time.sleep(0.5)
        
        # Window 2: Floating Settings Vault
        driver.switch_to.new_window('window')
        settings_window = driver.current_window_handle
        driver.get("http://localhost:4829/client/settings.html")
        time.sleep(0.8)
        
        # 1. In Settings Window: Open Themes tab
        themes_tab = driver.find_element(By.CSS_SELECTOR, ".vault-tab-btn[data-tab='tab-themes']")
        themes_tab.click()
        time.sleep(0.3)
        
        # 2. Select Braun 1972 theme
        braun_card = driver.find_element(By.CSS_SELECTOR, ".theme-card[data-theme-id='braun-1972']")
        braun_card.click()
        time.sleep(0.5)
        
        # Check that Settings Window updated to braun-1972
        settings_theme = driver.find_element(By.TAG_NAME, "body").get_attribute("data-theme")
        print(f"Settings theme applied: {settings_theme}")
        assert settings_theme == "braun-1972"
        
        # 3. Switch back to Dockable Panel Window and verify theme updated via live sync!
        driver.switch_to.window(panel_window)
        time.sleep(0.6)
        panel_theme = driver.find_element(By.TAG_NAME, "body").get_attribute("data-theme")
        print(f"Dockable panel theme via live sync: {panel_theme}")
        assert panel_theme == "braun-1972", f"Expected braun-1972 on panel, got {panel_theme}"
        
        # 4. Now in Settings Window: Change accent color swatch on braun-1972 to #00E5FF (Electric Cyan)
        driver.switch_to.window(settings_window)
        accent_swatch = braun_card.find_element(By.CSS_SELECTOR, ".swatch[data-color-key='accentColor']")
        color_input = accent_swatch.find_element(By.CSS_SELECTOR, "input[type='color']")
        
        driver.execute_script("""
            arguments[0].value = '#00e5ff';
            arguments[0].dispatchEvent(new Event('input', { bubbles: true }));
            arguments[0].dispatchEvent(new Event('change', { bubbles: true }));
        """, color_input)
        time.sleep(0.5)
        
        # 5. Switch to Dockable Panel Window and check if the accent color updated!
        driver.switch_to.window(panel_window)
        time.sleep(0.6)
        
        # Inspect dock bar inline CSS property and crown eye background
        dock_bar = driver.find_element(By.ID, "kronos-dock-bar")
        dock_accent = driver.execute_script("return getComputedStyle(arguments[0]).getPropertyValue('--theme-accent-color').trim();", dock_bar)
        print(f"Dock bar --theme-accent-color: {dock_accent}")
        assert dock_accent.lower() == "#00e5ff", f"Expected #00e5ff on dock bar, got {dock_accent}"
        
        crown_eye = driver.find_element(By.CSS_SELECTOR, ".crown-amber-eye")
        eye_bg = driver.execute_script("return getComputedStyle(arguments[0]).backgroundColor;", crown_eye)
        print(f"Crown eye computed background: {eye_bg}")
        # rgb(0, 229, 255) is #00e5ff
        assert "0, 229, 255" in eye_bg or "rgb(0, 229, 255)" in eye_bg or "rgba(0, 229, 255" in eye_bg, f"Expected cyan background on eye, got {eye_bg}"
        
        lap_label = driver.find_element(By.ID, "dock-lap-label")
        label_color = driver.execute_script("return getComputedStyle(arguments[0]).color;", lap_label)
        print(f"LAP 1/4 computed text color: {label_color}")
        assert "0, 229, 255" in label_color, f"Expected cyan text on lap label, got {label_color}"
        
        # 6. Test Persistence on Dockable Panel Launch (Refresh Panel Window)
        print("Reloading dockable panel window to test persistence on fresh startup...")
        driver.refresh()
        time.sleep(0.8)
        
        dock_bar_after_reload = driver.find_element(By.ID, "kronos-dock-bar")
        panel_theme_after = driver.find_element(By.TAG_NAME, "body").get_attribute("data-theme")
        dock_accent_after = driver.execute_script("return getComputedStyle(arguments[0]).getPropertyValue('--theme-accent-color').trim();", dock_bar_after_reload)
        print(f"After reload: panel theme = {panel_theme_after}, accent = {dock_accent_after}")
        assert panel_theme_after == "braun-1972"
        assert dock_accent_after.lower() == "#00e5ff", f"Expected #00e5ff after reload, got {dock_accent_after}"
        
        # 7. Test 'Sync to Panel' manual button
        driver.switch_to.window(settings_window)
        sync_btn = driver.find_element(By.ID, "vault-sync-btn")
        sync_btn.click()
        time.sleep(0.4)
        sync_text = sync_btn.text
        print(f"Sync button text after click: {sync_text}")
        assert "Synced" in sync_text
        
        driver.save_screenshot("scratch/cross_window_sync_verified.png")
        print("PASS: Cross-window live sync, custom palette persistence, and sync button all verified!")
        
    finally:
        driver.quit()

if __name__ == "__main__":
    main()
