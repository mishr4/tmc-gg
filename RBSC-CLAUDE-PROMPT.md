# RBSC — Claude control sheet

Paste any of the prompts below to Claude (in the `TMC-Site` repo) to manage the
**Robroadcasting Song Contest (RBSC)** on tmc.gg. This file is the reference;
the prompts at the bottom are copy-paste ready.

---

## What exists

| File | Purpose | URL |
|------|---------|-----|
| `rbsc.html` | Main RBSC site — hero, country selector, video/vote grid, schedule, news teaser | `/rbsc` |
| `rbsc-news.html` | Newsroom — song reveals & announcements | `/rbsc-news` |
| `rbsc-uk.html` | Editorial statement (UK not aired, voting disabled) | `/rbsc-uk` |
| `rbsc-admin.html` | Admin portal — upload performances, manage voting | `/rbsc-admin` |
| `api/rbsc.js` | Voting/performances/config API (CommonJS, in-memory) | `/api/rbsc/*` |
| `flags/*.svg` | Custom Figma flags, named by country slug (e.g. `netherlands.svg`) | `/flags/<slug>.svg` |
| `index.html` | Main tmc.gg site **with the RBSC takeover bar** | `/` |
| `index-default.html` | **Backup of the original main site** (pre-RBSC) — restore to revert | — |

**Branding:** "Mavion News" (news arm of The Mavion Corporation). Fonts:
Plus Jakarta Sans (UI), Archivo Black (big titles), Playfair Display (wordmark).
Colours: cyan `#00D7E2`, blue `#0041E5`, navy `#002BBA`, flag-red `#A51A23`.
Live stream link is always `tmc.gg/songcontest` (redirects to the YouTube live).

---

## The API (`/api/rbsc/*`)

> In-memory — resets on Vercel cold starts. To change the seed permanently,
> edit the `performances` / `votes` / `votingConfig` arrays at the top of
> `api/rbsc.js`. Admin auth = header `x-rbsc-admin-key: demo-key-12345`
> (or the `RBSC_ADMIN_KEY` env var on Vercel).

- `GET /api/rbsc/performances` — list entries
- `POST /api/rbsc/upload` *(admin)* — `{country, broadcaster, artist, song, videoUrl}`
- `DELETE /api/rbsc/performances/:id` *(admin)*
- `GET /api/rbsc/votes` — `{ id: count }`
- `POST /api/rbsc/vote` — `{ country_id }` (rejects closed/paused, disabled entries)
- `GET /api/rbsc/config` — `{ status, endTime, hostCountry, hostCity }`
- `PUT /api/rbsc/config` *(admin)* — set `status` (open/closed/paused), `endTime` (ISO), host info

Each performance supports: `country, broadcaster, artist, song, videoUrl, host`
(host broadcaster), `votingDisabled` + `statementUrl` (blocks voting, links a statement).

---

## Data right now

Countries → broadcasters (flag slug):
- Netherlands → Mavion · 🇳🇱 `netherlands`
- Australia → UBC · 🇦🇺 `australia`
- Sweden → Blue News Broadcast · 🇸🇪 `sweden`
- United Kingdom → Northwest Radio Network · 🇬🇧 `united-kingdom` **(not aired, voting disabled)**
- Austria → Austrian RoBroadcasting Corporation · 🇦🇹 `austria`
- Estonia → ABU Television · 🇪🇪 `estonia`
- Finland → REV · 🇫🇮 `finland`
- Switzerland → SRB Network *(HOST, Zurich)* · 🇨🇭 `switzerland`

Also have flags for: Mexico, El Salvador, Mavion.

Schedule: Semi 1 — Sat 10 Oct 2026; Semi 2 — Sun 11 Oct 2026; Grand Final — Sat 17 Oct 2026 (9:00–10:30 AM). Earlier items (Drawing, Running Order, Turquoise Carpet) are TBA.

---

## Copy-paste prompts

**Add / update a song reveal (news + entry):**
> In TMC-Site, a country just revealed its RBSC entry: **<COUNTRY>** — broadcaster **<BROADCASTER>**, artist **<ARTIST>**, song **<SONG>**. Update `api/rbsc.js` (set the artist/song on that country's entry, or add the entry if missing) and add a news article to the top of the `NEWS` array in `rbsc-news.html`. If we don't have `flags/<slug>.svg` for it, tell me. Commit and push.

**Open / close / schedule voting:**
> In TMC-Site, set RBSC voting to **<open|closed|paused>** and the voting end date to **<DATE/TIME>**. Update the `votingConfig` seed in `api/rbsc.js`. Commit and push.

**Disable voting for a country (with a statement):**
> In TMC-Site, disable portal voting for **<COUNTRY>** in RBSC: set `votingDisabled: true` and `statementUrl` on its `api/rbsc.js` entry, and write/adjust the statement page like `rbsc-uk.html`. Explain why on the page. Commit and push.

**Add a results / standings update:**
> In TMC-Site, post an RBSC news article announcing current standings: <DETAILS>. Add it to the top of the `NEWS` array in `rbsc-news.html`. Commit and push.

**Refresh the main-site takeover:**
> In TMC-Site, update the RBSC takeover bar in `index.html` (the block between `RBSC TAKEOVER START` / `END`) to say: <MESSAGE>. Keep `index-default.html` as the untouched backup. Commit and push.

**Revert the main site to normal (RBSC over):**
> In TMC-Site, revert the main site: copy `index-default.html` back over `index.html` (removing the RBSC takeover bar). Leave the `/rbsc*` pages in place. Commit and push.

---

## Revert cheatsheet (manual)
```bash
# main site back to pre-RBSC
cp index-default.html index.html
git add index.html && git commit -m "Revert main site (RBSC over)" && git push
```
The `/rbsc`, `/rbsc-news`, `/rbsc-uk`, `/rbsc-admin` pages and the API stay available even after reverting the homepage.
