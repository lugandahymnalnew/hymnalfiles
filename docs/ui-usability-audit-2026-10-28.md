# Ennyimba Za Kristo web usability audit

Date: 28 October 2026
Scope: public home, hymn keypad, hymn index, hymn display, donations, feedback, login and download; desktop, tablet and phone layouts.

## Method

The review used the running local application with production-shaped MongoDB data. Representative pages were rendered at 1440×900 (desktop), 820×1180 (tablet) and 390×844 (phone). The audit checked navigation, hierarchy, readability, touch access, responsive flow, feedback states, data density and whether the main action of each page is obvious.

The 390px headless browser capture can retain a wider CSS layout than a real emulated phone, so the report treats visible clipping as a warning and confirms it against the CSS rules rather than relying on the image alone.

## Executive summary

The site has useful features and generally short task paths, but it had grown as several separate visual systems. Before this work, the donation and account pages felt modern while the home, index and hymn player still looked like utility screens. The largest usability cost was not colour or decoration; it was inconsistent navigation, different spacing rules on every page, and desktop-oriented rows/actions that became difficult to scan on a phone.

Baseline scores before the changes in this branch:

| Device | Score | Main reason |
| --- | ---: | --- |
| Desktop | 6.4 / 10 | Core tasks worked, but the home and hymn page used space poorly and lacked a shared hierarchy. |
| Tablet | 6.1 / 10 | Readable, but several pages stayed phone-narrow or desktop-wide instead of adapting to the middle size. |
| Phone | 4.9 / 10 | Index columns, action rows and long header actions competed for width; navigation patterns changed between pages. |

The changes in this branch address the highest-impact issues, but a complete visual unification should still be done incrementally so the dependable hymn playback flow is not destabilised.

## Page-by-page findings

### Home

Before: the page was a vertical list of similarly styled links, with a large decorative side rail on desktop and no concise explanation of what the product does. The donation action had the same weight as terms and adverts. On desktop, most of the screen was unused.

Now: the home page introduces the hymnal, gives the two primary actions first, groups secondary destinations into cards and presents one transparent community-support panel. Desktop space is used without turning the page into a dashboard; phone actions become full-width touch targets.

Remaining recommendation: move the app version to a release/about area rather than making it permanent homepage copy.

### Hymn number keypad

Strengths: large targets, clear numeric mental model and an obvious Open action. It is one of the easiest interfaces in the site for older users.

Issues: the header previously tried to fit Main menu, Jump to Hymn, Index and Children Songs into one phone row. The page also prevents vertical scrolling, so any future content inserted into the keypad must be very compact.

Change: the redundant centre title and duplicate Index link are hidden at phone width, preserving Main menu and Children Songs. Donation promotion is intentionally not inserted into this task-focused screen.

### Hymn index

Before: a five-column desktop row was reused on phones. Titles, category and composer competed for width, producing horizontal clipping and hard-to-follow rows. Children and adult records were visually similar even though their metadata differs.

Change: desktop keeps a structured multi-column row; phone uses a three-column card with number, title, category and a second metadata line. Time-signature details are hidden on phone because they are secondary to finding the hymn. A compact support acknowledgement appears above the list.

Remaining recommendation: add explicit Adult / Children filter chips. Search already includes both collections, but the first screen is dominated by children's songs and does not explain the ordering.

### Hymn display

Before: the song text occupied a narrow centre column on desktop while most of the screen was empty. The generated action buttons could run off the phone edge. “Report Error” opened an email flow rather than the community correction workflow.

Change: the action row is horizontally reachable on narrow screens, default lyric line-height is improved, and “Suggest edit” opens the exact current hymn in the structured editor. The support acknowledgement uses a compact variant so it does not compete with the lyrics.

Remaining recommendation: replace text-only playback controls with a single consistent player component when the planned web playlist/player is implemented.

### Donation page

Strengths: strongest existing information hierarchy; a narrow reading column works well on desktop and tablet; payment choices and progress are separated; Luganda translations are visually distinct.

Issues: the explanatory copy is long before payment options on phone. The goal currently reads as a platform-development goal, so future goals should include a date or short update to signal that the information is current.

Recommendation: keep the progress card first, then show payment options, recent supporters, and the longer rationale. Never insert a donation modal into hymn reading or playback.

### Feedback forum

Strengths: pagination, compact cards and separate issue types make a large dataset manageable. Anonymous participation lowers friction.

Issues: on phones, two primary creation actions plus four tabs create a crowded first viewport. The forum also had no obvious route back to the main hymnal.

Change: Main menu is restored, action buttons stack at narrow phone widths, and the support acknowledgement is compact. The existing horizontal tab strip remains appropriate for four filters.

Recommendation: once structured edits are established, label the existing forum action “Discuss a hymn issue” so users understand that direct text correction happens in the editor and broader discussion stays in the forum.

### Login and download

Strengths: these pages now share the teal/gold language, explain the app, and use clear single-column forms/cards. Tablet layout is especially good.

Issues: login places a long product explanation before the form on phones. That is useful for first-time visitors but slows returning users.

Change: phone flex children can shrink and wrap safely. Recommendation: on screens below 560px, shorten the hero to one sentence and place benefits below the form.

## Donation appeal and donor recognition

The design goal is gentle, ethical visibility rather than manipulation.

Implemented principles:

- Use gratitude and concrete project progress, never guilt or countdown pressure.
- Show names only when a donor opted in; otherwise use Anonymous.
- Never publish an individual donation amount.
- Keep the action optional and dismiss the idea of obligation in the copy.
- Use one feature card on the home page and compact acknowledgements on the index, hymn display and feedback forum.
- Keep the keypad free of fundraising content because it is a focused utility screen.
- If the summary API is unavailable, render a stable generic support message instead of leaving “Loading…” visible.

The reusable component reads `/api/donations/summary`, thanks up to two opted-in recent donors, shows the overall percentage and links to the existing donation page.

## Luganda and English hymn structure

Read-only production-shaped analysis found:

| Collection | Records | Main title field | Lyrics field | Shape |
| --- | ---: | --- | --- | --- |
| `luganda` | 251 | `song` (plus `EngTit`) | `lyrics` | Object keyed by `stanza N` / `chorus N`; each value is an array of lines. |
| `english` | 252 | optional `title` | `english` | Object keyed by `stanza N` / `chorus N`; each value is an array of lines. |

Luganda metadata is consistent across all 251 records: `An`, `EngNo`, `EngTit`, `composer`, `doh`, `lyrics`, `number`, `signDown`, `signUp`, and `song` are present.

Important differences and data-quality findings:

- The collections have no duplicate hymn numbers.
- English has one additional record, number `600`, with no Luganda partner.
- 32 English records have no `title`: hymns 1–30 (including `12a`) and 600. For those records, the editor shows the Luganda record's `EngTit` as a suggestion but does not silently copy it.
- Luganda contains 1,107 lyric-line arrays across its sections; English contains 1,113.
- Eighteen English lines contain legacy `<b>` markers spanning chorus lines. The editor preserves this convention but rejects every other HTML tag.
- Section names are regular enough for a field-level editor: `stanza 1`–`stanza 7` and `chorus 1`–`chorus 5` cover the observed data.

## Structured hymn editor

Implemented workflow:

1. “Suggest edit” opens `/hymns/:number/edit` for the exact main-hymnal song.
2. Desktop displays Luganda and English side by side; tablet and phone use language tabs.
3. Users can edit title/metadata fields and any existing lyric line independently.
4. Only fields whose value changed are included in the proposal.
5. The user reviews a before/after diff and can add a note.
6. The editor is restricted to approved accounts whose role grants `songEdits:read` and `songEdits:submit`; ordinary members and signed-out visitors cannot load hymn edit data or submit proposals.
7. Administrators assign database-backed roles from the user dashboard; custom reviewer roles can be added without changing route middleware.
8. Proposals are stored in `newHymnal.songEdits` with status `pending`.
9. `/admin/song-edits` shows exact diffs. Approval re-reads the live hymn and compares every original value.
10. If any source text changed after submission, the proposal becomes `conflict` instead of overwriting newer data.
11. Successful approval updates only the proposed MongoDB paths and adds `updatedAt`.

Version-one boundaries are deliberate: it edits existing lines and scalar fields, but does not yet add, delete or reorder stanzas/choruses. Structural edits should be a separate reviewed operation because an accidental line deletion is harder to detect than a replacement.

## Priority follow-up

1. Add Adult / Children filters to the combined index.
2. Add a dashboard link and count for pending song edits.
3. Add a “view current hymn” preview inside the admin review page.
4. Add controlled operations for adding/removing/reordering sections after the replacement workflow has real moderation history.
5. Unify page headers and typography through one shared public layout, without rewriting the playback implementation at the same time.
6. Add browser-level interaction tests when a maintained browser automation dependency is introduced.

## Verification completed

- Node syntax checks for all new server and browser JavaScript.
- EJS render checks for public editor and admin review pages.
- Local route smoke tests for home, menu, index, song, feedback, editor, donation summary and admin shell.
- Expected 400 response for an empty edit proposal, with no database write.
- Expected 401 response for an anonymous admin queue request.
- Isolated in-memory tests for role-gated proposal creation, approval, exact path updates, stale-data conflict detection, invalid paths and hymn `12a` support.
- Responsive visual captures for the core pages and the editor at desktop, tablet and phone sizes.
