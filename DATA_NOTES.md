# DATA NOTES — holding-tax-bd

All figures in this app were checked against published sources on
2026-11-10. Where sources disagree or a figure is old, the app says so in the
UI and here. Nothing is presented as a live or official figure.

## What the app computes

```
annual rent (assessed annual value)
  − 2 months' rent as maintenance        (1/6 of annual rent)
  − 40% if the owner lives in the holding (of the remainder)
  − deductible loan interest (optional)
= taxable annual value
× rate (one combined % OR sum of component %)
= annual holding tax   (÷4 quarterly, ÷12 monthly)
```

## Sources

1. **City Corporation Ideal Tax Schedule 2016** (gazetted 2 March 2015;
   reported by Prothom Alo, 6 Jul 2015 and 13 Oct 2017): component ceilings —
   building/land **7%**, conservancy (waste) **7%**, street lighting **5%**,
   water supply **3%**, health **8%** — maximum combined **30%** of the
   annual value. The app ships these as the editable component defaults and
   labels them ceilings, not current charges.
2. **Prothom Alo, 13 Oct 2017** ("Holding tax varies from city to city"):
   combined rates as then applied — **Dhaka 12%**, **Chattogram 17%**,
   **Rajshahi 27%**; a 1,000 sq ft residential house in Dhaka paid
   ৳6,000–7,680. The app uses 12/17/27 as the three reported presets and
   marks them "Reported 2017".
3. **Financial Express, 14 Oct 2017** ("House owners in two city
   corporations fear hassles"): confirms the 12% Dhaka figure and the
   2-month maintenance deduction (s.20(3) of the 1986 Tax Law) plus the 40%
   deduction when the owner lives in part of the property, and the
   deductibility of annual loan interest on a registered mortgage.
4. **Urban Immovable Property Tax Act, 1957** (Schedule as substituted by the
   Finance Act, 1980, s.9 — bdlaws.minlaw.gov.bd, Act Print 604, s.12110):
   annual value ≤ ৳6,000 → nil; other holdings 5% if not self-occupied,
   3% if self-occupied. Quoted in the guide only as a **historical**
   reference — it is not the current city-corporation system.
5. **DNCC/DSCC online payment**: DNCC digitised billing via its e-Revenue
   portal (2025); DSCC online payment available since 2017 (press reports).
   The guide names them as reported and tells the user to verify locally.

## Cross-checks performed

- **Prothom Alo worked example**: a 1,000 sq ft Dhaka house paying
  ৳6,000 at 12% implies a taxable value of ৳50,000, i.e. an assessed annual
  rent of ৳60,000 (10 months × 12%). The app reproduces exactly this:
  rent ৳60,000 → maintenance ৳10,000 → taxable ৳50,000 → tax **৳6,000**.
  The ৳6,000–7,680 range in the article corresponds to assessed rents of
  ৳60,000–76,800 — plausible 2017 assessed rents, far below today's market
  rents, which is why the app stresses that the *assessed* value on the
  notice is what matters.
- **Matrix sanity**: component ceilings sum to 30%; 30% of ৳50,000 =
  ৳15,000 — the maximum the schedule allows on that value.
- **Fare-like symmetry check**: n/a (single-line tax, no matrix).

## What is NOT verified / labelled as such

- No published combined rate was found for Khulna, Sylhet, Barishal,
  Rangpur, Mymensingh, Gazipur, Narayanganj, Cumilla or Pourashavas — the
  app shows "Varies — check notice" and requires the user to type the rate.
- Current (2026) rates may differ from the 2017 reported figures; the UI
  and README say the 2017 figures are planning numbers, not the bill.
- Penalty/surcharge rules for arrears vary by corporation and are not
  computed; the guide says to confirm locally.
- The app does not fetch live data and is not connected to any corporation
  portal.

## Assumptions (labelled in UI/README)

- Partial-year holdings, exemptions for religious/charitable property, and
  ward-level rate variations are out of scope.
- Loan interest is entered by the user; the app does not check eligibility.
- Rounding: money is rounded to 2 decimal places (paisa); quarterly and
  monthly figures are the annual figure ÷ 4 and ÷ 12, rounded to 2dp.
