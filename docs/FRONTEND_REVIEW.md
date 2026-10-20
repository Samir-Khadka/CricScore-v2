# CricScore — Frontend Deep Review (`user/` app)

**Scope:** `/tmp/cricscore/user/` — React 19.1 + Vite 7 + Tailwind CSS 4 + socket.io-client 4.8, ~1,900 LOC.
**Method:** Full read of every source file, `npm run build` (passes), `npx eslint src/` (7 errors, 5 warnings — corroborates several findings below), and inspection of the compiled CSS in `dist/` to verify how the `dark:` variant is generated.
**Benchmark:** Cricbuzz, ESPNcricinfo, CricClubs, PlayHQ.

---

## Executive answers to the five assessment questions

1. **Scorer interface — DOES NOT EXIST in this app (Critical).** This is a viewer-only app. There is no route, page, or component for ball entry: no 0/1/2/3/4/6/W/Wd/Nb pad, no batsman/bowler picker, no undo, no innings management. The three places that promise scoring are all dead ends (F-01). Scoring actually happens in the **separate sibling CRA app** at `/tmp/cricscore/client/` (`src/components/Scoring.js`, `src/services/ScoringService.js`) — but nothing in `user/` links to it, and its URL is not referenced anywhere in this codebase.
2. **Live experience — PARTIAL.** Socket.io live score + a ball-by-ball feed exist on the match page, and a live-match list socket exists on Home. But: no wagon wheel, no Manhattan, no worm/run-rate graph, no partnership display, no fall-of-wickets, the "this over" ball strip is commented out and driven by fake data, and the Points Table tab is a stub (F-05…F-08).
3. **UI quality — DISTINCTIVE BUT FRAGILE.** The purple→cyan gradient identity, Space Grotesk/Inter pairing, and CSS-variable theming give it a recognisable look, and the theme context itself is well built. But tokens are bypassed with hard-coded hex in ~20 places, two components ignore the theme entirely, there are **no loading skeletons and almost no error states anywhere**, and empty states flash during loads (F-18, F-20…F-23).
4. **Code quality — WEAK.** Hard-coded `http://localhost:5000` in 5 places (breaks any real deployment), fetch boilerplate duplicated 8×, derived-state-in-`useEffect` anti-pattern in 6 places, no API layer, no error boundary, no code splitting, and **two different `Match` components** — `pages/Match.jsx` (real match page) vs `components/Match.jsx` (a stub page rendering fake cards, routed at `/match`) (F-02, F-10, F-11, F-29, F-30).
5. **Accessibility & mobile — POOR.** Zero `aria-*` attributes and zero `role` attributes in the entire app source; tabs and cards are clickable `<div>`s; there is **no mobile navigation at all** (nav links are `hidden` below `lg`, no hamburger) — on the phones scorers and fans actually use at grounds, users cannot navigate or even toggle the theme (F-24, F-25).

**Crash-class bugs found (any one white-screens the app — there is no ErrorBoundary):** F-03, F-10, F-15, F-16.

---

## 1. Scorer interface & product completeness

### F-01 — CRITICAL — No scorer interface; every "Start Scoring" CTA is a dead button
- **Files:** `src/components/NavBar.jsx:51-57` ("Start Scoring" `<button>` with no `onClick`, no `Link`), `src/components/HeroSection.jsx:19-21` (same dead button), `src/components/Footer.jsx:18` (`<Link>Scorer Dashboard</Link>` with **no `to` prop**), `src/App.jsx` (routes are only `/`, `/tournament/:tourname`, `/match/:tourName/:matchName/:matchId`, `/match`, `/matches/:type`, `/matches/`).
- **Description:** The product's headline promise — Features.jsx literally advertises "score every ball with just a tap" — cannot be performed from this app. A user who lands here can never start scoring: both CTAs do nothing on click, and the footer's Scorer Dashboard link goes nowhere. Scoring lives in the sibling `/tmp/cricscore/client/` app, which is neither linked nor URL-referenced here.
- **Fix:** Point all three CTAs at the scorer app (URL from `import.meta.env.VITE_SCORER_URL`). Longer term, build scoring into this app as a `/score/:matchId` route designed for grounds use: ball pad with ≥56px tap targets (`0 1 2 3 4 6 W Wd Nb +`, plus bye/leg-bye), striker/non-striker and bowler pickers, one-tap undo, over-end confirmation, and an offline outbox queue (socket emit with retry) since ground connectivity is unreliable — this is the single biggest gap vs CricClubs/PlayHQ, whose scorer is the core product.

### F-02 — CRITICAL — API base URL hard-coded to `http://localhost:5000` in 5 places
- **Files:** `src/pages/Home.jsx:21`, `src/pages/Match.jsx:20`, `src/pages/Matches.jsx:11`, `src/pages/TournamentInfo.jsx:24` and `:57`. Zero uses of `import.meta.env` in the codebase (grep-verified).
- **Description:** Built and deployed anywhere other than the dev machine, every fetch and both socket connections target the *visitor's own* localhost:5000 — the app renders empty shells. There is also no shared constant, so the five copies can drift.
- **Fix:** Create `src/lib/api.js` exporting `API_BASE = import.meta.env.VITE_API_BASE ?? ""` and a socket singleton factory; replace all five literals; add `.env.example`. Use the same module for the fetch wrapper in F-30.

---

## 2. Live experience

### F-03 — CRITICAL — Home/Matches crash when a team hasn't batted yet
- **Files:** `src/pages/Home.jsx:53-83` (two effects), `src/pages/Matches.jsx:24-39`.
- **Description:** `match.innings?.find(inn => inn.batting_team === match.teamB_id)._id` — optional chaining guards `innings`, not the `find()` result. During the first innings of **any** live match, Team B has no innings, `find` returns `undefined`, and `._id` throws a TypeError. With no ErrorBoundary anywhere in the app (grep-verified), the whole page white-screens — i.e., the home page breaks precisely while a match is live, its most important moment. The same pattern in `Recent.jsx`/`ScoreSummaryCard.jsx` effects (`data?.innings.find(...)`) throws if `innings` is absent.
- **Fix:** `const inn = match.innings?.find(...); teamBInning: inn?._id ?? null`, and add a route-level ErrorBoundary so a data-shape surprise degrades to a card-level error instead of a blank app.

### F-04 — HIGH — Match-page socket ignores `matchId` changes; no connection state
- **File:** `src/pages/Match.jsx:38-56` (ESLint flags the missing `matchId` dep).
- **Description:** The socket effect has an empty dependency array but closes over `matchId`. React Router reuses the component when only route params change, so navigating match → match (e.g., via a shared link or back/forward) leaves the user subscribed to the *previous* match's room while the header shows the new one. Separately: no `connect_error`/disconnect handling, no reconnect indicator — if the socket drops, the page silently freezes on stale data while still labelling itself "Live" (the badge is driven by `matchState`, not connectivity). Cleanup itself is correct (`socket.off` + `disconnect`) and StrictMode-safe; Home's socket (Home.jsx:26-40) is likewise cleaned up — no listener leaks found in either effect.
- **Fix:** Add `matchId` to the dep array (and to the `fetchMatch` effect at :88), surface a small "Reconnecting…" pill bound to socket `disconnect`/`connect` events.

### F-05 — MEDIUM — Commentary feed is skeletal vs pro standard
- **Files:** `src/components/Commentary.jsx` (19 lines), rendered from `src/pages/Match.jsx:~437-460`.
- **Description:** Each ball renders only an over chip, "Bowler to Batsman", and a result chip derived mechanically from the event type (`"1 run"`, `"WICKET"`). There is no descriptive commentary text, no over-end summaries, no milestone/key-event highlighting (50s, wickets, innings breaks), no timestamps, and outcome colour-coding is uniform — a six and a dot ball look the same. The data even carries a typo'd field name through the UI layer (`be.players.Bastman1_Name`). Cricbuzz/ESPNcricinfo treat this feed as the product; here it's a placeholder. The list also uses array-index keys while new balls are *prepended* (Match.jsx:48), which defeats React reconciliation on every ball.
- **Fix:** Render the backend's commentary text when present with a generated fallback ("{bowler} to {batsman}, {outcome description}"), colour-code result chips (4 = purple/blue, 6 = blue, W = red — reuse `TimelineItem`'s scheme), insert over-summary separators every 6 legal balls, and key rows by a stable ball id (`${over}.${ball}-${seq}`).

### F-06 — MEDIUM — No wagon wheel, Manhattan, worm graph, partnerships, or fall-of-wickets
- **Files:** Absent everywhere; `src/components/Scorecard.jsx:66` contains only the comment `{/* fall of wickets */}`; `src/components/PointsTable.jsx:1-9` is a stub that renders "Not Available" and ignores its props.
- **Description:** Every benchmark platform ships at least Manhattan + worm + FoW; CricClubs/PlayHQ add wagon wheels. Here the match page's four tabs are Commentary / Scorecard / Details / Points Table, and the fourth is an empty promise — no points-table API call is even attempted from the tab that exists specifically to show it.
- **Fix:** Phase 1 (data already available client-side): fall-of-wickets row in Scorecard, Manhattan (runs per over) and worm (cumulative runs) as lightweight inline SVG from `ballEvent`/innings data — no chart lib needed. Phase 2: wire PointsTable to the tournament standings endpoint. Wagon wheel needs shot-direction data from the scorer — note as dependent on F-01's data model.

### F-07 — MEDIUM — "This over" ball strip exists but is commented out and fed by fake data
- **File:** `src/pages/Match.jsx:58-87` (hard-coded 20-over `timeline` array, ESLint `no-unused-vars` error) and the commented-out render block at ~:352-375; `src/components/TimelineItem.jsx` is therefore dead code.
- **Description:** The always-visible current-over strip — the single most-glanced element on Cricbuzz during a live match — is missing from the live UI, while ~30 lines of invented ball data (`"6","WD","4NB"…` for a fictional 20 overs) sit in the component.
- **Fix:** Delete the fake array; render the strip from the last 6+ legal balls of `ballEvent` using the existing `TimelineItem` (which already colour-codes 4/6/W), pinned under the score header.

### F-08 — MEDIUM — "Live" list page never updates; no polling fallback
- **File:** `src/pages/Matches.jsx`.
- **Description:** `/matches/live` fetches once on mount — a static snapshot labelled "Live". Home has a `liveMatches` socket; this page, whose entire purpose is live matches, does not.
- **Fix:** Reuse the Home socket pattern (or a shared socket manager) filtered to the list, or poll every 30s while `type === "live"`.

---

## 3. Routing & navigation

### F-09 — HIGH — Nav links and "View All" point at routes that don't exist; no 404
- **Files:** `src/components/NavBar.jsx:28` (`to="/tournaments"`), `:34` (`to="/about"`), `src/pages/Home.jsx:281` (`navigate("/tournaments")`), `src/App.jsx` (no `path="*"` catch-all, no `/tournaments` or `/about` routes), `src/components/Footer.jsx:13-19` (all five `<Link>`s have **no `to` prop at all**).
- **Description:** Clicking Tournaments or About in the main nav renders NavBar + Footer around a blank void. Two of the three primary nav destinations are broken.
- **Fix:** Add the routes (a tournaments index can reuse `TournamentsCard` data) plus a `path="*"` NotFound page; give Footer links real `to` values; add a smoke test or link-check over App routes.

### F-10 — HIGH — `/match` route is a fake page; its cards crash on click
- **Files:** `src/components/Match.jsx` (renders five identical `<MatchSummaryCard />` with no props), `src/components/MatchSummaryCard.jsx:3`.
- **Description:** The NavBar "Matches" link lands on a demo stub showing five copies of a hard-coded card ("Nepal Premier League — Sudurpaschim Royals 198/7") — invented data presented as real content. Worse, the card's `onClick` calls `handleClick()`, which is **not defined in that component** (`npx eslint` reports `no-undef`) — clicking any card throws a ReferenceError and, absent an error boundary, kills the page. The card also ignores the design system entirely (`bg-white`, `text-gray-800`, fixed `w-[90vw] ml-16`).
- **Fix:** Delete `components/Match.jsx` + `MatchSummaryCard.jsx` and redirect `/match` → `/matches/live`. If a summary-card design is wanted, rebuild it prop-driven like `ScoreSummaryCard`.

### F-11 — MEDIUM — Two components named `Match` invite wrong imports
- **Files:** `src/pages/Match.jsx` vs `src/components/Match.jsx`; `src/App.jsx:7-8` imports both (`Match` and `MatchPanels`).
- **Description:** Same name, unrelated purposes, one of them a stub (F-10). Any future `import Match from "../components/Match"` in a page silently wires the fake page in.
- **Fix:** Resolved by F-10's deletion; until then rename the components file to `LegacyMatchPanels.jsx`.

### F-12 — MEDIUM — Matches page doesn't refetch when `:type` changes
- **File:** `src/pages/Matches.jsx:17-19` (ESLint exhaustive-deps warning confirms).
- **Description:** `useEffect(fetchMatches, [])` ignores `type`; switching from `/matches/live` to `/matches/recent` re-renders with the new heading over the old list, and the card-type selector then renders the wrong card components against stale data.
- **Fix:** Depend on `[type]`, reset `matches`/`matchInfo` on change, and validate `type` against `["live","upcoming","recent"]`.

### F-13 — MEDIUM — Card navigation builds fragile relative URLs
- **Files:** `src/components/ScoreSummaryCard.jsx:20-24`, `src/components/Recent.jsx:21-25`.
- **Description:** `navigate(\`match/${tourname}/${teamA}-vs-${teamB}/${innings[0].matchId}\`)` — (a) relative path: from `/matches/live` it resolves to `/matches/match/…`, a non-route; (b) uses `innings[0].matchId` instead of the match's own id, and throws if `innings` is empty; (c) team/tournament names with spaces are interpolated unencoded (only spaces in the tournament name are dashed; team names are raw).
- **Fix:** Navigate by id only with an absolute path — `` navigate(`/match/${slug}/${matchId}`) `` using `data._id` — and drop the decorative name segments, or `encodeURIComponent` them.

### F-14 — MEDIUM — TournamentInfo fetches fixtures for `undefined` and double-fetches
- **File:** `src/pages/TournamentInfo.jsx:12-19, 48-75`.
- **Description:** The mount effect depends on `[tourInfo, tourname]`, so setting `tourInfo` re-triggers the effect and `fetchFixture` runs twice. Worse, `fetchFixture` reads `t._id`, but `t` is computed during render from `tourInfo` — on the first pass `t` is `{}`, so the first fixtures request goes to `/api/cricscore/view/tournaments/undefined`. The page also matches the tournament by display-name string equality against the URL param, so a renamed tournament or an encoding difference yields a permanently empty page.
- **Fix:** Resolve the tournament in one effect keyed by `tourname`, then fetch fixtures in a second effect keyed by the resolved `tournament._id`; route by id instead of name.

---

## 4. Data handling, errors, loading states

### F-15 — HIGH — Scorecard crashes for the team that hasn't batted
- **File:** `src/components/Scorecard.jsx:22, 43` (`props.scorecard.batsmen`, `props.scorecard.extras…`), driven from `src/pages/Match.jsx` scorecard tab.
- **Description:** During innings 1, `teamBinn` is `undefined`; a viewer tapping the Team B scorecard tab passes `scorecard={undefined}` and the component throws on first render. Pro platforms show "Yet to bat" with the playing XI — a routine state this UI cannot represent.
- **Fix:** Guard at the top: `if (!props.scorecard) return <YetToBat … />`; likewise render an empty-state when `batsmen` is empty.

### F-16 — HIGH — Unguarded nested dereferences on the match page
- **Files:** `src/pages/Match.jsx:342, 346` (`match?.toss.wonBy` — chaining stops at `match`, not `toss`), `src/components/MatchDetails.jsx:4-6` (`props.match.umpires.onField` with no null check, rendered whenever the Details tab is opened, including before fetch resolves).
- **Description:** A match record without toss data (common for upcoming/rescheduled fixtures) or a slow fetch turns tab clicks into white screens.
- **Fix:** `match?.toss?.wonBy`, and gate `MatchDetails` on `props.match` with a loading placeholder.

### F-17 — MEDIUM — Recent results card shows Team A's overs under Team B
- **File:** `src/components/Recent.jsx:60`.
- **Description:** Copy-paste error: the Team B row renders `({teamAInning?.over}.{teamAInning?.balls}/…)` instead of `teamBInning`. Every completed-match card on Home and `/matches/recent` displays wrong overs for the second innings — quietly wrong data is worse than missing data for a scores product.
- **Fix:** Use `teamBInning` in the second row; add a render test with asymmetric innings.

### F-18 — MEDIUM — No loading or error states anywhere; failures are silent or `alert()`
- **Files:** `src/pages/Home.jsx` (all four fetches), `src/pages/Matches.jsx:41-52`, `src/pages/Match.jsx:133-152` (`fetchMatch` has no `try/catch` and no `response.ok` failure path), `src/pages/TournamentInfo.jsx:39` (`alert("Something went wrong")`).
- **Description:** Initial state is `[]`/`null`, so Home flashes "No Matches Found" before its four fetches land; the match page shows an empty score shell indefinitely if the fetch fails; `TournamentInfo` shows "No tournament found" *while loading*. None of the fetchers catch network errors, so a downed API produces unhandled promise rejections and a permanently blank section with no retry.
- **Fix:** Introduce `loading`/`error` state per fetch (or a tiny `useFetch` hook in the F-02 API module), skeleton cards for lists, an inline error + Retry on the match page, and reserve empty-state copy for confirmed-empty responses.

### F-19 — LOW — Production `console.log` on every ball
- **Files:** `src/pages/Match.jsx:48` (logs every live update), plus logs in Home/Matches fetch paths.
- **Fix:** Remove or gate behind `import.meta.env.DEV`.

---

## 5. Theming & design system

### F-20 — MEDIUM — Dark mode is split-brain: `dark:` variant follows the OS, not the toggle
- **Files:** `src/context/ColorMode.jsx:24-33` (toggles a `dark` class on `document.body`), `src/index.css:16-36` (CSS variables under `:root`/`.dark` — this half works with the toggle), `src/pages/Match.jsx:302` (the app's only `dark:` utility).
- **Description:** Tailwind v4's default `dark:` variant is the `prefers-color-scheme` media query — verified in the built CSS: `@media (prefers-color-scheme:dark){.dark\:text-emerald-400{…}}`. So a user who toggles the app to light on a dark-mode OS (or vice versa) gets that one element themed by the OS while everything else follows the toggle. Compounding it, `index.html` hard-codes `<body class="dark">`, so light-theme users get a dark first paint that flips when React mounts (FOUC). The ColorMode context itself is otherwise well implemented (localStorage persistence, system-preference listener, SSR guards) — it's the wiring that's inconsistent.
- **Fix:** Add `@custom-variant dark (&:where(.dark, .dark *));` to `index.css` so `dark:` follows the class; remove the hard-coded class from `index.html` and instead inline a tiny pre-paint script that applies the saved theme class before first render.

### F-21 — MEDIUM — Tokens bypassed; two components ignore the theme; glow/hover overuse
- **Files:** Brand hex `#cc66ff`/`#00dbde` hard-coded across NavBar, HeroSection, Features, Home, Match, ScoreSummaryCard, Upcoming, Recent, TournamentsCard (~20 sites) instead of theme tokens; `src/components/MatchSummaryCard.jsx` (`bg-white`/`text-gray-*` throughout) and `src/components/Footer.jsx:4` (`bg-[#1c1f25]`) ignore the CSS variables entirely — the footer is dark in light mode, the stub card is light in dark mode.
- **Description:** There is a token system (`--color-card`, `--color-heading`, …) but it's opt-in per component and already drifting; there are no shared `Button`/`Card` primitives. Separately, nearly every card — including each commentary row (`Commentary.jsx:3`, `hover:scale-102`) — scales and glows on hover, causing layout jitter while scrolling a live feed and providing zero value on touch devices.
- **Fix:** Promote brand colours to `@theme` tokens in Tailwind v4 (`--color-brand`, `--color-accent`) and ban raw hex in components; rebuild Footer/MatchSummaryCard on the variables; reserve scale/glow for genuinely clickable cards and disable transforms on the commentary feed.

### F-22 — LOW — Legacy Tailwind v3 directives and a broken border utility in `index.css`
- **File:** `src/index.css:3-5` (`@tailwind utilities; @tailwind base; @tailwind components;` after `@import "tailwindcss"`) and `:82-84` (`.card-border { border: var(--color-card-border) }`).
- **Description:** The v3 directives are dead weight under Tailwind v4 (the build passes, but they signal an unfinished v3→v4 migration and confuse future editors). `.card-border` sets the `border` shorthand to a lone colour — width/style reset to defaults, so the "border" is invisible wherever the class is used on its own (e.g., NavBar relies on a separate `border-b` to be seen).
- **Fix:** Delete the three directives; change `.card-border` to `border-color: var(--color-card-border)`.

### F-23 — LOW — Invalid utility classes that silently do nothing
- **Files:** `text-xm` in `src/pages/Match.jsx` (×2) and `src/pages/TournamentInfo.jsx:1` occurrence (`text-xm` at the description paragraph), `text-md` in `src/pages/Match.jsx` (`md:text-md`, `text-md`).
- **Description:** Neither `text-xm` nor `text-md` exists in Tailwind (correct: `text-xs`/`text-sm`/`text-base`); the affected text falls back to inherited sizes. Harmless individually, symptomatic of no visual regression checking.
- **Fix:** Replace with `text-sm`/`text-base`; consider `eslint-plugin-tailwindcss`-style class validation.

---

## 6. Accessibility & mobile

### F-24 — HIGH — Zero accessibility semantics in the entire app
- **Files:** Global — grep for `aria-` and `role=` across `src/` returns **no matches** in application code.
- **Description:** The match-page tab bar (`src/pages/Match.jsx:~395-415`) is four clickable `<div>`s — no `role="tablist"/"tab"`, no `aria-selected`, not keyboard-focusable, so keyboard and screen-reader users cannot switch between Commentary/Scorecard/Details/Points Table at all. The same pattern repeats for the scorecard team toggle, every match card (clickable `<div>`, no `tabIndex`/`onKeyDown`), and the NavBar theme toggle (a bare Lucide `<Sun/>`/`<Moon/>` SVG with `onClick` — unfocusable, unlabelled). There is no skip link, no `<main>` landmark (pages use bare `<section>`/`<div>`), and the live regions (score, commentary) have no `aria-live` — particularly relevant for a *live scores* product.
- **Fix:** Convert tabs to real `<button>`s inside `role="tablist"` with `aria-selected` (or use `<Link>`-based routing); make the theme toggle a `<button aria-label="Toggle dark mode">`; wrap cards' click targets in `<Link>`/`<button>`; add `aria-live="polite"` to the live score header (throttled) — and run axe-core in CI.

### F-25 — HIGH — No mobile navigation; theme toggle unreachable on phones
- **File:** `src/components/NavBar.jsx:14` (`hidden w-1/3 lg:flex` — the only nav links and the theme toggle live inside this block).
- **Description:** Below the `lg` breakpoint the navbar shows only the logo and the (dead) Start Scoring button. There is no hamburger menu, drawer, or bottom nav. The primary audience — people at cricket grounds on phones — cannot reach Matches/Tournaments/About or switch themes. PlayHQ/CricClubs both treat mobile as the primary surface.
- **Fix:** Add a mobile menu (hamburger → slide-down panel) reusing the same links + theme toggle; consider a bottom tab bar on small screens for Home / Live / Matches / Tournaments.

### F-26 — MEDIUM — Fixed widths and gutters squeeze small screens
- **Files:** `src/pages/Home.jsx` & `src/pages/Matches.jsx` (`<section className="pl-10 py-6 mr-20">` — ~7.5rem of fixed gutter on a 360px phone), `src/components/ScheduleCard.jsx:3` (`w-4xl` ≈ 56rem fixed width — horizontal overflow on any phone), `src/components/Scorecard.jsx` (7- and 8-column tables with no `overflow-x-auto` wrapper), `src/components/Features.jsx` (`w-[400px]` cards).
- **Description:** The match page itself is reasonably fluid, but list pages and the scorecard — the two things fans check on phones — overflow or compress. Scorecard tables especially need a scroll container with a sticky first column, the standard pro treatment.
- **Fix:** Replace fixed gutters with responsive padding (`px-4 md:px-10`), make ScheduleCard fluid (`w-full max-w-4xl`), wrap both Scorecard tables in `<div className="overflow-x-auto">` with `min-w` on the table.

### F-27 — LOW — No PWA/offline story; minor document-head gaps
- **Files:** `index.html` (no meta description, no `theme-color`), `public/` (only the default `vite.svg`; no manifest, no app icon, no service worker).
- **Description:** A live-scores app used on flaky ground networks is a textbook PWA candidate; currently a connection drop mid-match leaves a dead page (compounding F-04/F-18).
- **Fix:** Add `vite-plugin-pwa` with a manifest + runtime cache for API GETs, real icons, and the two meta tags.

---

## 7. Code quality, state & performance

### F-28 — MEDIUM — Two `Match` components: resolved in F-10/F-11 (see §3).

### F-29 — MEDIUM — Derived state stored via `useEffect` + `setState` in six places
- **Files:** `src/pages/Home.jsx:46-84` (two effects), `src/pages/Matches.jsx:23-41`, `src/pages/Match.jsx:96-116`, `src/components/ScoreSummaryCard.jsx:8-17` (dependency is the entire `props` object — re-runs every render), `src/components/Recent.jsx:10-17`.
- **Description:** `teamAinn`/`teamBinn`/`matchInfo` are pure functions of props/state but are computed in effects and stored in state, costing an extra render per update, inviting stale intermediate frames (a card can render with the previous match's innings for one paint), and producing the F-03 crash shape. This is the codebase's most repeated pattern.
- **Fix:** Compute inline or with `useMemo` during render: `const teamAinn = data?.innings?.find(...)`. No state, no effect, no stale frame.

### F-30 — MEDIUM — No API/socket layer: duplicated fetch boilerplate, no aborts
- **Files:** Fetch blocks duplicated in `Home.jsx` (×4), `Matches.jsx`, `Match.jsx`, `TournamentInfo.jsx` (×2) — each re-declaring `host`, headers, and `credentials: "include"` on public GETs; sockets constructed ad hoc in `Home.jsx` and `Match.jsx`.
- **Description:** No `AbortController` anywhere (setState-after-unmount warnings/races on fast navigation), no request de-duplication, no shared error shape — which is why F-18's states are missing everywhere at once.
- **Fix:** One `src/lib/api.js` (see F-02) with `get(path, signal)` returning a discriminated result, a `useApi` hook exposing `{data, loading, error}`, and a socket manager keyed by room (`module`+`matchId`) that pages subscribe/unsubscribe from.

### F-31 — LOW — No route-level code splitting
- **File:** `src/App.jsx`; build output is a single 306 KB JS chunk (93 KB gzip) including all pages and the stub page.
- **Description:** Acceptable today, but the match page (the heavy one) loads on the home page's critical path; `React.lazy` per route is a five-line change.
- **Fix:** `lazy()` + `<Suspense fallback={<Skeleton/>}>` per route — which also forces the loading states F-18 needs.

### F-32 — LOW — Lint health: 7 errors / 5 warnings currently on `src/`
- **Evidence:** `npx eslint src/` — `no-undef` on `handleClick` (F-10), unused `timeline` (F-07), unused `props` in PointsTable, five `exhaustive-deps` warnings that map 1:1 to F-04/F-12/F-14, plus `react-refresh/only-export-components` noise in `ColorMode.jsx` (context + hooks co-exported).
- **Fix:** Fix the underlying issues, split `ColorMode.jsx` into `context/ColorMode.jsx` (provider only) + `hooks/useTheme.js`, and gate merges on `npm run lint` in CI so crash-class errors like `no-undef` can't ship again.

---

## What's already good (keep)

- **Socket cleanup is done properly** in both socket effects (`off` + `disconnect`) — no leaked listeners found; StrictMode double-mount is handled.
- **ColorMode context design** — persistence, OS-preference listener that respects a manual choice, SSR guards — is genuinely well written (its problems are F-20's wiring, not the context).
- **Visual identity** — gradient brand, Space Grotesk display + Inter body, consistent card language — is more distinctive than most local-tournament tools.
- **Match page information architecture** (live header → CRR/RRR/required-runs panel → tabbed detail) mirrors pro layouts; required-run-rate maths is shown only in innings 2, projected score in innings 1 — correct instincts.
- Build passes clean; bundle size is sane.

## Suggested fix order

1. **F-02** (API base) + **F-03** (find()._id crash) + **F-15/F-16** (unguarded derefs) + **ErrorBoundary** — stop the white screens.
2. **F-01** (wire Start Scoring to the scorer) + **F-09/F-10** (dead routes, fake `/match` page) — make every visible control real.
3. **F-04/F-12/F-14** (stale socket/fetch param bugs) + **F-17** (wrong overs).
4. **F-24/F-25** (buttons/tabs semantics, mobile nav) + **F-26** (responsive gutters/tables).
5. **F-18/F-29/F-30** (loading/error states, API layer, useMemo refactor).
6. **F-05/F-06/F-07/F-08** (commentary richness, ball strip, Manhattan/worm/FoW, live list socket).
7. **F-20/F-21/F-22/F-23/F-27/F-31/F-32** (theme wiring, tokens, PWA, code splitting, lint gate).
