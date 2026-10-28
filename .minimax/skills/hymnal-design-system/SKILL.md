---
name: hymnal-design-system
description: |
  Apply the Ennyimba Za Kristo hymnal site's visual language to any page or
  component: the teal and gold palette, the type scale, radii, the two CSS
  compatibility tiers (WebView-safe legacy versus modern web), the English and
  Luganda bilingual block treatment, the shared support-acknowledgement
  component, and the rule that donation content must not interrupt reading or
  playback. Use this skill when the user asks to "style it like the rest of
  the site", "match the home page", "make this page consistent", "add a
  card/button/meter", "add the Luganda translation", or asks where a new
  component belongs in the hymnal. Do NOT use it for the donation flow logic
  or donor wall rules (use donation-page-ux), for admin moderation screens
  (use donation-admin-console), or for a different project or brand.
---

# Hymnal Design System (Ennyimba Za Kristo)

## Inputs to collect

- The target file and which CSS tier it belongs to. The tier determines which
  CSS features are legal in that file, and guessing wrong means shipping a
  page that breaks inside the Android app.
- Whether the page is reachable from the Android app's WebView, or only from
  a browser.
- Whether the surface is a utility screen (keypad, index search, player), a
  content screen (hymn, feedback thread, editor), a landing screen (home), or
  a transactional screen (donate, login, download).

## Procedure

### 1. Identify the CSS tier before writing any style

The site runs on three rendering targets with different CSS capabilities. The
tier is a property of the file, not a preference.

| Tier | Target | Legal CSS | Files |
| --- | --- | --- | --- |
| A — WebView-safe | Pages the Android app loads from `file:///android_asset` | No CSS variables, no grid, no `gap`, no `clamp()`/`min()`, no `dvh`, no flexbox `gap`. Floats and margin-based fallbacks. | `stylepay.css`, `styleAbaana.css`, `stylem.css` |
| B — Modern web | Pages opened in a real browser | CSS variables, grid, flex `gap`, `clamp()`, `min()` all fine. | `style.css`, `home.css`, `donor-thanks.css`, `song-editor.css` |
| C — Bootstrap | Admin and tool screens | Bootstrap classes plus a small inline token block. | `views/dashboard.ejs`, `views/radio.ejs`, `views/addBook.ejs`, `views/donations-admin.ejs` |

Tier A pages today: `src/pages/mpagila.html` (donate), `src/pages/agree.html`
(terms), `download.html`.

Reason the rule matters: the donation page is reachable from inside the
Android app, whose WebView serves it from a `file://` origin. A page that
uses `var(--teal)` or `gap` renders unstyled or misaligned there while
looking perfect in Chrome. The file header comment in `stylepay.css` states
this constraint; keep that comment when editing the file.

If a change must serve both tiers, split it: Tier A markup with a Tier A
stylesheet, and Tier B markup with a Tier B one. Do not mix tiers inside a
single file, and do not add a Tier B stylesheet to a Tier A page.

### 2. Use the existing palette; do not introduce new hues

The brand is teal plus gold. Reuse these exact values so a new component
looks like the site rather than like a different product.

| Role | Value | Used for |
| --- | --- | --- |
| Teal primary | `#0b5b55` | Headings, primary buttons, meter start |
| Teal deep | `#063f3b` | Gradient end, footer background |
| Teal ink | `#0b3f3b` | Strong body emphasis |
| Teal hover | `#084b46` | Pressed primary button |
| Gold | `#daa520` | Accent, primary-emphasis button, meter end, card border |
| Gold deep | `#c4931a` | Pressed gold button |
| Gold light | `#f4d78a` | On-dark link and eyebrow text |
| Gold tint | `#fff6df` | Luganda block background |
| Gold ink | `#6b4200` | Luganda block text |
| Page | `#eef3f2` | Body background |
| Surface | `#ffffff` | Cards |
| Surface warm | `#fffdf8` | Feature acknowledgement card |
| Surface tint | `#f8fbfb` | Payment card |
| Border | `#d5e2e0`, `#c5d6d3`, `#e3ecea` | Card and field borders |
| Ink | `#1c2b2a`, `#19302f` | Body text |
| Ink secondary | `#33413f`, `#4c5d5b`, `#5c6f6d` | Supporting text |
| Ink muted | `#7a8a88`, `#647674` | Timestamps, hints |
| Success | `#1d7a44` | Confirmed states |
| Danger | `#8b2822` | Errors |
| Warning ink | `#7a4a00` | Pending states |

A gold button carries dark text (`#2b1c00` / `#2d2100`); a teal button carries
white text. Getting that pairing wrong is the most common visual defect in
new components.

### 3. Type and spacing

- Interface text: `"Segoe UI", Tahoma, Arial, sans-serif` (donate page) or
  `"Segoe UI", Roboto, Arial, sans-serif` (admin). Hymn page body text uses
  `"Gill Sans", "Gill Sans MT", Calibri, "Trebuchet MS", sans-serif` and
  keeps its own rhythm because it is a reading surface.
- Body size 16px, line-height 1.5. Lyric line-height stays generous: the
  hymn page improved readability by raising it, so do not compress it back.
- Section labels inside cards: 13px, weight 700, letter-spacing 1.2px,
  uppercase, teal. This is the site's most recognisable small-type signature.
- Radii: 15px for cards on Tier B, 14px for cards on Tier A, 10px for
  buttons, 9px for inputs and small links, 8px for compact chips.
- Elevation is a single soft shadow: `0 1px 3px rgba(0,0,0,.14)` for cards,
  `0 5px 18px rgba(26,49,47,.07)` for feature cards. Avoid heavier shadows.

### 4. Breakpoints

- 520px — compact mode. Brand text hides, grids collapse to one column,
  buttons go full width, feature cards drop the meter.
- 760px — the home grid drops from three columns to two.
- 390px (phone), 820px (tablet), 1440px (desktop) are the three widths the
  usability review measures. Check new work at all three; a change that only
  passes at 1440px usually fails at 390px.

The content pages use a reading column, not a full-bleed layout: the hymn
page and the feedback forum both cap the text at roughly 760px, and the
donation page caps at 600px.

### 5. Treat Luganda as a designed twin, not a translation block

Every user-facing string that matters appears twice: English first, then the
Luganda version in the `.lug` block — a warm gold-tinted panel with a 4px gold
left border, 9px/12px padding, and brown ink. It sits directly under its
English twin, never in a separate tab or a lower page, so the reader gets both
without hunting.

The same pattern applies to card headings in the style of `.pay__title` and to
the eyebrow above the support acknowledgement ("Community supported").

### 6. Use the shared support acknowledgement rather than writing a new one

`style/donor-thanks.css` plus `js/donor-thanks.js` implement one component in
two modes, injected into any element carrying `data-donor-shoutout`, with
`data-donor-mode="feature"` for the larger variant.

- Feature mode: the home page only. Mark, eyebrow, title, meta line,
  meter, CTA.
- Compact mode: content pages. Mark, title, CTA link. No meter, no meta.
- The script fetches the public summary once and renders every target, and
  falls back to a static acknowledgement when the request fails, so no
  non-donation page ever shows a broken component. The fallback is a plain
  sentence with no meter and no percentage — never a 0% card.
- The percentage it shows is the same `percent` field the donate page
  renders, and the compact variant shows no figure at all, so two surfaces
  can never report different numbers.
- The compact acknowledgement belongs *after* the primary content, not above
  it: gratitude follows the thing it is thanking people for.

When a new page needs a donation mention, add the data attribute and import
the two assets. Writing a bespoke banner produces the second visual system the
usability review set out to remove.

### 7. Place donation content by screen type, not by availability of space

| Screen type | Donation surface |
| --- | --- |
| Home | Feature acknowledgement card, in the primary column |
| Content (hymn, feedback thread, editor) | Compact acknowledgement, after the primary content |
| Utility (keypad, index search, player) | None |
| Transaction (donate, download, login) | The full donation page is its own destination |
| Admin | The moderation console, a separate screen entirely |

The keypad rule exists because that screen already has a dense row of
controls and a task the user came to complete. Inserting a panel there cost
the review its rating on phone. The general principle: a page the user
opened to do something else gets gratitude, not an ask.

### 8. Hold the accessibility floor

- Every control has a label; icon-only controls carry an accessible name.
- Progress meters are real `progressbar` elements with a live
  `aria-valuenow`, and the same percentage exists as text.
- Status changes are announced through a live region.
- Colour never carries the only signal; pair it with a word or icon.
- Focus is always visible. Do not strip the outline.
- Touch targets are at least 44px on a phone.

### 9. Keep the stylesheet boundaries honest

- Tier B stylesheets define their own tokens in `:root`; Tier A stylesheets
  hard-code values, because variables do not work there.
- `views/donations-admin.ejs` currently carries its own inline `:root` token
  block that duplicates the palette. When touching it, prefer moving those
  tokens into a shared Tier C file rather than adding a fourth copy.
- Bootstrap is loaded at three different versions across three files (5.3.2
  in the dashboard, 5.0.2 in radio, 4.5.2 in addBook). Do not add a fourth
  version, and do not add a Bootstrap CDN link to a public page — it breaks
  the Tier A rule and costs a large download on the donation page.

## Output contract

- The change expressed in the tier of the file it lands in, with the tier
  stated in the summary.
- Only existing palette values, type sizes, radii and shadows.
- Reuse of the shared acknowledgement component instead of a new banner.
- A note of which screen types the new surface appears on, so its placement
  can be checked against the table in step 7.

## Failure handling

- If a page's tier is not recorded in the code, infer it from the stylesheet
  it loads and state the inference; do not assume the browser tier because
  the page also works in a browser.
- If a new page is needed under `public/src/pages/`, remember that
  `public/src/` is listed in `.gitignore`. The existing pages are already
  tracked and stay that way, but a newly added file under that path is
  ignored by default and needs an explicit `git add -f`. A page that never
  reaches the repository never reaches the deployed site.
- If a new colour seems necessary, check whether an existing role covers it
  before adding one; a new hue in a Tier A file needs the hex repeated
  literally because there are no variables.
- If a layout cannot be expressed in Tier A, degrade to a stacked
  single-column flow rather than reaching for grid.
- If a request would put a donation panel on a utility screen, say what the
  usability review concluded about that placement and offer the compact
  alternative instead.

## Examples

Input: "Add a support banner to the hymn keypad page so people can donate."

Output: not on the keypad. That screen is a focused utility — the review
already ruled it out and the phone layout has no room without crowding the
numeric controls. The compact acknowledgement is the right surface, and it
belongs on the hymn display and the feedback thread instead. It ships as
`<div data-donor-shoutout></div>` plus the two existing assets, with no new
CSS and no markup copied.
