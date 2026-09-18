# Regional and Device Verification

## Automated Checks

`src/lib/regionalChecks.ts` adds checks to the existing in-browser suite for country
profiles, cumulative bands, regional coverage, locality isolation, contribution
ceilings, number entry, and swipe thresholds. Open **Formulas & help**, then
**Calculation engine checks**, then **Run checks on this device** to inspect the
results in the target browser. The suite yields between checks to keep touch
controls responsive; closing the dialog cancels the run.

The production build is verified with the project's provided build tool. A build
does not execute the browser interaction checks below.

## Target Viewports

| Representative Device Class | CSS Viewport | Main Expectations |
| --- | --- | --- |
| Small phone / iPhone SE class | 320-375 px wide | No horizontal page overflow; three visible tabs; native selects |
| Modern iPhone / Pixel / Galaxy phone | 390-430 px wide | One-row swipeable tool navigation; safe-area padding; 48 px touch targets |
| Phone landscape | 667-932 px wide, under 500 px high | Shorter navigation; scrollable dialogs; accessible close and apply controls |
| iPad mini / iPad portrait | 768-834 px wide | Two-column input fields; results below; no nested explorer list scrolling |
| iPad / Android tablet landscape | 1024-1366 px wide | Side-by-side inputs and results where space permits; touch-sized controls |
| Tablet split view / foldable cover display | 320-900 px available | Layout follows the available viewport, not the physical device width |
| Desktop with touch display | 1280 px and above | Desktop composition with coarse-pointer touch targets |

Device names describe representative test classes, not guaranteed model-specific
certification. CSS uses viewport size, pointer capability, orientation, and safe
area insets. Platform detection only supports iOS/iPadOS/Android accommodations;
no unique device identifier or fingerprint is stored.

## Interaction Checklist

- Select California and a listed locality. The duplicate county dossier is gone, but the locality remains available and survives a reload.
- Change countries and confirm that incompatible localities, taxpayer profiles, and contribution enrollment do not carry over.
- Select an unlisted region or locality. The custom input is available and no local tax is guessed from a name.
- Switch between the Seychelles and PNG taxpayer profiles, then press Calculate. Confirm that the reference result changes and previous results remain marked stale before confirmation.
- Enable a country contribution requiring an earnings ceiling. Missing or invalid input must prevent calculation and identify the field.
- Swipe left and right on non-interactive calculator content. One gesture changes one tab without wrapping at the endpoints.
- Scroll vertically, swipe a table, manipulate form controls, select text, pinch zoom, and use browser-edge back gestures. None should change calculator tabs.
- Disable swipe navigation in Preferences and confirm that taps and keyboard navigation still work.
- Open a dialog near the bottom of a long page. Close it with its button, Escape, or the phone drag handle; the underlying scroll position and focus should be restored.
- Open the on-screen keyboard inside a dialog. Keep its input, scrollable content, close control, and footer accessible. Retest after rotation.
- Calculate in a stacked layout. A valid result scrolls into view unless that preference is off; invalid inputs stay on the form.
- Increase text size, use 200% zoom, enable reduced motion, and use dark appearance. Content should remain legible and operable.
- Test iOS Safari, iPadOS Safari (including split view), Android Chrome, Samsung Internet, and a desktop keyboard/screen reader before claiming device certification.

## Data Scope

New 2026 reference entries cover mainland China, Brunei, the Bahamas, Seychelles,
Zambia, and Papua New Guinea. Source links remain visible. The new mainland China
entry does not inherit the separate Hong Kong or Macao tax systems.

Expanded Germany, Japan, India and New Zealand regions use the existing national
reference packs. Added city/district choices are location labels, not verified
local tax schedules. Unknown population, income, property-tax, and cost-of-living
values are not presented as verified statistics. Historical reference data in the
original archive still requires a jurisdiction-by-jurisdiction production review.

Currency pairs without an ECB reference can use the manual rate option. No rate is
invented or fetched by sending a user's monetary amount.