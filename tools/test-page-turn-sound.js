const http = require('http');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { chromium } = require(path.join(__dirname, '..', '..', '..', '06-2.4', 'workbook_work', 'node_modules', 'playwright'));

const root = path.join(__dirname, '..');
const resultFile = path.join(root, 'tmp', 'page-turn-test-result.txt');
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.png': 'image/png', '.wav': 'audio/wav', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
  const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
  const file = path.resolve(root, relative);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' });
  try {
    for (const viewport of [{ width: 390, height: 844 }, { width: 360, height: 800 }]) {
      const page = await browser.newPage({ viewport });
      await page.addInitScript(() => {
        window.__audioPlayCalls = [];
        const original = HTMLMediaElement.prototype.play;
        HTMLMediaElement.prototype.play = function () {
          window.__audioPlayCalls.push({ muted: this.muted, src: this.getAttribute('src') });
          return original.call(this);
        };
      });
      await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'networkidle' });
      const sound = page.locator('.sound-toggle');
      await assert.doesNotReject(() => sound.waitFor({ state: 'visible' }));
      assert.equal(await sound.getAttribute('aria-pressed'), 'false');
      assert.equal(await sound.locator('span').textContent(), '静音');
      assert.equal(await page.evaluate(() => sessionStorage.getItem('topic6-page-turn-sound')), null);
      await sound.click();
      assert.equal(await sound.getAttribute('aria-pressed'), 'true');
      assert.equal(await page.evaluate(() => sessionStorage.getItem('topic6-page-turn-sound')), 'on');
      if (viewport.width === 390) await page.screenshot({ path: path.join(root, 'tmp', 'sound-toggle-mobile.png') });
      await page.locator('.cover-pulse').click({ force: true });
      assert.equal(await page.locator('#counter').textContent(), '4 / 33');
      assert.equal(await page.locator('.sound-toggle').count(), 0);
      assert.ok((await page.evaluate(() => window.__audioPlayCalls)).some(call => !call.muted && call.src.endsWith('page-turn.wav')));
      await page.reload({ waitUntil: 'networkidle' });
      await page.locator('#prevBtn').click();
      await page.locator('#prevBtn').click();
      await page.locator('#prevBtn').click();
      assert.equal(await sound.getAttribute('aria-pressed'), 'true');
      await sound.click();
      const callsBefore = await page.evaluate(() => window.__audioPlayCalls.length);
      await page.locator('.cover-pulse').click({ force: true });
      assert.equal(await page.evaluate(() => window.__audioPlayCalls.length), callsBefore);
      await page.close();
    }
    const result = 'PASS: mobile sound interaction (iOS/Android viewport profiles)';
    fs.mkdirSync(path.dirname(resultFile), { recursive: true });
    fs.writeFileSync(resultFile, result + '\n');
    console.log(result);
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {
  fs.mkdirSync(path.dirname(resultFile), { recursive: true });
  fs.writeFileSync(resultFile, `FAIL: ${error.stack || error}\n`);
  console.error(error); server.close(); process.exitCode = 1;
});
