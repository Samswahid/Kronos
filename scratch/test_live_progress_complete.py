import urllib.request, json, websocket, time, base64, os

resp = urllib.request.urlopen('http://127.0.0.1:8095/json')
targets = json.loads(resp.read().decode())
target = targets[0]
ws_url = target['webSocketDebuggerUrl']
print('Connecting to:', ws_url)

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

print('Reloading live panel...')
send_cmd('Page.reload', {'ignoreCache': True})
time.sleep(1.2)

# Check geometry and centering
res_geo = send_cmd('Runtime.evaluate', {
    'expression': '''(function() {
        var capsule = document.querySelector('.gauge-button-capsule');
        var svg = document.querySelector('.progress-ring-svg');
        var btn = document.getElementById('kronos-toggle-btn');
        var arc = document.getElementById('kronos-progress-arc');
        var track = document.querySelector('.ring-track');
        
        var cr = capsule.getBoundingClientRect();
        var sr = svg.getBoundingClientRect();
        var br = btn.getBoundingClientRect();
        
        var cc = {x: cr.left + cr.width/2, y: cr.top + cr.height/2};
        var sc = {x: sr.left + sr.width/2, y: sr.top + sr.height/2};
        var bc = {x: br.left + br.width/2, y: br.top + br.height/2};
        
        return {
            diffSvgCapsule: {dx: sc.x - cc.x, dy: sc.y - cc.y},
            diffSvgBtn: {dx: sc.x - bc.x, dy: sc.y - bc.y},
            trackStroke: window.getComputedStyle(track).stroke,
            trackStrokeWidth: window.getComputedStyle(track).strokeWidth,
            arcStroke: window.getComputedStyle(arc).stroke,
            arcStrokeWidth: window.getComputedStyle(arc).strokeWidth,
            arcDasharray: window.getComputedStyle(arc).strokeDasharray,
            arcDashoffset: window.getComputedStyle(arc).strokeDashoffset,
            svgRect: {width: sr.width, height: sr.height, top: sr.top, left: sr.left},
            capsuleRect: {width: cr.width, height: cr.height, top: cr.top, left: cr.left},
            btnRect: {width: br.width, height: br.height, top: br.top, left: br.left}
        };
    })()''',
    'returnByValue': True
})

print('Initial Live Panel State:')
print(json.dumps(res_geo['result']['value'], indent=2))

# Capture 0% idle state
shot0 = send_cmd('Page.captureScreenshot', {'format': 'png'})
with open('scratch/live_final_0pct.png', 'wb') as f:
    f.write(base64.b64decode(shot0['data']))
print('Saved scratch/live_final_0pct.png')

# Test progression at 25%, 50%, 75%
for pct in [25, 50, 75]:
    fraction = pct / 100.0
    send_cmd('Runtime.evaluate', {
        'expression': f'''(function() {{
            var arc = document.getElementById('kronos-progress-arc');
            var C = 113.1;
            var offset = (C * (1 - {fraction})).toFixed(2);
            arc.style.setProperty('stroke-dashoffset', offset + 'px', 'important');
            arc.setAttribute('stroke-dashoffset', offset);
        }})()'''
    })
    time.sleep(0.2)
    shot = send_cmd('Page.captureScreenshot', {'format': 'png'})
    fn = f'scratch/live_final_{pct}pct.png'
    with open(fn, 'wb') as f:
        f.write(base64.b64decode(shot['data']))
    print(f'Saved {fn}')

# Test across themes at 50%
themes = ['braun-1972', 'solar-ochre', 'cyber-violet', 'kyoto-matcha', 'neon-lilac', 'cobalt-runner']
for t in themes:
    send_cmd('Runtime.evaluate', {
        'expression': f'''(function() {{
            if (typeof applyTheme === 'function') {{
                applyTheme('{t}');
            }} else {{
                document.documentElement.setAttribute('data-theme', '{t}');
                document.body.setAttribute('data-theme', '{t}');
            }}
            var arc = document.getElementById('kronos-progress-arc');
            var C = 113.1;
            var offset = (C * 0.5).toFixed(2);
            arc.style.setProperty('stroke-dashoffset', offset + 'px', 'important');
            arc.setAttribute('stroke-dashoffset', offset);
        }})()'''
    })
    time.sleep(0.2)
    shot = send_cmd('Page.captureScreenshot', {'format': 'png'})
    fn = f'scratch/live_final_theme_{t}.png'
    with open(fn, 'wb') as f:
        f.write(base64.b64decode(shot['data']))
    print(f'Saved {fn}')

# Reset back to live default and reset timer
send_cmd('Runtime.evaluate', {
    'expression': '''(function() {
        var rBtn = document.getElementById('kronos-reset-btn');
        if (rBtn) rBtn.click();
    })()'''
})

ws.close()
print('Verification completed!')
