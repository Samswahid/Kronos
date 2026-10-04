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

themes = ['charcoal', 'braun-1972', 'cyber-violet', 'kyoto-matcha', 'cobalt-runner', 'solar-ochre', 'neon-lilac']

for t in themes:
    eval_str = f"""
    (function() {{
        window.KronosStorage.setTheme('{t}');
        var colors = window.KronosStorage.THEME_DEFAULTS['{t}'];
        window.applyTheme('{t}', colors);
        var arc = document.getElementById('kronos-progress-arc');
        var C = 113.1;
        // 50% progress arc
        var offset = (C * 0.5).toFixed(2);
        arc.style.setProperty('stroke-dashoffset', offset + 'px', 'important');
        arc.setAttribute('stroke-dashoffset', offset);
    }})()
    """
    send_cmd('Runtime.evaluate', {'expression': eval_str})
    time.sleep(0.2)
    shot = send_cmd('Page.captureScreenshot', {'format': 'png'})
    with open(f'scratch/real_theme_{t}.png', 'wb') as f:
        f.write(base64.b64decode(shot['data']))
    print(f"Captured scratch/real_theme_{t}.png")

ws.close()
