# ROADMAP — Ennyimba Za Kristo donation experience

Status: **phases 1–3 BUILT**, phases 4–7 designed, NOT BUILT — awaiting
phase-by-phase approval.
Prepared: 28 October 2026.
Design source: the five UI skills in `.minimax/skills/` and `~/.minimax/skills/`
(see `docs/ui-skill-set.md`). Findings source: a with-skill vs no-skill
evaluation run against the live application on 28 October 2026.

Each phase below is independently shippable and independently approvable.
Approve them one at a time; a phase is not started until it is approved.

---

## Phase 1 — Protect the money path

**Status: BUILT — 28 October 2026, verified**
**Effort: small–medium (roughly half a day) · Risk: low visually, high in the ledger**
**Driven by: `mobile-money-ux`, `donation-page-ux`**

No layout changes. These are the faults that lose or mis-value a real gift.

| # | Change | Where | Why |
| --- | --- | --- | --- |
| 1.1 | Verify and correct the Airtel dial string | `public/src/pages/mpagila.html:79` | The page ships `*185*1*1*0757035774#`. Airtel Uganda documents `*185# → 1 (Send Money) → number → amount → PIN`, i.e. `*185*1*<number>#`, without the second `1`. Airtel's menu has carried a "Mobile Number / Agent Number" choice, so this needs one test on a live Airtel SIM before it is changed. MTN's `*165*1*1*` shape is correct for MTN and must not be copied. |
| 1.2 | Fix the dialler helper | `public/js/share.js:152-162` | `encodeURIComponent` on the whole USSD string always turns `#` into `%23` — right for iOS, wrong for Android, which accepts the raw `#`. `window.open(..., '_blank')` then opens a blank tab on mobile and `newTab.focus()` throws when a popup blocker intervenes. Use a plain `<a href="tel:...">`. |
| 1.3 | Stop the throttle discarding a paid gift | `routes/donationRoute.js:77-79` | The 5-per-hour IP limit returns 429 **without recording anything**. A donor who has already paid reads that as "my money vanished". Uganda's carrier NAT means unrelated donors share one IP, so the limit hits innocent people. Record the gift as pending, then say so. |
| 1.4 | Remove or support the unconvertible currencies | `public/src/pages/mpagila.html:105`, `modules/donationDb.js:87-89` | The public form offers EUR and GBP; `toGoalCurrency` returns `0` for any currency without a rate. A EUR 50 gift is recorded, increments the donor count, and adds $0 to the bar. |
| 1.5 | Snapshot the FX rate at gift time | `modules/donationDb.js:97-104` | `getSummary()` recomputes every approved gift against the *current* rate, so editing the rate silently revalues the whole history with no audit trail. Store the rate on the gift. |
| 1.6 | Refresh the UGX rate | `modules/donationDb.js:33` | Settings hold `UGX: 3700` against a market rate near 4,390 — roughly a 19% over-credit to the progress bar. Needs a rate source and a review date. |
| 1.7 | Unpin the World Remit link | `public/js/share.js:190` | The link carries `amountfrom=100.00` and a forced USD→UGX corridor with `transfer=bnk`, so every visitor is pre-loaded with a $100 gift and donors paying from another country have no corridor. |

**What was built (28 October 2026):**

| Item | Change made |
| --- | --- |
| 1.1 | Airtel dial string corrected to `*185*1*0757035774#` and its printed steps changed to Airtel's published flow. A live-SIM test is still advised before the next release. |
| 1.2 | `ussd()` now encodes `#` only on iOS and opens the dialler with a plain anchor; `open_link()` no longer calls `focus()` on a blocked popup. |
| 1.3 | The gift is recorded before the throttle is consulted. Over the limit the response is `202` with "we have recorded your gift", never a drop. The limit moved from 5 to 20 per hour. |
| 1.4 | The public currency list is now server-driven (`/api/donations/summary` returns `currencies`), so EUR and GBP are only offered once a rate exists. A gift in a currency with no rate no longer inflates the donor count; it is reported as `unconvertedCount`. |
| 1.5 | Every gift stores the rate it was converted at (`rate`, `goalAmount`, `goalCurrency`). Editing the rate no longer revalues history. A gift whose rate arrives late can be re-valued by the administrator. |
| 1.6 | The default rate moved from `UGX: 3700` to `UGX: 4390` (XE 4391.89, TradingEconomics 4393.20, Investing.com 4382.70, all 28 Oct 2026). The settings screen records when rates were last reviewed. |
| 1.7 | The World Remit link no longer carries `amountfrom=100.00` or forces the USD→UGX corridor. |

Also added: the administrator can set a rate for EUR and GBP as well as UGX, and
the console marks a gift "no rate set" when it is not counting toward the goal.

**Verification:** a money-path test (`npm run test:donations`) covers the
conversion, the no-rate gift, the rate change, the re-value path and the
donor-wall anonymity rules against a mocked database. Live endpoint checks
confirmed the summary payload, the report endpoint, the throttle behaviour
and the admin authorisation. The `donations` and `donationSettings`
collections were empty before this work and were left empty afterwards.

**Acceptance:** a reported gift survives a throttled request; no currency in the
public form converts to zero; editing the rate does not move an old gift; the
Airtel string is confirmed on a live SIM; the World Remit link opens on a
donor-chosen amount and corridor.

**Out of scope:** any change to the page layout or the set of sections.

---

## Phase 2 — Donation page rebuild

**Status: BUILT — 28 October 2026, verified**
**Effort: medium (roughly a day) · Risk: medium — this is the page donors use**
**Driven by: `donation-page-ux`, `mobile-money-ux`**

Reorder the page so the money path comes first, then rebuild each block
against the skills' content rules.

- Section order: goal → payment options → "I have donated" form → recent
  donors → other ways to help → closing note.
- Payment cards: one per rail, each carrying the exact destination, the
  rail's published tariff and where it came from, the operator's real menu as
  a numbered list with the code at every step, a fallback for a button that
  does not open, and what "pending" means for a manual rail.
- Report form: relabel to "I have donated"; amount and currency on one row
  until they cannot share; the reference field explained as helpful rather
  than mandatory; the name opt-in unchecked by default and naming the
  consequence in plain words.
- Donor wall: "Anonymous" by default, a donor's message hidden when they did
  not opt in, "be the first to appear here" instead of an empty list.
- States: the goal card must resolve its loading text on failure rather than
  leaving "Loading progress…" at the top of the page; the wall needs an
  unavailable row.
- CSS stays Tier A: no CSS variables, grid, flex `gap`, `clamp()` or `dvh` in
  `stylepay.css`, because the Android app opens this page from a `file://`
  origin.

**What was built (28 October 2026):**

- **Section order** is now goal → payment options → "I have donated" → recent
  donors → why your support matters → other ways to help → closing. The two
  gratitude cards were merged into one closing card, so the donor is thanked
  once, at the end.
- **Five payment cards**, ordered by how many donors can use them: MTN Mobile
  Money, Airtel Money, Bank transfer (Stanbic), World Remit, PayPal. Each
  carries the exact destination, the button, what to do when the button does
  not open, the fee, and how the gift gets confirmed. MTN and Airtel also
  carry the operator's real menu as numbered steps with the code at every
  step.
- **Published tariffs**, taken from MTN Uganda's Mobile Money Tariffs and
  Airtel Uganda's transaction fees, with the source named on the card: 100
  UGX up to 5,000, 500 UGX to 60,000, 1,000 UGX to 500,000, and the fee taken
  from the sender's balance automatically so the project receives the full
  amount typed.
- **The goal in local money.** The server returns the goal and the raised
  amount expressed in every currency that has a rate, so the card reads
  "About USh 1,317,000 to reach this goal" under "$0 raised of $300", with the
  rate and the date it was reviewed.
- **The bank details are copyable**, with a fallback that selects the text and
  asks the donor to copy it by hand when the clipboard API is missing.
- **The donor wall** states that only donors who asked to be named are named,
  and that no gift amounts are published.

Two faults were found while building it and fixed:

- `share.js` evaluated `pages[Npg]` at the top level, which threw on the
  donate page because only the hymn pages define `pages`. The payment
  functions survived only because function declarations are hoisted, but the
  error stopped the rest of the file from running. The assignment is now
  guarded, and the hymn pages are unaffected because `swipe.js` loads first.
- The copy-details handler was written inside a module wrapper while its
  button called it from an inline `onclick`, which resolves in global scope.
  The button threw "copyDetails is not defined" when clicked.

**Verification:** the section order and the five card titles were checked
against the served page. A Chrome DevTools Protocol run emulated a phone and
measured the document at 390, 820 and 1440 pixels: `scrollWidth` equals
`innerWidth` at every width, with zero elements overflowing. The donate page
console is clean, including after the copy button is used. The home page,
`songs.html` and a hymn page still load, and the money-path test still passes.

**Still open:** the payment cards are in English only, as they were before.
The rationale card kept its existing English and Luganda pair, because
changing one without the other would split the translation. Luganda for the
new payment copy is wanted from the project owner.

**Acceptance:** the page is ordered as above, every state resolves, and the
page still renders correctly inside the app WebView.

---

## Phase 3 — Support acknowledgement across the site

**Status: BUILT — 28 October 2026, verified**
**Effort: small (a few hours) · Risk: low**
**Driven by: `hymnal-design-system`**

One shared component, three placements.

- Feature variant on the home page only.
- Compact variant on the hymn display and the feedback forum, below the
  primary content.
- Nothing on the hymn keypad — the 28 October audit already ruled it out and
  the phone layout has no room without crowding the numeric controls.
- One source for the goal text and the percentage, so no surface can show a
  different number from another.
- The component must degrade to a static sentence when the summary request
  fails, so no non-donation page ever shows a broken card.

**Acceptance:** the three placements render from the existing
`donor-thanks.css` / `donor-thanks.js` with no bespoke banner written.

**What was built (28 October 2026):**

| Placement | Change made |
| --- | --- |
| Home (`public/index.html`) | Unchanged. The feature variant stays in the primary column, where it was already correct. |
| Hymn display (`public/songs.html`) | The compact acknowledgement moved from above the hymn to after the song list, so the gratitude follows the content instead of interrupting it. |
| Feedback forum (`views/feedback/index.ejs`) | The compact acknowledgement moved from between the tabs and the feedback list to the end of the forum content. |
| Hymn keypad (`public/src/menu.html`) | Unchanged. Nothing was added: the keypad is a utility screen and the October audit already ruled it out. |

The component itself was rewritten in `public/js/donor-thanks.js`:

- **The failure path is now a static sentence.** When the summary request
  fails, the card renders "The hymnal is free to use, and stays that way with
  your support." with no meter and no percentage. Before this, a failed request
  produced a card claiming 0% and a 0% meter, which is a broken-looking card
  on a page that is not a donation page.
- **One source for the numbers.** The percentage the acknowledgement shows is
  the same `percent` field the donate page renders, and the compact variant
  shows no figure at all, so no surface can show a number that disagrees with
  another. The goal amount itself is shown only on the donate page, so there is
  one place that states it.
- **One component.** The three placements share the existing
  `donor-thanks.css`; no new stylesheet and no bespoke banner was written.

Two findings from the verification run:

- `public/songs.html` redirects to the keypad unless it is opened with a
  `?song=` parameter, so the acknowledgement is only ever seen in hymn
  display mode. The placement was checked at `/songs.html?song=1`.
- The service worker precaches `/js/donor-thanks.js` and `/songs.html`, so the
  cache name was bumped (`my-website-cache-v6` → `v7`). Without that, a
  returning visitor would keep the old component and the old placement until
  the cache expired on its own.

**Verification:** a Chrome DevTools Protocol run measured all three placements
at 1440 and 390 pixels, and re-ran the two of them with
`/api/donations/summary` blocked to exercise the failure path. The feature card
on the home page shows the meter, the percentage and the call to action; the
compact cards on the hymn display and the feedback forum show the mark, the
gratitude and the call to action with the meter and the meta line hidden, and
sit below the primary content in both cases. With the summary blocked, both
cards render the static sentence with no meter. The console was clean — zero
errors and zero warnings — on every page at every width. Two elements overflow
the viewport: the playback button row on `songs.html` (4 px) and the feedback
tab strip at 390 px, which scrolls horizontally inside its own container. Both
were measured with the acknowledgement removed and are unchanged by it. The
money-path test still passes.

**Acceptance:** the three placements render from the existing
`donor-thanks.css` / `donor-thanks.js` with no bespoke banner written.

---

## Phase 4 — Donor privacy and ethics hardening

**Status: designed, NOT BUILT**
**Effort: medium · Risk: low · Mostly copy and configuration**
**Driven by: `donor-ethics-privacy`**

- Confirm the public summary payload carries no donation amount and no donor
  field beyond name, message and date.
- Consent: specific, unchecked by default, revocable, with the consent text
  and timestamp stored.
- Appeal copy: state the legal identity of the collector, what the money
  buys, and that every gift is optional. No guilt, no countdown, no
  manufactured scarcity.
- Base amount already raised: label it on the public progress instead of
  adding it silently, so the figure is auditable.
- A retention period and a deletion path that also removes a donor from the
  public list.
- Receipt wording for a manual rail, and an accurate tax-deductibility
  statement (or an honest "not tax-deductible").
- Review what the admin screen displays: pagination rather than a full dump,
  redaction on shared screens, and an audit trail on donor record access.

**Acceptance:** a privacy decision table exists for every donor field, with
the mechanism that enforces it.

---

## Phase 5 — Admin moderation console rebuild

**Status: designed, NOT BUILT**
**Effort: medium · Risk: low — internal screen, but it carries the ledger**
**Driven by: `donation-admin-console`**

- Pending first, newest first, with counts per status.
- Row order: amount and currency, then method, then the reference to search
  for in the statement, then the donor name or "Anonymous", then the date,
  then the message.
- Approve is the primary action and shows the new running total.
- Reject requires a reason from a short list.
- Reopen back to pending is a first-class decision.
- Delete is separate, behind a confirmation that names the amount and donor.
- Goal and FX settings in their own panel, showing who last changed them and
  when, with the rate direction stated in the label.
- A failed request must not read as an empty queue.

**Acceptance:** an administrator can reconcile a gift from the row alone, and
every decision leaves a reviewer and a timestamp.

---

## Phase 6 — Design system consolidation

**Status: designed, NOT BUILT**
**Effort: medium–large · Risk: high — touches many pages**
**Driven by: `hymnal-design-system`**

Deliberately last, because it touches the most pages and the hymn playback
flow must not be destabilised by it.

- Move the inline `:root` token block out of `views/donations-admin.ejs` into
  a shared Tier C file, instead of a fourth copy of the palette.
- Unify Bootstrap to a single version across `dashboard.ejs` (5.3.2),
  `radio.ejs` (5.0.2) and `addBook.ejs` (4.5.2).
- One shared public header and layout across the home, index, hymn and
  feedback pages.
- Retire the duplicate and dead stylesheets.

**Acceptance:** one token source per tier, one Bootstrap version, and the
hymn playback path unchanged.

---

## Phase 7 — Test suite and regression guard

**Status: designed, NOT BUILT**
**Effort: small–medium · Risk: low**
**Driven by: the audit's follow-up list**

- Browser-level interaction tests for the donation flow: report → approve →
  summary, including FX rounding, an unknown currency, and a throttled
  report.
- Responsive captures at 390, 820 and 1440 for every touched page.
- A regression pass over hymn playback, the index and the keypad.

**Acceptance:** the money path has an automated test, and the three
breakpoints are captured for each page that changed.

---

## Delivered outside the phases

### User management screen — `/admin/users`

**Status: BUILT — 28 October 2026, verified**

Built on request, not part of the seven phases. The API already existed
(`GET`/`PATCH /api/admin/users`, `GET`/`PUT`/`DELETE /api/admin/roles`,
`GET /api/admin/permissions`) but only the dashboard had a way in, and the
roles and permissions editor had no way in at all.

- Two tabs: **Users** (stats, search, status and role filters, accounts
  table, pager) and **Roles & permissions** (built-in roles shown read-only,
  custom roles editable, a form to create one).
- `GET /api/admin/users` gained optional `q`, `status`, `role`, `page` and
  `limit` parameters. With no parameters it still returns every account as a
  plain list, so the dashboard is untouched.
- The status counts treat an account written before the status field existed
  as pending and before the role field existed as a member, the same way the
  table shows them. Fifteen of the thirty-five accounts were in that state, and
  without it the figures did not add up to the total.
- Under 640px each account becomes a card, so the role, the status and the
  buttons stay reachable on a phone.
- Entry points: a link in the donations console header and an "Open user
  admin" button in the dashboard's User Management section.

Verified against a test admin account: 22 API checks, then the screen itself
in a browser at 1200px and 390px with a clean console and no overflowing
elements. The test accounts and the test role were removed afterwards.

**Acceptance:** an admin can find an account, approve or disable it, change
its role, and create a role with a set of permissions, without touching the
database.

---

## Ordering rationale

Phases 1 and 2 come first because they are the donation path itself, and
Phase 1 precedes Phase 2 because correcting the ledger before redesigning
the page means the redesign is built on numbers that are right. Phase 3 is
small and makes the rest of the site feel coherent. Phases 4 and 5 are
internal-facing and carry no live-donation risk. Phase 6 is last because it
is the widest change and the least urgent. Phase 7 runs as a final gate,
and its money-path test should also be run at the end of Phase 1.

## Open decisions

1. The Airtel dial string was corrected to `*185*1*0757035774#` on 28 October
   2026, following Airtel Uganda's published flow. Someone with an Airtel
   Uganda line should still run it once on a live SIM and confirm it reaches
   the number-entry step before the next release.
2. The UGX rate now has a source (mid-market, 28 October 2026) and is
   snapshotted per gift. It still wants a monthly look, and the settings
   screen records when it was last reviewed.
3. The two MTN and Airtel numbers are personal numbers, not merchant
   accounts. The reconciliation and deactivation risk follows from that, and
   the roadmap does not change it.

---

## Backlog

### Global anchor rule in `public/style/style.css`

**Status: designed, NOT BUILT**
**Effort: medium · Risk: high — touches all 251 hymn pages**

`style.css:118` sets `a { width: 100%; display: block; margin: 0 auto; }` for
every link on the site. Any page that loads `style.css` and forgets to reset
the width gets full-width anchors. This is what turned the home page nav into
two circles on 28 October 2026: the brand name took 405px of the 558px row, the
links were squeezed, "Get the app" broke over three lines, and the 999px radius
rendered both as circles.

The home page now resets the width on `.home-brand` and `.home-nav__links a`,
next to the existing resets on `.home-action` and `.home-card`. The other
pages that load `style.css` have not been swept.

The fix is not to change the global rule — 251 hymn pages depend on the current
behaviour — but to find every selector that overrides `width` for an anchor
and give it the same explicit reset. The hymn pages were measured on
28 October 2026 and their headers are intact; the one remaining horizontal
overflow on the site is the sticky playback button row (`.btn_cont`, 4px),
which is pre-existing and unrelated to the anchor rule.

**Acceptance:** every anchor on every page that loads `style.css` is either
visibly full-width by design or has an explicit width, and no page has an
unintended horizontal scroll.
