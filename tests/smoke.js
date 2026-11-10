// holding-tax-bd -- headless-Chrome smoke test via raw CDP (no puppeteer).
// Usage: node tests/smoke.js
// Exits non-zero on any failed assertion; fails on page console errors.
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const PORT = 9355;
const BASE = 'file://' + path.resolve(__dirname, '..', 'index.html');
let failures = 0;
let count = 0;
const pageErrors = [];
function check(name, cond, extra) {
  count++;
  console.log((cond ? 'ok - ' : 'FAIL - ') + name + (cond ? '' : ' :: ' + (extra || '')));
  if (!cond) failures++;
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const CHROME_BIN = process.env.CHROME_BIN ||
    require('os').homedir() + '/.cache/ms-playwright/chromium_headless_shell-1187/chrome-linux/headless_shell';
  const chrome = spawn(CHROME_BIN, [
    '--headless=new', '--no-sandbox', '--disable-gpu',
    '--remote-debugging-port=' + PORT, '--user-data-dir=/tmp/htbd-smoke-' + process.pid,
    'about:blank',
  ], { stdio: 'ignore' });
  let targets = [];
  for (let i = 0; i < 50 && targets.length === 0; i++) {
    await wait(200);
    try {
      targets = JSON.parse(await new Promise((res, rej) => {
        http.get('http://127.0.0.1:' + PORT + '/json/list', (r) => {
          let d = ''; r.on('data', (c) => (d += c)); r.on('end', () => res(d));
        }).on('error', rej);
      }));
    } catch (e) { /* retry */ }
  }
  if (!targets.length) { console.log('FAIL - chrome did not start'); process.exit(2); }
  const wsUrl = targets[0].webSocketDebuggerUrl;
  const ws = new WebSocket(wsUrl);
  await new Promise((res) => { ws.onopen = res; });
  let seq = 0; const pending = new Map();
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
    if (msg.method === 'Runtime.exceptionThrown') {
      pageErrors.push('exception: ' + JSON.stringify(msg.params.exceptionDetails).slice(0, 300));
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      pageErrors.push('console.error: ' + JSON.stringify(msg.params.args).slice(0, 300));
    }
  };
  function send(method, params) {
    return new Promise((res) => {
      const id = ++seq;
      pending.set(id, res);
      ws.send(JSON.stringify({ id, method, params: params || {} }));
    });
  }
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  const nav = async (url) => { await send('Page.navigate', { url }); await wait(1400); };
  const ev = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.result && r.result.exceptionDetails) return { error: JSON.stringify(r.result.exceptionDetails).slice(0, 300) };
    return r.result ? r.result.result.value : undefined;
  };
  const clickTab = async (name) => ev(`document.querySelector('[data-tab="${name}"]').click()`);
  const setVal = async (id, v) => ev(`document.getElementById('${id}').value='${v}'`);
  const resultText = async () => ev(`document.getElementById('resultBox').textContent`);

  // ---- Load ----
  await nav(BASE);
  check('page title mentions Holding Tax', (await ev('document.title'))?.includes('Holding Tax'));
  check('calc panel visible by default', (await ev(`document.getElementById('panel-calc').hidden`)) === false);
  check('default city is Dhaka North', (await ev(`document.getElementById('citySelect').value`)) === 'dncc');
  check('default combined rate is 12', (await ev(`document.getElementById('combinedInput').value`)) === '12');
  check('13 cities in select', (await ev(`document.querySelectorAll('#citySelect option').length`)) === 13);
  check('5 component rows rendered', (await ev(`document.querySelectorAll('#componentsList .comp-row').length`)) === 5);
  check('disclaimer present', (await ev(`document.getElementById('disclaimer').textContent`)).includes('not an official bill'));

  // ---- Prothom Alo cross-check: rent 60,000 at 12% -> 6,000 ----
  await setVal('annualInput', '60000');
  await ev(`document.getElementById('calcBtn').click()`);
  check('result box shown', (await ev(`document.getElementById('resultBox').hidden`)) === false);
  check('annual tax is 6,000.00', (await resultText()).includes('6,000.00'));
  check('quarterly is 1,500.00', (await resultText()).includes('1,500.00'));
  check('monthly is 500.00', (await resultText()).includes('500.00'));
  check('taxable value 50,000 shown', (await resultText()).includes('50,000.00'));
  check('last tax hook = 6000', (await ev(`window.__htbd.getLastTax()`)) === 6000);

  // ---- Self-occupied: rent 240,000 -> 14,400 ----
  await setVal('annualInput', '240000');
  await ev(`document.getElementById('selfCheck').click()`);
  await ev(`document.getElementById('calcBtn').click()`);
  check('self-occupied tax 14,400', (await resultText()).includes('14,400.00'));
  await ev(`document.getElementById('selfCheck').click()`);

  // ---- Monthly mode: 20,000/mo -> 24,000/yr ----
  await ev(`document.querySelector('input[name="rentMode"][value="monthly"]').click()`);
  await setVal('monthlyInput', '20000');
  await ev(`document.getElementById('calcBtn').click()`);
  check('monthly mode tax 24,000', (await resultText()).includes('24,000.00'));
  await ev(`document.querySelector('input[name="rentMode"][value="annual"]').click()`);

  // ---- Area mode: 1000 sqft x 20 -> 24,000/yr ----
  await ev(`document.querySelector('input[name="rentMode"][value="area"]').click()`);
  await setVal('areaInput', '1000');
  await setVal('perSqftInput', '20');
  await ev(`document.getElementById('calcBtn').click()`);
  check('area mode tax 24,000', (await resultText()).includes('24,000.00'));
  await ev(`document.querySelector('input[name="rentMode"][value="annual"]').click()`);

  // ---- Components mode: rent 60,000, all on -> 15,000; health off -> 11,000 ----
  await ev(`document.querySelector('input[name="rateMode"][value="components"]').click()`);
  await setVal('annualInput', '60000');
  await ev(`document.getElementById('calcBtn').click()`);
  check('components all-on tax 15,000', (await resultText()).includes('15,000.00'));
  check('component breakdown shows 30%', (await resultText()).includes('30%'));
  await ev(`document.querySelector('[data-comp="health"]').click()`);
  await ev(`document.getElementById('calcBtn').click()`);
  check('health off -> tax 11,000', (await resultText()).includes('11,000.00'));
  check('component total now 22%', (await resultText()).includes('22%'));
  await ev(`document.querySelector('[data-comp="health"]').click()`);
  await ev(`document.querySelector('input[name="rateMode"][value="combined"]').click()`);

  // ---- City change: Rajshahi -> 27; Khulna -> no published note ----
  await ev(`document.getElementById('citySelect').value='rcc'; document.getElementById('citySelect').dispatchEvent(new Event('change'))`);
  check('Rajshahi combined rate 27', (await ev(`document.getElementById('combinedInput').value`)) === '27');
  await setVal('annualInput', '60000');
  await ev(`document.getElementById('calcBtn').click()`);
  check('Rajshahi tax 13,500', (await resultText()).includes('13,500.00'));
  await ev(`document.getElementById('citySelect').value='kcc'; document.getElementById('citySelect').dispatchEvent(new Event('change'))`);
  check('Khulna shows no-published note', (await ev(`document.getElementById('noPublished').hidden`)) === false);
  await ev(`document.getElementById('citySelect').value='dncc'; document.getElementById('citySelect').dispatchEvent(new Event('change'))`);

  // ---- Validation: negative rent -> inline error, no result change ----
  await setVal('annualInput', '-5');
  await ev(`document.getElementById('calcBtn').click()`);
  check('negative rent shows inline error', (await ev(`document.getElementById('calcError').hidden`)) === false);
  await setVal('annualInput', '60000');
  await ev(`document.getElementById('calcBtn').click()`);
  check('error clears on valid calc', (await ev(`document.getElementById('calcError').hidden`)) === true);

  // ---- Rates tab: 13 rows; tap Rajshahi loads it ----
  await clickTab('rates');
  check('rates table has 13 city rows', (await ev(`document.querySelectorAll('#ratesTable tr[data-city]').length`)) === 13);
  check('rates show Dhaka 12%', (await ev(`document.querySelector('#ratesTable').textContent`)).includes('12%'));
  check('rates show Rajshahi 27%', (await ev(`document.querySelector('#ratesTable').textContent`)).includes('27%'));
  await ev(`document.querySelector('#ratesTable tr[data-city="ccc"]').click()`);
  check('tap Chattogram row -> calc tab + city ccc', (await ev(`document.getElementById('citySelect').value`)) === 'ccc' &&
    (await ev(`document.getElementById('panel-calc').hidden`)) === false);
  check('Chattogram combined rate 17', (await ev(`document.getElementById('combinedInput').value`)) === '17');
  await ev(`document.getElementById('citySelect').value='dncc'; document.getElementById('citySelect').dispatchEvent(new Event('change'))`);

  // ---- Guide tab ----
  await clickTab('guide');
  check('guide has 6 steps', (await ev(`document.querySelectorAll('#guideSteps li').length`)) === 6);
  check('guide has 6 documents', (await ev(`document.querySelectorAll('#guideDocs li').length`)) === 6);
  check('guide has 4 notes', (await ev(`document.querySelectorAll('#guideNotes li').length`)) === 4);

  // ---- Bangla toggle ----
  await ev(`document.getElementById('langBtn').click()`);
  check('BN title is Bengali', (await ev(`document.getElementById('appTitle').textContent`)).includes('হোল্ডিং'));
  check('BN lang hook', (await ev(`window.__htbd.getLang()`)) === 'bn');
  await ev(`document.getElementById('langBtn').click()`);
  check('back to EN title', (await ev(`document.getElementById('appTitle').textContent`)) === 'Holding Tax BD');

  // ---- Save / persist / delete ----
  await clickTab('calc');
  await setVal('annualInput', '60000');
  await ev(`document.getElementById('calcBtn').click()`);
  await ev(`document.getElementById('saveBtn').click()`);
  check('saved count is 1', (await ev(`window.__htbd.getSavedCount()`)) === 1);
  await clickTab('saved');
  check('saved card shows 6,000.00', (await ev(`document.getElementById('savedList').textContent`)).includes('6,000.00'));
  await nav(BASE);
  check('saved persists across reload', (await ev(`window.__htbd.getSavedCount()`)) === 1);
  await clickTab('saved');
  await ev(`document.querySelector('#savedList [data-del]').click()`);
  check('delete removes saved record', (await ev(`window.__htbd.getSavedCount()`)) === 0);
  check('empty saved message shows', (await ev(`document.getElementById('savedList').textContent`)).includes('No saved estimates'));

  // ---- 390px mobile: no horizontal overflow ----
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await nav(BASE);
  check('390px: no horizontal overflow', (await ev(`document.documentElement.scrollWidth <= 390`)) === true);
  await clickTab('rates');
  check('390px rates: no horizontal overflow', (await ev(`document.documentElement.scrollWidth <= 390`)) === true);
  await clickTab('calc');

  // ---- Zero network requests + no console/page errors ----
  const reqs = await ev(`performance.getEntriesByType('resource').map(r => r.name).filter(n => !n.startsWith('file://')).length`);
  check('zero non-file network requests', reqs === 0, 'got ' + reqs);
  check('no page errors', pageErrors.length === 0, pageErrors.join(' | '));

  console.log(`\n${count - failures}/${count} checks passed`);
  chrome.kill();
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error('smoke harness error:', e); process.exit(2); });
