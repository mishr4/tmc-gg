# RHL Now 24 — Design System

The design contract for `/rhl` (RHL Now 24, the 24/7 news service of RHL Now, part of The Mavion Corporation).
Origin: Alexander's Framer design (tv24.framer.ai). The page on tmc.gg is a faithful hand-written
reproduction of that canvas. **The original design always wins over "improvements."**

## Core rule

The page is a **fixed 1200px-wide canvas** with absolutely positioned elements — it never reflows.
On screens narrower than 1200px the entire canvas scales down as one piece (`transform: scale`).
Do not convert it to a fluid layout. New sections are **appended below** the original canvas
(the original 1273px — header 116 + hero 312 + dark 845 — is untouchable).

## Palette

| Token   | Hex       | Use                                              |
|---------|-----------|--------------------------------------------------|
| Navy    | `#12161f` | Header bars, main dark sections                  |
| Navy-2  | `#0d1118` | Card fallback backgrounds, deep panels           |
| Cyan    | `#00bbfe` | Hero band, SUBSCRIBE button, ticker, accents     |
| Purple  | `#5c38fa` | Program circles (rhl now, CA now)                |
| Purple-2| `#5d39fa` | QR promo panel                                   |
| Red     | `#a80000` | 2C program circle                                |
| Live red| `#fe0000` | Live dot, BREAKING tag                           |
| Line    | `#323f4f` | Vertical separators in the sub-nav               |
| White   | `#ffffff` | Text, hairlines, QR tile                         |

Flat color blocks only. No gradients, no glassmorphism, no shadows on layout blocks.

## Type

Single family: **Instrument Sans** (400 / 500 / 600). Sizes in use:
- Headline: 37px / 600 (hero, two stacked lines)
- Sub-headline: 22px / 400
- Section labels: 16px / 400 — pattern: `Programs (4)`, `Live Now`, `Top Stories (6)`
- Body/UI: 13px / 500 (Live chip, QR panel, ticker)
- Nav links: 11px / 500 (Read · Listen · Watch)
- Button: 10px / 500, letter-spacing default, black on cyan (SUBSCRIBE)

## Fixed geometry (do not move)

- Header 116px: top bar 69px + sub bar 52px, white 1px hairline between, inset 35px each side.
  Logo 152×31 at left 41. SUBSCRIBE 96×28, radius 2, at right 160. "Go to YT" chip at right 35.
  Nav links right-aligned (Read right:134, Listen right:91, Watch right:51); 1×26 `#323f4f`
  divider at right:192. Live chip at left 28: 6px red dot + "Live".
- Hero 312px cyan: text block at left 68 (headline top 103), image 685px wide pinned right, `object-fit: contain`.
- Dark section 845px: Programs at top:42 left:52 (105px circles, 44px gap);
  Live Now strip at top:230 left:52, cards 353.5×204, radius 8, gap 10, chips 56×39 at bottom:15;
  QR panel 490×177 at bottom:22 left:23 (white 177px tile + QR 146px).

## Brand assets (Framer CDN — reuse, don't recreate)

- Wordmark: `framerusercontent.com/images/6byy49KaYBaYnXuVHu1F8fvk1z4.png`
- YT chip icon: `Xj16jzaabs7UjCgXjHWf3OQUI.png`
- Hero art: `32h7GuKXNycv1JCNkEP2l9ooMTQ.png`
- Programs: rhl now `kS6O5ObfGEDRPcze5SEY7i4A6Ho.png` · CA now `u90HC26n4lYUGTrcC5bRuJ1r8mo.png`
  · LUCiD `yZ4iO4z9qFeGOLpEWQ8OTfcZ7fI.png` · 2C `gBhT53P6uCu46zzgSlLlZG15cz4.png`
- Extra chips: rhl round `ciyjK870nlLiSKDxReXP4k3mMxk.png` · rdy `K0sAW1J78mUAR1ujBtcCJH76k.png`
- QR: `YkRJlEnJqRHgUxIIhFEkOY7aAk.png` · small logo `x5hF37T5SEMVtOfoZLgpxCPxew.png`
- Favicons: light `olEbZxuoH5pKejdyaDSkL5i6QRA.png` / dark `xXqMaDVEsTY7zCpnF1T55Dnaxlg.png`
  / touch `NNZC6bnD4C6LnzxY6mIKmJo3s.png` · OG `wFM8dJhejqLmX0jNSu097ucdKs.png`

## Motion (from the original)

- Header drops in from -150px with a spring curve on load.
- Wordmark flips in (`rotateY -180° → 0`).
- Live cards flip in (`rotateX -180° → 0`).
- Live dot may pulse subtly. Everything off under `prefers-reduced-motion`.

## Approved modern layer (additions that proved OK)

- **Drag-to-browse strips**: Programs row and Live Now strip scroll horizontally by pointer drag
  (grab cursor) and mouse wheel; clicks are suppressed after a drag.
- **Breaking ticker**: 40px cyan bar, red BREAKING tag, dark 13px headlines scrolling on a loop,
  pause on hover. Lives at the top of the appended stories section only.
- **Top Stories grid**: 3 columns aligned to left/right 52, thumbs = flat brand-color blocks with
  a 56×39 chip at bottom-left (echoes live cards), 15px/500 white titles (hover cyan),
  11px meta row with a 6px colored category dot.
- **Player overlay**: full-screen `rgba(13,17,24,.92)` scrim, centered 16:9 box radius 8,
  YouTube `youtube-nocookie` embed, ✕ to close, Escape/backdrop close.
- Hover feedback must stay quiet: color shifts and cursor changes, no lifts/scales/shadows.

## Functional wiring

- Channels are a JS `CHANNELS` array in `rhl.html` — one object per card
  (`thumb`, `chip`, `chipLeft`, optional `youtube` UC-id / `video` id / `watch` URL).
  The strip width is computed, so adding entries just extends the draggable strip.
- `/api/rhl-yt?channel=UC…` (`api/rhl-yt.js`) proxies the channel's public uploads feed
  (no API key) → `{ videos: [{id, title, published, thumbnail, views}] }`, cached 5 min.
  When a channel has a `youtube` id, its card auto-shows the latest video and opens it in the player.
- Stories are a JS `STORIES` array (currently demo/fake content) feeding both the grid and ticker.

## Reusable prompt

> Work on the RHL Now 24 page (tmc.gg/rhl). It is a fixed 1200px canvas that scales, never
> reflows. Reproduce the existing design exactly: navy `#12161f` bars, cyan `#00bbfe` hero and
> accents, Instrument Sans only (37/600 headlines, 16px section labels like "Live Now", 11px nav),
> flat color blocks with no gradients or shadows, 8px radius on media cards only, brand logos
> from the Framer CDN URLs in RHL-DESIGN.md. Never move or restyle the original header, hero,
> programs, live strip, or QR panel. Add new content only as sections appended below the canvas,
> built from the same vocabulary (52px side alignment, 16px white labels, brand-color blocks,
> 56×39 chips, 6px dots). Motion: load-in spring drops/flips and the scrolling ticker only;
> hovers are color-only. Strips scroll by drag. Keep it working: channels via the CHANNELS
> config + /api/rhl-yt, video playback in the dark 16:9 overlay.
