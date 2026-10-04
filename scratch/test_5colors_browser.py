import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

def main():
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--window-size=1400,900")
    driver = webdriver.Chrome(options=options)
    
    try:
        driver.get("http://localhost:4829/index.html")
        time.sleep(1.0)
        
        # Open Themes tab
        themes_tab_btn = driver.find_element(By.CSS_SELECTOR, ".vault-tab-btn[data-tab='tab-themes']")
        themes_tab_btn.click()
        time.sleep(0.5)
        
        theme_ids = [
            "charcoal",
            "neon-lilac",
            "braun-1972",
            "cyber-violet",
            "kyoto-matcha",
            "cobalt-runner",
            "solar-ochre"
        ]
        
        for tid in theme_ids:
            card = driver.find_element(By.CSS_SELECTOR, f".theme-card[data-theme-id='{tid}']")
            swatches = card.find_elements(By.CSS_SELECTOR, ".swatch")
            assert len(swatches) == 5, f"Expected 5 swatches in {tid}, found {len(swatches)}"
            
            # Check reset button
            reset_btn = card.find_element(By.CSS_SELECTOR, ".theme-reset-btn")
            assert reset_btn is not None, f"Reset button missing for {tid}"
            
            # Check swatch size and no blur/glow
            for s in swatches:
                box_shadow = s.value_of_css_property("box-shadow")
                filt = s.value_of_css_property("filter")
                w = s.value_of_css_property("width")
                h = s.value_of_css_property("height")
                assert "none" in box_shadow, f"Expected no box-shadow, got {box_shadow}"
                assert "none" in filt, f"Expected no filter, got {filt}"
                assert w == "16px" and h == "16px", f"Expected 16px, got {w}x{h}"
        
        print("PASS: All 7 theme cards have exactly 5 swatches of 16px, zero blur/glow, and a reset button.")
        
        # Test color change on active theme (Charcoal)
        charcoal_card = driver.find_element(By.CSS_SELECTOR, ".theme-card[data-theme-id='charcoal']")
        accent_swatch = charcoal_card.find_element(By.CSS_SELECTOR, ".swatch[data-color-key='accentColor']")
        color_input = accent_swatch.find_element(By.CSS_SELECTOR, "input[type='color']")
        
        # Use javascript to trigger value change, input event, and change event
        driver.execute_script("""
            arguments[0].value = '#00ffcc';
            arguments[0].dispatchEvent(new Event('input', { bubbles: true }));
            arguments[0].dispatchEvent(new Event('change', { bubbles: true }));
        """, color_input)
        time.sleep(0.3)
        
        # Verify root variable and swatch background
        accent_var = driver.execute_script("return getComputedStyle(document.documentElement).getPropertyValue('--theme-accent-color').trim();")
        print(f"Active --theme-accent-color after change: {accent_var}")
        assert accent_var.lower() == "#00ffcc", f"Expected #00ffcc, got {accent_var}"
        
        # Verify persistence in localStorage
        local_cfg = driver.execute_script("return localStorage.getItem('kronos_config');")
        assert "#00ffcc" in local_cfg, "Custom color was not saved to localStorage"
        print("PASS: Custom color persisted in localStorage.")
        
        # Now click Reset Button on Charcoal card
        reset_btn = charcoal_card.find_element(By.CSS_SELECTOR, ".theme-reset-btn")
        reset_btn.click()
        time.sleep(0.3)
        
        # Verify root variable reverted to default #d97706
        accent_var_after = driver.execute_script("return getComputedStyle(document.documentElement).getPropertyValue('--theme-accent-color').trim();")
        print(f"Active --theme-accent-color after reset: {accent_var_after}")
        assert accent_var_after.lower() == "#d97706", f"Expected #d97706, got {accent_var_after}"
        print("PASS: Reset button restored default color successfully.")
        
        # Verify no dotted grid radial-gradient anywhere
        dock_bar = driver.find_element(By.ID, "kronos-dock-bar")
        bg_img = dock_bar.value_of_css_property("background-image")
        print(f"Dock bar background-image: {bg_img}")
        assert bg_img == "none", f"Expected background-image: none, got {bg_img}"
        
        driver.save_screenshot("scratch/theme_custom_colors_verified.png")
        print("Captured screenshot: scratch/theme_custom_colors_verified.png")
        print("ALL BROWSER INTERACTION TESTS PASSED!")
        
    finally:
        driver.quit()

if __name__ == "__main__":
    main()
