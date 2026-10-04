const http = require('http');

http.get('http://localhost:8095/json', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const list = JSON.parse(data);
    const wsUrl = list[0].webSocketDebuggerUrl;
    console.log('WS URL:', wsUrl);

    // Use built-in WebSocket if node 21+ or https
    let WebSocketClient;
    try {
      WebSocketClient = require('ws');
    } catch (e) {
      // fallback if ws not in node_modules
    }
    
    if (WebSocketClient) {
      const ws = new WebSocketClient(wsUrl);
      ws.on('open', () => {
        ws.send(JSON.stringify({
          id: 1,
          method: 'Runtime.evaluate',
          params: {
            expression: `(() => {
              const capsule = document.querySelector('.gauge-button-capsule');
              const svg = document.querySelector('.progress-ring-svg');
              const btn = document.querySelector('.tactile-round-btn');
              const play = document.querySelector('.glyph-play');
              const pause = document.querySelector('.glyph-pause');
              return {
                capsule: capsule ? capsule.getBoundingClientRect() : null,
                svg: svg ? svg.getBoundingClientRect() : null,
                btn: btn ? btn.getBoundingClientRect() : null,
                play: play ? { rect: play.getBoundingClientRect(), display: window.getComputedStyle(play).display } : null,
                pause: pause ? { rect: pause.getBoundingClientRect(), display: window.getComputedStyle(pause).display } : null,
                btnClass: btn ? btn.className : '',
                btnBg: btn ? window.getComputedStyle(btn).backgroundColor : '',
                btnShadow: btn ? window.getComputedStyle(btn).boxShadow : '',
                capsuleShadow: capsule ? window.getComputedStyle(capsule).boxShadow : ''
              };
            })()`,
            returnByValue: true
          }
        }));
      });
      ws.on('message', (msg) => {
        console.log('EVAL RESULT:', JSON.stringify(JSON.parse(msg).result.result.value, null, 2));
        process.exit(0);
      });
    }
  });
});
