# Ethikcorp BusinessOS — Dashboard Critique & Implementation Spec

**Prepared by:** Critiquito (design critic) for Jafer Mohammed, CEO, Ethikcorp
**Date:** 11 Nov 2026
**Screens reviewed (desktop 1440×1100, mobile 390×900 screenshots of the current review build):**
`ceo-chart.png` (BusinessBrain, revenue chart), `revenue-fixes.png` (BusinessBrain, KPI tiles + chat answer + revenue fixes), `sales-map.png` (Businessbots › Sales & BD workflow map), `sales-automations.png` (Businessbots › automation cards), `mobile.png` (BusinessBrain on mobile). All five files were present and viewed.
**User:** CEO and executives checking business health at a glance and asking follow-up questions in the chat.
**Target standard:** SAP Fiori / Power BI / Salesforce Lightning enterprise level. Black left sidebar, mostly white workspace.

> **Verdict:** The data is there, but it reads like a colourful prototype. Saturated colour-block tiles, an overlaid area chart, a flow diagram and visible developer diagnostics break the CEO's new direction. Orange currently marks the *best* result. Under the new rule, orange must mean *below target* only.

Limits: these are static screenshots, so I could not judge hover, focus, keyboard, motion, live chart updates, real loading/error states or the intermediate breakpoints. Sizes quoted for the current build are **estimates from the screenshots**, not measurements. Hex values in §3 are **proposed tokens**. The only current colours quoted are pixel samples, marked "sampled".

---

## 1. Ranked findings

Severity uses three levels only: **Blocker** (misleads the CEO or breaks the new direction), **Worth fixing**, **Minor**. I kept 15 findings. 4 smaller ones were cut or merged (listed at the end).

### Blockers

**F1 — Blocker — `ceo-chart` · main chart card.** The revenue chart is an **area/line chart** with six translucent, overlapping series (May 2026–Oct 2026, y-axis "0k–288k"). The tool trace below it even says "make_chart **line** from query_dataset rows." The overlapping fills blend into muddy brown/olive bands, so you can't read any one service line's value.
*Cost:* this breaks the "no area or line" rule. The CEO can't answer "which line earns most, and is it rising?" without hovering.
*Fix:* use two charts in its place: (a) a **horizontal bar chart** of revenue by service line for the selected period, sorted descending, with value labels in AED; (b) a **vertical bar (column) chart** of total revenue by month, May–Oct, single series in `blue-600`. If month × service line detail is needed, use a stacked column with at most 5 segments plus "Other". Remove the area renderer from the dashboard chart library entirely, and make `make_chart` emit only `bar | column | stacked_column | donut | kpi`.

**F2 — Blocker — `revenue-fixes` · top-left tile "ILLUSTRATIVE WEEK".** A black **line chart** sits inside a lime KPI tile, captioned "Illustrative path toward the base-case week. Not a measured series."
*Cost:* this is a line diagram (forbidden). Worse, it shows invented data in the most prominent KPI position, which undermines trust in every other number.
*Fix:* remove it. If a target trajectory matters, show a KPI tile with "Value / Target / % of target" plus a bullet bar (one horizontal bar against a target tick). Don't put anything labelled "not measured" in the KPI row.

**F3 — Blocker — `sales-map` · "Workflow map" card.** It is a **flow diagram**: three swimlanes ("Lead intake and BizScan", "Qualification, consultation and proposal", "Pipeline review and follow-up") of numbered boxes, with "BOTTLENECK" boxes in coral. The third lane has a heading and no steps.
*Cost:* this breaks the "no flow diagrams" rule. The CEO has to read 10 boxes to find that 4 steps are bottlenecks.
*Fix:* on the dashboard, replace it with a **horizontal bar chart "Hours per week by step"**, sorted descending. Bars are `blue-600`. Steps flagged as bottlenecks use `orange-600` **plus** a "Bottleneck" text badge. If the process map is still needed, move it to a separate *Process detail* page (not the analytics dashboard) and remove the empty "Pipeline review and follow-up" heading.

**F4 — Blocker — all screens · colour meaning.** Coral/orange (sampled ≈ `#FD7152`) is used decoratively and for positive things: the **"Best"** tile ("Business Transformation Consulting, AED 1,604,000"), "CLICKUP 5", "DEMO HOURS SAVED 44", the "Prototype · not UAE-hosted" badge, 1 of every 3 legend series, and step boxes. Lime (sampled ≈ `#D6FD21`) and sky blue (sampled ≈ `#09A5EC`) alternate with no meaning.
*Cost:* under the new rule orange means "low/below target", so the dashboard currently tells the CEO his best service line is a problem.
*Fix:* apply the palette in §3.4. Orange (`orange-600 #C25400`) appears **only** when a KPI is below its target, always together with an icon and text ("Below target"). Lime is removed from data and status entirely. KPI tiles are white.

### Worth fixing

**F5 — Worth fixing — `ceo-chart`, `revenue-fixes`, `mobile` · KPI tiles.** Tiles are full-bleed saturated blocks (blue / lime / coral) with radius ≈ 12–16px (estimate). They show a value and a caption only: "Total 5,170,000 AED", "Change +22.6% first to last period", "PEOPLE 27 Demo snapshot." There is no target, no comparison period and no status. The "Best"/"Worst" tiles put a service-line *name* in the value slot, wrapping to 3 lines at display size.
*Cost:* the tiles shout but don't answer "are we on track?". Name-as-value tiles break row alignment.
*Fix:* use the KPI tile anatomy in §3.5 (white card, label, value + unit, delta with arrow and period, target, status). Change "Best"/"Worst" into one **"Revenue by service line"** bar chart, or into tiles whose value is the AED figure and whose label is the service line.

**F6 — Worth fixing — `ceo-chart` · under the chart, and the second KPI row.** Developer diagnostics are shown to the CEO: "1. **plan** Deterministic planner chose 3 tools. No Workers AI call. Cloudflare Workers AI – not UAE-resident; UAE North option ready", "**query_dataset** 6 revenue rows", "**analyze_revenue** 4 actions from the indexed tables". The tiles "INDEXED DOCUMENTS 40", "PASSAGES 417", "SAMPLE ROWS 120" and "OPEN SAMPLE TASKS 55" are styled exactly like business KPIs.
*Cost:* this looks unfinished, and it puts system plumbing on the same level as revenue.
*Fix:* move tool traces into a collapsed "How this answer was produced" disclosure inside the chat message (default closed, text-secondary, 12px). Move index statistics to an Admin/System status page. Business KPIs only on the dashboard.

**F7 — Worth fixing — `revenue-fixes`, `sales-map`, `sales-automations` · data provenance.** The provenance labels are scattered and contradictory: "Demo snapshot.", "Sample snapshot.", "Sample model.", "Not measured.", "Setup model. Not running.", "SAMPLE DATA" badges. "DEMO HOURS SAVED **44**" sits next to "Not measured."
*Cost:* executives can't tell which numbers are real, so they trust none.
*Fix:* add one page-level **data source banner** under the page title (neutral info style, §3.8): "Sample data — figures are illustrative until live sources are connected." Per-card, use a single neutral "Sample" badge in the card header. A metric that is not measured shows "—" with the label "Not measured", never a number.

**F8 — Worth fixing — `ceo-chart`, `revenue-fixes` · page header and hierarchy.** BusinessBrain screens have no page title, only the breadcrumb "Ethikcorp BusinessOS / BusinessBrain" (≈ 13–14px, estimate). The sticky header looks translucent: blurred content shows through it, and tile labels are clipped beneath it ("ILLUSTRATIVE WEEK", "AUTOMATIONS", "CLICKUP" are cut off at the top of `revenue-fixes`). There is no period selector, so "first to last period" is undefined.
*Cost:* the user can't tell what page, period or currency they are looking at.
*Fix:* use an opaque white header with a 1px `border-subtle` bottom. Below the breadcrumb: an H1 page title (e.g. "Business overview"), a period selector (e.g. "May–Oct 2026") and a currency note ("AED"). Order per §3.1: title → KPI row → charts → detail.

**F9 — Worth fixing — all screens · header status badges.** "● Prototype · not UAE-hosted" (coral pill) and "● No base model connected" (black pill) sit top-right on every page. On mobile they stack into two rows.
*Cost:* the loudest elements on every screen are warnings about infrastructure, not business health. Coral also conflicts with the new orange rule.
*Fix:* use one neutral environment badge ("Prototype", neutral variant, §3.8) linking to a System status popover that lists hosting region and model connection. If compliance needs a persistent notice, use a thin full-width info banner, dismissible per session. Don't use orange or black pills.

**F10 — Worth fixing — `revenue-fixes` · chat answer.** The answer is a run-on paragraph with raw numbers and no currency: "…probabilities already in the file: 2397500; Stay on deals below 40% probability: 561500; … not billable in October: 816080; The closed-lost book is a ceiling, not a forecast: 1740000." The same figures appear formatted lower down ("AED 2,397,500"). The chat thread is also embedded mid-page while a separate chat dock sits at the bottom.
*Cost:* the CEO can't scan the answer, and it's unclear which units apply (816,080 looks like hours × rate, but the unit isn't shown).
*Fix:* format every figure (§3.3 number rules), using a bulleted list of at most 5 items, each with label, value and unit. End with "Updated: Revenue by service line chart" as a link that scrolls to and highlights the chart. Use one chat surface only: the dock (§3.8).

**F11 — Worth fixing — all screens · chat dock.** It is a full-width bottom bar: a suggestion-chip row, a two-line "Hide chat"/"Show chat" pill, an input and a round "Ask" button. It takes ≈ 75px on desktop and ≈ 180px of 900px (~20%) on mobile (estimates). It covers content: the captions of "SAMPLE ROWS" and "OPEN SAMPLE TASKS" are hidden on `ceo-chart`, and mobile chips wrap to 3 rows.
*Cost:* it permanently eats workspace and hides data.
*Fix:* desktop uses a right-side panel, 380px, collapsible to a 48px rail. Mobile uses a bottom sheet with a single-line collapsed bar. Full spec in §3.8.

**F12 — Worth fixing — all screens · number and unit formatting.** Formatting is inconsistent: "5,170,000 AED" (unit after, separate line) vs "AED 1,604,000" (unit before); "816,080" and "1,740,000" on mobile with no unit; y-axis "288k" with no currency; the chat shows "2397500" raw; "AED 6,432" on automation cards with no period.
*Cost:* executives misread magnitude and units. "AED 6,432" could be per month or per year.
*Fix:* apply the §3.3 number rules: "AED 5.17M" in tiles, with the full value in a tooltip; "AED 2,397,500" in tables and detail; "AED 6,432 / month" on automation cards; axis titles carry the unit ("Revenue (AED)") and ticks read "0, 75K, 150K…".

**F13 — Worth fixing — all screens · typography.** The figures use a geometric display face with quirky numerals (the "1" in "1,740,000" and "120" reads as an "l"), proportional digits, and tight tracking at ≈ 32–40px (estimate). Labels are ≈ 10–11px uppercase with wide tracking (estimate). Body text in cards and chat is ≈ 12–13px (estimate).
*Cost:* the numbers don't line up across tiles, and the tiny uppercase labels are hard to read for executives on laptops.
*Fix:* use Inter (or the Segoe UI system stack) with `font-variant-numeric: tabular-nums` for all figures. Use the type scale in §3.3. Labels are 12px/600 in sentence case.

**F14 — Worth fixing — `ceo-chart` · legend and series colours.** Six legend entries reuse three colours: "Business Transformation Consulting" and "Corporate Training Programs" are both blue; "AI-Enabled Business Transformation" and "Leadership Development & Culture Transformation" are both coral; "AI Agents for Workflow Automation" and "Gamification in Learning & Corporate Education" are both lime. Lime against white is **1.17:1** (computed from the sampled colour), so the lime series is nearly invisible.
*Cost:* nobody can match a line to its service line.
*Fix:* allow at most 5 categories plus "Other" in the categorical order from §3.4. Label bars directly. Place the legend top-left above the plot only when direct labels aren't possible.

### Minor

**F15 — Minor — sidebar, `sales-automations`, `sales-map`, `mobile` · polish.**
- **Sidebar:** each nav item has a different coloured dot (lime, blue, coral). The active item is a saturated sky-blue fill. The lime "EC" logo tile and "Built by Aqionlabs.ai" read as a vendor demo. The footer reads "Development team. All three areas are open."
- **`sales-automations`:** the same sentence, "Turns saved specialist time toward billable delivery and faster follow-up.", is repeated on all three cards. Long "→" chains are set in bold body text. The "Build automation" buttons are small pills (≈ 24px tall, estimate).
- **`sales-map`:** the "SD" eyebrow above "Sales & BD" is unexplained. The bottleneck paragraphs start lowercase ("leads sit in personal inboxes…", "version control lives in email…", "stage ages, stale deals…"). The header is a full-bleed blue banner.
- **`mobile`:** there is no visible navigation (I couldn't tell how the sidebar is reached). The two header badges stack. KPI tiles are full-width saturated blocks.

*Fix:* follow the sidebar tokens (§3.4) with a monochrome nav (no coloured dots) and a 3px blue left indicator on the active item. Remove the vendor line or move it to Settings › About. Give automation cards one specific benefit line each, use buttons at least 32px tall, and show steps as a numbered list. Use sentence case throughout. Use a white page header in place of the blue banner. Mobile follows §3.9.

**Cut or merged (4):** the "Explore/How we calculated" disclosure triangles look like plain text (merged into §3.7 states); the hero "All departments" button styling (minor); the breadcrumb using bold for the current page only (fine); the scrollbar overlapping the header (couldn't confirm from static captures).

---

## 2. CEO-direction violations by screen

| Screen | Violation | Action |
|---|---|---|
| ceo-chart | Area/line chart, 6 overlaid series | Replace with sorted horizontal bar + monthly column (F1) |
| ceo-chart | Coral "Best" tile, lime/blue tiles | White KPI tiles; orange only below target (F4, F5) |
| revenue-fixes | Line chart in "ILLUSTRATIVE WEEK" tile | Remove; use KPI + bullet bar (F2) |
| revenue-fixes | Coral "CLICKUP" and "DEMO HOURS SAVED" tiles | White tiles; neutral (F4) |
| sales-map | Flow diagram "Workflow map" | Bar chart "Hours per week by step"; move map off dashboard (F3) |
| sales-map | Coral "BOTTLENECK" boxes, blue banner | Orange bar + text badge only where below target; white header (F3, F15) |
| sales-automations | "→" text flow chains | Numbered step list (minor, F15) |
| mobile | Lime/blue full-bleed tiles | White tiles (F5) |
| all | Coral "Prototype" badge | Neutral badge (F9) |

---

## 3. Implementation spec

### 3.1 Hierarchy and page order (analytics dashboard)

1. **App header (sticky, opaque white, 56px):** breadcrumb (left) · environment badge + user menu (right).
2. **Page header (scrolls):** H1 title → one-line description (optional) → controls row: period selector, compare-to selector ("vs previous period" / "vs target"), currency "AED" note, "Sample data" banner if applicable.
3. **KPI row:** 4 tiles (desktop), with the most important first (Revenue, Gross margin / Utilisation, Pipeline value, Win rate or similar business KPIs). No system metrics.
4. **Primary charts row:** two cards at 6 + 6 columns, or 8 + 4 (bar + donut).
5. **Secondary charts / tables:** 6 + 6 or 12.
6. **Detail and actions** (revenue fixes, automations) at the bottom, as compact cards or tables.

Rules: one H1 per page. Every card has a title (H3) that names the question it answers, e.g. "Revenue by service line, May–Oct 2026". Chart cards answer one question each.

### 3.2 Grid, spacing, surfaces

| Token | Value |
|---|---|
| Spacing scale | 4px base: `4, 8, 12, 16, 24, 32, 40, 48` |
| Sidebar width | 240px expanded, 64px collapsed |
| Workspace grid | 12 columns, 24px gutter, 32px outer margin (≥1280px); 16px gutter, 24px margin (768–1279px); 4 columns, 16px gutter, 16px margin (<768px) |
| Max content width | 1600px; centre beyond |
| Vertical rhythm | 24px between rows of cards; 32px between page header and KPI row |
| Card padding | 20px (desktop), 16px (mobile); KPI tile 16px 20px |
| Card radius | 8px (cards), 6px (buttons and inputs), 999px (badges, chips only) |
| Card border | 1px `border-subtle #DDE2E7` |
| Shadow | none at rest; `0 1px 2px rgba(16,24,40,.06)` optional on hover for clickable cards; floating panels (chat sheet, popovers) `0 8px 24px rgba(16,24,40,.12)` |
| Workspace background | `bg-app #F5F7F9`; cards `surface #FFFFFF` |
| KPI tile height | min 112px; all tiles in a row equal height |
| Chart card min height | 320px (plot area ≥ 240px) |

### 3.3 Typography

**Family (proposal):** `Inter, "Segoe UI", system-ui, -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif`. Load Inter 400/500/600/700 (variable font OK). Arabic fallback, if needed: `"Noto Sans Arabic"`.
**Figures:** `font-variant-numeric: tabular-nums lining-nums;` on all values, axes, tables and chat figures.

| Role | Size / line-height | Weight | Notes |
|---|---|---|---|
| H1 page title | 24 / 32px | 600 | text-primary |
| H2 section | 18 / 26px | 600 | |
| H3 card title | 15 / 22px | 600 | sentence case |
| Body | 14 / 20px | 400 | chat messages, descriptions |
| Body small / meta | 12 / 16px | 400 | text-secondary; captions, sources |
| KPI label | 12 / 16px | 600 | sentence case, text-secondary, no letter-spacing tricks |
| KPI value | 28 / 36px | 600 | tabular; 24/32 on mobile |
| KPI unit | 14 / 20px | 500 | text-secondary, after the value with a 4px gap, or "AED" prefix at same size |
| Delta / target | 12 / 16px | 500 | |
| Axis tick label | 12 / 16px | 400 | text-secondary |
| Data label on bar | 12 / 16px | 500 | text-primary outside the bar end, or white inside a dark bar |
| Badge | 12 / 16px | 500 | sentence case |
| Button | 14 / 20px | 500 | |

Uppercase is not allowed for labels or badges. Minimum text size is 12px.

**Number rules:**
- Currency: "AED" prefix with a non-breaking space: `AED 2,397,500`.
- Tiles: compact form with one decimal (`AED 5.17M`, `AED 322K`), with the full value in a tooltip / `title` and `aria-label`.
- Percentages: one decimal (`+22.6%`).
- Hours: `816,080 h`.
- Rates: `AED 6,432 / month`.
- Negative values: a true minus sign "−" (U+2212), not a hyphen.
- Use `Intl.NumberFormat('en-AE')`.

### 3.4 Colour tokens (PROPOSED — not current values)

Ratios were computed with the WCAG 2.x relative-luminance formula (script, not estimates). Text needs ≥ 4.5:1. Non-text UI and chart marks need ≥ 3:1 against the adjacent colour.

**Blues (sequential, light → dark):** `blue-50 #E8F1FB` · `blue-100 #C4DAF3` · `blue-200 #8DB8E8` · `blue-400 #3D82D1` · `blue-600 #1F5FBF` · `blue-700 #0B5CAD` (interactive) · `blue-900 #0E3A75`
**Greens (sequential, light → dark):** `green-50 #E8F5EC` · `green-100 #BFE3CC` · `green-200 #86C9A0` · `green-400 #3E9B63` · `green-600 #237A4B` · `green-800 #14532F`
**Single orange (below target only):** `orange-600 #C25400`
**Status text:** good `#1E7B45` (on white or `green-50`), low `#C25400` (on white only; use solid orange with white text for badges, see below).

**Categorical order (max 5 + Other):**
1. `blue-600 #1F5FBF`
2. `green-400 #3E9B63`
3. `blue-900 #0E3A75`
4. `green-200 #86C9A0`
5. `blue-200 #8DB8E8`
6. Other: `#8A949E`

Single-series charts use `blue-600`. Use `green-600` only to mean "achieved / actual vs target", or as the second series.

**Neutrals:**

| Token | Hex | Use |
|---|---|---|
| text-primary | `#1A1F24` | headings, values |
| text-secondary | `#5B6670` | labels, meta, axis ticks |
| text-disabled | `#8A949E` | disabled only (exempt) |
| border-strong / input | `#8A949E` | input borders |
| border-subtle | `#DDE2E7` | card borders, dividers |
| divider-light | `#EEF1F4` | table row lines, skeleton base, neutral badge bg |
| gridline | `#E6EAEE` | horizontal chart gridlines |
| axis-line | `#C3CBD3` | zero baseline (x-axis) |
| bg-app | `#F5F7F9` | workspace background |
| surface | `#FFFFFF` | cards, header |
| neutral-badge-text | `#3D4751` | |
| focus-ring | `#1F5FBF` | 2px outline, 2px offset |

**Sidebar:**

| Token | Hex |
|---|---|
| sidebar-bg | `#0B0D10` (near-black; current sampled ≈ `#03050A` is fine to keep) |
| sidebar-text | `#C9CED4` |
| sidebar-text-muted (section labels, footer) | `#8A939C` |
| sidebar-hover-bg | `#161B21` |
| sidebar-active-bg | `#1F2630` |
| sidebar-active-text | `#FFFFFF` |
| sidebar-active-indicator | `#4F8FD9` (3px left bar) |
| sidebar-divider | `#1F2630` |

**Contrast results (computed):**

| Pair | Ratio | Needs | Result |
|---|---|---|---|
| text-primary #1A1F24 on surface #FFFFFF | 16.60:1 | 4.5 | PASS |
| text-primary on bg-app #F5F7F9 | 15.45:1 | 4.5 | PASS |
| text-secondary #5B6670 on surface | 5.87:1 | 4.5 | PASS |
| text-secondary on bg-app | 5.46:1 | 4.5 | PASS |
| text-disabled #8A949E on surface | 3.08:1 | exempt | info only |
| link/primary #0B5CAD on surface | 6.67:1 | 4.5 | PASS |
| white on primary button #0B5CAD | 6.67:1 | 4.5 | PASS |
| white on primary hover #08467F | 9.58:1 | 4.5 | PASS |
| status-good #1E7B45 on surface | 5.28:1 | 4.5 | PASS |
| status-good #1E7B45 on green-50 #E8F5EC | 4.71:1 | 4.5 | PASS |
| orange #C25400 text on surface | 4.60:1 | 4.5 | PASS (use ≥12px/500+) |
| white on orange #C25400 (low badge) | 4.60:1 | 4.5 | PASS |
| orange #C25400 on light orange tint #FDF1E7 | 4.15:1 | 4.5 | **FAIL → don't use tinted orange badges** |
| info #0B5CAD on blue-50 #E8F1FB | 5.85:1 | 4.5 | PASS |
| neutral badge #3D4751 on #EEF1F4 | 8.35:1 | 4.5 | PASS |
| sidebar-text #C9CED4 on #0B0D10 | 12.29:1 | 4.5 | PASS |
| sidebar-muted #8A939C on #0B0D10 | 6.24:1 | 4.5 | PASS |
| white on sidebar-active #1F2630 | 15.24:1 | 4.5 | PASS |
| active indicator #4F8FD9 on #0B0D10 (non-text) | 5.80:1 | 3 | PASS |
| focus ring #1F5FBF on surface (non-text) | 6.09:1 | 3 | PASS |
| cat-1 #1F5FBF vs white | 6.09:1 | 3 | PASS |
| cat-2 #3E9B63 vs white | 3.46:1 | 3 | PASS |
| cat-3 #0E3A75 vs white | 11.17:1 | 3 | PASS |
| cat-4 #86C9A0 vs white | 1.93:1 | 3 | **below 3:1 → must carry a direct label + 2px white separators** |
| cat-5 #8DB8E8 vs white | 2.07:1 | 3 | **below 3:1 → same rule** |
| Other #8A949E vs white | 3.08:1 | 3 | PASS |
| orange #C25400 vs white (bar) | 4.60:1 | 3 | PASS |
| white label inside cat-1 bar | 6.09:1 | 4.5 | PASS |
| white label inside cat-2 #3E9B63 bar | 3.46:1 | 4.5 | **FAIL → labels for green bars go outside the bar in text-primary** |
| dark label #1A1F24 on cat-4 / cat-5 | 8.59 / 8.02:1 | 4.5 | PASS |
| axis tick #5B6670 on surface | 5.87:1 | 4.5 | PASS |
| gridline #E6EAEE / border #DDE2E7 vs white | 1.21 / 1.30:1 | decorative | info only (intentionally faint) |

For reference, from the current build (sampled): black text on the sky-blue tiles is 7.6:1 (passes), white on that blue would be 2.76:1 (fails), and the lime series vs white is 1.17:1 (fails).

**Colour-vision note:** orange `#C25400` vs green `#3E9B63` is only 1.33:1 apart in luminance, so red-green colour-blind users can confuse them. Orange must never be the only cue: always pair it with the ▼ icon and the text "Below target".

### 3.5 KPI tile anatomy

```
┌──────────────────────────────────────┐  white card, 1px #DDE2E7, radius 8, padding 16/20
│ Revenue                     [ⓘ]      │  label 12/600 text-secondary; info icon → definition tooltip
│ AED 5.17M                            │  value 28/600 tabular text-primary (unit prefix 14/500 secondary)
│ ▲ 22.6% vs May 2026                  │  delta 12/500: arrow + % + comparison period
│ Target AED 5.00M · 103%              │  target 12/400 text-secondary
│ [✓ On target]                        │  status badge (icon + text)
└──────────────────────────────────────┘
```

Rules:
- **Delta:** the arrow shows direction (▲/▼). Colour shows *goodness against intent*, not direction. Delta text is text-primary for neutral, `#1E7B45` when better than the comparison, and `#C25400` only when the KPI is below target. "Lower is better" KPIs (cost, cycle time) flip the logic via config `goodDirection: 'up'|'down'`.
- **Status states:** `on-target` (green check icon + "On target", green-50 badge) · `below-target` (solid `#C25400` badge, white text, ▼ icon, "Below target") · `no-target` (no badge) · `not-measured` (value shows "—", neutral badge "Not measured").
- **Below-target tile:** may add a 3px left border in `#C25400`. The rest of the tile stays white. No full orange fill.
- Never put a name or sentence in the value slot.
- Values truncate with the compact format, never by wrapping. The full value goes in a tooltip and `aria-label` ("Revenue AED 5,170,000, up 22.6% versus May 2026, 103% of target, on target").
- 4 tiles per row on desktop (3 columns each), 2 per row from 768–1279px, 1 per row (or a 2-column compact layout) below 768px.
- Whole tile clickable → filters charts; hover = border `#C3CBD3`; focus = focus ring.

### 3.6 Chart styling rules

**Allowed types on the dashboard:** horizontal bar, vertical bar (column), stacked bar/column (≤ 5 segments + Other), grouped bar (≤ 3 series), donut/pie, KPI tile, bullet bar (bar + target tick, counts as a bar). **Forbidden:** line, area, stacked area, sparkline, flow/sankey/process diagrams, 3D, gradients, radial bars, gauges.

**Bars:**
- Bar thickness: band = 100%, bar = 60–70% of band (`paddingInner 0.3–0.4`).
- Horizontal bars: 16–24px thick. Columns: max 48px wide.
- Grouped bars: 2px gap inside the group, and a 30% band gap between groups.
- Sort: categorical bars sorted descending by value (largest top/left), with "Other" always last. Time is the only exception: months stay chronological, left → right.
- Max categories: 10 bars. Beyond that, show the top 9 + "Other".
- Value labels: always on, 12/500, at the bar end (outside, text-primary). Inside only on dark bars (cat-1, cat-3) and only when the bar is long enough (≥ label width + 8px).
- Axes: the value axis starts at **zero**, always. A 1px `axis-line #C3CBD3` at zero. Axis title with the unit ("Revenue (AED)"). Use 4–5 ticks with compact labels ("0, 75K, 150K, 225K, 300K").
- Gridlines: **horizontal only** for columns (vertical only for horizontal bars, i.e. along the value axis), 1px `#E6EAEE`. No chart border, no background fill.
- Target line: a 1px dashed `text-secondary` reference line with the label "Target AED X". If a bar is below target, colour that bar `#C25400` and add a "Below target" text label.
- Corner radius on bars: 2px max on the value end, 0 at the baseline.

**Donut / pie:**
- Use only for parts of a whole at a single point in time (share of revenue, mix). **Never for time series**, never for comparing across periods, never when values don't sum to a meaningful total.
- Max **5 slices + "Other"** (Other in `#8A949E`, always last, clockwise from 12 o'clock, sorted descending).
- Donut preferred: inner radius 60–65% of outer. Centre shows the **total** (20/600 tabular) with a label below (12/400 secondary, e.g. "Total revenue").
- 2px white separators between slices.
- Direct labels outside each slice: name + value + % (e.g. "Consulting · AED 1.60M · 31%"). The legend is optional when direct labels fit.
- At most one donut per row of cards.

**Legend:**
- Prefer direct labels.
- When a legend is needed: top-left above the plot, single row, 12/400, 10px square swatches (radius 2), in the same order as the series.
- Clicking a legend item toggles the series, with `aria-pressed`.

**Tooltip:** white surface, 1px border-subtle, shadow-floating, 12px text: category, value (full format), % of total, delta vs comparison.

**Never:** 3D, drop shadows on marks, gradients, glow, patterned fills, dual y-axes, truncated axes, rainbow palettes, lime.

**Accessibility:**
- Each chart has an `aria-label` summary ("Revenue by service line, May–Oct 2026. Highest: Business Transformation Consulting AED 1.60M").
- Add a "View as table" toggle.
- Status is never conveyed by colour alone.

### 3.7 Motion

- Data transitions (chat-driven or filter): bars animate length/position over **250ms**, `cubic-bezier(0.2, 0, 0, 1)` (standard ease-out). Donut slices interpolate angles over 250ms. KPI values cross-fade over 200ms (no counting-up tickers).
- Added or removed categories fade in or out over 150ms. Re-sorting animates bar positions over 250ms.
- Chart-type change (e.g. bar → donut from chat): cross-fade 200ms, no morphing.
- Highlight after a chat answer: the target card gets a 2px `blue-600` outline that fades out over 1.5s, and the card scrolls smoothly into view.
- **Forbidden:** bounce, spring overshoot, 3D flips or tilts, parallax, continuous looping animation, tickers/marquees, durations above 400ms.
- `@media (prefers-reduced-motion: reduce)`: all transitions → 0ms (instant swap). The highlight becomes a static outline for 3s.

### 3.8 Chat dock, banners and badges

**Chat dock (desktop ≥ 1280px):**
- Right-side panel, **380px** wide, full height below the app header, white, 1px left border-subtle.
- Open by default on first visit. Collapses to a **48px rail** with a chat icon and the tooltip "Ask BusinessBrain". The state persists per user.
- 1024–1279px: overlay panel 360px with a scrim; the workspace doesn't reflow.
- Structure (top → bottom):
  - Header: "BusinessBrain" 15/600, collapse button, "New conversation".
  - Message list (14/20 body, user messages right-aligned in `#EEF1F4` bubbles, assistant messages unboxed with a 24px avatar).
  - Suggested questions: at most 3 chips, shown only on an empty conversation or after an answer, as a horizontal wrap. Chips: 32px tall, 1px border-subtle, 14/500, radius 999.
  - Input: multi-line, 40px min to 120px max, placeholder "Ask about revenue, pipeline or utilisation". "Ask" is a primary button with the send icon and label; Enter sends, Shift+Enter adds a new line.
- **How a question updates charts:**
  1. The assistant answers with at most 5 bullet points of formatted figures.
  2. If the answer maps to a chart, the dashboard updates in place (§3.7 transition): filter/period applied, or a chart's dimension changed.
  3. The affected card gets the highlight outline and is scrolled into view.
  4. The message ends with a chip "Updated: Revenue by service line" (click = scroll to the card) and an "Undo" link restoring the previous view.
  5. A context pill above the KPI row shows the active chat filter ("Filtered by chat: Sales & BD · May–Oct 2026 ✕").
- If the answer needs a chart type that isn't allowed (trend over time), render it as a column chart by month.
- **Loading:** an assistant message with a 3-line skeleton plus the text "Analysing…". Affected cards show a 2px indeterminate progress bar at the top of the card (no spinners over data). Disable "Ask" while sending. Keep the previous data visible until new data arrives.
- **Empty:** one line, "Ask a question about your business. Charts update with the answer.", plus 3 suggestion chips.
- **Error:** an inline message in the thread, "Couldn't get an answer. Your dashboard hasn't changed." with a "Try again" button. Charts are untouched. Use the neutral style, not orange (orange = KPI below target only).
- **No-match:** "No matching data in the connected sources." plus a suggestion.
- **Tool trace:** collapsed disclosure "How this answer was produced", 12px text-secondary, default closed.

**Banners:** full-width inside the page header, 40px, radius 6. Info = blue-50 bg, `#0B5CAD` icon, text-primary text. Text example: "Sample data — figures are illustrative until live sources are connected." Dismissible per session, except compliance banners.

**Badges:**

| Variant | Background | Text | Icon | Use |
|---|---|---|---|---|
| Neutral | `#EEF1F4` | `#3D4751` | optional | "Sample", "Prototype", "Draft", "Not measured" |
| Info | `#E8F1FB` | `#0B5CAD` | ⓘ | "New", "Live data" |
| Success | `#E8F5EC` | `#1E7B45` | ✓ | "On target", "Running" |
| Below target | `#C25400` (solid) | `#FFFFFF` | ▼ | KPI below target, bottleneck step below target only |

- Sizes: small 20px tall (12/16, padding 0 8px); default 24px tall (12/16, padding 2px 10px). Radius 999. 12px icon with a 4px gap.
- Sentence case. No uppercase, no dots-as-status alone, no black pills, no lime.
- At most one status badge per card header.
- The environment badge ("Prototype") is neutral and sits in the app header, left of the user menu.

**Buttons:**
- Primary: `#0B5CAD` bg, white, 36px tall (32px compact), radius 6, 14/500. Hover `#08467F`.
- Secondary: white bg, 1px `#8A949E` border, text-primary.
- Tertiary: text-only `#0B5CAD`.
- Use one primary per card at most ("Create task" becomes secondary when repeated in lists).

### 3.9 Mobile (< 768px), from `mobile.png`

- App header 56px: hamburger (opens the black sidebar as a drawer, 280px) + page title + environment badge as an icon-only neutral badge with a tooltip. No stacked badges.
- KPI tiles: 2-column compact grid (label 12, value 20/600, delta 12; target hidden behind a tap), or a 1-column list. White tiles.
- Charts: full width, horizontal bars preferred (category labels above the bars when longer than 40% of width). Donut ≤ 200px diameter with the legend below.
- Chat: collapsed bottom bar, 56px (input placeholder + "Ask" button), with chips hidden until the input is focused. Expanded = bottom sheet at 90% height with a drag handle. Remove the separate "Show chat/Hide chat" pill. Respect `env(safe-area-inset-bottom)`.
- Two-column metric pairs like "816,080 / 1,740,000" need units (`816,080 h`, `AED 1.74M`) and stack to one column below 360px.
- Tap targets ≥ 44×44px.

### 3.10 States

- **Loading:** skeleton blocks in `#EEF1F4` matching the final layout (tile: label bar 40% width, value bar 60%, delta bar 30%; chart: 5 grey bars of varying length). Shimmer is allowed only as a 1.5s, low-contrast pulse, and is disabled under reduced motion. Never show "0" while loading.
- **Empty:** card stays, centred 14px text-secondary: "No revenue recorded for May–Oct 2026", plus a secondary action ("Change period").
- **Error (per card):** "Couldn't load this chart." + "Retry". Other cards keep working. Neutral styling with an icon, not orange.
- **Partial / sample data:** neutral "Sample" badge in the card header plus the page banner.
- **Not measured:** "—" plus the neutral "Not measured" badge; no number.
- **Long numbers:** compact format in tiles (`AED 12.4M`); full value in a tooltip and `aria-label`. Long category names truncate with an ellipsis at 24 characters on axis labels, with the full name in a tooltip. Tables wrap names on two lines max.
- **Stale data:** meta line under the page title, "Last updated 11 Nov 2026, 10:45 (UTC+4)".

---

## 4. Acceptance checklist

**Direction**
- [ ] No line, area, stacked-area, sparkline or flow/process diagram anywhere on the analytics dashboard (ceo-chart, revenue-fixes, sales-map checked).
- [ ] `make_chart` / chart renderer only emits bar, column, stacked/grouped bar, donut/pie, bullet bar, KPI.
- [ ] Data colours are only blue and green tokens plus Other grey; lime is removed from the codebase.
- [ ] Orange `#C25400` appears only on below-target KPIs/bars/badges (grep for the token; every usage maps to a below-target condition).
- [ ] Black sidebar `#0B0D10`; workspace `#F5F7F9` with white cards; KPI tiles white.

**Hierarchy and layout**
- [ ] Every page has an H1, a period selector and a currency note; the opaque header doesn't clip content.
- [ ] KPI row is first after the page header; 4 tiles of equal height on desktop.
- [ ] 12-column grid, 24px gutter, spacing only from the 4px scale; card padding 20px, radius 8px, 1px `#DDE2E7` border, no resting shadow.
- [ ] Tool traces and index statistics are absent from the dashboard (moved to chat disclosure / Admin).

**Typography and numbers**
- [ ] Inter (or Segoe UI stack) loaded; `tabular-nums` on all figures.
- [ ] No text below 12px; no uppercase labels or badges.
- [ ] All currency is "AED " prefix; compact in tiles with the full value in a tooltip; units on every figure (h, %, / month).

**KPI tiles**
- [ ] Each tile has label, value + unit, delta with arrow and comparison period, target, status badge.
- [ ] Status is shown by icon + text; below-target uses the solid orange badge with white text.
- [ ] "Not measured" shows "—", never a number.

**Charts**
- [ ] Value axes start at zero; horizontal gridlines only, `#E6EAEE`.
- [ ] Categorical bars sorted descending, ≤ 10 bars, "Other" last; value labels shown.
- [ ] Donuts ≤ 5 slices + Other, centre total, direct labels, not used for time series.
- [ ] Green-bar and light-colour labels sit outside the bar in text-primary.
- [ ] Every chart has an `aria-label` summary and a "View as table" option.

**Motion and chat**
- [ ] Data transitions 200–250ms ease-out; nothing over 400ms; no bounce/3D/looping.
- [ ] `prefers-reduced-motion` makes updates instant.
- [ ] Desktop chat is a 380px right panel collapsible to a 48px rail; it never covers dashboard content.
- [ ] Asking a question updates the matching chart in place, highlights it, scrolls to it, and offers Undo; a filter pill shows the chat context.
- [ ] Chat answers format numbers with units and use ≤ 5 bullets.
- [ ] Loading, empty, error and no-match chat states implemented; errors leave charts unchanged.

**Badges and banners**
- [ ] Only the 4 badge variants exist; environment badge is neutral; no coral or black pills.
- [ ] Single page-level "Sample data" banner; per-card neutral "Sample" badge.

**Mobile and states**
- [ ] Mobile: hamburger drawer navigation, single-line chat bar (56px), 2-column compact KPIs, tap targets ≥ 44px.
- [ ] Skeletons, empty, error, stale and long-number states implemented per §3.10.
- [ ] All text tokens meet the contrast ratios in §3.4 (re-run the contrast script on any new token).
