# UI skill set

Professional UI/UX skills installed for this project. They are skills, not
code: loading one gives a model the design rules, the component vocabulary and
the failure modes for that kind of work. Nothing here changes the running app
until a skill is applied to it.

## Where they live

| Skill | Scope | Path |
| --- | --- | --- |
| `donation-page-ux` | global | `C:\Users\ADMIN\.minimax\skills\donation-page-ux\` |
| `mobile-money-ux` | global | `C:\Users\ADMIN\.minimax\skills\mobile-money-ux\` |
| `donor-ethics-privacy` | global | `C:\Users\ADMIN\.minimax\skills\donor-ethics-privacy\` |
| `donation-admin-console` | global | `C:\Users\ADMIN\.minimax\skills\donation-admin-console\` |
| `hymnal-design-system` | this repo | `.minimax/skills/hymnal-design-system\` |

Global skills are reusable on any donation-based site. `hymnal-design-system`
is repo-specific: it carries this site's palette, the CSS tier rules and the
page-to-stylesheet map, so it travels with the code.

## Which one to load

| Situation | Skill |
| --- | --- |
| Building or reviewing the public donate page | `donation-page-ux` |
| Payment step, mobile money, USSD, remittance, bank transfer | `mobile-money-ux` |
| Donor privacy, consent, disclosure, complaint handling | `donor-ethics-privacy` |
| The admin queue that approves reported donations | `donation-admin-console` |
| Any new page or component that must look native | `hymnal-design-system` |

They compose. A change to the donate page usually needs `donation-page-ux`
plus `hymnal-design-system`; a change to how a rail is presented adds
`mobile-money-ux`; anything that publishes donor data adds
`donor-ethics-privacy`.

## The two facts that are easiest to get wrong

Both are recorded in `hymnal-design-system`, and both have already cost
time in this repo.

1. **The donate page is Tier A (WebView-safe).** `src/pages/mpagila.html`,
   `src/pages/agree.html` and `download.html` load `stylepay.css`, and the
   Android app opens them from a `file://` origin inside a WebView. CSS
   variables, grid, flex `gap`, `clamp()` and `dvh` do not work there. The
   rest of the site is Tier B and uses them freely.

2. **A donor's amount is never public.** The public summary endpoint must not
   carry it. The donor list shows opt-in names only, and everything else
   reads "Anonymous".
