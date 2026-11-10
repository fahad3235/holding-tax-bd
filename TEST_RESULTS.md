# TEST RESULTS — holding-tax-bd

Run date: 2026-11-10 (16:00 slot). Tester: factory worker (this run).

## Unit tests — 15/15 PASS

Command: `node --test tests/logic.test.js`

| # | Test | Result |
|---|---|---|
| 1 | Prothom Alo cross-check: rent 60,000 → taxable 50,000 → tax 6,000 at 12% | PASS |
| 2 | Self-occupied 40%: rent 240,000 → taxable 120,000 → tax 14,400 | PASS |
| 3 | Loan interest: rent 240,000, interest 30,000 → taxable 170,000 → tax 20,400 | PASS |
| 4 | Loan interest cannot push taxable below zero | PASS |
| 5 | Component mode: ceilings sum 30% → 15,000 on 50,000; breakdown sums to total | PASS |
| 6 | Component toggles: only building 7% → 3,500 | PASS |
| 7 | City presets: Dhaka 12, Chattogram 17, Rajshahi 27, others null; Rajshahi 60,000 → 13,500 | PASS |
| 8 | Component ceilings match Ideal Tax Schedule 2016 (7/7/5/3/8 = 30) | PASS |
| 9 | Rent helpers: monthly 20,000 → 240,000; area 1000×20 → 240,000; negatives rejected | PASS |
| 10 | Zero rent → zero tax, no crash | PASS |
| 11 | Validation rejects negative/oversize rent, rate >100, bad mode, bad components | PASS |
| 12 | Rounding: 100,000 at 12% → taxable 83,333.33, tax 10,000, monthly 833.33 | PASS |
| 13 | Formatting: 1,234,567.89; Bengali digits 12000 → ১২০০০ | PASS |
| 14 | Import validation: ok / wrong-app / bad-record / too-many / null | PASS |
| 15 | i18n completeness: every EN key has a BN twin; 6 guide steps, 6 docs | PASS |

Repairs: 0 app-logic bugs, 0 test-side fixes — both suites green on the first
run (one pre-test fix: exposed `window.CALC` / `window.DATA` globals in
`js/calc.js` / `js/data.js` so the browser scripts can reach the engine and
data; caught by code review before running the smoke test, not by a failure).

## Headless-Chrome smoke tests — 45/45 PASS

Command: `node tests/smoke.js` (raw CDP, headless_shell-1187, `file://`)

Hand-verified in a real browser at 1440×900 and 390px:

- Default state: Dhaka North selected, combined rate 12, 13 cities, 5
  component rows, disclaimer present.
- Prothom Alo cross-check in-browser: rent ৳60,000 → annual tax ৳6,000.00,
  quarterly ৳1,500.00, monthly ৳500.00, taxable ৳50,000.00.
- Self-occupied: rent ৳240,000 → ৳14,400.00.
- Monthly mode: ৳20,000/mo → ৳24,000.00/yr. Area mode: 1,000 sq ft × ৳20
  → ৳24,000.00/yr.
- Components mode: rent ৳60,000 → ৳15,000.00 at 30%; unchecking Health →
  ৳11,000.00 at 22%.
- City presets: Rajshahi → rate 27, tax ৳13,500.00; Khulna → "no published
  rate" note shown.
- Validation: negative rent shows an inline error; valid input clears it.
- Rates tab: 13 rows; Dhaka 12% and Rajshahi 27% visible; tapping the
  Chattogram row loads city ccc with rate 17 into the calculator.
- Guide tab: 6 steps, 6 documents, 4 notes.
- Bengali toggle: title becomes হোল্ডিং ট্যাক্স বিডি; toggling back restores
  "Holding Tax BD"; language persists via `window.__htbd.getLang()`.
- Save flow: calculate → save → count 1 → card shows ৳6,000.00 → persists
  across reload → delete removes it → empty message shows.
- 390px mobile: no horizontal overflow on calculator or rates tabs.
- Zero non-file network requests; zero console/page errors.

## Not tested

- Real DNCC/DSCC portals (out of scope — offline estimator; no payment
  processing). Live GitHub Pages verification happens after the push
  (Step 6) and is recorded in the ledger, not here.
