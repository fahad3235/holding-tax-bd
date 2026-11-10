// holding-tax-bd — UI logic (no deps, offline, localStorage only).
'use strict';

/* global localStorage, document, window */

const LS_LANG = 'htbd.lang';
const LS_RATES = 'htbd.rates';
const LS_SAVED = 'htbd.saved';

let lang = 'en';
let savedRates = null; // { components: {key: {enabled, rate}} }
let lastResult = null;
let lastInputs = null;

function t(key) {
  const s = (typeof DATA !== 'undefined' ? DATA.STR : null);
  return (s && s[lang] && s[lang][key]) || (s && s.en[key]) || key;
}
function cityName(c) { return lang === 'bn' ? c.bn : c.en; }
function compName(c) { return lang === 'bn' ? c.bn : c.en; }
function money(n) {
  const f = CALC.formatBDT(n);
  return lang === 'bn' ? '৳' + CALC.toBengaliDigits(f) : '৳' + f;
}
function num(n) {
  const s = String(n);
  return lang === 'bn' ? CALC.toBengaliDigits(s) : s;
}
function pct(n) { return num(n) + '%'; }

function $(id) { return document.getElementById(id); }
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function loadPersisted() {
  try { lang = localStorage.getItem(LS_LANG) === 'bn' ? 'bn' : 'en'; } catch (e) { lang = 'en'; }
  try {
    const raw = localStorage.getItem(LS_RATES);
    if (raw) savedRates = JSON.parse(raw);
  } catch (e) { savedRates = null; }
}
function persistRates() {
  try { localStorage.setItem(LS_RATES, JSON.stringify(savedRates)); } catch (e) { /* storage unavailable */ }
}
function loadSaved() {
  try {
    const raw = localStorage.getItem(LS_SAVED);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) { return []; }
}
function persistSaved(arr) {
  try { localStorage.setItem(LS_SAVED, JSON.stringify(arr)); } catch (e) { /* storage unavailable */ }
}

function currentComponents() {
  const out = {};
  for (const c of DATA.COMPONENTS) {
    const saved = savedRates && savedRates.components && savedRates.components[c.key];
    out[c.key] = saved ? { enabled: !!saved.enabled, rate: saved.rate } : { enabled: true, rate: c.rate };
  }
  return out;
}

function renderAll() {
  document.documentElement.lang = lang === 'bn' ? 'bn' : 'en';
  $('appTitle').textContent = t('title');
  $('appSub').textContent = t('subtitle');
  $('langBtn').textContent = t('langBtn');
  document.querySelectorAll('[data-tab]').forEach((b) => {
    b.textContent = t('tab' + b.dataset.tab[0].toUpperCase() + b.dataset.tab.slice(1));
  });
  renderCalcLabels();
  renderRates();
  renderGuide();
  renderSaved();
  $('footNote').textContent = t('footer');
}

function renderCalcLabels() {
  $('rentLabel').textContent = t('rentLabel');
  $('rentHint').textContent = t('rentHint');
  $('modeAnnualLbl').textContent = t('rentModeAnnual');
  $('modeMonthlyLbl').textContent = t('rentModeMonthly');
  $('modeAreaLbl').textContent = t('rentModeArea');
  $('monthlyLabel').textContent = t('monthlyLabel');
  $('areaLabel').textContent = t('areaLabel');
  $('perSqftLabel').textContent = t('perSqftLabel');
  $('cityLabel').textContent = t('cityLabel');
  $('selfLbl').textContent = t('selfLabel');
  $('loanLabel').textContent = t('loanLabel');
  $('modeLabel').textContent = t('modeLabel');
  $('modeCombinedLbl').textContent = t('modeCombined');
  $('modeComponentsLbl').textContent = t('modeComponents');
  $('combinedLabel').textContent = t('combinedLabel');
  $('combinedHint').textContent = t('combinedHint');
  $('componentsHint').textContent = t('componentsHint');
  $('calcBtn').textContent = t('calcBtn');
  $('saveBtn').textContent = t('saveBtn');
  $('disclaimer').textContent = t('disclaimer');
  // city select options
  const sel = $('citySelect');
  const cur = sel.value;
  sel.innerHTML = DATA.CITIES.map((c) =>
    '<option value="' + c.id + '">' + esc(cityName(c)) + '</option>').join('');
  if (DATA.CITIES.some((c) => c.id === cur)) sel.value = cur;
  renderComponents();
  updateRentModeVisibility();
  updateModeVisibility();
  if (lastResult) renderResult(lastResult, lastInputs);
}

function renderComponents() {
  const comps = currentComponents();
  $('componentsList').innerHTML = DATA.COMPONENTS.map((c) => {
    const v = comps[c.key];
    return '<label class="comp-row"><input type="checkbox" data-comp="' + c.key + '"' +
      (v.enabled ? ' checked' : '') + '> <span>' + esc(compName(c)) + '</span>' +
      '<input type="number" min="0" max="100" step="0.5" data-rate="' + c.key + '" value="' + v.rate + '" aria-label="' + esc(compName(c)) + ' rate"> <span>%</span></label>';
  }).join('');
  $('componentsList').querySelectorAll('[data-rate]').forEach((inp) => {
    inp.addEventListener('change', () => {
      const key = inp.dataset.rate;
      const rate = parseFloat(inp.value);
      if (!savedRates) savedRates = { components: {} };
      if (!savedRates.components) savedRates.components = {};
      const prev = currentComponents()[key];
      savedRates.components[key] = { enabled: prev.enabled, rate: isFinite(rate) ? rate : prev.rate };
      persistRates();
    });
  });
  $('componentsList').querySelectorAll('[data-comp]').forEach((cb) => {
    cb.addEventListener('change', () => {
      const key = cb.dataset.comp;
      if (!savedRates) savedRates = { components: {} };
      if (!savedRates.components) savedRates.components = {};
      const prev = currentComponents()[key];
      savedRates.components[key] = { enabled: cb.checked, rate: prev.rate };
      persistRates();
    });
  });
}

function updateRentModeVisibility() {
  const mode = document.querySelector('input[name="rentMode"]:checked').value;
  $('annualWrap').hidden = mode !== 'annual';
  $('monthlyWrap').hidden = mode !== 'monthly';
  $('areaWrap').hidden = mode !== 'area';
}
function updateModeVisibility() {
  const mode = document.querySelector('input[name="rateMode"]:checked').value;
  $('combinedWrap').hidden = mode !== 'combined';
  $('componentsWrap').hidden = mode !== 'components';
}

function onCityChange() {
  const city = DATA.CITIES.find((c) => c.id === $('citySelect').value);
  const inp = $('combinedInput');
  if (city && city.combined !== null) {
    inp.value = city.combined;
    $('noPublished').hidden = true;
  } else {
    inp.value = '';
    inp.placeholder = '12';
    $('noPublished').hidden = false;
    $('noPublished').textContent = t('noPublished');
  }
}

function readInputs() {
  const rentMode = document.querySelector('input[name="rentMode"]:checked').value;
  let annualRent = null;
  if (rentMode === 'annual') annualRent = parseFloat($('annualInput').value);
  else if (rentMode === 'monthly') {
    const m = parseFloat($('monthlyInput').value);
    annualRent = CALC.annualFromMonthly(m);
  } else {
    const a = parseFloat($('areaInput').value);
    const r = parseFloat($('perSqftInput').value);
    annualRent = CALC.annualFromArea(a, r);
  }
  const mode = document.querySelector('input[name="rateMode"]:checked').value;
  const inp = {
    annualRent,
    selfOccupied: $('selfCheck').checked,
    loanInterest: parseFloat($('loanInput').value) || 0,
    mode,
    city: $('citySelect').value,
    rentMode,
  };
  if (mode === 'combined') inp.combinedRate = parseFloat($('combinedInput').value);
  else inp.components = currentComponents();
  return inp;
}

function calculate() {
  const inp = readInputs();
  const errBox = $('calcError');
  errBox.hidden = true;
  errBox.textContent = '';
  const rentMode = document.querySelector('input[name="rentMode"]:checked').value;
  if (!isFinite(inp.annualRent) || inp.annualRent < 0 || inp.annualRent > 100000000) {
    errBox.textContent = t(rentMode === 'monthly' ? 'errMonthly' : rentMode === 'area' ? 'errArea' : 'errAnnualRent');
    errBox.hidden = false;
    return;
  }
  if (!isFinite(inp.loanInterest) || inp.loanInterest < 0 || inp.loanInterest > 100000000) {
    errBox.textContent = t('errLoan');
    errBox.hidden = false;
    return;
  }
  const errs = CALC.validateInputs(inp);
  if (errs.length) {
    errBox.textContent = t(errs.includes('combinedRate') || errs.includes('components') ? 'errRate' : 'errAnnualRent');
    errBox.hidden = false;
    return;
  }
  const res = CALC.computeTax(inp);
  lastResult = res;
  lastInputs = inp;
  renderResult(res, inp);
  $('saveBtn').disabled = false;
}

function renderResult(res, inp) {
  const city = DATA.CITIES.find((c) => c.id === inp.city);
  const rows = [
    [t('annualRent'), money(res.annualRent)],
    [t('maintenance'), '− ' + money(res.maintenance)],
    [t('afterMaint'), money(res.afterMaint)],
  ];
  if (res.selfOccDeduction > 0) rows.push([t('selfDed'), '− ' + money(res.selfOccDeduction)]);
  if (res.loanInterest > 0) rows.push([t('loanDed'), '− ' + money(res.loanInterest)]);
  rows.push([t('taxable'), money(res.taxableValue)]);
  rows.push([t('totalRate'), pct(res.totalRate)]);
  const breakdown = res.breakdown.map((b) => {
    const name = b.key === 'combined'
      ? (city ? cityName(city) : t('modeCombined'))
      : compName(DATA.COMPONENTS.find((c) => c.key === b.key));
    return '<tr><td>' + esc(name) + '</td><td>' + pct(b.rate) + '</td><td>' + money(b.amount) + '</td></tr>';
  }).join('');
  $('resultBox').hidden = false;
  $('resultBox').innerHTML =
    '<h2>' + esc(t('resultTitle')) + '</h2>' +
    '<div class="big">' + money(res.annualTax) + ' <span>/ ' + esc(t('annualTax')) + '</span></div>' +
    '<div class="sub">' + esc(t('quarterly')) + ': ' + money(res.quarterlyTax) + ' &nbsp;•&nbsp; ' +
    esc(t('monthly')) + ': ' + money(res.monthlyTax) + '</div>' +
    '<table class="kv">' + rows.map((r) =>
      '<tr><td>' + esc(r[0]) + '</td><td>' + r[1] + '</td></tr>').join('') + '</table>' +
    '<h3>' + esc(t('breakdownTitle')) + '</h3>' +
    '<table class="kv"><tr><th></th><th>%</th><th></th></tr>' + breakdown + '</table>';
}

function saveCurrent() {
  if (!lastResult || !lastInputs) return;
  const city = DATA.CITIES.find((c) => c.id === lastInputs.city);
  const rec = {
    id: 'r' + Date.now().toString(36) + Math.floor(Math.random() * 1000),
    savedAt: new Date().toISOString(),
    city: lastInputs.city,
    cityEn: city ? city.en : '',
    mode: lastInputs.mode,
    annualRent: lastResult.annualRent,
    taxableValue: lastResult.taxableValue,
    totalRate: lastResult.totalRate,
    annualTax: lastResult.annualTax,
    selfOccupied: !!lastInputs.selfOccupied,
  };
  const arr = loadSaved();
  arr.unshift(rec);
  persistSaved(arr.slice(0, 200));
  renderSaved();
  $('saveMsg').textContent = t('savedMsg');
  setTimeout(() => { $('saveMsg').textContent = ''; }, 2500);
}

function renderRates() {
  $('ratesTitle').textContent = t('ratesTitle');
  $('ratesHint').textContent = t('ratesHint');
  $('ratesTable').innerHTML =
    '<tr><th>' + esc(t('colCity')) + '</th><th>' + esc(t('colRate')) + '</th><th>' + esc(t('colBasis')) + '</th></tr>' +
    DATA.CITIES.map((c) =>
      '<tr data-city="' + c.id + '" tabindex="0"><td>' + esc(cityName(c)) + '</td><td>' +
      (c.combined !== null ? pct(c.combined) + ' <span class="tag">' + esc(t('reportedTag')) + '</span>' : esc(t('rateVaries'))) +
      '</td><td>' + esc(t(c.note === 'reported' ? 'basisRent' : 'basisVaries')) + '</td></tr>').join('');
  $('ratesTable').querySelectorAll('tr[data-city]').forEach((tr) => {
    const go = () => {
      $('citySelect').value = tr.dataset.city;
      onCityChange();
      switchTab('calc');
      $('citySelect').focus();
    };
    tr.addEventListener('click', go);
    tr.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
  });
}

function renderGuide() {
  $('guideTitle').textContent = t('guideTitle');
  $('docsTitle').textContent = t('docsTitle');
  $('noteTitle').textContent = t('noteTitle');
  $('guideSteps').innerHTML = DATA.GUIDE_STEPS.map((s) =>
    '<li>' + esc(lang === 'bn' ? s.bn : s.en) + '</li>').join('');
  $('guideDocs').innerHTML = DATA.GUIDE_DOCS.map((d) =>
    '<li>' + esc(lang === 'bn' ? d.bn : d.en) + '</li>').join('');
  $('guideNotes').innerHTML = ['note1', 'note2', 'note3', 'note4'].map((k) =>
    '<li>' + esc(t(k)) + '</li>').join('');
}

function renderSaved() {
  $('savedTitle').textContent = t('savedTitle');
  $('exportBtn').textContent = t('exportBtn');
  $('importBtn').textContent = t('importBtn');
  $('eraseBtn').textContent = t('eraseBtn');
  const arr = loadSaved();
  const list = $('savedList');
  if (!arr.length) {
    list.innerHTML = '<p class="empty">' + esc(t('savedEmpty')) + '</p>';
    return;
  }
  list.innerHTML = arr.map((r) =>
    '<div class="saved-card" data-id="' + esc(r.id) + '">' +
    '<div><strong>' + money(r.annualTax) + '</strong> / ' + esc(t('annualTax')) +
    '<br><span class="muted">' + esc(r.cityEn || r.city) + ' • ' + esc(t('taxable')) + ' ' + money(r.taxableValue) +
    ' • ' + pct(r.totalRate) + '<br>' + esc(t('savedOn')) + ' ' + esc(r.savedAt.slice(0, 10)) + '</span></div>' +
    '<button class="del" data-del="' + esc(r.id) + '">' + esc(t('deleteBtn')) + '</button></div>').join('');
  list.querySelectorAll('[data-del]').forEach((b) => {
    b.addEventListener('click', () => {
      persistSaved(loadSaved().filter((r) => r.id !== b.dataset.del));
      renderSaved();
    });
  });
}

function exportSaved() {
  const payload = { app: 'holding-tax-bd', exportedAt: new Date().toISOString(), records: loadSaved() };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'holding-tax-bd-export.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function importSaved(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const payload = JSON.parse(reader.result);
      const v = CALC.validateImport(payload);
      if (!v.ok) { $('importMsg').textContent = t('importBad'); return; }
      const existing = loadSaved();
      const ids = new Set(existing.map((r) => r.id));
      const fresh = v.records.filter((r) => !ids.has(r.id));
      persistSaved(existing.concat(fresh).slice(0, 200));
      renderSaved();
      $('importMsg').textContent = t('importOk');
    } catch (e) { $('importMsg').textContent = t('importBad'); }
  };
  reader.readAsText(file);
}

function switchTab(name) {
  document.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
  ['calc', 'rates', 'guide', 'saved'].forEach((n) => { $('panel-' + n).hidden = n !== name; });
  if (name === 'saved') renderSaved();
}

function init() {
  loadPersisted();
  document.querySelectorAll('[data-tab]').forEach((b) =>
    b.addEventListener('click', () => switchTab(b.dataset.tab)));
  $('langBtn').addEventListener('click', () => {
    lang = lang === 'en' ? 'bn' : 'en';
    try { localStorage.setItem(LS_LANG, lang); } catch (e) { /* ignore */ }
    renderAll();
  });
  document.querySelectorAll('input[name="rentMode"]').forEach((r) =>
    r.addEventListener('change', updateRentModeVisibility));
  document.querySelectorAll('input[name="rateMode"]').forEach((r) =>
    r.addEventListener('change', updateModeVisibility));
  $('citySelect').addEventListener('change', onCityChange);
  $('calcBtn').addEventListener('click', calculate);
  $('saveBtn').addEventListener('click', saveCurrent);
  $('exportBtn').addEventListener('click', exportSaved);
  $('importBtn').addEventListener('click', () => $('importFile').click());
  $('importFile').addEventListener('change', (e) => {
    if (e.target.files[0]) importSaved(e.target.files[0]);
    e.target.value = '';
  });
  $('eraseBtn').addEventListener('click', () => {
    const ans = window.prompt(t('eraseConfirm'));
    if (ans === 'DELETE') {
      persistSaved([]);
      renderSaved();
      $('importMsg').textContent = t('eraseDone');
    }
  });
  renderAll();
  onCityChange();
  switchTab('calc');
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}

// Test hooks (used by the headless-Chrome smoke tests).
if (typeof window !== 'undefined') {
  window.__htbd = {
    getLang: () => lang,
    getSavedCount: () => loadSaved().length,
    getLastTax: () => (lastResult ? lastResult.annualTax : null),
  };
}
