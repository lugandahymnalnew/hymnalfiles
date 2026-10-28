# Component inventory

Reference for the `hymnal-design-system` skill. Reuse these before inventing
a new block; a duplicate component is how the site grew two visual systems.

## `.card` — standard content card (Tier A and B)

White surface, radius 14px, 16–18px padding, soft shadow, 12–18px vertical
margin. The heading inside is the 13px uppercase teal label. Present in both
`stylepay.css` and `home.css` with the same values, so a card looks the same
on the donate page and the home page.

## `.btn` and `.btn--gold`

Full-width block button on Tier A, 13px/16px padding, 10px radius, weight
700, teal background with white text; the gold variant carries dark text
(`#2b1c00`). Active state darkens rather than lifting. Labels name the action
("Pay with MTN Money"), never a generic "Submit".

## `.meter` and `.meter__fill`

22px track in `#e3ecea`, 11px radius, overflow hidden; the fill runs
teal-to-gold horizontally with a 0.8s width transition. The accessible
contract is `role="progressbar"` with `aria-valuemin="0"`,
`aria-valuemax="100"` and a live `aria-valuenow`. The compact acknowledgement
uses a 4px variant of the same idea.

## `.goal__nums` / `.goal__state`

The numbers row carries raised, target and percentage on one flex line with
space between; the state line below carries the remaining amount and donor
count, and switches to an error colour when the summary request fails.

## `.pay` — payment method card

12px radius, `#f8fbfb` surface, `#d5e2e0` border, 14px padding. Title in
bold teal, note text at 14px in `#4c5d5b`. Holds one button plus its
fallback.

## `.wall` — donor list

Unstyled list, rows separated by a 1px `#e3ecea` line, name bold in
`#0b3f3b`, date floated right in 13px muted grey, message on its own line in
italic. The empty row uses the muted colour with a sentence, never a blank
bullet.

## `.lug` — Luganda twin block

```html
<p class="lug">Webale nyo okukozessa oluyimba lunno.</p>
```

Gold-tinted panel with a 4px gold left border, 8px right radius, brown ink.
Always directly beneath its English twin. Used on the donate page and in the
hymnal content style.

## `.topnav__link` — pill navigation link

20px radius pill, 14px font, weight 700, translucent white on dark; the
gold variant carries dark text. Used for "Main menu" and the community link
in the donate hero.

## `.donor-thanks` — shared support acknowledgement

Two modes from one component. Hook: `data-donor-shoutout` on the container,
optional `data-donor-mode="feature"`.

- Base: `min(100%, 760px)` wide, 12px/14px padding, 14px radius, warm
  `#fffdf8` surface, left border 1px teal at 18% opacity.
- `__row`: flex row, mark (40px circle, gold, heart glyph) plus copy plus
  CTA.
- `__mark`: circular, `#f3d77e` background, `#2c2100` glyph, `aria-hidden`.
- `__eyebrow`: "Community supported", teal, 0.72rem, weight 900.
- `__title`: the gratitude sentence.
- `__meta`: percentage plus "every contribution is optional and appreciated".
- `__cta`: teal pill link, white text.
- `__meter` / `__fill`: 4px track with the teal-to-gold fill.
- `--feature`: 18px padding, 5px gold left border, larger title.
- Compact mode (the default): 8px/10px padding, 30px mark, smaller title,
  meter and meta hidden, smaller CTA.
- Under 520px the feature CTA drops to its own line aligned under the mark,
  and the compact row stays on one line.

**Numbers.** The only figure the component shows is the percentage, and it
comes from the public summary endpoint and nowhere else — the same `percent`
field the donate page renders. The compact variant shows no figure at all, and
the goal amount is stated only on the donate page, so no two surfaces can
disagree.

**Failure path.** If the summary request fails, the component renders a static
sentence — "The hymnal is free to use, and stays that way with your support."
— with no meter and no percentage. Never render a 0% card: a page that is not
a donation page must not look broken, and a failed request must not become a
claim about the goal.

**Placements.**

| Screen | Mode | Where |
| --- | --- | --- |
| Home (`public/index.html`) | feature | in the primary column |
| Hymn display (`public/songs.html?song=N`) | compact | after the song list |
| Feedback forum (`views/feedback/index.ejs`) | compact | after the forum content |
| Hymn keypad (`public/src/menu.html`) | none | — |

## `.home-hero` and `.home-*` — home shell

Teal gradient hero with a 4px gold bottom rule, gold kicker text, a title
sized with `clamp()`, a 680px measure for the lead paragraph, and two action
buttons of which one is gold. `.home-grid` is three columns, two under
760px, one under 520px. `.home-card` is a white surface with a 15px radius
and a 1px `#d7e2e0` border.

## Admin components (Tier C)

- `.stat` — a tile with a 20px teal number over a 12px muted label, on a
  `#f6faf9` surface with a 1px border and a 10px radius.
- `.tabs` — a row of chips; the active chip is teal with white text, inactive
  chips are `#eaf1f0` with teal text.
- `table` — full width, collapsed borders, 9px/8px cell padding, 1px
  `#d5e2e0` row separators, 14px font.
- `button` — 9px/14px padding, 8px radius, teal; `.ghost` is an outlined
  teal; `.ok` green, `.bad` red, all with white text.
- `.gate` — a centred panel shown when the admin token is missing or invalid.

### The user admin screen — `views/users-admin.ejs`, at `/admin/users`

The Tier C shell, same tokens as the donations console. Two tabs: **Users** and
**Roles & permissions**.

- Users: a `.stats` row (total, pending, approved, disabled), a filter form
  (search, status, role), the accounts table and a pager.
- Every row can be approved, disabled or re-enabled, and can be given a role
  from a `<select>`. Your own row cannot be demoted or disabled — the controls
  are disabled rather than left to fail.
- Roles: one card per role. Built-in roles show their permissions as pills and
  cannot be edited. A custom role shows its permissions as checkboxes, with
  Save and Delete. The create form takes a name, a label, a description and the
  permissions.
- Under 640px the table turns into stacked cards: each `<td>` carries a
  `data-label` that becomes its label, the name sits on top, and the buttons
  come last. A seven column table on a phone hides the status and the actions
  off the edge otherwise.

**Rules.**

- The counts above the table describe the whole community, not the filtered
  page. Accounts written before the status and role fields existed count as
  pending and as members, the same way the table shows them, so the figures
  always add up to the total.
- Show a loading row while the accounts are on their way, and show the failure
  with a Try again button in the table itself. An empty table with no message
  reads as "there are no accounts".
- The gate closes only for a signed-out visitor or an account without
  `users:manage` and `roles:manage`. Once the screen is open, a failure is
  reported where the admin is looking.
- `GET /api/admin/users` with no query parameters returns every account as a
  plain list, which is what the dashboard asks for. With parameters it returns
  a page plus the counts. Never break the first shape.

