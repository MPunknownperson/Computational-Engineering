# CalcVault

A public React, Vite, and Tailwind calculation website. There is no login, search box, chat interface, or account system.

## Result Behavior

- No result is shown until Calculate is pressed.
- Editing inputs after a calculation keeps the previous result visible and marks it as requiring an update.
- The latest result appears only after Calculate is pressed again.
- Internally computed drafts are used only for validation and are never presented as confirmed results.

## Independent Tool Modules

`src/lib/toolModules/` contains ten independent module definitions. Each module owns its formula library, data inputs, processing stages, and companion-tool links.

- Mortgage: principal, rate-convention conversion, amortization, zero-rate handling, interest-only and balloon methods, ownership costs, LTV, and actuarial APR.
- Tax: period annualization, year-specific packs, national brackets or flat rate, credits, regional methods, local tax, payroll contributions, and period proration.
- Car finance: taxable vehicle value, financing balance, amortization, balloon, and flat add-on methods.
- Compound growth: net rate, periodic-rate conversion, ordinary annuity, annuity due, simple interest, continuous growth, and real value.
- Transactions: distinct tax, processing, fixed, platform, cross-border, spread, payout, net, and gross-up stages.
- Currency: source fee, dated reference rate, spread-adjusted rate, output, and cost.
- Probability: independent-event algebra, conditional probability, binomial log-space evaluation, exact BigInt counting, and seeded Monte Carlo validation.
- Scientific: allowlisted expression parsing, angle conversion, discriminant classification, and numerically stable quadratic roots.
- Units: dimensional validation, canonical-base conversion, temperature offsets, decimal/binary storage, and inverse checking.
- BMI: SI normalization, BMI ratio, category mapping, and reference-weight inversion.

The processing facade in `src/lib/processing.ts` dispatches to the selected module. It does not combine unrelated tools using a universal weighted formula.

## Formula Sets

Each confirmed result includes several formula definitions. The detail view distinguishes formulas applied to the current method from valid alternative formulas. The reference dialog lists the full formula library for every tool.

## Flag Sources

- Country flags use FlagCDN country SVGs.
- Mapped regional flags use named Wikimedia Commons files.
- Regional lookup keys include country and region, so `US-WA` and `AU-WA` cannot collide.
- If no current official regional flag is mapped, the interface uses a text jurisdiction identifier.
- Northern Ireland deliberately uses text because it has no current official regional flag; the historical Ulster Banner is not shown as current.
- Remote asset failure also falls back to text rather than displaying an invented approximation.

## Evidence and Data

- Statutory tax packs and dated exchange-rate references control statutory and contractual calculations.
- Supplementary sources are selected by domain in `src/lib/evidence.ts`: OECD, Census/ACS, WID, NBER, CFPB, BIS, NIST, BIPM, and WHO.
- Supplementary evidence supplies context and validation references. It is not silently mixed into statutory tax or contractual payment results.
- Regional figures should retain source-year metadata and be reviewed before production use. Unsupported local rules remain explicit custom inputs.

## Verification

- The deterministic self-check suite covers loan edge cases, amortization reconciliation, historical tax packs, country options, exact and simulated probability, localized input, unit round trips, fee reverse calculations, target solvers, rate validation, and every tool method.
- Run the production build with the provided build command.
- Browser interaction and remote flag availability should be checked in the target deployment environment.