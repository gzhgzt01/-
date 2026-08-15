const http = require('http');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { chromium } = require(path.join(__dirname, '..', '..', '..', '06-2.4', 'workbook_work', 'node_modules', 'playwright'));

const root = path.join(__dirname, '..');
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript', '.jpg':'image/jpeg', '.png':'image/png', '.wav':'audio/wav', '.webmanifest':'application/manifest+json' };
const server = http.createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const file=path.resolve(root,pathname==='/'?'index.html':pathname.slice(1));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
  fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end();return}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(data)});
});

async function swipe(page, fromX, toX) {
  await page.locator('#lightbox').evaluate((element, points) => {
    const makeTouch = x => new Touch({ identifier: 1, target: element, clientX: x, clientY: 400 });
    element.dispatchEvent(new TouchEvent('touchstart', { changedTouches: [makeTouch(points[0])], bubbles: true }));
    element.dispatchEvent(new TouchEvent('touchend', { changedTouches: [makeTouch(points[1])], bubbles: true }));
  }, [fromX, toX]);
}

(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true,executablePath:'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'});
  try {
    const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});
    const base=`http://127.0.0.1:${server.address().port}/`;

    await page.goto(base+'#JZ-P001',{waitUntil:'networkidle'});
    await page.locator('.product-hotspot').first().click();
    assert.equal(await page.locator('#lightboxCounter').textContent(),'1 / 4');
    await swipe(page,330,40);
    assert.ok((await page.locator('#lightboxImage').getAttribute('src')).endsWith('IMG_018.jpg'));
    assert.equal(await page.locator('#lightboxCounter').textContent(),'2 / 4');
    await swipe(page,330,40);await swipe(page,330,40);await swipe(page,330,40);
    assert.equal(await page.locator('#lightboxCounter').textContent(),'4 / 4');
    assert.equal(await page.locator('#counter').textContent(),'6 / 33');
    assert.equal(new URL(page.url()).hash,'#JZ-P001');
    await page.locator('#lightboxClose').click();
    assert.equal(new URL(page.url()).hash,'#JZ-P001');
    assert.equal(await page.locator('#counter').textContent(),'6 / 33');

    await page.goto(base+'#YJ-P004',{waitUntil:'networkidle'});
    await page.locator('.product-hotspot').click();
    assert.equal(await page.locator('#lightboxCounter').isHidden(),true);
    const singleSrc=await page.locator('#lightboxImage').getAttribute('src');
    await swipe(page,330,40);
    assert.equal(await page.locator('#lightboxImage').getAttribute('src'),singleSrc);
    await page.locator('#lightboxClose').click();

    await page.goto(base+'#ENT-INTRO',{waitUntil:'networkidle'});
    await page.locator('.hotspot').first().click();
    assert.equal(await page.locator('#lightboxClose').isVisible(),true);
    assert.equal(await page.locator('#lightboxCounter').textContent(),'1 / 4');
    await swipe(page,330,40);
    assert.equal(await page.locator('#lightboxCounter').textContent(),'2 / 4');
    await page.locator('#lightboxClose').click();
    assert.equal(new URL(page.url()).hash,'#ENT-INTRO');
    assert.equal(await page.locator('#counter').textContent(),'2 / 33');

    console.log('PASS: page-scoped gallery, single-image state, certificate close button');
  } finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);server.close();process.exitCode=1});
