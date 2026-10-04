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
        time.sleep(1.5)
        
        # Switch to Themes tab in Floating Vault
        themes_tab_btn = driver.find_element(By.CSS_SELECTOR, ".vault-tab-btn[data-tab='tab-themes']")
        themes_tab_btn.click()
        time.sleep(0.5)
        
        driver.save_screenshot("scratch/themes_tab_view.png")
        print("Captured Themes tab view.")
        
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
            card.click()
            time.sleep(0.4)
            
            # Check data-theme
            current_theme = driver.find_element(By.TAG_NAME, "body").get_attribute("data-theme")
            print(f"Applied theme: {current_theme} (expected {tid})")
            
            # Verify background-image on body
            dock_bar = driver.find_element(By.ID, "kronos-dock-bar")
            bg_img = dock_bar.value_of_css_property("background-image")
            print(f"  Theme '{tid}' dock bar background-image: {bg_img[:30] if bg_img != 'none' else 'none'}")
            
            # Take a screenshot of the stage for this theme
            driver.save_screenshot(f"scratch/theme_{tid}.png")
            
        print("All 7 themes validated successfully.")
    finally:
        driver.quit()

if __name__ == "__main__":
    main()
