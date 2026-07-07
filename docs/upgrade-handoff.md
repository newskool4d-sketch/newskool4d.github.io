# Incheon Education Map Upgrade Handoff

## What Changed

- Added a deterministic 1000-row synthetic QA fixture at `data/qa/synthetic-1000.csv`.
- Added a fixture manifest at `data/qa/synthetic-1000-manifest.json` with expected importer, map, office, type, and school-level counts.
- Added `tools/serve-static.mjs` for local static QA with preferred-port fallback through a configured range and SIGINT/SIGTERM cleanup.
- Added Todo 10 integrated browser QA scripts under `.omo/evidence/task-10-ice-eduinfo-map-final-improvement/`.
- Preserved `handoff.md`, `schools.html`, `infrastructure.html`, `index.html`, README work, and prior Todo 1-9 source changes.

## How To Run

From the app root:

```powershell
node .omo/evidence/task-10-ice-eduinfo-map-final-improvement/generate-synthetic-fixture.mjs
node tools/check-syntax.mjs
node --test tests/*.test.mjs
node tools/serve-static.mjs --preferred-port 8011 --fallback-through 8020
node .omo/evidence/task-10-ice-eduinfo-map-final-improvement/browser-fake-kakao/run-integrated-static-qa.mjs --base-url http://127.0.0.1:8011
```

Stop the server with `Ctrl+C`; it logs `static-server-shutdown` after closing.

## Key And Privacy Modes

- No-key mode: `unified-map.html` still supports search, filters, upload preview, template download, export, and connection controls.
- Static Kakao JavaScript key mode: store only a domain-restricted Kakao JavaScript key in browser `localStorage` for map rendering.
- REST key mode: not implemented in this static app. A Kakao REST key must stay server-side in a future Phase 2 service.
- The Todo 10 QA used fake `window.kakao.maps`; no real Kakao JavaScript key or REST key was used.
- Uploaded custom fields remain browser-local and are not sent to the fake geocoder queue; the queue test sends normalized address strings only.

## Measured QA

- Fixture rows: 1000 total; 975 valid; 925 pre-geocoded; 50 address-only fake-geocoder subset; 25 invalid.
- Browser clustering timing: 179.6 ms from import start to clustered marker readiness on the local QA run.
- Clustered imported pre-geocoded markers: 925.
- Active markers after import: 935, including built-in mappable institutions.
- Screenshots captured at 1280, 768, and 375 px widths.

## Evidence

Primary evidence is under:

`C:\Users\홍주형\OneDrive - 인천광역시교육청\바탕 화면\ice-eduinfo-map.io-main\ice-eduinfo-map.io-main\incheon-edu-map\.omo\evidence\task-10-ice-eduinfo-map-final-improvement`

Essential evidence is mirrored to:

`C:\Users\홍주형\OneDrive - 인천광역시교육청\바탕 화면\ice-eduinfo-map.io-main\.omo\evidence\task-10-ice-eduinfo-map-final-improvement`

## Residual Risk

- Real Kakao tile rendering and domain-allowed JavaScript key behavior were not tested because no real key was provided.
- Node reports `MODULE_TYPELESS_PACKAGE_JSON` warnings for existing ES modules because the top-level package does not declare `"type": "module"`; tests still pass.
- The static app reports address-only rows as non-mappable until a real geocoding flow is explicitly run; Todo 10 verifies they do not receive fake coordinates.
