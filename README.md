# Holding Tax BD — Bangladesh Holding Tax Estimator

Offline, bilingual (English / বাংলা) estimator for Bangladesh city-corporation
**holding tax** — the annual municipal property tax charged on a holding's
assessed rental value. Works fully offline; no data ever leaves the device.

Live site: https://fahad3235.github.io/holding-tax-bd/

## Problem

Every year, owners of houses and flats in Bangladesh's city corporations must
pay holding tax, but the bill is hard to predict: the tax is charged on an
*assessed annual rental value* (not the sale price), two months' rent is
deducted as maintenance, owners who live in their own holding get a further
40% deduction, and the rate itself is a bundle of component rates that differ
by corporation and ward. Most owners only discover the figure when the notice
arrives. This app lets anyone estimate the tax in advance, see every
deduction and component, and compare what different corporations report.

## Features

1. **Holding-tax calculator** — annual rent (or monthly rent, or floor area ×
   rent/sq ft) → maintenance deduction (2 months) → self-occupied deduction
   (40%) → optional loan-interest deduction → taxable annual value → annual,
   quarterly and monthly tax, with a full itemised breakdown.
2. **Two rate methods** — one combined rate (city preset, editable) or the
   component rates of the City Corporation Ideal Tax Schedule 2016 (building
   7%, conservancy 7%, lighting 5%, water 3%, health 8%; each toggleable and
   editable, persisted).
3. **City rate reference** — reported combined rates for all 12 city
   corporations + Pourashava (Dhaka 12%, Chattogram 17%, Rajshahi 27% as
   reported in 2017; other cities marked "varies — check notice"). Tap a row
   to load that city into the calculator.
4. **Payment guide** — 6 steps to pay, documents you may need, and "good to
   know" notes (including the historical 1957 Act schedule).
5. **Saved estimates** — history with totals, delete, JSON export + strict
   import, typed-`DELETE` erase-all; everything in localStorage.
6. **Bilingual + mobile** — EN/বাংলা toggle (persisted) with Bengali digits,
   390px mobile layout, zero network requests.

## Stack

- Plain HTML + CSS + JavaScript, no build step, no dependencies.
- `js/calc.js` — pure calculation engine (also required by the node tests).
- `js/data.js` — city/component reference data + bilingual strings.
- `js/app.js` — UI logic, tabs, persistence, export/import.
- Tests: `node:test` unit tests + raw-CDP headless-Chrome smoke tests.

## Prerequisites

- Any modern browser (open `index.html`), or Node.js ≥ 18 to run the tests.

## Install / run

```sh
# Just open it — no install, no server needed:
open index.html
# or serve locally:
python3 -m http.server 8000
```

## Dev commands

```sh
node --test tests/logic.test.js   # 15 unit tests
node tests/smoke.js               # 45 headless-Chrome smoke checks
```

## Environment

None. No API keys, no backend, no analytics. All state lives in
`localStorage` under keys `htbd.lang`, `htbd.rates`, `htbd.saved`.

## Testing

- **15/15 node unit tests** — including the Prothom Alo cross-check
  (assessed rent ৳60,000 → taxable ৳50,000 → 12% = ৳6,000, matching the
  published ৳6,000–7,680 range for a 1,000 sq ft Dhaka house), self-occupied
  and loan-interest deductions, component sums/toggles, city presets,
  validation, rounding, formatting, import validation, i18n completeness.
- **45/45 headless-Chrome smoke checks** — real browser flows: all three rent
  modes, both rate methods, component toggling, city presets, tap-a-row
  loading, guide content, Bengali toggle, save/persist/delete, 390px layout,
  zero non-file network requests, zero console/page errors.
- See `TEST_RESULTS.md` for the full hand-verified list.

## Deployment

GitHub Pages (main branch, root). Push the repo contents and enable Pages;
the app is a static site with relative asset paths.

## Limitations (read before relying on it)

- **Personal estimator only — not an official bill.** Your real tax is the
  figure on your holding-tax notice. Rates vary by ward and corporation and
  change over time; verify at your city corporation revenue office.
- Combined rates for Dhaka (12%), Chattogram (17%) and Rajshahi (27%) are
  **as reported in October 2017**; no published combined figure was found for
  the other corporations, so those presets ask you to type the rate from your
  own notice.
- The 2-month maintenance deduction and 40% self-occupied deduction follow
  the 1986 Tax Law s.20(3) as reported in the press; the loan-interest
  deduction follows the same reports. Your corporation's assessment may apply
  them differently.
- Component rates are the **ceilings** from the Ideal Tax Schedule 2016
  (maximum chargeable), not necessarily what your corporation charges.
- No live data: no connection to DNCC/DSCC portals, no payment processing.

## Status

Complete MVP, tested and published. Data notes and sources in
`DATA_NOTES.md`.
