from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
import os, time

opts = Options()
opts.add_argument('--headless')
opts.add_argument('--window-size=900,700')
driver = webdriver.Chrome(options=opts)
url = 'file:///' + os.path.abspath('index.html').replace('\\', '/')
driver.get(url)
time.sleep(0.5)

themes = ['charcoal', 'braun-1972']

for t in themes:
    driver.execute_script(f'if (typeof applyTheme === "function") applyTheme("{t}");')
    time.sleep(0.2)
    bar = driver.find_element(By.ID, 'kronos-dock-bar')
    bar.screenshot(f'scratch/root_app_{t}.png')
    
    micro = driver.find_element(By.CLASS_NAME, 'micro-actions')
    bar_rect = bar.rect
    micro_rect = micro.rect
    bottom_clearance = (bar_rect['y'] + bar_rect['height']) - (micro_rect['y'] + micro_rect['height'])
    print(f'root {t}: bottom clearance = {bottom_clearance:.1f}px')

driver.quit()
