# TMC Media — Design System ("Deep Channel")

**A reusable prompt.** Paste the block below into an AI (or hand to a designer/dev) to build any TMC Media surface — the site, episode pages, the podcast microsite, social cards. TMC Media is the youthful, modern sibling of the corporate Mavion system (`DESIGN-SYSTEM.md`): where tmc.gg is a quiet near-black serif newsroom, TMC Media is a **premium streaming-app product surface** — deep blue space, one electric blue, a live podcast that feels like it's *currently playing*. Copy from `--- PROMPT START ---` to `--- PROMPT END ---`.

---

--- PROMPT START ---

Design and build **[PROJECT NAME]** for **TMC Media** — a radio / television / interactive-media network whose flagship is **Inline Television** (never "Inline TV") and whose hero product is **INL @ RMC**, a podcast broadcast LIVE from the Robloxian Media Conference. The design language is **DEEP CHANNEL**: a next-generation streaming/audio app surface — think Spotify or Apple Music rebuilt with more restraint and a stronger blue identity. Deep immersive blue-black space, cinematic scale, a persistent player dock pinned to the bottom, and layered flat surfaces (never glassmorphism). The page should feel like a premium product you can *press play* on, not a marketing page. The audience is the Roblox media community: young, extremely online, design-literate.

## Non-negotiable rules
- **Blue is the identity, not an accent.** Every "black" on the page is actually a deep blue. One electric blue (`#3B6DFF`) carries all brand energy — buttons, the play affordances, live accents, geometric art. It should be unmistakably a *blue* product.
- **No gradients as decoration.** Flat fills only. Depth comes from layered solid surfaces (`--bg` → `--surface` → `--surface-2` → `--surface-3`) and hairline borders, never from gradient washes. (Soft single-color radial glows behind a hero play button at very low opacity are the one tolerated exception — use sparingly, never a purple→blue hero gradient.)
- **No glassmorphism content cards, no purple, no emoji, no colored left-border callouts.** A sticky header / dock may use `backdrop-filter` blur (that's a system chrome bar, not a card); content cards are solid.
- **The network is on air.** A persistent bottom **player dock** shows INL @ RMC with a live badge, an animated equalizer, and a ticking clock. Live state reads as a small red dot that hard-blinks (`steps(2)`), used only in live badges — everywhere else is blue or greyscale-blue.
- **Break the template tells.** No three-identical-rounded-cards feature grid (use an asymmetric bento). No lonely single card in an empty multi-column grid (feature it). No smooth ease-out count-up (zero it first, hard-step it). No AI-startup Inter-on-dark sameness.

## Color tokens
```
--bg:        #060B1D   /* page — deep blue-black */
--bg-deep:   #040814   /* announce bar, videos band, footer */
--surface:   #0C1329   /* cards */
--surface-2: #121B3A   /* card hover, raised */
--surface-3: #182450   /* art tiles, thumbnails */
--line:      rgba(148,170,255,.11)   /* hairlines */
--line-soft: rgba(148,170,255,.07)

--ink:   #F2F5FF   /* headlines */
--body:  #B7C2E4   /* body */
--muted: #7E8BB8   /* secondary */
--faint: #5A6690   /* labels, meta */

--blue:      #3B6DFF   --blue-hot: #5F89FF   --blue-deep: #2549C7   /* THE brand */
--blue-glow: rgba(59,109,255,.35)   --blue-tint: rgba(59,109,255,.12)
--live:      #FF4545   /* live dot ONLY */
```
Contrast: `--body` on `--bg` and white on `--blue` both pass AA for text.

## Type system (two fonts)
Google Fonts: `family=Space+Grotesk:wght@400;500;600;700&family=Instrument+Sans:ital,wght@0,400..700;1,400`
- **Space Grotesk** — the display + UI-furniture voice. Headlines (weight 700, tracking −0.02em), stat numerals (`font-variant-numeric: tabular-nums`), kickers/labels (uppercase, ~0.7rem, tracking 0.14em), button labels, nav. It's geometric, modern, and youthful without being a gimmick.
- **Instrument Sans** — body copy, descriptions, meta. 400–500, line-height ~1.6.
- No serif, no monospace, no Fraunces (that's the parent company's).

## Shape, depth, motion
- Radii: small **10px**, default **16px**, large **22px**, pills **999px**. Everything is comfortably rounded (this is the biggest visual break from a "sharp Swiss" look — rounded = modern app).
- Depth: solid `--surface` cards on `--bg` + a `--line-soft` border; hover lifts `translateY(-4px)`, brightens to `--surface-2`, border to `--line`. Deep soft shadows only on the hero cover, the listen card, and the play buttons (`0 …px … var(--blue-glow)`).
- Motion: ease **`cubic-bezier(.16,1,.3,1)`**. Scroll-reveal (opacity + 18px rise, ~0.7s, IntersectionObserver once). Play buttons scale on hover. The hero cover "breathes" (slow translateY). Equalizer bars animate `scaleY` on loop. The live dot blinks with `steps(2)` (a hard tick, not a soft pulse). Always honor `prefers-reduced-motion` — freeze all loops, disable reveals.
- All decorative art is **flat-blue CSS geometry** (discs, pills, rounded rectangles clipped inside `overflow:hidden` tiles) — there are no photos. Cover art, story thumbnails, and video thumbnails are all built this way, in the same visual family.

## Page composition
- **Announce bar** (`--bg-deep`): a small blue `NEW` pill + the podcast line + a "See episodes →" link.
- **Header** (sticky, blurred): play-mark logo + "TMC Media", centered nav, a blue "Listen live" pill. Hairline appears on scroll.
- **Hero** (two columns): left = live badge (red dot), huge headline with the `@` in `--blue-hot`, lede, a primary "Listen free" (play icon) + ghost "See episodes", availability note. Right = a **cover-art card** built from flat CSS (a blue disc, a "NOW PLAYING"-style label, INL @ RMC title, an equalizer) that slowly breathes.
- **Stories** — an **editorial bento**: one large featured card (tall art on top) beside a stacked list of two compact rows (square art tile + title + meta). Not three identical cards. A quiet mono "Manage ↗" staff link in the section head.
- **Videos** (`--bg-deep` band): All / Latest / Popular segmented control, then a **featured video** — a large 16:9 player card (big play button, "Latest" tag, duration chip) beside an info panel (channel avatar monogram, title, description, "Watch now", "more coming" note). Never a single lonely card floating in a 3-column grid.
- **What we do** — an **asymmetric bento**: feature **Radio & Podcasts** full-width on top with an inline "now playing: INL @ RMC, live" mini-widget (equalizer) that ties back to the hero; Television and Interactive Media as two tiles below. Each tile: index number (01/02/03), blue icon tile, title, copy, a "→" learn-more affordance that shifts to `--blue-hot` on hover.
- **Listen live** — a large feature card: live badge, "Tune into INL @ RMC", tags (Live now / Podcasts / 24/7 radio), and a big circular play button ("Start listening / Free · no sign-up") with a soft blue glow.
- **Stats** — one unified band (single `--surface` card) split by hairline dividers: four figures (Space Grotesk, tabular numerals) with blue-dot labels. Count up once on scroll — zero the value first, hard-step the increment (never smooth). No-JS/reduced-motion keeps the final values in markup.
- **Footer** (`--bg-deep`): a top strip ("On air now" badge + "Radio, television, and interactive media — always on." + a Listen-live button), then Platform / Media / Company columns, then "© 2026 TMC Media. All rights reserved." + "Part of The Mavion Corporation".
- **Player dock** (fixed, blurred, bottom): flat mini cover, "INL @ RMC / Inline Television · Live from the Robloxian Media Conference", live badge, equalizer, ticking `HH:MM:SS` clock, a circular play button → `/radio`. Give `body` bottom padding so it never covers the footer. Collapses to art + title + play on mobile.

## Accessibility & build
- One static HTML file: inline CSS, vanilla JS, Google Fonts, inline SVG only. No libraries, no canvas.
- Focus-visible: 2px `--blue-hot` ring, offset. Real `<button>`s for tabs with `aria-selected` + `role=tablist/tab/tabpanel`. Decorative art and the clock are `aria-hidden`. Skip link. Tap targets ≥44px. No horizontal overflow 320–1600px.
- Naming: **Inline Television** (never "Inline TV"); legal: "© 2026 TMC Media. All rights reserved." + "Part of The Mavion Corporation".
- Voice: confident, specific, a real media network — never marketing filler.

The test: it should look like a premium streaming app you'd want to open — deep blue, cinematic, pressable — not a SaaS landing template and not the parent company's quiet serif newsroom.

--- PROMPT END ---

---

## Notes for maintainers
- Live reference implementation: `tmc-media.html` in this repo.
- Provenance: the client rejected two earlier directions — the corporate Mavion look ("keep the TMC design" — no) and a retro Swiss-poster "Klein Grid" ("SO bad… how is that modern"). This **Deep Channel** streaming-app direction is the approved one. Do not resurrect the cream-paper / brutalist / Archivo poster look.
- Relationship to `DESIGN-SYSTEM.md` (corporate Mavion): deliberately disjoint. Different canvas, fonts, radii, and blue. TMC Media blue is `#3B6DFF` (electric), NOT the corporate interactive blue `#4C8DFF`. Keep them apart.
- See memory `feedback-tmc-media-design` for the standing "blue, unique, very modern, no AI-template clichés" rule.
