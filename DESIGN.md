# Incheon Education Map Design System

## 1. Atmosphere & Identity

The product should feel like an operational Korean education-office map placed on a Miro canvas white workspace: bright, legible, calm, and dense enough for repeated administrative use. It is not a marketing landing page and should not hide the map behind oversized hero copy. The first viewport should expose the map, filters, counts, key status, and data-management actions.

The identity adapts Miro's whiteboard language to public education-office work, with an accent system derived from the Incheon Metropolitan City Office of Education CI (see section 8). Use white canvas, black primary pills, an `ice-blue` identity accent taken from the office symbol's primary wave blue, an `ice-orange` point color taken from the symbol's sun, pastel category surfaces, and compact information panels. The blue accent is an identity marker for the service badge, links, selected-state highlight, and key-status emphasis. The orange point is reserved for the brand mark dot and warning chips. Neither accent is the default background for large page regions.

Static deployment remains the baseline for page assets. Naver Maps is the default public provider and Kakao Maps remains a temporary fallback during migration. Road-route connections are the only server-assisted public feature: a same-origin `/api/directions` proxy may use deployment secrets to call Naver Directions 5, while browser pages never accept, expose, or store a Directions Client Secret. If that server credential is unavailable, the rest of the site stays usable and the connection control reports a configuration state instead of drawing a straight-line substitute.

The Directions proxy requires a deployment-provided `DIRECTIONS_RATE_LIMITER` binding whose `limit({ key })` state is shared across worker instances and configured for 12 requests per minute. The generated worker fails closed with `503 directions_rate_limit_not_configured` when that distributed binding is absent, so credentials alone can never enable an unmetered paid proxy. It also rejects cross-site browser requests, accepts only endpoints inside the documented greater-Incheon coordinate envelope, and aborts the upstream request after eight seconds.

## 2. Color

Core tokens:

| Token | Value | Use |
| --- | --- | --- |
| `canvas-white` | `#ffffff` | Page background, map-dashboard shell, cards, popovers |
| `ink` | `#1c1c1e` | Primary text and black primary pills |
| `ink-deep` | `#050038` | High-emphasis headings and count values |
| `muted` | `#6b6f7e` | Secondary labels, helper text, empty states |
| `hairline` | `#e0e2e8` | Borders, row dividers, map/sidebar separation |
| `surface` | `#f7f8fa` | Search fields, quiet controls, inactive tabs |
| `ice-blue` | `#0060b0` | Identity accent from the office symbol wave: brand mark, links, focused inputs, selected highlight |
| `ice-blue-pressed` | `#004c8c` | Pressed blue actions |
| `ice-blue-soft` | `#e6f0f9` | Key prompt, selected filter background, informational panels |
| `ice-sky` | `#00b0e0` | Secondary highlight, informational chips (sparing) |
| `ice-green` | `#00a060` | Success: valid key, successful import, geocoded status |
| `ice-lightgreen` | `#80c030` | Data-visualization accent only (sparing) |
| `ice-orange` | `#f08020` | Identity point from the symbol sun: brand mark dot, warning chips |
| `ice-orange-soft` | `#fdeedd` | Warning panel background |
| `danger-soft` | `#fbd4d4` | Error and failed-row backgrounds |

Legacy tokens `yellow-identity` `#ffd02f`, `yellow-soft` `#fff8e0`, `blue-action` `#4262ff`, `blue-pressed` `#2a41b6`, and `success` `#00b473` are deprecated: replace with `ice-blue`, `ice-blue-soft`, `ice-blue`, `ice-blue-pressed`, and `ice-green` respectively during migration.

Pastel category surfaces should make institution classes scannable without turning the app into a one-color theme:

| Category | Surface | Foreground |
| --- | --- | --- |
| Headquarters | `#fff4c4` | `#746019` |
| Support office | `#dde7ff` | `#004c8c` |
| School | `#fde0f0` | `#7a2455` |
| Library | `#c3faf5` | `#187574` |
| Experience site | `#ffe6cd` | `#7a3d00` |
| Imported row | `#f5f3ff` | `#0060b0` |
| Invalid or failed row | `#fbd4d4` | `#600000` |

Migration rule: remove the current dark brown/black page background, teal-heavy badge gradient, and blue-dominant action surfaces from public map views. Blue remains link/action, not the primary brand field.

## 3. Typography

Use a Korean font fallback that works without hosted assets:

```css
font-family: "Pretendard", "Noto Sans KR", "Apple SD Gothic Neo", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
```

Display font (optional, currently removed — 2026-09-15): the office typeface 인천교육힘찬 (`Incheon Edu Himchan`) may be used for the brand title and page header only, never for body, filters, chips, or data rows, **once its distribution license is confirmed**. A subsetted `woff2` build (`assets/fonts/incheon-edu-himchan-display.woff2`, 4,892 bytes) shipped from 2026-07-17 without that confirmation ever being recorded; it and every `@font-face`/`font-family` reference to it were removed on 2026-09-15 pending license verification, and `tools/build-sites-worker.mjs` no longer embeds a font. Do not ship the 5.7MB source TTF even after re-adding it. Body text always stays on the Pretendard stack; the brand title currently renders on Pretendard 700 — the display font is an enhancement, not a dependency, and must not be re-added without a recorded license check.

Typography tokens:

| Token | Size | Weight | Line height | Use |
| --- | --- | --- | --- | --- |
| `title-lg` | `28px` | `700` | `1.25` | Page title inside dashboard header |
| `title-md` | `22px` | `700` | `1.3` | Sidebar panel headings |
| `title-sm` | `18px` | `700` | `1.35` | Popup and section headings |
| `body` | `15px` | `400` | `1.55` | Main copy, row descriptions |
| `body-strong` | `15px` | `600` | `1.45` | Labels, selected filter names |
| `caption` | `13px` | `400` | `1.45` | Metadata, key helper text |
| `micro` | `12px` | `600` | `1.35` | Count chips, status badges |
| `button` | `14px` | `700` | `1.2` | Pill buttons and compact actions |

Map-dashboard density rules: use smaller, stable type in filters, rows, popups, chips, and side panels. Reserve large title sizes for the page header only. Do not use emoji as a visible label substitute; use text labels, CSS marker color, accessible labels, or future icon components.

## 4. Spacing & Layout

Base spacing follows a 4px grid:

| Token | Value | Use |
| --- | --- | --- |
| `space-1` | `4px` | Tight inline gaps, divider offsets |
| `space-2` | `8px` | Chip internal gaps, compact rows |
| `space-3` | `12px` | Button vertical rhythm, grouped controls |
| `space-4` | `16px` | Default panel padding, row spacing |
| `space-5` | `20px` | Header and toolbar gaps |
| `space-6` | `24px` | Major panel padding |
| `space-8` | `32px` | Desktop shell gutters |

The primary layout is a full-height map dashboard:

- Header: 64px desktop, 56px mobile, white canvas, hairline bottom border.
- Toolbar: compact wrap row with search, office/type filters, key status, import/export actions, and selected counts.
- Main area: map takes the largest available region; sidebar is 340-400px on desktop and collapses to a bottom sheet or stacked panel on small screens.
- Sidebar rows: fixed rhythm with 12-16px vertical padding, one primary title line, one metadata line, and optional status chips.
- Map area: no decorative cards around the map. The map is the workspace surface.

Spacing must support dense administrative scanning. Avoid large hero gaps, nested cards, floating decorative sections, and page-length marketing bands inside the tool.

## 5. Components

Buttons and controls:

- `button-primary`: black primary pills using `ink` background, white text, 40-44px height, full radius, 16-20px horizontal padding.
- `button-primary:pressed`: background shifts to `#2c2c34`.
- `button-primary:disabled`: `hairline` background, muted text, no pointer affordance.
- `button-secondary`: white pill, ink text, `hairline` border.
- `button-link`: transparent, ice-blue link text, no filled background.
- `button-icon`: circular 36px desktop or 44px mobile target with visible focus ring and accessible name.
- `search-pill`: `surface` background, 40px minimum height, 8px radius, blue focus border.
- `filter-pill`: white inactive state; black active state; ice-blue-soft selected-group highlight may be used behind a small count chip.

Map and data components:

- `status-chip`: micro text, full radius, category color surface, no emoji prefix.
- `provider-control`: compact Naver/Kakao selector for setup and recovery. Naver is visually recommended and selected by default; the control must never ask for a client secret.
- `key-prompt`: ice-blue-soft panel with provider-aware credential guidance, a registered-domain reminder, and black save action. Naver uses a Maps JavaScript Client ID (`ncpKeyId`); Kakao uses a JavaScript key.
- `institution-row`: white row, hairline divider, category chip, office label, coordinate/geocode state, and optional contact links. Phone and homepage are secondary text actions with explicit labels; missing values leave no empty placeholder.
- `map-popup`: white surface, 8-12px radius, title, type/office chips, address, and row actions.
- `import-preview`: compact table/card hybrid with valid, skipped, duplicate, pre-geocoded, and failed counts.
- `connection-control`: start/end selectors, red/blue line color chips, stroke selector, save/delete/export/import actions, and a text-first road-route state. Saving calculates a Naver Directions 5 driving route, then stores its path, road distance, and estimated duration. Legacy records without a route show `도로 경로 재계산 필요` and are never rendered as straight lines.

Component states must be explicit: default, focus-visible, active/selected, pressed, disabled, loading, empty, success, warning, and error. Loading states may use text and CSS motion, but must not depend on emoji loader icons.

## 6. Motion & Interaction

Motion is functional and brief:

- Control transitions: 120-160ms ease for background, border, color, and opacity.
- Panel open/close: 180-220ms ease-out; do not animate map tiles or marker positions unnecessarily.
- Loading indicators: subtle spinner or progress bar with text status. Keep the no-key path informational and nonfatal.
- Focus-visible: 2px ice-blue ring with 2px offset on buttons, inputs, tabs, rows, and popup actions.
- Pressed state: immediate visual feedback for black primary pills, blue actions, and selectable chips.

Interaction priorities:

- Keyboard can reach search, filters, import, export, key settings, popup actions, and connection-line controls.
- Missing map credential must keep the rest of the UI usable and explain the provider-specific Client ID/JavaScript key and registered-domain restriction.
- Failed geocodes and invalid rows are reported as data states, never placed on fallback coordinates.
- Static pages should load without module bundling and should degrade to readable HTML/CSS when map SDK loading fails.

## 7. Depth & Surface

The app should stay mostly flat:

| Level | Treatment | Use |
| --- | --- | --- |
| `flat` | White surface, no shadow, hairline border | Header, toolbar, sidebar rows |
| `raised` | `0 4px 12px rgba(5, 0, 56, 0.06)` | Dropdowns, small popovers |
| `modal` | `0 16px 48px rgba(5, 0, 56, 0.12)` | Key modal, import modal |
| `map-overlay` | White surface, hairline border, light shadow | Floating map controls and popup cards |

Use rounded corners conservatively: 9999px for pill controls, 8px for inputs and compact surfaces, 12px for popovers, and 16px only for larger panels. Avoid nested cards. Pastel category surfaces can carry visual hierarchy without heavy shadows.

Migration checklist for removing dark/teal/blue/emoji-heavy debt:

- Replace dark page backgrounds with Miro canvas white and `surface` controls.
- Replace teal-to-blue gradient brand badges with an ice-blue identity mark plus ice-orange dot and ink text.
- Replace filled blue primary CTAs with black primary pills; keep ice-blue for links, focus, and secondary actions.
- Replace deprecated yellow tokens (`#ffd02f`, `#fff8e0`) and legacy action blue (`#4262ff`, `#2a41b6`) with the ice-blue token family.
- Replace visible emoji navigation labels such as school/map/key/pin icons with text labels, CSS category chips, or accessible icon components.
- Replace `loader-icon` emoji loading with CSS-only motion and text progress.
- Replace inline dark modal styles with white modal surfaces, ink text, ice-blue-soft key guidance, and black save action.
- Keep public/private deployment scope intact: public static files remain public-safe, private local files and sensitive CSV workflows remain outside public deployment.

## 8. Incheon Education CI Usage

The accent system in section 2 is derived from the Incheon Metropolitan City Office of Education CI assets (symbol wave blue, growth greens, sky blue, sun orange). Because this service is a personal reference tool and not an official office channel (decision D1, 2026-07-05), CI usage follows a "colors yes, marks no" rule:

- **Allowed**: using the CI-derived color tokens (`ice-blue`, `ice-green`, `ice-lightgreen`, `ice-sky`, `ice-orange`) as the app accent system; quoting the education vision slogan "학생성공시대를 여는 인천교육" as plain text near the disclaimer; using the 인천교육힘찬 display typeface under section 3 rules after confirming its distribution license.
- **Not allowed**: placing the office symbol mark, logotype, or symbol-lockup images anywhere in the app; recreating the symbol as an SVG/CSS brand mark; any composition that presents the site as an official office channel. The brand mark stays the NEWSKOOL4D text mark (ink text + ice-orange dot), not the office symbol.
- **Vision purple** `#401080` (from the vision calligraphy) is not an app token; do not introduce it into UI controls.
- CI source assets live outside the repository (`바탕 화면/교육청 관련/`: EPS masters under `CI/`, JPG references under `교육청+ci/`, `교육비전.jpg`, `인천교육힘찬.ttf`). Do not commit these assets to the public repository; only derived color values and a subsetted display font build (if adopted) may ship.
- Reference color values sampled from the symbol artwork: wave blue `#0060b0`, deep green `#00a060`, light green `#80c030`, sky `#00b0e0`, sun orange `#f08020`.

## 9. Civic Atlas 2026 Direction

### Direction statement

The upgraded product is a **luminous civic atlas**, not a generic municipal portal and not a purple SaaS dashboard. The map remains the hero surface. Interfaces float above it like precise cartographic instruments: pearl-white layers, blue-tinted edges, deep-navy typography, restrained orange wayfinding points, and subtle topographic lines. Depth comes from multiple low-opacity blue shadows and borders rather than heavy gray drop shadows.

The single signature moment is the home-page atlas preview: a quiet route trace and layered map field that resolves when the page loads. All other motion must communicate an interaction or state change.

### Added visual tokens

| Token | Value | Use |
| --- | --- | --- |
| `atlas-navy` | `#071c35` | Display headings, command deck emphasis |
| `atlas-blue-700` | `#004f92` | Strong selected state and links |
| `atlas-blue-500` | `#0879d1` | Active controls and focus affordances |
| `atlas-blue-100` | `#dceeff` | Selected surfaces and map halo |
| `atlas-blue-050` | `#f1f8ff` | Quiet atmospheric surface |
| `atlas-pearl` | `rgba(255,255,255,0.88)` | Floating command surfaces |
| `atlas-edge` | `rgba(0,96,176,0.16)` | Glass edge and panel separation |
| `atlas-grid` | `rgba(0,96,176,0.055)` | Topographic/grid atmosphere |
| `shadow-atlas` | `0 22px 60px rgba(0,76,140,.12), 0 4px 16px rgba(5,0,56,.08)` | Hero and large floating surfaces |
| `shadow-command` | `0 12px 32px rgba(0,76,140,.13), inset 0 1px 0 rgba(255,255,255,.92)` | Toolbars and command decks |

### Core primitives

- `atlas-masthead`: 64px desktop / 58px mobile. NEWSKOOL4D text mark, current section, primary route links, and a provider-status button. It uses a translucent pearl surface over a quiet blue atmospheric background.
- `command-deck`: the primary search and filter strip. Controls are grouped by task, not by data type. It may wrap, but its primary search remains the widest control.
- `map-stage`: the largest visual plane. It has a clear title/status rail, provider badge, layer controls, and a strong empty/loading/error surface that never hides the rest of the app.
- `context-rail`: dense list and task detail surface. Rows use one title line, one metadata line, and no more than three visible chips before progressive disclosure.
- `signal-chip`: text-first provider, count, success, warning, and data-quality states. Provider chips use `NAVER` or `KAKAO` text; they do not imitate either company's logo.
- `provider-setup`: provider selector, one credential field, registered-domain reminder, save/retry action, and a local-storage notice. Client secrets are never accepted or stored.
- `school-contact-row`: compact `전화` and `홈페이지` actions under the address. Links use the normal ice-blue focus treatment, keep a 44px mobile target, and open external homepages with `noopener noreferrer`.
- `road-route-status`: an aria-live helper inside `connection-control` with `idle`, `loading`, `ready`, `needs-route`, `configuration-error`, and `upstream-error` states. It displays road distance and estimated duration only after the route response validates.

### Personas and density

1. **Education-office administrator, desktop**: needs dense filtering, counts, imports, exports, and repeat use. Preserve information density and keyboard reachability.
2. **Field staff, mobile**: needs the map first, one-thumb search/filter, location list selection, and a stable bottom context panel. Touch targets are at least 44px.
3. **Low-vision or keyboard user**: needs visible focus, 200% zoom without horizontal page scrolling, semantic labels, live status, and no meaning encoded by color alone.

### Responsive contract

- `>= 1180px`: map and context rail share the viewport; command deck stays horizontal where possible.
- `768-1179px`: context rail narrows, toolbar wraps into two purposeful rows, secondary actions move into a compact action cluster.
- `< 768px`: header links become a horizontally scrollable route strip; sidebar and map stack; map height is at least `48svh`; status and filters remain above the list.
- At 200% browser zoom, controls wrap rather than clip and Korean labels must not produce single-character orphan lines.

### Provider interaction contract

- Default provider: `naver` when no prior preference exists.
- Fallback provider: `kakao`, available from the setup surface and status button.
- A provider change is explicit and followed by a page reload so that only one vendor SDK owns the map canvas.
- Existing Kakao keys are preserved under their legacy storage key; Naver Client IDs use a separate storage key.
- The app exposes provider-neutral map behavior to page code. Vendor names may appear only in the adapter, setup copy, provider badge, and provider-specific failure messages.
- When Naver place search cannot provide a Kakao-equivalent POI result, geocoding is used as the documented fallback and the UI labels the result as an address search.

### States and accessibility

- `loading`: compact progress line and explanatory text; never an emoji spinner.
- `empty`: actionable next step with available filters and data still visible.
- `error`: provider name, likely credential/domain cause, retry and provider-switch path.
- `ready`: provider badge plus mapped/invalid counts; credential values are never displayed.
- Motion uses 140ms for controls and 220ms for panels. Under `prefers-reduced-motion: reduce`, route drawing, panel transitions, and smooth scrolling are disabled.

### Accepted migration debt

- Naver runs as the default provider. Kakao remains available until all three public map pages pass provider-parity and visual QA.
- Naver marker clustering may temporarily degrade to individual markers if the optional cluster utility is unavailable; the status text must say `마커`, never falsely claim `클러스터`.
- Private local-only pages and ignored business files are outside this public redesign and must not be bundled or published.
