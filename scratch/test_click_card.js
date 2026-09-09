const { spawn } = require('child_process');
const fs = require('fs');

async function main() {
  const port = 9333;
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new',
    '--remote-debugging-port=' + port,
    '--user-data-dir=/tmp/chrome-test-profile',
    '--disable-gpu',
    '--window-size=1440,900',
    'http://127.0.0.1:5500/index.html'
  ]);

  // Wait for chrome to start
  await new Promise(r => setTimeout(r, 1500));

  try {
    const listRes = await fetch(`http://127.0.0.1:${port}/json`);
    const tabs = await listRes.json();
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

    // Wait 1.5s for page to settle
    await new Promise(r => setTimeout(r, 1500));

    // Click on Calhanoglu on pitch
    const evalResult = await send('Runtime.evaluate', {
      expression: `(() => {
        const card = Array.from(document.querySelectorAll('.soccer-pitch.is-3d-pitch .pitch-slot-wrapper .player-card'))
          .find(c => c.textContent.includes('CALHANOGLU'));
        if (card) {
          card.click();
          return 'Clicked ' + card.textContent.slice(0, 30);
        }
        return 'Card not found';
      })()`
    });
    console.log('Eval:', evalResult);

    // Wait 600ms for transition
    await new Promise(r => setTimeout(r, 600));

    // Take screenshot
    const screenshot = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(screenshot.data, 'base64');
    const outPath = '/Users/vincenzo/.gemini/antigravity-ide/brain/4ef933ea-d781-4505-97fa-6b6b06821fa3/clicked_card_above_all.png';
    fs.writeFileSync(outPath, buffer);
    console.log('Screenshot saved to', outPath);

    ws.close();
  } finally {
    chrome.kill();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
