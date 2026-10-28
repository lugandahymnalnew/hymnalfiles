# Tokens, tiers and page map

Reference for the `hymnal-design-system` skill.

## Palette

| Token | Value | Role |
| --- | --- | --- |
| `--teal` | `#0b5b55` | Primary headings, primary button, meter start |
| `--teal-dark` | `#063f3b` | Gradient end, footer background |
| `--teal-ink` | `#0b3f3b` | Strong emphasis inside cards |
| `--teal-hover` | `#084b46` | Pressed state |
| `--gold` | `#daa520` | Accent button, meter end, 4px section rule |
| `--gold-press` | `#c4931a` | Pressed gold |
| `--gold-light` | `#f4d78a` | Link and eyebrow on dark |
| `--gold-tint` | `#fff6df` | Luganda panel background |
| `--gold-ink` | `#6b4200` | Luganda panel text |
| `--bg` | `#eef3f2` | Page background |
| `--surface` | `#ffffff` | Card surface |
| `--surface-warm` | `#fffdf8` | Feature acknowledgement surface |
| `--surface-tint` | `#f8fbfb` | Payment card surface |
| `--border` | `#d5e2e0` | Card border |
| `--border-input` | `#c5d6d3` | Input border |
| `--border-soft` | `#e3ecea` | Meter track, list separators |
| `--ink` | `#1c2b2a` / `#19302f` | Body text |
| `--ink-2` | `#33413f` / `#4c5d5b` / `#5c6f6d` | Secondary text |
| `--ink-3` | `#7a8a88` / `#647674` | Muted text, timestamps |
| `--ok` | `#1d7a44` | Confirmed |
| `--ok-bg` | `#e8f6ed` | Confirmed badge background |
| `--bad` | `#8b2822` | Error |
| `--bad-bg` | `#fce9e8` | Error badge background |
| `--warn` | `#7a4a00` | Pending |
| `--warn-bg` | `#fff6df` | Pending badge background |
| `--gold-ink-btn` | `#2b1c00` / `#2d2100` | Text on a gold button |

## Type

| Use | Stack | Size | Weight |
| --- | --- | --- | --- |
| Interface | `"Segoe UI", Tahoma, Arial, sans-serif` | 16px base | 400 |
| Interface (admin) | `"Segoe UI", Roboto, Arial, sans-serif` | 16px base | 400 |
| Hymn body | `"Gill Sans", "Gill Sans MT", Calibri, "Trebuchet MS", sans-serif` | 16px | 400, generous line-height |
| Card label | inherits | 13px | 700, letter-spacing 1.2px, uppercase, teal |
| Eyebrow | inherits | 0.72–0.78rem | 900, letter-spacing 0.08–0.11em, uppercase |
| Title | inherits | 0.95–1.08rem | 800 |
| Hero | inherits | `clamp(2rem, 7vw, 4rem)` on Tier B | 800 |
| Stat number | inherits | 20px | teal |
| Footer / meta | inherits | 0.78–0.86rem | 400 |

## Radii, elevation, spacing

- Card radius: 15px (Tier B feature cards), 14px (Tier A cards, admin
  cards), 12px (payment cards), 10px (buttons, stat tiles), 9px (inputs,
  small links), 8px (admin buttons and chips).
- Elevation: `0 1px 3px rgba(0,0,0,.14)` for standard cards;
  `0 5px 18px rgba(26,49,47,.07)` for feature cards;
  `0 12px 26px rgba(0,0,0,.17)` for hero action buttons.
- Hero rule: 4px solid gold under the teal gradient header.
- Luganda panel: 9px vertical, 12px horizontal padding, 4px gold left border,
  right radius 8px.
- Card padding: 16–18px. Card margin: 14px horizontal on Tier A, 18px
  vertical in flow.
- Reading columns: 600px for the donation page, ~760px for content pages,
  980px for the home and admin shells, 880px for hero copy.

## Breakpoints

| Width | Effect |
| --- | --- |
| 390px (phone target) | Single column, full-width buttons, stacked action rows |
| 520px | Compact mode: brand text hidden, home grid to one column, acknowledgement meter hidden |
| 560px | Suggested point to shorten a long hero to one sentence on login |
| 760px | Home grid from three columns to two |
| 820px (tablet target) | Hymn editor switches from side-by-side to language tabs |
| 1440px (desktop target) | Full layout |

## Page to stylesheet to tier map

| Page | Stylesheet(s) | Tier |
| --- | --- | --- |
| `public/index.html` (home) | `style.css`, `home.css`, `donor-thanks.css` | B |
| `public/songs.html` (hymn display) | `style.css`, `donor-thanks.css` | B |
| `public/src/pages/N.html` (hymns 1–251) | `style.css` | B |
| `public/src/pages/abaana.html`, `abaana1.html` | `styleAbaana.css` | A |
| `public/src/pages/mpagila.html` (donate) | `stylepay.css` | A |
| `public/src/pages/agree.html` (terms) | `stylepay.css` | A |
| `public/download.html` | `stylepay.css` | A |
| `public/src/menu.html` | `stylem.css` | A |
| `public/bible.html` | inline / `style.css` family | B |
| `views/feedback/index.ejs` | `donor-thanks.css` | B |
| `views/song-editor.ejs`, `views/song-edits-admin.ejs` | `song-editor.css` | B |
| `views/radio.ejs` | Bootstrap 5.0.2 CDN, `styleWebApp.css` | C |
| `views/dashboard.ejs` | Bootstrap 5.3.2 CDN, Bootstrap Icons 1.11.3 | C |
| `views/addBook.ejs` | Bootstrap 4.5.2 CDN | C |
| `views/donations-admin.ejs` | inline `<style>` with its own `:root` tokens | C |

## Token snippets

Tier A — no variables, values written out:

```css
.hero { color: #fff; background: #0b5b55; border-bottom: 4px solid #daa520; }
.card  { background: #fff; border: 1px solid #d5e2e0; border-radius: 14px; }
```

Tier B — variables allowed:

```css
:root {
  --teal: #0b5b55; --gold: #daa520; --bg: #eef3f2;
  --ink: #1c2b2a; --muted: #5c6f6d; --line: #d5e2e0;
}
```

Tier C — align with the existing admin token set, then move it to a shared
file rather than adding another copy.

## Legacy CSS constraint list for Tier A

Not permitted in `stylepay.css`, `styleAbaana.css`, `stylem.css`:

- `var(--x)` custom properties
- `display: grid` and `grid-template-columns`
- `gap` on a flex container
- `clamp()`, `min()`, `max()` with mixed units
- `dvh`, `svh`, `lvh` viewport units
- `aspect-ratio`
- `:has()`, container queries
- `position: sticky`

Permitted: flexbox layout without `gap` (use margins), float, absolute
positioning, `rem`/`px`/`%`, media queries, transitions, gradients, border
radius, `box-shadow`.
