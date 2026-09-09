const { spawn } = require('child_process');
const fs = require('fs');

async function runTest() {
  const port = 9334;
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new',
    '--remote-debugging-port=' + port,
    '--user-data-dir=/tmp/chrome-test-profile-avatars',
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

    // Wait 2s for page to render pitch
    await new Promise(r => setTimeout(r, 2000));

    // Capture desktop pitch (top)
    const pitchScreenshot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(
      '/Users/vincenzo/.gemini/antigravity-ide/brain/4ef933ea-d781-4505-97fa-6b6b06821fa3/pitch_with_avatars_desktop.png',
      Buffer.from(pitchScreenshot.data, 'base64')
    );
    console.log('Desktop pitch screenshot saved.');

    // Scroll desktop slightly to show lower defense & goalkeeper
    await send('Runtime.evaluate', {
      expression: `(() => {
        const outer = document.querySelector('.pitch-outer-wrapper');
        if (outer) outer.scrollTop = 180;
      })()`
    });
    await new Promise(r => setTimeout(r, 400));

    const scrolledDesktop = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(
      '/Users/vincenzo/.gemini/antigravity-ide/brain/4ef933ea-d781-4505-97fa-6b6b06821fa3/desktop_pitch_scrolled.png',
      Buffer.from(scrolledDesktop.data, 'base64')
    );
    console.log('Scrolled desktop screenshot saved.');

    // Scroll back to top for clicking
    await send('Runtime.evaluate', {
      expression: `(() => {
        const outer = document.querySelector('.pitch-outer-wrapper');
        if (outer) outer.scrollTop = 0;
      })()`
    });
    await new Promise(r => setTimeout(r, 300));

    // Click on a player to check selected card appearance with avatar
    await send('Runtime.evaluate', {
      expression: `(() => {
        const card = Array.from(document.querySelectorAll('.soccer-pitch.is-3d-pitch .pitch-slot-wrapper .player-card'))
          .find(c => c.textContent.includes('CALHANOGLU') || c.textContent.includes('BARELLA') || c.textContent.includes('LAUTARO'));
        if (card) card.click();
      })()`
    });

    await new Promise(r => setTimeout(r, 600));

    const clickedScreenshot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(
      '/Users/vincenzo/.gemini/antigravity-ide/brain/4ef933ea-d781-4505-97fa-6b6b06821fa3/clicked_avatar_card.png',
      Buffer.from(clickedScreenshot.data, 'base64')
    );
    console.log('Clicked avatar card screenshot saved.');

    // Mobile viewport
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await new Promise(r => setTimeout(r, 600));

    // Scroll mobile to show defense and goalkeeper cleanly above bottom bar
    await send('Runtime.evaluate', {
      expression: `(() => {
        const outer = document.querySelector('.pitch-outer-wrapper');
        if (outer) outer.scrollTop = 220;
      })()`
    });
    await new Promise(r => setTimeout(r, 400));

    const mobileScreenshot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(
      '/Users/vincenzo/.gemini/antigravity-ide/brain/4ef933ea-d781-4505-97fa-6b6b06821fa3/mobile_pitch_with_avatars.png',
      Buffer.from(mobileScreenshot.data, 'base64')
    );
    console.log('Mobile pitch screenshot saved.');

    ws.close();
  } finally {
    chrome.kill();
  }
}

runTest().catch(console.error);
