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

# Inject clean button structure and styles
eval_code = """
(function() {
    var btn = document.getElementById('kronos-toggle-btn');
    btn.innerHTML = `
      <span class="knob-face">
        <span class="knob-indicator glyph-play"></span>
        <span class="knob-pause-bars glyph-pause" style="display: none;">
          <span class="k-bar"></span>
          <span class="k-bar"></span>
        </span>
      </span>
    `;
    
    var style = document.getElementById('proto-clean-style');
    if (!style) {
        style = document.createElement('style');
        style.id = 'proto-clean-style';
        document.head.appendChild(style);
    }
    style.textContent = `
      /* 1. Clean dark circular capsule - progression section has ONLY dark and the progression arc */
      .gauge-button-capsule {
        background: #111215 !important;
        box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.75), 0 2px 5px rgba(0, 0, 0, 0.45) !important;
        border: 1px solid rgba(255, 255, 255, 0.05) !important;
      }
      
      .ring-track {
        display: none !important;
      }
      
      /* 2. Button: Smooth circular disc matching user's image exactly */
      .axial-plunger-btn {
        width: 29px !important;
        height: 29px !important;
        border-radius: 50% !important;
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0.04) 45%, rgba(0, 0, 0, 0.15) 100%), var(--theme-accent-color, #ea580c) !important;
        border: 1px solid rgba(0, 0, 0, 0.4) !important;
        box-shadow: 0 4px 7px rgba(0, 0, 0, 0.65), 0 1.5px 2px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.5), inset 0 -1.5px 2px rgba(0, 0, 0, 0.3) !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        position: relative !important;
        cursor: pointer !important;
        padding: 0 !important;
        margin: auto !important;
        outline: none !important;
        box-sizing: border-box !important;
        transform: none !important;
        transition: filter 120ms ease, box-shadow 120ms ease, transform 120ms ease !important;
      }
      
      .axial-plunger-btn:hover {
        filter: brightness(1.06) !important;
        box-shadow: 0 5px 10px rgba(0, 0, 0, 0.75), 0 2px 3px rgba(0, 0, 0, 0.45), inset 0 1px 1px rgba(255, 255, 255, 0.55), inset 0 -1.5px 2px rgba(0, 0, 0, 0.3) !important;
      }
      
      .axial-plunger-btn:active {
        transform: scale(0.96) !important;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.8), inset 0 2px 4px rgba(0, 0, 0, 0.6) !important;
      }
      
      .knob-face {
        width: 100% !important;
        height: 100% !important;
        position: relative !important;
        display: block !important;
        pointer-events: none !important;
      }
      
      /* Vertical indicator notch at top 12 o'clock matching reference */
      .knob-indicator {
        position: absolute !important;
        top: 3.5px !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        width: 2px !important;
        height: 5px !important;
        border-radius: 1px !important;
        background: var(--theme-font-color, #ffffff) !important;
        opacity: 0.9 !important;
        box-shadow: 0 0.5px 1px rgba(0, 0, 0, 0.5) !important;
        display: block !important;
      }
      
      .knob-pause-bars {
        position: absolute !important;
        top: 3.5px !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        display: none;
        gap: 2px !important;
      }
      
      .k-bar {
        width: 1.5px !important;
        height: 5px !important;
        border-radius: 1px !important;
        background: var(--theme-font-color, #ffffff) !important;
        opacity: 0.9 !important;
        box-shadow: 0 0.5px 1px rgba(0, 0, 0, 0.5) !important;
      }
    `;
    
    // Set 0% arc
    var arc = document.getElementById('kronos-progress-arc');
    var C = 113.1;
    arc.style.setProperty('stroke-dashoffset', C + 'px', 'important');
    arc.setAttribute('stroke-dashoffset', C);
})()
"""

send_cmd('Runtime.evaluate', {'expression': eval_code})
time.sleep(0.3)

shot0 = send_cmd('Page.captureScreenshot', {'format': 'png'})
with open('scratch/live_clean_play_0pct.png', 'wb') as f:
    f.write(base64.b64decode(shot0['data']))
print('Saved scratch/live_clean_play_0pct.png')

# 50% progress arc
send_cmd('Runtime.evaluate', {
    'expression': '''(function() {
        var arc = document.getElementById('kronos-progress-arc');
        var C = 113.1;
        var offset = (C * 0.5).toFixed(2);
        arc.style.setProperty('stroke-dashoffset', offset + 'px', 'important');
        arc.setAttribute('stroke-dashoffset', offset);
    })()'''
})

time.sleep(0.3)
shot50 = send_cmd('Page.captureScreenshot', {'format': 'png'})
with open('scratch/live_clean_play_50pct.png', 'wb') as f:
    f.write(base64.b64decode(shot50['data']))
print('Saved scratch/live_clean_play_50pct.png')

ws.close()
