# Incheon Education Map Design System

## 1. Atmosphere & Identity

The product should feel like an operational Korean education-office map placed on a Miro canvas white workspace: bright, legible, calm, and dense enough for repeated administrative use. It is not a marketing landing page and should not hide the map behind oversized hero copy. The first viewport should expose the map, filters, counts, key status, and data-management actions.

The identity adapts Miro's whiteboard language to public education-office work, with an accent system derived from the Incheon Metropolitan City Office of Education CI (see section 8). Use white canvas, black primary pills, an `ice-blue` identity accent taken from the office symbol's primary wave blue, an `ice-orange` point color taken from the symbol's sun, pastel category surfaces, and compact information panels. The blue accent is an identity marker for the service badge, links, selected-state highlight, and key-status emphasis. The orange point is reserved for the brand mark dot and warning chips. Neither accent is the default background for large page regions.

Static deployment remains the baseline. This design system must not require a build step, private server, external design runtime, or committed Kakao key. Any future private mode or REST geocoding proxy must be documented as a separate mode, not assumed by public static pages.

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

Display font (optional): the office typeface 인천교육힘찬 (`Incheon Edu Himchan`) may be used for the brand title and page header only, never for body, filters, chips, or data rows. If adopted for web, serve a subsetted `woff2` build; do not ship the 5.7MB source TTF. Body text always stays on the Pretendard stack. If the subset step is skipped, keep the brand title on Pretendard 700 — the display font is an enhancement, not a dependency.

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
- `key-prompt`: ice-blue-soft panel with concise Kakao JavaScript key guidance, ice-blue documentation links, and black save action.
- `institution-row`: white row, hairline divider, category chip, office label, coordinate/geocode state.
- `map-popup`: white surface, 8-12px radius, title, type/office chips, address, and row actions.
- `import-preview`: compact table/card hybrid with valid, skipped, duplicate, pre-geocoded, and failed counts.
- `connection-control`: start/end selectors, red/blue line color chips, stroke selector, save/delete/export/import actions.

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
- Missing Kakao key must keep the rest of the UI usable and explain the JavaScript key/domain restriction.
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
