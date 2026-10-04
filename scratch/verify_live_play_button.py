import urllib.request, json, websocket, time, base64

resp = urllib.request.urlopen('http://127.0.0.1:8095/json')
targets = json.loads(resp.read().decode())
print("Found targets:", len(targets))
ws_url = targets[0]['webSocketDebuggerUrl']

ws = websocket.create_connection(ws_url)

msg_id = 1
def send_cmd(method, params={}):
    global msg_id
    msg_id += 1
    msg = {'id': msg_id, 'method': method, 'params': params}
    ws.send(json.dumps(msg))
    while True:
        res = json.loads(ws.recv())
        if res.get('id') == msg_id:
            return res.get('result', {})

# Hard reload page to get clean fresh state from disk
send_cmd('Page.reload', {'ignoreCache': True})
time.sleep(1.2)

# Check DOM elements
check_code = """
(function() {
    var btn = document.getElementById('kronos-toggle-btn');
    var capsule = document.querySelector('.gauge-button-capsule');
    var ringArc = document.getElementById('kronos-progress-arc');
    var ringTrack = document.querySelector('.ring-track');
    var face = btn.querySelector('.knob-face');
    var indicator = btn.querySelector('.knob-indicator');
    
    // Check alignment of the 3 bottom boxes
    var lapBox = document.querySelector('.dock-lap-counter');
    var timerBox = document.querySelector('.dock-flip-timer');
    var microBox = document.querySelector('.micro-actions');
    
    return {
        hasFace: !!face,
        hasIndicator: !!indicator,
        trackDisplay: window.getComputedStyle(ringTrack).display,
        btnBoxShadow: window.getComputedStyle(btn).boxShadow,
        btnBg: window.getComputedStyle(btn).background,
        lapBoxBottom: lapBox ? lapBox.getBoundingClientRect().bottom : null,
        timerBoxBottom: timerBox ? timerBox.getBoundingClientRect().bottom : null,
        microBoxBottom: microBox ? microBox.getBoundingClientRect().bottom : null
    };
})()
"""

res = send_cmd('Runtime.evaluate', {'expression': check_code, 'returnByValue': True})
print("DOM Check:", json.dumps(res.get('value', {}), indent=2))

# 1. Capture 0% state screenshot
shot0 = send_cmd('Page.captureScreenshot', {'format': 'png'})
with open('scratch/live_cep_fresh_0pct.png', 'wb') as f:
    f.write(base64.b64decode(shot0['data']))
print("Captured scratch/live_cep_fresh_0pct.png")

# 2. Test starting timer and capturing live running state (with progress arc and pause bars)
send_cmd('Runtime.evaluate', {
    'expression': '''(function() {
        var btn = document.getElementById('kronos-toggle-btn');
        btn.click();
    })()'''
})
time.sleep(0.5)

# Set 35% progress arc for screenshot
send_cmd('Runtime.evaluate', {
    'expression': '''(function() {
        var arc = document.getElementById('kronos-progress-arc');
        var C = 113.1;
        var offset = (C * (1 - 0.35)).toFixed(2);
        arc.style.setProperty('stroke-dashoffset', offset + 'px', 'important');
    })()'''
})
time.sleep(0.2)

shot_running = send_cmd('Page.captureScreenshot', {'format': 'png'})
with open('scratch/live_cep_fresh_running.png', 'wb') as f:
    f.write(base64.b64decode(shot_running['data']))
print("Captured scratch/live_cep_fresh_running.png")

# Pause it again
send_cmd('Runtime.evaluate', {
    'expression': '''(function() {
        var btn = document.getElementById('kronos-toggle-btn');
        btn.click();
        var arc = document.getElementById('kronos-progress-arc');
        arc.style.removeProperty('stroke-dashoffset');
    })()'''
})
time.sleep(0.2)

ws.close()
