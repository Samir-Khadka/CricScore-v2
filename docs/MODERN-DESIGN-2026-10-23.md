# CricScore — Modern Redesign ("Floodlit Night Match"), 2026-10-23

Samir's verdict on the previous, deliberately conservative pass:
*"make a modern design, it looks very bored."* This pass is a reskin
with real art direction, built on top of that pass's system (shared
classes, AA tokens, real `<Link>` cards, reduced-motion support all
kept). **Visual layer only** — no behaviour, routing, data or API
changes; nothing renders from data the components didn't already
receive.

## Art direction

A floodlit night match. The app now sits in a dark arena: a deep
green-charcoal ground with mowed pitch stripes and floodlight glows
behind every page, glass chrome floating over it, and cards edged in a
gradient that runs from floodlight white to lime. Type does the
shouting — heavy grotesque numerals (Archivo) for scores, tall
condensed headlines (Barlow Condensed, now with its 800 weight and
italics) for team names and result statements, set big enough to read
across a room like a broadcast graphic. LIVE is treated as an "on air"
light: rose pill, halo glow on the whole card. Team colours — already
deterministic per team — are promoted from dots to a full visual
language: gradient monograms, colour-meet bars on every card, gradient
bands on scorecards, team-tinted win-probability fills.

## Foundations (`index.css`, `index.html`)

- **Palette deepened.** Dark body `#07090c` (blue-charcoal) →
  `#060a08` (green-charcoal); card, secondary and border tones all
  re-hued green; meta/subheading greys re-hued to match (same
  lightness, so the AA ratios from the last pass carry over). Light
  theme tinted faintly green to belong to the same ground.
- **Atmosphere layer** (`body::before`, fixed, CSS-only): two
  floodlight radial glows, alternating mowed-pitch stripes
  (76px bands), and a foot vignette — theme-driven via `--atmo-*`
  variables, zero DOM/JS cost.
- **Cards got depth.** `.surface-card` is now a gradient-edged card:
  the fill is a `padding-box` layer and the border a `border-box`
  gradient (floodlight white → transparent → lime), over a deeper
  two-stage shadow with an inset top sheen in dark mode. `.glass`
  combos (nav, match header, scorer bar) stay translucent — glass
  thins the card fill via `--card-bg-alpha`. Cards also rise 10px and
  fade as they mount.
- **Typography.** Archivo (600–900) added with `display=swap` as
  `.font-display` for score numerals; Barlow Condensed gains weight
  800 + italics. Gradient headline text gains a warm third stop.
- **LIVE pill.** `.live-badge` is now a filled rose pill with ring +
  halo; text is rose-700 (light) / rose-300 (dark) — AA on its tint in
  both themes. New `.live-glow` halo for live cards.
- **Progress language.** `.progress-track`/`.progress-fill`
  (emerald→lime gradient with a lime glow) for innings progress and
  partnership bars.
- **Ball chips recoloured** (`ballChipClass`): 4 = emerald with glow,
  6 = lime floodlight with dark text, W = rose with glow — boundaries
  now pop out of every this-over strip and commentary row.
- **Tabs & CTA.** Active tab deepened to emerald-700 (white text now
  ~4.9:1, up from ~3.3:1 on emerald-600) with an inset sheen; the
  primary CTA gradient runs emerald→lime-500 with a stronger glow and
  top highlight.

## Page by page

- **Global chrome** — the sticky header is stronger glass
  (blur 18px, saturate 1.6) with a gradient hairline along its base;
  the wordmark switches to Archivo extrabold. **New: app-style bottom
  navigation** on small screens (Home / Matches / Tournaments /
  Score, glass, safe-area padded, active pill) — hidden on the scorer
  console, organizer flows and login, where fixed bottom bars of their
  own live.
- **Home hero** — headline up a size at Barlow 800; two floodlight
  beams rake down behind the copy; capability icons sit in gradient
  chips. A **"LIVE NOW" broadcast strip** (pill + fixture + tournament)
  caps the featured panel whenever a match is live.
- **Featured match (hero panel)** — this is the centrepiece: gradient
  team-colour bar where the colours meet mid-card, XL gradient
  monograms, condensed uppercase team names, **42–50px Archivo Black
  scores**, an innings progress bar with "Over 16.2 of 20 · 82%
  bowled", the chase line in lime, the win meter below, and a rose
  halo around the whole card while live. Completed heroes state the
  result as a 24px italic condensed gradient headline.
- **Match cards** — same colour-meet bar everywhere. Live cards gain
  the halo, a batting-row tint with pulse dot, display-font scores and
  the innings progress bar. Recent cards mute the loser and paint the
  winner's score emerald with a trophy mark, result restated as an
  italic condensed gradient headline. Upcoming cards centre on a
  glowing gradient VS medallion with date/time pills.
- **Live ticker** — the "IN PLAY" label becomes the LIVE pill; chips
  go glassier (card/80 + shadow).
- **Match page** — sticky header rebuilt as a broadcast scorebug:
  team-colour strip, LIVE pill, XL monograms, condensed uppercase
  names, a gradient VS medallion, and **44–54px Archivo Black scores**.
  The result banner is a trophy-medallion + italic gradient headline.
  Section titles (Commentary / Scorecard / Overs / Details) switch to
  condensed uppercase. The win meter grows to a 14px split bar with
  gradient team fills, a centre notch, a leader-coloured glow, and
  22px percentage numerals.
- **Scorecard** — innings header is a team-colour gradient band with
  XL monogram and display-font total; the striker's row is tinted;
  "Fall of Wickets" becomes a micro label.
- **Worm & partnerships** — worm lines thicken to 3px with a soft
  team-colour area fill and ringed end points; partnerships gain
  relative-size progress bars and display-font figures.
- **Points table** — form chips become round W/L/T dots.
- **Scorer console** — header score switches to Archivo Black (the
  rest of the console is deliberately untouched: it's a working tool).
- Every other page inherits the new ground, cards, type and contrast
  automatically through the token layer.

## Sizes & verification

- ESLint: clean. Production build
  (`VITE_API_URL=https://cricscore-api-rmya.onrender.com`): succeeds,
  `React.lazy` splitting intact (same 11 route chunks + entry).
- Entry JS: 336,659 B → **342,958 B** (gzip ~103.2 → ~104.9 kB) —
  the bottom nav and richer card markup; +1.9%.
- CSS: 67,999 B → **78,527 B** (gzip ~12.3 → ~13.8 kB) — atmosphere,
  gradient-edge cards, pills, progress, bottom nav, plus the new
  utilities the markup uses.
- Built CSS inspected: Archivo/`.font-display`, atmosphere stripes,
  gradient `border-box` card layer, `.live-glow`, `.live-badge`,
  `.progress-fill`, `.bottom-nav`, `fade-up` all present in the
  shipped stylesheet; the built HTML references the new font stack.
  Wasmer bundle rebuilt (root `index.html`/`404.html`/`assets/`).
- No screenshot verification was possible (headless Chrome does not
  run on this VM) — layouts were kept on flex/grid primitives with
  wrapping and truncation, no fragile absolute positioning beyond the
  pre-existing hero glows.

## Risks taken vs played safe

- **Taken:** the gradient-border card (background-layering technique)
  — degrades to a plain fill if `color-mix`/clip layers fail, never to
  invisibility; the mount animation on every card (neutralised by the
  existing reduced-motion block; fill-mode `backwards` so hover
  transforms are never blocked after mount); Archivo as a second
  display family (loaded with `display=swap`, system fallback first
  paint).
- **Played safe:** form dots were *not* added to match cards — the
  list payload carries no form data (form lives in the points table,
  where it already renders and is now restyled as dots). Scorer
  console interior, organizer forms and all data flows untouched.
  Every new colour was checked against the AA bar the last pass set:
  tab active deepened to emerald-700, LIVE pill text uses rose-700 /
  rose-300 on its tint, lime chips carry near-black text.
