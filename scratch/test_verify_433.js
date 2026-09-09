const { spawn } = require('child_process');
const fs = require('fs');

async function runTest() {
  const port = 9335;
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new',
    '--remote-debugging-port=' + port,
    '--user-data-dir=/tmp/chrome-test-profile-433',
    '--disable-gpu',
    '--window-size=1440,960',
    'http://127.0.0.1:5500/index.html'
  ]);

  let tabs = null;
  for (let i = 0; i < 25; i++) {
    await new Promise(r => setTimeout(r, 400));
    try {
      const listRes = await fetch(`http://127.0.0.1:${port}/json`);
      tabs = await listRes.json();
      if (tabs && tabs.find(t => t.type === 'page')) break;
    } catch (e) {}
  }

  try {
    if (!tabs) throw new Error('No tabs available from Chrome');
    const pageTab = tabs.find(t => t.type === 'page');
    if (!pageTab) throw new Error('No page tab found');

    const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    let msgId = 1;
    function send(method, params = {}) {
      return new Promise((resolve) => {
        const id = msgId++;
        const handler = (event) => {
          const data = JSON.parse(event.data);
          if (data.id === id) {
            ws.removeEventListener('message', handler);
            resolve(data.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await send('Runtime.enable');
    await send('Page.enable');

    // Wait 2s for page to render
    await new Promise(r => setTimeout(r, 2000));

    // Switch to Atalanta (which uses 4-3-3)
    await send('Runtime.evaluate', {
      expression: `(() => {
        const btn = document.querySelector('button.team[data-team-id="atalanta"]');
        if (btn) {
          btn.click();
        } else {
          window.store.setTeam('atalanta');
        }
      })()`
    });

    await new Promise(r => setTimeout(r, 1500));

    // Capture desktop pitch (4-3-3)
    const pitchScreenshot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(
      '/Users/vincenzo/.gemini/antigravity-ide/brain/4ef933ea-d781-4505-97fa-6b6b06821fa3/pitch_433_desktop.png',
      Buffer.from(pitchScreenshot.data, 'base64')
    );
    console.log('Desktop 4-3-3 screenshot saved.');

    // Mobile viewport
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await new Promise(r => setTimeout(r, 600));

    const mobileScreenshot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(
      '/Users/vincenzo/.gemini/antigravity-ide/brain/4ef933ea-d781-4505-97fa-6b6b06821fa3/pitch_433_mobile.png',
      Buffer.from(mobileScreenshot.data, 'base64')
    );
    console.log('Mobile 4-3-3 screenshot saved.');

    ws.close();
  } finally {
    chrome.kill();
  }
}

runTest().catch(console.error);
