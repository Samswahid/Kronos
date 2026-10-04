import urllib.request, json, websocket, time, base64

resp = urllib.request.urlopen('http://127.0.0.1:8095/json')
targets = json.loads(resp.read().decode())
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

# Stop timer and reset arc
send_cmd('Runtime.evaluate', {
    'expression': """(function() {
        var btn = document.getElementById('kronos-toggle-btn');
        if (btn.classList.contains('running')) {
            btn.click();
        }
        var arc = document.getElementById('kronos-progress-arc');
        var C = 113.1;
        arc.style.setProperty('stroke-dashoffset', C + 'px', 'important');
        arc.setAttribute('stroke-dashoffset', C);
        window.applyTheme('charcoal', window.KronosStorage.THEME_DEFAULTS['charcoal']);
    })()"""
})
time.sleep(0.3)

shot_stopped = send_cmd('Page.captureScreenshot', {'format': 'png'})
with open('scratch/final_charcoal_stopped.png', 'wb') as f:
    f.write(base64.b64decode(shot_stopped['data']))
print("Saved scratch/final_charcoal_stopped.png")

# Now set running with 50% arc
send_cmd('Runtime.evaluate', {
    'expression': """(function() {
        var btn = document.getElementById('kronos-toggle-btn');
        if (!btn.classList.contains('running')) {
            btn.click();
        }
        var arc = document.getElementById('kronos-progress-arc');
        var C = 113.1;
        var offset = (C * 0.5).toFixed(2);
        arc.style.setProperty('stroke-dashoffset', offset + 'px', 'important');
        arc.setAttribute('stroke-dashoffset', offset);
    })()"""
})
time.sleep(0.3)

shot_running = send_cmd('Page.captureScreenshot', {'format': 'png'})
with open('scratch/final_charcoal_running_50pct.png', 'wb') as f:
    f.write(base64.b64decode(shot_running['data']))
print("Saved scratch/final_charcoal_running_50pct.png")

ws.close()
