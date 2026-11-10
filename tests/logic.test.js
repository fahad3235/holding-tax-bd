// holding-tax-bd — node logic tests (no deps).
// Run: node --test tests/logic.test.js
const assert = require('node:assert');
const { test } = require('node:test');
const C = require('../js/calc.js');
const D = require('../js/data.js');

const DEFAULT_COMPONENTS = {};
for (const c of D.COMPONENTS) DEFAULT_COMPONENTS[c.key] = { enabled: true, rate: c.rate };

test('Prothom Alo cross-check: 1,000 sq ft Dhaka house, assessed rent 60,000 -> tax 6,000', () => {
  const r = C.computeTax({ annualRent: 60000, selfOccupied: false, loanInterest: 0, mode: 'combined', combinedRate: 12 });
  assert.strictEqual(r.maintenance, 10000); // 2 months
  assert.strictEqual(r.afterMaint, 50000);
  assert.strictEqual(r.taxableValue, 50000);
  assert.strictEqual(r.annualTax, 6000);
  assert.strictEqual(r.quarterlyTax, 1500);
  assert.strictEqual(r.monthlyTax, 500);
});

test('self-occupied 40% deduction: rent 240,000 -> taxable 120,000 -> tax 14,400 at 12%', () => {
  const r = C.computeTax({ annualRent: 240000, selfOccupied: true, loanInterest: 0, mode: 'combined', combinedRate: 12 });
  assert.strictEqual(r.maintenance, 40000);
  assert.strictEqual(r.afterMaint, 200000);
  assert.strictEqual(r.selfOccDeduction, 80000);
  assert.strictEqual(r.taxableValue, 120000);
  assert.strictEqual(r.annualTax, 14400);
});

test('loan interest deduction: rent 240,000, interest 30,000 -> taxable 170,000 -> tax 20,400', () => {
  const r = C.computeTax({ annualRent: 240000, selfOccupied: false, loanInterest: 30000, mode: 'combined', combinedRate: 12 });
  assert.strictEqual(r.taxableValue, 170000);
  assert.strictEqual(r.annualTax, 20400);
});

test('loan interest cannot push taxable below zero', () => {
  const r = C.computeTax({ annualRent: 60000, selfOccupied: false, loanInterest: 999999, mode: 'combined', combinedRate: 12 });
  assert.strictEqual(r.taxableValue, 0);
  assert.strictEqual(r.annualTax, 0);
});

test('component mode: all Ideal Schedule ceilings sum to 30% -> tax 15,000 on 50,000', () => {
  const r = C.computeTax({ annualRent: 60000, selfOccupied: false, loanInterest: 0, mode: 'components', components: DEFAULT_COMPONENTS });
  assert.strictEqual(r.totalRate, 30);
  assert.strictEqual(r.annualTax, 15000);
  assert.strictEqual(r.breakdown.length, 5);
  assert.strictEqual(r.breakdown.find((b) => b.key === 'building').amount, 3500);
  assert.strictEqual(r.breakdown.find((b) => b.key === 'health').amount, 4000);
  const sum = r.breakdown.reduce((a, b) => a + b.amount, 0);
  assert.strictEqual(sum, r.annualTax);
});

test('component toggles: only building 7% -> 3,500 on taxable 50,000', () => {
  const comps = {};
  for (const k of Object.keys(DEFAULT_COMPONENTS)) comps[k] = { enabled: k === 'building', rate: DEFAULT_COMPONENTS[k].rate };
  const r = C.computeTax({ annualRent: 60000, selfOccupied: false, loanInterest: 0, mode: 'components', components: comps });
  assert.strictEqual(r.totalRate, 7);
  assert.strictEqual(r.annualTax, 3500);
  assert.strictEqual(r.breakdown.length, 1);
});

test('city presets: Dhaka 12, Chattogram 17, Rajshahi 27; others null', () => {
  const byId = (id) => D.CITIES.find((c) => c.id === id);
  assert.strictEqual(byId('dncc').combined, 12);
  assert.strictEqual(byId('dscc').combined, 12);
  assert.strictEqual(byId('ccc').combined, 17);
  assert.strictEqual(byId('rcc').combined, 27);
  assert.strictEqual(byId('kcc').combined, null);
  assert.strictEqual(D.CITIES.length, 13);
  // Rajshahi example: rent 60,000 -> 27% of 50,000 = 13,500
  const r = C.computeTax({ annualRent: 60000, selfOccupied: false, loanInterest: 0, mode: 'combined', combinedRate: byId('rcc').combined });
  assert.strictEqual(r.annualTax, 13500);
});

test('component ceilings match Ideal Tax Schedule 2016', () => {
  const rates = Object.fromEntries(D.COMPONENTS.map((c) => [c.key, c.rate]));
  assert.deepStrictEqual(rates, { building: 7, conservancy: 7, lighting: 5, water: 3, health: 8 });
  assert.strictEqual(D.COMPONENTS.reduce((a, c) => a + c.rate, 0), 30);
});

test('rent helpers: monthly and area', () => {
  assert.strictEqual(C.annualFromMonthly(20000), 240000);
  assert.strictEqual(C.annualFromMonthly(0), 0);
  assert.strictEqual(C.annualFromMonthly(-5), null);
  assert.strictEqual(C.annualFromArea(1000, 20), 240000);
  assert.strictEqual(C.annualFromArea(1000, 5), 60000);
  assert.strictEqual(C.annualFromArea(-1, 20), null);
  assert.strictEqual(C.annualFromArea(1000, -2), null);
});

test('zero rent -> zero tax, no crash', () => {
  const r = C.computeTax({ annualRent: 0, selfOccupied: true, loanInterest: 0, mode: 'combined', combinedRate: 27 });
  assert.strictEqual(r.annualTax, 0);
  assert.strictEqual(r.taxableValue, 0);
});

test('validation rejects bad inputs', () => {
  const base = { annualRent: 60000, selfOccupied: false, loanInterest: 0, mode: 'combined', combinedRate: 12 };
  assert.deepStrictEqual(C.validateInputs({ ...base, annualRent: -1 }), ['annualRent']);
  assert.deepStrictEqual(C.validateInputs({ ...base, annualRent: 100000001 }), ['annualRent']);
  assert.deepStrictEqual(C.validateInputs({ ...base, annualRent: NaN }), ['annualRent']);
  assert.deepStrictEqual(C.validateInputs({ ...base, combinedRate: 101 }), ['combinedRate']);
  assert.deepStrictEqual(C.validateInputs({ ...base, loanInterest: -5 }), ['loanInterest']);
  assert.deepStrictEqual(C.validateInputs({ ...base, mode: 'bogus' }), ['mode']);
  assert.deepStrictEqual(C.validateInputs({ ...base, mode: 'components', components: { building: { enabled: true, rate: 101 } } }), ['components']);
  assert.deepStrictEqual(C.validateInputs(base), []);
  assert.deepStrictEqual(C.validateInputs({ ...base, mode: 'components', components: DEFAULT_COMPONENTS }), []);
});

test('rounding: quarterly/monthly are 2dp', () => {
  const r = C.computeTax({ annualRent: 100000, selfOccupied: false, loanInterest: 0, mode: 'combined', combinedRate: 12 });
  // taxable 83,333.33 -> tax 9,999.9996 -> 10,000.00
  assert.strictEqual(r.taxableValue, 83333.33);
  assert.strictEqual(r.annualTax, 10000);
  assert.strictEqual(r.quarterlyTax, 2500);
  assert.strictEqual(r.monthlyTax, 833.33);
});

test('formatting helpers', () => {
  assert.strictEqual(C.formatBDT(1234567.89), '1,234,567.89');
  assert.strictEqual(C.formatBDT(6000), '6,000.00');
  assert.strictEqual(C.formatBDT(0), '0.00');
  assert.strictEqual(C.toBengaliDigits('12000'), '১২০০০');
  assert.strictEqual(C.toBengaliDigits('৳6,000.00'), '৳৬,০০০.০০');
});

test('import validation', () => {
  const good = { app: 'holding-tax-bd', records: [{ id: 'r1', savedAt: '2026-11-10T00:00:00.000Z', annualRent: 60000, annualTax: 6000, city: 'dncc', mode: 'combined' }] };
  assert.strictEqual(C.validateImport(good).ok, true);
  assert.strictEqual(C.validateImport({ app: 'other', records: [] }).ok, false);
  assert.strictEqual(C.validateImport({ app: 'holding-tax-bd', records: 'nope' }).ok, false);
  assert.strictEqual(C.validateImport({ app: 'holding-tax-bd', records: [{ id: 'r1' }] }).ok, false);
  assert.strictEqual(C.validateImport({ app: 'holding-tax-bd', records: new Array(501).fill(good.records[0]) }).ok, false);
  assert.strictEqual(C.validateImport(null).ok, false);
});

test('i18n completeness: every EN key has a BN twin', () => {
  const en = Object.keys(D.STR.en);
  const bn = Object.keys(D.STR.bn);
  assert.deepStrictEqual(bn.sort(), en.sort());
  for (const k of en) {
    assert.ok(D.STR.en[k] && D.STR.en[k].length > 0, 'EN empty: ' + k);
    assert.ok(D.STR.bn[k] && D.STR.bn[k].length > 0, 'BN empty: ' + k);
  }
  assert.strictEqual(D.GUIDE_STEPS.length, 6);
  assert.strictEqual(D.GUIDE_DOCS.length, 6);
  for (const s of D.GUIDE_STEPS) assert.ok(s.en && s.bn);
  for (const d of D.GUIDE_DOCS) assert.ok(d.en && d.bn);
});
