import time
import json
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

def main():
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--window-size=400,650")
    driver = webdriver.Chrome(options=options)
    
    try:
        # Pre-seed localStorage with real user preferences and sessions
        driver.get("http://localhost:4829/client/settings.html")
        
        real_prefs = {
            "focusDurationMin": 30,
            "shortBreakDurationMin": 15,
            "longBreakDurationMin": 20,
            "lapsPerCycle": 4,
            "soundEffects": True,
            "chimeEnd": True,
            "softTick": True,
            "theme": "kyoto-matcha",
            "storagePath": "C:\\Users\\Admin\\AppData\\Local\\NeoGraphs\\Kronos"
        }
        
        real_sessions = [
            {
                "id": "sess-1791143854497",
                "date": "Oct 5, 2026",
                "startTime": "01:57 AM",
                "durationMin": 1,
                "phase": "focus",
                "title": "Comp 1 • Lap 2",
                "completed": True
            },
            {
                "id": "sess-1791142751679",
                "date": "Oct 5, 2026",
                "startTime": "01:39 AM",
                "durationMin": 1,
                "phase": "focus",
                "title": "Comp 1 • Lap 2",
                "completed": True
            }
        ]
        
        driver.execute_script("""
            localStorage.setItem('kronos_config', JSON.stringify(arguments[0]));
            localStorage.setItem('kronos_sessions', JSON.stringify(arguments[1]));
        """, real_prefs, real_sessions)
        
        # Reload to let settings.js process stored data
        driver.get("http://localhost:4829/client/settings.html")
        time.sleep(0.8)
        
        # Verify theme applied to body and root
        body_theme = driver.find_element(By.TAG_NAME, "body").get_attribute("data-theme")
        html_theme = driver.find_element(By.TAG_NAME, "html").get_attribute("data-theme")
        print(f"Body theme: {body_theme}, HTML theme: {html_theme}")
        assert body_theme == "kyoto-matcha", f"Expected kyoto-matcha, got {body_theme}"
        assert html_theme == "kyoto-matcha", f"Expected kyoto-matcha, got {html_theme}"
        
        # Verify Session Count badge
        badge = driver.find_element(By.ID, "session-count-badge").text.strip()
        print(f"Session count badge: {badge}")
        assert badge == "2", f"Expected badge '2', got '{badge}'"
        
        # Verify Today Focus Time
        today_time = driver.find_element(By.ID, "metric-today-time").text.strip()
        print(f"Today focus time: {today_time}")
        assert today_time == "2m", f"Expected '2m', got '{today_time}'"
        
        # Verify Sessions Cards
        cards = driver.find_elements(By.CSS_SELECTOR, "#session-cards-container .session-card")
        print(f"Rendered session cards count: {len(cards)}")
        assert len(cards) == 2, f"Expected 2 cards, got {len(cards)}"
        
        title_inputs = [c.find_element(By.CSS_SELECTOR, ".session-title-input").get_attribute("value") for c in cards]
        print(f"Session card titles: {title_inputs}")
        assert title_inputs == ["Comp 1 • Lap 2", "Comp 1 • Lap 2"]
        
        # Test clicking Themes tab
        themes_tab = driver.find_element(By.CSS_SELECTOR, ".vault-tab-btn[data-tab='tab-themes']")
        themes_tab.click()
        time.sleep(0.3)
        
        themes_content = driver.find_element(By.ID, "tab-themes")
        assert "active" in themes_content.get_attribute("class"), "Themes tab did not become active"
        print("PASS: Tab switching clicked and works perfectly!")
        
        # Test clicking + Manual button
        sessions_tab = driver.find_element(By.CSS_SELECTOR, ".vault-tab-btn[data-tab='tab-sessions']")
        sessions_tab.click()
        time.sleep(0.3)
        
        quick_add = driver.find_element(By.ID, "btn-quick-add-session")
        quick_add.click()
        time.sleep(0.3)
        
        cards_after_add = driver.find_elements(By.CSS_SELECTOR, "#session-cards-container .session-card")
        print(f"Cards after + Manual: {len(cards_after_add)}")
        assert len(cards_after_add) == 3, f"Expected 3 cards, got {len(cards_after_add)}"
        print("PASS: + Manual session button works perfectly!")
        
        # Take screenshot of the fixed floating window
        driver.save_screenshot("scratch/settings_window_fixed.png")
        print("Saved screenshot to scratch/settings_window_fixed.png")
        print("ALL TESTS PASSED SUCCESSFULLY!")
        
    finally:
        driver.quit()

if __name__ == "__main__":
    main()
