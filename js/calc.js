// holding-tax-bd — pure holding-tax calculation engine (no DOM, no deps).
// Formulae follow the rules reported for Bangladesh city-corporation holding
// tax (see DATA_NOTES.md for sources):
//   annual rent -> minus 2 months as maintenance (1/6) -> minus 40% if the
//   owner lives in (part of) the holding -> minus deductible loan interest
//   = taxable annual value. Tax = taxable value x rate.
// Rates are either one combined % (city preset) or the sum of the Ideal Tax
// Schedule 2016 component ceilings (building 7, conservancy 7, lighting 5,
// water 3, health 8 = max 30%).
'use strict';

const MAINTENANCE_FRACTION = 1 / 6; // 2 months of 12
const SELF_OCCUPIED_FRACTION = 0.40;
const MAX_ANNUAL_RENT = 100000000; // 10 crore BDT
const MAX_LOAN_INTEREST = 100000000;
const MAX_RATE = 100;

function round2(n) { return Math.round(n * 100) / 100; }

function isFiniteNumber(n) { return typeof n === 'number' && isFinite(n); }

// Validate raw inputs. Returns an array of error keys (empty = valid).
function validateInputs(inp) {
  const errs = [];
  if (!isFiniteNumber(inp.annualRent) || inp.annualRent < 0 || inp.annualRent > MAX_ANNUAL_RENT)
    errs.push('annualRent');
  if (inp.loanInterest !== undefined && inp.loanInterest !== null &&
      (!isFiniteNumber(inp.loanInterest) || inp.loanInterest < 0 || inp.loanInterest > MAX_LOAN_INTEREST))
    errs.push('loanInterest');
  if (inp.mode === 'combined') {
    if (!isFiniteNumber(inp.combinedRate) || inp.combinedRate < 0 || inp.combinedRate > MAX_RATE)
      errs.push('combinedRate');
  } else if (inp.mode === 'components') {
    if (!inp.components || typeof inp.components !== 'object') errs.push('components');
    else {
      for (const k of Object.keys(inp.components)) {
        const c = inp.components[k];
        if (!c || typeof c.enabled !== 'boolean' ||
            !isFiniteNumber(c.rate) || c.rate < 0 || c.rate > MAX_RATE) errs.push('components');
      }
    }
  } else {
    errs.push('mode');
  }
  return errs;
}

// Core computation. Assumes validated input. All money in BDT.
function computeTax(inp) {
  const annualRent = inp.annualRent;
  const loanInterest = inp.loanInterest || 0;
  const maintenance = round2(annualRent * MAINTENANCE_FRACTION);
  const afterMaint = annualRent - maintenance;
  const selfOcc = inp.selfOccupied ? round2(afterMaint * SELF_OCCUPIED_FRACTION) : 0;
  let taxable = afterMaint - selfOcc - loanInterest;
  if (taxable < 0) taxable = 0;
  taxable = round2(taxable);

  let breakdown = [];
  let totalRate = 0;
  let tax = 0;
  if (inp.mode === 'combined') {
    totalRate = inp.combinedRate;
    tax = round2(taxable * totalRate / 100);
    breakdown = [{ key: 'combined', rate: totalRate, amount: tax }];
  } else {
    for (const k of Object.keys(inp.components)) {
      const c = inp.components[k];
      if (!c.enabled) continue;
      const amount = round2(taxable * c.rate / 100);
      breakdown.push({ key: k, rate: c.rate, amount });
      totalRate = round2(totalRate + c.rate);
      tax = round2(tax + amount);
    }
  }
  return {
    annualRent: round2(annualRent),
    maintenance,
    afterMaint: round2(afterMaint),
    selfOccDeduction: selfOcc,
    loanInterest: round2(loanInterest),
    taxableValue: taxable,
    totalRate,
    breakdown,
    annualTax: tax,
    quarterlyTax: round2(tax / 4),
    monthlyTax: round2(tax / 12),
  };
}

// Annual rent from a monthly rent figure.
function annualFromMonthly(monthly) {
  if (!isFiniteNumber(monthly) || monthly < 0) return null;
  return round2(monthly * 12);
}

// Annual rent from floor area x assessed rent per sq ft per month.
function annualFromArea(areaSqft, rentPerSqft) {
  if (!isFiniteNumber(areaSqft) || !isFiniteNumber(rentPerSqft) ||
      areaSqft < 0 || rentPerSqft < 0) return null;
  return round2(areaSqft * rentPerSqft * 12);
}

// Format a BDT amount: 1,234,567.89 with the ৳ sign handled by the caller.
function formatBDT(n) {
  const neg = n < 0;
  const abs = Math.abs(n);
  const parts = abs.toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (neg ? '-' : '') + parts.join('.');
}

// Bengali digits for display when language is BN.
const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
function toBengaliDigits(s) {
  return String(s).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);
}

// Validate an imported history JSON payload. Returns { ok, records } or { ok:false, error }.
function validateImport(payload) {
  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.records))
    return { ok: false, error: 'not-an-object' };
  if (payload.app !== 'holding-tax-bd') return { ok: false, error: 'wrong-app' };
  if (payload.records.length > 500) return { ok: false, error: 'too-many' };
  for (const r of payload.records) {
    if (!r || typeof r !== 'object') return { ok: false, error: 'bad-record' };
    if (typeof r.id !== 'string' || typeof r.savedAt !== 'string') return { ok: false, error: 'bad-record' };
    if (!isFiniteNumber(r.annualRent) || r.annualRent < 0 || r.annualRent > MAX_ANNUAL_RENT)
      return { ok: false, error: 'bad-record' };
    if (!isFiniteNumber(r.annualTax) || r.annualTax < 0) return { ok: false, error: 'bad-record' };
    if (typeof r.city !== 'string' || typeof r.mode !== 'string') return { ok: false, error: 'bad-record' };
  }
  return { ok: true, records: payload.records };
}

if (typeof module !== 'undefined') {
  module.exports = {
    MAINTENANCE_FRACTION, SELF_OCCUPIED_FRACTION,
    validateInputs, computeTax, annualFromMonthly, annualFromArea,
    formatBDT, toBengaliDigits, validateImport,
  };
}
if (typeof window !== 'undefined') {
  window.CALC = {
    MAINTENANCE_FRACTION, SELF_OCCUPIED_FRACTION,
    validateInputs, computeTax, annualFromMonthly, annualFromArea,
    formatBDT, toBengaliDigits, validateImport,
  };
}
