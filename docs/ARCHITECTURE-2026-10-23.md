# CricScore — Architecture, 2026-10-23

Target structure after the full-program upgrade, what this pass
changed to get there, and what it deliberately left alone. Vocabulary
follows the improve-codebase-architecture skill: a **module** earns its
keep by **depth** (small **interface**, much behaviour behind it), a
**seam** is where behaviour can be swapped or tested, and the test of
a good module is **leverage** (one change, many beneficiaries) and
**locality** (one place to understand a rule).

## The shape (unchanged, and why it's kept)

```
user/ (React 19 + Vite + Tailwind v4 — viewer site AND organizer app)
  pages/        one module per route; pages own fetch + state wiring
  components/   presentation; viewer cards, scorer sheets, shared chrome
  hooks/        stateful seams that outlive one page's render logic
  lib/          pure domain + the API client — the test surface
  context/      colour mode only

server/ (Express + Mongoose + Socket.io)
  routes/       thin mounts, auth scoped per prefix in index.js
  controllers/  HTTP shape: status codes, envelopes, per-endpoint errors
  services/     scoring (engine bridge), ownership, tokens, httpError, db
  engine/       the pure event-sourced scoring engine (no I/O)
  models/       Mongoose schemas
```

The layering was already sound after the 2026-10-23 fix pass
(engine → service → controller on the write path; ownership +
allowlists on CRUD). This pass deepened the modules where friction
actually was instead of redrawing the map.

## What changed

### 1. Match-detail composition is one module now — `lib/cricket.js`

**Before:** the hero panel (`FeaturedMatch`) and the match page each
re-implemented the same three rules over a detail payload: build the
innings views, find the view for the team that batted, pick the
"active" innings (in-progress, else latest), and derive team A's win
probability (winner settles 100/0; otherwise the engine's figure,
flipped when team A is fielding). Two copies of a rule is a rule that
will drift.

**After:** `detailViewModel(detail)` returns `{ entries, views,
viewFor, activeIndex, activeEntry, activeView }` and
`teamAWinPct(match, entries)` owns the probability rule. Both surfaces
call them. Deletion test: removing the module would scatter the rules
back into two components — it concentrates complexity, so it stays.
The one judgement call: the winner branch no longer checks "not live"
in the hero — a winner is only ever recorded on completion, so the
guard was dead weight; the unified rule is documented on the function.

`lib/cricket.js` was already the deepest module in the app (two
backend shapes → one view model); it now also owns detail-level
composition. Its interface stayed pure and synchronous — which is
exactly why the new Vitest suite can pin it without rendering.

### 2. The scorer's match list has one owner — `lib/organizer.js`

**Before:** "GET /match/:scorerId, 404 means empty" plus "filter to
this tournament (id, else name)" was implemented **three times** —
twice inside `ManageTournament` alone (its full load and its
matches-only reload) and once in `ScorerMatches`.

**After:** `fetchScorerMatches(scorerId, { signal })` owns the
endpoint + the 404-is-empty semantics; `filterTournamentMatches(list,
tournamentId, tournamentName)` owns the filter. Three call sites, one
rule each. Both are pure-ish and unit-tested (the filter directly; the
fetcher's semantics are pinned by the server API suite).

### 3. Socket state lives in a hook — `hooks/useMatchLiveUpdates.js`

**Before:** the match page carried the live-update policy inline:
socket join, a 350 ms trailing coalesce timer, an in-flight flag, and
the knowledge that the socket payload (raw snapshots) is *not* what
the page renders (engine state is), so a refetch is required. Policy
buried in a page is policy nobody can find.

**After:** the hook's interface is `(matchId, rawFetch) → { fetchDetail,
connected }`; the coalescing policy is named, commented and contained.
The page keeps its fetcher (loading/error/innings-defaulting are the
page's business) and hands it in. Semantics were ported exactly,
including the "silent calls drop while a fetch is in flight" guard.
The home page's socket (replace-the-list on `liveMatches`) is trivial
by comparison and stays in the page — extracting it would be a
shallower module than the code it replaces.

### 4. Console selection rules are pure — `lib/scorer.js`

**Before:** `ScorerConsole` mixed its state machine with the rules
that guard it: which batsmen are disabled in the picker, who bowled
the last over, and the reconciliation that stops a dismissed batsman
being resurrected by the squad-list fallback. The rules were closures
inside the page — untestable without rendering the whole console.

**After:** `outBatsmanIds`, `pickCreaseSelection`,
`batsmanDisabledIds`, `bowlerDisabledIds` in `lib/scorer.js`, called
from the page's effect and render. The page keeps state, effects and
DOM (its real job); the rules are unit-tested through their public
interface. Same extraction pattern as (1)/(2): pure logic out,
composition stays.

### 5. Server error plumbing is shared — `services/httpError.js`

**Before:** `httpError` was defined privately inside
`scoringService.js`, and `ballByBallController` repeated the same
`error.status || 500` catch block three times.

**After:** `services/httpError.js` exports `httpError` (thrown by
services) and `sendHttpError` (the mapping, used by the ball-by-ball
controller). `scoringService` imports the shared `httpError`.

## Deliberately left

- **Controller try/catch style (server).** The CRUD/viewer controllers
  answer failures with per-endpoint messages ("Something went wrong
  while fetching tournaments"). Those messages are the API's public
  surface — clients and the API test suite see them. A blanket
  async-wrapper migration would churn all eight controllers to change
  nothing observable. The genuinely duplicated pattern (service-error
  mapping) is the part that moved.
- **Home's multi-resource loader.** Home loads four resources with
  independent loading/error state plus a socket overlay and a
  featured-detail refetch keyed by a score signature. A generic
  `useApiData` hook would have to grow a variant per page until it was
  as complex as the pages themselves — a shallow module. The pages'
  loaders stay local; the *shared semantics* (scorer's matches,
  detail composition) are what got extracted.
- **`ScorerConsole`'s state machine stays in the page.** Post-ball
  idempotency, 409 resync, innings switching — this is the page's
  reason to exist. Only its pure decision rules moved (see 4).
- **Viewer/organizer component duplication.** The two surfaces share
  the design system, `inningsView`, cards' primitives (TeamChip,
  TimelineItem) and chrome; their workflows genuinely differ (watch vs
  operate). No forced unification.
- **`client/` (legacy CRA)** — untouched, as always.

## Observed, not fixed (needs a deliberate call)

- `ScorerConsole` reads `view?.awaitingBatsman` to decide whether
  retired batsmen are excluded from the picker — but `inningsView`
  never surfaces `awaitingBatsman` from the engine state, so the flag
  is always falsy today and the exclusion never fires. Surfacing it
  changes picker behaviour (arguably a bug fix — the engine computes
  the flag for exactly this), but it is a behaviour change, outside
  this pass's behaviour-preserving mandate. One-line change in
  `inningsView` when Samir wants it.
- The server has no `/health` endpoint; Render health-checks a viewer
  route instead. Works, but a trivial `/health` would be cleaner.
