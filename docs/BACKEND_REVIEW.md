# CricScore Backend Deep Review — Cricket Scoring Correctness, Concurrency, Security

**Scope:** `/tmp/cricscore/server/` — Express 5 + Mongoose 8 + Socket.io, ~2,550 LOC (excluding node_modules). All files read; scoring payloads cross-checked against the client's real event vocabulary in `client/src/services/ScoringService.js` (`wd`, `wd+1`, `nb`, `nb+1b`, `1b`, `1lb`, `dot`, `run`, `four`, `six`; dismissals `bowled|caught|stumped|lbw|run_out_striker|run_out_non_striker`).

**Headline: the scoring core cannot be trusted.** The ball-by-ball write path is unauthenticated, innings-end detection silently disables itself on every extra, the aggregate score is a mutated counter that diverges from the ball log under any concurrency or partial failure, and several player-stat computations are arithmetically wrong. There is no undo — a mis-tap permanently corrupts a scorecard.

---

## CRITICAL

### C-1. Ball-by-ball scoring endpoint is completely unauthenticated
- **Files:** `index.js:54`, `routes/ballByBallRoute.js`
- **Description:** `app.use("/api/cricscore/ballByball", ballByballRoute)` is mounted *before* `checkAuthCookie("token")`. The code even admits it: `//IMPORTANT: make it protected route later`. Anyone on the internet can POST balls to any match — add runs, take wickets, end innings, and trigger `checkWinner` to forge an official result. Combined with C-2, there is effectively no write security on the product's core function.
- **Fix:** Move the route below the auth middleware; additionally verify the authenticated scorer owns the match (`match.createdBy === req.scorer._id`).

### C-2. No ownership checks anywhere — full IDOR + mass assignment on protected routes
- **Files:** `controllers/matchController.js` (`handleUpdateMatch`, `handleDeleteMatch`, `handleGetMatches`), `controllers/tournamentController.js` (`handleUpdateTournament`, `handleDeleteTournament`, `handleUpdateTeam`)
- **Description:** Auth middleware only proves *some* scorer is logged in. No handler checks `createdBy`. Any scorer can update/delete **any other scorer's** matches, tournaments and teams. `handleGetMatches` filters by the `:scorerId` URL param, not by `req.scorer._id` — pass anyone's ID, get their matches. Updates use `{ $set: req.body }`, so a client can overwrite `createdBy`, `winner`, `result`, `points` — mass assignment on top of IDOR.
- **Fix:** Scope every query with `createdBy: req.scorer._id`; whitelist updatable fields instead of `$set: req.body`.

### C-3. Innings-end detection disables itself on every extra (event-vocabulary mismatch)
- **Files:** `middlewares/validateInnings.js:10-30`, `controllers/ballByBallController.js:28,59`
- **Description:** `validateBall` whitelists events as `wide`, `no_ball`, `bye`, `noball_bye`, … but the client actually sends `wd`, `wd+1`, `nb`, `nb+1b`, `1b`, `1lb`. For every wide/no-ball/bye/leg-bye the middleware hits `if (!validBallEvents.includes(event)) return next();` — skipping the completed-innings guard **and never setting `req.totalOvers`**. The controller then calls `isInningEnd(inningNum, undefined, …)`: `over === undefined` is always false, so an innings can never end on such a ball, and in the 2nd innings `updateInningsService` computes `remainingBalls = undefined * 6 - ball` → `required_run_rate = NaN`. The same bypass lets balls be posted to an already-completed innings whenever the event is an extra.
- **Fix:** One shared event enum used by client, middleware and services. Never `next()` past validation for unknown events — reject them; always resolve `totalOvers` for scoring requests.

### C-4. New batsman/bowler first-ball stats are computed on a detached object and lost; initial values are wrong
- **File:** `services/updateInningsService.js:104-127` (batsman), `146-164` (bowler)
- **Description:** When a batsman/bowler is first seen, the code builds a plain object, `push`es it into the Mongoose document array, then keeps mutating the local variable (`runs += bat_run`, `balls + 1`, recomputed strike rate/economy). Mongoose casts pushed objects into new subdocuments — the local variable is **not** the stored subdocument, so all post-push mutations are discarded on `save()`. What persists is only the initializer, which is itself wrong: `balls: 1` even when the player's first ball is a wide (0 legal balls, 0 balls faced); bowler `economy: (bat_run / 0.1)` garbage; batsman `strike_rate` conditioned on the global `ball` count. The duplicated increment lines (`runs_conceded` initialized *and* `+=`'d) show the author intended the fall-through to work — it silently doesn't.
- **Fix:** After pushing, re-fetch the subdocument (`Inning.batsmen[Inning.batsmen.length-1]`) and mutate that; unify create/update into one code path; initialize `balls` based on whether the delivery counts.

### C-5. Winner determination can crash and strand a finished match forever
- **Files:** `services/CheckWinner.js`, `controllers/inningController.js:44`, `controllers/ballByBallController.js:91`
- **Description:** `createSecondInnings()` is called **without `await`** (fire-and-forget) when the first innings is created. If it fails, no 2nd-innings document exists. At match end, `checkWinner` dereferences `secondInn.runs` on `null`, the error is swallowed by its own try/catch, it returns `undefined`, and the controller destructures `const { result, winner } = undefined` → TypeError → 500. The match never gets a result or `matchState: "completed"` and there is no recovery path. Separately: a tied match is always `"Match Drawn"` — no Super Over support for knockouts.
- **Fix:** `await` second-innings creation in the same request (or a transaction); null-guard `checkWinner`; return a typed result or throw so the controller can 500 *before* marking anything.

---

## HIGH

### H-1. Required run rate is computed from the runs on the current ball, not the innings total
- **File:** `services/updateInningsService.js:41,66-73`
- **Description:** `const totalRuns = totalExtraRuns(extras) + bat_run` is the runs scored **on this delivery**, but it is passed to `getRequiredRunRate(Inning.target, totalRuns, remainingBalls)` as if it were the cumulative score. RRR during a chase is therefore wildly wrong on every ball (e.g. target 180, score 150/3, a dot ball → RRR computed as if 180 still needed… off a base of 0). It should be `Inning.runs` (after the increment on line 48).
- **Fix:** Pass `Inning.runs`; add a unit test with a mid-chase scenario.

### H-2. Run rate and economy divide by "over.ball" decimal notation instead of fractional overs
- **Files:** `services/updateInningsService.js:56-64,179-190`, `utils/ballByBallUtility.js:13-15`
- **Description:** Overs are converted to the display format `over + "." + ball` (5 overs 3 balls → `5.3`) and used as a divisor. The true value is 5.5 overs. CRR is inflated on every part-over (e.g. 60 runs off 5.3 "overs" → 11.32 shown vs 10.91 real), and bowler economy has the identical flaw (`runs_conceded / 3.2` for 20 balls). At 0 balls `getCurrentRunRate` divides by `0.0` → `Infinity`/`NaN` (stringified by `toFixed` into the Number field).
- **Fix:** Compute rates from legal-ball counts: `runs / (balls/6)`; guard balls = 0.

### H-3. Concurrency: read-modify-write aggregates + no idempotency — scores diverge and double-count
- **Files:** `services/updateInningsService.js` (whole flow), `services/createBallEventService.js`, `models/BallEvents.js`
- **Description:** Each ball does `findById` → mutate embedded arrays in memory → `save()`. Two scorers on the same match (a stated use case — the client even handles two scorers in its consistency story), a double-tap, or a network retry all race: last writer wins and the other ball's runs vanish from the aggregate while its `BallEvent` persists — the log and the scorecard permanently disagree. If Mongoose's `__v` check fires instead, `save()` throws `VersionError`, which `updateInningsService` swallows (see M-6) — same divergence, silently. There is no idempotency key/client ball UUID anywhere, and `BallEvents` has **no unique index on `(inning, sequence)`**; worse, `sequence = (ball || 0) + 1` uses the *legal-ball* count, which does not advance on wides/no-balls — two consecutive wides get the **same sequence number**.
- **Fix:** Atomic updates (`findOneAndUpdate` with `$inc`/positional operators) or a transaction around event+aggregate; accept a client-generated `ballId` with a unique index and return the stored event on retry; derive `sequence` from an atomic counter per innings, counting *deliveries*, not legal balls.

### H-4. Run-out dismissal is applied to the wrong batsman; dismissal text embeds ObjectIds
- **Files:** `services/updateInningsService.js:88-132`, `services/createBallEventService.js:79-84`
- **Description:** The service always looks up stats by `striker` and marks *that* record `Out` when `is_out`. For `run_out_non_striker` (supported in the client's `Scoring.js`) the non-striker is dismissed but the **striker's** record is closed — the dismissed batsman stays "notOut" and can be scored again, and the wrong man is shown out. Meanwhile `how_out` text is built with `fielders.join("/")`, but `fielders` in the payload are player IDs, while `createBallEventService` consumes the same array as IDs to store `{ id }` objects — so the scorecard literally renders `caught 64f…a1/64f…b2 b Bowler`. One payload, two incompatible shape assumptions.
- **Fix:** Update the record of `batsman_out` (already in the payload), not the striker; resolve fielder names server-side from the Players collection when composing `how_out`.

### H-5. Retired hurt / retired out not modelled — wickets and batsman status are wrong for them
- **Files:** `services/updateInningsService.js:51,124`, `models/Innings.js` (batsmen `status`)
- **Description:** Any `is_out` increments `Inning.wickets` and sets the batsman `status: "Out"` permanently. A batsman who retires hurt is **not out**: the wicket must not count, and he may resume later. There is no `retired` status, no resume path, and the client has no such dismissal option — so scorers must either mis-record a retirement as a wicket (corrupting the innings — including a false "10 wickets" innings end, see CheckInningEnd) or not record it at all. Also missing from the dismissal set: **hit wicket** (bowler-credited). Note the server's `bowlerValidWkts` includes `"run_out"`, which never matches the client's `run_out_striker`/`run_out_non_striker` — run outs are excluded from bowler wickets only by accident of vocabulary drift (H-4/C-3 family).
- **Fix:** Add `retired_hurt` / `retired_out` event handling: no wicket increment for hurt, `status: "retired"`, allow the batsman record to be reactivated; add `hit_wicket` to the dismissal enum and to bowler-credited wickets.

### H-6. Free hit and DLS are entirely absent
- **Files:** global — no reference in any service/model
- **Description:** After a no-ball in limited-overs cricket the next delivery is a **free hit** (batsman can only be out run-out / obstructing, etc.). Nothing tracks free-hit state (no field on `Innings`/`BallEvents`, no validation that a free-hit dismissal is legal), so a scorer can record a bowled on a free hit and the server accepts it. Likewise there is no rain/interruption handling at all — no revised target, no DLS or even a manual target override; a shortened second innings still chases the original target and `CheckInningEnd` uses the original `totalOvers`.
- **Fix:** Track `nextBallFreeHit` on the innings (set by any no-ball, cleared after the next legal delivery — noting wides/no-balls on a free hit extend it); validate dismissals on free hits; add at minimum a staff-only revised-target/overs endpoint (full DLS is a bigger feature — flag it as a product gap).

### H-7. JWT/session security: hardcoded fallback secret, non-expiring tokens, non-httpOnly cookie
- **Files:** `services/token.js:3,11`, `controllers/scorerController.js:52-54`, `middlewares/authenticate.js`
- **Description:** `process.env.SECRET || "@#$Secret$#@"` — a secret committed in source; if `.env` is missing (there is none in the repo) every deployment signs with a publicly known key, so anyone can mint a valid token for any scorer `_id`. `jwt.sign` has no `expiresIn` — tokens are valid forever. The login cookie is set with **no options**: not `httpOnly` (stealable via any XSS), no `SameSite`, no `Secure`. The auth middleware returns **422** (should be 401) and leaks the raw error (`"Error: " + error`).
- **Fix:** Fail startup if `SECRET` is unset; `expiresIn` (e.g. 7d); `res.cookie("token", token, { httpOnly: true, sameSite: "lax", secure: inProd, maxAge })`; generic 401 messages.

### H-8. Unauthenticated scorer-profile mutation and unbounded file upload
- **Files:** `routes/scorerRoute.js:20-22`, `controllers/scorerController.js:63-95`
- **Description:** `PUT /scorer/update` and `POST /scorer/upload/:email` sit on the public router and identify the account **by email from the request** — anyone can rewrite any scorer's profile or replace their photo, no password or token needed. The multer setup (`memoryStorage()`, no `limits`, no file filter) allows arbitrarily large uploads held in RAM (trivial DoS) of **any file type**, stored in Mongo and later served back with the uploader-supplied `contentType` — a stored-content/XSS vector.
- **Fix:** Require auth + ownership on both; `limits: { fileSize: 2_000_000 }`, image MIME whitelist, sniff/ignore client content type on serve.

### H-9. `handleGetTeams` always crashes (TDZ shadowing)
- **File:** `controllers/playersController.js:48-67`
- **Description:** `const Team = await Team.find(...)` declares a local `Team` that shadows the imported model, then references it in its own initializer → `ReferenceError: Cannot access 'Team' before initialization` on **every** call → caught → 500. `GET /:teamId` on the players router (also mounted at `/api/cricscore/teams` in `index.js:64`) is dead.
- **Fix:** Rename the result variable (`const teamDocs = await Team.findById(teamId)`).

### H-10. Match-state vocabulary is inconsistent — state changes make matches vanish
- **Files:** `controllers/matchController.js:26,161,186-204`, `controllers/UserController.js:8,46,68`, `controllers/ballByBallController.js:44,97`
- **Description:** States in use: `"upcoming"` (create), `"Live"` (selectXI, live queries, socket feed), `"completed"` (ball controller), but `handleUpdateMatchState` only accepts `"live" | "scheduled" | "pause" | "completed"` (lowercase). PATCHing a match to `"live"` via the official endpoint writes a value no live query matches — the match disappears from the home page and live socket feed while scoring continues. `"scheduled"` vs `"upcoming"` likewise diverge.
- **Fix:** One `MATCH_STATES` enum (schema-level `enum` on `matchState`), migrate existing docs, use it in every query.

---

## MEDIUM

### M-1. Score is a mutated counter, not derived from the ball log — and there is no undo/edit
- **Files:** `services/updateInningsService.js`, all of `routes/`
- **Description:** `BallEvents` are written (a good event log), but the score lives in incrementally mutated counters on `Innings` that are *never* reconciled against the log — and there is **no endpoint to undo, edit, or delete a ball**. Scoring UIs need undo more than almost any feature (mis-taps are routine at local matches); here one wrong tap permanently corrupts runs, wickets, and both players' stats, and innings-end/winner may fire on the corrupted state. The data to support undo exists — `BallEvents` has everything needed to replay.
- **Fix:** Add `DELETE /ballByball/:matchId/ball/:ballEventId` (owner-only, only latest ball, only while innings live) implemented as delete + **replay all remaining events** to rebuild the innings aggregate; longer term, make replay the single source of truth.

### M-2. Extras totals count deliveries, not runs
- **File:** `services/updateInningsService.js:76-86`
- **Description:** `Inning.extras.wide += 1` whenever `extras.wide` is truthy. A wide that runs to the boundary (5 wides) adds **1**; 3 byes add **1** to `extras.bye`. The innings total is right (it uses run values), but the extras breakdown on every scorecard is wrong.
- **Fix:** Increment by the run values (`+= extras.wide` etc.).

### M-3. Maiden overs are never computed
- **File:** `services/updateInningsService.js:157,176`
- **Description:** `maidens: 0` at creation and never updated — the code comment admits it ("if the play_state is over_end then fetch all balls…"). Every bowler's maiden count shows 0 forever.
- **Fix:** On over completion, check the over's `BallEvents` for that bowler: 0 total runs (bat + wides + no-balls) → `maidens += 1`.

### M-4. Bowling restrictions are not enforced (consecutive overs, max overs per bowler)
- **Files:** `middlewares/validateInnings.js`, `services/updateInningsService.js`
- **Description:** Nothing stops the same bowler bowling consecutive overs, or exceeding the limited-overs maximum (format/5 — e.g. 4 overs in a T20). The server doesn't even record who bowled the previous over in a checkable place at validation time. Client-side-only enforcement means a buggy/double submission corrupts the game state.
- **Fix:** In validation, load the innings' bowlers + last over's bowler from `BallEvents`; reject consecutive-over and over-limit assignments with 422.

### M-5. Striker/non-striker rotation is entirely client-trusted
- **Files:** `services/updateInningsService.js`, `services/createBallEventService.js`
- **Description:** The server never verifies that the `striker` in the payload is the batsman who should be facing (odd-run swaps, over-end swap), that the two named batsmen are the not-out pair at the crease, or that the bowler belongs to the fielding XI. It is a dumb ledger for client-computed state — any client bug (or tampering, see C-1) writes nonsense straight into the official record.
- **Fix:** Derive/validate crease state server-side from the innings document (current pair stored on `Innings`), swap on odd runs and over end, and reject balls whose striker isn't the expected facing batsman.

### M-6. Errors are swallowed in the innings updater — API reports success on failure
- **Files:** `services/updateInningsService.js:207-209`, `controllers/ballByBallController.js:24-31`
- **Description:** `updateInnings` catches all errors, logs, and returns `undefined`. The controller doesn't check: it proceeds to emit socket updates, runs innings-end logic against `undefined` (→ TypeError inside `isInningEnd` → 500 *after* the ball event was already persisted), or returns `200 { message: "Updated", data: undefined }`. Ball recorded, score not updated, everyone told it worked.
- **Fix:** Don't catch in the service (or rethrow); controller validates the result before side effects; persist event + aggregate in one transaction so they can't split.

### M-7. Socket.io: no authentication, no resync, heavyweight fan-out
- **File:** `index.js:68-78`, `controllers/ballByBallController.js:34-53`
- **Description:** Any client can join `match/<id>` or `homeRoom` with no token — fine for public viewing, but there is no distinction from scorer channels and no rate limiting. There is **no state snapshot on join/reconnect**: a viewer who reconnects mid-match gets nothing until the next ball is bowled (they must know to refetch via REST). Emits are fire-and-forget `.then()` chains that race the HTTP response and each other, so clients can render states out of order. And every ball of every match triggers a full `Match.find({ matchState: "Live" }).populate("innings")` (full batsmen/bowlers arrays) broadcast to the whole home room — O(matches × squad) payload per delivery; this will melt the single Node process as soon as a few matches run concurrently.
- **Fix:** Emit a `matchState` snapshot on join; emit only the changed match (delta) to the home room; order emits after the write completes and include the ball `sequence`/version so clients can drop stale updates.

### M-8. `CheckInningEnd.js` is an ES module in a CommonJS package; `Timeline.js` is dead and broken
- **Files:** `services/CheckInningEnd.js:1` (`export function`), `models/Timeline.js`, `package.json` (no `"type"`)
- **Description:** Every other file uses `require`/`module.exports`; `CheckInningEnd.js` uses `export`, so `require()` of it throws `SyntaxError` on Node ≤ 20 and only survives on newer Node via require(esm) syntax detection — a deployment landmine. `models/Timeline.js` is never imported (lucky: it references an undefined `BallEventsSchema`, re-registers the `"ballEvents"` model → `OverwriteModelError`, and refs non-existent models `"Inning"`/`"Player"`).
- **Fix:** Convert `CheckInningEnd.js` to `module.exports`; delete `Timeline.js` (or finish it properly).

### M-9. Database/config: hardcoded localhost Mongo, connect-after-listen, failures swallowed
- **Files:** `services/db.js:2`, `index.js:29,80-84`
- **Description:** `mongodb://127.0.0.1:27017/cricscore` and `PORT = 5000` are hardcoded (the env line is commented out). `connectToMongoose()` is called *after* `listen()` and its failure is only `console.log`ged — the process serves requests with no DB, and Mongoose buffers commands so requests hang for seconds then error. No `.env` in the repo; `dotenv` is loaded only as a side effect of `services/token.js`.
- **Fix:** `process.env.MONGODB_URI` with a startup-fatal error if unset; connect before listen; add a `/health` endpoint exposing DB state.

### M-10. Validation gaps on the scoring payload — impossible balls are accepted
- **Files:** `middlewares/validateInnings.js`, `models/BallEvents.js`, `models/Innings.js`
- **Description:** Beyond the event whitelist (C-3) nothing is checked: `bat_run` isn't cross-checked against `event` (`event:"dot", bat_run:6` is stored), negative runs/balls pass (score can decrease), `extras` values are unbounded, `status`/`matchState` have no schema `enum`, and `BallEvents.event`/`how_out` are free strings. `validateBall`'s over-limit check uses strict `>` against the *legal-ball* count and doesn't verify the innings belongs to the match in the URL… it does lookup by matchId+inningNumber, but the controller re-fetches without checking `Inning` exists (`Inning._id` on `null` → 500 instead of 404).
- **Fix:** A single scoring-payload schema (express-validator is already a dependency but unused for this route): enum events, per-event run/extras consistency, non-negative bounded numbers, IDs must exist and belong to the match's XIs.

### M-11. Missing indexes and uniqueness constraints
- **Files:** `models/*.js` (no `index()` calls anywhere)
- **Description:** Hot queries run unindexed: `BallEvents.find({ inning })`, `Innings.find({ matchId })`, `Match.find({ matchState })`, `Match.find({ createdBy })`. No unique `(matchId, inningNumber)` on Innings — `handleCreateInnings` does check-then-create non-atomically, so a double-click on selectXI can create duplicate innings (later `findOne` picks one arbitrarily). No unique `(match_date, match_time)` either, though `handleCreateMatch` pretends the pair is unique (and scopes it globally across tournaments, so two *different* tournaments can't play at the same time — false conflict).
- **Fix:** Add the indexes above; unique index on `(matchId, inningNumber)`; make innings creation an upsert.

### M-12. Login enumeration, no rate limiting, passwords logged in plaintext
- **Files:** `controllers/scorerController.js:10,34-38`, all routes (no rate-limit middleware installed)
- **Description:** Login distinguishes "Scorer doesn't exists" from "Password doesn't match" → account enumeration. No throttling on `/login` or `/signup` → online credential stuffing against bcrypt-cost-10 is the only brake. Worst: `handleScorerSignup` does `console.log(req.body)` — **plaintext passwords land in server logs**.
- **Fix:** Uniform "invalid credentials"; `express-rate-limit` on auth routes; remove the log line (audit for others).

### M-13. Duplicate/unused dependencies: bcrypt *and* bcryptjs; unused axios, openai, express-validator
- **File:** `package.json`
- **Description:** Only `bcrypt` is ever required (`scorerController.js:5`); `bcryptjs` is dead weight (likely a fallback from a native-build failure during development). `axios` and `openai` are never required anywhere in the server; `express-validator` is installed but hand-rolled validators are used instead. Each unused dep is install time, audit noise, and supply-chain surface.
- **Fix:** Remove `bcryptjs`, `axios`, `openai`; either use `express-validator` for M-10 or remove it too.

---

## LOW

### L-1. Rate/field type inconsistencies in the utils
- **File:** `utils/ballByBallUtility.js`, `models/Innings.js:76-79`
- `getCurrentRunRate`/`getRequiredRunRate` return `toFixed` **strings**; `current_run_rate` is a Number field but `required_run_rate` is declared `String` — pick one (Number) and round at presentation. `getRequiredRunRate` divides by `remainingBalls/6` → `Infinity` when 0 balls remain.

### L-2. First-innings-end check is brittle; declarations unsupported
- **File:** `services/CheckInningEnd.js:6`
- `updatedInning.over === totalOvers` depends on exact equality with a client-derived over count; a `>=` with the balls check is safer. No support for a captain's declaration (formats with declarations, e.g. multi-day local games) — innings can only end by overs/wickets.

### L-3. BallEvent `sequence`/`ball` semantics are confusing and partly wrong
- **File:** `services/createBallEventService.js:33-37`
- `ball` in the schema stores *ball-in-over* while the request's `ball` means *legal balls in innings*; `sequence` duplicates legal-ball order and collides on extras (H-3). Rename to `legalBallNumber` / store a true per-delivery sequence; add `isLegalDelivery` and `isFreeHit` booleans so consumers don't re-derive rules from the event string.

### L-4. Naming/typo debt that will bite during refactors
- **Files:** `models/Tournment.js` (filename typo; model name is `"tournaments"`), `models/Match.js:65` (`matchRefree`), `models/BallEvents.js` (`Bastman1_Name`, `Bastman2_Name`, plus meaningless `ref: "players"` on String fields), `services/CreateInning.js` (a *controller-shaped* handler living in services, dead — see L-5), `Tournament.format` (a Number of overs named "format").

### L-5. Dead code inventory
- `services/CreateInning.js` — imported in `routes/matchRoute.js` but never routed; duplicates `inningController.handleCreateInnings` with divergent logic (creates innings lazily with `target: 0` for the 2nd innings — if ever wired up, its 2nd innings would satisfy `runs >= target` on ball 1 and end the match instantly).
- `controllers/matchController.js:handlePreMatch` — route commented out; also writes `matchRefree: req.body.r` (wrong field, always `undefined`).
- `playersRoute` mounted twice (`/players` and `/teams`, `index.js:61,64`); unused `validate` import in `index.js:20`; triplicated bowler lookup in `updateInningsService.js:141-150` (`var bowlerStats` declared three times); unused `const { response } = require("express")` in `tournamentController.js:5`; large commented blocks in `createBallEventService.js` and `validateCreateTeam.js`.

### L-6. Delete operations orphan child data
- **Files:** `controllers/matchController.js:handleDeleteMatch`, `controllers/tournamentController.js:handleDeleteTournament`
- Deleting a match/tournament leaves its `Innings` and `BallEvents` behind; viewer endpoints can resurrect ghost data and storage grows unbounded. Cascade or soft-delete.

### L-7. Viewer ball-by-ball feed ordering/pagination is fragile
- **File:** `controllers/UserController.js:29-34`
- "Latest 20 balls" sorts by `createdAt` desc only — identical timestamps (same-millisecond writes, bulk imports) order arbitrarily, and there's no way to page the full commentary. Sort by `(createdAt, _id)` or by the delivery sequence once H-3 is fixed.

### L-8. Inconsistent HTTP semantics
- 404 for "no matches yet" (`handleGetMatches`), 500 for "players already added" (`handleAddPlayers`), 422 for auth failures, `findByIdAndDelete({ _id: id })` passed an object (`playersController.js:73` — works by accident in Mongoose, wrong API use). No global error-handling middleware; `handleUpdateMatchState` has no try/catch at all, so a DB error is an unhandled rejection (Express 5 will route it, but to the default handler → HTML stack trace).

### L-9. Images stored as Buffers in the Scorer document
- **File:** `models/Scorer.js:24-27`
- Profile photos live inside the user document (16 MB BSON limit, every scorer fetch drags the blob unless projected out). Move to disk/object storage with a path reference — after H-8's limits land this is an annoyance rather than a risk.

### L-10. No tests, no lint, `npm test` fails by design
- **File:** `package.json` (`"test": "echo \"Error: no test specified\" && exit 1"`)
- For an app whose entire value is arithmetic correctness, there is not one test of the scoring rules. The bugs in H-1/H-2/C-4 are exactly what a 20-line test of `updateInningsService` would have caught. Add a scoring-rules test suite (golden innings: extras mix, run-out of non-striker, free hit, maiden, chase finish) before refactoring anything above.

---

## Architecture note — the one decision that fixes half of this

The backend treats the **client as the rules engine** (it sends ball counts, striker, totals context) and the server as a passive accumulator of counters. Every critical/high above traces back to that: vocabulary drift (C-3), trusted state (M-5), divergence (H-3), no undo (M-1). The `BallEvents` log already contains everything needed to flip the model: **client sends only the delivery outcome (event, runs, extras, dismissal); the server derives ball counts, crease state, rates, innings end and winner from the log**, with the `Innings` document as a rebuildable projection. Do that — plus auth/ownership (C-1/C-2) — and CricScore's scoring core becomes defensible. Until then it is a demo, not a scoring platform.
