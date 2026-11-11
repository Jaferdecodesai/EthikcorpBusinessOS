# Ethikcorp BusinessOS — Premium dashboard redesign: build spec

**For:** the coding agent (handed over by the AqionLLM Business Brain bot) · **Requested by:** Jafer Mohammed · **Date:** 11 Nov 2026
**Scope:** the CEO BusinessBrain dashboard, one department Businessbot page, and the BusinessBrain PM pipeline and data-quality page. Each has rules for desktop (1440), laptop (1280) and mobile (390).
**Reference mockup (built from this spec):** `/workspace/figma-brief/redesign/ceo-dashboard.html` → `ceo-desktop-1440.png`, `ceo-laptop-1280.png`, `ceo-mobile-390.png`, `preview.jpg`. The generator and CSS are in `redesign/_build/` (`styles.css` holds every token below as working CSS).
**Supersedes:** the sidebar, chat-dock placement and categorical palette in `/workspace/critique/critique-spec.md`. Its other rules (number formatting, states, no line/area charts, neutral badges) still apply unless this file says otherwise.

**Hard rules (do not break):**
1. The only chart types are KPI tiles, bar or column charts (including a bullet bar with a target tick) and donut or pie charts, plus tables. Don't use line, area, sparkline, gauge, flow or Sankey charts, or 3D.
2. Motion is limited to smooth data transitions (§7). Don't use bounce, count-up tickers, looping animation or parallax.
3. Orange (`#C25400`) appears **only** on a KPI tile whose KPI is below target. Below-target bars and rows elsewhere use a text marker ("▼ Below target") and stay in their data colour.
4. Chat is a compact dock fixed at the **bottom**. It never covers content (§5.7).
5. The sidebar is the **old design, unchanged** (§4).
6. Text never overflows its box. Padding is equal on all four sides of every box. Cards in the same row are the same height.

---

## 1. What changes vs the current build (from the 3 screenshots)

| Current (`01M74…WNZ7…`, `…QXJZN…`, `…ZK7EF…`) | New |
|---|---|
| "AED 5.17M" in the donut centre is ~36px and runs past the ring into the slices | The centre label sits in a **116px safe box** inside a 140px hole. Font steps down 24→16px to fit (§5.4); measured value width is 64.5px at 1440 |
| The donut legend is crammed into ~90px to the right of the ring, and names wrap 4–5 lines | Legend sits below the ring in a 4-column card, as a table: swatch · name · AED · share. Rows are at least 32px. Names are shortened, with the full name in a tooltip |
| The chat panel takes ~40% of the viewport and pushes the monthly chart off-screen | A 64px collapsed dock, max width 880px, floating 16px above the bottom. The page reserves its height (§5.7) |
| Below-target bars are orange, and so are the monthly columns for every month | Bars stay blue or green. A "▼ Below target" text marker and target tick/line carry the status. Orange is used only on the Utilisation KPI tile |
| Orange appears on the Utilisation tile, on bars, on months and on department rows | Orange appears on the KPI tile only (left 3px rule, bullet fill, delta text, badge) |
| Sidebar changed to a dark grey active item with no lime marker | The old sidebar is restored: sky-blue pill, lime "EC" square, lime 2px marker (§4) |
| Uneven card heights, misaligned axis labels, and the bar value column collides with the chart | 12-column grid. Each row is stretched to equal height. Value labels sit in a reserved 56px gutter |

---

## 2. Design tokens

### 2.1 Spacing: 8px scale (4px half-step only for icon gaps and badge padding)

`4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64` → `--sp-1 … --sp-16`.

| Use | Desktop / laptop | Mobile |
|---|---|---|
| Chart / table card padding (all 4 sides) | **24px** | **16px** |
| KPI tile padding (all 4 sides) | **20px** | **16px** |
| Card header → body gap | 16px | 12px |
| Card body → footer gap | 16px | 12px |
| Gap between rows of cards | = gutter | = gutter |
| Page header → banner → KPI row | 16px · 24px | 12px · 16px |
| Section title (H2) → cards | 24px (grid gap) | 12px |
| Minimum distance from text to any box edge | 12px (inside chips/badges: 8–10px horizontal) | same |

**Equal padding rule.** Text inside a box is centred in its block axis, and the padding is the same on all four sides. Never put fixed `height` on a text container. Use `min-height` plus padding. Single-line controls (buttons, chips, inputs, badges) use a fixed height with `align-items:center` and symmetric horizontal padding.

### 2.2 Grid per breakpoint

The sidebar is 240px wide, fixed. The workspace is the viewport minus 240.

| Breakpoint | Columns | Gutter | Outer margin | Content width | Notes |
|---|---|---|---|---|---|
| Desktop ≥ 1360 (design at **1440**) | 12 | **24** | **32** | 1136px at 1440 (col ≈ 72.7) | max content 1600, centred |
| Laptop 1024–1359 (design at **1280**) | 12 | **20** | **24** | 992px at 1280 | tables go 12-wide (stack) |
| Tablet 768–1023 | 12 | 20 | 24 | — | KPI 2-up, all charts 12-wide |
| Mobile < 768 (design at **390**) | 4 | **12** | **16** | 358px | sidebar becomes a drawer |

### 2.3 Typography

**Families:** `Inter` (400/500/600; variable font OK) → `"Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif`. Use mono only for the sidebar's "Built by Aqionlabs.ai" line: `"JetBrains Mono","IBM Plex Mono",ui-monospace,monospace`.
**All figures** (KPIs, axes, data labels, tables, legend, chat numbers): `font-variant-numeric: tabular-nums lining-nums;`.

| Role | Size / line-height | Weight | Colour | Mobile |
|---|---|---|---|---|
| H1 page title | 28 / 36, tracking −0.01em | 600 | text-1 | 24 / 32 |
| H2 section | 20 / 28 | 600 | text-1 | 18 / 26 |
| H3 card title | 15 / 22 | 600 | text-1 | 15 / 22, may wrap to 2 lines |
| Body | 14 / 20 | 400 | text-1 | 14 / 20 |
| Card meta (period, unit) | 12 / 16 | 400 | text-2 | same |
| KPI label | 13 / 16 | 600 | text-2 | 13 / 16 |
| KPI value | **32 / 40**, tracking −0.01em | 600 | text-1 | 22 / 28 |
| KPI unit prefix ("AED") | 16 / 24 | 500 | text-2 | 13 |
| KPI delta / target | 12 / 16 | 500 / 400 | good / below / text-2 | 11 / 16 (target hidden) |
| Axis ticks | 12 / 16 | 400 | text-2 | 12 |
| Bar / column value label | 12 / 16–20 | 500 | text-1 | 12 |
| Table header | 12 / 16 | 600 | text-2 | 12 |
| Table cell | 13 / 16 (secondary line 12/16 text-2) | 400 | text-1 | 13 |
| Legend row | 13 / 16 (header 11/14 500 text-2) | 400 / 500 for values | | |
| Donut centre value | 24 / 30, steps down to 16 to fit (§5.4) | 600 | text-1 | 22 / 28 |
| Donut centre currency / label | 12 / 16 · 11 / 14 | 500 / 400 | text-2 | same |
| Badge | 12 / 16 | 500 | per variant | same |
| Button | 14 / 20 | 500 | | same |

The minimum text size is 11px (legend header and donut sub-label only). Everything else is 12px or more. Use sentence case everywhere. No uppercase eyebrows.

### 2.4 Radius, borders, elevation

| Token | Value | Use |
|---|---|---|
| `--r-sm` | 4px | bar ends (3px value end, 0 at baseline), swatches 2px |
| `--r-md` | 8px | buttons, inputs, selects, banner |
| `--r-lg` | **12px** | cards, KPI tiles |
| dock | 16px (14px mobile) | chat dock |
| `--r-pill` | 999px | badges and chips only |
| Card border | 1px `#E3E7EB` | all cards |
| Table divider | 1px `#EEF1F4` rows, 1px `#E3E7EB` under the header | |
| `--shadow-1` (rest) | `0 1px 2px rgba(16,24,40,.04), 0 1px 3px rgba(16,24,40,.06)` | cards |
| `--shadow-2` (hover, clickable cards) | `0 2px 4px rgba(16,24,40,.06), 0 8px 16px rgba(16,24,40,.06)` | KPI hover |
| `--shadow-float` | `0 8px 24px rgba(16,24,40,.12), 0 2px 6px rgba(16,24,40,.06)` | dock, tooltips, popovers |
| Focus ring | 2px `#1F5FBF`, offset 2px | every focusable element |

### 2.5 Colour: workspace (white) and data

**Surfaces and text**

| Token | Hex | Contrast on white |
|---|---|---|
| bg-app | `#F5F7F9` | — |
| surface | `#FFFFFF` | — |
| surface-sunken (table header) | `#F8FAFB` | — |
| text-1 | `#1A1F24` | 16.60:1 |
| text-2 | `#5B6670` | 5.87:1 (5.46 on bg-app) |
| text-3 (disabled, decorative) | `#8A949E` | 3.08:1 (disabled only) |
| border | `#E3E7EB` | decorative |
| border-strong (inputs, secondary buttons) | `#C3CBD3` | 1.64:1 — inputs also carry a label |
| divider | `#EEF1F4` | decorative |
| **gridline** | `#E6EAEE` | 1.21:1, intentionally faint |
| **axis / zero baseline** | `#C3CBD3` | 1.64:1 |
| primary (buttons, links) | `#0B5CAD`, hover `#08467F` | 6.67:1; white on it 6.67:1 |
| info banner bg | `#E8F1FB` | text-1 on it ≥ 13:1 |
| good text / bg | `#1E7B45` / `#E8F5EC` | 4.71:1 on its bg |
| **below-target (KPI only)** | `#C25400` | 4.60:1 on white; white on it 4.60:1 |

**Categorical data palette (ordered, maximum 5 plus "Other").** Every colour is ≥ 3:1 against white, so marks pass WCAG 1.4.11 without outlines. Adjacent slices still get 2px white separators.

| # | Token | Hex | vs white | Use |
|---|---|---|---|---|
| 1 | `--cat-1` blue | `#1F5FBF` | 6.09:1 | default single-series colour (revenue, pipeline) |
| 2 | `--cat-2` green | `#2B8A5A` | 4.30:1 | second series; single-series "people/utilisation" charts |
| 3 | `--cat-3` navy | `#0E3A75` | 11.17:1 | |
| 4 | `--cat-4` forest | `#14663F` | 7.00:1 | |
| 5 | `--cat-5` sky | `#4C8DD6` | 3.45:1 | |
| 6 | `--cat-other` | `#8A949E` | 3.08:1 | "Other", always last |

Order matters. Blue and green alternate so neighbouring slices differ in hue, not only in lightness. **No orange, lime or red in data marks.**

**Sequential scales** (for intensity or heat, light → dark): blue `#E8F1FB · #C4DAF3 · #8DB8E8 · #4C8DD6 · #1F5FBF · #0E3A75`; green `#E6F4EC · #BFE3CC · #7CC39A · #2B8A5A · #14663F · #0B4229`. The first two steps are fills only. Never put text-2 on them without checking contrast.

**Labels on marks.** White text inside `cat-1` (6.09:1) or `cat-3` (11.17:1) passes. Inside `cat-2` it is 4.30:1, which fails for 12px. Rule: value labels always go **outside** the bar end in text-1. The only exception is a long `cat-1` or `cat-3` bar where the label fits with 8px spare.

### 2.6 CSS `:root`

```css
:root{
  /* type */
  --font-sans:"Inter","Segoe UI",system-ui,-apple-system,Roboto,Arial,sans-serif;
  --font-mono:"JetBrains Mono","IBM Plex Mono",ui-monospace,SFMono-Regular,Menlo,monospace;
  /* spacing */
  --sp-1:4px;--sp-2:8px;--sp-3:12px;--sp-4:16px;--sp-5:20px;--sp-6:24px;--sp-8:32px;--sp-10:40px;--sp-12:48px;--sp-16:64px;
  --card-pad:24px;--kpi-pad:20px;--gutter:24px;--margin:32px;
  /* radius */
  --r-sm:4px;--r-md:8px;--r-lg:12px;--r-pill:999px;
  /* surfaces + text */
  --bg-app:#F5F7F9;--surface:#FFFFFF;--surface-sunken:#F8FAFB;
  --text-1:#1A1F24;--text-2:#5B6670;--text-3:#8A949E;
  --border:#E3E7EB;--border-strong:#C3CBD3;--divider:#EEF1F4;--grid:#E6EAEE;--axis:#C3CBD3;
  --primary:#0B5CAD;--primary-hover:#08467F;--focus:#1F5FBF;
  --info-bg:#E8F1FB;--good:#1E7B45;--good-bg:#E8F5EC;--below:#C25400;
  /* data */
  --cat-1:#1F5FBF;--cat-2:#2B8A5A;--cat-3:#0E3A75;--cat-4:#14663F;--cat-5:#4C8DD6;--cat-other:#8A949E;
  /* sidebar (old design, sampled — see §4) */
  --sb-w:240px;--sb-bg:#040509;--sb-title:#E9EBF1;--sb-sub:#949598;--sb-item:#5C5D63;
  --sb-active-bg:#49A2E6;--sb-active-text:#00254E;--sb-logo-bg:#DDFB5D;--sb-logo-text:#0A0F00;
  --sb-marker:#DDFB5D;--sb-divider:#101116;--sb-foot:#A0A2A6;
  /* elevation */
  --shadow-1:0 1px 2px rgba(16,24,40,.04),0 1px 3px rgba(16,24,40,.06);
  --shadow-2:0 2px 4px rgba(16,24,40,.06),0 8px 16px rgba(16,24,40,.06);
  --shadow-float:0 8px 24px rgba(16,24,40,.12),0 2px 6px rgba(16,24,40,.06);
  /* layout */
  --appbar-h:56px;--dock-h:64px;--dock-gap:16px;--dock-max:880px;
  /* motion */
  --ease:cubic-bezier(.2,0,0,1);--dur:250ms;
}
@media (max-width:1359px){:root{--margin:24px;--gutter:20px}}
@media (max-width:767px){:root{--margin:16px;--gutter:12px;--card-pad:16px;--kpi-pad:16px;--dock-h:60px}}
@media (prefers-reduced-motion:reduce){*{transition-duration:0ms!important;animation:none!important}}
.num,[data-num]{font-variant-numeric:tabular-nums lining-nums}
```

### 2.7 Tailwind theme extension

```js
// tailwind.config.js → theme.extend
module.exports = { theme: { extend: {
  fontFamily: { sans: ['Inter','Segoe UI','system-ui','-apple-system','Roboto','Arial','sans-serif'],
                mono: ['JetBrains Mono','IBM Plex Mono','ui-monospace','monospace'] },
  colors: {
    app: '#F5F7F9', surface: { DEFAULT:'#FFFFFF', sunken:'#F8FAFB' },
    ink: { 1:'#1A1F24', 2:'#5B6670', 3:'#8A949E' },
    line: { DEFAULT:'#E3E7EB', strong:'#C3CBD3', divider:'#EEF1F4', grid:'#E6EAEE', axis:'#C3CBD3' },
    primary: { DEFAULT:'#0B5CAD', hover:'#08467F' }, focus:'#1F5FBF',
    info: { bg:'#E8F1FB' }, good: { DEFAULT:'#1E7B45', bg:'#E8F5EC' }, below:'#C25400',
    cat: { 1:'#1F5FBF', 2:'#2B8A5A', 3:'#0E3A75', 4:'#14663F', 5:'#4C8DD6', other:'#8A949E' },
    seqblue: { 50:'#E8F1FB',100:'#C4DAF3',200:'#8DB8E8',400:'#4C8DD6',600:'#1F5FBF',800:'#0E3A75' },
    seqgreen:{ 50:'#E6F4EC',100:'#BFE3CC',200:'#7CC39A',400:'#2B8A5A',600:'#14663F',800:'#0B4229' },
    sb: { bg:'#040509', title:'#E9EBF1', sub:'#949598', item:'#5C5D63', active:'#49A2E6',
          activeText:'#00254E', logo:'#DDFB5D', logoText:'#0A0F00', divider:'#101116', foot:'#A0A2A6' },
  },
  spacing: { 4.5:'18px', 13:'52px', 14:'56px', 15:'60px', 60:'240px' },   // default Tailwind 4px scale covers the rest
  borderRadius: { sm:'4px', md:'8px', lg:'12px', dock:'16px' },
  boxShadow: { card:'0 1px 2px rgba(16,24,40,.04),0 1px 3px rgba(16,24,40,.06)',
               hover:'0 2px 4px rgba(16,24,40,.06),0 8px 16px rgba(16,24,40,.06)',
               float:'0 8px 24px rgba(16,24,40,.12),0 2px 6px rgba(16,24,40,.06)' },
  fontSize: {
    h1:['28px',{lineHeight:'36px',fontWeight:'600',letterSpacing:'-0.01em'}], h2:['20px',{lineHeight:'28px',fontWeight:'600'}],
    h3:['15px',{lineHeight:'22px',fontWeight:'600'}], body:['14px','20px'], cell:['13px','16px'], meta:['12px','16px'],
    kpi:['32px',{lineHeight:'40px',fontWeight:'600',letterSpacing:'-0.01em'}], 'kpi-m':['22px','28px'], micro:['11px','14px'] },
  transitionTimingFunction: { data:'cubic-bezier(.2,0,0,1)' },
  transitionDuration: { data:'250ms' },
  screens: { laptop:'1024px', desktop:'1360px' },
}}}
```

---

## 3. Layout shell

- **App bar:** sticky, 56px tall, opaque white with a 1px `border` bottom. Horizontal padding = `--margin`. Left: breadcrumb "Ethikcorp BusinessOS / **Business overview**" (13/20; root in text-2, current page 600 text-1). Right: neutral "Prototype" badge and a 32px "CEO" avatar. Don't use coloured warning pills (critique F9).
- **Page:** `padding: 32px var(--margin) calc(var(--dock-h) + var(--dock-gap) + 32px)`, `max-width:1600px; margin:0 auto`.
- **Page header:** H1, a 4px gap, then the one-line description (text-2). On the right, aligned to the bottom: "Period" + a 36px select, then the meta "AED · Updated 11 Nov 2026, 11:30 (UTC+4)". Then the 40px info banner with a 24px gap below it.
- **Grid:** `display:grid; grid-template-columns:repeat(12,minmax(0,1fr)); gap:var(--gutter); align-items:stretch`. Every card is `display:flex; flex-direction:column` so footers pin to the bottom and rows stay the same height.

---

## 4. Sidebar: the OLD design, kept exactly

All values were sampled with PIL from `old-sidebar-live.jpg` (1320×926).
**Scale note:** the capture is scaled by about **0.9**. Three pieces of evidence: the sidebar measures 214px in the capture against 240px in the current build; the logo measures 27px against 30px; and the pill measures 194px wide against the 216px item width in the current build. That fits a 90% browser zoom. The **CSS px** column is the capture value ÷ 0.9, rounded to the whole pixel, and that is what to build. Colours are not affected by scale. JPEG noise is ±1–2 per channel.

| Element | Capture px | **Build (CSS px)** | Colour (sampled) |
|---|---|---|---|
| Sidebar width | 214 (x 48→261) | **240** | bg **`#040509`**. The pure-black strip left of x=48 is the OS window frame, not the sidebar |
| Right edge | no border; content starts directly | none | — |
| Brand block | logo top 16, left 17 | padding **18px 12px 0 20px**, block height 66 | — |
| Logo "EC" square | 27×27, corner ≈ 6 | **30×30, radius 7** | fill **`#DDFB5D`**; "EC" 11px/700 near-black **`#0A0F00`** (16.7:1) |
| Logo → title gap | 10 | **12** | — |
| Title "Ethikcorp BusinessOS" | glyph span 11 | **13/16, 700** | **`#E9EBF1`** (17.1:1) |
| Subtitle "Built by Aqionlabs.ai" | glyph span 9, monospaced, tracked | **10/12 mono, letter-spacing .06em**, 4px below title | **`#949598`** (6.8:1) |
| Divider under brand | y≈61, 1px | 1px, then a 10px gap before the nav | **`#101116`** |
| Nav inset (left/right) | 10 / 10 | **12 / 12** (item width 216) | — |
| Nav item | height 31, text x+10 | **height 34, padding 0 11px, gap 2px (36px pitch)** | — |
| Nav text | cap height 9 | **13/16, 500** (active 600), single line, ellipsis | inactive **`#5C5D63`** |
| **Active item** | pill 194×31, corner ≈ 6 | **216×34, radius 7** | fill **`#49A2E6`**; text **`#00254E`** (5.5:1) |
| Lime active marker | 2px wide, 16–17px tall, at the sidebar's left edge, vertically centred on the pill | **2×18px, left:0 of the sidebar, top 8px within the item** | **`#DDFB5D`** |
| Item order | BusinessBrain PM · Ethikcorp BusinessBrain · Ethikcorp Businessbots | same, no icons, no coloured dots | — |
| Footer | 1px divider at y≈873; 2 lines of text, left 17 | divider `#131418`, padding **16px 20px 18px**, 11/14 | **`#A0A2A6`** (8.0:1) |
| Footer copy | "Customer view. Locked areas open from live build progress." | keep the build's current role copy | — |

**Accessibility flag (not changed, because you asked for an exact match):** inactive items `#5C5D63` on `#040509` measure **3.11:1**. That is below the 4.5:1 AA minimum for 13px text. If Jafer approves a deviation, change only that token, to `#8E9096` (≈ 6.4:1). Hover already uses `#8E9096` in the mockup.
**Mobile:** the sidebar becomes a 280px left drawer with the same tokens, opened from a 44×44 menu button in the app bar, with a scrim at `rgba(4,5,9,.5)`.

---

## 5. Components

### 5.1 KPI tile

```
┌──────────────────────────────────────┐ card, padding 20 all sides, radius 12, min-height 168 (rows stretch)
│ Revenue                         (i)  │ label 13/600 text-2 · 16px info icon (definition tooltip)
│ AED 5.17M                            │ 12px gap · unit 16/500 text-2 + value 32/40 600 tabular
│ ▲ 22.6% vs May 2026                  │ 4px gap · delta 12/500 (good / text-2 / below)
│                                      │ 12px gap (min) then flexible space
│ ███████████████████████░░░░|░░       │ bullet bar 6px, radius 3; track #EEF1F4; scale 0–125% of target; target tick 2×12 text-1 at 80%
│ Target AED 5.00M · 103%  [✓ On target]│ 12px gap · footer row (wraps if narrow): target 12/400 text-2 + badge 22px
└──────────────────────────────────────┘
```

- **Data (CEO):** Revenue AED 5.17M, ▲ 22.6% vs May 2026, target AED 5.00M, 103%, on target · Utilisation 77.3%, Oct 2026 ▼ 2.7 pts vs target, target 80.0%, 97%, **below target** · Weighted pipeline AED 2.40M, 8 open deals, target AED 2.20M, 109% · Win rate 78.6%, TTM closed deals, target 70.0%, 112%.
- **Below-target state (the ONLY orange):** 3px inset left rule `#C25400`, delta text `#C25400`, bullet fill `#C25400`, and a solid "▼ Below target" badge (white on `#C25400`, 4.60:1). The rest of the tile stays white.
- The value never wraps. Use the compact format (`AED 5.17M`) with the full value in `title` and `aria-label`.
- The footer row uses `flex-wrap:wrap`, so the badge drops to its own line at narrow widths instead of truncating the target text. That is why tiles are 214px tall in the mockup at 1440 and 1280. All four always match.
- Hover: `--shadow-2`. The whole tile is a button that filters the dashboard. Focus uses the focus ring.
- Mobile: 2×2 grid, value 22/28, target line hidden (shown in the tooltip), min-height 180.

### 5.2 Chart card (shared shell)

- Padding 24 (16 mobile) on all sides, radius 12, 1px border, `--shadow-1`.
- **Header** (min-height 32, 16px below): H3 title (names the measure only, e.g. "Revenue by service line") · meta (period · unit, e.g. "May–Oct 2026 · AED", text-2, takes the free space with ellipsis) · neutral "Sample" badge on the right. On mobile the title wraps to its own line.
- **Footer** (pinned to the bottom with `margin-top:auto`, 16px above): tertiary "View as table" on the left, and the sort note or inline legend on the right.
- Row heights in the mockup: row 2 is **520** (bars + donut) and row 3 is **452** (columns + utilisation). Implement these as `min-height` on the cards, and let the grid stretch them.

### 5.3 Bar (horizontal) and column (vertical) charts

Sources §9: Carbon axes, Tableau and Power BI.

| Property | Horizontal bar | Column |
|---|---|---|
| Category label column | 220px desktop / 190px laptop. Label 13/16 text-1, clamped to 2 lines, full name in a tooltip, 16px right padding | x labels 12/16 text-2, 8px below the axis |
| Bar thickness | **20px** (16px in compact lists of more than 7 rows); row min-height 44 (36 compact) → bar ≈ 45% of the band | width **56% of the band, max 48px** (band gap ≈ 0.44) |
| Corner | 3px on the value end, 0 at the baseline | 3px top, 0 bottom |
| Value axis | starts at **0**, always. 4–5 even ticks ("0 · 450K · 900K · 1.35M · 1.80M") placed **above** the plot | left, 5 ticks ("0 · 300K · 600K · 900K · 1.20M"), 8px from the plot |
| Gridlines | vertical only, 1px `#E6EAEE`; the zero line is 1px `#C3CBD3` | horizontal only, same colours |
| Value labels | always on, 12/500 text-1, **8px after the bar end**, inside a reserved **56px right gutter** so they never collide with the frame | 12/500 text-1, 6px above the column |
| Sort | descending by value; "Other" last | chronological (time only) |
| Max categories | 10 (top 9 + Other) | 12 months |
| Target | per-row tick 2×24px text-1 at the target value; when the bar is below target, a "▼ Below target" marker in 12/500 text-2 next to the label | 1.5px dashed text-1 line across the plot. Its label "Target 800K" sits in a **76px reserved gutter right of the plot** (mobile: hidden, shown in the footer legend "Target AED 800K") |
| Colour | single series `cat-1` (revenue) or `cat-2` (utilisation). Status is never shown by bar colour | `cat-1` |

**Utilisation by department** puts values in a fixed right-aligned 56px column (not trailing the bar), so they never collide with the target tick.

### 5.4 Donut (revenue mix): the overflow fix

Sources §9: Carbon simple charts and legends, Tremor DonutChart.

**Geometry (desktop and laptop):** outer diameter **184px** · ring thickness **22px** (12% of the diameter) · inner diameter **140px** (inner radius = 76% of outer) · 2px white separators between slices · start at 12 o'clock, clockwise, sorted descending, "Other" last · maximum 5 slices + Other.
**Mobile:** outer 168 · ring 20 · inner 128.

**Centre label: fit rules (this is the fix):**
1. Safe box = inner diameter − 2 × 12px padding = **116px** wide (104 on mobile), centred, 3 lines max. Nothing in it may exceed this width.
2. Stack: currency "AED" 12/16 500 text-2 → value **24/30 600 tabular** → caption "Total revenue" 11/14 text-2. The currency sits on its own line, so the value only has to fit "5.17M" (measured **64.5px** at 24px, well inside 116).
3. Fit algorithm (run on render and on resize; see the `<script>` in the mockup): while `value.scrollWidth > safeBox.clientWidth` and font-size > 16px, reduce the size by 2px. If it still doesn't fit at 16px, re-abbreviate with fewer decimals (`5.17M → 5.2M → 5M`). Never let it overflow, never shrink below 16px, and never let it touch the ring.
4. The full value "AED 5,170,000" goes in `aria-label` and the tooltip.

**Legend:**
- **Placement:** to the **right** of the ring when the card's inner width is **≥ 560px** (ring left, legend fills the remainder, 24px gap, vertically centred). **Below** the ring otherwise; this applies to the 4-column card at 1440 and 1280 and to mobile, with a 20px gap.
- It is a mini table: a header row (24px, 11/14 500 text-2: "Service line · AED · Share"), then rows of **min-height 32px** with 1px `#EEF1F4` dividers. Grid columns: `10px | minmax(0,1fr) | 56px | 40px`, 10px column gap. The swatch is 10×10 with radius 2. The name is 13/16, one line with ellipsis (short names: "Transformation Consulting", "AI-Enabled Transformation", "Corporate Training", "AI Agents for Workflow", "Leadership & Culture", "Other"), with the full name in `title`. Value is 13/500, tabular, right-aligned. Share is 13/500 text-2, right-aligned.
- Hovering a legend row dims the other slices to 30% opacity (Carbon). Clicking isolates that slice.
- **Data:** 1.60M 31% · 943K 18% · 816K 16% · 772K 15% · 713K 14% · Other (Gamification) 322K 6%.

### 5.5 Data table

Sources §9: Carbon data table, Fiori responsive table.

| Property | Spec |
|---|---|
| Header row | **40px**, sticky (`position:sticky; top:0` inside the scroll container), bg `#F8FAFB`, 12/16 600 text-2, 1px `#E3E7EB` bottom border, one line with ellipsis |
| Body row | **48px** single-line; **56px** when a cell has two lines (client + service line, or wrapped client name). Every table in the same card row uses the same row height |
| Cell padding | 8px horizontal; the first and last cells use the card padding (24 / 16), so the text lines up with the card title |
| Zebra | **No.** Use 1px `#EEF1F4` row dividers, with row hover `#F5F8FC` |
| Alignment | text left; **numbers right, tabular**; header alignment matches its column; status badges left |
| Units | in the card meta ("AED"), not in each cell. Headers are short ("Value", "Weighted", "Revenue") |
| Sorting | click the header. Show `aria-sort` and a ↓/↑ in `primary` only on the active column. The default sort is shown (Revenue ↓, Weighted ↓) |
| Truncation | names clamp to 2 lines (or 1 line + an ellipsis line), full text in `title`. Numbers never truncate. Columns are sized with `table-layout:fixed` and percentage widths |
| Pagination | footer row 32px controls: "1–7 of 16" (12/16 text-2) on the left, and 32×32 prev/next icon buttons on the right. Page size is 7 on the dashboard. The control height follows the row size (Carbon) |
| Overflow | the table scrolls horizontally inside the card (`.tbl-wrap{margin:0 -card-pad; overflow:auto}`). The page never scrolls sideways |

- **Top clients:** Client · service line (52%) | Status (20%, badge "Active" success / "Completed" neutral) | Revenue ↓ (28%). The data comes from `clients.csv` (`revenue_recognized_ttm_aed`), sorted descending.
- **Open pipeline:** Client (32%, 2-line clamp) | Stage (18%) | Value (18%) | Prob. (12%) | Weighted ↓ (20%), from `sales-pipeline.csv` open stages. The weighted total is AED 2,397,500 and is shown in the header meta. **Mobile:** hide Value and Prob.; Client 40 / Stage 30 / Weighted 30.
- At 1440, the two tables sit side by side (6+6). **Below 1360 they stack** (12 each).

### 5.6 Revenue-fix card

- 3 columns each (4 across) on desktop and laptop, 12 / 4 (full width) on mobile. Padding 24, min-height 188, equal heights.
- Stack: title 13/600 text-2 → 8px → value "AED" 14/500 text-2 + figure 24/32 600 tabular → 8px → one-line reason 13/18 text-2 (max 2 lines) → `margin-top:auto` secondary button (32px, one per card).
- Content: Close weighted pipeline **AED 2,397,500** ("8 open deals, probability-weighted.", Review deals) · Rescue low-probability deals **AED 561,500** ("Deals below 40% win probability.", See deals) · Convert unbilled hours **AED 816,080** ("October hours worked but not billed.", Open timesheets) · Win back closed-lost accounts **AED 1,740,000** ("3 lost deals; a ceiling, not a forecast.", View accounts).
- Section title above the cards: H2 "Where to find AED 1M more" + meta "Revenue fixes from the indexed tables" (stacked on mobile).
- These are neutral cards. Don't use orange: they are opportunities, not below-target KPIs.

### 5.7 Chat dock (bottom, compact)

| State | Desktop / laptop | Mobile |
|---|---|---|
| Position | `position:fixed; bottom:16px`, horizontally centred **in the workspace** (excluding the 240px sidebar), `width:min(880px, workspace − 2×margin)` | `left:8px; right:8px; bottom:calc(8px + env(safe-area-inset-bottom))` |
| **Collapsed** (default) | **64px**: padding 12 all sides, then a 28px lime "EC" chip · 40px input (radius 8, border-strong, placeholder "Ask about revenue, pipeline or utilisation") · 40px primary "Ask" · 40×40 expand icon button. Radius 16, `--shadow-float`, 1px border | **60px**, same contents, padding 10, radius 14 |
| Focused | suggestion chips appear **above** the input inside the dock (32px chips, 8px gap, wrap). Max 3: "Revenue by service line, last 6 months" · "Department utilisation" · "Where can we make AED 1M more?" | chips scroll horizontally on one line (no wrapping to 3 rows) |
| **Expanded** | grows upward to `min(440px, 50vh)`: header (BusinessBrain · New conversation · collapse), message list (14/20, max 5 formatted bullets per answer, "How this answer was produced" disclosure closed by default), chips, input. It keeps the same width and bottom offset | bottom sheet, `88vh`, drag handle, page scroll locked |
| Space reservation | page `padding-bottom = var(--dock-h) + 16px + 32px`. When expanded, a ResizeObserver writes the dock's live height into `--dock-h`, so the page padding grows and the last row of cards is never covered. Scrolling to the highlighted card uses `scroll-margin-bottom: calc(var(--dock-h) + 32px)` | same, plus `env(safe-area-inset-bottom)` |
| Never | full-width bars, a separate "Show chat" pill, or covering KPI tiles or chart footers | |

**Chat → chart update flow:** answer → the affected card updates in place (§7) → it scrolls into view above the dock → a 2px `#1F5FBF` outline fades out over 1.5s → the message ends with "Updated: Utilisation · October 2026" (link) plus "Undo".

### 5.8 Badges, buttons, banner

These follow critique-spec §3.8: neutral `#EEF1F4`/`#3D4751` · success `#E8F5EC`/`#1E7B45` · below target solid `#C25400`/white (KPI tiles only) · heights 22 (sm) / 24 · radius 999 · 12/16 500. Buttons are 36px (32 compact, 40 in the dock), radius 8: primary `#0B5CAD`, secondary white with a `#C3CBD3` border, tertiary text `#0B5CAD`. The banner is 40px, radius 8, `#E8F1FB`, with a 16px info dot and a "Dismiss" tertiary button.

---

## 6. Screens

### 6.1 CEO BusinessBrain dashboard ("Business overview")

Order and spans (desktop 1440 / laptop 1280 / mobile 390):

| # | Block | 1440 | 1280 | 390 | Height |
|---|---|---|---|---|---|
| 0 | App bar | full | full | menu + title + avatar | 56 |
| 1 | Page header + period + meta, then banner | full | full | stacked | — |
| 2 | KPI tiles ×4 (Revenue, Utilisation, Weighted pipeline, Win rate) | 3+3+3+3 | 3+3+3+3 | 2+2 / 2+2 | equal (214 in mockup) |
| 3 | Revenue by service line (h-bar) · Revenue mix (donut) | **8 + 4** | 8 + 4 | 4 / 4 | 520 min |
| 4 | Monthly revenue vs target (column, May–Oct 840K · 860K · 780K · 760K · 900K · 1.03M, target 800K, Jul/Aug below) · Utilisation by department (h-bar compact, 9 rows) | **6 + 6** | 6 + 6 | 4 / 4 | 452 min |
| 5 | Top clients table · Open pipeline table | **6 + 6** | **12 / 12** | 4 / 4 | equal (567) |
| 6 | H2 "Where to find AED 1M more" + 4 revenue-fix cards | 3×4 | 3×4 | 4 each | 188 min |
| 7 | Chat dock (fixed) | 880 max, centred | centred | edge −8px | 64 / 60 |

The 1024–1359 laptop band only changes the margin (24), gutter (20), label column (190) and table stacking. At 768–1023, KPIs are 6+6 and everything else is 12.

### 6.2 Department Businessbot page (example: **Sales & BD**)

Same shell, sidebar active item "Ethikcorp Businessbots", breadcrumb "Ethikcorp BusinessOS / Businessbots / **Sales & BD**". Department data from the sample tables: Sales & BD has 3 people, 480 h available, 360 h utilised (75.0%), 120 billable (25.0%).

| # | Block | Desktop span | Content |
|---|---|---|---|
| 1 | Page header | 12 | H1 "Sales & BD" · description "Lead intake, qualification, proposals and pipeline review." · period select · department switcher (select listing the 9 departments) |
| 2 | KPI ×4 | 3 each | Utilisation 75.0% (target 70%, on target) · Billable utilisation 25.0% (no target → no badge) · Open pipeline AED 6.51M (8 deals) · Win rate 78.6% |
| 3 | Hours per week by workflow step (h-bar, sorted, `cat-2`, "▼ Bottleneck" text marker, no orange) · Pipeline by stage (column: Qualification, Discovery, Proposal, Negotiation; `cat-1`; value labels) | 7 + 5 | replaces the old flow diagram (critique F3) |
| 4 | Deals table (Client, Stage, Value, Prob., Weighted, Owner role) | 12 | rows 48, sticky header, pagination 10 |
| 5 | Automation cards ×3 (Businessbot actions) | 4 each | same anatomy as the revenue-fix card: title, "AED x / month" or "x h / week saved", one specific benefit line, numbered steps (max 3), secondary "Build automation" button 32px. Show the "Not running" neutral badge where applicable |
| 6 | Chat dock | — | placeholder "Ask the Sales & BD bot…"; chips scoped to the department |

Mobile: KPI 2×2, charts full-width in order, deals table shows Client / Stage / Weighted.

### 6.3 BusinessBrain PM: pipeline and data quality

Sidebar active item "BusinessBrain PM". This is the screen in `old-sidebar-live.jpg`; its content and states stay, only the layout and tokens change.

| # | Block | Desktop span | Content |
|---|---|---|---|
| 1 | Page header | 12 | H1 "Build the company brain" · description "Progress is 0%. 0 documents, 0 passages." · secondary button "Speak status" (top-right; **not** a sky-blue pill — that colour is reserved for the sidebar active item) |
| 2 | KPI ×4 | 3 each | Build progress 0% (bullet bar to 100%) · Sources owned 0 / 18 · Documents indexed 0 · Passages 0. Use "—" + "Not measured" where nothing has run. These are system KPIs, so they live here and not on the CEO dashboard |
| 3 | Pipeline (table-style list) | 8 | 9 steps: ownership, intake, parse, clean, chunk, embed, index, rag, Fine-tune. Row 56px: step number circle 24px (`#EEF1F4`, 12/600) · name 14/600 + description 12/16 text-2 · status badge right-aligned ("Not started" neutral, "Running" info, "Done" success, "Not runnable here" neutral). Dividers `#EEF1F4`, padding 24 |
| 3b | Pipeline progress | 4 | donut (completed vs remaining steps; `cat-1` vs `#EEF1F4`, centre "0 / 8" using the §5.4 fit rule) + a short legend |
| 4 | Data quality | 12 | table: Source · Owner · Rows · Valid % (right, tabular, with a mini bullet bar 48px in `cat-2`) · Errors (right) · Last checked. Above it, a column chart "Row errors by source" (`cat-1`). Empty state: "Upload the ownership workbook to see data quality." |
| 5 | 1. Source ownership (upload) | 12 | card: instruction text 13/18 text-2 · file input 40px (border-strong, radius 8) · primary button "Import ownership" 36px, **auto width, not full-width**, and the sky blue is not reused |
| 6 | Chat dock | — | "Ask about build status…" |

Mobile: KPI 2×2. The pipeline list goes full width with the status badge under the description. The progress donut moves below the list.

---

## 7. Chart transition rules (only motion allowed)

| Change | Animation |
|---|---|
| Value change (chat or filter) | bar width or column height, donut `stroke-dasharray` / offset: **250ms `cubic-bezier(.2,0,0,1)`** |
| KPI value change | cross-fade 200ms (opacity). No count-up |
| Re-sort | bars translate to new positions, 250ms, same easing |
| Category added or removed | fade 150ms |
| Chart type swap (bar ↔ donut, from chat) | cross-fade 200ms, no morph |
| Highlight after a chat answer | smooth scroll + a 2px `#1F5FBF` outline fading over 1500ms |
| Loading | 2px indeterminate bar at the top of the affected card. Previous data stays visible |
| Forbidden | anything over 400ms, bounce or overshoot, 3D, looping, parallax, entrance animations on page load |
| Reduced motion | all 0ms. The highlight becomes a static outline for 3s |

---

## 8. Accessibility

- Contrast: all text ≥ 4.5:1 (§2.5 table; Power BI guidance requires the same for titles, axis labels and data labels). Chart marks ≥ 3:1 vs white. All six categorical colours pass.
- Status is never shown by colour alone: ▼ icon + "Below target" text, and ✓ + "On target".
- Every chart has `role="img"` plus an `aria-label` summary ("Revenue by service line, May–Oct 2026. Highest: Business Transformation Consulting AED 1.60M") and a "View as table" toggle.
- KPI tiles are buttons with a full `aria-label` ("Utilisation 77.3%, October 2026, 2.7 points below the 80% target, below target").
- Tables use `<th scope="col">` and `aria-sort`. The pagination buttons have labels.
- The dock is a `role="region"` labelled "Ask BusinessBrain". Enter sends and Shift+Enter adds a line. Esc collapses the expanded dock. Focus returns to the input.
- Tap targets ≥ 44×44 on mobile (menu, dock buttons). The focus ring is visible on every interactive element.
- The sidebar's inactive item contrast (3.11:1) is a known exception kept by request (§4).

---

## 9. Sources & rationale

| Guidance | Applied as | Source |
|---|---|---|
| Carbon data table row sizes are xs 24 / sm 32 / md 40 / lg 48px, and "pagination height should always match the row height" | 40px header, 48px rows (Carbon lg), 56px for 2-line rows; pagination controls sized to match | [Carbon — Data table style](https://carbondesignsystem.com/components/data-table/style/) (fetched 11 Nov 2026) |
| Carbon legends: "avoid using a legend and label data representations directly" when possible; legend hover lowers other categories to 30% opacity; click isolates | direct value labels on all bars; donut legend as a value table with 30% hover dimming | [Carbon — Legends](https://carbondesignsystem.com/data-visualization/legends/) (fetched) |
| Carbon axes: "Never change axis tick increments to accommodate data availability" | fixed even ticks, zero baseline, unit in the card meta | [Carbon — Axes and labels](https://carbondesignsystem.com/data-visualization/axes-and-labels/) (fetched) |
| Carbon simple charts list donut, bar (simple/grouped/stacked) and bullet as the core types | the allowed chart set; bullet bar in KPI tiles | [Carbon — Simple charts](https://carbondesignsystem.com/data-visualization/simple-charts/) (fetched) |
| Tremor DonutChart puts a centre label that defaults to the **sum of values**, passed through the same `valueFormatter` as the chart | centre shows the total in the compact format with the currency on its own line | [Tremor — Donut chart](https://www.tremor.so/docs/visualizations/donut-chart) (fetched, component source) |
| Power BI accessibility: title, axis label and data label text ≥ **4.5:1**; "avoid using color as the only means of conveying information" | §2.5 contrast table; ▼/✓ icons + text on every status | [Microsoft Learn — Design accessible Power BI reports](https://learn.microsoft.com/en-us/power-bi/create-reports/desktop-accessibility-creating-reports) (fetched) |
| Tableau Blueprint: colour "isn't an unlimited design resource". Distinguish alerting from highlighting and keep colour consistent across dashboards | one alert colour (orange, KPI only), blue/green for data, the same category → colour mapping on every chart | [Tableau Blueprint — Visual best practices](https://help.tableau.com/current/blueprint/en-us/bp_visual_best_practices.htm) (fetched) |
| Looker: put the most important summary tiles first (top-left) and group related tiles | KPI row first, then primary charts, detail tables, then actions | [Looker — Creating effective dashboards](https://cloud.google.com/looker/docs/best-practices/how-to-create-effective-dashboards) (fetched; summarised) |
| SAP Fiori analytical cards and responsive table: KPI header + one chart per card, compact rows for dense data, numbers right-aligned | card = one question; numeric columns right-aligned; KPI + bullet bar header | [Fiori — Analytical card](https://experience.sap.com/fiori-design-web/analytical-card/), [Fiori — Responsive table](https://experience.sap.com/fiori-design-web/responsive-table/) — **the SAP site returned "Access Denied" to my fetch today; these points are from published Fiori guidance and were not re-verified** |
| Bar band ratio: bars ≈ 45–60% of the band (horizontal 20px bars in 44px rows; columns 56% of band, max 48px) | readable gaps without thin "barcode" bars | established practice across Carbon Charts / Power BI defaults (judgement, not a quoted rule) |
| Donut ring thickness 12% of the diameter and inner radius 76%: a thin, modern ring leaves room for a centre total | §5.4 | design decision. Verified with a measured DOM fit (64.5px value inside a 116px safe box) |

---

## 10. QA checklist for the coding agent

Run these at 1440×900, 1280×800 and 390×844, and in the expanded-dock state.

- [ ] **No text overflow.** Scripted check: every descendant of `.card` sits inside its card's rect; `kpi-v`, `fix-v`, `d-val`, badges, buttons and H3 have `scrollWidth ≤ clientWidth`; no table numeric cell is truncated. (`redesign/_build/shot.py` has this audit, and it reports zero issues on the mockup at all three widths.)
- [ ] **Donut centre:** the value width is ≤ the safe box (116 / 104px) at every width and for long totals (try AED 12,345,678 → "12.3M"). Nothing touches the ring.
- [ ] Legend rows are ≥ 32px. Names don't wrap past 1 line. Values and % are right-aligned and tabular.
- [ ] **Equal heights:** every card in a grid row has the same rendered height (measured rows at 1440: KPI 214×4, 520×2, 452×2, 567×2, fixes 190×4).
- [ ] Padding is equal on all 4 sides (24 cards / 20 KPI / 16 mobile). Text is ≥ 12px from any edge.
- [ ] No horizontal page scroll at 390 (`documentElement.scrollWidth === 390`).
- [ ] The dock never covers content: scroll to the bottom, and the last card's bottom is ≥ 16px above the dock top, both collapsed and expanded.
- [ ] Orange `#C25400` appears only inside `.kpi.is-below` (grep the rendered DOM's computed colours).
- [ ] No line, area, gauge or 3D charts. No lime or orange in data marks. Lime appears only in the sidebar logo and marker and the dock avatar.
- [ ] The sidebar matches §4: 240 width, `#040509`, 30px `#DDFB5D` logo, `#49A2E6` 34px radius-7 pill with `#00254E` text, 2×18 lime marker, `#5C5D63` inactive items.
- [ ] Value axes start at 0. Ticks are even. Gridlines are `#E6EAEE`. The baseline is `#C3CBD3`.
- [ ] Every figure uses tabular numerals and the formatting rules (AED prefix, compact in tiles, full in tables and tooltips, U+2212 for negatives).
- [ ] Transitions are 250ms with `cubic-bezier(.2,0,0,1)`. With `prefers-reduced-motion`, everything is instant.
- [ ] Keyboard: tab order is sidebar → app bar → page controls → KPI tiles → chart "View as table" → table sort → dock. The focus ring is visible.
- [ ] Product rules unchanged: data is still sample-labelled ("Sample" badges + banner). No new actions beyond the existing ones.

---

## 11. Assumptions and open points

1. **Sidebar scale.** The capture is ~90% scale (evidence in §4). If Jafer wants the literal capture pixels instead, use 214 width / 27 logo / 194×31 pill / 6 radius / 12px text.
2. **Below-target bars.** The current build colours below-target bars and months orange. Following "orange ONLY for a KPI below target", the redesign keeps those bars blue or green and adds a target tick or line plus a "▼ Below target" text marker. Per-department utilisation targets in the mockup (80% for delivery-type teams, 70% for others) were inferred from which rows the current build flags. Replace them with real targets.
3. The monthly figures (May 840K … Oct 1.03M, totalling 5.17M) and the service-line figures come from the current build's screenshot labels. Clients and pipeline come from `ethikcorp-demo-corpus/sample-data/*.csv`. I didn't find the app's source repo on this box, so component names here are descriptive (`KpiTile`, `ChartCard`, `BarChart`, `DonutChart`, `DataTable`, `RevenueFixCard`, `ChatDock`, `Sidebar`). Map them to the repo's components.
4. The department page KPIs (Open pipeline AED 6.51M = AED 6,505,000, the sum of the 8 open deal values; the stage column) are derived from `sales-pipeline.csv`. Confirm the department-level pipeline definition.
5. Figma: not produced. The brief marked it optional, and the user's Figma seat is Starter/View with very limited calls, so the HTML mockup is the visual reference.
