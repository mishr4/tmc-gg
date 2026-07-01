# The Mavion Corporation — Design System

**A reusable prompt.** Paste the block below into an AI (or hand to a designer/dev) to bring any Mavion property — TMCast, Mavion News, UnoNoticias, dashboards — in line with tmc.gg. It describes the exact system the corporate site uses. Copy from `--- PROMPT START ---` to `--- PROMPT END ---`.

---

--- PROMPT START ---

Design and build **[PROJECT NAME]** in the Mavion design system: a **premium, dark editorial newsroom** — think The Athletic / Bloomberg / a modern NYT on a near-black canvas. Restrained and cinematic: generous negative space, soft large corners, slow expo-out motion. The serif does the talking; color is used sparingly so it means something. Do not copy any other brand's layout — match this *level* of restraint and polish.

## Non-negotiable rules
- **Dark, near-black canvas.** Everything sits on layered near-black surfaces. No light theme.
- **Color discipline (the backbone):** blue `#4C8DFF` = **interactive only** (links, active nav, primary buttons). Red `#FF3B33` = **breaking/live only**. Everything else is greyscale. A new element must not introduce its own color.
- **No gradients.** Flat fills, hairline borders, and soft depth only.
- **Whitespace over borders.** Separate content with space + subtle elevation, never rows of hairlines (no "nutrition-label" stacks).
- **The logo (the blue/cyan "flag") is shown in its normal colors** — never inverted, never recolored.

## Color tokens
```
--bg:        #08090b   /* page */
--raised:    #0e0f12   /* header, footer, raised bands */
--card:      #131419   /* cards */
--glass:     rgba(255,255,255,.03)    /* subtle fills */
--glass-2:   rgba(255,255,255,.055)   /* tiles, hover */
--line:      rgba(255,255,255,.075)   /* hairlines */
--line-soft: rgba(255,255,255,.05)

--ink:   #fafafa   /* headlines / white */
--ink-2: #e6e7ea   /* body */
--muted: #9a9ca2   /* meta */
--faint: #80828a   /* labels, stamps, numerals */

--accent: #4C8DFF   --accent-hover: #6BA0FF   /* interactive ONLY */
--live:   #FF3B33   /* breaking / live ONLY */
--ok:     #3ecf8e   /* rare success ticks */
```

## Type system (two fonts — no monospace)
- **Fraunces** — the voice. A variable, optical-sized old-style serif (self-host the variable roman + italic `.ttf`; enable `font-optical-sizing: auto`). Used for the wordmark, all headlines, section/story/card titles, big numbers, and italic pull-quotes. Render ~weight **500**, tight negative tracking (**−.015 to −.022em**), snug line-height (**~1.05–1.1**). Italic for quotes and editorial accents.
- **Inter** — everything else. Body, UI, and the "furniture" (kickers, labels, timestamps, section eyebrows). For furniture, use Inter **uppercase**, small (~11px / .68–.72rem), weight 600, letter-spacing **.08–.16em**, color `--muted`/`--faint`. **Do not use a monospace font — it reads robotic.**
- Body: Inter 400–500, `--ink-2`, line-height ~1.6.

## Shape, depth, motion
- Radii: small **12px**, default **16px**, large **20px**, feature **22px**. Pills 999px.
- Depth: `--card` on `--bg` + a 1px `--line-soft` border. Shadows are deep and soft (e.g. `0 18px 44px -22px rgba(0,0,0,.75)`) — used sparingly (overlays, cookie bar).
- Motion: ease **`cubic-bezier(.16,1,.3,1)`** (expo-out). Scroll-reveal (opacity + 16–18px rise, ~.7s), card hover lift (`translateY(-4px)`, border brightens), staggered hero entrance, cross-document view-transitions. Always honor `prefers-reduced-motion`.

## Components
- **Header:** sticky, `--raised` at ~72% + `blur(18px)`; hairline bottom appears on scroll. Wordmark left; nav links right in `--muted` → `--ink` on hover, active link gets a blue underline. Mobile: hamburger → full-width sheet.
- **Buttons:** primary = `--accent` bg with **near-black** text (`#08090b`), hover `--accent-hover`; ghost = `--glass` + `--line` border, white text, hover border brightens. Radius 12px. Subtle hover lift.
- **Cards:** `--card` bg, `--line-soft` border, 16px radius, ~24–30px padding; hover lifts and brightens to `#16171d`. Card-forward is good — but vary composition, don't box every section.
- **Kicker / eyebrow:** Inter uppercase, tracked, `--muted` (e.g. `BREAKING · WORLD · 12:47`, with the word "BREAKING" in `--live`).
- **Tag / pill:** Inter uppercase ~11px, `--glass` bg, `--line-soft` border, `--muted`.
- **Facts / meta:** label (`dt`) = Inter uppercase `--faint`; value (`dd`) = Fraunces `--ink`. Spaced rows, **no per-row borders**.
- **Timeline:** thin grey spine + small `--faint` node per entry; date in tracked Inter `--muted`, title in Fraunces.
- **Stats:** each figure is a card; number in Fraunces `--ink`, label in tracked Inter `--faint`.
- **Footer:** `--raised`, multi-column (Company / Companies / Resources / Legal), mono-style tracked column headers, hairline divider, social tiles.
- **Cookie bar:** fixed bottom card, slides up (expo-out), Accept/Decline persisted in `localStorage`, reopenable from any `[data-cookie-edit]` control.

## Accessibility & build
- Semantic HTML, landmarks, skip-link, visible `:focus-visible` rings (blue), keyboard-operable menus.
- Mobile-first; single-column below ~600px; tap targets ≥44px; no horizontal overflow.
- Self-host brand fonts (privacy). Static, fast, minimal JS. Security headers (HSTS, CSP, nosniff, frame-options, referrer, permissions).
- Content voice: informative, restrained, specific — a real media corporation, never marketing/startup filler.

--- PROMPT END ---

---

## Notes for maintainers
- Live reference implementation: this repo's `site.css` + `site.js`. Fraunces variable fonts live in `/fonts/`.
- The blue in the logo is the brand flag; the interactive blue `#4C8DFF` is deliberately close but is a separate, functional token.
- When applying to **TMCast** (a product surface), keep the system but you may lean more on cards, pricing tables, and the "live/on-air" red for broadcast status — it's the one place red earns more presence.
